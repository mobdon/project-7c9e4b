# v0.38.4 delivery and remaining race work — November 10, 2026

The stable `C:/Users/Admin/Desktop/NFSU2-Driving-Tools` folder and workspace `extension` now contain v0.38.4. Candidate source remains in `../work-collision-v0383` (historical directory name). The immutable package is `../artifacts/NFSU2-Driving-Tools-v0.38.4-Desktop-Folder.zip`, SHA256 `bce51d42e99ab56c1965adacbd243ab79be0a0af5d279130c9e40099d0114493`.

The canonical suite passed 2,459/2,459 tests across 116 selected files, retaining the same eight explicitly documented missing-fixture exclusions. Source stayed unchanged. The strict verifier compiled ten exact patched modules, preserving the previous nine complete native outputs. Independent source/suite/native/package/Desktop/backup audit passed. See `verification/release-summary-v0384.json` and `delivery-audit-v0384.json`.

Changes: exact aa2429fb support; native route direction read corrected from DWORD to BYTE; fixed numeric preflight guard telemetry; radar draws fresh 100 ms observations independently of the 250 ms statistics throttle. Native direction fixtures with nonzero adjacent bytes reproduce the old rejection and reach capture/publication with the fix. This is not proof of the cause of diagnostic report31, because that report did not capture the rejection reason. Street X remains excluded from the new forward road policy. Existing Drag, native getter/sentinel behavior, profiles and handback are retained.

Desktop previously contained Claude's v0.38.3, identical to the reviewed ZIP plus an old backup ZIP. Both are preserved in artifacts. Claude wall-governor code was not merged: composed actual-native execution proves its separate live/planning pace can invalidate existing command1/2 corner guards. Read `../research/claude-v0383/REVIEW.md` and `publish-native-proof.json`.

Live browser last observed still running v0.38.2 and rejecting aa2429fb. User reports an older version persists after the restart request. This remains unresolved. Browser policy denies the internal Extensions page; do not bypass through native/CDP/profile editing. Existing supplied folder screenshot shows Desktop folder properties, not the extension card's actual Loaded from path. Do not claim live reload or race verification.

## Active native route and skill investigation

`../work-race-shortcuts` and `../work-shortcut-geometry` execute exact AA native route policy and its consumer. The route consumer follows f12403 → f8646 → driver/action policy f5206 and actual endpoint helpers. AL1 takes an offered graph branch; AL0 continues sequentially. At fixed draw0.5, player skill byte254 skips a valid synthetic type0 branch; player9 and opponent9 take it. Raw254 is signed−2 and the branch policy clamps it to threshold row0. This proves a route decision difference, not that254 is globally a poor skill level. User now asks whether that special marker changes broader driving tables/steering/braking; separate `../work-driving-skill-evidence` investigation is active.

A private exact-AA branch-only candidate is under construction. It must change only the consumed skill return after native eligibility gates, preserve raw record/role/graph/generic getter, require current owned ordinary-road driver and existing network permission, and retain Stop/handback. This candidate is not in v0.38.4. Row9 retains native probabilities rather than forcing every alternate link. Real race shortcut identification, checkpoint legality and live efficacy remain unverified.

## Other pending work

The complete hosted selection → autonomous travel → join → race → return loop remains unfinished/disabled. No disappeared host may create a replacement lobby. Current tuner remains disabled: second-window guards alone do not prove the optimized evaluator wrapper or allocation protocol. No new live grip/downforce, online no-clip or aircraft support is claimed.

Original music pair is in `C:/Users/Admin/Music/nfsu2`; actual game importer accepted it (Added). Audible playback unverified. Seven extra requested songs were not downloaded; no purchases authorized. Rejected substitute pack remains removed.

Do not rerun obsolete `tools/prepare-release.cjs`, overwrite immutable artifacts, or overwrite concurrent Claude edits without inspecting current hashes and preserving originals.
