# v0.20 Full Preset Tuner release audit

## Implemented

One combined extension retains v0.18 driving features and adds the complete native 41-field editor for all five game-selected presets on exact 93af6ccb. All native categories are represented: suspension, gears, NOS, brakes, tires, downforce, ECU and turbo. Native installed-parts eligibility controls availability. Other supported profiles retain their prior peak-only dyno tool.

Preview runs native setters and measurements in separate private memory. Automatic search supports native peak power/torque via ECU/turbo, and native 0–60/0–100/top-speed estimates via gearing plus ECU/turbo. A loaded manual draft is first accepted by native setters and then held fixed outside the automatic fields. The original live baseline remains the before/restore reference. Search is bounded to48 evaluations; no global optimum, handling, lap-time or winning claim.

Explicit Stage writes only current41 and selected visit41. Restore returns the separate original copies, including when they differed. Both execute in a game-thread prefix with exact identity, current, visit,148-byte parts and205-byte record stale checks. There are no native calls in this write prefix. It does not write other visit slots, stored-record presets, disk files or live rebuilt physics.

The UI explains Test Run refresh and native Save Profile persistence. Native save can commit all five visit presets, so another dirty visit triggers a warning. The extension never says a disk save succeeded. A known exact selected native record commit is accepted for subsequent restore; unrelated changes are refused. F9 cancels but does not undo an already staged tune.

## Evidence

- Final aggregate Node test result: **1,599 passed, zero failed, skipped or cancelled**.
- Exact module patch tests compile all four supported modules and compare all non-target bodies/non-code sections. On93af6ccb the main bridge gains only the authored command-gated full-tuner prefix before its byte-identical old instruction tail; other old native payloads are unchanged.
- Independent extraction coverage:195 native functions,11,678 memory operations and77 loops instrumented. Function entries/loops consume fuel; load/store helpers enforce captured read/write boundaries. Unexpected dynamic targets, address overflow, uncaptured reads and forbidden writes fail closed. The exact downloaded module is SHA-256 pinned; original game instructions are extracted only at runtime, not bundled.
- Independent private execution checks: all40 unlocked fixture offsets individually and simultaneously. Combined draft used85 native calls/222,805 fuel within500,000 total; locked sixth gear preserved. Native normalization adjusted28 requested offsets, demonstrating why accepted-value preview matters. Baseline state/measurements restored exactly. This fixture is not a user-car recommendation.
- Actual native plus authored-frame end-to-end test: preview left game ride, visits and record unchanged; Stage changed only the two41-byte setup copies; Restore recovered original current and separately different visit. A48-trial native acceleration search preserved manual suspension/NOS/aero seed, staged/restored correctly and left stored record unchanged. Metrics are synthetic catalog-backed fixture witnesses, not a live performance claim.
- Controller regressions cover all five presets, parts byte147, selected visit/full record stale state, car/mode changes, cancellation, memory ownership, module reuse refusal, pending-request exclusion, known native commit and unrelated record refusal. Seeded search tests cover all five goals, native coupling, fixed manual scope, original-versus-seed comparisons and unchanged measured goals with intentional manual changes.
- Page tests cover all41 labels, five preset names, locks, supported/legacy controller selection, preview/search changes, explicit Stage/Restore, cancellation/blur/F9, and retained draft staging without a false improvement claim.
- Authored frame builder and composition script regenerate byte-identical payload/profile files. Independent page merge reviewed corner-status text only. Native grip/downforce transport guard was excluded because its absent host/backend capability is unrelated to this frame tuner.

## v0.18 / Street X preservation

`verify-preservation.cjs` compares the old and new profiles and source. AI Controller is byte-identical. Core driving logic, collision scripts, older profiles, signatures and legacy dyno are byte-identical. Current profile differs only by the full-tuner prefix/locals/capability metadata; all driver, event, route, pace, corner and physics settings are unchanged. The UI corner change only describes existing read-only observations. No custom-race routing change is included.

No profile enables `nativeTuning`; no `native-tuning.js` is loaded. Existing legacy extra grip remains1–2×. Native preset tire/downforce sliders are not the unverified live grip/downforce multipliers.

## Remaining boundaries

- No automatic race objective has been established for suspension, brakes, tires, downforce or NOS. They are manual supported settings, not optimized per-race presets.
- No live user game, browser installation, user save, hosted server or released archive was modified. This is fixture-based native execution, not live integration certification.
- Chromium visual/CSP test failed before opening a page due to sandbox socket startup restrictions. No visual/browser pass is claimed.
- Live snapshot completeness across every real car/parts combination, native Test Run refresh in a real frontend, disk save/reload, lap times, race outcomes and responsiveness under actual browser memory pressure remain unverified.
- The private evaluator relies on serialized controller calls. Its read/write fuel boundary contains native evaluation failures; full browser exhaustion and unrelated game faults remain outside that guarantee. Snapshot memory grows16MiB until reload; private native memory reserves its reviewed address space separately.
- The v0.11 freeze/crash cause is unresolved. This release is not a crash fix or an assurance of safe turns/wins.

## Artifact

Version0.20.0. ZIP in project root: `NFSU2-Driving-Tools-v0.20-Full-Preset-Tuner.zip`. Actual size/hash and final counts are recorded in `release-result.json` and the final validation addendum below. The ZIP contains only the extension manifest, authored scripts/metadata, popup, README and changelog. Research, native extracted binaries, game assets and test fixtures are excluded.

## Final artifact verification

- Final Node suite:1,599 passed,0 failed,0 skipped/cancelled. Runtime15.7seconds in this environment.
- ZIP:NFSU2-Driving-Tools-v0.20-Full-Preset-Tuner.zip
- Size:198,941bytes.
- SHA-256:`14b4a4e56b97e4b6234f67319a977b9451920507b55f3ee74e179758688d2f84`.
-23 files, all compared byte-for-byte against final extension source. ZIP CRC passes. No research binaries/game assets/test fixtures.
- AI/physics preservation audit passes after final UI edits.
- v0.17 release SHA-256 remains`cd926b802f3e12a83d18b0bdf55170b81b6960421880f4538641256ffd38734a`.
- v0.18 release SHA-256 remains`c5acdfe3fdb5cf39a6a6d040e7da4c3a980c0a24db89c0b1574d33dda558a7df`.
