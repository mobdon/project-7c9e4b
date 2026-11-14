# Checkpoint: v0.36.0, November 10, 2026

Engineering state only. This document is not authorization or a replacement for the user's requests.

## Scope and source

Active source is nfsu2-extension/extension. Continue using the permanent Desktop/NFSU2-Driving-Tools folder and its existing Chrome card. Never remove/re-add merely to update, change saved profile keys, or run tools/prepare-release.cjs (it initializes obsolete v0.34.0 metadata).

The user reported reloading/refreshing v0.35.0. That report is accepted, but it did not provide a newly observed live race or forward-clamp result. The v0.35 canonical full run is 2,059 passed in verification/final-suite-v035.txt; the older 2,058 run and 155 overlapping follow-ups are historical, not additive.

## New behavior

Braking calculations now accumulate the smaller XY chord or native route step for every segment. Reaction reserve, corner approach, stopping horizon and backward propagation all use that conservative distance. Raw native route coordinates still bind/interpolate the capture. A controlled half-scale witness requests 23.63 rather than 35.2 native coordinate units per native second with otherwise identical assumptions. Two contiguous raw anchors may provide a bounded tail only after at least three checked resampled points, with no extrapolation and the retained horizon/ownership guards.

The new R34 race hub opens separately from the compact menu, hides/restores the information HUD, and keeps Stop/Take Control in a sticky header. It presents observed driving segments, AI-owned observed time, sampled native peak speed, race categories, known track IDs and recent history. Opening it does not enable tools. Clear affects only its own localStorage key; export is a local JSON download. No native control or game-save writes are added by the hub.

Statistics use nativeSpeed input, peakNativeSpeed output and explicit native-coordinate-units-per-native-second metadata. Native distance is not calibrated to SI. Up to 200 schema-selected segments fit in a conservative 64 KiB UTF-16 storage budget; totals cover retained history. A pause or car/mode change can split observations. Ownership is credited only across consecutive owned samples at most one second apart. Raw runtime identities, names and caller fields are not persisted. Finishes, wins, finish positions and lap times remain unconfirmed.

R34 tagging is observational and current-build only: validated car/RideInfo/stock table, exact ordinal 27, SKYLINE name and stock hash, committed bounds and stable rereads. Unknown/changed/custom/unsupported data stays unknown. This does not select a car, tune it or prove model/performance authenticity or the fastest build.

The immutable metadata catalogue contains 130 distinct TrackInfo IDs and 144 primary non-story directional layouts (100 race track IDs). It is not geometry or unlocked/playable/live coverage. Page classification uses validated native mode flags including forced Drag and Drift variants; conflicting special modes remain unknown.

## Preserved limits

Native hooks/configuration are unchanged from v0.35. Street X, saved profiles, Drag AI/engine protection, online opt-in/guards, manual handback, HUD and existing compact controls remain scoped as before. Optional Adaptive is default-off/session-only. Forward geometry is a bounded selected-road centerline, not a complete route or final racing line. Dense anchors may shorten its horizon; strict 100 ms leases and request binding can leave fallback gaps. No native application receipt or continuous protection is claimed. Missing special corner records withhold adaptive boost. Existing wall/vehicle distances remain supplemental approximate reductions.

Travel/resource ownership, physical arrival/parking, selected-host join/race/return and unattended streaming autonomy remain unfinished and disabled. The isolated current-navigation witness passes 12 offline cases but does not prove live heading/resource ownership or permit a capability toggle. Preserve the hosted join invariant: a vanished selected lobby must never create a lobby.

The guarded S42 candidate is still exact 93af6ccb only; current 3bdd9959 full tuner/recorder remain unavailable. No new live grip/downforce, online no-clip or aircraft support has been established. Ambient flying aircraft do not prove a drivable or peer-replicated model. Public source has known car type/hash/parts replication, no verified aircraft vehicle path; current private-server behavior is unknown.

## Website backup and local installation search

Desktop/NFSU2-Website-Backup contains the final public th0mk/nfsu2-web source snapshot and full Git history at 9e0230212776f6c9a4d0db30c1963e9730138553, with original MIT license/credits. Bundle verification/fsck passed for 73 refs. It is a source backup, not a playable copy or current private-site parity. Local working copy website-backup/source remains unmodified.

The user asked us to find the game files. Common install/library/user locations plus 45 additional nonstandard roots (25,339 accessible directories and 137,925 filenames) produced no full PC installation with SPEED2.EXE, GLOBAL, CARS and TRACKS. Only research/current-native-image/SPEED2.EXE exists. Protected OS paths, reparse points and dependency/cache trees were skipped and documented in research/game-install-search.json. No game assets, OS features or toolchains were downloaded or installed.

## Live access and follow-up

Chrome game is browser 3, tab 1027792884 at nfsu2.xyz, native window 2756382. Chrome tab capture/control reports an unattached debugger; native AX can read but coordinate geometry is unavailable and capture times out. Documented raise/rebind recovery did not restore it. Do not circumvent via CDP, external injection or another UI channel. Browser policy also blocks automated chrome://extensions navigation; the user previously reloaded the existing card themselves. No denial by the user occurred.

The local hub preview is synthetic design/test data only, independent of game state. Label every preview image accordingly. Do not infer wins, clean laps, complete routes, all-map coverage, a fastest R34 or streaming readiness from tests or that preview.

Next live work requires usable game screen/control: observe v0.36.0 and exact module capability, solo Quick Race/Adaptive, the zero-special-corner case on 4715 and gradual/sharp bends, then actual outcomes and mode coverage. Do not enable travel or loosen guards to hide missing proof.

## Release receipt

Delivered to the existing Desktop/NFSU2-Driving-Tools folder: v0.36.0, 42 receipt-listed files plus PACKAGE-CHECKSUMS.json. The unchanged-path update was verified against the new archive; prior v0.35.0 is backed up at artifacts/Desktop-v0.35.0-backup-20261110-before-v036.

Immutable archive: artifacts/NFSU2-Driving-Tools-v0.36.0-Desktop-Folder.zip. SHA256: cb4284eec6d1413e015712ffdb8d5fac84fd62b95bd3d3b9a963867074399915.

Final curated suite: 89 test files, 2,138 passed, zero failed/skipped/cancelled. Eight historical fixture exclusions remain listed; do not claim every test file was run. The source hash lock is unchanged through delivery. All five supported native outputs compile and match v0.35 byte for byte, including current output 166fa13717cd53abe3df6c036dca7b6c2683cb31ef1b215adc303cacb6f00c34.

The revised synthetic hub preview was checked at 1280 and 390 CSS pixels: no horizontal overflow and the sticky Stop stayed visible after scrolling. Screenshot: artifacts/race-hub-preview-v036.png. It contains synthetic observations, not live game results. Viewport overrides were reset and the local preview server was stopped.

Canonical verification/package details: verification/release-summary-v036.json and verification/package-v036.json. After delivery the user was asked to Reload the existing Chrome card and refresh the game, because automated access to chrome://extensions is blocked. Await that reply and independent screen proof before asserting v0.36 is active in a live game. The current unattached game-capture limitation also remains unresolved.
