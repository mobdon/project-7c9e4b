# Read-only native diagnostics

Frozen candidate: `native-diagnostics-candidate`, based on immutable `combined-v017`.

This patch changes no native driving logic, controls, skill, identity, race state, or hook payload. It improves the local bounded log so the next live run can distinguish an AI setting from an actually retained native driver and skill.

## Changes

- Generalize the existing validated Drift reader to verified modes, retaining the old Drift-only method for compatibility. Only exact supported profiles with the existing `driftDiagnostics` capability receive these reads (78e2bb69 and 93af6ccb). Unknown and older profiles stay disabled.
- Record actual player skill, RPM/gear/speed, actual Drag/Drift flags and track ID, native current/requested input modes, recognized native goal, and validated native main-behavior controls.
- Record driver navigation/config/companion pointer presence and bounds validity. No pointer values are exported. These `Valid` flags mean only that the pointer is within the readable bounds for the indicated minimum size, NOT that the object or route is semantically valid.
- Record native mailbox request/status, stale tick count, whether a saved skill exists, and its scalar value. These are observations, not proof of action success.
- Preserve Drift scoring reads and strict graph validation exclusively in actual Drift-family modes. Reject samples when validated identities or relevant pointers/modes change during the read. This is best-effort sampling, not an atomic native frame lock.
- Keep moving native scalar sampling at two seconds; discrete controller, skill or mode changes can record after 250 ms. Export remains bounded to 180 events/65,536 stored bytes, and history may roll off sooner as each record is larger.
- Add `exporterVersion` to the export header. This survives a cleared or rolled-off startup event. It identifies the exporting extension, not necessarily every retained record's producer.

## Source evidence

- Existing v17 Drift diagnostic source and tests already map the global flags, track, speed/RPM/gear, record/driver/backlink, goal vtables and Drift scoring graphs.
- `research/drift-control-current/DRIFT-CONTROL-FINDINGS.md`, section 2, proves the native behavior control offsets +0x20c/+0x210/+0x214/+0x1e0/+0x1e4 and native setters shared by the main behavior base. Read-only values retain their native units. Steering is a signed native 16-bit angle value, not degrees.
- `research/opponent-handoff-current/DRAG-STATE-LIFECYCLE.md` proves driver +0xc navigation, +0x6e0 configuration, +0x6f8 companion and +0x6fc goal ownership.
- `research/drag-v017/set-input-mode-x86.txt` and `set-input-mode-switch-x86.txt`, plus the exact-current handoff worker's replay, establish player +0x22c current and +0x230 requested input mode. The logger bounds both to the native mode range 0–10.
- `tools/build-ai-bridge.cjs` documents mailbox +8 request, +44 heartbeat acknowledgment, +48 stale ticks, +52 status, +64 saved skill record and +68 saved skill value. No address is exported from +64.

## Verification

Focused command, 70 passed:

`node --test tests/native-diagnostics.test.cjs tests/drift-diagnostics.test.cjs tests/diagnostics-page.test.cjs tests/diagnostics.test.cjs`

Full suite command, 1,485 passed:

`node --test tests/*.test.cjs`

See `verification/native-diagnostics-suite.txt` for the final complete run. Tests include guest memory byte-for-byte unchanged with tools off; exact-profile exclusion; invalid/mutating graphs; whitelisted scalars only; bounded sampling; production page saved-skill mailbox fields; and log rollover/export metadata. Native input-mode repair is a separate deliverable in `drag-input-handoff-v018` and is not included here.

## Integration

Apply `native-diagnostics.patch` semantically to the combined candidate. It touches only three production JS files and two test files. `manifest.json` pins baseline and candidate hashes. The page snapshot and logger allowlists may overlap the separate corner diagnostics; merge both sets of fields, retaining native ownership fields here and the corner probe fields from that worker. No release version bump is included. Update the exporting version with the combined release's normal version process.

Do not claim this diagnostic patch fixes or proves live Drag behavior, skill retention, route quality, launch, steering, or wins. It makes those questions observable.
