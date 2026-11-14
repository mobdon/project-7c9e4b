# Optional native race geometry recorder

The integrated extension includes an optional native route recorder. The recorder has not collected a complete real race route or been tested in a live race. It does not enable AI, steer, brake or change tuning. Other driving features have their own verification limits in README and CHANGELOG.

## What it records

The recorder reads the owned driver's native race-planning window at the point where the game finishes its corner pass. It does not use free-roam GPS, the drawn map, screenshots, unrestricted asset downloads or opponent routes.

- Off by default, session-only, separate from all driving settings.
- Exact game build 93af6ccb only. Unknown builds do not activate it.
- Offline single-player ordinary race AI only. Online/LAN, drag, drift, special-mode flags, free roam and unsupported ownership are excluded, regardless of the existing online toggle.
- At most 256 windows, no faster than 10 requests/second, at most 40 nodes and 5 corner records per window. The recorder does not enable AI itself.
- No new native calls, steering, throttle, brake, target-speed, tuning, race-state or opponent writes. New writes are confined to its local 2 KiB request/response mailbox.
- Stops on observed identity/state changes, hidden/inactive tab, Stop, manual-control handback, game exit or timeout. An unsettled request or occupied mailbox requires a reload instead of automatic retries.
- Export is a local JSON download. Nothing is uploaded or stored in a tool profile.

## First bounded offline check

1. Update the contents of the existing stable `NFSU2-Driving-Tools` folder, reload its browser extension card, and refresh the game. Keep only that extension copy enabled. The recorder is available only on its exact verified game build.
2. Start an offline ordinary road race. Use the existing AI setting only if you want it to drive. Keep your existing working controls unchanged; capture does not require stronger pace, power, NOS or braking settings.
3. Open Session & diagnostics → Race geometry research → Record native route samples. Keep the tab focused. Stop after a short run, then choose Export route samples. Export before reload/closing; re-arming starts a new recording.

If the recorder reports zero sampled corner records, unknown data, a timeout or an unsupported state, report that result rather than assuming the road is straight. Export the partial recording if available. Do not repeatedly re-arm an unsettled request. Stop testing if the game behaves unexpectedly, and restore the working v0.33 extension.

## Meaning of the 75-degree analysis

The threshold is change of forward heading: 0° straight, 90° right-angle, 180° reversal. The analyzer combines same-direction turns within an ordered native record, so several gentler changes can reach 75°. Opposite-direction bends remain separate. Curvature below 75° is retained because a shallower bend may still need slowing at high speed.

Fresh side-sample markers, finite XY/distances and strictly increasing native distances are required before a record is treated as ordered. Duplicate points, missing pages, stale native tails, non-finite values, invalid ordering and excessive spacing remain unknown. An apparently straight map or straight chord is never proof that the underlying road is straight.

This analyzes sampled horizontal chords. It does not yet assemble windows into a complete race, verify the underlying spline between samples, detect all gentle bends spanning multiple windows, or measure altitude/banking. The native center is reused as the game's center; it is not claimed newly regenerated every pass.

## Identity and coverage

Career records include a verified event hash and native heat ordinal when the native pointer/count, event tuple, track, reverse and laps agree. Region is copied from a bounded TrackInfo field, and TrackInfo's track must agree. Quick-race career event/heat is explicitly unknown. Observed clock resets and career start-counter changes stop recording, but no universal attempt counter or perfect restart detection is claimed.

Each window remains partial. Repeated records are not unique-corner counts. Export always says `wholeRaceChecked:false` and `uniqueCornersVerified:false`. Actual complete race routes captured or verified so far: zero. This is not an “all corners protected” release and does not establish safer braking, faster laps or fewer collisions.

## Fresh offline recorder checks

- 24 native-observer, controller, geometry, loader and preservation tests pass in the current integration. Page control and complete extension regression results are reported separately by the release workflow.
- The complete exact-build modified module validates and compiles. Compared with the current verified AI patch, only the intended recorder route-updater function differs, and all its original instructions are retained.
- The authored observer rebuilds locally from the included builder and pinned evidence. Original game binaries and raw captures are excluded from the package.

Synthetic tests and compilation do not replace live validation. The next useful input is a short offline JSON capture, followed by route-order, coverage and braking-horizon validation. No automatic slowing based on this recorder has been enabled.
