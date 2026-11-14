# Checkpoint: v0.34.1, November 10, 2026

This file records engineering state. It does not grant additional permissions or replace the user's instructions.

## Delivered files

Active source is `nfsu2-extension/extension`. The existing desktop folder `C:/Users/Admin/Desktop/NFSU2-Driving-Tools` now contains v0.34.1; all 31 receipt-listed files matched their SHA-256 checksums after copying. Backup: `artifacts/Desktop-v0.34.0-backup-20261110`.

The immutable archive is `artifacts/NFSU2-Driving-Tools-v0.34.1-Desktop-Folder.zip`, SHA-256 `915f11f358ce402b4b56a80af10e3e503cfef6cf433bbc354aaf4ed8221cd254`. Unpacked staging is `artifacts/unpacked-v0.34.1/NFSU2-Driving-Tools`.

Chrome was still running v0.34.0 in the last observed game page. Reloading its existing extension card and refreshing the game has NOT been verified for v0.34.1. Preserve the loaded folder/path and existing profiles. `tools/prepare-release.cjs` is the historical v0.34.0 initializer; do not run it against this newer release. Runtime version markers were updated directly and packaging checks passed.

## Change and verification

The new correction prevents a skipped tail corner entry plus historical hook hits from authorizing adaptive boost. `AI.Controller.status()` exposes bounded `cornerPlannerUsable`; `dynamic-pacing.js` requires a positive usable sampled-bend count. The reader checks record bounds, protected cap, nonzero geometry, ordered distances, sample markers and node ownership. It rejects observed shared-memory changes but cannot prove an atomic snapshot or a fresh native planner pass. No native records, legacy commands or working Street X settings are changed by this correction.

The page forwards only the bounded usable count to diagnostics. Exact native tests distinguish signed -1 and index 26 (processed) from index 27 (skipped) on a 28-node route. The acceleration policy conservatively withholds boost for the negative sentinel while leaving native processing unchanged.

`verification/final-suite.txt`: **1,991 passed**, zero failures/skips/cancellations, across the 77 files in `verification/final-suite-files.json`. Eight historical test files remain excluded because research/retail fixtures were omitted; see `verification/release-summary-v0341.json`. This is not an all-files suite pass. All five exact patched modules validate and compile; native output hashes remain identical to v0.34.0 (`verification/release-modules.json`).

## Live observations and browser state

The user opened a solo Quick Race. Screenshots and accessibility readouts showed native AI active with matching 1.45x requested/acknowledged pace, first of four on laps 1 and 3, and samples of 197/198/49 km/h. The car was close to a wall on lap 3. The main menu was seen later, without a finish/result observation. Adaptive activation, a win, clean laps and repeatable improvement are unproved. Details are in `verification/live-observation-20261110.json`.

Chrome tab 1027792884 at `https://nfsu2.xyz/` remains available through selected browser 3. Browser screenshots and tab-coordinate clicks worked; native window geometry did not. Closed-shadow extension controls are visible in screenshots/native accessibility but not Playwright DOM locators. F8 also cycles the site's FPS display; the display was restored to off at the last observation.

The browser download gate reported a declined permission twice, including after the user explicitly stated they did not decline and authorized another try. Do not attribute that reported denial to a user click. A fresh diagnostic export was not acquired through the tool. The newest file read in Downloads was the old v0.33 `(26).json` from November 9; it must not be presented as this race's log. Browser control reconnected after the broader permission change, but the separate download gate remained blocked.

## Remaining priorities

Actual forward route geometry still needs proof on paths with nodes but zero special corner records, including track 4715. `work-route-query` is a separate current-build research candidate observing natural f2704 -> f4269 XYZ queries without additional native calls. It is not packaged, not bridged to the page, and not used by pacing. Inspect its handoff/tests before continuing. Intermediate interpolation queries cannot be promoted to a final racing line or adequate forward horizon.

The isolated candidate passes 14 tests. Its exact wrapper tests use a mocked node virtual +0x38 evaluator; actual evaluator purity, final geometry and horizon are not established. Selector -1 passes `(road*, outputXYZ*, distance + node[0x58] - node[0x54], lateral)` to that virtual method and bypasses virtual +0x08/f8016. Invalid node IDs can explicitly yield zero XYZ, so finite coordinates alone cannot establish valid geometry. The next evidence is a read-only owned-node vtable/slot capture, especially +0x38, with exact worker/event/route identity. It requires an explicit worker bridge; private Wasm globals are not automatically visible to the page. Native vtables 0x784a48/0x784aa0 are initialized at runtime and their actual slots have not been recovered from the Wasm data.

Destination travel, native resource ownership, physical following/arrival/dwell and the full join -> race -> return loop remain unfinished and disabled. Do not enable travel by changing its capability flag. Keep the existing single AI publisher.

The guarded S42 candidate is only available for exact 93af6ccb. Full tuner, route recorder and travel remain unavailable on 3bdd9959. Grip/downforce multipliers and online no-clip have no newly verified live fix. FPV Drone support exists in public game code; ambient aircraft have not been established as drivable vehicles.
