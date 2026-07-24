# Gate 02 V02 — Seamless Unroll

## Diagnosis from the V01 recording

V01 failed for two concrete reasons:

1. the close-up simply scaled and faded while an unrelated full-scroll view appeared underneath;
2. the CSS fallback layer remained visible even on the WebGL path, covering the moving canvas and making navigation look frozen.

## V02 goal

- Replace the crossfade with a directional paper seam that physically sweeps across the hero while the full scroll is revealed underneath.
- Make drag, wheel, touch, and keyboard navigation visibly move through the scroll.
- Clamp movement to the actual visible span and report progress from the real scroll limits.
- Keep the full-scroll WebGL canvas above the fallback; the fallback exists only when WebGL is unavailable.

## Review marker

```text
GATE 02 · V02 · UNROLL-WEBGL2
```

## Scope

This gate fixes transition and navigation only. V06 remains a technique proof, not final character animation. Final hero-quality rigging requires properly separated painted layers and reconstructed hidden anatomy rather than further distortion of one flattened scan.
