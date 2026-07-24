# NIGHT PARADE

An interactive living handscroll in which light pins a yōkai back into its historical image and darkness lets the ink rise into layered motion.

## Current gate

**Gate 01 V03 — Lantern Hero**

Only the green-monkey hero is active. The goal is to prove the signature light/dark rule before expanding the project.

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
- WebGL 2 full-screen shader with WebGL 1 and Canvas 2D compatibility paths;
- exact source image + user-prepared clean plate;
- nine high-resolution anatomical region weights;
- persistent region wake values, independent layered transforms, recoil, and contact shadows;
- pointer, touch, mobile crop, and reduced motion;
- safe `predev` Git refresh: fast-forward-only on clean `main`, fetch-only on feature branches;
- public-domain source records under `docs/sources/`.

## Gate rule

Do not add the full scroll, more creatures, audio, backend, navigation, or loading architecture until Gate 01 passes visual review.

Review instructions: `docs/gates/GATE_01_REVIEW_V03.md`.
