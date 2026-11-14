# Hosted race loop candidate — November 10, 2026

This isolated candidate is frozen in `verification/autonomy-reviewed-v03812.json` (SHA256 `25c8f12721121d6a6f816f50c86196481957d22bf69cca9d2b90c8198ec46ebc`). It retains version .11 labels intentionally. It has not been released, packaged, installed, or live tested. Root owns integration and Desktop delivery.

The baseline is corrected `work-paced-v03811`, source lock `12434dfbc61d4a07d0950abc4310e466ac84a20a7e07844dc090e136c7f87cc5`. Only existing runtime files `page.js` and `manifest.json` differ. Four runtime files are added: `autonomy-road.js`, `autonomy-drive.js`, `autonomy-hosted.js`, and `autonomy-loop.js`. The remaining55 original runtime hashes are exact. No native patch is added; no AI, Street X, Drag, protection, profile schema, HUD, collision, or tuner runtime is edited.

## Behavior and integration

The collapsed Selected race loop lets the user choose1–16 native city start locations. It waits for exact native manual handback, plans through resident directional road geometry, follows with the existing page keyboard publisher, brakes, requires measured stationary arrival for1.5 seconds, waits for a fresh matching public host, and sends one typed JOIN4. The game owns joining, starting the race and returning. Existing AI.Controller.update is still the only race AI publisher. AI is requested only for the current owned tuple's active race. After native return the loop rotates to the next chosen location and repeats, respecting a late-acceptance quarantine.

No host means indefinite waiting by default. Explicit Wait then next start permits rotation after the selected duration. Solo fallback is not exposed and refuses unsupported adapters. No Enter, hosting, leave, quit, travel/teleport, or native behavior allocation is used.

Exact current943 raw module only: `c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391`. `forward-native-config.js` must precede all four modules and `page.js` must follow them. Road and Hosted modules depend on the selected exact native profile, committed-page bitmap695752272 and activated guest-window descriptor695785040. Low guest addresses retain the0x28000000 ceiling; the second window is accepted only at exact activated0x50000000..0x7ffe0000. The host-runtime gap is never accepted as guest data. Every consumed topology byte is rechecked during travel; car movement and the clock are excluded from static-topology comparison.

Integrate the four new modules and the manifest order. Merge page changes onto root's final .12 page, preserving its separate city/circuit work. Page hooks cover module replacement, tick, lifecycle suspension, manual/F7/F9, profiles and tuner. Travel publication belongs in the final exclusive input branch: the existing manual-Drag `else release()` must not clear the bot's keys later in the same tick. Legacy power/grip are temporarily restored and NOS refill paused during travel without modifying saved values. Session selections survive an unavailable catalog read, but a coherent removed location or new game module clears it. Saved profiles never contain selections or loop state.

Start turns off the runtime all-mode/race-only request, releases input, hides the tools panel, then waits for actual handback. It never changes a saved named profile. The existing top Manual/F7 and Stop/F9 controls remain available; the loop also has Stop / take control. Physical driving input, focus/visibility loss, menus, profile loading, tuner activity, identity/geometry loss or native uncertainty stop the loop and release keys. Camera preference remains selected when travel starts; manual takeover retains its existing Camera-off behavior.

## Exact JOIN proof and limits

Current native lobby records are72 bytes, heard stamp at64; older source's64-byte lobby struct must not be copied. The first observed native advert does not authorize JOIN: a strictly advancing native heard stamp and advancing frame are required. Private and class-restricted offers are excluded conservatively. Catalog records are checked against the canonical race table and complete trigger chain, including marker/box/stage/heat/type consistency. Dispatch repeats the entire exact offer/destination/manual/stationary/permission check and requires public session.proc.memory identity.

The sole public call is `session.input.lobby(4, host, lobby, eventHash)`. Source API encoding preserves all fields; exact current native queue23640 forwards them to mp_act22831. A complete pinned current22831 recompiled with dependency stubs proves action4 reaches mp_join22840, never mp_open22841. Positive-control NEW5 does reach hosting. Missing adverts still cannot turn JOIN4 into hosting.

This path is the game's invite-style dispatcher. Native action4 synthesizes the requested tuple and may continue after an advert disappears. It does not revalidate the live advert at native consumption. A host may reject it or accept late. An unobserved JOIN stops after12 seconds without retry;35-second quarantine survives Stop/restart. No host acceptance or full real travel→join→race→return test has been observed. Do not describe this as native use-time host-lock validation or a live-verified autonomous driver.

The native function tests instantiate only the isolated function with explicit dependency stubs, not a full game. Their normalized function comparison retains the whole native body, all guest/host operands and control flow except declared function/call-index relocation. No native game body is written to a fixture file.

## Verification

`node tools/verify-autonomy-v03812.cjs` produced the immutable receipt and `verification/autonomy-regression-v03812.tap`:209/209 tests,10 files. This covers actual page.js with real Drive/Loop and controlled reader/road adapters, actual sparse shared-memory Road/Hosted readers, the complete isolated current native JOIN dispatcher, manual handback, arrival dwell, host loss, one JOIN/no retries, owned race, native-return rotation, all takeover/lifecycle gates, profile/reload behavior, Street X/Drag/Drift race-only preservation, engine protection, online controls, HUD and Camera. The final receipt binds all61 runtime files and all10 test files.

Earlier reader receipt `verification/hosted-reader-native-v03812.json` SHA256 `ecadc83c0d7eff92960ea08239b7e802bbeb58abbc99c69227a7311fe0753354` remains preserved. It predates the final extra uncommitted-table test; final source/test hashes are in the newer freeze. Do not overwrite either receipt. The final proof additionally checks exact current catalog metadata and sweep publication.

No auto-Outrun capability is implemented or enabled by this freeze. It is separate work and must not delay or silently alter this reviewed hosted loop.
