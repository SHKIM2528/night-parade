# Gate 01 — Lantern Hero

## Goal
Prove the signature interaction in one full-viewport scene:

- the handscroll itself fills the browser;
- light pins the creature back into the historical image;
- darkness lets selected ink layers rise, lag, and cast depth shadows;
- the lantern follows with inertia;
- no black bars, cards, generic circular spotlight, or whole-character sticker.

## Scope
Only the green-monkey hero. No navigation, archive, audio, backend, unroll, or other characters.

## Review
1. Open at 1920×1080.
2. Move the pointer slowly across the face, arm, and robe.
3. Hold the lantern over each region and verify all depth reaches zero.
4. Move out quickly and verify layers return with different lag.
5. Inspect silhouette and shadow quality at 200%.

## Pass conditions
- The paper fills the viewport and remains legible in darkness.
- The light/dark boundary is the strongest moment.
- Head, arm, torso, robe, and fur do not move as one rigid PNG.
- Under light, the source image is visually unchanged.
- Outside light, the creature has restrained but unmistakable depth.
- No low-resolution edge breakup or selection-mask look.
