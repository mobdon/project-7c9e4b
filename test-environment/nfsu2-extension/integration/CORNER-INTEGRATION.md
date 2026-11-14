# Corner hook integration

Owner: improve_ai_cornering. Selective integration is applied in this combined root. Existing dyno BRIDGE64-local guard, WALL and automatic handback checks are preserved.

Reproduction steps (already applied; do not rerun the integration script on the current file):

1. Run `node integration/integrate-corner.cjs` from this combined root. The exact-anchor script fails before writing if anything changed unexpectedly. It preserves all existing handback acknowledgement checks, bridge/dyno bytes and wall hook.
2. Run `node tools/build-corner-hook.cjs` to embed the new guards using current bridge MAGIC. `--no-embed` only regenerates JSON/WAT when ai.js is owned elsewhere.
3. Update existing patcher tests to expect four changed functions:4653,21213,21262,22720. Dyno is inside the existing bridge, not an additional function.
4. Run all tests and exact full module compilation.

Hook: Wasm function4653 / code index4616, sub_005d46a0. Preserves original15 locals/instructions; adds9i32+5f64 locals (29total), prelude guard, postlude ST0 multiplier. Uses36bytes at0xd0d200, no overlap with walls0xd0d180 or dyno0xd0d300.

API: update({cornerAssist:false,cornerFactor:0.8}), strict boolean, bounded.60–.95. Writes only when mode2 AND native race type0, no drag. Records/diagnostics clear on disable/change. Status: cornerRequested boolean, cornerFactor fraction, cornerApplied fraction|null, cornerHits count. A hit means the native corner planner ran, not that driving improved.

Native category source: pinned6f4f1e4e runtime/roam_game.c:140, u32at0x89e7b0:0free roam,1race,7outrun,8DynoShop. Include actual type in transition key to catch outrun transitions with reused pointers/HUD. Key also includes effective corner enabled/factor; all changes force OFF, confirmed manual/ownershipclear/failedlatchclear/OFFheartbeat, then ON. Existing verification checks must remain.

Use existing aiPace/paceFactor as free-roam-only with explicit label; new racePace=false/racePaceFactor=1 for independent race/outrun opt-in. Drag/dyno/unknown pace neutral. Do not infer native category from HUD alone.

Source analysis: ../../research/corner-anticipation/README.md. No gameplay claim.80% is a test factor; live braking/line/pace interaction/reset still needs checking. Do not ship original game Wasm/executable or native extracted test code in extension archive.
