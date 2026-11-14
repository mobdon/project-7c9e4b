# Adaptive corner-speed candidate

Separate candidate based on `combined-v013`. The original baseline is unchanged. No live-game result is claimed. This change is ready for code integration/testing, not a claim of improved route following.

## Finding

The existing helper already receives upcoming route-point curvature and its reduced speed is consumed by the native route braking calculations. Its old modifier was constant. The new modifier adds a bounded, continuous margin as the native curvature-limited speed drops farther below the native maximum:

```
severity = 1 - nativeCornerSpeed / nativeMaximumSpeed
plannedSpeed = nativeCornerSpeed * baseFactor * (1 - marginPercent / 100 * severity)
```

This runs only after the original function has calculated a finite positive curvature-limited output strictly below the cap. Thus `0 < severity < 1`, and the additional multiplier lies between 0.75 and 1. Margin 0 takes the exact previous multiplication path. The base factor remains 0.60–0.95. Combined output can approach 0.45× native output with the strongest settings. Gentle/straight caps, invalid inputs, unowned routes, other cars, race/outrun/drag/dyno cases and all prior guards retain native behavior.

The UI adds **Sharp-turn margin**, 0–25%, default 15%, in 5% steps. Assist remains off after reload. API default is 0 for compatibility with callers that do not explicitly opt into the new margin. Turning the margin to 0 restores the v0.13 calculation. Changing active factor/margin goes through the existing full OFF/manual/ON route rebuild. Disabled margin changes do not trigger needless rebuilds.

Example, g=1, cap=60, base factor 0.80, margin 15%:

- Curvature 0.003: native 57.1548; old cap 45.7238; adaptive cap about 45.3986.
- Curvature 0.01: native 31.3050; old cap 25.0440; adaptive cap about 23.2473.
- Curvature 0.10: native 9.8995; old cap 7.9196; adaptive cap about 6.9277.

Values use the native helper's speed units. These synthetic outputs are not measured gameplay performance.

## What this does not do

This does not extend a proven forward-lookahead distance, change steering, identify walls/traffic, repair bad paths or guarantee collision-free driving. The apparent 10/20-node constant in native 0x428030 was deliberately not changed: following its exact control flow shows it subtracted from the current node before route maintenance, which does not establish a forward sampling horizon. Calling it a safe lookahead knob would overstate the evidence.

The original native planner still decides which points to sample and how to propagate acceleration/deceleration. Lower corner caps are intended to make its existing anticipation more conservative. Strong custom pace, power and handling can undermine the result. Test first with normal 1× pace, power/grip changes off, solo free roam, and a backed-up save. Compare the same route/car with margin 0%, then 15%; use F7 if behavior deteriorates. No extension controls were installed or changed in a live browser here.

## Implementation

- `extension/ai.js`: margin publishing, changed-profile handback, actual effective-cap diagnostics, 44-byte cold ownership check.
- `tools/build-corner-hook.cjs`: authored postlude only. Original native instructions remain contiguous and unchanged; no additional patched function or pointer traversal.
- `tools/corner-hook.{json,wat}`: generated payload/source.
- `extension/page.js`: adjustable margin, retention, explanatory text, accessible percent value.
- `extension/diagnostics.js`: bounded margin field in existing sanitized logs.
- Three native/profile test suites, three controller/profile suites, and page wiring tests exercise the addition.

Corner command identity changes from CNR1 to CNR2, rejecting stale/occupied records. Memory is `0xd0d200..0xd0d22b` (44 bytes), before dyno at `0xd0d300`. +36 is requested margin percent; +40 echoes the applied margin. Existing +20/+24 native/output speed diagnostics report the actual last effective multiplier. Zero margin retains legacy factor reporting. Both factor and margin echoes must match the current command before a hit can confirm application.

The extension directory still identifies itself as v0.13.0 because this is an integration candidate, not a separately released build. Update release naming/version only during final combined packaging. Do not ship tests, extracted native Wasm, or research files.

## Validation results

- `node --test tests/*.test.cjs`: **472 tests pass, 0 fail, 0 skipped**. This includes all three exact supported native helper profiles, unchanged-body/section checks, complete patched module validation/compilation, and the added native/controller/UI tests.
- `node tools/build-corner-hook.cjs` reproduces the embedded payload, JSON and WAT byte-for-byte.
- `node --check` passes for all extension JavaScript and the modified builder.
- Full test output is retained in `validation/adaptive-corner-tests.txt` (developer evidence only; exclude from release ZIP).
- Real-browser visual testing and live-gameplay testing were **not run**. No proof of collision reduction or better steering is claimed.
