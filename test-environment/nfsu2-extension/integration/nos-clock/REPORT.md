# v0.28 combined NOS clock correction

Outcome: reviewed and packaged correction for a reproduced online Unlimited NOS clock mismatch. Live tapping resolution remains unverified.

Artifact: `NFSU2-Driving-Tools-v0.28-Combined-NOS-Clock-Fix.zip`, 219,527 bytes.
SHA-256: `af6d25797383465e381740f90fc2e3e12688a3413face20d764d1675ace0178d`.
Library ID: `libfile_fde3_f-c18a9a6512a8819180304f3de30d16a4_8b516292de4881919d77c9d94b12acf3`.

## Scope

The existing active NOS timestamp refresh now uses the exact native clock selector: nonzero online byte or positive signed client/host selects RealTimer; otherwise WorldTimer. Mode bits still participate in permission checks but do not select the native clock. Current identity, kit, literal permission and clock-domain checks remain. CAS preserves a racing native stop. Zero/sentinel timestamps are never activated, and zero/sentinel clock values do not overwrite an active timestamp.

Read-only NOS scalars are sampled before refill and sanitized into the local log. They are not native activation/stop counters and may miss short transitions. No held Alt loop, forced activation, native stop suppression, lane adjustment or driver change is included.

## Verification

- Aggregate:1,740 passed, zero failures/skips/cancellations.
- Independent:45 focused tests,40 added genuine-copy footprint/race/boundary checks,300 native selector controls.
- Exact native replay: v0.27 mismatch produces three immediate stops; corrected core preserves full fraction/active state for8 clock fixtures and3 successive online refreshes, with native restart correctly rejected while already active.
- All4 patched Wasm outputs are byte-identical to v0.27. All17 unrelated runtime scripts,24 native test assets,51 native builders/assets and all7 NOS function bodies remain preserved.
- New test snapshots use true copies instead of aliased memory views.
- Final ZIP:24 source-identical entries, CRC clean, no extras/backups/native game binaries. Review: `research/nos-clock-merge-v028/INDEPENDENT-REVIEW.md`, `final-zip-parity.json`.
- Source patch plus4 builders reproduces11 changed files and exact ZIP. See `integrated-v028.patch`, `reproduction-results.json`, `reproduce.py`.

All saved settings/profiles, Street X, Drift isolation, Drag protection, online corner/collision features and full-tuner diagnostics are retained. No unrelated candidate is merged. The subsequently supplied tuner S20 screenshot is a separate open investigation and is not fixed by this release.

No live installation, user race, successful live NOS result or game-save action occurred. For comparison, use the same ordinary online driving with Unlimited NOS and network permission enabled; export the new diagnostic log promptly if tapping remains.
