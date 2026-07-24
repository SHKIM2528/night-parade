# NIGHT PARADE

An interactive living handscroll in which light pins a yōkai back into its historical image and darkness lets the ink rise into layered motion.

## Current gate

**Gate 01 V04 — Awakening Event**

Only the green-monkey hero is active. The goal is to make the creature unmistakably lift from the paper before the project expands.

## Run

```bash
npm run check
npm run dev
```

Open:

```text
http://127.0.0.1:4173/
```

## Current implementation

- zero runtime dependencies;
- primary WebGL 2 path built from a 128×128 weighted deformation mesh;
- WebGL 1 and Canvas 2D compatibility paths retained;
- exact source image + user-prepared clean plate;
- nine high-resolution anatomical region weights;
- eye tracking, staged wake/freeze timing, local bending, recoil, paper tension, and lift-dependent shadows;
- motion-distorted lantern boundary scattered by paper-fiber noise;
- deliberate desktop/mobile crops and reduced-motion support;
- safe `predev` Git refresh: fast-forward-only on clean `main`, fetch-only on feature branches;
- public-domain source records under `docs/sources/`.

## Gate rule

Do not add the full scroll, more creatures, audio, backend, navigation, or loading architecture until Gate 01 passes visual review.

Review instructions: `docs/gates/GATE_01_V04_AWAKENING.md`.
