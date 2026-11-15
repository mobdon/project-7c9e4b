# project-7c9e4b

Experimental Chrome extension for driving-assistance research.
Private use, experimental status. Not affiliated with any game or platform.
Some options are cheat-style game modifications. Testers only.

## Versioned candidate: 0.43.1-a3a9a837-draft.1

The extension and [tested ZIP](releases/0.43.1-a3a9a837-draft.1/nfsu2-driving-tools-0.43.1-a3a9a837-draft.1.zip) target the captured **a3a9a837** module. The exact source-to-primary-to-online-to-synthetic adapter chain compiled successfully. All **410 host tests across 18 files** passed with artificial data and no game execution. [Validation record](releases/0.43.1-a3a9a837-draft.1/VALIDATION.json).

The November 15, 2026 capture identifies **a3a9a837**. The recheck found one changed native traffic-default function; its complete incoming body is preserved in every patched stage. This record covers the captured bytes and does not prove which module a running page uses. Unknown or failed module preparation keeps memory tools disabled.

Synthetic near miss retains **Award once** and **Loop synthetic near misses**. The loop confirms one award at a time, waits at full NOS and resumes after consumption. It starts off for each page; F7/F9 stops it. The separate unused direct-refill control and active preference were removed. Old saved session fields are scrubbed, and named profiles preserve their legacy schema with `nos:false`.

Native award amount remains 1, distinct from the game's combo multiplier. Serial awards retain native combo progression; earlier retail metadata specifies a cap of 5. Immediate or current live ×5 NOS gain is not verified, and the loop can pause at full NOS before reaching that combo.

The d739e631, d396 and earlier exact profiles remain registered with their existing feature guards. Native AI, pace/corner hooks, race rails and scoped Drag/collision tools are retained. Unavailable tuner/ECU, leased forward geometry, per-target corner feedback and online car-category capabilities remain unavailable on this candidate. Online-capable tools still require **Allow network tools** and a verified adapter.

Compilation and host tests do not establish native game startup, live driving, online acceptance or installation. The frozen C4/B0 work and earlier baseline limitations remain separate evidence.

## Install (testers)

1. Download or clone this repository and keep its folder structure.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select this repository's `extension/` directory.
4. Refresh the game page. F8 opens the tools, F7 returns manual control, and F9 stops tools.

These are manual tester instructions; this publication did not install or reload Chrome. The ZIP is versioned for a3a9a837 and must not be treated as clearance for later site revisions.

## Layout

- [`extension/`](extension/) — current extension source; prefer this over historical packages.
- [`tests/`](tests/) — exact host-test sources for this candidate.
- [`test-environment/`](test-environment/) — curated offline monitor/encoding harness, a separate artifact whose defects and artificial fixtures are its own.
- [`exports/`](exports/) — retained historical 0.42.8 text exports and indexed binaries, not the current 0.43.1 reference. Use [`NFSU2-EXTENSION-0.42.8-COMPLETE.txt`](exports/NFSU2-EXTENSION-0.42.8-COMPLETE.txt) as that version's complete extension reference and [`01-CURRENT-HANDOFF.txt`](exports/01-CURRENT-HANDOFF.txt) for its historical findings and remaining work.
- [`archive/`](archive/) — historical ZIPs, for comparison only; do not overwrite current source with them.
- [`releases/`](releases/) — tested ZIPs only; see its status note. Historical checks do not establish current live clearance.

Saves and ISOs are excluded. Included game-derived binaries are identified by the export indexes; text files alone are not a replacement for their binary dependencies.

## Verification state

The a3a9a837 compile and 410/410 host results are recorded above. The following older native-baseline limitations remain unresolved and are not superseded by those host checks.

Offline baseline incomplete; power/limiter/grip freezes unresolved; synthetic NOS award behavior live-unverified. The latest history/enrollment unit passed with **zero movement frames**; an earlier 192-frame completion was later disqualified as a proper native-startup baseline. The next CPP startup correction is reviewed source only, not prepared or executed.

No new package installation, browser reload, live race, complete trajectory clearance, or online acceptance was established for v0.42.8. Read the [test-environment limits](test-environment/README.md) and [current handoff](exports/01-CURRENT-HANDOFF.txt) before continuing. Testers only.

## Review and issue policy

The retained historical static-review handoff is [`02-HANDOFF-REVIEW-BUNDLE.md`](02-HANDOFF-REVIEW-BUNDLE.md); the source/log bundle is [`review/FOR-REVIEW-0.42.8.md`](review/FOR-REVIEW-0.42.8.md). Existing output is evidence, not a request to rerun frozen conditions. New test execution waits for the reviewer's concrete run-book.

Issues are for testers. Include the exact build, active feature, timestamps and sanitized observed output. Remove credentials, real session IDs, saves and IP addresses. Describe an unobserved ban as "no ban observed yet." Please do not star this repository. Its neutral name does not make its public contents private.
