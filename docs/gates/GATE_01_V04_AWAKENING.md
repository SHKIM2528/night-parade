# Gate 01 V04 — Awakening Event

## Diagnosis from the V03 recording

V03 is technically stable and the light/dark rule is readable, but the first impression is still "a spotlight moving over a static illustration." The current region-mask translate/rotate/scale compositing is not a convincing character rig.

## Goal

Create one unmistakable moment in which the green monkey appears to lift out of the historical paper, react to the lantern, and then become pinned flat again by light.

## Required sequence

1. In darkness, the eyes acquire the lantern first.
2. The face and head lift from the paper with visible contact depth.
3. Fur, arm, robe, and torso follow with delayed secondary motion.
4. A fast lantern pass across the face triggers a clear recoil and paper-tension ripple.
5. When the lantern returns, all raised parts collapse precisely into the untouched source image within roughly 220–300 ms.

## Rendering requirement

Replace the appearance of rigid region transforms for the hero with a genuinely deformable 2.5D mesh or equivalent weighted deformation. Existing V03 paths may remain as WebGL 1 / Canvas fallbacks.

The primary WebGL 2 path must show:

- local bending rather than whole-region sliding;
- visible but restrained virtual z-depth;
- contact shadows that grow with lift height;
- delayed fur and cloth motion;
- paper deformation around the detach boundary;
- no duplicated sticker edge or halo.

## Lantern requirement

The lantern must stop reading as a generic circular mask. Its boundary should be irregular, directionally stretched by motion, scattered by paper fibers, and visibly pin the lifted layers back to the page.

## Scope

Only the existing green-monkey full-viewport hero.

Do not add:

- a second creature;
- horizontal unroll navigation;
- audio;
- backend;
- archive or landing-page sections;
- decorative particles.

## Pass condition

A viewer who receives no explanation must be able to say: "The creature comes off the paper in darkness and the light forces it back into the original painting."

Do not proceed to UNROLL until that statement is visually obvious in a 10–15 second recording.
