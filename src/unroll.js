const experience = document.querySelector('.experience');
const scrollCanvas = document.querySelector('#scrollScene');
const buildTag = document.querySelector('.build-tag');
const enterButton = document.querySelector('#enter');
const unrollHint = document.querySelector('.unroll-hint');
const progressFill = document.querySelector('.scroll-progress__fill');
const progressLabel = document.querySelector('.scroll-progress__label');
const chapterLabel = document.querySelector('.scroll-chapter');

if (!scrollCanvas || !experience) {
  throw new Error('UNROLL: required DOM nodes are missing.');
}

const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const contextOptions = {
  antialias: false,
  alpha: true,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: params.has('capture'),
};

let gl = scrollCanvas.getContext('webgl2', contextOptions);
const isWebGL2 = Boolean(gl);
if (!gl) gl = scrollCanvas.getContext('webgl', contextOptions) || scrollCanvas.getContext('experimental-webgl', contextOptions);

const chapters = [
  [0.00, 'THE FIRST STIRRING'],
  [0.20, 'VESSELS IN MOTION'],
  [0.43, 'THE PROCESSION'],
  [0.68, 'THE GREEN MONKEY'],
  [0.88, 'BEFORE DAWN'],
];

const state = {
  active: params.has('unroll'),
  reveal: params.has('unroll') ? 1 : 0,
  offset: Number.isFinite(Number(params.get('scroll'))) ? Number(params.get('scroll')) : 0.72,
  targetOffset: Number.isFinite(Number(params.get('scroll'))) ? Number(params.get('scroll')) : 0.72,
  velocity: 0,
  dragVelocity: 0,
  dragging: false,
  dragStartX: 0,
  lastX: 0,
  lastMoveAt: performance.now(),
  pointer: { x: 0.5, y: 0.5 },
  pointerTarget: { x: 0.5, y: 0.5 },
  pull: 0,
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function activateUnroll() {
  if (state.active) return;
  state.active = true;
  dispatchEvent(new CustomEvent('nightparade:unroll'));
  experience.classList.add('is-unrolling');
  unrollHint?.classList.add('is-hidden');
  if (enterButton) enterButton.innerHTML = 'DRAG THE SCROLL <span aria-hidden="true">↔</span>';
  setTimeout(() => experience.classList.add('is-unrolled'), reducedMotion ? 0 : 1050);
}

function setBuildMarker(renderer) {
  if (buildTag) buildTag.textContent = `GATE 02 · V01 · ${renderer.toUpperCase()}`;
}

function updateProgress() {
  const progress = clamp01(state.offset);
  if (progressFill) progressFill.style.transform = `scaleX(${progress})`;
  if (progressLabel) progressLabel.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')} / 100`;
  let chapter = chapters[0][1];
  for (const [start, label] of chapters) if (progress >= start) chapter = label;
  if (chapterLabel) chapterLabel.textContent = chapter;
}

function setPointer(clientX, clientY) {
  state.pointerTarget.x = clientX / innerWidth;
  state.pointerTarget.y = clientY / innerHeight;
}

addEventListener('pointermove', (event) => {
  setPointer(event.clientX, event.clientY);
  if (!state.dragging) return;
  const now = performance.now();
  const deltaX = event.clientX - state.lastX;
  const dt = Math.max(8, now - state.lastMoveAt);
  if (!state.active && Math.abs(event.clientX - state.dragStartX) > 42) activateUnroll();
  if (state.active) {
    state.targetOffset = clamp01(state.targetOffset - deltaX / Math.max(innerWidth, 1) * 0.72);
    state.dragVelocity = (-deltaX / dt) * 0.95;
    state.pull = Math.min(1, Math.abs(deltaX) / 90 + Math.abs(state.dragVelocity) * 0.15);
  }
  state.lastX = event.clientX;
  state.lastMoveAt = now;
}, { passive: true });

addEventListener('pointerdown', (event) => {
  state.dragging = true;
  state.dragStartX = event.clientX;
  state.lastX = event.clientX;
  state.lastMoveAt = performance.now();
  setPointer(event.clientX, event.clientY);
  experience.classList.add('is-grabbing');
});

addEventListener('pointerup', () => {
  state.dragging = false;
  state.velocity += state.dragVelocity * 0.026;
  state.dragVelocity = 0;
  experience.classList.remove('is-grabbing');
});
addEventListener('pointercancel', () => {
  state.dragging = false;
  experience.classList.remove('is-grabbing');
});

addEventListener('wheel', (event) => {
  if (!state.active && Math.abs(event.deltaY) + Math.abs(event.deltaX) > 8) activateUnroll();
  if (!state.active) return;
  event.preventDefault();
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  state.targetOffset = clamp01(state.targetOffset + delta * 0.00062);
  state.velocity += delta * 0.000018;
  state.pull = Math.min(1, state.pull + Math.abs(delta) * 0.0014);
}, { passive: false });

enterButton?.addEventListener('click', () => {
  if (enterButton.dataset.unroll === 'true') activateUnroll();
});

setTimeout(() => {
  if (!state.active) unrollHint?.classList.add('is-visible');
  if (enterButton) {
    enterButton.dataset.unroll = 'true';
    enterButton.innerHTML = 'UNROLL THE NIGHT <span aria-hidden="true">↔</span>';
  }
}, 2200);

if (state.active) {
  experience.classList.add('is-unrolling', 'is-unrolled');
  unrollHint?.classList.add('is-hidden');
}

if (!gl) {
  setBuildMarker('UNROLL-CSS');
  const fallback = document.querySelector('.scroll-fallback');
  fallback?.classList.add('is-visible');
  scrollCanvas.hidden = true;
  updateProgress();
} else {
  const shaderPaths = {
    vertex: './src/experience/shaders/unroll/scroll.vert.glsl',
    fragment: './src/experience/shaders/unroll/scroll.frag.glsl',
  };

  function loadText(path) {
    return fetch(path).then((response) => {
      if (!response.ok) throw new Error(`UNROLL: failed to load ${path}: ${response.status}`);
      return response.text();
    });
  }

  function loadImage(src, optional = false) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => optional ? resolve(null) : reject(new Error(`UNROLL: failed to load ${src}`));
      image.src = src;
    });
  }

  function compile(type, source, label) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`UNROLL ${label}: ${log || 'shader compilation failed'}`);
    }
    return shader;
  }

  function createProgram(vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource, 'vertex'));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource, 'fragment'));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`UNROLL link: ${gl.getProgramInfoLog(program) || 'program link failed'}`);
    }
    return program;
  }

  let [vertexSource, fragmentSource] = await Promise.all([
    loadText(shaderPaths.vertex),
    loadText(shaderPaths.fragment),
  ]);

  if (!isWebGL2) {
    vertexSource = vertexSource
      .replace('#version 300 es', '')
      .replace('in vec2 aPosition;', 'attribute vec2 aPosition;')
      .replace('out vec2 vUv;', 'varying vec2 vUv;');
    fragmentSource = fragmentSource
      .replace('#version 300 es', '')
      .replace('in vec2 vUv;', 'varying vec2 vUv;')
      .replace('out vec4 outColor;', '')
      .replaceAll('texture(', 'texture2D(')
      .replace('outColor = vec4(color, alpha);', 'gl_FragColor = vec4(color, alpha);');
  }

  const program = createProgram(vertexSource, fragmentSource);
  gl.useProgram(program);

  if (isWebGL2) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
  }
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = Object.fromEntries([
    'uScroll','uRight','uResolution','uScrollSize','uRightSize','uPointer','uLantern',
    'uTime','uOffset','uVelocity','uReveal','uPull','uHasRight','uReducedMotion',
  ].map((name) => [name, gl.getUniformLocation(program, name)]));

  const [scrollImage, rightImage] = await Promise.all([
    loadImage('./public/art/master-scroll/tosa_mitsuoki_hyakki_yako_all_1400.jpg'),
    loadImage('./public/art/master-scroll/tosa_mitsuoki_hyakki_yako_right_3000.jpg', true),
  ]);

  function uploadTexture(image, unit, uniform) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (uniform !== null) gl.uniform1i(uniform, unit);
  }

  uploadTexture(scrollImage, 0, uniforms.uScroll);
  if (rightImage) uploadTexture(rightImage, 1, uniforms.uRight);
  else uploadTexture(scrollImage, 1, uniforms.uRight);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.35 : 1.75);
    const width = Math.max(1, Math.round(innerWidth * dpr));
    const height = Math.max(1, Math.round(innerHeight * dpr));
    if (scrollCanvas.width !== width || scrollCanvas.height !== height) {
      scrollCanvas.width = width;
      scrollCanvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  setBuildMarker(isWebGL2 ? 'UNROLL-WEBGL2' : 'UNROLL-WEBGL1');
  updateProgress();

  const start = performance.now();
  let previous = start;
  function render(now) {
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const t = (now - start) / 1000;

    state.pointer.x += (state.pointerTarget.x - state.pointer.x) * (1 - Math.pow(0.0009, dt));
    state.pointer.y += (state.pointerTarget.y - state.pointer.y) * (1 - Math.pow(0.0009, dt));

    if (state.active) state.reveal += (1 - state.reveal) * (1 - Math.pow(reducedMotion ? 0.000001 : 0.018, dt));
    state.velocity *= Math.exp(-4.2 * dt);
    if (!state.dragging) state.targetOffset = clamp01(state.targetOffset + state.velocity);
    const offsetBefore = state.offset;
    state.offset += (state.targetOffset - state.offset) * (1 - Math.pow(state.dragging ? 0.0004 : 0.015, dt));
    const measuredVelocity = (state.offset - offsetBefore) / Math.max(dt, 0.001);
    state.pull += (0 - state.pull) * (1 - Math.pow(0.025, dt));

    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, scrollCanvas.width, scrollCanvas.height);
    gl.uniform2f(uniforms.uScrollSize, scrollImage.naturalWidth, scrollImage.naturalHeight);
    gl.uniform2f(uniforms.uRightSize, rightImage?.naturalWidth || scrollImage.naturalWidth, rightImage?.naturalHeight || scrollImage.naturalHeight);
    gl.uniform2f(uniforms.uPointer, state.pointer.x, state.pointer.y);
    gl.uniform2f(uniforms.uLantern, state.pointer.x, state.pointer.y);
    gl.uniform1f(uniforms.uTime, t);
    gl.uniform1f(uniforms.uOffset, state.offset);
    gl.uniform1f(uniforms.uVelocity, Math.max(-2.5, Math.min(2.5, measuredVelocity * 4.5 + state.dragVelocity * 0.04)));
    gl.uniform1f(uniforms.uReveal, state.reveal);
    gl.uniform1f(uniforms.uPull, state.pull);
    gl.uniform1f(uniforms.uHasRight, rightImage ? 1 : 0);
    gl.uniform1f(uniforms.uReducedMotion, reducedMotion ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    updateProgress();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
