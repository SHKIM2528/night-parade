const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const fallback = document.querySelector('#fallback');
const cursor = document.querySelector('#cursor');
const enter = document.querySelector('#enter');

const gl = canvas.getContext('webgl2', {
  antialias: false,
  alpha: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: new URLSearchParams(location.search).has('capture'),
});

if (!gl) {
  fallback.hidden = false;
  loading.classList.add('is-hidden');
  throw new Error('WebGL2 is unavailable.');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0;

const [vertSource, fragSource] = await Promise.all([
  fetch('./src/experience/shaders/lantern/hero.vert.glsl').then((r) => r.text()),
  fetch('./src/experience/shaders/lantern/hero.frag.glsl').then((r) => r.text()),
]);

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

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

const uniforms = Object.fromEntries([
  'uResolution','uLantern','uPointer','uTime','uIntro','uReducedMotion'
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

const state = {
  pointer: { x: .315, y: .355 },
  target: { x: .315, y: .355 },
  lantern: { x: .315, y: .355 },
  intro: 0,
  entered: false,
};

function setTarget(clientX, clientY) {
  state.target.x = clientX / innerWidth;
  state.target.y = clientY / innerHeight;
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
  const t = (now - start) / 1000;

  const pointerEase = 1 - Math.pow(.0008, dt);
  const lanternEase = 1 - Math.pow(.008, dt);
  state.pointer.x += (state.target.x - state.pointer.x) * pointerEase;
  state.pointer.y += (state.target.y - state.pointer.y) * pointerEase;
  state.lantern.x += (state.pointer.x - state.lantern.x) * lanternEase;
  state.lantern.y += (state.pointer.y - state.lantern.y) * lanternEase;
  const introTarget = state.entered || t > .45 ? 1 : 0;
  state.intro += (introTarget - state.intro) * (1 - Math.pow(.018, dt));

  gl.useProgram(program);
  gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
  gl.uniform2f(uniforms.uLantern, state.lantern.x, state.lantern.y);
  gl.uniform2f(uniforms.uPointer, state.pointer.x, state.pointer.y);
  gl.uniform1f(uniforms.uTime, t);
  gl.uniform1f(uniforms.uIntro, state.intro);
  gl.uniform1f(uniforms.uReducedMotion, reducedMotion);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
