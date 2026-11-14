# Combined v0.18 final verification

Artifact: /workspace/scratch/0d6b822176fd/nfsu2-extension/NFSU2-Driving-Tools-v0.18-Combined-Race-AI.zip
Size: 108685 bytes
SHA-256: c5acdfe3fdb5cf39a6a6d040e7da4c3a980c0a24db89c0b1574d33dda558a7df

Final combined suite:1,555/1,555 passed, zero failures/skips (131.8seconds). Independent merged review:135/135 targeted checks plus exact current native input-lifecycle replay; no blocker. Final packaging tests:2/2 passed. All19 ZIP entries match final source byte-for-byte and CRC passes; no game binaries, extracted native assets, research, tests or tools are packaged. All JavaScript syntax checks pass. Eight authored builder/probe commands reproduce byte-for-byte. v0.17 is preserved across183 source/archive hashes.

Merged frozen race-hairpin-v018, drag-input-handoff-v018 and native-diagnostics-candidate. Grip/downforce prototype is explicitly excluded as unfinished. Full CNR3/64-byte and modern AI+92/+96 cold occupancy guards are preserved, with both feature sets in native/page diagnostics. Modern profiles change11 intended native bodies; other bodies and non-code sections remain unchanged. Combined-only retry wording corrects the native mode-change latch status, without changing native payload behavior.

Fresh public metadata checked 2026-11-09T20:14:31.577Z: revision93af6ccb, size38205596, moduleEo4rWBao6s5LdorskgMYoW; matches current exact support. A fresh game binary was not downloaded; runtime independently requires SHA-256128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6.

Limits: hairpin assist is solo ordinary road-race-only, excluding online/LAN, Outrun and actual/forced Drag/Drift. GO/full-physics-only actual Drag acquisition remains; force-only/special Drag is unsupported. Existing online controls retain their previous scopes. No live race benchmark, launch/shift/finish proof, complete AI action graph/opponent equivalence, multiplayer behavior, freeze fix or native grip/downforce improvement is claimed. Bounded diagnostics are read-only observations, not atomic frame proofs. Native tactical/skill/NOS resource checks remain.
