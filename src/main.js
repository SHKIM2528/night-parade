const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const fallback = document.querySelector('#fallback');
const cursor = document.querySelector('#cursor');
const enter = document.querySelector('#enter');
const experience = document.querySelector('.experience');

const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0;
const requestedRenderer = params.get('renderer');
const contextOptions = {
  antialias: false,
  alpha: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: params.has('capture'),
};

let gl = requestedRenderer === 'canvas2d' || requestedRenderer === 'webgl1'
  ? null
  : canvas.getContext('webgl2', contextOptions);
const isWebGL2 = Boolean(gl);
if (!gl && requestedRenderer !== 'canvas2d') {
  gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);
}

if (gl) {
  canvas.dataset.renderer = isWebGL2 ? 'webgl2' : 'webgl1';
  experience.dataset.renderer = canvas.dataset.renderer;
} else {
  const { startCanvasFallback } = await import('./fallback/canvas2d.js');
  await startCanvasFallback({
    canvas,
    loading,
    fallback,
    cursor,
    enter,
    experience,
    params,
    reducedMotion,
  });
}

if (gl) {
const freezeFrame = params.has('freeze');
const captureLantern = params.get('lantern')?.split(',').map(Number);

let [vertSource, fragSource] = await Promise.all([
  fetch('./src/experience/shaders/lantern/hero.vert.glsl').then((r) => r.text()),
  fetch('./src/experience/shaders/lantern/hero.frag.glsl').then((r) => r.text()),
]);

if (!isWebGL2) {
  vertSource = vertSource
    .replace('#version 300 es', '')
    .replace('in vec2 aPosition;', 'attribute vec2 aPosition;')
    .replace('out vec2 vUv;', 'varying vec2 vUv;');
  fragSource = fragSource
    .replace('#version 300 es', '')
    .replace('in vec2 vUv;', 'varying vec2 vUv;')
    .replace('out vec4 outColor;', '')
    .replaceAll('texture(', 'texture2D(')
    .replace('outColor = vec4(color,1.0);', 'gl_FragColor = vec4(color,1.0);');
}

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || 'Shader compilation failed.');
  }
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, vertSource));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
gl.useProgram(program);

if (isWebGL2) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
}

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

const uniforms = Object.fromEntries([
  'uResolution','uLantern','uPointer','uTime','uIntro','uReducedMotion',
  'uWakeA','uWakeB','uWakeC','uMotion'
].map((name) => [name, gl.getUniformLocation(program, name)]));

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const textureDefs = [
  ['uSource', './public/art/characters/green-monkey/source/green_monkey_source_context.png'],
  ['uClean', './public/art/clean-plates/green_monkey_clean_plate.png'],
  ['uInk', './public/art/characters/green-monkey/cutouts/green_monkey_ink_only_rgba.png'],
  ['uRegionsA', './public/art/characters/green-monkey/masks/green_monkey_regions_a_v02.png'],
  ['uRegionsB', './public/art/characters/green-monkey/masks/green_monkey_regions_b_v02.png'],
  ['uRegionsC', './public/art/characters/green-monkey/masks/green_monkey_regions_c_v02.png'],
];

const images = await Promise.all(textureDefs.map(([,src]) => loadImage(src)));
textureDefs.forEach(([uniform], index) => {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[index]);
  gl.uniform1i(gl.getUniformLocation(program, uniform), index);
  const error = gl.getError();
  if (error !== gl.NO_ERROR) console.error('Texture upload error', uniform, error);
});

const initial = Array.isArray(captureLantern) && captureLantern.length === 2 && captureLantern.every(Number.isFinite)
  ? { x: captureLantern[0], y: captureLantern[1] }
  : { x: .315, y: .355 };

const state = {
  pointer: { ...initial },
  target: { ...initial },
  lantern: { ...initial },
  rawVelocity: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  lastTarget: { ...initial },
  wakes: new Float32Array(9),
  intro: 0,
  entered: false,
  shock: 0,
  previousFaceLight: 0,
  moved: false,
};

// Region centroids in source-art UV space: bag, legs, torso, robe, arm, head, fur, face.
const regionPivots = [
  [.2674,.5764], [.4585,.6727], [.6025,.6766], [.5915,.3440], [.6117,.4020],
  [.4719,.4944], [.3341,.2558], [.3734,.2608], [.3220,.4236],
];
const wakeRates = [2.4, 2.8, 2.9, 3.7, 3.25, 4.6, 5.7, 4.3, 7.8];
const freezeRates = [5.2, 5.8, 6.1, 7.0, 7.2, 9.2, 11.8, 8.7, 16.0];

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function artToScreen(art, aspect) {
  const crop = .988;
  if (aspect >= 1) {
    return {
      x: .5 + (art[0] - .5) / crop,
      y: .5 + (art[1] - .463) * aspect / crop,
    };
  }
  return {
    x: .5 + (art[0] - .5) / (crop * aspect),
    y: .5 + (art[1] - .49) / crop,
  };
}

