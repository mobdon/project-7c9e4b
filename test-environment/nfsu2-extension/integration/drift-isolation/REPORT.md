# v0.26 integrated Drift isolation candidate

This integrates the reviewed drift-isolation-candidate source patch into frozen v0.25 without changing saved-profile schema, tuner capture/stage/restore, online permissions/collision controls, Drag heat/NOS, native steering or scores. Only custom pace is withheld in native Drift modes on the two modern reviewed modules; Extra grip's existing pause also covers flag114 with native Drag precedence. Saved selections resume outside Drift. A bounded read-only native pace-factor field was added to diagnostics.

## Artifact

`NFSU2-Driving-Tools-v0.26-Combined-Drift-Isolation.zip`, 215,601 bytes.

SHA-256: `fa143dd48c7bf9478aece51768cc6939c6693144ea79f48cbb17cb7adae18a3f`.

Library ID: `libfile_fde3_f-7aaff986f4b48191a2b4ac4f15ed68b9_8b516292de4881919d77c9d94b12acf3`.

## Verification

- Initial and final aggregate suites: **1,698 passed, zero failures/skips/cancellations**. `all-tests-initial.txt`, `all-tests-final.txt`.
- Final packaging/diagnostic tests rerun after docs and true copied snapshots: `package-diagnostics-final.txt`.
- Independent integration checks: **205 passed** in `research/drift-isolation-merge-v026/independent-results.json`, covering all five native mode flags, retained native/catchup calls, handback, grip transition races and foreign changes, diagnostic bounds/readonly behavior, all unrelated profile fields and complete170-local tuner bridge preservation, builder idempotence and old-baseline upgrades/refusals.
- Source patch applies to v0.25 without conflicts. Three builders reproduce all23 changed files (including both pace WASM fixtures) and the byte-identical ZIP. See `integrated-v026.patch`, `reproduce.py`, `reproduction-results.json`.

The new readonly diagnostic test and the preexisting readonly assertion in the same test file use actual copied snapshots, not aliased memory views.

## Limits

These changes address reproduced extension interactions, not a verified cause of the user's reported poor Drift run. No live race, score improvement, installation, browser appearance, repeated-NOS fix or game-save persistence is claimed. Use the same car/track/tune for comparison. Existing power/tune choices remain and may still affect handling. Unverified native grip/downforce scaling remains disabled, and no Lap Knockout experiment is included.

A later user screenshot reports v0.25 full-tuner snapshot error8 (unsupported capture layout). That separate investigation is not included here. v0.26 does not change or claim to fix tuner capture. Stage/Restore remains guarded and no save/game data was changed during this work.
