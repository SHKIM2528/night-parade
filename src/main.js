const reportRuntimeError = (error) => {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  console.error(error);
  const loadingNode = document.querySelector('#loading');
  if (loadingNode) {
    loadingNode.textContent = message;
    loadingNode.style.whiteSpace = 'pre-wrap';
    loadingNode.style.padding = '32px';
    loadingNode.style.fontSize = '12px';
  }
};
addEventListener('error', (event) => reportRuntimeError(event.error ?? event.message));
addEventListener('unhandledrejection', (event) => reportRuntimeError(event.reason));

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const fallback = document.querySelector('#fallback');
const cursor = document.querySelector('#cursor');
const enter = document.querySelector('#enter');
const experience = document.querySelector('.experience');
const buildTag = document.querySelector('.build-tag');

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
  canvas.dataset.renderer = isWebGL2 ? 'webgl2-cutout' : 'webgl1';
  experience.dataset.renderer = canvas.dataset.renderer;
  if (buildTag) buildTag.textContent = `GATE 01 · V06 · ${canvas.dataset.renderer.toUpperCase()}`;
} else {
  if (buildTag) buildTag.textContent = 'GATE 01 · V06 · CANVAS2D';
  const { startCanvasFallback } = await import('./fallback/canvas2d.js');
  await startCanvasFallback({ canvas, loading, fallback, cursor, enter, experience, params, reducedMotion });
}

