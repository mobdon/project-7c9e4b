# 93cfc6e9 forward compatibility handoff

Production integration is complete. The extension/config files are frozen for
the root release verifier and canonical suite. No live game outcome is claimed.

The exact input is 38,615,704 bytes with SHA-256
`e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03`.
The new forward profile retains 26 authored helpers, 581 private globals, no new
native signatures, a 2,048-byte mailbox, 24 raw anchors, 40 checked route nodes,
48 display samples and the existing 512-unit checked native-policy horizon.

Native projection1298 and setter6140 retain their indexes. Target13186 becomes
13185. The checked insertion offsets remain projection860, target2855/3373/
4016/4169 and setter150. All 44 compared native closure/hook/grade bodies match
after the explicitly declared function, signature and address relocations.
The new native module has139 signatures, including a53/54 swap and insertion
at105; the port compiled against those actual signatures. It preserves the
new native global declarations, imports, exports, table and data.

Runtime ABI: bitmap`0x297852f0`, lookup`0x28706780`, second-window atomics
`0x2978d2f0`/`0x2978d2f4`, native online tuple
`[702897808,705325968,705310588]`. The second-window bounds remain
`0x50000000..0x7ffe0000`. Grade255 remains denied without lazy initialization;
all permission, commitment, source, identity, snapshot and lease guards remain.

The audit also found stale folded evaluator guard cells in d2fa4f4c, cd5b74d5
and8abf9be8. Each now uses its exact runtime lookup plus the checked guest
function offsets. Only four `i32.const` instructions in its appended `fwg_slot`
helper change: each of the two cell addresses appears in one guard and one load.
Every other old profile field, authored helper, original native body and
non-code section remains identical. 3bdd9959 already had the correct cells.
`slot-corrections.json` records exact old/new cell addresses and helper hashes.
The shared fixture now clears the stale3bdd cells for every later profile.
The8ab source builder reproduces its corrected config exactly.

New combined module:38,660,397 bytes, SHA-256
`d110ff2905894159aeb735a3351d3381a9c7ae44408858df1806761be8b9b9af`.
Old corrected full outputs: d2fa=`fade94669268082bd7290916753e976417486deaa6c86e3fe36a7776e0980fb3`,
cd5=`188513272e25b302cbc2093c84e437afdc418e6411692155ec0bd507a88a2cf1`,
8ab=`341c1e96d8229fae271ddf1ef32b2bb16f40ce489292446fa674b5338825b6ce`.
The other five previous complete outputs retain their v0.38.1 hashes.
`combined-outputs.json` records the independently reconstructed old outputs,
exact changed helper indexes and current complete outputs.

Validation:55/55 isolated tests passed across6 files. After integration,
56/56 focused production tests passed across7 files, with no failures, skips,
cancellations or todos and the owned source hashes unchanged. Durable logs
and receipts are `final-candidate-tests.*` and `production-focused-tests.*`.
The focused production selection is:

- `forward-registry.test.cjs` (updated to five revisions/bitmap ABIs)
- `forward-native-policy.test.cjs`
- `forward-native-horizon.test.cjs`
- `forward-current-native-policy.test.cjs` (new)
- `forward-current-native-horizon.test.cjs` (new)
- `forward-current-compatibility.test.cjs` (new)
- `rear-radar.test.cjs`

The read-only route probe and radar implementations are byte-identical to
v0.38.1; the new exact registry metadata supplies their current ABI. The isolated
radar tests cover all five forward profiles and retain the blink-out byte
regression. Native grade/world-list semantics were independently reviewed by
the diagnostic agent. No free-roam feature was added. Complete route capture,
autonomous travel, selected-host join/race/return, newer tuner/S42, live grip,
downforce and online no-clip remain unverified or unavailable as before.

Isolated authored port/reproduction sources remain in
`work-93cf-forward/{port-forward,fix-slots,setup-candidate,output-proof}.cjs`.
Do not rerun the one-time integration script over a newer production state.
