# Isolated road-race hairpin candidate

This directory is a separate copy of combined-v017. No shipped files, installed settings or live game were changed. Version metadata is intentionally unchanged for the parent release integrator. This is experimental native-planner tuning, not a measured racing improvement.

## Behavior

- Independent Road-race hairpin assist, OFF by default and after reload/Stop.
- Solo ordinary race category1 with HUD/mode1 only. Drag, drift, their forced flags, outrun, dyno and network play are excluded. General Online/LAN permission does not enable this first race option.
- Retains the native driver, racing line, checkpoints, recovery, opponents and original function instructions. It does not add steering, collision avoidance, route nodes or a longer verified horizon.
- Race corner factor0.6–0.95 (default0.8), sharp-turn margin0–25% (default15), planning braking factor0.5–1 (default0.75). Lower braking factor means a more conservative native braking assumption, not weaker physical brakes.
- Existing free-roam corner behavior/calculation remains separate and unchanged. Its old high-pace interaction is not silently changed by the race option.
- Straight race pace selection remains independent. No nitro or grip change is included.

## Native implementation

The existing4653 curvature helper pre/post hook recognizes separate command2. Its verified call from0x422780 has return0x4228bb, EBX=owned car and ESI=owned current private main route (driver+0x370 == *(driver+0x6e8)). Existing command1 retains the free-roam calculation.

For command2 with selected pace P=max(1,percent/100), the upcoming curvature threshold uses paced cap P*C. The helper recomputes the unbounded curvature limit from validated g and curvature when P>1, applies the bounded corner factor/adaptive margin, then divides its apex result by P. Non-limiting straight cases retain their native cap. This counteracts the existing later custom-pace multiplication without lowering a clear straight's cap.

New pre/post hook4497 scales the native planning deceleration by braking/P². It allows only:

1. Main corner-planner getter return0x4227a1, ESI=private route and EBX=owned car.
2. Backward propagation getter return0x40a723, EBP=private route, BL=0, outer return at getterSP+40=0x422b2e, direction atSP+48=0 and matching car argument atSP+52.

All shared grade-table contents and other getter calls are untouched. Native forward acceleration uses its original evaluator. Both hooks check fresh command identity, stable even sequence, ownership, player, car, driver, mode, race, solo context and bounded settings; original instructions remain contiguous. No original game code is embedded in the extension.

For a synthetic route, the compensated final target is equivalent to:

`min(P*C, sqrt(V² + 2*a*braking*distance))`

Native difficulty/catchup factors and physical handling still exist. This is not a claim that3x target yields3x actual speed or that a short route horizon supports safe high-speed driving.

## Command record and lifecycle

CNR3 marker0x33524e43,64-byte record at0xd0d200. Previous fields retain meaning; added:

- +44: requested braking percent50–100.
- +48: requested selected pace percent75–300, must equal AI command+60.
- +52: corner helper pace echo.
- +56: corner helper braking echo.
- +60: actual eligible braking-getter count, separate from corner hits.

Older markers or occupied expanded bytes are never overwritten. Controller bounds and cold native mailbox guards cover the full64 bytes. Both corner settings and effective selected race pace changes perform the existing successful OFF/manual/ON handback, rebuilding cached private route caps. Stops, profile changes and ownership changes clear diagnostic echoes/counts. Merely changing the selected straight pace with race assistance disabled does not rebuild.

Reachability diagnostics from corner-reachability-v017 are included. Negative stage values occupy the old curvature diagnostic word only until the first actual corner hit. Braking hits alone never confirm a corner adjustment. Page status and logs include cornerMode, selected cornerPace, cornerBraking and brakingHits; counters do not claim better live handling.

## Rebuild

From this candidate directory, set WABT_MODULE to the existing research/compatibility-v011/node_modules/wabt if needed, then run:

- node tools/build-corner-hook.cjs
- node tools/build-braking-hook.cjs
- node tools/build-current-profile.cjs
- node tools/build-latest-profile.cjs
- node tools/build-next-profile.cjs

The current-profile builder expands the cold mailbox guard and regenerates the base used by the later profiles. Preserve unrelated drag/diagnostics/grip candidates when integrating; merge authored source changes rather than overwriting their generated profile files.

## Validation and limits

See the final parent handoff for exact test totals. New tests exercise actual hash-pinned native helpers/propagation, race guards, cached-route handback, request/echo distinction, unchanged disabled/forward paths, complete-memory write boundaries, exact module compilation and original-instruction containment. Page tests cover default/reset state and independent controls.

No browser driving, live collision count, race time, placement, grip benefit or nitro behavior was measured. Native route records/horizon may still miss a particular hairpin. Exact180-degree degenerate three-point geometry can return zero curvature; this candidate does not invent a geometry fallback without route evidence. Keep the prior release as the rollback baseline. Do not package research, extracted native assets, tests or tools in an extension ZIP.

## Final frozen validation

- Complete candidate suite: **1530 tests passed**, zero failures, skips or cancellations. Log: `final-test-results.txt`.
- New combined native planner/braking suite:36 groups spanning all four supported exact modules (legacy,2f0ddd3b,78e2bb69,93af6ccb). Executes actual planner17087, curvature helper4653, deceleration getter4497 and propagation6454. Synthetic route-query/geometry, grade, acceleration, lateral lookup and two planner rounding boundaries remain controlled dependencies.
- Supplemental current/next race corner/controller matrices:10 passing groups each; legacy race corner matrix:4 passing groups. Complete suite includes the latest profile's race/controller matrix.
- All11 generated hook/profile/test artifacts reproduce byte-for-byte from authored builders. Evidence: `reproducible-build.json`.
- All19 released v0.17 extension files still match the original ZIP. Evidence: `baseline-preservation.json`.
- Extension JavaScript syntax checks pass.

Source merge artifact: `race-hairpin-source.patch`, with file list `changed-source-files.json`. It excludes generated profile files and WASM test fixtures; regenerate them in the documented order after carefully merging any concurrent feature work. This patch includes authored hook bytes in ai.js, not original game code. Candidate version metadata stays at0.17.0 for the parent release integrator to update once other work is merged.
