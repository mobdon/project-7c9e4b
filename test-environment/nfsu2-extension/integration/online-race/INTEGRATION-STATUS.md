# Combined v0.21 integration status: HOLD

The online road-race corner/braking patch is integrated with the frozen v0.20 full preset tuner in a fresh directory. It is not installed or delivered. The parent's hold remains pending separate online collision/Drag research and the native grip/downforce blocker.

## Result

- Source baseline: `full-tuner-v018`, manifest0.20.0, immutable original ZIP preserved.
- Candidate: `combined-v021-integration`, manifest0.21.0.
- Integrated only the approved `research/online-race-settings-v020/online-race-source.patch`, with two manual context resolutions preserving the newer corner status and all tuner UI.
- Regenerated only `build-corner-hook.cjs` and `build-braking-hook.cjs` outputs. No profile or main-bridge builder ran.
- Solo/Street X formulas and native event-specific routing remain unchanged. Online/LAN road-race corner/braking uses the same selected values only under existing explicit network permission and owned local AI/private-route guards.
- Native grip/downforce activation remains disabled. Wall/car/player/NPC collision scope, Drag, Drift and Outrun changes are excluded. No Lap Knockout experiment.

## Verification

- Main final aggregate: **1,607 passed, zero failed/skipped/cancelled**. Independent final aggregate: same result.
- Independent native module comparison for all four supported builds finds only corner function4653 and braking function4497 changed relative to v0.20. All other bodies and non-code sections are identical.
- All16 preserved extension runtime/profile files are byte-identical, including the complete tuner and next-profile main bridge/fullTuner metadata. Manifest script list and permission surface unchanged.
- Extra actual native current/next corner suites12 each and legacy native corner5 pass. Native braking suite covers all four profiles.
- The two authored hook builders reproduce generated payloads byte-for-byte. Full fresh-copy reproduction applies19 source/generated/doc/test deltas without conflict, rebuilds those two hooks, and produces a byte-identical ZIP.
- Independent review: `INDEPENDENT-REVIEW.md`. Reproduction: `REPRODUCE.md`, `integrated-v021.patch`, `reproduction-results.json`. Exact source list: `changed-files.json`.

## Held artifact

`nfsu2-extension/NFSU2-Driving-Tools-v0.21-Combined-Tuner-Online-Race-Candidate.zip`

Size199,817 bytes. SHA-256 `18bc12d5ed206bfa162dc078c18101eea78c15db4b97e9c6781ef9eb9a824d65`.

The23-file archive contains only the unpacked extension and its docs. Canonical metadata makes packaging reproducible; exclusive creation prevents overwriting a prior ZIP. Do not mutate this frozen archive. Further combined work should use another copy/version.

## Limits

This proves a guarded routing correction, not that it caused or fixes every wall hit. No live online race, network synchronization, server acceptance or visual/browser test was run. Full tuner handling categories remain manual; only gearing/ECU/turbo have automatic measured objectives. Native Test Run and Save Profile remain user actions; real save/reload persistence is unverified. The reported crash/freeze cause remains unresolved.
