# Separate online traffic no-clip

Source: `online-traffic-v014`, based on shipped `combined-v013`. No live action or browser testing. Preserve released archives. A separate opt-in adds local-player/NPC-traffic filtering only in exact-reviewed 78e2bb69 online free roam. Existing solo car no-clip, walls, native Ghost choices and all other native contacts retain their existing behavior.

## Frozen feature delta

Copy these files, relative to source:
- `extension/cars.js`
- `extension/latest-profile.js`
- `tools/build-online-traffic.cjs`
- `tools/build-latest-profile.cjs`
- `tools/cars-online.wat`
- `tools/car-online-latest-body.json`
- `tools/car-online-latest-config.json`
- `tools/car-latest-body.json`
- `tools/car-latest-config.json`
- `tools/contact-latest-body.json`
- `tests/cars-online.wasm`
- `tests/cars-latest.wasm`
- `tests/latest-contact-native.test.cjs`

No source changes were made to page.js, manifest.json, diagnostics.js, current-profile.js, the original offline cars.wat, or any released ZIP. If integration independently changed latest-profile hooks, merge only `cars`, `wall.bridge` and `capabilities.onlineTraffic` rather than replacing its other payloads. The latest-profile builder's only change is its car/contact assembly and traffic capability/metadata.

Reproduce the new payload:
`node tools/build-online-traffic.cjs && node tools/build-latest-profile.cjs`

Latest car payload: 978 bytes. Combined car/wall prefix: 1930 bytes. Local signature stays 19 locals, with native local1 preserved. Only the already-patched contact wrapper22470 is changed additionally; original native instructions remain intact. Helper22758 checks native online free roam. New read-only helper22759, `roam_game_slot_kind(car, 0)`, identifies other players. All guest/runtime addresses remain inside the exact-build profile.

## Page integration contract

1. Add `prefs.traffic:false` (or equivalently named property). Never load this boolean from session storage. A numeric/old stored truthy value must not enable it.
2. New independent checkbox, suggested id `traffic`: **Online traffic no-clip**. Show a separate status id `traffic-state`, default `OFF · traffic only · online free roam`.
3. Pass `onlineTraffic:prefs.traffic` to the existing `cars.update` call. `enabled:prefs.cars` continues to mean solo car no-clip.
4. The result provides `soloReason` for the solo car row, `trafficReason` for the online traffic row, `requested` for any armed filter, `onlineTraffic` for the armed online mode, and `hits` for actually skipped contacts in the current mode. Use separate reason fields to avoid making the solo switch look active online.
5. Disable the traffic control if the exact module profile has no `capabilities.onlineTraffic`. Only latest78e2bb69 has it. Older exact profiles keep solo functionality and refuse the online traffic flag.
6. Checkbox off calls `cars.stop()` immediately; the next tick can rearm a separately enabled solo mode. F9 clears both car switches. Existing suspend, blur, visibility, dyno and session-disposal calls to `cars.stop()` clear both modes. Add the new checkbox to enabled counts and status titles.
7. Change handler text should explain: only NPC traffic in online free roam, not racers or other players; start off after reload. Native Ghost settings remain unchanged. Optional online/LAN tools permission does not implicitly enable this switch, and it never opens Online/LAN races.
8. Add a diagnostic boolean such as `onlineTrafficRequested` sourced from `carState.onlineTraffic`, to the logger's explicit allowlist. Existing carRequested/carHits continue reporting the active filter and observed contact count. Add `traffic` to diagnosticTools()'s preference snapshot if desired, using that method's established allowlist.
9. Documentation must distinguish the two car switches. The existing statement “both collision filters stay solo-only” needs updating: walls and solo car no-clip remain solo-only; the separate online traffic switch works only in online free roam and rejects races/outruns/LAN.
10. Add UI lifecycle tests for new checkbox default-off, no storage restoration, capability gate, F9 clear, independent solo/online toggles and paused/armed/confirmed status text. Run full integration checks and package manifest validation.

## Evidence and safety scope

Exact latest SHA-256: df7b930bb293ffdf975f0735d93e0797d51bd137d0cbeabcaff87fc5a693c759.

- The existing source documents native driver type4 as traffic, type3 as racer, type1 as local human, type0 as replicated player cars. Actual latest make_inert22652 retains the native call that sets replicated cars' driver and physics mode to0. It structurally matches the old function after normalized call/host relocation.
- The latest native player-slot helper22759 is independently extracted from the hash-checked module and executed in tests. It scans all64 native player slots, recognizes active status3 and returns -1 only when no active player owns that car. A null second argument ensures it does not write a name pointer. Friend/crew/hidden cases remain excluded. It is read-only in the filter.
- The filter requires native traffic driver4 AND no native player-slot match, not merely a traffic-looking car model. A player choosing a traffic vehicle remains excluded. The current local car is identified by player pointer and reciprocal car/body identity, independent of its human/AI driver.
- The native guard requires explicit mode flag1 at car mailbox+36, exact native online-here true, raceType0, normal driving state4, flow6, one local player, fresh heartbeat, intact command sequence and reciprocal car/body and witness identities.
- Every Online/LAN guest network flag stays blocked; outrun7 and every other race type stay blocked. It never modifies online flags, native Ghost settings, player slot records, other cars' drivers, shared collision flags or map geometry.
- The 40-byte mailbox already includes+36, so no new allocation is claimed. Cold initialization already guards that word. Exclusive reservation remains unproven as in the existing extension.

## Verification and limits

Focused command:
`node --test tests/latest-contact-native.test.cjs tests/cars*.test.cjs`

38 tests pass, including the actual production-patched wrapper plus actual native online/player lookup helpers. Tests cover all64 active player slots with forged driver4, hidden/friend/crew variants, traffic/local-AI permutations, invalid requests, rejected online race types, offline transitions, other drivers, walls/floors/props, and stop restoration. These are controlled-memory native harnesses, not real traffic driving or network synchronization tests.

No live online collision, peer synchronization, camera behavior or server-rule acceptance is verified. Traffic remains simulated by the game; this filter affects local contact resolution. Do not imply it bypasses server restrictions or cures the separate reported freezes. Existing native Ghost behavior is preserved on every fallback, so any player pass-through chosen in the game's own Ghost menu remains the game's decision.
