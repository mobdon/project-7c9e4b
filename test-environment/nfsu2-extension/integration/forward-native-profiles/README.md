# Exact-build forward geometry and pacing

November 10, 2026. Production integration for the four verified original module
hashes below. These inputs contain authored patch fragments, runtime addresses
and hashes; no original game images or native function bodies are packaged.

The production page now requests capture-only operation with
`applyTarget:false`. That option revokes any previous optional target before
requesting geometry and returns `observed` after a valid capture without calling
the target publisher. The default `true` API remains for isolated/native
regression coverage; physical target publication is not enabled by the page
until live calibration is available.

| Revision | Original module SHA-256 | Guest commit bitmap |
| --- | --- | --- |
| 3bdd9959 | ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c | 0x29779ac0 |
| d2fa4f4c | e41d71453cecba5ee2cd3cbf70af1c84180020644151f5f9bc2fa828fa5123bb | 0x29782880 |
| cd5b74d5 | 32b09c8bfea0c23aff21e5edac8f3b99b4d3fe143e8b479b9bea506091ab2174 | 0x29783a40 |
| 8abf9be8 | 14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd | 0x29783e80 |

`tools/build-forward-registry.cjs` reproducibly generates the browser registry.
Its exact-hash selection, nested configs and runtime address arrays are frozen.
The patcher accepts only the registry's own config for the verified original
hash. Unknown hashes and caller-supplied replacements fail. Each geometry owner
retains its selected immutable ABI; selecting another build cannot change it.

The streaming loader must first verify and compile the base AI profile, then
compose and compile this optional patch before granting geometry/clamp
capabilities. Failure preserves the verified base AI and withholds both new
capabilities. The four older supported builds retain their previous outputs.

## Enabled contract

Ordinary road races require active, locally owned AI and its private main route.
Online use additionally requires literal explicit page permission and AI mailbox
permission `+84 == 1` in the acknowledged even owner generation. Probe, request,
poll, publisher and native checks bind permission, mode, host/client markers,
ONLINE byte, race category and the three native online-status scalars. Native
checks compare that context inside the capture transaction and before the final
owned controller setter. Networking fields are never written.

The native status scalars indicate online/on, network-ready and in-roam status;
they are not verified lobby IDs. Equal status flags cannot exclude room changes
or allocator ABA. Route/event/track/road-byte ownership checks and the short
lease remain independent guards, not proof of server acceptance.

Native capture retains its 2 KiB mailbox, 24 raw anchor limit and 184.01 maximum
checked route horizon. Local resampling/planning accepts at most 48 points at
the existing eight-unit spacing while retaining every represented native knot.
This prevents the former 24-point local budget from losing a later bend without
coarsening spacing, changing native capture, or extrapolating beyond its end.
For example, a native 90-degree knot at 140 units in a 180-unit capture is now
retained rather than truncating the local window at 115 units. Gradual
same-direction heading changes still accumulate the 75-degree priority.

When explicitly exercised by the optional publication API, a final native cap
must itself be positive and can only lower the finite positive owned target, expires
after at most 400 native ticks (100 ms at the checked 4000 Hz timer), and is
revoked by Stop or permission/context withdrawal. Existing lower, nonpositive
and nonfinite native requests retain their original behavior. Online Street X
category 10, Street X flags, Drag, Drift, Outrun, reverse, free roam, pre-GO,
foreign ownership, changed roads/clocks and unavailable memory remain denied.

The corrected planner uses measured corner constraints without treating the end
of a bounded excerpt as a stopping obstacle or imposing a fixed straight-road
ceiling. Straight observations and insufficient reaction coverage return native
fallback with no optional target, rather than a zero target. Current native speed
is bound to the acknowledged metadata before any optional publication. No stop
hazard schema is inferred from route geometry: an original native zero, negative
or nonfinite target retains its native behavior.

## Verification and limits

`forward-online-native.test.cjs` executes nine cases for each of the four
profiles with production registry/runtime and the actual native sampler,
query closure and post-hook setter. Projection/construction is a controlled
fixture boundary. Cases cover permission, every bound scalar, ownership,
memory/phase/special modes, exact expiry, Stop, dense later corner retention,
cross-build metadata refusal, complete patch preservation, and an original
versus patched setter comparison over the first 16 MiB. Only the intended owned
controller target differs in that bounded comparison.

A combined 91-case run passed loader/page, d2/cd5 loader integration,
anchor/pacing/driving/native integration, registry and all three online native
profiles. A subsequent 32-case run passed after adding same-hash replacement
config rejection coverage. The refreshed 0.38.0 `verification/release-modules.json`
records all eight
complete outputs compiling with expected hook changes and preserved original
sections, imports, exports, tables and data. These test counts are overlapping
and must not be added together.

The subsequent 8abf9be8 port passed 11 isolated native permission/preservation
cases and 12 complete native timer cases. Source audit found 38 of 41
forward/query/projection/setter/timer bodies byte-identical to cd5; the remaining
changes were reviewed lookup and timer-host relocations. The relocated native
online-status helper was independently matched after its three declared address
changes. A 40-case production registry/native/dense-window run then passed for
all four forward profiles, including the new build's later sharp corner with
zero native special-corner records. The following 44-case run also exercises
settled 2× pace on all four native profiles and confirms that a pace change
invalidates the previous cap until a fresh capture is acknowledged. It retains
the same bounds and limitations. The complete-output SHA-256 checks also confirm
that the seven previously supported native outputs remain byte-identical to
0.37.0; the new 8abf9be8 combined output is
`d2d221f76fb7447d2801e4b86f9f7ca953e8a6c3bad8dd281ee0fd2370ae82e0`.

The subsequent correction passed 10 isolated actual-native cases and an
84-case production forward run, including all four online native profiles. It
demonstrates native fallback on straight/short/compressed tails, positive advice
for sharp and gradual measured bends, unchanged native zero/nonfinite requests,
lease expiry, Stop, speed receipt binding, and capture-only operation that never
publishes a target. A later 22-case guard run also rejected zero/negative publisher
results. Counts overlap and must not be summed.

The original independent stall witness is retained under
`work-forward-stall/released-v038`: an admitted straight eight-unit physical
window repeatedly produced an optional zero target in the released 0.38 code.
The fresh live diagnostic report numbered 29 instead had unknown forward state
and zero samples, so that independent witness does not establish the cause of
that reported live slowdown. No live fix is claimed from these controlled cases.

There is no observed live join/race/return result, full real-race projection,
live physical braking calibration or live online cornering/pacing outcome.
Free-roam autonomous travel needs separate route and projection proof. This
patch does not enable travel, no-clip, grip, downforce or unattended streaming.