if (gl) {
  const freezeFrame = params.has('freeze');
  const forceAwake = params.has('awake');
  const captureLantern = params.get('lantern')?.split(',').map(Number);

  const loadText = (path) => fetch(path).then((response) => {
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    return response.text();
  });

  function compile(type, source, label) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`${label}: ${log || 'shader compilation failed'}`);
    }
    return shader;
  }

  function createProgram(vertexSource, fragmentSource, label) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource, `${label} vertex`));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource, `${label} fragment`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`${label}: ${gl.getProgramInfoLog(program) || 'program link failed'}`);
    }
    return program;
  }

  const uniformMap = (program, names) => Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  );

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      image.src = src;
    });
  }

  const textureDefs = [
    ['uSource', './public/art/characters/green-monkey/source/green_monkey_source_context.png'],
    ['uClean', './public/art/clean-plates/green_monkey_clean_plate.png'],
    ['uCutout', './public/art/characters/green-monkey/cutouts/green_monkey_ink_only_rgba.png'],
    ['uRegionsA', './public/art/characters/green-monkey/masks/green_monkey_regions_a_v02.png'],
    ['uRegionsB', './public/art/characters/green-monkey/masks/green_monkey_regions_b_v02.png'],
    ['uRegionsC', './public/art/characters/green-monkey/masks/green_monkey_regions_c_v02.png'],
  ];

  const images = await Promise.all(textureDefs.map(([, src]) => loadImage(src)));
  images.forEach((image, index) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });

  function bindSamplerUnits(program) {
    gl.useProgram(program);
    textureDefs.forEach(([name], index) => {
      const location = gl.getUniformLocation(program, name);
      if (location !== null) gl.uniform1i(location, index);
    });
  }

  const commonUniformNames = [
    'uResolution', 'uLantern', 'uPointer', 'uTime', 'uIntro', 'uReducedMotion',
    'uWakeA', 'uWakeB', 'uWakeC', 'uMotion', 'uEvent',
  ];

  let baseProgram;
  let baseUniforms;
  let baseVao;
  let puppetProgram;
  let puppetUniforms;
  let puppetVao;
  let puppetIndexCount = 0;

  const fullVertexSource = await loadText('./src/experience/shaders/lantern/hero.vert.glsl');

  if (isWebGL2) {
    const [baseFragmentSource, puppetVertexSource, puppetFragmentSource] = await Promise.all([
      loadText('./src/experience/shaders/lantern/hero-base.frag.glsl'),
      loadText('./src/experience/shaders/lantern/creature.vert.glsl'),
      loadText('./src/experience/shaders/lantern/creature.frag.glsl'),
    ]);

    baseProgram = createProgram(fullVertexSource, baseFragmentSource, 'paper base');
    baseUniforms = uniformMap(baseProgram, commonUniformNames);
    bindSamplerUnits(baseProgram);

    baseVao = gl.createVertexArray();
    gl.bindVertexArray(baseVao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const basePosition = gl.getAttribLocation(baseProgram, 'aPosition');
    gl.enableVertexAttribArray(basePosition);
    gl.vertexAttribPointer(basePosition, 2, gl.FLOAT, false, 0, 0);

    puppetProgram = createProgram(puppetVertexSource, puppetFragmentSource, 'articulated cutout puppet');
    puppetUniforms = uniformMap(puppetProgram, [...commonUniformNames, 'uPass', 'uPart']);
    bindSamplerUnits(puppetProgram);

    const segments = innerWidth < 720 ? 72 : 104;
    const vertices = new Float32Array((segments + 1) * (segments + 1) * 2);
    let vertexOffset = 0;
    for (let y = 0; y <= segments; y += 1) {
      for (let x = 0; x <= segments; x += 1) {
        vertices[vertexOffset++] = x / segments;
        vertices[vertexOffset++] = y / segments;
      }
    }

    const indices = new Uint16Array(segments * segments * 6);
    let indexOffset = 0;
    for (let y = 0; y < segments; y += 1) {
      for (let x = 0; x < segments; x += 1) {
        const a = y * (segments + 1) + x;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices[indexOffset++] = a; indices[indexOffset++] = c; indices[indexOffset++] = b;
        indices[indexOffset++] = b; indices[indexOffset++] = c; indices[indexOffset++] = d;
      }
    }
    puppetIndexCount = indices.length;

    puppetVao = gl.createVertexArray();
    gl.bindVertexArray(puppetVao);
    const gridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const artUvAttribute = gl.getAttribLocation(puppetProgram, 'aArtUv');
    gl.enableVertexAttribArray(artUvAttribute);
    gl.vertexAttribPointer(artUvAttribute, 2, gl.FLOAT, false, 0, 0);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  } else {
    let fallbackFragmentSource = await loadText('./src/experience/shaders/lantern/hero.frag.glsl');
    const fallbackVertexSource = fullVertexSource
      .replace('#version 300 es', '')
      .replace('in vec2 aPosition;', 'attribute vec2 aPosition;')
      .replace('out vec2 vUv;', 'varying vec2 vUv;');
    fallbackFragmentSource = fallbackFragmentSource
      .replace('#version 300 es', '')
      .replace('in vec2 vUv;', 'varying vec2 vUv;')
      .replace('out vec4 outColor;', '')
      .replaceAll('texture(', 'texture2D(')
      .replace('outColor = vec4(color,1.0);', 'gl_FragColor = vec4(color,1.0);');

    baseProgram = createProgram(fallbackVertexSource, fallbackFragmentSource, 'WebGL 1 fallback');
    baseUniforms = uniformMap(baseProgram, commonUniformNames.filter((name) => name !== 'uEvent'));
    bindSamplerUnits(baseProgram);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(baseProgram, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  const initial = Array.isArray(captureLantern) && captureLantern.length === 2 && captureLantern.every(Number.isFinite)
    ? { x: captureLantern[0], y: captureLantern[1] }
    : forceAwake ? { x: .92, y: .14 } : { x: .315, y: .355 };

  const state = {
    pointer: { ...initial }, target: { ...initial }, lantern: { ...initial },
    velocity: { x: 0, y: 0 }, lastTarget: { ...initial }, wakes: new Float32Array(9),
    intro: forceAwake ? 1 : 0, entered: forceAwake, shock: params.has('recoil') ? 1 : 0,
    pinPulse: 0, previousFaceLight: forceAwake ? 0 : 1, previousFaceWake: forceAwake ? 1 : 0,
    awakeningClock: forceAwake ? .34 : 99, awakeningCooldown: 0,
  };
  if (forceAwake) state.wakes.fill(1);

  const regionPivots = [
    [.2674, .5764], [.4585, .6727], [.6025, .6766], [.5915, .3440], [.6117, .4020],
    [.4719, .4944], [.3341, .2558], [.3734, .2608], [.3420, .4500],
  ];
  const wakeRates = [1.7, 2.0, 2.1, 2.6, 2.9, 4.2, 5.8, 3.7, 9.0];
  const freezeRates = [8.2, 8.6, 8.8, 9.4, 10.2, 13.4, 16.0, 13.8, 20.0];
  const globalWakeWeights = [.32, .38, .38, .68, .78, .98, 1.14, 1.02, 1.30];

  function smoothstep(edge0, edge1, value) {
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function artToScreen(art, aspect) {
    const crop = .988;
    if (aspect >= 1) return { x: .5 + (art[0] - .5) / crop, y: .5 + (art[1] - .463) * aspect / crop };
    return { x: .5 + (art[0] - .435) / (crop * aspect), y: .5 + (art[1] - .49) / crop };
  }

  function lanternLightAt(screenPoint, aspect) {
    const dx = (screenPoint.x - state.lantern.x) * aspect;
    const dy = screenPoint.y - state.lantern.y;
    const speed = Math.min(Math.hypot(state.velocity.x * aspect, state.velocity.y), 2.65);
    const d = Math.hypot(dx / (.286 + speed * .030), dy / (.315 - Math.min(speed, 1.5) * .013));
    return 1 - smoothstep(.50, 1.04, d);
  }

  function setTarget(clientX, clientY) {
    if (freezeFrame) return;
    state.target.x = clientX / innerWidth;
    state.target.y = clientY / innerHeight;
    experience.classList.add('is-engaged');
    cursor.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;
    cursor.style.opacity = '1';
  }

  addEventListener('pointermove', (event) => setTarget(event.clientX, event.clientY), { passive: true });
  addEventListener('pointerdown', (event) => { setTarget(event.clientX, event.clientY); state.entered = true; });
  addEventListener('pointerleave', () => { cursor.style.opacity = '0'; });
  enter.addEventListener('click', () => { state.entered = true; });

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2);
    const width = Math.max(1, Math.round(innerWidth * dpr));
    const height = Math.max(1, Math.round(innerHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }
  addEventListener('resize', resize, { passive: true });
  resize();
  loading.classList.add('is-hidden');
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  function awakeningEnvelope(time) {
    if (time < 0 || time > 1.7) return 0;
    if (time < .32) return Math.sin((time / .32) * Math.PI * .5);
    return Math.exp(-(time - .32) * 1.46) * (1 + Math.sin((time - .32) * 8.5) * .07);
  }

  function setCommonUniforms(program, uniforms, t, faceLight, speed, awakening, globalWake) {
    gl.useProgram(program);
    if (uniforms.uResolution !== null) gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    if (uniforms.uLantern !== null) gl.uniform2f(uniforms.uLantern, state.lantern.x, state.lantern.y);
    if (uniforms.uPointer !== null) gl.uniform2f(uniforms.uPointer, state.pointer.x, state.pointer.y);
    if (uniforms.uTime !== null) gl.uniform1f(uniforms.uTime, t);
    if (uniforms.uIntro !== null) gl.uniform1f(uniforms.uIntro, state.intro);
    if (uniforms.uReducedMotion !== null) gl.uniform1f(uniforms.uReducedMotion, reducedMotion);
    if (uniforms.uWakeA !== null) gl.uniform4f(uniforms.uWakeA, state.wakes[0], state.wakes[1], state.wakes[2], state.wakes[3]);
    if (uniforms.uWakeB !== null) gl.uniform4f(uniforms.uWakeB, state.wakes[4], state.wakes[5], state.wakes[6], state.wakes[7]);
    if (uniforms.uWakeC !== null) gl.uniform4f(uniforms.uWakeC, state.wakes[8], faceLight, 0, 0);
    if (uniforms.uMotion !== null) gl.uniform4f(uniforms.uMotion, state.shock, Math.min(speed, 3), Math.max(-2, Math.min(2, state.velocity.x)), Math.max(-2, Math.min(2, state.velocity.y)));
    if (uniforms.uEvent !== null) gl.uniform4f(uniforms.uEvent, awakening, state.wakes[8], globalWake, state.pinPulse);
  }

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
    const lanternEase = 1 - Math.pow(.010, dt);
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
    const lightImpact = faceLight - state.previousFaceLight;
    if (!reducedMotion && lightImpact > .035 && speed > .16) {
      state.shock = Math.max(state.shock, Math.min(1, lightImpact * 5.2 + speed * .25));
      state.pinPulse = Math.max(state.pinPulse, Math.min(1, lightImpact * 4.0 + speed * .15));
    }
    state.previousFaceLight = faceLight;
    state.shock *= Math.exp(-2.8 * dt);
    state.pinPulse *= Math.exp(-7.4 * dt);

    state.awakeningCooldown = Math.max(0, state.awakeningCooldown - dt);
    if (!reducedMotion && state.wakes[8] > .24 && state.previousFaceWake <= .24 && state.awakeningCooldown <= 0) {
      state.awakeningClock = 0;
      state.awakeningCooldown = 1.65;
    }
    state.previousFaceWake = state.wakes[8];
    state.awakeningClock += dt;
    const awakening = awakeningEnvelope(state.awakeningClock);

    let weightedWake = 0;
    let wakeWeightSum = 0;
    for (let i = 0; i < state.wakes.length; i += 1) {
      weightedWake += state.wakes[i] * globalWakeWeights[i];
      wakeWeightSum += globalWakeWeights[i];
    }
    const globalWake = weightedWake / wakeWeightSum;

    gl.disable(gl.BLEND);
    if (isWebGL2) gl.bindVertexArray(baseVao);
    setCommonUniforms(baseProgram, baseUniforms, t, faceLight, speed, awakening, globalWake);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (isWebGL2) {
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(puppetVao);
      setCommonUniforms(puppetProgram, puppetUniforms, t, faceLight, speed, awakening, globalWake);

      // Shadows first. Then back-to-front paper edges and painted surfaces.
      for (const pass of [0, 1]) {
        gl.uniform1f(puppetUniforms.uPass, pass);
        for (let part = 0; part < 9; part += 1) {
          gl.uniform1i(puppetUniforms.uPart, part);
          gl.drawElements(gl.TRIANGLES, puppetIndexCount, gl.UNSIGNED_SHORT, 0);
        }
      }
      const drawOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (const part of drawOrder) {
        gl.uniform1i(puppetUniforms.uPart, part);
        for (const pass of [2, 3]) {
          gl.uniform1f(puppetUniforms.uPass, pass);
          gl.drawElements(gl.TRIANGLES, puppetIndexCount, gl.UNSIGNED_SHORT, 0);
        }
      }
      gl.bindVertexArray(null);
    }
    if (!freezeFrame) requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
