# Authored full-tuner frame protocol v1

Isolated v018 candidate, exact 93af6ccb only. This prefix does not call any native helper, rebuild player physics, write a record preset, commit all five presets, or save a file. Stage/Restore affect only the current setup and selected visit slot. The page must present these as staged until the next native Test Run/reload.

## Composition

Run `node tools/build-full-tuner-bridge.cjs`. It reads `extension/next-profile.js` only and writes `tools/full-tuner-prefix.json`, `tests/full-tuner-bridge.wasm`, and the authored test WAT. The JSON contains `newheader`, `totalLocals` (170), and `code` excluding the function's final end. Decode the old bridge local header, then compose:

    newheader + code + oldBridge.slice(oldLocalHeaderEnd)

All original 64 local types and indices remain unchanged, including v128. The prefix appends 106 i32 locals. It has no function/global references or calls; no import-index rebasing is needed. Use only with the exact next-profile pin. It cannot itself authenticate the complete game binary.

The entry gate is guest return address 0x581475, identical to the existing bridge. Commands outside 16..19 are untouched. A handled full command publishes B+36 acknowledgment, so the existing dyno body skips its seq==ack branch. The original AI body should still run. Do not wrap the whole old bridge in a full-command early return.

## Mailbox and ownership

Diagnostic extension (same ABI): B+104 is a fixed snapshot-rejection guard ID and B+108 is an associated count or source-pair ID. Both are reset for every handled request before validation and published before the existing atomic acknowledgment. They are never written through PB, which may itself be invalid. The page clears both before publishing to remain compatible with a prefix that supplies only status8. The details never contain pointers or setup bytes.

B=0xd0d300 retains legacy magic 0x384e5944 and existing fields: sequence +4, command +8, enabled/cancel +12, acknowledgment +36, status +40. Fields +4,+12,+36 use atomic access in the prefix. +96 supplies PB, +100 is the first-valid-PB latch. Do not overwrite +100 once initialized or share this protocol with a second writer.

The page allocates exactly 256 WebAssembly pages with memory.grow and uses the returned old page count *65536 as PB. Require old end >=1GiB, refresh all typed views after growth, and initialize PB header before publishing a command. The prefix checks PB>=1GiB, 64KiB alignment, widened PB+16MiB<=memory.size, header magic/version/capacity, and fixed latch. It does not itself execute memory.grow or prove allocation provenance; that ownership guarantee is the trusted page allocator's responsibility. Bounds/header validation is not protection from an arbitrary hostile writer to shared memory.

PB header:

- +0 magic 0x3154464e, +4 version1, +8 capacity0x1000000.
- +16 record, +20 tune, +24 mode, +28 parts, +32 ride.
- +36 carType, +40 stock base, +44 rules pointer, +48 rule count.
- +52 extra-array pointer, +56 extra count, +60 curve pointer, +64 curve float count.
- +68 save-readiness (other four visit slots equal record slots); +72 snapshot bytes used.
- +120 descriptor count6; +128 six descriptors, each {sourceAddress,destinationOffset,length,flags}, four u32s. Flags currently1 means copied input.
- +256 expected/current41; +304 expected/selected-visit41; +352 expected/parts148.
- +512 candidate-current41; +560 candidate-selected-visit41.
- +624 expected/full-record205; +832 full-visit205.
- Snapshot data starts +4096. Maximum fixed/count-bounded payload is below16MiB.

Every successful command refreshes identities at +16..32 and current/visit/parts/record/fullvisit/readiness. Capture additionally refreshes capture metadata and descriptors. Failed commands do not publish usable capture results. Status must be checked before reading the response. Responses overwrite consumed expected buffers only on success.

## Writer synchronization

One page writer only. Wait for the prior acknowledgment, publish an odd sequence while preparing request fields, then atomically publish a nonzero even sequence. Keep command and payload stable until acknowledgment. Odd/zero/duplicate sequences are ignored. Read status/results only after the matching acquire acknowledgment. Cancellation sets +12 to0; a final check immediately before Stage/Restore stores is the commit point. A cancellation arriving after that point cannot undo the completed transaction; use explicit Restore. Capture rechecks sequence/cancel after its bulk copies before publishing success.

Candidates are loaded into 82 private Wasm locals and validated before the final sequence check, so the store phase never rereads candidate bytes. All destination validation and stale comparisons precede any setup mutation. This is a bounded game-thread transaction, not hardware-atomic across82bytes or protection against an out-of-protocol concurrent writer.

## Commands

16 Capture: uses solo PerformanceTuning_MAIN guards, valid record/tune/car/player relationships, mode0..4, tune=ride+0x384, parts=ride+0x2f0 and physics=ride+0x40. Requires carType<46, tune recursion depth0, gear count1..6, and finite100<=idle<max<30000. Reads six exact ranges sequentially:

1. image0x400000 length0x900000;
2. ride0x8f0;
3. stock46*0x890 at [0x8a1ccc];
4. [0x86b340], [0x86b344]*24 (count<=256);
5. [0x8383f8], [0x8383fc]*0x17c (count<=256);
6. actual curve pointer ride+0x57c, float count ride+0x56c, count2..512.

Zero rule/extra counts allow zero pointers. Nonempty guest source ranges must be >=64KiB and end<=0x28000000 and actual memory size. Dynamic ranges2..6 must be pairwise disjoint except the curve may be wholly contained in the ride, never overlapping its148 parts bytes; overlap with image is permitted because a global source may reside there. Each extra record has childcount<=4 at+8. The68 pointers at0x837b90 must be zero or point to a complete child at record+0x0c+j*0x5c with j<childcount, and that child's first dword selector must equal the lookup index. Record-stride and child-index arithmetic are bounded; interior arbitrary pointers and record-start pointers are rejected. No substitute curve or stock data is synthesized.

17 Stage and18 Restore: same copy machinery, distinct command identity. Compare exact record/tune/mode/parts/ride identities plus current41, selected visit41, parts148 and all205 record bytes. Both candidates must be0..200. Copy only candidate-current41 to tune+20 and candidate-visit41 to selected visit slot. Separate snapshots allow restoration when the original current and visit bytes differed. The other four visit slots are not expected/compared by this command; they remain untouched and readiness is recomputed afterward. No native eligibility/normalization is performed here: the page must supply the accepted candidate from its validated isolated preview and maintain that authorization boundary.

19 Read/save-readiness: guarded reads only; no preset changes. Readiness does not mean saved and does not initiate a save. It only indicates that normal all-five native commit would not introduce other pending visit-slot changes relative to the current record.

Destination guards additionally require ride>=0xd10000, no ride overlap with record, player/car, or CPU. These deliberate restrictions keep target writes away from image/mailbox/UI globals. If a real supported layout violates them, investigate and review rather than weakening them dynamically.

## Status and tests

0 success;1 canceled/sequence changed;2 state/layout/physical guard;3 stale expected lease;4 candidate outside0..200;8 buffer/source bounds or alias. The PB latch may initialize before a later state guard fails, but no setup/visit/record bytes are changed on failure.

Run `node --test tests/full-tuner-bridge.test.cjs`. The isolated module imports only memory. Tests cover all modes, exact six-range capture, full curve backing, independent restore snapshots, unchanged other presets/record/reset canaries, 148th parts byte, all expected identities and bytes, invalid candidates, cancellation, source/payload bounds and overlap, malformed physical guards, zero-length optional arrays, unique buffer latch, memory growth, odd/duplicate sequences, foreign return and old commands. No live game or user save is accessed.
