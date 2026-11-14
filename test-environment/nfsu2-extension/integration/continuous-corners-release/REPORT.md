# v0.33 Continuous sampled-corner release

Frozen source: `combined-v033-integration`, based on frozen `combined-v032-integration`.

## Deliverable

User archive: `NFSU2-Driving-Tools-v0.33-Desktop-Folder.zip`.
- 238,099 bytes.
- SHA-256: `06bf5f37ddfd446ba845813b23fa376bb6c41719c038aa85b65f80aa839b5b28`.
- Library ID: `libfile_fde3_f-8f11c3be28888191918b5120d21e4740_8b516292de4881919d77c9d94b12acf3`.
- File ID: `file_00000000f0c081f5ae49e658bdbe1b23`; version 0. Local identity applied; post-upload hash unchanged.
- Exactly one stable inner folder, `NFSU2-Driving-Tools`, containing the 26 release files. No game modules, extracted game code, research inputs, tests or tools are packaged.

First install: extract the ZIP, drag the actual folder onto Desktop and Load unpacked once. For an existing install, replace files inside the exact folder already loaded by the browser, Reload that existing extension card and refresh the game. Do not replace the extension identity or silently relocate it. Verify version 0.33.0. The ZIP itself does not run.

Internal reproduction archive: `NFSU2-Driving-Tools-v0.33-Combined-Continuous-Corners.zip`, 234,522 bytes, SHA-256 `effa0eeea59f81f978a577018eaf9542f9d5c8c8e10323ad308c46b9aba2785c`. Do not deliver this versioned-folder archive instead of the requested Desktop-folder package.

## Integrated scope

Reviewed input: `continuous-corners-v033-candidate/integration/continuous-corners/continuous-corners.patch`, SHA-256 `e984c2247775cb3a2fb276add05ea6da31405042593170d0a8a12e8070851f59`.

A new guarded command 3 is used only by the existing optional adaptive road mode. It replaces the old curvature threshold with a smooth bounded target for valid sampled nonzero native bends; the native backward planner uses matching pace compensation. Exact straights, native lower/stop results and old command 1/2 behavior are preserved. Actual/forced/known-online Street X is excluded in both native wrappers, while the controller retains Street X's existing selections.

Existing ownership, current identities, network opt-in, native handback, sequence, watchdog and race guards remain. No added steering, physical brake writes, route horizon, shifting, NOS actions, collision behavior, saves or profile schema change. New modes remain default-off/session-only and no existing values are silently changed.

Corner/braking hit counts use the existing two-second telemetry interval rather than causing quarter-second history churn. Discrete changes still log promptly. UI/log evidence is historical hook activity, not confirmation the current turn is safe.

All v0.32 features are retained: race-only AI, tuner/static-ride fix, NOS correction, Drag protection/retention, profiles, online controls, HUD, F8/Shift+Insert/F7/F9. Unrelated Drag lane and hosted-race candidates and unverified grip/downforce are not integrated. Autonomous lobby research remains separate.

## Verification

- Complete final combined suite: **1,942 passed, zero failures/skips/cancellations** (`all-tests-final.txt`).
- Desktop-folder builder suite: **31 passed** (`folder-builder-tests.txt`).
- All four pinned native modules compile; only function 4497 (braking wrapper) and function 4653 (curvature wrapper) differ from v0.32. Exact outputs match the reviewed authored candidate (`module-delta.json`).
- Reviewed authored runtime matches exactly except release version strings; 19 source/tool/test files changed from v0.32 and 199 preserved (`preservation.json`). Metadata/docs are the only additional release changes.
- Frozen v0.32 source matches its immutable original release archive; original versioned and flat archives retain their hashes.
- Complete integration patch plus seven builders reproduces all 19 changed files and the internal release ZIP exactly (`integrated-v033.patch`, `reproduce.py`, `reproduction-results.json`).
- Root's prior independent authored review passed 117 focused tests and four module checks. The final independent integration review passed 222 focused tests, independently reran the complete 1,942-test aggregate and 31 packaging tests, and found no delivery blocker. It verified all four module outputs, source preservation, syntax, checksum/CRC/manifest integrity, repeatable Desktop-folder builds and simulated repeat overlay. Evidence and final report are in `research/continuous-corners-merge-v033/`.
- The delivery archive independently reproduces byte-for-byte twice; all runtime files match frozen source, with the builder's documented installation README and two packaging files as the only packaging additions. All 218 candidate source/tool/test file hashes stayed unchanged throughout final review.

## Limits

This fixes a supported threshold gap for sampled bends, not missing native corner records, skipped route-tail entries, zero-curvature inputs, auxiliary routes or steering errors. It is not complete all-map corner detection or a proven cure for every reported missed turn. High pace remains risky. Prior logs establish active settings/hook observations but not one common cause. Live gameplay, successful turns, race outcomes, browser appearance and game save persistence were not verified. No live user game actions were taken.
