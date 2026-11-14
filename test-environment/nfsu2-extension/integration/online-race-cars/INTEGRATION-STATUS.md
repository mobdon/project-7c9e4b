# Combined v0.22 integration: held candidate

## Completed

Integrated the independently reviewed online-race car-contact patch into a fresh copy of combined-v021-integration. The full tuner and opted-in online corner/braking parity remain intact. No released/frozen archive was overwritten. No live user game, installation or network session was touched.

The new exact93af6ccb capability extends the independent Online player / race no-clip switch with mode4. Race mode requires explicit network permission, active Online/LAN race, one local player, matching current car/race/body/contact identity, bounded2–6 inline racer records, reciprocal record binding, fresh heartbeat and unchanged sequences. Both contacted cars must occur exactly once. Unrelated roster entries are range/alignment checked, but the code does not claim universal integrity of unrelated records.

Only local native contact resolution is skipped. This does not change packets, server/peer state, Ghost settings, map geometry or remote simulation, and it does not guarantee another player sees no collision. Wall and NPC-traffic filtering remain separately scoped; older game profiles retain their previous behavior. Solo/Street X driving and handling formulas remain unchanged.

## Integration safeguard

The original contact candidate's builder reconstructed a64-local next profile and would have removed the full tuner. The adapted builder now validates that its rebuilt base bridge equals the existing reviewed fullTuner.baseBridge, recomposes the170-local tuner prefix, preserves metadata/capability, and checks all unrelated profile properties. An unexpected base change fails before replacing the profile. Two isolated rebuild tests certify idempotence and mismatch refusal.

The only manual patch conflict was session-help wording, merged to retain both online corner/braking and local race-contact descriptions. Native grip/downforce remains disabled. No Lap Knockout or new Drag changes are included.

## Verification

- Final complete serialized suite: **1,619 passed,0 failed/skipped/cancelled** (`all-tests-final.txt`).
- Independent candidate scope:155 focused tests plus5 extra native groups.
- Independent integrated scope:223 focused tests plus5 extra native groups, including builder protection, real native collision wrapper, tuner, online corners and braking.
- Relative to v0.21, only native function22508 differs. All other function bodies and non-code sections are unchanged. Full tuner bridge/metadata/locals170, previous capabilities and online corner/braking implementation are preserved.
- Accepted native write footprint is limited to existing ghost pair-pass bookkeeping, return CPU state and dedicated counters/status. No peer/network or roster writes.
- Fresh-copy reproduction: apply integrated-v022.patch to frozen v0.21, run guarded next-profile builder, compare all21 changed files including regenerated cars-next.wasm, then build a byte-identical archive. See REPRODUCE.md and reproduction-results.json.
- Independent review: `nfsu2-extension/research/online-race-collision-v018/INDEPENDENT-MERGE-REVIEW.md`.

## Frozen artifact, not delivered

`nfsu2-extension/NFSU2-Driving-Tools-v0.22-Combined-Tuner-Online-Race-Candidate.zip`

201,365 bytes. SHA-256 `bd6b0757620c3b8497555e3648a4ab26bd018536967756c99b04b454240b5248`.

23 extension/docs files only. No native game binaries, research data or test fixtures are packaged. Canonical ZIP metadata and exclusive creation preserve reproducibility and existing archives.

## Remaining hold and limits

Delivery remains held for pending Drag evidence and unverified grip/downforce. No live online race, synchronization, server acceptance, real-browser appearance, crash-free behavior or user-save reload was verified. Full tuner handling categories remain manual; only measured gearing/ECU/turbo search is automatic. Test Run refresh and native Save Profile remain user actions. The reported freeze/crash cause remains unresolved.
