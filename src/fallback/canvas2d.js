const ART_SIZE = 1450;

const assetSources = {
  source: './public/art/characters/green-monkey/source/green_monkey_source_context.png',
  clean: './public/art/clean-plates/green_monkey_clean_plate.png',
  ink: './public/art/characters/green-monkey/cutouts/green_monkey_ink_only_rgba.png',
  regionsA: './public/art/characters/green-monkey/masks/green_monkey_regions_a_v02.png',
  regionsB: './public/art/characters/green-monkey/masks/green_monkey_regions_b_v02.png',
  regionsC: './public/art/characters/green-monkey/masks/green_monkey_regions_c_v02.png',
};

const layerDefs = [
  { mask: 'regionsA', channel: 0, pivot: [.267, .576], move: [-.002, .003], rotation: -.25, scale: 1.002, depth: .26 },
  { mask: 'regionsA', channel: 1, pivot: [.458, .673], move: [-.003, .006], rotation: -.75, scale: 1.004, depth: .38 },
  { mask: 'regionsA', channel: 2, pivot: [.603, .677], move: [.004, .005], rotation: .82, scale: 1.004, depth: .42 },
  { mask: 'regionsA', channel: 3, pivot: [.592, .344], move: [.006, -.004], rotation: .45, scale: 1.010, depth: .58 },
  { mask: 'regionsB', channel: 0, pivot: [.612, .402], move: [.010, -.005], rotation: 1.10, scale: 1.012, depth: .70 },
  { mask: 'regionsB', channel: 1, pivot: [.472, .494], move: [-.010, -.008], rotation: 2.05, scale: 1.013, depth: .82 },
  { mask: 'regionsB', channel: 2, pivot: [.334, .256], move: [-.007, -.012], rotation: -1.15, scale: 1.012, depth: .78 },
  { mask: 'regionsB', channel: 3, pivot: [.373, .261], move: [-.012, -.016], rotation: -1.95, scale: 1.018, depth: .96 },
  { mask: 'regionsC', channel: 0, pivot: [.322, .424], move: [-.010, -.008], rotation: -.72, scale: 1.014, depth: .88 },
];

const wakeRates = [2.4, 2.8, 2.9, 3.7, 3.25, 4.6, 5.7, 4.3, 7.8];
const freezeRates = [5.2, 5.8, 6.1, 7.0, 7.2, 9.2, 11.8, 8.7, 16.0];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function createCanvas(width, height) {
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  return surface;
}

function artRect(aspect) {
  const crop = .988;
  if (aspect >= 1) {
    return {
      x: (.5 - crop * .5) * ART_SIZE,
      y: (.463 - crop / aspect * .5) * ART_SIZE,
      width: crop * ART_SIZE,
      height: crop / aspect * ART_SIZE,
    };
  }
  return {
    x: (.5 - crop * aspect * .5) * ART_SIZE,
    y: (.49 - crop * .5) * ART_SIZE,
    width: crop * aspect * ART_SIZE,
    height: crop * ART_SIZE,
  };
}

function drawArt(ctx, image, width, height) {
  const source = artRect(width / Math.max(height, 1));
  ctx.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, width, height);
}

function artToScreen(point, width, height) {
  const aspect = width / Math.max(height, 1);
  const crop = .988;
  if (aspect >= 1) {
    return {
      x: (.5 + (point[0] - .5) / crop) * width,
      y: (.5 + (point[1] - .463) * aspect / crop) * height,
    };
  }
  return {
    x: (.5 + (point[0] - .5) / (crop * aspect)) * width,
    y: (.5 + (point[1] - .49) / crop) * height,
  };
}

