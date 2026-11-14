# v0.27 combined tuner snapshot diagnostics

Outcome: diagnostic build complete and independently reviewed. The underlying live snapshot rejection is still unresolved; this release collects the missing guard evidence without weakening the safety checks.

## Artifact

`NFSU2-Driving-Tools-v0.27-Combined-Tuner-Diagnostics.zip`, 218,005 bytes.

SHA-256: `998809910d76cfdc8835d845dfa90e70c98c6f18060f18a617d6522391b05866`.

Library ID: `libfile_fde3_f-0636482a28c48191beba76db902550a3_8b516292de4881919d77c9d94b12acf3`.

## Evidence and change

Viewed screenshot shows v0.25, solo Dyno Shop main screen, Circuit/Sprint slot1of5, Stage/Restore disabled and “Full tuner snapshot layout is unsupported; no setup changes were made”. This establishes native status8 rejection, not which guard failed. Existing logs omitted that distinction. No supported compatibility relaxation was found.

The update adds fixed guard IDs and applicable bounded counts/source-pair enums at the existing owned mailbox B+104/B+108, never through a rejected snapshot pointer. Details reset per request. UI gives a component-specific S-code and an export/reload instruction; local diagnostic export sanitizes the fields. Unknown/stale/nonmatching details remain conservative. Timeout behavior still reports possible uncertainty and latches failure until reload.

Native capture guards, ABI1,170locals,16MiB buffer ownership, selected-preset-only Stage/Restore, cancellation and original protocol remain. Strict builder migration accepts only the current or SHA-pinned reviewed legacy prefix; malformed byte values, sparse arrays, unknown prefixes and altered base tails are refused before profile replacement.

## Preservation

Base is frozen combined-v026-integration. The reviewed Drift isolation and all v0.25 saved profiles/F9/WebLocks, working Street X AI, online consent/corner/collision controls, Drag heat and NOS behavior remain. Only next-profile.bridge differs from v0.26; every other generated profile property, including exact pace bytes, nativeDriftPace,170locals and baseBridge, matches. No Drag lane candidate, Lap Knockout change or unverified grip/downforce activation is included.

## Verification

- Combined aggregate: **1,708 passed, zero failures/skips/cancellations** (`all-tests-final.txt`).
- Package suite after final docs:3passed (`package-tests-final.txt`).
- Independent final review:49new native/controller/privacy/timeout checks and84focused regressions passed. Normalized native WAT semantics match baseline after removing only diagnostic stores and an equivalent early-return rewrite.
- Independent exact ZIP check: all24 entries equal final source, CRC clean, safe/unique paths, no backup or native binary leakage. Report: `research/tuner-snapshot-merge-v027/FINAL-REVIEW.md`.
- Source patch applies to v0.26 without conflicts; four builders reproduce20changedfiles and byte-identical ZIP. See `integrated-v027.patch`, `reproduce.py`, `reproduction-results.json`.

The first aggregate's only failures were packaging guards correctly catching a patch-generated README.md.orig backup. It was moved outside the extension directory; the complete rerun passes. No runtime change was needed for that packaging issue.

## Next evidence needed

Install with older extension copies disabled, reload and verify0.27.0, repeat the failed Load settings/Find tune once on the solo Performance Tuning main screen. If rejected, send the complete S-code/message or export the crash log immediately. That result is required to distinguish an actual unsupported layout from buffer ownership or other guard failures and justify a subsequent compatibility fix.

No live game installation, successful capture on the user's car, score/handling improvement or disk-save persistence was verified. No live user game/save action occurred.
