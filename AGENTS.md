# AGENTS.md

## Project

NIGHT PARADE — an immersive interactive handscroll.

## Non-negotiable workflow

1. Work on one visual gate only.
2. Do not implement the full site from a concept summary.
3. Do not add libraries, fallbacks, debug panels, backend, or optimization unless the active gate requires them.
4. Visual approval comes before architecture expansion.
5. Never replace source artwork with generated approximations without explicit approval.
6. Preserve source/license records.
7. Stop after producing the exact artifacts requested by the active gate.

## Active gate

`docs/gates/GATE_01_V04_AWAKENING.md`

Only improve the full-viewport green-monkey lantern scene.

Do not add:

- more creatures;
- horizontal scroll navigation;
- audio;
- backend or saved seals;
- framework migrations;
- generic particle effects;
- unrelated landing-page sections.

## Visual priority

The light/dark boundary must read immediately:

- light = unchanged historical image;
- dark = deformable creature lifted from the paper;
- eyes acquire the lantern before the body wakes;
- face, fur, arm, robe, and torso move with different delay and curvature;
- a fast light pass produces recoil and a paper-tension ripple;
- light collapses the mesh precisely into the source painting;
- no rigid whole-character sticker, duplicated edge, black bars, or low-resolution mask breakup.
