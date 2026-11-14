# v0.32 race-only AI and optional adaptive road pace

## Delivered scope

Fresh integration from frozen v0.31. New features are current-page, default-off choices. Existing named-profile storage, native AI policy, exact-build/ownership gates and online permission rules are preserved. This release does not find, join, start, replay or vote for races.

Race-only automatic driver waits for a supported active ordinary race (HUD 1, native type 1, phase 4), including Street X, Drag and Drift. It releases in free roam, Outrun, results or unsafe contexts. Selecting it disables all-modes AI; selecting all-modes AI disables race-only arming. It stays armed between races on the current page but resets on reload, profile Load, F7/F9/Stop or race driving-key takeover. Manual free-roam steering preserves arming; physically held driving keys at race entry delay acquisition until released. Existing native manual requests, end/totaled states, failure latch, OFF acknowledgement and watchdog are not bypassed.

Optional Adaptive road-race speed uses the existing native pace, route-corner and braking controls at a constant selected ceiling (default 1.30, range 1.00–2.00). The native route planner varies target speed by distance. It does not implement JavaScript per-corner control or a new steering/braking/NOS algorithm. Street X actual, forced and known online modes preserve exact old effective controls; Drag, Drift, Outrun and free roam are excluded. The selector uses the effective race-only/all-modes AI request, never enables either mode or network permission itself. F7 leaves adaptive selected but dormant; F9/profile Load/reload clear it.

Both new choices deliberately stay outside saved-profile schema and legacy session storage. Existing saved profiles can still restore their own all-modes AI choice; these new session switches are not saved by Save/Update.

## Implementation and merge

Standalone race-only work is frozen at `race-only-ai-v032-candidate`, with `integration/race-only-ai/source-only.patch` and provenance. It changes page scheduling, bounded diagnostic booleans and tests only. The standalone suite passes 1,890 tests; independent review passes 24 new matrices and 113 retained regressions.

Adaptive source patch: `adaptive-pace-v032-candidate/integration/adaptive-pace/adaptive-pace.patch`, SHA-256 `6ec580e2162cad0b67ca5bf368e542668dc3d24ce1900d73e0cf93b4a2a0e28a`. The combined merge explicitly reconciles the shared UI/telemetry/stop/profile paths. Race-only eligibility is computed before adaptive selection, which receives effective `aiRequested`. Both choices clear their current status evidence on suspension and replacement boot. No stale active row survives engine exit or tuner activity.

Independent review found and verified a stale race-only status row during early-return paths; it was fixed before final packaging. The row now clears to armed/waiting without discarding the user choice. Tooltip text exposes long status explanations.

## Verification

- Final combined aggregate: **1,907 passed**, zero failures/skips/cancellations (`all-tests-final.txt`).
- 34 focused race-only/adaptive/joint groups pass, including 100 type/HUD/phase combinations, all network signals, ownership handback, current keys, profile/reload behavior and exact Street X command equality. New memory equality tests use actual copied bytes, not shared views.
- Independent combined matrix: 31 checks passed, including production Controller/native bridge lifecycle and five cached-route transitions with 100 stable ticks without repeated reconstruction. Exact-native fixtures are bounded by existing controlled low-level leaves; they are not gameplay simulations.
- Every supported patched module (legacy/current/latest/next) compiles and is byte-identical to v0.31. Every function and non-code section is unchanged. Evidence: `research/race-only-ai-v032/module-preservation-all-four.json`.
- AI Controller, native profiles/builders, tuner/private evaluator, NOS clock logic, tool-profile schema and existing Engine/StableGate implementations are unchanged. `core.js` only adds the reviewed pure adaptive selector.
- Complete source change plus five builders reproduces the internal 24-file versioned release ZIP byte-for-byte. The user-facing same-folder package uses the existing reviewed flat builder; runtime bytes and permissions are unchanged by packaging.

Final tests and reproduction files are in this directory. Independent review evidence is under `research/race-only-ai-v032`; adaptive native evidence is under `research/dynamic-pace-v031-native`.

## Update and limits

Deliver only `NFSU2-Driving-Tools-v0.32-Same-Folder-Update.zip`. Copy its files into the existing loaded extension folder, replace matching files, click Reload on the same browser extension card, then refresh the game and verify 0.32.0. Do not remove/re-add or create another version folder. The internal versioned archive exists only for source/package reproducibility checks.

No live game, browser installation, account or save was changed. Live race efficacy, lap times, wins, corner safety, native scheduling and browser appearance remain unverified. Hook counters and selected ceilings do not prove actual speed/braking performance. No unsupported grip/downforce, unrelated Drag lane, hosted-lobby automation or game-save action is included.

## Final artifact approval

The user-facing flat package is 235,207 bytes, SHA-256 `40bf3c98d6083d34e8ad99afbb6b95479898707f6b3dac5329eb9b863d6a3651`. Independent review passes all 26 flat safe names, all 23 unchanged source runtime/changelog payloads, README-only installation/rollback transformation, guide and 25 payload checksums, CRCs, canonical metadata, source immutability and byte-identical rebuilding. Internal 24-file package also passes. Packaging builder regression: 26/26. No open blockers.

Library ID: libfile_fde3_f-b0368d8aae8481918de48aba990e3a36_8b516292de4881919d77c9d94b12acf3. File ID: file_000000002cb081fd8d0a8ea273f25aec. Local identity metadata was applied; the content hash is unchanged after upload.
