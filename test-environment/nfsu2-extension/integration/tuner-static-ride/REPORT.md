# v0.29 combined tuner static-ride correction

## Result and scope

Fresh integration from frozen `combined-v028-integration`. It combines the existing online NOS clock correction with a narrow fix for legitimate native car storage rejected by tuner guard S20. It also includes the parent-requested power/pace status reporting, with stale-state cleanup. It does not add automatic handling optimization, write game saves, or alter Street X driving behavior.

The user's screenshot establishes S20, not the actual pointer or occupied slot. Native proof establishes a legitimate layout that S20 incorrectly rejected; whether this is the user's exact live instance still needs a fresh capture attempt.

## Native storage proof and guard

The pinned 93af6ccb module has a fixed racer table at `0x890160`, capacity 22, stride `0x940`. Native RaceParams construction, AddRacer and Car::SetRideInfo establish RideInfo starts at `0x890170 + n * 0x940`. The last start is `0x89c3b0`; its ride ends at `0x89cca0`.

The old heap-only lower bound could reject these legitimate objects. The new lower-address exception requires the exact native slot lattice, exact current table base, active count no greater than 22, slot below that count, current car's record pointer equal to ride minus 16, and native human record kind 1. The existing high-address path remains. Existing car/player/physics links, alias and overlap checks, count limits, selected preset, ownership, stale state, cancellation and lease checks remain enforced for Capture, Stage, Restore and Refresh.

The broad copied image remains read-only in the private evaluator. Only its preexisting precisely declared ride, curve and private scratch domains permit writes. A static ride overlapping its own read-only image capture does not grant write access to neighboring records or ordinary image memory.

Stage/Restore remain limited to the 41 active setup bytes and 41 selected visit bytes. Saved preset records are unchanged. The extension does not call native rebuild or disk-save routines. The bridge retains 170 locals and the owned 16 MiB allocation protocol. Prefix migration is accepted only for exact generated or SHA-pinned historical prefixes with integer-byte, sparse-array and exact-tail checks.

## Status-only addition

The power panel explains whether guarded power fields were applied or which guard blocks application. Bounded native pace acknowledgement is recorded separately. These observations do not measure vehicle speed or establish an online speed benefit.

Review identified stale reporting after AI stop or online opt-out before native handback, game exit, and tuner activity. The correction clears current application evidence on these paths and requires a current safe AI request, no handback or switching, and a bounded native pace observation before reporting confirmation. Existing ownership evidence remains separate; clearing a label does not claim the native driver has already handed back. Replacement module/worker/memory boots also reset diagnostic context to the new generation before any native observation, so old ownership and acknowledgement cannot leak into an immediate export. Duplicate same-session boots retain current evidence. No power writes, driver decisions, online permission rules, or native payload behavior change for this status addition.

## Verification

- Final aggregate: **1,768 tests passed, zero failures, skips or cancellations**, after the cleanup merge. See `all-tests-final.txt`.
- Actual private-native static-ride preview/search plus frame Stage/Restore passed, with saved record unchanged and visit bytes restored separately: `native-static-e2e.txt`.
- Independent S20 review: 47 pinned native boundary cases, 3,510 bridge commands, native metric equivalence on all 22 slots, 264 write-boundary checks, and 32 prefix migration cases. See `research/tuner-s20-merge-v029/REVIEW.md` relative to the project root.
- The four supported patched game modules compile. Relative to v0.28, only the 93af6ccb frame function 21213 changes. Every other function and every non-code section is byte-identical; all three other module outputs are entirely byte-identical. Evidence: `research/tuner-s20-merge-v029/module-preservation-results.json`.
- Final observational review passes 17 independent pre/post-cleanup guest-memory and controller-command equivalence scenarios, including module replacements. Both immediate same-memory and new-memory boot gates pass without stale application, generation or ownership evidence.
- The next profile changes only its full-tuner bridge. Its base AI bridge, pace, capabilities, NOS, Drift and online fields remain identical. Sixteen unrelated runtime/native profile files remain byte-identical, including core, AI, tool profiles, collision and evaluator implementations.
- The complete 22-file integrated change applied without conflicts to frozen v0.28. All four builders reproduced every changed source/generated file, and the 24-file ZIP was byte-identical. Final packaging data lives in `release-result.json`, and reproduction results in `reproduction-results.json`.

The original reviewed S20 patch is `tuner-s20-candidate/integration/tuner-static-ride/authored-source.patch`, SHA-256 `7b3d0adf2645b94fe96449eb1552c45bb5ad12c170248b205a13a49eb60b95cb`. The online reporting addition originated in `online-speed-diagnostics-candidate/integration/online-speed-diagnostics.patch`. Its three-file lifecycle cleanup is `research/online-power-status-merge-v029/online-speed-lifecycle-cleanup.patch`, SHA-256 `51decca86273bd2bf44d8965773da4479fd3c0f98edfb157bb8a6f3072f3bf5c`. The original seven reporting tests are preserved; 14 lifecycle checks were added.

## Retained behavior and limits

Street X, saved extension profiles and F9 behavior, Drift isolation, online corner/collision controls, Drag protection, and the v0.28 NOS clock correction are retained. The unrelated Drag lane margin candidate is not merged. Native grip/downforce scaling remains unverified and disabled.

No live user game, browser installation, online session, account, or save was accessed. No live capture success, gameplay improvement, native scheduling guarantee, or save/reload persistence is claimed. Native extracted game code and research artifacts are not shipped. Frozen v0.27 and v0.28 ZIP hashes remain unchanged.

For the next live check: disable older copies, enable only v0.29, reload the game, confirm the 0.29.0 badge, enter the solo Performance Tuning main screen and retry Load settings. If another guard stops the request, retain the full S-code or export the crash log. Do not infer game-save persistence from Stage success.

## Packaged artifact

`NFSU2-Driving-Tools-v0.29-Combined-Tuner-Static-Ride-Fix.zip` is 222,050 bytes. SHA-256: `ea6e85cf4c7cecd4a93a081b84278fb44d4bf07edaf909d24c6d806cf346dba2`. It contains exactly 24 extension/document files; no native game code, tests, private research, backups or extra files.

The earlier unpublished package with SHA-256 `4762f1a282f0c33ad7c3b9caa420739ae20a6b96e1a10652ef9db86b98f13822` was superseded before delivery by the replacement-session reporting fix. It is retained only under `review-superseded/`, never uploaded or presented as final.

Final independent package clearance passed: all 24 entries match final source, CRCs and canonical metadata pass, and manifest permissions/scope are unchanged. Final cleanup review passes 107 focused checks and 17 independent memory/control equivalence scenarios. The new Library item is libfile_fde3_f-44d700e070688191891791defc36fccf_8b516292de4881919d77c9d94b12acf3 (file file_00000000a2d881fdbd665c7199902d03); local identity metadata was applied, and the ZIP hash remains unchanged after upload.
