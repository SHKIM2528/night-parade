# NIGHT PARADE

An interactive living handscroll in which light pins a yōkai back into its historical image and darkness lets the painted body rise as an articulated paper creature.

## Current gate

**Gate 02 V01 — UNROLL**

The accepted V06 cutout hero now pulls back to reveal the full historical handscroll. The user drags the paper itself with inertia while the lantern continues to expose the original pigment.

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

- V06 nine-part WebGL2 cutout puppet retained as the opening close-up;
- separate WebGL full-scroll renderer using runtime image dimensions;
- horizontal drag and wheel navigation with inertia;
- paper bend, edge curl, velocity ink smear, and fiber-scattered lantern;
- optional high-resolution right-half texture blended over the overview;
- live progress and chapter labels;
- WebGL1 scroll compatibility and CSS image fallback;
- persistent upper-left gate/renderer marker;
- safe `predev` Git refresh on clean `main`.

## Gate rule

Do not add more hero rigs, audio, backend, archive, user seals, or dawn until the close-up-to-full-scroll transition and direct paper navigation pass visual review.

Review instructions: `docs/gates/GATE_02_V01_UNROLL.md`.
