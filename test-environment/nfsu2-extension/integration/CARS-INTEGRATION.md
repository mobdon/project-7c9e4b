# Car no-clip: isolated current-build implementation

Status: **isolated inputs ready for integration, not packaged, no live-game validation**. The user authorized continued work after the v0.11 crash report. That crash remains unresolved and must be disclosed; do not claim live verification.

## Inputs ready for integration

- `extension/cars.js`: independent car controller, default off, no driver-type or collision-flag writes.
- `tools/build-cars.cjs`: authored current-build prefix generator.
- `tools/car-current-body.json`: 871-byte authored prefix.
- `tools/car-current-config.json`: exact target/helper/online address metadata, mailbox base/size/magic.
- `tools/compose-contact-prefixes.cjs`: verifies identical 19-local signatures and composes authored car and wall prefix instruction streams.
- `tools/contact-current-body.json`: 1823-byte combined prefix, car filter then existing wall filter. All original native wrapper instructions must follow unchanged.
- `tests/cars*.test.cjs`: focused tests, including native constructors and actual current wrapper/online helper.

Do not distribute tools, tests, research, native extracts or game modules. Release may contain only the authored extension script, its profile bytes and normal documentation.

## Proposed integration

1. Add `{base:0xd0d1c0,bytes:40,marker:0,magic:0x3143414e}` to the main-loop cold mailbox validation. Do not shift the existing dyno index accidentally: resolve the dyno record by its base/name, or append the car region. Do not add an every-frame ancillary guard that can block native AI handback.
2. Build current profile with the contact wrapper's bridge set to `contact-current-body.json`. Preserve target22393, native function22430, original local1 and 19 total locals. Leave the complete original wrapper instruction suffix unchanged. Both prefixes call the existing current helper22718.
3. Expose the `car-current-config.json` metadata as `profile.cars` and set `capabilities.cars:true` for this exact current hash only. Legacy builds should explicitly have `cars:false` or no capability. There is no legacy car prefix.
4. Load `cars.js` before `page.js` in the manifest. Create its Controller only for a verified module with the cars capability, using `(memory,true,moduleProfile.cars)`.
5. Add an independent `prefs.cars:false` and checkbox `Car no-clip` with detail `Other cars only · solo`. Do not restore it from session storage. Its native status should distinguish armed from actual contacts skipped.
6. Run `cars.update({enabled:prefs.cars,safe,state:s})` beside the wall controller. Include `cars.stop()` on checkbox off, F9/stop, suspend/focus/visibility, dyno activity, old-session disposal and game exit/trap. Clear its checkbox on F9. Disable unsupported-build controls. No need to force wall switch off or change it.
7. Refresh user documentation: car no-clip is independent of wall pass-through, solo only, resets after reload, supports manual/AI local drivers and confirmed car-body pairs. Ground/walls/props keep their existing contact path unless the separate wall option is enabled. Turn off only once clear of another car.
8. Rerun all aggregate tests, updated current-profile ownership tests and UI/session lifecycle tests against integrated final files. Verify original module preservation and package content. No release claim without these checks and clear disclosure that live driving remains untested.

## Verified scope

The filter identifies the current local player, obtains their car and collision body, and checks reciprocal body+0x130/car+0x3c identity. It matches only another native type0 car body with reciprocal identity, rejects self-pairs and contacts between other cars, and preserves floor/wall/prop paths. It does not use either car's driver type, so local AI driving does not produce the native Ghost classifier's both-cars-AI ambiguity.

The early return copies the native wrapper's guest EIP/ESP contract and existing pair-pass bookkeeping. Explicit selection, exact build hash, initialized AI loop handshake, fresh heartbeat, even sequence numbers, current player/race/car identity, one local player and offline-only guards are required.

## Evidence and limits

Current module: revision2f0ddd3b, SHA-2565e33ad2cb4c4cc6893dee7cbd4d6e9bfb0f59a349d218fddbb5e3331ca69bc34.

Actual current wrapper22430 and online helper22718 execute in the focused harness. The original ghost and resolver trampoline dependencies are controlled stubs, so these tests establish hook contract and fallback preservation, not full collision physics.

Actual native car constructor14814 passes type0 to DynamicCollisionBody. Actual base constructor19342 writes its type argument at body+0x11. These constructors and accessor14030 are byte-identical between the prior exact and current modules. Native current ghost helper22747 independently checks the same body/car reciprocity.

The proposed 40-byte mailbox occupies d0d1c0..d0d1e7, inside the previously reviewed scratch range but disjoint from every existing extension mailbox. Independent scalar-reference scan finds no native address references there. Known module heaps start at01000000, guest virtual allocations at08000000, minimap commit occupies d0d000+128 and its bounded seat fields remain below the gap. **There is no proven exclusive allocation/reservation, no live overlap trace, and no guarantee against unknown computed writes.** Cold zero/ownership guards are required and this limitation must not be represented as resolved.
