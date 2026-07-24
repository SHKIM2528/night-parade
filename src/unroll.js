const experience = document.querySelector('.experience');
const scrollCanvas = document.querySelector('#scrollScene');
const fallback = document.querySelector('.scroll-fallback');
const buildTag = document.querySelector('.build-tag');
const enterButton = document.querySelector('#enter');
const unrollHint = document.querySelector('.unroll-hint');
const progressFill = document.querySelector('.scroll-progress__fill');
const progressLabel = document.querySelector('.scroll-progress__label');
const chapterLabel = document.querySelector('.scroll-chapter');
const cursor = document.querySelector('.cursor');

if (!scrollCanvas || !experience) throw new Error('UNROLL: required DOM nodes are missing.');

const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const initialCenter = Number.isFinite(Number(params.get('scroll'))) ? Number(params.get('scroll')) : 0.72;
const state = {
  active: params.has('unroll'),
  committed: params.has('unroll'),
  reveal: params.has('unroll') ? 1 : 0,
  revealTarget: params.has('unroll') ? 1 : 0,
  direction: -1,
  offset: initialCenter,
  targetOffset: initialCenter,
  velocity: 0,
  dragVelocity: 0,
  dragging: false,
  pointerId: null,
  dragStartX: 0,
  lastX: 0,
  lastMoveAt: performance.now(),
  pointer: { x: 0.5, y: 0.5 },
  pointerTarget: { x: 0.5, y: 0.5 },
  pull: 0,
  span: 0.25,
  minCenter: 0.125,
  maxCenter: 0.875,
};

