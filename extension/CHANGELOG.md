# 0.43.0-d739e631-draft.1 candidate

Targets revision d739e631. Raw module and adapter chain identities are pinned. Native gameplay and live-session validation remain pending.

Synthetic near miss provides Award once and Loop synthetic near misses. The loop tops up NOS through confirmed synthetic awards, one outstanding request at a time. It waits at full and resumes after consumption. F7/F9 stops the loop. The separate unused direct-refill control and its saved preference are removed; the native award routine, normal game NOS use, earned credit and NOS telemetry are preserved.

The material below is retained historical release documentation. Its feature and validation statements apply to the named older builds.

---

# 0.42.9-d396-draft.1

- Adds the exact V10 adapter chain and d396 profile to an uninstalled draft.
- Preserves unknown-build, byte-hash, module-identity and worker guards.
- Separates compiled adapter availability from pending feature/runtime qualification.

## Historical changelog

# Changelog

## 0.42.8 draft — synthetic near-miss requests and optional NOS top-up

Adds a manual synthetic near-miss control with exact module/session ownership, one outstanding request, signed observed deltas, event-specific confirmation and cancellation without automatic retries. Automatic NOS refill stays disabled. Source and native integration checks are separate from installation and live verification; historical flag receipts remain pinned to their original experiments.

Adds a session-only Keep NOS topped up switch using synthetic awards. It waits at full, resumes after consumption and allows one request at a time with a 250 ms confirmation cooldown. It accounts for active NOS elapsed time rather than treating raw stored credit as the live level. Unknown outcomes, ownership changes and style awards without positive observed NOS stop the loop. F7/F9 disarms it; focus and permission loss pause and cancel pending work. The retired direct refill API remains disabled.

The synthetic award has no speed threshold. Native command ownership is deferred until initialized driving state; switching cars withdraws an unclaimed request, and restarting a session cannot reuse the previous bridge. Native CPU and guest stack state are preserved around the original award call.

Fixes the offline attribution counterexample: a different consumed event cannot be acknowledged as the requested synthetic event. Recovery abandons an obsolete witness so a subsequent distinct request is usable. Lost native ownership produces an unverified outcome and closes that witness. Whole-tick NOS changes remain visible and are not attributed entirely to one near miss.

## 0.42.7 — automatic NOS refill disabled pending integration

Disables the extension's automatic NOS refill at the page and direct Engine API while near-miss integration is tested offline. The control remains unavailable even with saved selections, restored profiles or online permission. Normal game-earned NOS and native NOS use remain available. No production near-miss award generation is enabled.

## 0.42.6 — direct worker loading and scoped 60946132 support

Adds the exact reviewed game build **60946132**. Its scoped native port covers the existing AI bridge, pace/corner hooks, rails, Drag handoff/protection, owned skill and paired catch-up. Online still requires the separate explicit permission. Stop, manual takeover, stale ownership and permission withdrawal retain their native guards.

The production page now supplies a verified compiled module through its existing game-worker startup observer. It leaves WebAssembly.compileStreaming unchanged. Per-worker message order, immediate port transfers, original shared-memory identity and primary/secondary worker consistency are checked offline. A timed-out, unsupported or failed preparation retains the original game module with tools disabled. Memory-port startup stays unverified and has no page memory tools.

The replacement is authorized by freshly read build metadata, an import/export interface check and complete source/output hashes. An opaque original compiled module cannot be hashed through this interface; matching its import/export names is an eligibility check, not proof of its bytes. Only the independently compiled replacement receives a verified tool profile.

On 60946132, **the tuner, leased forward geometry, per-target corner feedback, online car-category controls, race capture and destination travel are unavailable** pending their separate ports. Their implementations and previous build profiles remain included. The full 102c8d92 pipeline retains its exact prior output.

Current game guards, monitoring and report serialization are retained. A positive encoder result means serialization succeeded, including for reports containing observations. The offline checks do not establish multiplayer acceptance, account status or measured driving results.

The offline report check reproduced a selected-car-state observation from the actual NOS refill: one changed frame and observation flag 16 in controlled race and free-roam monitor contexts. Untouched baselines had zero changed frames and zero flags. The observed fields survived local encoding; no report was sent. This uses bounded native fixtures and synthetic session state, not a full game run. A different loader does not establish a report-free refill route.

The exact captured page check returned zero marks through updated startup and four fixture ticks; the frozen 0.42.5 startup produced API-wrapper mark 2. The fixture uses native-callable browser stand-ins, clean settings and default tool selections. Worker instance postMessage remains wrapped and is not selected by that captured check. Report markers and configuration remain unchanged. These page results do not cancel the separate native NOS observation.

Raw 60946132 SHA256: 81d2e32d7ee67bb93a8fafee4dbc17570f8d4980be238d7434e15c791904b945.
Scoped native output SHA256: 8efc4457e895e4992f56a0272f66718d3900901ff7fde95e760b7585fa6f9129.

## 0.42.5 — exact native corner-target feedback

Adds observed native target decisions to the road-race settings and diagnostics on verified game build **102c8d92**. A sample records the actual target before and after the existing corner-limit hook, requested/effective limit, decision outcome, guard reasons, ownership and sample age. These are **uncalibrated native target units**, not mph or m/s.

- The menu can distinguish a geometry reduction, cached reduction, an already-lower native target, a rejected/unresolved guard and a changed publication. This observes the existing driver; it does not change pace, braking, steering, grip, shortcuts or race outcomes.
- Receipts use the game's existing worker registration channel under the site's current security policy. The extension consumes its reserved messages before the game registry sees them. Current primary and secondary workers are bound to their module, memory and session.
- Stop/manual takeover, setting changes, ownership/permission loss, stale samples and route changes clear current evidence. Tick and command-sequence boundaries reject queued records from a previous activation. Existing historical race logs migrate without losing their prior columns.
- The optional observer must match its complete expected binary hash and compile before it receives a capability. Any failure keeps the previously compiled driving, online, tuner and forward-lease module.

Native parity, receiver, loader, page and diagnostic tests passed offline. The actual current worker also delivered a native receipt in isolated Chrome under its current CSP. This is not a live race or a measured driving improvement. Transport samples at most once per 1,000 guest ticks; it is not a lossless record of every setter call.

**Other work remains isolated:** the opponent Drag margin for tracks 4211–4213 passed controlled native tests but needs a proven production control connection; the default-off Drift bend-target experiment sometimes lowers native throttle or increases handbrake and needs a live comparison; destination routing passed controlled topology/GPS checks but has unresolved native queue/allocation, route-installation and parking issues. None of those experiments is activated by this package. A complete hosted travel → join → race → return loop remains unverified.

Saved profiles, stream HUD, radar, Clean View, tuner, Street X limits, Drag engine protection, explicit online permission and Stop/manual takeover keep their existing implementations. The preset tuner remains restricted to solo Performance Tuning; this release does not enable an ECU bypass.

Raw game SHA256: `2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d`.
Observed native output SHA256: `6005ed0fe49b641542e9e2909cf38d10108959f2d2ed2ac74144866281ad8cfc`.

## 0.42.4 — clear rails and catch-up controls

This update fixes misleading assistance controls. It does not change the native driving, cornering, grip, power, shortcuts, tuning or network policy from 0.42.3.

- In a permitted rails road race or Street X, the assistance row says **Race pace · rails mode**. Catch-up strength is visibly inactive because paired grip/power assistance is not used there. Its selected value is retained for full physics and Drag.
- Switching rails off restores the strength control. Drag keeps its strength control and neutral paired pace. Recovery continues to show speed-only behavior, including when a stale physics sample still says rails is on.
- Messages, tooltips and accessible labels now distinguish pace targets from paired handling assistance. Online permission, Stop/manual takeover and saved driving preferences retain their existing behavior.

Validation: controlled page/mode regressions cover solo and online road races, Street X, Drag, recovery, permission changes, Stop and preserved settings. No live lap or measured grip/speed improvement is claimed. The existing nativeRoadTarget diagnostic is a sampled value in uncalibrated native units; it is not a per-setter explanation. A new per-setter receipt remains research and is not included.

The route-geometry and cache-lease changes from 0.42.3 remain unchanged. They still require the appropriate active AI, rails and Adaptive road-race speed settings for Circuit/Sprint/URL; live driving verification remains pending.

## 0.42.3 — route-based corner limits and rails diagnostics

Supports the verified game build **102c8d92**. This update targets intermittent road-race corner control while retaining the existing tuner, Runway 15 loop, saved profiles, streaming displays, Stop/manual takeover and online permission.

- **Corner limits:** enable **Adaptive road-race speed** with **Stay on rails** and an active owned AI driver for Circuit, Sprint and URL. Online also requires **Allow network tools**. The current-build route sampler now supplies a corner-speed limit even when native corner records are empty. Controlled tests cover sharp and gradual bends, including 75-degree and sharper turns; straight targets and lower native targets are preserved. The existing selected pace still applies. Adaptive remains session-only and starts off.
- **Sample renewal:** a validated corner limit can remain usable while the next route sample is captured. The native driver retains and rechecks its original route, ownership, permission and age constraints. Slow or missing sampling does not extend the limit's lifetime. Stop and context loss revoke the request. The new sampler does not operate in Drag, Drift, Street X, free roam, recovery or full physics.
- **Rails recovery:** pause, focus loss and stopped game frames no longer advance recovery timers. Losing the HUD or permission does not reset the same race's two-release allowance. This fixes a reproduced recovery defect; it does not explain every reported wall hit.
- **Diagnostics:** brief rails transitions are retained within existing log budgets. Corner plans survive the shorter sampling callbacks long enough to be logged. The export distinguishes a requested limit, a native cache acknowledgement, renewal and expiry; an acknowledgement is not a claim of continuous application or collision-free driving.

