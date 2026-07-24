# NIGHT PARADE

An interactive living handscroll in which light pins a yōkai back into its historical image and darkness lets the ink rise into layered motion.

## Current gate

**Gate 01 V05 — Articulation Pass**

Only the green-monkey hero is active. V05 must stop reading as a subtle lenticular distortion and start reading as a character with visible head, face, fur, arm, jaw, eye, and breathing motion.

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
- corrected original-eye tracking with no synthetic pupil overlay;
- blink, jaw pulse, breathing, staged articulation, recoil, paper tension, and lift-dependent shadows;
- dominant-region weighting to reduce the blended lenticular look;
- motion-distorted lantern boundary scattered by paper-fiber noise;
- persistent upper-left build/renderer marker for review recordings;
- deliberate desktop/mobile crops and reduced-motion support;
- safe `predev` Git refresh: fast-forward-only on clean `main`, fetch-only on feature branches;
- public-domain source records under `docs/sources/`.

## Gate rule

The current crop is a character-technique gate. The full historical handscroll will be used in the following `UNROLL` stage only after V05 passes visual review.

Do not add more creatures, audio, backend, navigation, or loading architecture yet.

Review instructions: `docs/gates/GATE_01_V05_ARTICULATION.md`.
