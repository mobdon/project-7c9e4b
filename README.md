# project-7c9e4b

Experimental Chrome extension for driving-assistance research.
Private use, experimental status. Not affiliated with any game or platform.
Some options are cheat-style game modifications. Testers only.

## Current draft: v0.42.8

The source provides build-gated native AI, pace/corner assistance, race rails, supported collision/Drag tools, HUD/radar, saved tool preferences, and experimental tuning/race-loop features. Availability depends on the exact game module and each successfully prepared adapter. Unknown or failed preparation keeps memory tools disabled.

Current scoped availability for game build **60946132**:

| Feature | Current source status |
| --- | --- |
| Native AI, pace/corner hooks, race rails | Scoped support; live driving unverified |
| Drag handoff/protection and paired catch-up | Scoped support; local-engine/mode guards apply; live behavior unverified |
| Synthetic near-miss **Award once** | Opt-in source feature; also affects style points/multipliers; live unverified |
| **Keep NOS topped up** | Optional session-only synthetic-award loop; starts off, waits at full, F7/F9 stops it; live unverified |
| Direct automatic NOS refill | Disabled |
| Tuner / ECU | Unavailable on this build |
| Leased forward road geometry / per-target corner feedback | Unavailable on this build |
| Online car-category controls | Unavailable on this build |
| Native race capture / destination travel | Unavailable on this build |

Online-capable tools require the separate **Allow network tools** opt-in and their verified adapter. Game monitoring and reports remain active; no multiplayer acceptance or account-safety claim follows.

Earlier exact profiles, including **102c8d92**, retain their separately ported features where their full preparation pipeline succeeds; the 609 limits do not remove those implementations. Live verification remains unestablished. Research builds **4c35f9f5 (4c)** and **d396** are not supported by the extension's production source gate; private offline harness work does not add production support.

## Install (testers)

1. Download or clone this repository and keep its folder structure.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select this repository's `extension/` directory.
4. Refresh the game page. F8 opens the tools, F7 returns manual control, and F9 stops tools.

These are manual tester instructions, not actions performed by this publication. Chrome's currently loaded version is unknown. This source draft has no tested v0.42.8 release ZIP or release tag.

## Layout

- [`extension/`](extension/) — current extension source; prefer this over historical packages.
- [`test-environment/`](test-environment/) — curated offline monitor/encoding harness, a separate artifact whose defects and artificial fixtures are its own.
- [`exports/`](exports/) — readable text exports and the binaries they index. Use [`NFSU2-EXTENSION-0.42.8-COMPLETE.txt`](exports/NFSU2-EXTENSION-0.42.8-COMPLETE.txt) as the complete extension reference and [`01-CURRENT-HANDOFF.txt`](exports/01-CURRENT-HANDOFF.txt) for current findings and remaining work.
- [`archive/`](archive/) — historical ZIPs, for comparison only; do not overwrite current source with them.
- [`releases/`](releases/) — tested ZIPs only; see its status note. Historical checks do not establish current live clearance.

Saves and ISOs are excluded. Included game-derived binaries are identified by the export indexes; text files alone are not a replacement for their binary dependencies.

## Verification state

Offline baseline incomplete; power/limiter/grip freezes unresolved; synthetic NOS award behavior live-unverified. The latest history/enrollment unit passed with **zero movement frames**; an earlier 192-frame completion was later disqualified as a proper native-startup baseline. The next CPP startup correction is reviewed source only, not prepared or executed.

No new package installation, browser reload, live race, complete trajectory clearance, or online acceptance was established for v0.42.8. Read the [test-environment limits](test-environment/README.md) and [current handoff](exports/01-CURRENT-HANDOFF.txt) before continuing. Testers only.

## Review and issue policy

The static-review handoff is [`02-HANDOFF-REVIEW-BUNDLE.md`](02-HANDOFF-REVIEW-BUNDLE.md); the source/log bundle is [`review/FOR-REVIEW-0.42.8.md`](review/FOR-REVIEW-0.42.8.md). Existing output is evidence, not a request to rerun frozen conditions. New test execution waits for the reviewer's concrete run-book.

Issues are for testers. Include the exact build, active feature, timestamps and sanitized observed output. Remove credentials, real session IDs, saves and IP addresses. Describe an unobserved ban as "no ban observed yet." Please do not star this repository. Its neutral name does not make its public contents private.
