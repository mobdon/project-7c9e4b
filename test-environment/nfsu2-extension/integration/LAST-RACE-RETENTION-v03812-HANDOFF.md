# Last race trace retention candidate

The only runtime change is `extension/diagnostics.js`, based on the delivered v0.38.11 source lock `12434dfbc61d4a07d0950abc4310e466ac84a20a7e07844dc090e136c7f87cc5`.

The candidate adds a separate `nfsu2-driving-tools-last-race-trace-v1` storage key and `lastRaceTrace` export. It copies accepted, sanitized normal trace rows only when `ready === true`, `hud === 1`, and `raceType === 1`. Mode flags remain intact. It is bounded to 240 rows and 262144 bytes; dense rows reach the byte cap first. Free roam does not write or evict this retained window. Stop/manual preserve it; explicit Clear persists an empty window. Reload uses exact known columns, strict format/schema/row bounds, sanitization and the same race filter. A pre-feature validated normal trace migrates if no valid separate key exists. A valid empty separate key prevents old trace resurrection.

The export clearly labels latest retained road-race samples as historical. It does not imply a complete route, current ownership or a race result. Retained rows may cover multiple previous road races within the bounded window. Same-tab checkpoints are throttled to two seconds; an abrupt reload/crash can lose the uncheckpointed tail. Export flushes pending rows. Storage denial still permits memory-only export.

Focused verification passed **153/153**, including **9/9 new tests**. The actual production page generated nine race rows, then 500 accepted city rows over 125 seconds; the separate race window survived same-tab page reload. A frozen nine-row .11 fixture was captured from the exact delivered page/core/logger hashes for migration testing. Privacy, byte/row limits, quota/storage failures, Stop/manual and Clear/reload all passed. A four-checkpoint differential against delivered .11 proved ordinary raceTrace exports, events/history, normal storage contents and normal write cadence/order/bytes unchanged. No live-game test is claimed.

## Integration

Copy only the exact owned support files listed in `verification/last-race-retention-v03812-handoff.json`. Merge the runtime diagnostics additions into the current city/tuner diagnostics file; do not replace that integrated runtime file wholesale. City diagnostics already defines immutable `V03811_TRACE_COLUMNS`, then appends new city columns to `TRACE_COLUMNS`. Keep both in the retained-window known-column list. Preserve city's current normal trace migration and tuner enums. Root owns final versioning, canonical tests, manifest and delivery.

The new test suite references only the packaged frozen .11 fixture; its page tests use current production page/core/logger with authored UI/AI/memory fixture doubles. The two tools under `tools/` use this workspace's frozen `work-paced-v03811` to reproduce fixture provenance and normal-contract differential; they are support tools, not runtime extension assets.

The receipt identifies every owned file/hash. All other 56 extension source files still match the .11 baseline. Production and Desktop files were not modified by this candidate task.
