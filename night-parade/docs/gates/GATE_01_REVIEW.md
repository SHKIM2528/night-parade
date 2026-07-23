# Gate 01 Review — Lantern Hero V02

## What is implemented

- Full-viewport historical paper surface; no card or black-bar framing.
- Organic lantern with spring-following pointer input.
- Light state returns the exact historical source image.
- Dark state replaces the source with the clean plate and reconstructs the creature from nine independently transformed regions.
- Region masks are high-resolution atlas textures generated from the rig map, not low-resolution circular selections.
- Head, face, fur, arm, torso, robe, bag, and both legs use different depth, lag, scale, and shadow values.
- Mobile uses a deliberate portrait crop rather than stretching the desktop frame.
- Reduced-motion input is respected.

## What this gate proves

The signature rule is technically working:

> Light = historical image. Darkness = living layered creature.

This is still a mechanics and visual-direction gate. It is not the final award-submission frame.

## Visual review sequence

1. Run `npm run dev`.
2. Open `http://127.0.0.1:4173/` at 1920×1080.
3. Move the lantern slowly over the eyes, face, arm, robe, and feet.
4. Move it rapidly away from the character.
5. Confirm that illuminated regions flatten into the original scan and dark regions return with different lag.
6. Repeat at a mobile viewport around 390×844.

## Current hold points

Do not add more creatures, scroll navigation, audio, backend, or page sections yet.

The next visual pass must decide:

- whether the raised depth is sufficiently visible without looking like a duplicated sticker;
- whether the lantern boundary feels physical rather than like a CSS spotlight;
- whether the dark grade preserves enough of the original ink and color;
- whether the HUD should remain or disappear during the first interaction.

## Review images

- `artifacts/screenshots/gate01_review_desktop_1920x1080.png`
- `artifacts/screenshots/gate01_review_mobile_390x844.png`
- `artifacts/screenshots/gate01_review_canvas_1920x1080.png`
