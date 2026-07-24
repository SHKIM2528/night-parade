# Gate 01 V05 — Articulation Pass

## Why V04 did not pass

The V04 recording proved that the WebGL 2 mesh path was running, but the visible result still read as a small lenticular/parallax distortion rather than a living character.

It also exposed an eye bug: V04 drew synthetic black pupils over the historical eyes, and the prepared eye masks were vertically offset. This produced four visible eye marks.

## V05 changes

- Remove all synthetic pupil circles.
- Move the original painted eyes with corrected eye-mask coordinates.
- Add a restrained blink and jaw pulse while the face is awake.
- Increase head, face, fur, arm, robe, torso, and leg separation.
- Bias overlapping masks toward their dominant anatomical region instead of averaging every deformation together.
- Add visible head attention toward the lantern and stronger recoil away from a fast light pass.
- Increase lift-dependent contact-shadow distance and opacity.
- Increase creature visibility in darkness without turning it into a bright sticker.
- Show the exact build and renderer in the upper-left corner of every review recording.

## Review sequence

1. Confirm the upper-left marker reads `GATE 01 · V05 · WEBGL2-MESH`.
2. Keep the lantern away from the face for two seconds.
3. Watch for original-eye tracking, a blink, head movement, jaw pulse, arm/fur delay, and breathing.
4. Move the lantern quickly across the face and confirm a clear recoil.
5. Return the lantern slowly and confirm exact collapse into the source painting.

## Scope

This remains a single-crop character gate. The full historical handscroll is reserved for the next `UNROLL` stage after the articulation reads clearly.

Do not add a second creature, full-scroll navigation, sound, backend, or decorative particles until this gate passes.