function createLayer(ink, mask, channel) {
  const maskCanvas = createCanvas(ART_SIZE, ART_SIZE);
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  maskCtx.drawImage(mask, 0, 0, ART_SIZE, ART_SIZE);
  const pixels = maskCtx.getImageData(0, 0, ART_SIZE, ART_SIZE);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const alpha = pixels.data[i + channel];
    pixels.data[i] = 255;
    pixels.data[i + 1] = 255;
    pixels.data[i + 2] = 255;
    pixels.data[i + 3] = alpha;
  }
  maskCtx.putImageData(pixels, 0, 0);

  const layer = createCanvas(ART_SIZE, ART_SIZE);
  const layerCtx = layer.getContext('2d');
  layerCtx.drawImage(ink, 0, 0, ART_SIZE, ART_SIZE);
  layerCtx.globalCompositeOperation = 'destination-in';
  layerCtx.drawImage(maskCanvas, 0, 0);
  return layer;
}

function drawLanternMask(ctx, width, height, lantern, invert = false) {
  const aspect = width / Math.max(height, 1);
  const radiusX = width * .30 / Math.max(aspect, 1);
  const radiusY = height * .315;
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  if (invert) {
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(.32, 'rgba(0,0,0,.03)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');
  } else {
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(.32, 'rgba(0,0,0,.97)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.save();
  ctx.translate(lantern.x * width, lantern.y * height);
  ctx.scale(radiusX, radiusY);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function startCanvasFallback({
  canvas,
  loading,
  fallback,
  cursor,
  enter,
  experience,
  params,
  reducedMotion,
}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    fallback.hidden = false;
    fallback.querySelector('p').textContent = 'This browser cannot create a graphics canvas.';
    loading.classList.add('is-hidden');
    return;
  }

  try {
    const entries = await Promise.all(
      Object.entries(assetSources).map(async ([key, src]) => [key, await loadImage(src)]),
    );
    const assets = Object.fromEntries(entries);
    const layers = layerDefs.map((definition) => (
      createLayer(assets.ink, assets[definition.mask], definition.channel)
    ));

    const freezeFrame = params.has('freeze');
    const captureLantern = params.get('lantern')?.split(',').map(Number);
    const initial = Array.isArray(captureLantern)
      && captureLantern.length === 2
      && captureLantern.every(Number.isFinite)
      ? { x: captureLantern[0], y: captureLantern[1] }
      : { x: .315, y: .355 };

    const state = {
      pointer: { ...initial },
      target: { ...initial },
      lantern: { ...initial },
      wakes: new Float32Array(9),
      entered: false,
      intro: 0,
    };

    let creature = createCanvas(1, 1);
    let light = createCanvas(1, 1);

    function resize() {
      const width = Math.max(1, Math.round(innerWidth));
      const height = Math.max(1, Math.round(innerHeight));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        creature = createCanvas(width, height);
        light = createCanvas(width, height);
      }
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
    addEventListener('pointerdown', (event) => {
      setTarget(event.clientX, event.clientY);
      state.entered = true;
    });
    addEventListener('pointerleave', () => { cursor.style.opacity = '0'; });
    addEventListener('resize', resize, { passive: true });
    enter.addEventListener('click', () => { state.entered = true; });

    resize();
    canvas.dataset.renderer = 'canvas2d';
    experience.dataset.renderer = 'canvas2d';
    fallback.hidden = true;
    loading.classList.add('is-hidden');

    let previous = performance.now();
    const start = previous;
    function render(now) {
      const dt = Math.min((now - previous) / 1000, .05);
      previous = now;
      const t = freezeFrame ? 5 : (now - start) / 1000;
      const pointerEase = 1 - Math.pow(.0008, dt);
      const lanternEase = 1 - Math.pow(.008, dt);
      state.pointer.x += (state.target.x - state.pointer.x) * pointerEase;
      state.pointer.y += (state.target.y - state.pointer.y) * pointerEase;
      state.lantern.x += (state.pointer.x - state.lantern.x) * lanternEase;
      state.lantern.y += (state.pointer.y - state.lantern.y) * lanternEase;
      const introTarget = state.entered || t > .45 ? 1 : 0;
      state.intro += (introTarget - state.intro) * (1 - Math.pow(.018, dt));

      const width = canvas.width;
      const height = canvas.height;
      const aspect = width / Math.max(height, 1);
      for (let i = 0; i < state.wakes.length; i += 1) {
        const p = artToScreen(layerDefs[i].pivot, width, height);
        const dx = (p.x / width - state.lantern.x) * aspect;
        const dy = p.y / height - state.lantern.y;
        const distance = Math.hypot(dx / .30, dy / .315);
        const illumination = Math.max(0, Math.min(1, 1 - (distance - .30) / .68)) * state.intro;
        const targetWake = reducedMotion ? 0 : 1 - illumination;
        const rate = targetWake > state.wakes[i] ? wakeRates[i] : freezeRates[i];
        state.wakes[i] += (targetWake - state.wakes[i]) * (1 - Math.exp(-rate * dt));
      }

      ctx.save();
      ctx.filter = 'brightness(36%) saturate(58%) hue-rotate(145deg)';
      drawArt(ctx, assets.clean, width, height);
      ctx.restore();
      ctx.fillStyle = 'rgba(3,10,12,.18)';
      ctx.fillRect(0, 0, width, height);

      const creatureCtx = creature.getContext('2d');
      creatureCtx.clearRect(0, 0, width, height);
      layerDefs.forEach((definition, index) => {
        const wake = state.wakes[index];
        if (wake < .002) return;
        const pivot = artToScreen(definition.pivot, width, height);
        const moveX = definition.move[0] * width / .988 * wake;
        const moveY = definition.move[1] * height * Math.max(aspect, 1) / .988 * wake;
        const rotation = definition.rotation * Math.PI / 180 * wake;
        const scale = 1 + (definition.scale - 1) * wake;

        creatureCtx.save();
        creatureCtx.translate(pivot.x, pivot.y);
        creatureCtx.translate(moveX + definition.depth * 8, moveY + definition.depth * 11);
        creatureCtx.rotate(rotation);
        creatureCtx.scale(scale, scale);
        creatureCtx.translate(-pivot.x, -pivot.y);
        creatureCtx.globalAlpha = (.12 + definition.depth * .17) * wake;
        creatureCtx.filter = `blur(${3 + definition.depth * 6}px) brightness(0)`;
        drawArt(creatureCtx, layers[index], width, height);
        creatureCtx.restore();

        creatureCtx.save();
        creatureCtx.translate(pivot.x, pivot.y);
        creatureCtx.translate(moveX, moveY);
        creatureCtx.rotate(rotation);
        creatureCtx.scale(scale, scale);
        creatureCtx.translate(-pivot.x, -pivot.y);
        creatureCtx.globalAlpha = .78 + wake * .22;
        creatureCtx.filter = 'brightness(48%) saturate(62%) hue-rotate(145deg)';
        drawArt(creatureCtx, layers[index], width, height);
        creatureCtx.restore();
      });
      creatureCtx.globalCompositeOperation = 'destination-out';
      creatureCtx.globalAlpha = state.intro;
      drawLanternMask(creatureCtx, width, height, state.lantern);
      creatureCtx.globalAlpha = 1;
      creatureCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(creature, 0, 0);

      const lightCtx = light.getContext('2d');
      lightCtx.clearRect(0, 0, width, height);
      drawArt(lightCtx, assets.source, width, height);
      lightCtx.globalCompositeOperation = 'destination-in';
      lightCtx.globalAlpha = state.intro;
      drawLanternMask(lightCtx, width, height, state.lantern);
      lightCtx.globalAlpha = 1;
      lightCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(light, 0, 0);

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  } catch (error) {
    console.error('Canvas fallback failed', error);
    fallback.hidden = false;
    fallback.querySelector('p').textContent = 'The artwork could not be loaded.';
    loading.classList.add('is-hidden');
  }
}
