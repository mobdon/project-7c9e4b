from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'extension/README.md';s=p.read_text()
s=s.replace('# NFSU2 Driving Tools: experimental v0.14.0 Dyno Mode Fix','# NFSU2 Driving Tools: experimental v0.14.0')
s=s.replace('## v0.14.0: independent dyno mode state','## v0.14.0: dyno mode state and adaptive corner speed')
s=s.replace('Only dyno state handling and its UI have changed. The native AI/collision/physics payloads are unchanged from v0.13.0. This is **not a car no-clip or crash fix**, and it does not add race-specific handling presets.', 'Corner assist also adds an adjustable **Sharp-turn margin** that reduces the existing native corner speed more for tighter bends. It does not replace steering, extend a proven lookahead distance, or avoid obstacles. Reported freezes remain unresolved; this release does not add race-specific handling presets.')
s=s.replace('NFSU2-Driving-Tools-v0.14.0-Dyno-Mode-Fix','NFSU2-Driving-Tools-v0.14.0')
s=s.replace('Changing its enabled state or factor rebuilds AI', 'Changing its enabled state, factor or sharp-turn margin rebuilds AI')
anchor='This factor is a tuning hypothesis, not a measured optimum.'
assert s.count(anchor)==1
s=s.replace(anchor,anchor+'\n\n**Sharp-turn margin** adds 0–25% extra reduction, starting at 15%, according to how far the native corner speed falls below its maximum cap. Tighter upcoming bends receive more margin. The combined formula is `nativeCornerSpeed × baseFactor × (1 − margin/100 × (1 − nativeCornerSpeed/nativeMaximumSpeed))`. At 0%, it follows the v0.13 calculation exactly. With the strongest settings the effective factor can approach 0.45×; it never changes a straight-cap result. This adjusts the original planner’s speed cap, not its steering or proven sampling distance. Begin with normal 1× pace and power/grip changes off, comparing 0% and 15% on the same solo route.')
s=s.replace('**Original v0.13 validation:** 456 automated tests passed, zero skipped. This dyno mode-state fix adds asynchronous mode-transition, independent-baseline and packaging regressions. See `CHANGELOG.md` for release validation. The latest-build native-focused selection passes 86 tests.', '**Automated validation:** see `CHANGELOG.md` for this combined release’s final regression result. This release adds asynchronous dyno mode-transition, independent-baseline, adaptive-corner and packaging regressions.')
s=s.replace('`0x00d0d200` (36 bytes)','`0x00d0d200` (44 bytes, CNR2)')
p.write_text(s)
p=r/'extension/popup.html';s=p.read_text().replace('Dyno mode-state fix: tune each game-selected mode independently. Other tools are unchanged from v0.13. Not a collision or crash fix. Unknown builds stay disabled.','Tune each game-selected dyno mode independently and adjust the sharp-turn speed margin. Experimental native driving tools, local crash logs and exact-build checks remain available. Unknown builds stay disabled.');p.write_text(s)
p=r/'extension/CHANGELOG.md';p.write_text('''# v0.14.0 · Combined experimental build

## Dyno mode state

- Applying a tune in one native race-mode slot no longer blocks searching another.
- Each of the current loaded car's five native tuning slots keeps its own guarded candidate and Restore baseline.
- A mode or car change during either asynchronous search-start snapshot cancels the search before trials. Cached results must match their acknowledged native car and mode.
- Manual tuning or part changes invalidate stale candidates without overwriting the new values. Replacing the car/ride drops old Restore records.
- The menu shows the game-selected tuning slot and explains Store/Save.

Select the mode in the game's Performance Tuning menu, open the Dyno main screen, Find tune, then Apply best. When switching modes, choose Yes if the game asks to store the tune, and use Save Profile. Apply does not automatically save all race presets or the disk profile. Restore requires the same unchanged car, mode, installed parts and applied setup. Records exist only in this page session. The search optimizes ECU/turbo peak power or torque, not handling, gearing, acceleration or lap times.

## Adaptive corner speed

- Adds **Sharp-turn margin**, 0–25%, default 15%, under Free-roam tuning.
- Tighter native curvature-limited bends get additional bounded speed reduction. Margin 0 follows the v0.13 calculation.
- Uses the existing native route planner and full OFF/manual/ON route rebuild when active settings change.
- Original corner instructions remain intact. Straight/gentle caps, unrelated cars/routes and excluded event types retain native behavior.
- Assist starts off after reload; the margin value is retained. The existing logger includes the bounded margin.

This is a speed-planning adjustment, not new steering, obstacle avoidance, a verified longer lookahead or a promise of better driving. Test conservatively with 1× pace and power/grip changes off. Strongest settings can approach 0.45× the original corner speed.

## Preserved features and limitations

Existing automatic AI modes, skill setting, separate pace controls, collision controls, NOS, power, limiter, grip, manual drag, drift, read-only tester, signature scanner and local crash-log export remain present. Compatibility still requires an exact reviewed module. Unknown builds remain disabled.

The v0.11 crash and reported freezes remain undiagnosed. This release does not establish crash-freedom. Back up your save, keep the old extension folder, enable only one version, and test one feature at a time. No live gameplay, real save/reload, better cornering, successful race or absence of crashes is claimed. Browser visual verification remains unavailable because Chromium startup is blocked in this environment.

## Verification

Final combined verification is pending. Do not treat this working copy as a completed release.
''')