const chapters = [
  [0.00, 'THE FIRST STIRRING'],
  [0.20, 'VESSELS IN MOTION'],
  [0.43, 'THE PROCESSION'],
  [0.68, 'THE GREEN MONKEY'],
  [0.88, 'BEFORE DAWN'],
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clamp01 = (value) => clamp(value, 0, 1);
const smooth = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

function setBuildMarker(renderer) {
  if (buildTag) buildTag.textContent = `GATE 02 · V02 · ${renderer.toUpperCase()}`;
}

function setPointer(clientX, clientY) {
  state.pointerTarget.x = clientX / innerWidth;
  state.pointerTarget.y = clientY / innerHeight;
  if (cursor) cursor.style.transform = `translate3d(${clientX}px,${clientY}px,0) translate(-50%,-50%)`;
}

function setDirection(deltaX) {
  state.direction = deltaX < 0 ? -1 : 1;
  experience.classList.toggle('unroll-from-right', state.direction < 0);
  experience.classList.toggle('unroll-from-left', state.direction > 0);
}

function startUnroll(deltaX = -1) {
  if (state.active) return;
  state.active = true;
  setDirection(deltaX || -1);
  experience.classList.add('is-unrolling');
  unrollHint?.classList.add('is-hidden');
  dispatchEvent(new CustomEvent('nightparade:unroll'));
}

function commitUnroll() {
  startUnroll(state.direction);
  state.committed = true;
  state.revealTarget = 1;
  if (enterButton) enterButton.innerHTML = 'DRAG THE SCROLL <span aria-hidden="true">↔</span>';
}

function applyRevealStyles() {
  const progress = smooth(state.reveal);
  const clip = `${(progress * 100).toFixed(3)}%`;

  if (state.direction < 0) {
    experience.style.setProperty('--unroll-left', '0%');
    experience.style.setProperty('--unroll-right', clip);
    experience.style.setProperty('--unroll-seam-x', `${((1 - progress) * 100).toFixed(3)}%`);
    experience.style.setProperty('--unroll-origin', '0% 50%');
    experience.style.setProperty('--unroll-tilt', `${(-progress * 7.5).toFixed(2)}deg`);
  } else {
    experience.style.setProperty('--unroll-left', clip);
    experience.style.setProperty('--unroll-right', '0%');
    experience.style.setProperty('--unroll-seam-x', `${(progress * 100).toFixed(3)}%`);
    experience.style.setProperty('--unroll-origin', '100% 50%');
    experience.style.setProperty('--unroll-tilt', `${(progress * 7.5).toFixed(2)}deg`);
  }

  experience.style.setProperty('--unroll-seam-opacity', String(Math.sin(Math.PI * progress)));
  experience.style.setProperty('--unroll-scale', String(1 - progress * 0.025));

  if (state.reveal > 0.995) experience.classList.add('is-unrolled');
  else experience.classList.remove('is-unrolled');
}

function updateMetrics(imageWidth, imageHeight) {
  const viewportAspect = innerWidth / Math.max(innerHeight, 1);
  const imageAspect = imageWidth / Math.max(imageHeight, 1);
  state.span = clamp(viewportAspect / Math.max(imageAspect, 0.001), 0.055, 0.72);
  state.minCenter = state.span * 0.5;
  state.maxCenter = 1 - state.span * 0.5;
  state.targetOffset = clamp(state.targetOffset, state.minCenter, state.maxCenter);
  state.offset = clamp(state.offset, state.minCenter, state.maxCenter);
}

function normalizedProgress() {
  return clamp01((state.offset - state.minCenter) / Math.max(state.maxCenter - state.minCenter, 0.0001));
}

function updateProgress() {
  const progress = normalizedProgress();
  if (progressFill) progressFill.style.transform = `scaleX(${progress})`;
  if (progressLabel) progressLabel.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')} / 100`;

  let chapter = chapters[0][1];
  for (const [start, label] of chapters) if (progress >= start) chapter = label;
  if (chapterLabel) chapterLabel.textContent = chapter;

  if (fallback?.classList.contains('is-visible')) {
    fallback.style.backgroundPosition = `${progress * 100}% 50%`;
  }
}

function panByPixels(deltaX, dtMs) {
  const deltaCenter = -(deltaX / Math.max(innerWidth, 1)) * state.span * 1.55;
  state.targetOffset = clamp(state.targetOffset + deltaCenter, state.minCenter, state.maxCenter);
  state.dragVelocity = deltaCenter / Math.max(dtMs / 1000, 0.008);
  state.pull = Math.min(1, Math.abs(deltaX) / 75 + Math.abs(state.dragVelocity) * 0.15);
}

experience.addEventListener('pointerdown', (event) => {
  if (event.target instanceof Element && event.target.closest('button')) return;
  if (event.button !== undefined && event.button !== 0) return;

  event.preventDefault();
  state.dragging = true;
  state.pointerId = event.pointerId;
  state.dragStartX = event.clientX;
  state.lastX = event.clientX;
  state.lastMoveAt = performance.now();
  state.dragVelocity = 0;
  setPointer(event.clientX, event.clientY);
  experience.classList.add('is-grabbing');
  experience.setPointerCapture?.(event.pointerId);
}, { passive: false });

experience.addEventListener('pointermove', (event) => {
  setPointer(event.clientX, event.clientY);
  if (!state.dragging || (state.pointerId !== null && event.pointerId !== state.pointerId)) return;

  event.preventDefault();
  const now = performance.now();
  const deltaX = event.clientX - state.lastX;
  const totalX = event.clientX - state.dragStartX;
  const dt = Math.max(8, now - state.lastMoveAt);

  if (!state.active && Math.abs(totalX) > 10) startUnroll(totalX);

  if (state.active && !state.committed) {
    state.revealTarget = clamp01((Math.abs(totalX) - 10) / Math.max(innerWidth * 0.26, 1));
    if (state.revealTarget > 0.18) state.committed = true;
  }

  if (state.active && (state.reveal > 0.28 || state.committed)) panByPixels(deltaX, dt);

  state.lastX = event.clientX;
  state.lastMoveAt = now;
}, { passive: false });

function endPointer() {
  if (!state.dragging) return;

  state.dragging = false;
  experience.classList.remove('is-grabbing');

  if (state.pointerId !== null) {
    try { experience.releasePointerCapture?.(state.pointerId); } catch {}
  }
  state.pointerId = null;

  if (state.active) {
    if (state.committed || state.reveal > 0.13) {
      commitUnroll();
    } else {
      state.revealTarget = 0;
      state.active = false;
      experience.classList.remove('is-unrolling');
    }
  }

  state.velocity = clamp(state.dragVelocity * 0.55, -1.2, 1.2);
  state.dragVelocity = 0;
}

experience.addEventListener('pointerup', endPointer, { passive: true });
experience.addEventListener('pointercancel', endPointer, { passive: true });

addEventListener('wheel', (event) => {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(delta) < 1) return;

  event.preventDefault();
  if (!state.active) {
    setDirection(delta > 0 ? -1 : 1);
    commitUnroll();
  }

  const deltaCenter = delta * state.span * 0.00095;
  state.targetOffset = clamp(state.targetOffset + deltaCenter, state.minCenter, state.maxCenter);
  state.velocity = clamp(state.velocity + deltaCenter * 5.0, -1.1, 1.1);
  state.pull = Math.min(1, state.pull + Math.abs(delta) * 0.0015);
}, { passive: false });

addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(event.key)) return;

  event.preventDefault();
  if (!state.active) commitUnroll();
  const sign = event.key === 'ArrowLeft' || event.key === 'PageUp' ? -1 : 1;
  state.targetOffset = clamp(state.targetOffset + sign * state.span * 0.42, state.minCenter, state.maxCenter);
  state.velocity += sign * state.span * 0.35;
});

enterButton?.addEventListener('click', () => {
  if (enterButton.dataset.unroll === 'true') commitUnroll();
});

setTimeout(() => {
  if (!state.active) {
    unrollHint?.classList.add('is-visible');
    if (enterButton) {
      enterButton.dataset.unroll = 'true';
      enterButton.innerHTML = 'UNROLL THE NIGHT <span aria-hidden="true">↔</span>';
    }
  }
}, 2200);

if (state.active) {
  experience.classList.add('is-unrolling');
  applyRevealStyles();
}

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

if (!gl) {
  fallback?.classList.add('is-visible');
  scrollCanvas.hidden = true;
  setBuildMarker('UNROLL-CSS');
  updateMetrics(5000, 700);
  updateProgress();

  const animateFallback = () => {
    const dt = 1 / 60;
    state.reveal += (state.revealTarget - state.reveal) * (1 - Math.pow(reducedMotion ? 0.000001 : 0.004, dt));

    if (!state.dragging) {
      state.targetOffset = clamp(state.targetOffset + state.velocity * dt, state.minCenter, state.maxCenter);
      state.velocity *= Math.exp(-4.6 * dt);
    }

    state.offset += (state.targetOffset - state.offset) * .18;
    state.pull *= .9;
    applyRevealStyles();
    updateProgress();
    requestAnimationFrame(animateFallback);
  };
  requestAnimationFrame(animateFallback);
} else {
  const loadText = (path) => fetch(path).then((response) => {
    if (!response.ok) throw new Error(`UNROLL: failed ${path}`);
    return response.text();
  });

  const loadImage = (src, optional = false) => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => optional ? resolve(null) : reject(new Error(`UNROLL: failed ${src}`));
    image.src = src;
  });

  function compile(type, source, label) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`${label}: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  function createProgram(vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource, 'vertex'));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource, 'fragment'));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  }

  let [vertexSource, fragmentSource] = await Promise.all([
    loadText('./src/experience/shaders/unroll/scroll.vert.glsl'),
    loadText('./src/experience/shaders/unroll/scroll.frag.glsl'),
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
      .replace('outColor = vec4(clamp(color, 0.0, 1.0), 1.0);', 'gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);');
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

  const uniformNames = [
    'uScroll','uRight','uResolution','uScrollSize','uRightSize','uPointer','uLantern',
    'uTime','uOffset','uVelocity','uReveal','uPull','uHasRight','uReducedMotion','uSpan',
  ];
  const uniforms = Object.fromEntries(uniformNames.map((name) => [name, gl.getUniformLocation(program, name)]));

  const [scrollImage, rightImage] = await Promise.all([
    loadImage('./public/art/master-scroll/tosa_mitsuoki_hyakki_yako_all_1400.jpg'),
    loadImage('./public/art/master-scroll/tosa_mitsuoki_hyakki_yako_right_3000.jpg', true),
  ]);

  function uploadTexture(image, unit, uniform) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (uniform !== null) gl.uniform1i(uniform, unit);
  }

  uploadTexture(scrollImage, 0, uniforms.uScroll);
  uploadTexture(rightImage || scrollImage, 1, uniforms.uRight);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.35 : 1.75);
    const width = Math.max(1, Math.round(innerWidth * dpr));
    const height = Math.max(1, Math.round(innerHeight * dpr));

    if (scrollCanvas.width !== width || scrollCanvas.height !== height) {
      scrollCanvas.width = width;
      scrollCanvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    updateMetrics(scrollImage.naturalWidth, scrollImage.naturalHeight);
  }

  addEventListener('resize', resize, { passive: true });
  resize();
  setBuildMarker(isWebGL2 ? 'UNROLL-WEBGL2' : 'UNROLL-WEBGL1');
  updateProgress();

  const start = performance.now();
  let previous = start;

  function render(now) {
    const dt = Math.min((now - previous) / 1000, .05);
    previous = now;
    const time = (now - start) / 1000;

    state.pointer.x += (state.pointerTarget.x - state.pointer.x) * (1 - Math.pow(.0009, dt));
    state.pointer.y += (state.pointerTarget.y - state.pointer.y) * (1 - Math.pow(.0009, dt));
    state.reveal += (state.revealTarget - state.reveal) * (1 - Math.pow(reducedMotion ? .000001 : .004, dt));

    if (!state.dragging) {
      state.targetOffset = clamp(state.targetOffset + state.velocity * dt, state.minCenter, state.maxCenter);
      state.velocity *= Math.exp(-4.6 * dt);
    }

    const offsetBefore = state.offset;
    state.offset += (state.targetOffset - state.offset) * (1 - Math.pow(state.dragging ? .00025 : .009, dt));
    const measuredVelocity = (state.offset - offsetBefore) / Math.max(dt, .001);
    state.pull += (0 - state.pull) * (1 - Math.pow(.025, dt));

    applyRevealStyles();
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, scrollCanvas.width, scrollCanvas.height);
    gl.uniform2f(uniforms.uScrollSize, scrollImage.naturalWidth, scrollImage.naturalHeight);
    if (uniforms.uRightSize !== null) {
      gl.uniform2f(
        uniforms.uRightSize,
        rightImage?.naturalWidth || scrollImage.naturalWidth,
        rightImage?.naturalHeight || scrollImage.naturalHeight,
      );
    }
    gl.uniform2f(uniforms.uPointer, state.pointer.x, state.pointer.y);
    gl.uniform2f(uniforms.uLantern, state.pointer.x, state.pointer.y);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uOffset, state.offset);
    gl.uniform1f(
      uniforms.uVelocity,
      clamp(measuredVelocity / Math.max(state.span, .001) * 1.8 + state.dragVelocity * .05, -3, 3),
    );
    gl.uniform1f(uniforms.uReveal, state.reveal);
    gl.uniform1f(uniforms.uPull, state.pull);
    if (uniforms.uHasRight !== null) gl.uniform1f(uniforms.uHasRight, 0);
    gl.uniform1f(uniforms.uReducedMotion, reducedMotion ? 1 : 0);
    if (uniforms.uSpan !== null) gl.uniform1f(uniforms.uSpan, state.span);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    updateProgress();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
