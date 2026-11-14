# Synthetic NOS top-up source update

Working extension version0.42.8 now provides a session-only **Keep NOS topped up** switch alongside **Award once**. Both use the same verified native synthetic STYLE_NEARMISS bridge; the direct `Engine.refill` API remains disabled. The loop has no speed threshold.

Top-up starts off and is not restored by saved NOS/profile selections. It samples effective NOS before each request, waits at full or overfull and resumes when consumption drops below full. Active accounting credit is adjusted by the original clock domain's elapsed ticks; raw stored LEFT alone is not treated as the current level. Two read-only samples must agree on capacity, credit, activation timestamp and clock domain, with current owned car/race identity.

The loop shares the manual controller's single outstanding slot. It waits at least250ms after observing a matching positive native NOS completion before another request. Focus/permission loss pauses and requests cancellation; F7/F9, car/session replacement, game exit, uncertain outcomes or confirmed style without positive observed NOS disarm it. A late receipt may settle an old request but never silently re-arms the loop.

## Verification

- **171/171 focused tests passed**, including16 scheduler cases and12 actual-page cases. This is a selected13-file run, not all repository tests. Its source hashes and full output are in `focused-test-receipt.json` and `focused-tests.tap`.
- All **105 manifest scripts** parsed. The captured host check returned page mark0 at all six observed stages, with actual raw609 compilation, native capability installation and original configuration/report markers preserved. It uses controlled DOM/browser stand-ins and does not instantiate the full game.
- A separate native cadence experiment executes the exact uninstrumented production helpers and original17146/5598 on one style object. Five requests at250ms intervals produce positive NOS deltas333,667,1000,1333,1667, taking stored credit1000→6000 with capacity5000. Five subsequent intervals without publication produce no native calls, points or credit. Present observation remains0. This native experiment does not execute the new page scheduler; scheduler/page gating is checked separately above. It does not model active NOS consumption.
- The cadence run verified67 protected artifacts unchanged. Its receipt is `../../near-miss-integration/production-synthetic-style-audit/cadence-native-bridge-receipt.json`, SHA-256 `57a163714ca8fe99019b71744af3d2f71844e62fc7387e14300eee4ca0cc0c1b`.
- Native bridge JS remains `6afe5ad7939d62c640ab7e81b89b9981db1ae63ad24998b5f0e8cf32c9d306a3`; compiled native candidate remains `c570e3e33dc59c4936346654f819feb94ff04e259a772ae0408f50ca6b5f3c4a`. No detector, threshold, report, encoder, transport or native award arithmetic changed.

`working-source-freeze-v0428-loop.json` pins112 current files including the checksum inventory. All111 pre-loop files are preserved and verified against the earlier manual checkpoint under `input/extension/`. The new file is `near-miss-top-up.js`; the manual controller only exposes its existing outcome/result to the scheduler.

## Scope

Page sampling cannot guarantee NOS remains below full between publication and native consumption. An already claimed award may finish, and native overshoot remains visible. Tick NOS changes are aggregate observations rather than isolated event credit. Unknown completion never authorizes another automatic request.

This is a source update only. No package, installation, Chrome reload, online session or account check occurred. The local tests do not establish server acceptance or clear the extension's movement. Actual extension-produced movement is being investigated separately under `../../extension-movement/`.
