# Gate 01 Review — Lantern Hero V03

## Recording diagnosis

The V02 recording proved that the clean-plate transition works, but it also exposed four problems:

1. the layer transforms were only a few pixels and therefore unreadable;
2. the lantern looked like a soft circular mask rather than a physical light;
3. the creature became darker, but did not unmistakably become alive;
4. all body regions reacted at nearly the same time, hiding the rig.

## V03 changes

- Nine persistent wake values now run on different rise/freeze rates.
- Face freezes first in light; fur, robe, torso, and legs settle later.
- The creature recoils when a fast lantern crosses the face.
- Layer motion is 2–4× more visible, with region-specific secondary warping.
- Contact shadows are broader and tied to each layer's depth.
- The lantern is smaller, asymmetrical while moving, and has a paper-scattered edge.
- Darkness preserves more original ink and watercolor.
- Pupils track the lantern only while the creature is awake.
- A warm/cool paper lip marks the exact frontier between flat image and lifted creature.
- Rendering now falls back from WebGL 2 to WebGL 1 and then Canvas 2D, so the gate remains reviewable when browser GPU acceleration is unavailable.

## Hold point

Do not add a second creature, scrolling, audio, or backend. V03 must first prove that a viewer can identify the image/creature transition without an explanation.