function lanternLightAt(screenPoint, aspect) {
  const dx = (screenPoint.x - state.lantern.x) * aspect;
  const dy = screenPoint.y - state.lantern.y;
  const d = Math.hypot(dx / .30, dy / .315);
  return 1 - smoothstep(.30, .98, d);
}

function setTarget(clientX, clientY) {
  if (freezeFrame) return;
  state.target.x = clientX / innerWidth;
  state.target.y = clientY / innerHeight;
  state.moved = true;
  experience.classList.add('is-engaged');
  cursor.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;
  cursor.style.opacity = '1';
}

addEventListener('pointermove', (event) => setTarget(event.clientX, event.clientY), { passive: true });
addEventListener('pointerdown', (event) => {
  setTarget(event.clientX, event.clientY);
  state.entered = true;
});
addEventListener('pointerleave', () => { cursor.style.opacity = '0'; });
enter.addEventListener('click', () => { state.entered = true; });

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2);
  const width = Math.max(1, Math.round(innerWidth * dpr));
  const height = Math.max(1, Math.round(innerHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0,0,width,height);
  }
}
addEventListener('resize', resize, { passive: true });
resize();
loading.classList.add('is-hidden');

const start = performance.now();
let previous = start;
function render(now) {
  const dt = Math.min((now - previous) / 1000, .05);
  previous = now;
  const t = freezeFrame ? 5 : (now - start) / 1000;

  const rawVx = (state.target.x - state.lastTarget.x) / Math.max(dt, .001);
  const rawVy = (state.target.y - state.lastTarget.y) / Math.max(dt, .001);
  state.lastTarget.x = state.target.x;
  state.lastTarget.y = state.target.y;
  const velocityEase = 1 - Math.pow(.002, dt);
  state.velocity.x += (rawVx - state.velocity.x) * velocityEase;
  state.velocity.y += (rawVy - state.velocity.y) * velocityEase;

  const pointerEase = 1 - Math.pow(.0008, dt);
  const lanternEase = 1 - Math.pow(.008, dt);
  state.pointer.x += (state.target.x - state.pointer.x) * pointerEase;
  state.pointer.y += (state.target.y - state.pointer.y) * pointerEase;
  state.lantern.x += (state.pointer.x - state.lantern.x) * lanternEase;
  state.lantern.y += (state.pointer.y - state.lantern.y) * lanternEase;

  const introTarget = state.entered || t > .45 ? 1 : 0;
  state.intro += (introTarget - state.intro) * (1 - Math.pow(.018, dt));

  const aspect = canvas.width / Math.max(canvas.height, 1);
  for (let i = 0; i < state.wakes.length; i += 1) {
    const p = artToScreen(regionPivots[i], aspect);
    const illumination = lanternLightAt(p, aspect) * state.intro;
    const targetWake = reducedMotion ? 0 : 1 - illumination;
    const rate = targetWake > state.wakes[i] ? wakeRates[i] : freezeRates[i];
    state.wakes[i] += (targetWake - state.wakes[i]) * (1 - Math.exp(-rate * dt));
  }

  const facePoint = artToScreen(regionPivots[8], aspect);
  const faceLight = lanternLightAt(facePoint, aspect) * state.intro;
  const speed = Math.hypot(state.velocity.x * aspect, state.velocity.y);
  const impact = faceLight - state.previousFaceLight;
  if (!reducedMotion && impact > .055 && speed > .22) {
    state.shock = Math.max(state.shock, Math.min(1, impact * 4.2 + speed * .16));
  }
  state.previousFaceLight = faceLight;
  state.shock *= Math.exp(-3.25 * dt);

  gl.useProgram(program);
  gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
  gl.uniform2f(uniforms.uLantern, state.lantern.x, state.lantern.y);
  gl.uniform2f(uniforms.uPointer, state.pointer.x, state.pointer.y);
  gl.uniform1f(uniforms.uTime, t);
  gl.uniform1f(uniforms.uIntro, state.intro);
  gl.uniform1f(uniforms.uReducedMotion, reducedMotion);
  gl.uniform4f(uniforms.uWakeA, state.wakes[0], state.wakes[1], state.wakes[2], state.wakes[3]);
  gl.uniform4f(uniforms.uWakeB, state.wakes[4], state.wakes[5], state.wakes[6], state.wakes[7]);
  gl.uniform4f(uniforms.uWakeC, state.wakes[8], faceLight, 0, 0);
  gl.uniform4f(
    uniforms.uMotion,
    state.shock,
    Math.min(speed, 3),
    Math.max(-2, Math.min(2, state.velocity.x)),
    Math.max(-2, Math.min(2, state.velocity.y)),
  );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
}
