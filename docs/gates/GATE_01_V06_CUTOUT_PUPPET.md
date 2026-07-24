# Gate 01 V06 — Cutout Puppet

## Diagnosis from the V05 recording

V05 fixed the duplicate-eye defect and confirmed the WebGL2 mesh path, but it still read as one image changing viewing angle. Idle movement, blink, jaw, breathing, and limb delay were not legible without close inspection.

## Architecture change

V06 no longer treats the creature as one blended deformation surface.

The historical figure is reconstructed as nine independently rendered paper pieces using the existing high-resolution anatomical masks:

1. bag;
2. left leg;
3. right leg;
4. torso;
5. robe;
6. arm;
7. head;
8. fur;
9. face.

Each piece has its own hinge, delay, depth, contact shadow, edge thickness, and motion response. Light removes every raised piece and restores the untouched source scan.

## Required visible behavior

- face and painted eyes acquire the lantern first;
- head turns independently from the torso;
- fur trails the head;
- arm swings from a separate shoulder hinge;
- robe bends with a slower cloth rhythm;
- torso breathes while legs and bag carry lower-amplitude weight;
- a fast lantern pass produces a clear recoil;
- the returning lantern pins all pieces precisely back into the historical image.

## Review marker

The upper-left marker must read:

```text
GATE 01 · V06 · WEBGL2-CUTOUT
```

## Scope

This remains the final single-character technique gate. After the cutout motion is readable, the next stage is `UNROLL`: the complete historical scroll becomes a horizontally navigable world containing multiple animated creatures.
