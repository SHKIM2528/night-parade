# Gate 02 V01 — UNROLL

## Decision after the V06 recording

V06 is accepted as a technique proof with remaining polish debt. The figure now separates into readable paper parts and no longer behaves as one lenticular sheet. Continuing to tune a single crop would not prove the scale of the final work.

## Goal

Turn the historical handscroll into a horizontally navigable world.

The close-up green-monkey scene must pull away and reveal that it is only one fragment of a much longer procession. The user directly drags the scroll with inertia while the lantern remains active over the paper.

## Required behavior

- a horizontal drag or wheel begins the UNROLL transition;
- the close-up hero recedes and the complete scroll appears behind it;
- the scroll follows the hand with weight, lag, and release inertia;
- drag velocity bends the paper and slightly smears wet-looking ink without destroying legibility;
- an irregular lantern reveals the historical color while darkness cools the paper;
- progress and chapter labels update continuously;
- desktop and mobile use the same direct manipulation model;
- the upper-left marker reads `GATE 02 · V01 · UNROLL-WEBGL2` on the primary path.

## Assets

- full overview: `public/art/master-scroll/tosa_mitsuoki_hyakki_yako_all_1400.jpg`;
- optional high-resolution right half: `public/art/master-scroll/tosa_mitsuoki_hyakki_yako_right_3000.jpg`.

The renderer reads image dimensions at runtime. It does not assume a fixed scroll aspect ratio.

## Scope

This gate establishes scale, navigation, paper physics, and the close-up-to-world transition. It does not yet add more fully rigged creatures, audio, backend, seals, or the dawn finale.

## Pass condition

Without an explanation, a viewer must understand that the first creature belongs to a long physical handscroll and that the scroll itself is the navigation system.
