# Independent integration review: v0.21 candidate

## Decision

**Source review passes. Keep delivery on HOLD.** No source-level defect found in the online corner/braking integration. The outstanding online collision/Drag investigation and grip/downforce blocker remain separate and unresolved by this patch. This review does not authorize delivery, installation or gameplay claims.

## Verified scope and safety

- Compared against frozen `full-tuner-v018` (v0.20) and the authored `research/online-race-settings-v020/online-race-source.patch` plus `FINDINGS.md`.
- Authored `ai.js` changes (excluding generated payload lines) and both hook builders exactly equal the proposed patch. Only network permission routing changes at the controller/native hooks. Native calculations, route/driver/event selection and solo/Street X values remain unchanged.
- Network permission requires literal `true` in the controller and value `1` natively. Existing local owner/car/player/race/private-route, exact caller, active race, single-local-player, pause, heartbeat and even/unchanged command-sequence checks remain. Non-road events and forced Drag/Drift remain excluded. Opt-out, reload and F9 guards are covered.
- Manual page merge preserves `pendingCornerText`, `cornerEvidenceText`, full tuner UI and status diagnostics. Page regression proves identical selected solo/opted-in online values, unchanged Street X flag and collision exclusions.
- Sixteen extension files are byte-identical to v0.20, including every profile/signature, core, collision modules and all tuner files. `next-profile.js`, main bridge and `fullTuner.baseBridge` are unchanged. Script order/permissions remain unchanged; native grip/downforce is not activated. No Lap Knockout experiment or collision/Drag/NOS expansion was merged.
- All four exact supported game modules validate after patching. Relative to v0.20, **only native functions 4497 and 4653 change**; all other functions and all non-code sections are byte-identical.

## Independent checks

- Final aggregate: **1,607 passed; 0 failed, skipped or cancelled**. Command: `WABT_MODULE=<existing local wabt> node --test tests/*.test.cjs`. See `independent-final-all-tests.txt`.
- Additional current and next road corner/controller runs: **12 passed each**. Legacy native road corner run: **5 passed**. Native braking/getter/propagation parity covers all four profiles in the aggregate suite.
- Rebuilt corner/braking hooks in an isolated temporary copy: `ai.js` and all four generated hook JSON/WAT files match candidate bytes exactly. Production files were not changed by this reviewer.
- Canonical ZIP builder review passes: ordered entries, fixed timestamp/Unix 0644, fixed deflate level, source-byte verification and exclusive-create protection. The aggregate includes byte-identical repeated ZIP and metadata tests.
- One exploratory legacy controller invocation could not run because that harness expects a nonexistent `ai-legacy-bridge.wasm`; its native tests passed. Corrected dedicated legacy native invocation passed 5/5. This is an invalid extra test invocation, not a candidate failure.

## Remaining limits and artifact

- No live user game, installation, network session, server acceptance, peer synchronization, race finish, wall-hit reduction, real-car improvement or browser visual pass was attempted or claimed.
- Frozen v0.20 archive remains SHA-256 `14b4a4e56b97e4b6234f67319a977b9451920507b55f3ee74e179758688d2f84`.
- Final held archive: `NFSU2-Driving-Tools-v0.21-Combined-Tuner-Online-Race-Candidate.zip`, **199,817 bytes**, SHA-256 `18bc12d5ed206bfa162dc078c18101eea78c15db4b97e9c6781ef9eb9a824d65`. All **23 files** exactly match frozen final extension source; ZIP CRC and canonical metadata pass. An independent temporary rebuild is byte-identical. No source changes occurred after the review hash snapshot. See `independent-final-archive.json` and `independent-final-source-hashes.json`.
- Evidence: `independent-extension-scope.json`, `independent-patch-provenance.json`, `independent-native-preservation.json`, `independent-reproducible-hooks.json`, `independent-reviewed-files.json` and test logs in this directory. Older copied v0.20 reports are historical, not v0.21 evidence.