The optional native lease stage is enabled only after its exact output compiles. If it is absent or fails, the previously compiled driving and tuner module remains usable with this new geometry feature disabled. Current raw game hash: `2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d`. Lease-adapted output: `842f84cdac800f39a292b0d82c3182f4e225a3e1663541473bdc76f10528aae2`.

Validation is offline: controlled actual-native sampling and speed-setter execution, route and permission guards, page scheduling, loader fallbacks and mode-preservation checks. No live driven lap or complete hosted travel → JOIN → race → return has verified this release. These changes do not establish perfect cornering, improved race results or streaming autonomy. The tuner remains solo Performance Tuning only; the ECU clamp-bypass recipe is still unavailable on this build.

# Changelog

## 0.42.2 — race loop, preset tuner and mode corrections

Supports the verified game build **102c8d92**. Circuit, Sprint and Drag retain their existing driving requests and native paths. Saved profiles, streaming HUD layouts, Stop/manual takeover and explicit online permission are preserved.

- **Race loop:** adds the missing current-build hosted-lobby and race-start mappings. **Runway 15 only** selects the unique normal Runway 15 start, sets Wait here and disables general Drag discovery so the loop stays on that race. It waits for an open host and repeats after the game returns; an absent or ambiguous start is reported. Press Start selected loop after selecting it. In career free roam, enable Allow network tools, choose race locations or open Drag-lobby discovery, and press Start. The loop uses the existing travel, stationary wait, exact JOIN, race and return flow. A missing, stale, full, private or changed host cannot become a create-lobby request. Offline state-machine and native JOIN dispatch checks pass; a complete live trip still needs verification.
- **Street X:** the 1.15× rails ceiling now also applies when a saved Custom race pace is selected. With rails off and paired handling selected, both driver and handling request neutral 1.00× pace so their guards agree. The menu distinguishes the applied request from the saved selection. Street X rails/recovery parks conflicting legacy power/grip. Other race types retain their selected pace.
- **Drift:** parks saved legacy power/limiter overrides while the native Drift driver owns or releases the car. Native Drift steering, scoring and full-physics behavior are unchanged. This removes a conditional interference source; it is not a verified higher-score driving algorithm.
- **Free roam:** current-build contact preview now recognizes cars eligible for the enabled no-clip categories, instead of unnecessarily reducing pace for them. Native corner assist remains eligible during bounded city pace reductions for the same owned car and route. Walls and unproven contacts still count. Free roam retains full physics; this does not put the city driver on rails or establish perfect cornering.
- **Preset tuner:** restores Load settings, all 41 editable fields, private native Preview/search, Stage selected preset and Restore for the current build. Capture can initialize the native policy cache, avoiding a disabled-Load deadlock. Both verified memory windows retain bounds and committed-page checks; invalid snapshots still fail S42. The tuner requires the **solo Performance Tuning main screen**. Online tune writes and the separate ECU clamp-bypass recipe remain unavailable.

For tuning: enable the preset tuner, select the race preset in the game's solo Performance Tuning screen, Load settings, edit or Find tune, review Preview, then Stage selected preset. Use the game's Test Run to refresh driving physics and Save Profile to persist. Estimates are private native calculations, not measured lap times or confirmation of a disk save. Restore requires the same unchanged car, parts and preset.

The combined loader grants tuner capabilities only after both its native bridge and private evaluator compile. A failed optional tuner/city stage retains the last successfully compiled driving module. Current game metadata was rechecked before packaging. Unknown builds remain unsupported until independently verified.

Validation is offline: actual native snippets, private evaluator, controller/state-machine tests, actual-manifest compile/fallback tests and an isolated Chromium panel smoke check. No live race, live tuning session or complete hosted travel → JOIN → race → return was driven for this release. Three older UI/trace assertions also fail on the frozen 0.42.1 baseline; five additional historical tuner tests cannot run because their archived research fixture is absent. These limits are recorded in the workspace handoff rather than presented as passing.

Raw game SHA256: `2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d`. Combined online + city + tuner output: `3b11494b6824ced9888c5c4a9d3efc2ae86d75d0673544f0602d34a9bacabcfc`. Compared with 0.42.1, only native function 4653 (city corner eligibility) and function 21213's existing tuner prefix change.

## 0.42.1 — online native AI and car contacts

This update builds on the installed 0.42.0 package for exact game build 102c8d92. Enable **Online & diagnostics → Online / LAN opt-in → Allow network tools**, then select **Race-only automatic driver** for races or **Automatic driver** for free roam. Network permission starts off unless deliberately restored by a consent-bearing saved profile. F7 takes control; F9 stops tools and clears permission.

- Circuit, Sprint, URL and Street X can use Stay on rails online for the locally owned AI car. The existing 1.30× paired race pace and 1.15× Street X ceiling remain (Custom race pace still overrides Street X). Rails raises speed targets only; Catch-up strength does not supply grip on rails.
- Drag keeps its distinct opponent-driver/shift path and engine protection. Its paired handling boost uses neutral paired pace. Street X with rails off also uses neutral paired pace. Native catch-up inputs, generation/identity guards and explicit network permission still control application; no constant grip or winning claim is made.
- Skill-9 decisions work for the owned AI car online at the same seven reviewed decision sites. The player's saved skill marker is unchanged. The display is current eligibility, not a count of those decisions firing.
- Online car no-clip can select traffic, other players and NPC rivals, including verified current race and Outrun participants. The local contact filter, bounded rosters and per-category switches are retained. It does not change walls or props, and a local skipped contact does not prove a remote client skipped it.
- Current-build online free roam is recognized using the verified host tuple. Missing tuple memory makes this build unready instead of treating it as solo. Free roam keeps its existing native driver; the race rails pin is not enabled there.
- Recovery now counts rails releases across a driver rebuild, while resetting for an actual race/player/context change. It retains the existing two-release maximum. Diagnostics export rails request/current state, pin count, recovery state, online adapter/permission eligibility and skill-9 eligibility, with migration of prior logs.
- Online capabilities are granted only after the exact native online module compiles. Missing, wrong, throwing or invalid adapters retain the verified 0.42.0 solo module. Unsupported forward readers remain disabled rather than being advertised by the native transplant alone.

Offline native, controller, actual-manifest and page checks are recorded in the workspace handoff. These do not establish live online race results, server acceptance, cornering on every track or streaming autonomy. The broad older UI suite retains two pre-existing stale text/style assertions, reproduced on unchanged 0.42.0; behavioral checks pass.

The tuner/dyno/ECU panel, hosted travel/join loop and forward road reader are still unavailable on this exact game build. This update does not port those features. Saved profiles and HUD layouts are not rewritten.

Native pins: raw game SHA256 `2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d`; original 0.42 transplant `f113eb5dcd1292b6aac0e97837e653c9821b8a0a0efdfa221331d2fbf58fbe29`; adapted output `5bb985a5a7a77efabce919d7c3cd872c94466f3d66522449a106511413434fdf` (39,053,221 bytes). Nine native function bodies change; other bodies and non-code sections remain exact.

## 0.42.0 — game build 102c8d92, and "Stay on rails" for cleaner corners

- New game build: nfsu2.xyz now serves build 102c8d92. 0.41.0 did not recognise it, so the native AI driver would not load. 0.42.0 adds an exact profile for it (module SHA-256 2ba0b075…, 38,867,137 bytes).
- How the port was made: the reviewed ed8d3359 hook set (bridge, pace, corner and braking targets, walls and car contacts, Drag, Drift, nitrous, forward preview, route choice, catch-up, paired pace, skill 9) was replayed onto the new build as one pinned transform, `native-transplant-102c.js`. Every changed function keeps all of the new build's own instructions in order; only authored instructions are inserted, with function, type and host-address references moved to the new build's values. Input and output are pinned by SHA-256 (output f113eb5d…, 39,052,721 bytes) and the result must pass WebAssembly validation, or nothing is changed.
- Rails: the game drives opponents on a simplified physics mode and flips a car to full physics after a contact. Your racer record made that flip permanent for your AI-driven car, which is where the wall hits at raised pace came from. **Stay on rails** (Race / outrun tuning, on by default) keeps your race AI car on the simplified mode in solo Circuit, Sprint, URL and Street X. It is a guard in Car::SetPhysicsMode that only acts for the car the extension's AI owns, in a solo road race, while the page asks for it.
- On rails, Race pace + catch-up raises speed targets only (Paired race pace slider, default 1.30×; Street X at most 1.15× unless Custom race pace is on). The paired power/grip boost is not used on rails because it is far too strong on simplified physics. Drag keeps the paired boost. Turning rails off restores the 0.41.0 behaviour.
- Stuck watchdog: if the car stays under 2 m/s for 3 seconds the rails release so normal physics can recover it, and return after 2 seconds above 20 m/s. At most two releases per race.
- Solo/offline only on this build: Allow network tools is disabled, and online no-clip, city pacing and the hosted race loop are unavailable. The site's own online free-roam check (three host cells, re-read from the new build) still pauses every tool.
- Not ported to this build: the preset tuner / dyno / ECU panel.
- Unchanged for older builds: every earlier exact build keeps its own files and behaviour (the ed8d3359 chain still produces 41470ae5…).
- Offline checks: the shipped transform reproduces the tested module byte for byte and rejects a wrong hash, changed bytes, the old build and an already patched module; the rails guard passed 75 fixture cases on the real lifted function; the loader and the page-side controllers ran in Node on both builds, and the panel script ran in headless Chromium against a local stand-in for the site whose worker models the bridge (it is not the game). Nothing was driven live. The 1.30× default comes from older logs of one track.

