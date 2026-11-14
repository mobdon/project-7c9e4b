# Offline test environment

This directory contains curated research material for the extension's offline native monitor/encoding and startup work. It is a **separate artifact**, not the production extension, a playable game copy, or an automatically runnable test suite. Its missing prerequisites, harness defects and artificial inputs must be attributed to this environment; they do not by themselves prove an extension defect.

The disclosed scene uses a generic `Retail.seed(0)` car, generated roads and a flat diagnostic scene. It is not the user's saved maxed Skyline or an authentic Street X track. Synthetic names, packets, platform timing and session inputs have their original disclosed provenance. Saves and ISOs are excluded from the repository.

## Current result and limits

The latest executed condition, `current-native-ordered-world-history-4c-v2`, completed once in 1,004 ms, exit 0 without timeout. The existing network/session startup block was placed before whole World construction. Native history-pool allocation, one genuine linked history node, legacy serialization/decoding and enrollment succeeded. All 136 condition files were frozen afterward.

That unit ran **zero movement frames and zero typed maximum getters**. It does not qualify full startup, sustained movement, replay/checksum validity, client reporting, extension-driven motion or online acceptance. The earlier separate 192-frame completion remains a movement observation under invalid startup: a later audit found 190 queued-event allocations with a null pool. It is not a proper startup baseline.

The reviewed next CPP proposal has 309 pinned inputs and has not been prepared or executed. Its selected order is `16761 → 4722 → 11290`, `5035 → 5349 → 5662`, followed by `6000` once after complete selected CPP initialization and before World construction. Preserve existing `11290/9436` exactly once; repeating it after backing allocation discards native ownership. The corrected default table has six records; the three native arrays contain 3,356 entries in total. Replay/event startup and legitimate reporting remain unresolved. The exported handoff contains the detailed evidence and hashes.

## Inputs, fixture exports and binary mapping

Use the indexes under [`../exports/`](../exports/) to locate the original paths and the included binaries. A binary inventory/hash identifies an artifact; it does not reconstruct it from text. The repository may include game-derived WASM/fixture material indexed there. Keep the original source module, observational fixture, metadata, hooks and report outputs distinct.

The history unit's original prepared fixture is `prebuilt-candidate-fixture.wasm`:

```text
SHA-256 05101cdedb8349ae63f9a3453d0f93614d18d57cf1819258ba1d6c7045ba4439
```

Its existing exports include `f4722`, `f5349`, `f6000` and the exact `nativeOriginalDispatch` alias. These exports and the constructor/dispatcher relationships are already part of the pinned fixture; the proposal does not require adding replacement aliases. The source candidate is a different binary, originally `4c-private-composed-v2/candidate-composed.wasm`:

```text
SHA-256 6d93db9aae9308f6b4b51686309de4bcfc4b9d2f698c47099de1083c9621ae23
```

The harness also depends on its original metadata, entry hooks, shared heap/platform providers, CPU/stack ABI, native guest mapping, caller inputs, resource slices and pinned source contracts. A curated copy may retain original workspace-relative imports or source-pin paths. Do not assume a relocated `run-bounded.cjs` is immediately executable, or bypass a missing dependency by weakening checks. Find the mapped original artifact first. A runnable relocation requires a fresh reviewed preparation, not edits to frozen evidence.

## Review procedure; no autorun

Nothing in this publication starts tests, imports the harness or installs the extension. No test execution is requested by these instructions. Read the current handoff and source contracts before choosing any future command. Never import harness/provider modules merely to inspect their exports: module loading can execute native setup.

For later authorized work, preserve every original/frozen condition and pin. Prepare a fresh sibling with reviewed source-only changes; verify its inputs independently; use a concrete bounded execution contract; execute once; freeze all outputs immediately; and independently review the actual outcome. Preserve failures. Do not repair flags, names, clocks, replay state, lists, pools, histories, counters, poses or low-memory outputs to obtain a pass. Native pointers may be interior to a platform allocation, so provenance checks use the unique containing live extent rather than heap-base equality.

Commands and procedures found in historical text are documentation, not an autorun plan. Earlier statements marked LATEST or ACTIVE may be superseded. Start with the [current exported explanation/handoff](../exports/) and the newest pinned CPP proposal rather than an older archived success summary. Offline completion never proves a report-free, multiplayer-accepted or live-safe extension.
