# Drag native input handoff, 93af6ccb

## Diagnosis

The released v0.17 path calls Player::AutoPilotOn (0x5fae20) directly. This replaces the driver with3 but does not change current input mode Player+0x22c or requested input mode Player+0x230. Exact native Player::Update (0x602650, Wasm8414) calls 0x5f3010 when current input mode3 is inconsistent with a non-2 driver. That function replaces the just-acquired driver3 with manual drag driver2. This reproduces the user's short driver3/owned sample followed by driver2/unowned without any heartbeat failure.

A SetInputMode4-only repair is insufficient. Player::Update invokes native drag-mode selection0x5f39d0 (Wasm19197) after that driver check. It writes requested mode3 when the player is moving in the relevant drag context. Native input reconciliation0x5ea650 (Wasm4344) derives current mode from requested mode and invokes SetInputMode0x605c70 (Wasm14982). Requested4 thus becomes3 and native AI is relinquished. Function0x600f30 is a queued relocation handler, not input reconciliation.

The normal native UI/debug request path at0x603327 cycles requested2→4→5→2. Mode4 is the game's native AutoPilot input mode. SetInputMode unregisters old callback bindings; mode4 invokes AutoPilotOn. Leaving mode4 invokes AutoPilotOff and registers the destination mode. Calling On/Off separately does not provide this full input lifecycle.

## Narrow repair

The new isolated `drag-input-handoff-v018` candidate changes only modern reviewed78e2bb69 and93af6ccb profiles:

- Acquire only an ordinary local player record, ready Drag car with full physics1, a live permission/heartbeat lease, native manual driver1 or2, and current/requested manual input modes2/3.
- Save requested2/3 in existing reserved mailbox B+96, mark a native mode lease at B+92, request4 once, and call native SetInputMode4. Existing post-On physics1 correction and opponent goal2 selection remain in place.
- Prefix only native drag manual-mode selection0x5f39d0. It returns early solely for its exact Player-update caller return0x602ab4 and independently verified owned local player/car/race/driver, mode4/request4, physics1, ordinary record, active race4, runtime permission, Drag opt-in, stable even sequence and fresh heartbeat. Network guards remain unless explicitly allowed. The guard performs no steering, throttle, goal, skill, driver-kind or input-mode writes. It only performs the native no-argument return when qualified.
- Do not alter native input reconciliation or the complete Player update. A real native mode/request change ends the lease and latches reacquisition until an explicit OFF cycle, rather than fighting the game.
- Handback restores the saved request only if it is still our4. A newer request is preserved. SetInputMode exits4 via original Off exactly once. A newer current mode and its controller are likewise preserved. The actual native4→5 path is exercised: its Off→On creates a new native driver3; extension invalidation does not call Off again or replace that driver. Existing skill compare-and-restore remains unchanged.
- Recognize native manual driver2 through local-player/manual input-mode checks even while Drag flags are transitioning. A foreign/scripted driver is not reported as a completed manual handback.
- Reserve B+92..99 in first-handshake occupancy checks. No other mailbox gap is consumed.

The repair is gated on the actual Drag byte0x89e7d8. Force-Drag-only (0x890108 set with that byte clear) is left on the prior native path and is not covered by this repair or its live-log diagnosis. No debug-mode expansion was made.

This deliberately does not acquire during countdown/race phase3. It still waits for phase4/GO and does not establish optimal launch RPM, launch timing or race-winning performance.

## Verification and limits

`probe-native-input.cjs` reads SHA-256-pinned current game code at runtime. It executes the exact original Player::Update, native drag selection, input reconciliation, SetInputMode, On, Off and both manual-driver-switch bodies. Production-authored guard bytes are grafted onto the exact native drag selection body. Numeric mapping to the original named routines is checked by `mapping.json`, allowing only enumerated host dispatch/helper relocations.

The probe reproduces both the legacy loss and the failure of mode4 without retention. The guarded mode4 path survives180 full Player updates plus native reconciliations. A second180-cycle test connects the actual production bridge to the native lifecycle bodies, observes actual skill9 retained, and confirms no repeated driver reconstruction. Native manual handback reaches driver2/physics1/current3/request3. OFF, opt-out, pause, requested manual/special modes, native driver replacement, native mode replacement and heartbeat expiry restore saved skill4. An intervening skill6 is neither forced back to9 nor overwritten on release.33 rejected guard cases have byte-exact native fallback; other caller sites retain the original behavior. Foreign/scripted modes cannot be acquired.

The fixture controls allocator/physics-switch and callback-registration leaves and unrelated subsystems. It does not execute a complete visual game, simulate the driver AI's entire action-update graph, or prove a race finish. Opponent goal2 selection is separately tested by the existing exact native initializer suites; this Player-update replay proves ownership/input retention and does not claim full goal2 behavioral retention across all recovery/events. Goal/null/recovery pointers are explicitly unchanged by the new guard. Live driving validation remains necessary.

No original game binary, disassembly or extracted function should be included in an extension release. The shipped patch contains authored guard/bridge instructions only and fails closed on an unknown module hash.
