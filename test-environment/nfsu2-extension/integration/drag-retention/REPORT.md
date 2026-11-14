# v0.31 combined Drag lifecycle release

## Result and scope

Fresh copy of delivered `info-hud-v030-candidate`, with the reviewed Drag lifecycle correction and the user's later requested Shift+Insert menu toggle. No installed extension, live race, account or game save was changed.

The Drag source patch SHA-256 is `15b4928b815f6eb80c0c369818ff19ad8386c1fec48f1b0dfc9d87a46dad3a7f`. Before applying it, all 11 baseline paths matched its provenance. After applying and rebuilding, all 11 resulting authored/generated paths matched the reviewed candidate exactly. No unrelated lane candidate is included.

## Drag correction

The native manual-Drag selector previously fell through during an odd or changed page command sequence, including the brief partial publication that production updates create. The corrected selector retains only an already-granted, fresh native lease whose live ownership, status, input/request, current objects, driver/record, physics, race and permission checks still agree. It does not acquire control, alter the acquisition seqlock, erase a real manual request, write inputs, steer, shift, change NOS, or suppress damage. Once an OFF or permission-rejection field is present, the original native fallback runs. A stalled publication remains bounded by the 180-native-frame watchdog.

A separately reproduced next-match boundary could overwrite a same-target OFF before native processing. The page controller now holds the OFF request until native ownership/latch, safe manual state and heartbeat acknowledge it. Continuously requested genuine native request 3 remains manual/retry; the patch does not clear that failure latch. Explicit stop/manual takeover, native finish/totaled states and permission withdrawal remain effective.

The fresh log is exporter v0.28, not v0.30. Its request-3-before-mode-3 ordering matches the reproduced publication race, but it does not capture the rejecting guard. Historical causation and live efficacy are not established.

## Requested shortcut

Shift+Insert toggles the same panel action as F8. It ignores untrusted events, extra modifiers, composition, previously prevented events and held-key repeats. Normal Paste remains available in text/editable controls. Because this panel uses a closed shadow root, the check explicitly includes its retained active element and bounded editable ancestors, not just the externally retargeted event path. Non-editing range/checkbox controls still allow the shortcut.

The shortcut changes no car memory, driving selections or native control commands. Closing the panel preserves existing F8 semantics, including cancellation of a running tuner operation. F6/F7/F8/F9 and Escape retain their meanings.

## Verification

- Final aggregate: **1,873 passed, zero failures/skips/cancellations**. See `all-tests-final.txt`.
- Five shortcut tests and 20 existing HUD tests pass, using real copied guest-memory snapshots for the new shortcut checks. A closed-shadow retargeting defect found during review was corrected before packaging.
- Exact native probe passes 180 retained player updates plus 180 production bridge/native cycles, 32 original negative cases and 34 odd-publication negative controls, byte-exact original fallback, genuine request 3, ON/OFF publication interleaving, same-target OFF recovery and watchdog release.
- Independent focused Drag suite passes 181 checks; final menu/HUD/package/lifecycle subset passes 42 checks.
- All four patched game modules compile. Only function 19197 changes in the two modern modules; every other function and non-code section is unchanged. Current and legacy patched module outputs are entirely byte-identical to v0.30. See `research/drag-retention-merge-v031/module-preservation-results.json`.
- Modern profile objects differ only in `dragInputGuard`. Tuner/base AI bridges, native acquisition, pace, contacts, NOS, Drift and capabilities remain unchanged.
- The final complete 21-file patch applied cleanly to frozen v0.30; five builders reproduced every changed file and the exact release ZIP byte-for-byte. See `release-result.json`, `changed-files.json`, `integrated-v031.patch` and `reproduction-results.json`.

Native independent evidence and limits are described in `research/drag-lifecycle-v030-native/CANDIDATE-REVIEW.md`. Final integration/archive review is under `research/drag-retention-merge-v031`.

## Retained behavior and limits

The v0.30 Info HUD, saved profiles/F9, tuner static-ride fix, NOS clock correction, working Street X behavior, Drift isolation, online corner/collision tools and Drag engine protection are retained. Unverified native grip/downforce scaling remains disabled.

Exact-native probes use pinned code with explicit controlled leaves for allocation/physics/callback boundaries. They do not simulate gameplay dynamics or a network server. This release does not promise wins, route avoidance, no collisions, no damage, prevention of all manual transitions, successful live tuning or save/reload persistence. Browser visual behavior remains unverified; no previously denied browser launch was retried.

For use: enable only v0.31, reload, confirm the 0.31.0 badge, retain the chosen settings and start the event yourself. Shift+Insert or F8 hides/shows the menu. If unwanted handback persists, export a short new crash log immediately afterward.

## Final artifact

NFSU2-Driving-Tools-v0.31-Combined-Drag-Retention.zip: 227,784 bytes, SHA-256 `349894953587377ff7b45b702f8d77feb7ef219ce1e70a666216720244809ad6`. It contains exactly 24 extension/document files, no research, tests, game extracts or backups.

Library ID: libfile_fde3_f-17c34c27f0088191be1b7ccbdabf1024_8b516292de4881919d77c9d94b12acf3. File ID: file_00000000d37081fd91f0658e9e42ea6e. Local identity metadata was applied and the ZIP hash is unchanged after upload.

Final independent archive approval is complete: every source payload, CRC, canonical metadata field and permission check passes. Independent repackaging is byte-identical. No open blocking finding remains. See `research/drag-retention-merge-v031/INDEPENDENT-REVIEW.md` and `independent-archive-audit.json`. The v0.30 source still matches all entries of its original ZIP.
