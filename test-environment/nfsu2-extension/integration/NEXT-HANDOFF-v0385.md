# v0.38.5 logger delivery — November 10, 2026

The user explicitly prioritized fixing the logger before further racing changes. v0.38.5 is therefore a diagnostics update. All ten complete patched native outputs are byte-identical to v0.38.4; no pace formula, skill modifier, branch policy or grip setting was changed by this release.

Stable Desktop and shared `extension` source are v0.38.5. Isolated canonical candidate: `../work-logger-v0385`. Immutable archive: `../artifacts/NFSU2-Driving-Tools-v0.38.5-Desktop-Folder.zip`, SHA256 `47f7f6a0b28cafc0e606f38d7f456468b1e71052390c1f240c79719f63ee3cf1`. Desktop52 files/51 checksum entries; source50. Prior Desktop and source0.38.4 are backed up outside the loaded folder. Independent package/source/native/suite audit passed.

Final canonical suite: 2,496/2,496,121 selected files, same eight historical missing-fixture exclusions. The copied runner's non-ASCII reporter marker suffered Windows default-decoding mojibake, so the successful test process exited0 but the runner initially recorded null summary counts. The ASCII-safe parser correction recovered counts from the unchanged UTF8 log; no test or source was rerun/changed for that correction. The original metadata and correction script are retained. Independent audit counted all2,496 individual positive lines and validated the unique final summary and immutable log SHA256 `0b8ae7aa91ee450080fbb57f5705d02aacf4453f672019809cda75e22f525462`. Read `verification/delivery-audit-v0385.json`.

## New evidence

- `raceTrace`: fixed column table,250 ms retention cap,480 rows maximum and384 KiB storage budget. Every row includes current selected settings, producer version and verified build when available. Null means unavailable/rejected, distinct from zero. Actual timing span/gaps/clipping and missing-by-column counts are exported.
- Independent same-tab storage key checkpoints every2 seconds, avoiding per-tick synchronous storage. Fast target/counter/plan changes no longer defeat the older event snapshot throttle. Repetitive idle/stopped-worker failures and menus do not continually evict the previous race trace. Stored rows are revalidated once per row; the earlier slow per-cell validation was removed.
- Read-only native road target, throttle/brake/steering, explicit Street X flags, separate pace request/application/counter and bounded command2 corner-record coverage. Ownership/layout/range/status checks remain required. Native target/geometry units are not newly calibrated SI units.
- Current forward plan limiting distance/angle/curvature/curve and entry target, assumptions and fixed reason code. This is planning/request evidence, never a native application receipt or a complete race route.
- Fixed producer-stage/failure and optional source statuses identify unavailable data. Diagnostic status text shows current trace sample count.

`tools/inspect-race-trace.cjs <local-export.json>` decodes/summarizes a new export. It distinguishes requests, mailbox acknowledgement, actual control readings and unavailable fields. It also handles old logs explicitly as lacking the trace. Local input/output budgets are8 MiB/128 KiB. Its generated production-logger fixture and unchanged log32 validation live in `../work-trace-review`.

Live reload/trace export is still pending. User has been asked to finish the race, restart Chrome, verify0.38.5 and export a short race. Browser policy denies the internal Extensions page; do not bypass it via native control/CDP/profile editing. Do not claim that the new trace has been captured in a live game before inspecting that export.

## Actual latest report and driving problems

`Downloads/nfsu2-driving-tools-diagnostics (32).json` is v0.38.4/aa2429fb, solo Street X4603 only. It retains6.873 seconds and reports727 dropped events. Requested/applied/native pace is1.95, power1.3,grip2,corner factor.95,margin25,braking1. Adaptive ceiling1.75 is selected but inactive in Street X. Owned routes have23–40 nodes but zero native corner records/hits; forward sampling is intentionally excluded. Braking hits increase25→59 and one sample has actual brake.278, so do not claim no braking. Speed36.75→1.774 in251ms, later negative forward speed, is consistent with the user's impacts but does not identify an impact object. No retained sprint/circuit evidence, current target, full lap or race result is present. Read `../work-log32/FINDINGS.md`.

Street X still needs mode-specific pacing; the new node policy deliberately excludes it, so boosted saved race pace can remain active without usable old corner records. The user reports sprint/circuit improved but some missed braking/over-fast turns remain. No new Street X behavior patch was delivered. Finish live logger validation before further racing modifications.

## Isolated skill and shortcut work, not included

Raw254 is signed−2 and an intentional player/default marker, not universally poor skill. Constructor/copy/decoder/archive origins are independently executed in `../work-driving-skill-evidence/origins`. Real target policy can select .74 speed multiplier for−2 versus1.0 for9; another predicate explicitly changes on−2.96 matched controller cases emitted identical controls across skill levels, and the actual corner-cap closure has no skill reads. Do not replace the marker globally or promise better steering from skill9.

`../work-race-shortcuts/shortcut-policy.js` is a private, frozen exact-AA branch-only candidate:296 native cases; modifies only f5206 consumed−2 return for the owned player under explicit adaptive command3, preserving actual record/getter/graph/eligibility/probabilities and all other modes. Real route consumer takes an offered optional branch under9 that it rejects under254. Cached choices can survive Stop; auxiliary queries for the same owned Race brain also reach the policy. No live shortcut/checkpoint/result proof. `../work-route-skill-v0385` is an unfinished separate integration, NOT this delivered0.38.5 and must not be packaged as the logger release.

The latest user asks to reuse native rubberband/catch-up performance modifiers without requiring a lead/gap. Read-only investigation is active in `../work-rubberband-native`; no live writes or new modifier has been applied. Preliminary exact-native evidence distinguishes driver target multiplier and car+468 performance multiplier, with gap/progress/skill/eligibility gates. Wait for executed consumer evidence before claiming grip, acceleration or automatic wins.

The existing autonomous travel/join/race/return loop and current tuner remain unfinished/disabled. Preserve original music pair and saved profiles. Never run obsolete prepare-release.cjs, overwrite immutable artifacts, or overwrite concurrent Claude changes without inspection/backup.