## 0.41.0 — best-opponent skill 9 for your AI car, panel fixes

- Skill: your racer keeps the game's player marker (254, read as −2) in its skill field, and the game's AI code clamps that marker to skill 0, the weakest level. The AI driver's GetSkill() (0x402580, the only caller of the skill getter) now answers 9 for that marker at the seven call sites that clamp it: nitrous delay and decisions (0x40844b, 0x40d863, 0x40d91e, 0x416faa), the Drag launch reaction delay (0x42c105), a per-skill decision chance (0x4082e6) and a manoeuvre parameter (0x42d666). The racer record and the save are not written.
- It applies only while the extension's native AI owns the local player's current car (mailbox magic, even and stable sequence, heartbeat under 180, mode 1–2, active code, in world, one local player, car on an AI driver that is the car's current driver), and never in a network session, with or without Allow network tools.
- Left exactly as the game has them: the off-screen reset check (0x402263), target-speed variance (0x41c648, 0x41c9c9; the marker already gets none, any skill 0–9 gets some), the catch-up curve and update (0x4085e6, 0x417382, 0x417591), the branch choice (0x413e3c, owned by the shortcut policy) and four sites that discard the result.
- The Driver line says "skill 9 for nitrous and race decisions" (Drag: "skill 9 for launch and nitrous decisions") while it applies. There is no switch; it follows the AI driver.
- Fixed: the panel, the popup and exported logs still showed version 0.38.18 after 0.39.0 and 0.40.0. They now show the installed version.
- Fixed: with the game's Catch Up off, the Race pace + catch-up line said "Game Catch Up is off · matching boost unavailable" although the 0.39.0 boost was working. That line now appears only on builds without the player-only catch-up patch. Drag and Street X report their own waiting/applied state, and online sessions say "Off in online sessions · solo races only".
- Correction to the 0.40.0 note below: the game's global mode at 0x8650B0 makes normal skills read as 9 and keeps the player marker. It was never a way to give the player's car skill 9.
- Offline checks: 353 fixture cases on the real lifted wrapper (each site, each guard, online, other skills; everything except the returned skill is identical to 0.40.0), one real consumer (0x408430) through the game's own virtual dispatch, and the full patch chain, whose output 41470ae5… validates and compiles. Exact ed8d3359 only. Live racing is unverified.

## 0.40.0 — player-only catch-up in Drag and Street X

- Player-only constant catch-up now also runs in Drag and Street X (and forced Drag/Street X). Pace stays neutral (1.00×) there; only the catch-up strength applies. Drift stays excluded so drift scoring is unchanged.
- Native: inside the same 7 catch-up functions only, the Drag (0x89E7D8, 0x890108) and Street X (0x89E7E3, 0x89010C) exclusions now read as 0 (36 exact offsets, same-length edits). The identical check in the route-choice (shortcut) function is untouched, so shortcut policy stays off in Drag and Street X.
- If the game's drag driver is a different class from the road autopilot, the native publisher's ownership check still refuses it and the tools panel keeps showing "waiting"; nothing is forced.
- Never online. Exact ed8d3359 only. Offline: chain output b00036c5… validates and compiles. Live Drag/Street X racing is unverified.
- Not changed: your car's skill. The game maps the player's skill marker to 9 only in a special global mode; forcing it needs a reliable "AI owns the player car" signal inside the game code and was left out until 0.39/0.40 are tried in real races.

## 0.39.0 — player-only constant catch-up

- Race pace + catch-up now works with the game's Catch Up flag off and Mods: Rubberbanding set to Off or No boost. Before, its native publisher required Catch Up on and Rubberbanding = Original, so with those off your AI car never got any catch-up. New `godly-catchup.js` (exact ed8d3359 only, applied after the paced catch-up patch, pinned input/output hashes) makes those two checks pass in the 7 gated native functions (36 sites each, same-length edits). Opponents keep whatever the game setting gives them.
- With Rubberbanding off the game's own factor is 1, so your car gets a constant pace × strength handling/power factor for the whole race, whether it leads or trails. It never "waits" like game AI does when ahead.
- New defaults: paired race pace 1.00× (corner targets at the game's own speed, fewer wall hits) and catch-up strength 1.50× (a bit above the game's own skill-9 maximum of about +37–42%). Raise strength for more push; raising pace raises corner entry speed.
- Catch-up assistance is never enabled in online/LAN sessions, even with Allow network tools on.
- Drag, Drift and Street X are still excluded from paired catch-up. The JS readGain helper no longer checks the Catch Up flag or the (wrongly mapped on ed8) Rubberbanding host.
- Offline checks: the full extension patch chain reproduces the shipped 0.38.18 module exactly (92b567a3…), the new output (e40e7798…) validates and compiles. Live racing is unverified.

## 0.38.18 — latest ED8 and B1 compatibility

- Supports exact ed8d3359 and b1efa173 with independently checked native function/host/type, ownership/dispatcher/contact, road/physics and hosted-reader mappings. Preserves all fourteen prior complete native outputs; unknown hashes remain rejected.
- Retains the current normal tuner, ECU/turbo recipe and old scoped numeric-clamp bypass, including original native environment/online policy, S42 bounds/commitment, identity checks, CPU/stack restoration, Stop/cancellation, rollback and exact Undo.
- Preserves Street X, Drag/protection, profiles, menu, HUD/radar, Clean View and online consent. Offline checks are distinct from gameplay; live tuner gains, racing quality, online contacts and complete travel/JOIN/race/return remain unverified. Automatic Outrun and unattended streaming autonomy remain unfinished.

## 0.38.17 — B1 candidate, included in .18

- Adds exact b1efa173 support with separately verified native function, host, dispatcher/ownership/contact, road/physics and hosted-reader mappings. Preserves all thirteen prior complete native outputs and rejects unknown hashes.
- Carries the normal tuner, ECU/turbo recipe and old scoped numeric-clamp bypass into the current build. Retains native environment/online policy, S42 window bounds and commitment, car/part/lease checks, CPU/stack restoration, Stop/cancellation, rollback and exact Undo.
- Preserves Street X, Drag/protection, profiles, menu, stats HUD/radar, Clean View and online consent. Offline tests are distinct from live play: activation, tuning gains, cornering/shortcuts, online contacts and full autonomous travel/JOIN/race/return remain unverified. Auto-Outrun and unattended streaming autonomy remain unfinished.

## 0.38.16 — current game build and scoped ECU clamp bypass

- Adds exact bdc9cbc2 compatibility using import-aware native mappings, current ownership/dispatcher/contact checks, road/hosted readers, shortcut policy and paired catch-up. All twelve historical complete native outputs remain exact; unknown hashes are rejected.
- Ports the normal tuner, private evaluator and ordered ECU recipe to the new native functions. Retains S42 window bounds and commitment checks; unresolved native environment policy reports S75.
- Ports the requested old numeric-clamp bypass inside the current wrapper. Preserves its environment/online policy, original evaluation, C-stack epilogue, CPU state, solo/car/part/lease guards, cancellation and exact Undo. Numeric correction is skipped only during a valid scope; no persistent driving-power claim.
- Corrects the new-build catch-up option guard to the actual current native field. Existing ownership, Original-mode and physical-publication checks remain.
- Preserves profiles, Drag protection, Street X policy, menu, stats HUD/radar, Stop/manual controls and explicit online consent. Offline checks remain separate from gameplay: live driving, tuner gains, online contacts and complete travel/JOIN/race/return remain unverified. Auto-Outrun and unattended streaming autonomy remain unfinished.

## 0.38.15 — clearer tools, visual Pitwall and session showcase

- Enlarges and reorganizes the menu, keeps Stop/manual prominent, moves Load settings outside the collapsed tuner editor and preserves existing controls/defaults. Old manual Drag controls and research remain available in Advanced.
- Adds read-only measured tuner comparison cards and exact readiness explanations. Stale/unavailable values clear; S42 and native bounds/commitment checks remain. No native tuning algorithm or ECU recipe change.
- Corrects one reproduced false city-clearance slowdown: advancing valid heartbeat ages and unrelated commitment bits no longer invalidate an otherwise exact no-clip preview. Native avoidance, steering and catch-up formulas remain unchanged; live efficacy is unverified.
- Adds optional movable/resizable visual Pitwall using existing fresh samples, with Stop/manual, menu/hub and Clean View behavior. No radio/audio, new memory reader, control loop or fabricated driving/result claim.
- Adds manual race-type profile Save/Load, bounded local moment markers/export, verified garage/tuner comparison and a scorecard of observed session statistics. Existing profile schema, consent, revision/locking and Stop cancellation remain. No automatic preset application, video capture, finishes or wins inferred.
- Preserves native modules/transformers, Street X, Drag protection, saved profiles, online controls and the existing driver/physics paths. Live tuner, all-mode cornering, shortcuts, travel/JOIN/race/return and automatic Outrun completion remain unverified or unfinished as documented.

## 0.38.14 — Drag lobby travel and JOIN recovery

- Recovers from two transient catalog-refresh failures within a fixed one-second pause. Releases inputs immediately and requires fresh identity, native-off and later manual handback before travel. Hard stops and exact pending JOIN timers remain enforced.
- Accepts only verified canonical road-table aliases; retains all bounds, commitment and topology guards.
- Rechecks current lobby capacity and eligibility immediately before typed JOIN4. Vanished/full/replaced lobbies never create a host or trigger a generic Enter fallback.
- Adds bounded autonomy phase, reason, progress and request evidence to logs; retains previous trace rows.
- Leaves native Drag/Street X driving, physics, profiles, HUD/radar and online controls unchanged. Complete live travel, JOIN, race and return remain unverified.


## 0.38.13 — numeric route capture, city proof isolation and Drag discovery

- Recognizes exact943 native numeric modes007F/027F/037F without changing the game CPU; preserves constants and captured-mode guards. Mirrors native PC24 rounding and logs bounded numeric rejection evidence.
- Keeps a failed individual car proof solid without discarding independent no-clip eligibility. Global context, unknown cars and barriers retain their guards.
- Stabilizes Start presentation through brief torn reads; every action still requires a fresh complete catalog. Adds optional open Drag discovery and native cruise, exact host pinning, native-off/manual handback and safe repeat.
- Adds measured ordered ECU/turbo recipe controls with exact Undo and scoped cancellation. The controlled native recipe gain is about1.59%; no large persistent/live power claim.
- Preserves existing driver modes, profiles, streaming displays and Stop/manual controls. Auto-Outrun and complete live streaming autonomy remain unfinished.


## 0.38.12 — coherent catch-up, city contacts, tuner and hosted-loop candidate

- Keep supported race pace coherent with the current physical publication through native source-cache refreshes; preserve native stop/reverse intent and all output/owner/freshness checks.
- Exact943 city clearance uses a read-only per-car no-clip eligibility preview; solid or unknown cars and barriers remain hazards. Add bounded preview diagnostics.
- Retain separate last-race samples through subsequent free roam and same-tab reload, with independent strict storage limits and Clear behavior.
- Add an experimental selected-start travel/wait/typed-host-JOIN/race/native-return loop with stationary arrival, exact advert checks, no hosting fallback and Stop/manual control.
- Add exact943 normal full tuner/private current native evaluator and committed high-window S42 snapshot support. Keep the modern native curve clamp; no historical glitch button.
- Live driving, host acceptance, return/repeat and tuner/save behavior still require verification. Auto-Outrun remains unfinished.

## 0.38.11 — city pacing, route evidence and guarded online car contacts

- Preserves the selected city ceiling across timing gaps, invalid timestamps and clock rollback. Existing slowdowns remain; interrupted samples earn no recovery credit. Race pacing behavior stays separate.
- Corrects verified TrackInfo metadata-window acceptance in the route reader and optional native forward context. The native change is restricted to the authored TrackInfo check; route-node and ordinary guest-object bounds remain.
- Adds bounded route/read failure reasons, city timing/clearance evidence and sampled native controller inputs/state to the local trace. A wheel-source mask is not proof of a successful native contact query or of an override executing.
- Corrects the car-contact controller's free-roam interpretation of the verified port online tuple, preserving explicit network permission and conventional Online/LAN exclusions for that path.
- Adds one Online car no-clip control alongside the separate traffic, player and NPC-rival switches on exact AA/15e/943 builds. It selects car categories and permission without changing automatic-driver selection.
- Adds native NPC identity/current-world checks and current player/NPC Outrun/takeover participant checks. Player slots take precedence over NPC classification; challenge contacts require both reciprocal current roster members. Existing exclusive Online/LAN race filtering stays separate. Other verified builds retain their own capabilities.
- Reuses the existing car-contact mailbox. With NPC rivals selected, non-player counts are aggregate; there is no separate rival-hit claim. Stop, permission withdrawal, stale commands and changed identities restore the native contact path.
- Retains paired pace/strength formulas, native physics calculations, source caches, Street X, Drag protection, saved profiles, compact controls and movable streaming displays. A live .10 export confirmed observed full/simplified handling publication; the .11 pacing, geometry and new online-contact paths still require live verification. Autonomous travel/join/race/return remains unfinished.

## 0.38.10 — runtime CPU boundary for full physics

- Separates the full publisher's runtime CPU check from guest-object checks. The complete CPU state is bounded by actual Wasm memory; car, physics, child and guest-stack bounds and commitment checks remain.
- Adds high-runtime-CPU regressions that do not mark the CPU as a committed guest page, covering the boundary the earlier low-address fixtures concealed.
- Preserves the native physics instructions, handling formulas, source caches, mode3 path, city pacing, saved profiles and existing controls. Live .10 handling, race results and streaming autonomy remain unverified.

## 0.38.9 — handling evidence and selected city pace

- Corrects full-physics receiver identity and adds separate simplified-AI combined-grip evidence without switching the game's physics mode. Original catch-up source caches remain native; factors describe handling inputs rather than engine power or measured grip.
- Aligns the paired corner fallback with neutral final pace while physical support is unavailable, avoiding an additional pace division. Native ownership, mode, permission, output and use-time checks remain.
- Distinguishes requested pace from matching physical application in the tools panel. Adds bounded acknowledgement-rejection, physics-path and native-stage diagnostics, with prior trace values preserved on migration.
- Lets city clearance pacing retain the user's selected free-roam ceiling, including above 1×, on clear or unknown observations. Observed hazards reduce a separate runtime request; repeated unchanged samples no longer compound the same reduction or rebuild the native driver.
- Preserves saved profiles, Street X, Drag protection, HUD/radar, camera controls, online opt-in, Stop/manual takeover and the stable Desktop folder. Live .9 handling, wall avoidance, race results and autonomous travel/join/race/return remain unverified.

## 0.38.8 — paired catch-up, free-roam braking and readable race names

- Adds independent paired race pace1–2× and catch-up strength1–10× controls. Source caches stay native; power/chassis publication scales by pace×strength and all four tire-force inputs receive one more pace factor. Factors describe inputs, not measured grip or guaranteed speed.
- Holds extra pace neutral until current matching physical outputs are verified. Owner, command, mode, permission and source changes revoke raised corner-target evidence at native use time. Corner approach envelopes retain native braking assumptions.
- Fixes exact-build port-only online connection detection without widening guest-pointer bounds. Clearance status distinguishes network permission being off from waiting for an online free-roam session.
- Corrects the free-roam approach-braking calculation at increased pace on AA/15e/943. Native closure tests cover pace 1/1.5/2/3 and prove the pace-squared braking mismatch is removed. This does not change steering or establish collision-free live driving.
- Replaces numeric track labels in streaming stats and recent history with factual English names for all 100 primary race IDs; the city displays Bayview. Race mode distinguishes Circuit, Sprint and the special events. Unknown locations stay unknown.
- Replaces engineering counters on the viewer HUD with native-convention MPH, gear, RPM, session top speed, driving time and places driven. The page-only meter includes manual/free-roam driving and skips unobserved pause gaps; rear distances and movable widgets remain.
- Adds an off-by-default camera rotation toggle with random 45–120 second intervals. It pauses in menus/text entry/photo modes, postpones on manual C and switches off with F7/F9. Tests cover pulse release and session replacement; live camera behavior still needs verification.
- Keeps Stop/manual takeover, special race controls, saved profiles, HUD, radar and compact menu. Streaming travel and the selected-host race/return loop remain unfinished. Live efficacy requires separate verification.

## 0.38.7 — native calculated catch-up and consistent corner geometry

- Uses original native calculated catch-up on exact AA/15e/943 builds with extension pace1, no extra publisher substitution and separate sampled driver/car factors. No fixed authored factor or native maximum is selected. The observer always commands Off/100, which is distinct from the native factor.
- Keeps the lower-only corner cap authoritative. Canonical collinear road nodes and bounded physical bend spans prevent different node spacing from assigning different targets to the same turn. Gradual bends and accumulated 75° turns remain covered when present in the sampled route.
- Corrects the authored command3 blend on AA/15e/943 so nonlimiting gentle bends retain the native ceiling; physically limiting bends use a lower-only curvature target with pace compensation. Native instructions, commands1/2, shortcut selection and physics are preserved. Exact hashes and native behavior fixtures gate this optional correction; calculated mode remains unavailable if it fails to install.
- Requires current owned race AI, original native Catch Up, full physics and online permission. Default selection follows eligible AI road races; Stop/manual takeover disables it. Street X, Drag, Drift and free roam retain their controls.
- Separates advancing current-car publication receipts from sampled native factors. Observer reset remains pending until native publication advances; paused, replaced or unscheduled physics cannot fabricate completion.
- Pauses separate custom power/grip while assist owns pace or restoration is pending. Failed/foreign legacy restorations veto stacking; foreign values are preserved.
- Removes the stacked custom speed/sharp-turn/braking discounts in calculated mode's forward node plan, retaining the100ms lease reaction and lower-only native target. Existing corner-record protocol uses95%, zero sharp discount and full braking; saved custom settings are preserved. Factors above4 remain native with node-cap coverage unavailable.
- Extends the bounded trace with assist request/application/restoration evidence and migrates the two preceding trace column sets. No live cornering, win, streaming autonomy, ECU glitch or current tuner fix is claimed.

## 0.38.6 — native pace cache correction and exact current compatibility

- Moves authored pace scaling to native target consumption, retaining native catch-up cache/physics and final corner caps. Adds the exact 15e5958f and 943ee537 profiles, targeted ordinary-road shortcut eligibility and separate native driver/car catch-up diagnostics.

## 0.38.5 — driving trace and explicit diagnostic availability

- Adds a bounded 250 ms trace independent of the small event/history buffers, with settings/build per row, null unavailable values and actual retention/gap/missing-field coverage. Separate same-tab storage checkpoints at two seconds limit synchronous work.
- Records actual native road target and existing control outputs, separate native pace mailbox facts, explicit Street X flags and bounded command2 corner-record coverage. Every read retains its ownership/layout/range guards.
- Exposes the current forward plan limiting constraint and assumptions as read-only diagnostics; no world coordinates or memory pointers are exported. Requests are never promoted to native application or live verification.
- Reports fixed producer/read status and failure codes; repetitive idle errors and menus preserve prior race trace.
- All native hooks, pace formulas, route choices, saved profiles and ten complete native outputs remain unchanged from0.38.4. Live trace export and race outcomes remain unverified.

## 0.38.4 — route direction read, fresh radar display and aa2429fb compatibility

- Reads the native route direction as one byte. Dirty neighboring bytes no longer reject valid 0/1 directions; invalid direction bytes still reject. Controlled native fixtures cover the complete capture/publish/setter path.
- Separates fresh radar drawing from the statistics panel's 250 ms throttle. Keeps the existing 100 ms read cadence, 250 ms freshness limit, ownership and read-only bounds.
- Adds fixed numeric preflight and publication rejection codes. Native failure codes remain separate; Stop clears the rejection evidence. No raw pointer or exception text is persisted.
- Adds exact aa2429fb base and forward compatibility, including its inserted native type and verified lookup/window/online fields. Earlier compiled outputs and existing Drag/Street X commands are preserved.
- Live cornering benefit, Street X collision behavior, shortcut selection, tuner integration and streaming travel/join/race/return remain unverified or unfinished. This package is distinct from the separately supplied third-party 0.38.3 package; its wall governor was not merged.

## 0.38.2 — exact 93cfc6e9 compatibility and forward evaluator guards

- Ports the existing base native hooks to the exact new module using individually proved function, lookup, online-field and native-tail mappings. The current skill getter stays untouched; guest-memory bounds and feature permissions remain unchanged.
- Ports the verified 512-unit road-node lookahead, grade-dependent native planning-table receipt, target clamp, rear radar and read-only probe. The authored 26 helpers and 581 private globals compose with the base port; unsupported tuner, recorder and travel stay disabled.
- Fixes two stale folded evaluator guard cells in the d2fa4f4c, cd5b74d5 and 8abf9be8 forward slot helpers. These are the only changes to those prior complete outputs. Native fixtures clear the old addresses so they cannot conceal the mismatch.
- Retains v0.38.1 selected-pace fallback, positive-only optional cap, boosted free-roam corner compensation, byte-sized radar flags, Street X, Drag protection, profiles, HUD, online opt-in and Stop/handback.
- Compile/body/section proofs and offline tests do not establish live cornering, wins, all-map coverage or streaming autonomy. v0.38.1 had not yet been tried in the live game when the new game build arrived. Music recovery is separate from this code package.

## 0.38.1 — native pace recovery, corner compensation and radar repair

- Removes the race-wide 1× unknown-coverage ceiling and repeated uncalibrated clearance reductions; native pace and native corner/braking controls remain active.
- Removes preview-end stopping and arbitrary straight caps; invalid or nonpositive optional targets fall back to native driving.
- Adds exact-build native-table road-node lookahead with lease-bound policy evidence; original-anchor bend analysis includes gradual and accumulated 75°+ turns. Corner exit uses an authored heading check. Live outcomes remain unverified.
- Corrects free-roam pace compensation and cached-route rebuilding so increased straight pace cannot amplify protected sampled corner targets. Existing Street X and race commands retain their behavior.
- Fixes the rear radar's byte-sized blink flag reads, with solo/online regression fixtures and retained memory/list guards.
- Retains profiles, Drag AI/protection, streaming display, online opt-in and Stop/handback. Autonomous travel/join/return, complete route capture, newer tuner support and music downloads remain unfinished.

## 0.38.0 — clean stream view, movable HUD and rear radar

- Adds exact 8abf9be8 compatibility with reviewed native relocations and preserved tails; earlier seven complete outputs stay identical to v0.37. Native fixtures cover 2× pace with zero special corner records and retain a later sharp bend.
- Makes Shift+Insert a Clean View toggle: all extension chrome and the native detailed performance column disappear, leaving only selected Streaming HUD/radar elements. F8 restores controls; F7/F9 retain manual/Stop. Text-field paste remains intact.
- Adds optional stream panels around a clear gameplay centre, with independent rear radar selection, individual dragging and 60–160% scaling. Layout is bounded to the viewport and stored separately from tool profiles. Edit mode is explicit; normal HUD interaction passes through to the game.
- Adds a read-only rear half-circle displaying the nearest eight observed loaded cars, native distances and left/right offsets. Range is adjustable from 50 to 500 native units. Unknown or unstable scans remain unknown; no player/rival identity, global coverage, metres, live outcome or peer manipulation is claimed.
- Retains Street X, saved profiles, HUD/hub, Drag AI and engine protection, online permission, Stop/handback and previous cornering/pacing behavior. The full autonomous travel/join/race/return loop remains unfinished.

## 0.37.0 — online forward cornering and free-roam pacing candidate

- Adds exact d2fa4f4c and cd5b74d5 base racing profiles, preserving the current native bodies/tails and online player/contact behavior. Unsupported tuner, recorder and travel paths remain unavailable.
- Selects immutable forward adapters by the verified module hash. Ordinary online road races require explicit network permission, local owned AI and unchanged observed status/context before capture and final target publication. Those status fields do not prove lobby identity or server acceptance.
- Keeps matching online command generations stable without weakening OFF, setting changes, permission withdrawal, context changes or native ownership guards. Native forward requests remain bounded to 24 raw anchors, the existing horizon and a 100 ms lease.
- Expands local route interpolation to 48 points so dense native anchors can retain later bends, including accumulated 75°+ turns. It preserves every raw knot; there is no route extrapolation or extended lease.
- Fixes delayed/missing-clock recovery so an existing reduction is held and stale evidence cannot restore boost or earn recovery credit.
- Adds a separate default-off, session-only online free-roam clearance pacer for an already owned native driver. It only reduces ordinary pace, up to a ceiling of min(selected factor, 1×); it does not add route following or activate AI/network permission.
- Retains Street X, saved profiles, race hub/HUD, Drag AI and engine protection, online controls, compact menu and prominent Stop/manual handback. No live win, all-map result, full autonomous travel/join/race/return loop, aircraft, grip/downforce or online no-clip fix is claimed.
- Native fixtures, production loader, lifecycle and packaging checks distinguish tested behavior from the still-required live online verification. Music files are stored separately from extension code and require the game's local-folder import.

## 0.36.0 — R34 race hub and measured braking distances

- Adds a separate local race hub with observed driving segments, AI-owned time, sampled peak native speed, race types, track IDs, recent history, export and a sticky header Stop button. Native units stay explicit in the display and export; no SI calibration is claimed. Finishes, wins and lap times remain unconfirmed. Opening the hub does not enable a driving tool.
- Stores at most 200 schema-selected observation records within 64 KiB. No runtime addresses, player names or arbitrary caller text are persisted. Clear affects only this statistics key.
- Adds read-only stock-name/hash R34 tagging for the exact current build; missing, changed or unsupported car data stays unknown. No tuning or best-car performance claim.
- Includes a deeply frozen stock catalogue of 144 primary career directional layouts and 130 distinct table IDs. It is factual metadata, not complete geometry or live all-map coverage.
- Corrects route-parameter overestimation in the braking envelope using cumulative conservative horizontal chord distances. Preserves raw route coordinates and native publication bindings. Supports valid two-anchor bounded tails after checked resampling.
- Retains native hooks, Street X behavior, saved profiles, Drag AI/protection, online guards, HUD, compact controls and default-off Adaptive. Full travel and streaming autonomy remain disabled/unverified.
- Separately backed up the public website source and full Git history with upstream license/credits. This is not a playable copy or a mirror of post-archive private updates; complete game data/build tools were not found.

## 0.35.0 — bounded native forward-road cornering candidate

- Adds exact 3bdd9959 solo Adaptive forward geometry even with zero special native corner records. Own-node queries, native interpolation, projection/construction receipts and bounded road-byte freshness checks precede publication. Gradual bends and accumulated 75°+ turns receive curvature targets.
- Adds a final native target reduction after native pace factors, for the owned offline ordinary-race controller only. Native lower/zero/negative/reverse/disabled requests, steering, CPU, arguments and auxiliary commands are preserved. The 100 ms native lease is not continuous protection; requests can have gaps.
- Keeps unit proof honest: native route coordinates, velocity and timer agree; real-world metres and measured acceleration/grip limits are uncalibrated. The planner uses declared assumptions and a checked-horizon stopping envelope.
- Composes only authored helper snippets after the existing exact module patch. Existing imports, exports, tables, data, start and lookup entries stay unchanged. Failure retains the verified base racing module and disables only forward capability.
- Uses the existing default-off Adaptive choice and corner/braking sliders. Stop/manual/pause/tuner/session/settings changes revoke the cap before its geometry receipt. Street X, saved profiles, HUD, Drag AI/protection, online controls and the compact menu retain their behavior.
- Preserves bounded historical driving diagnostics through idle-menu event eviction. Forward targets are labelled requested, never live/native application proof.
- Offline native, planner, ownership/lifecycle, page and packaging verification accompany this release. Live cornering, clean laps, wins and the full streaming travel/join/race/return loop remain unverified. Travel stays disabled; no new aircraft, grip/downforce or online no-clip fix is claimed.

## 0.34.1 — require a usable current bend before adaptive boost

- Prevents historical hook hits plus a skipped final-node corner entry from authorizing extra adaptive pace. Qualification reads bounded current geometry, sample markers, node ownership and protected caps without changing native records or legacy guards.
- Withholds boost for malformed, stale, straight, negative-sentinel or tail-only records. Missing geometry remains unknown; the wall/vehicle reader still supplies supplemental local reductions only.
- Exact native tests distinguish processed index 26 from skipped index 27 on a 28-node route. The native negative sentinel remains unchanged but does not establish forward coverage for acceleration. Repeated shared-memory reads detect observed changes; they do not prove an atomic snapshot or a fresh native planner pass.
- Live v0.34.0 native driving and matching 1.45× pace were observed in a solo race on November 10, 2026. This patch's effect on cornering, race finishes and streaming autonomy remains unverified.

## 0.34.0 — racing test update

- Adds exact 3bdd9959 native racing/Drag/NOS/contact profile with independently reviewed helper relocations and current native tails preserved. Its full tuner, recorder and travel remain unavailable.
- Separates bounded adaptive live pace from the cached planning ceiling. Command 3 native corner/braking hooks admit only live pace 0.75× through that ceiling; legacy equality guards stay intact.
- Uses existing forward barrier/vehicle distances for supplemental reductions and gradual recovery. Zero current corner records withhold the extra boost; historic counters cannot establish coverage.
- Adds an always-visible Stop/Take Control button, matching existing F9 behavior.
- Integrates the guarded 93af6ccb S42 second-window snapshot candidate and optional offline partial native-route recorder. No complete route, saved-game persistence or live fix is claimed.
- Retains working Street X settings, saved-profile schema, HUD, compact menu, Drag engine protection and online guards.
- Full autonomous travel and join/race/return verification remain unfinished. No aircraft controls, unverified grip/downforce activation or streaming-platform integration.
- Fresh offline/native/UI checks and exact excluded-fixture reasons accompany the source; live gameplay remains unverified.

# v0.33.0 · Continuous adaptive targets for sampled bends

- Optional adaptive road mode now uses a separate guarded native command with a smooth bounded curvature target for each valid sampled nonzero bend. Exact straights and existing lower/stop results retain native behavior. Distance-based braking uses the same pace compensation.
- Preserves Street X in the page, controller and both native guards. Existing free-roam and road-corner commands retain exact prior behavior. Default-off/session-only choices, current sliders, online opt-in, ownership, handback and watchdog remain unchanged.
- This addresses the old curvature threshold, not missing native corner records, skipped route tails, zero-curvature data, auxiliary routes or steering. It does not provide all-map corner detection or a guarantee of clean turns or wins. Live gameplay remains unverified.
- Corner/braking counters use the existing two-second telemetry cadence to retain more useful history. Discrete control/mode changes still log promptly; hook hits do not verify the current corner.
- Combined suite: **1,942 passed, zero failures/skips/cancellations**. All four pinned modules compile; only functions 4497 and 4653 differ from v0.32. Retains tuner, NOS, Drag retention/protection, saved profiles, race-only AI, HUD and shortcuts. No unrelated lane/hosted-race candidate or unverified grip/downforce activation.
- Delivery uses one stable NFSU2-Driving-Tools folder. First install: extract and place the real folder on Desktop, then Load unpacked once. Existing installations: replace the contents of the exact loaded folder, Reload its browser extension card and refresh the game. The ZIP itself is not runnable.

# v0.32.0 · Race-only AI and optional adaptive road pace

- Adds a default-off, current-page race-only driver switch. It requests the existing native AI after GO in ordinary race contexts, including Street X/Drag/Drift, and releases outside races. It does not start or join events. Existing all-modes AI remains available separately.
- Preserves online opt-in, native manual requests, OFF acknowledgement, finished/totaled states, failed-control latch and watchdog. F7/F9/Stop and race driving-key takeover disarm it; held controls delay acquisition. Free-roam steering leaves it armed. Reload and profile Load clear the new switch without changing saved-profile schema.
- Adds default-off adaptive road-race speed using existing native route/corner/braking controls and a separate 1.00–2.00× target ceiling, default 1.30×. Street X retains exact prior effective controls; Drag, Drift, Outrun and free roam are excluded. No per-corner JavaScript control or new native hook.
- HUD/status/logs use current effective requests and matching native observations, and clear on interruption. Neither selected settings nor hook counters prove safe corners or measured speed gains.
- Combined suite: **1,907 passed, zero failures/skips/cancellations**. All four patched game module outputs remain identical to v0.31; no native code or permission change.
- Retains all v0.31 features, including Shift+Insert/F8 menu, Info HUD, Drag retention, NOS fix, tuner and saved profiles. No hosted-race joining, unrelated lane patch or unverified grip/downforce activation is included. No live result is claimed.

# v0.31.0 · Retain owned Drag AI during settings publication

- Keeps an already-established, fresh, permitted Drag AI lease through incomplete same-value page publication. Exact ownership/current identity, input/request, race, driver, physics, permission and watchdog checks remain. Original native fallback remains for real rejection conditions.
- Tracks ON-to-OFF publication until native ownership, latch, manual driver and heartbeat acknowledge it before restarting, including same-object consecutive matches. Continuous genuine native manual requests remain protected from reacquisition.
- Preserves manual takeover, F7/F9/OFF, finish/totaled states, permission withdrawal and the 180-frame watchdog. Does not change steering, shifting, NOS, damage, route choice or native acquisition.
- Combined suite: **1,873 passed, zero failures/skips/cancellations**. Both modern native modules change only the reviewed Drag selector guard; current/legacy module outputs are unchanged.
- Adds the requested Shift+Insert menu toggle alongside F8, preserving normal paste in text/editable controls and ignoring held-key repeats.
- Retains the v0.30 Info HUD and all prior tuner, Street X, Drift, profiles, online and Drag protection. Fresh log ordering matches the reproduced publication race but does not prove its historical cause. Live gameplay improvement is unverified.

# v0.30.0 · Compact read-only info HUD

- Adds a compact, click-through HUD below the closed launcher. F6 or the Info HUD switch toggles display; this same-tab choice is separate from saved driving profiles. The full menu temporarily hides the card.
- Shows guarded native speed in km/h, AI/manual driver state, current pace request versus matching native acknowledgement, and requested power versus observed field application. Missing telemetry is Unavailable, never a fabricated zero. Pace and power factors do not represent a measured speed gain.
- Clears current evidence on interruption, game/session replacement and control changes. A past acknowledgement cannot confirm a newly selected pace value. No controller, physics, native payload, game-save, permission or tuner behavior changed.
- Combined suite: **1,788 passed, zero failures/skips/cancellations**, including 20 focused HUD checks and read-only memory assertions. Strict-CSP browser fixture is prepared but blocked before page load by process socket restrictions, including the elevated retry. Live game appearance and driving remain unverified.

# v0.29.0 · Native static car storage for tuner snapshots

- Corrects S20's blanket heap-only assumption with an exact native racer-record exception: fixed table and stride, bounded active count, exact slot membership and current local car/record/ride ownership. Arbitrary low addresses and existing alias/stale-state violations remain rejected.
- Retains 170 locals, 16 MiB ownership, detailed diagnostics, selected-preset-only Stage/Restore and guarded known-prefix migration. Native preview/search and all five preset modes are tested with static rides; neighboring records remain unwritable.
- Adds observational power application/blocked-state text and bounded native pace acknowledgement to diagnostics. Does not change power writes, speed, steering, native AI or permission behavior.
- **Final combined suite: 1,768 passed, zero failures/skips/cancellations.** Clears stale power/pace observations after stop, permission withdrawal, game exit, tuner suspension and replacement game sessions.
- Preserves the v0.28 NOS clock correction, Street X, Drift, profiles and online/Drag features. No unrelated lane candidate is merged. The user's live tuner capture has not yet been retested; game-save success is not claimed.

# v0.28.0 · Correct online Unlimited NOS timing

- Uses the exact native clock selector when refreshing an active NOS timestamp. Previously the world clock was always used; a controlled exact-native replay reproduces repeated online depletion/stop cycles with divergent clocks, while the corrected candidate stays active.
- Retains literal network opt-in, current car/race/kit and clock-domain checks, inactive/sentinel state, and native cancellation. No held-key tapping loop, forced activation, native stop suppression, driver or lane changes.
- Adds bounded pre-refill NOS clock/timestamp/resource observations to local diagnostics. These are sampled scalars, not native burst counters or proof of activation.
- **Final combined suite: 1,740 passed, zero failures/skips/cancellations.** Preserves all native payloads/profiles, saved profiles, Street X, Drift, Drag, collision/corner controls and tuner diagnostics. No unrelated candidate is included. Live tapping resolution is unverified; the separate tuner capture issue still needs the reported S-code/log.

# v0.27.0 · Full tuner snapshot diagnostics

- Reports the specific rejected snapshot guard instead of collapsing every ownership/layout/count/alias failure into one message. Adds bounded failure fields to the existing local diagnostic export; no addresses, arbitrary game text or memory dump.
- Resets error details per request and retains the existing acknowledgment, cancellation, ownership and timeout behavior. All capture protections and selected-preset-only writes remain unchanged.
- Guarded native-prefix migration accepts only exact reviewed forms and rejects malformed byte arrays. The full tuner bridge, reviewed Drift isolation, profiles, Street X, online and Drag features remain combined.
- **Final combined suite: 1,708 passed, zero failures/skips/cancellations.** Independent review passes49 additional checks. This update supplies missing diagnostic evidence. It does not claim the user's snapshot failure is fixed, a successful live tuner capture, a race improvement or a game save.

# v0.26.0 · Drift tuning isolation

- Modern native pace wrappers retain original update/catchup calls and skip only the extension's custom multiplier in native Drift contexts. Page/controller request native pace there and suppress stale custom-pace confirmation. Saved road/free-roam switches and factors remain intact and resume on exit.
- Extends Extra grip's existing Drift pause to the native variant flag, with Drag precedence and a write-time transition guard. Existing ownership restoration is preserved.
- Adds bounded, read-only native pace-factor diagnostics. No steering, shifting, NOS, engine power, limiter, scoring, opponent, recovery-curve, route, collision, network-permission, saved-profile schema or full-tuner change.
- **Final combined suite: 1,698 passed, zero failures/skips/cancellations.** No live Drift cure, score improvement or successful race is claimed. The candidate isolates reproduced interactions and still needs a same-car/track/tune live comparison.

# v0.25.0 · Saved extension settings profiles

- Adds named browser-local extension configurations with Save, Update, Load and Delete. Stores selected tools and bounded numeric settings, not game dyno presets, save files, car data or logs.
- Optional automatic loading is off by default and requires an explicit choice. Network restoration has separate per-profile consent. Existing native capability, ownership and game-context guards remain unchanged.
- F9 keeps saved profiles but persistently pauses startup loading and clears active driving/network tools. Stale tabs cannot silently overwrite the stop marker. Storage events refresh available profiles without activating them.
- Profile changes safely stop previous controllers and release synthetic input. They do not undo staged game tunes. Malformed or unavailable storage fails closed and reports errors rather than claiming a successful save.
- **Final combined suite: 1,688 passed, zero failures/skips/cancellations.** Independent review adds 44 storage/VM/DOM checks, including serialized two-tab saves and queued Stop races. Browser-managed locks protect mutations; unavailable locking disables edits, not manual Load.
- Native runtime payloads and the v0.24 online Drag protection are unchanged. A local Chromium fixture launch was blocked by environment socket restrictions. No live browser, race or game-save verification is claimed.

# v0.24.0 · Opted-in online Drag engine blowout protection

- Extends the current-player heat toggle to Online/LAN Drag only when **Allow network tools** is also enabled. Turning network permission off immediately clears the heat request. Solo behavior, current engine ownership, active Drag/full-physics, finite unblown heat, epoch and heartbeat checks remain.
- Keeps the corrected full-runtime CPU address bounds. No changes to native heat instructions, opponents, packets, NOS decisions, shifts, steering, Street X, tuner staging, local race contacts or corner/braking formulas. Does not repair already-blown engines or lost races.
- Native tests cover 600 online redline frames on both pinned modules, including high runtime CPU addresses, and normal heating/blowout after opt-out. Independent review exercises seven network-indicator cases with strict literal permission, all ownership/staleness guards and byte-for-byte native fallthrough. Snapshot tests now take real memory copies instead of aliased views.
- **Final combined suite: 1,669 passed, zero failures/skips/cancellations.** Live multiplayer, browser appearance, successful Drag completion, repeated NOS behavior and user-save persistence remain unverified. Native grip/downforce scaling remains disabled.

# v0.23.0 · Solo Drag engine blowout protection

- Adds **Disable Drag engine blowouts**, independent of automatic/manual driving. Exact93af6ccb and78e2bb69 only; solo active Drag only, even with network permission. Fresh-tab default off, same-tab choice retained, F9 clears.
- Supplies native disabled-heat sentinel only for the current linked player engine after phase, physics, identity, finite/unblown, heartbeat and command checks. Original native heat function/instructions/return remain intact. No restoration of already-blown engines or lost races. Accumulated heat is intentionally discarded; off resumes heating from zero after native setup.
- No changes to shifts, throttle, steering, pace, power, limiter, NOS decisions or opponents. No AI restart from this toggle.600 controlled over-redline native updates are tested, not a live race/win or NOS-cycling fix.
- Reserves AI mailbox+100 under initial occupancy checks. Next-profile builder retains/recomposes the full tuner170-local prefix around this exact reviewed base change, preserving online race contacts and corner/braking settings. No Lap Knockout or unverified native grip/downforce activation.
- **Final combined suite: 1,665 passed, zero failures/skips/cancellations.** Corrected a reviewed CPU-pointer issue: runtime CPU addresses above the emulated guest heap use widened full-state memory bounds; car/engine guest bounds remain strict. High-address exact-native regressions pass. No installation, live multiplayer, browser appearance or user-save persistence was verified.

# v0.22.0 held candidate · Local online race car filtering

- Adds an exact93af6ccb race-specific local-contact path to the existing player no-clip selection. Requires explicit network permission, active Online/LAN race, current local car/body identity, bounded2–6-entry roster membership for both contacted cars, reciprocal racer/body records, pair witnesses, heartbeat and unchanged command sequences.
- Free-roam player/traffic scopes and older profiles are preserved. The race path does not change peers, packets, server rules, Ghost state or walls. UI and sanitized counters state local-only scope; no guarantee of collision-free remote views.
- Retains full preset tuner and online corner/braking parity. Guarded next-profile rebuild preserves the170-local tuner bridge and rejects unexpected base changes. Solo/Street X behavior unchanged; no Lap Knockout, Drag fix or native grip/downforce activation.
- Final combined suite: **1,619 passed, zero failures/skips/cancellations**. No live online gameplay, browser appearance, synchronization or user save/reload verification. Delivery remains held for pending Drag evidence and grip blocker.

# v0.21.0 candidate · Online road-race tuning parity

- Combines v0.20 full per-preset tuner with matching solo/opted-in online road-race corner and braking settings. Uses the existing network permission, strict owned-local-car/private-route/native-caller guards and unchanged solo formulas. Both opt-ins reset off on reload/Stop.
- Corrects an online routing mismatch, not a proven wall-collision cause or a guaranteed driving improvement. Street X, race flags, Drag/Drift/Outrun behavior, collision scope, grip/downforce activation and full tuner transport remain unchanged. No Lap Knockout experiment.
- Held for further review. No installation or live online race/peer/server/browser validation. Combined candidate suite: **1,607 tests passed, zero failures/skips/cancellations**. Canonical ZIP metadata and unchanged source bytes reproduce the same archive.

# v0.20.0 · Full preset tuner and private native preview

## Added together, preserving v0.18 driving behavior

- Exact 93af6ccb gains a 41-field per-preset editor: suspension, gears, NOS, brakes, tires, downforce, ECU and turbo. All five native presets are selected in the game; installed parts/native eligibility remain authoritative. Native setter coupling is shown before staging.
- Preview uses 195 reviewed native functions extracted from the verified downloaded game module into private memory, not temporary live writes. The extractor guards 11,678 native memory operations and 77 loops plus function entries. Bounds, allowed write ranges and fuel stop unsupported execution. No game executable or assets are distributed.
- Native estimates: 0–60, 0–100, top speed, peak power/torque and native NOS duration/torque. Measured search is capped at 48 trials: ECU/turbo for peak goals, gearing plus ECU/turbo for acceleration/top speed. Manual handling/NOS controls are not optimized for laps, corners or race wins.
- Frame-boundary capture and explicit Stage/Restore use a separately owned 16 MiB buffer. Stage writes just current and selected visit tune bytes, with identity/setup/parts/record/staleness/cancellation checks. Restore retains distinct original current/visit copies. Neither operation saves files or calls the unverified live rebuild graph.
- Use native Test Run to refresh physics and Save Profile to persist. The native save may commit all visit presets; readiness warns about other dirty presets. Disk save success is never claimed. Live save/reload remains unverified.
- Read-only corner status clarifies “armed” versus a native observed hit. Street X AI and all existing driver, event, route, pace and corner physics payloads are preserved. Unverified native grip/downforce scaling and host wiring are not activated. Older builds retain their previous dyno tool.

## Validation

**Final aggregate suite: 1,599 tests passed, zero failures, zero skips/cancellations.** Focused exact-WASM tests cover private measurements, native locks/coupling, fuel/cancellation recovery, all five preset contexts, 41-byte-only Stage/Restore and unchanged saved-car records. Real-browser appearance, live race outcomes and disk save/reload have not been verified. The existing crash/freeze report remains unresolved. Back up progress and retain v0.18 for rollback.

# v0.18.0 · Native Drag handoff and solo road-race hairpins

## Added together, preserving v0.17 controls

- Repairs the native Drag input lifecycle on exact 93af6ccb and 78e2bb69. Native input mode4 acquisition and a guarded function19197 prefix retain ownership through native Player update/reconciliation. The extension preserves newer native modes, requested modes and replacement controllers, restoring its saved skill only when still applicable. A real mode change latches reacquisition until OFF; the status now explains the required off/on retry.
- Adds independent, default-off solo Road-race hairpin assist on all four reviewed profiles. Existing curvature helper4653 applies a pace-compensated corner cap; getter4497 requests a more conservative native braking envelope on the owned private route. Settings changes rebuild cached route caps through the existing handback. Selected straight race pace, native route/driver/recovery/opponents and free-roam corner calculations remain separate.
- Race corner command record expands to64 bytes; modern Drag input lease uses two previously reserved AI words. First-handshake occupancy checks cover both changes; occupied memory is not overwritten. Braking hits and stage diagnostics do not masquerade as confirmed corner hits.
- Extends bounded read-only logging with actual skill, native input modes, recognized goals, native behavior controls, pointer-presence/bounds flags and mailbox scalar evidence. No raw pointers or keyboard events are captured. Exporter version remains in the header after startup history rolls off.
- Existing native Drift recovery, NOS decisions, dyno modes, separate online NPC/player no-clip, online AI permission, power/grip/NOS controls, local logger, scanner and compact menu are retained. The unfinished native grip/downforce work is not included.

## Scope and verification limits

Hairpin assist is **solo ordinary road races only**. Online/LAN, Outrun, Drag, Drift and forced Drag/Drift are excluded even with general Online/LAN permission. Existing online collision controls remain online-free-roam-only. Drag acquisition remains GO/full-physics-only; force-only/special Drag is unsupported. No live race, launch, shifting, finish, score improvement, native NOS timing, multiplayer behavior or full opponent equivalence is verified. Native route limits can still produce missed turns. Previously reported freezes and the older page-thread tuning lifetime risk remain unresolved.

The final combined release suite passes **1,555/1,555 tests, zero failures and zero skips**. Independent merged review passed135/135 targeted checks and the exact current native input-lifecycle replay. Authored builders reproduce byte-for-byte; all extension JavaScript syntax checks pass. Constituent and independent focused runs are overlapping evidence, not additive totals. Native probes use controlled boundary dependencies and synthetic routes. Keep v0.17 for rollback, back up progress, start at1× pace with power/grip off and test one option at a time. F7 returns control; F9 stops tools. Only authored extension code is packaged, never original game binaries or extracted native assets.

---

# v0.17.0 · Native race AI with guarded Drift recovery

## Added together, without removing v0.16 controls

- On exact 93af6ccb and 78e2bb69, Automatic driver integrates the reviewed native Drift yaw-damping path. One native player-curve expression selects the existing opponent curve only while ownership, permission, heartbeat, race state, native Drift driver/behavior/input aliases and full physics are valid.
- No model filter or new coefficient: the original car-specific coefficient and native sign/gear conditions remain. The intended difference is near/beyond the 89-degree curve knot. Goals, identity, scores, native opponent behavior, manual handling and global curve data are not edited.
- All three native Drift flags are recognized with drag precedence. Forced Drift still requires the valid owned Drift behavior and full-physics context. This is not an external driver or unrestricted free-roam assist.
- Adds bounded read-only Drift diagnostics to the existing local manual-export logger: native controller/action evidence, speed/target, track, scoring state, pending/banked points, raw rate, route progression and collision-loss latch. Corner hit/cap evidence remains separate from pace. No raw pointers, names, input or network traffic are exported.
- Native race AI and automatic switching, skill 9, drag action, native NOS decisions, dyno modes, adaptive corners, pace, solo collision switches, separate online NPC/player switches, power/grip/NOS controls and menu layout are preserved. The unfinished full tuner is not included.

## Verification and limits

Final combined suite: **1,472/1,472 tests passed, zero failures and zero skips**. Independent focused review: **157 cases passed**, plus native byte/local/section checks on both exact builds. Authored recovery/profile generators reproduce byte-for-byte and all JavaScript syntax checks pass. Fresh public metadata at **2026-11-09 19:23 UTC** still matches the exact 93af6ccb module.

Only one additional native body, function 8871, changes in either newest exact profile. Its original 17 locals are preserved; eight authored locals are appended. The only replaced native expression is the five-byte player-curve constant at offset 2471. Its inline replacement adds no stores or calls. All other native instructions, other bodies and non-code sections are preserved, except the eight existing v0.16 hook bodies. Both complete patched modules validate and compile.

The actual production-patched current body passes 156 native-opponent output comparisons, 45 fail-closed memory comparisons, 46 unchanged-native-opponent cases and six explicit eligibility cases. Native angle and rear-grip dependencies are controlled fixtures, not live physics simulation. Production bridge fixtures test acquisition, immediate stop, heartbeat expiry, stale ownership/physics/behavior and drag handback. Logger tests cover verified-profile gating, manual export, read-only memory invariance and removal of stale telemetry on mode exit.

No installed/live race, actual spin recovery, per-model handling, winning, score improvement or multiplayer synchronization is verified. The guard-installed status is not an observed recovery hit. Previously reported freezes, the page-thread tuning lifetime race and formal scratch-memory reservation remain unresolved. Keep v0.16 for rollback, back up progress, start with 1× pace and power/grip off, and test one feature at a time. F7 returns control and F9 stops tools.

---

# v0.16.0 · Current build and online player no-clip

## Changes

- Adds exact revision **93af6ccb**, size 38,205,596, SHA-256 128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6. Previous exact profiles are retained; unknown binaries still fail closed.
- Maps and recompiles the authored native hooks against the reviewed dispatcher, guest-call ABI and collision helpers. The genuine native status capacity increased from 48 to 64; only the new verified profile enables the 64-entry reader.
- Retains v0.15 native AI/event switching, normal skill 9, guarded opponent drag selection, drift physics choice and native NOS decisions. This is the game's native driver, not an external steering bot.
- Adds **Online player no-clip**, separate from NPC traffic and off by default, on the two newest reviewed profiles. Exact native player-slot matches 0..2 qualify; no-match traffic requires its own switch and driver 4. Online free roam only; races, outruns and LAN remain excluded. Category counters, native ghost behavior and normal collision fallback are preserved.
- Adds the new 34-anchor read-only diagnostic signature set. Matching signatures never enables an unknown module.
- Existing menu layout, five-mode dyno search/Apply/Restore, adaptive corner controls, separate pace, power/grip/NOS controls and local manual-export crash logger remain. The unfinished full tuner and drift-recovery research are not included.

## Verification and limits

The final v0.16 release-folder suite passes **1,430/1,430 tests, zero failures and zero skips**. Independent overlapping review passes **628 scoped cases**. Authored contact/profile generators reproduce byte-for-byte and all extension JavaScript passes syntax checks. Public metadata rechecked at **2026-11-09 19:11 UTC** still identifies revision 93af6ccb and the exact pinned size/module.

The exact new patched module compiles and changes only eight intended bodies: 3174,4653,7395,17404,19277,21213,21263,22508. All other bodies and non-code sections remain byte-identical. Native input/status/NOS execution passes 89 assertions, including all 64 native slots and overflow refusal. Actual gcall 21741 preserves its 344-byte CPU snapshot and guest stack in a controlled dispatcher fixture. Independent production collision tests pass 24 cases with actual current helpers and the compiled contact hook.

Automated tests are isolated fixtures and binary proofs, not live gameplay. No live multiplayer collision/synchronization, full native AI graphs, race outcomes or real-browser export are verified. Reported freezes and the residual page-thread tuning object-lifetime race remain unresolved. The scratch area has exclusion evidence but no formal reservation. Back up the save, keep v0.15 for rollback, start with 1× pace and power/grip off, and enable one feature at a time. F7 returns control; F9 stops tools.

---

# v0.15.0 · Native opponent AI paths

## Changes on exact build 78e2bb69 only

- **Opponent drag action:** allows the native initializer to select actual opponent “Win drag race” action 2 for the extension's requested and owned player car. It does not change racer identity, global difficulty, native action pointers or vtables directly. A confirmed player action 3 may be upgraded once through the initializer; NULL initializes lazily and recovery 11/other actions are left to the game. Status confirms id and vtable; pending is not success.
- **Native drift physics:** corrects normal unmarked player drift events to driver 3/physics 1 through the native setter, preserving drag-first mode precedence. Invalid driver state or failed correction rolls back to manual control. Existing mode/identity/heartbeat/network guards and full event handback remain.
- **Native nitrous decisions:** permits the owned player to reach native request/cancellation logic for recognized drag goal 2, observed road goal 1 in actual race types 1/7, and observed chase goal 5 only in Outrun 7. It never selects chase goal 5 or enables this new path in free roam 0. Native tactical/skill/availability/resource conditions remain intact; no refill or forced activation is added. The separate Unlimited NOS control remains unchanged.
- Cancellation uses the same authorized owned race scope without a new-start goal requirement, so recovery/NULL goal transitions cannot suppress native cancellation. New starts remain strictly goal-gated.

## Limits

**Force-only drag and the special 1099 combination are unsupported by the new opponent path.** It requires the actual native drag flag. This is not full opponent equivalence, a distinct specialist AI for every race, or a fastest-driver claim. No live race benchmark, reliable launch/shift/lane behavior, race completion, winning or crash-freedom is proven. Temporary/recovery actions are not forced. Native full allocator/configuration and cancellation execution, plus the complete skill/resource graph, remain unverified.

The reported freezes remain unresolved. Back up the save, preserve v0.14, enable only one extension version and reload the game. Begin with normal 1× pace and unrelated power/grip changes off. F7 returns control. Unknown game binaries stay disabled, and older exact supported profiles retain their previous behavior.

## Preserved v0.14 features

Guarded five-slot dyno Find/Apply/Restore and Store/Save guidance; adaptive free-roam corner margin and honest hit/status logging; separate online NPC traffic no-clip; solo collision switches; separate free-roam/race pace; NOS refill, power, limiter, grip, manual drag, drift input, read-only tester, signature scanner and sanitized local crash-log export are retained. Corner assistance remains free-roam-only and drag bypasses custom pace. No game assets, extracted binaries or research files are included.

## Verification

The final v0.15 release-folder suite passed **897/897 tests, zero failures and zero skips** after integration and version changes. Independent review passed **390 selected overlapping tests** on the frozen implementation. Authored drag-selector, owned-NOS and latest-profile builders reproduce byte-for-byte; all extension JavaScript passes syntax checks. Production JavaScript matches the frozen reviewed candidate except version labels. Additional bounded native downstream proof passed 56 cases with controlled skill/resource boundaries. These are not live gameplay or full end-to-end native graph benchmarks.

Only eight intended current-build bodies change: 3174, 4653, 7395, 17404, 19277, 21213, 21263 and 22470. All other function bodies and non-code sections remain identical. Older exact profiles retain their existing hooks. Strict-CSP browser visuals remain unverified because Chromium startup was blocked in this environment.
