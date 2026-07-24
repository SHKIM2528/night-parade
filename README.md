# NIGHT PARADE

An interactive living handscroll in which light pins a yōkai back into its historical image and darkness lets the painted body rise as an articulated paper creature.

## Current gate

**Gate 01 V06 — Cutout Puppet**

V06 replaces the single blended deformation mesh with nine independently rendered paper parts. This is the last single-character technique gate before the full-scroll `UNROLL` stage.

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

- primary WebGL2 articulated cutout renderer;
- nine independent historical-paper parts using existing anatomical masks;
- separate hinges, depth, edge thickness, contact shadows, wake/freeze timing, and recoil;
- original painted-eye tracking, blink, jaw pulse, torso breathing, arm swing, robe bend, and delayed fur;
- irregular motion-stretched lantern boundary;
- exact source scan under light and user-prepared clean plate in darkness;
- WebGL1 and Canvas2D compatibility paths retained;
- persistent upper-left gate/renderer marker;
- safe `predev` Git refresh on clean `main`.

## Gate rule

Do not add a second creature, full-scroll navigation, sound, backend, archive, or decorative particles until V06 motion is reviewed.

Review instructions: `docs/gates/GATE_01_V06_CUTOUT_PUPPET.md`.
