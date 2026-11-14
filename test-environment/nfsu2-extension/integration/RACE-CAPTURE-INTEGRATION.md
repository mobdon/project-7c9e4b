# Native route capture integration

The optional native observer is integrated into the active loader and remains pinned to exact build `93af6ccb`, SHA-256 `128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6`. It does not grant compatibility to the newer public build `3bdd9959`. It adds no driving writes and cannot create a complete race polyline from empty native corner records.

Files added: `extension/race-capture-config.js`, `extension/race-window-geometry.js`, `extension/race-capture.js`, `tools/build-race-capture.cjs`, `tools/race-capture-evidence.json`, `tools/race-capture-wasm.cjs`, `tools/race-capture-observer.wat`, `tests/race-capture-observer.wasm`, and two `race-capture-*.test.cjs` files. The window analyzer deliberately uses its own global `__NFSU2_RACE_WINDOW_GEOMETRY__` so it does not collide with the dynamic pacing geometry module.

`extension/ai.js` changed only at the module loader: independently verify and patch the ordinary AI first, optionally append the exact capture observer, validate the resulting module, and publish `capabilities.nativeRaceCapture:true` only on success. An observer mismatch retains the verified ordinary AI and reports `captureUnavailable:true`. Existing runtime `adaptivePace` changes were preserved.

## Page and manifest wiring for the integrating agent

Load these scripts in this order before `ai.js`: `race-capture-config.js`, `race-window-geometry.js`, `race-capture.js`. Retain every existing manifest script and permission.

Keep a page-local `raceCapture` variable initialized to null. When a new verified game module/memory arrives:

```js
raceCapture?.invalidate('Game session changed');
raceCapture = caps?.nativeRaceCapture && globalThis.__NFSU2_RACE_CAPTURE__?.Controller
  ? new globalThis.__NFSU2_RACE_CAPTURE__.Controller(memory, true, module)
  : null;
```

Add a default-off/session-only checkbox and local JSON export under Session and diagnostics. Disable recording without `raceCapture?.verified`. A user checkbox change calls `start()` or `stop()` inside try/catch and displays `raceCapture.text`; it must not enable AI or alter saved tool profiles. Arming starts a new recording and clears the prior samples.

On the existing polling cadence, call `raceCapture.poll()` only while the page is focused and visible. Blur, hidden page, suspend, F9/Stop, manual takeover and profile loading must call `stop(reason)` and uncheck the checkbox. Exit/trap/session replacement must call `invalidate(reason)`. A fresh controller always starts off. Returning focus must not restart recording automatically.

Export `raceCapture.export()` with `JSON.stringify(..., null, 2)` to a local `application/json` Blob download named `nfsu2-race-geometry.json`. Report no samples instead of downloading an empty result. Revoke the object URL. The recorder owns its data; do not log its raw route samples into generic diagnostics or save profiles.

The historical candidate page controls/tests remain available for reference in `source-handoff/nfsu2-extension/research/race-geometry-capture/candidate`. They cannot be copied over the active page wholesale because autonomous streaming and dynamic pacing are being integrated there concurrently.

## What this establishes

Fresh local command:

```text
node nfsu2-extension/tools/build-race-capture.cjs
node --test --test-isolation=none --test-concurrency=1 nfsu2-extension/tests/race-capture-observer.test.cjs nfsu2-extension/tests/race-capture-patch.test.cjs
```

Result: 24 tests passed, zero failures/skips/cancellations. Generated authored observer: 26-byte prefix, 4,347-byte suffix, 44 locals. The exact original module is loaded from `research/compatibility-93af6ccb/game.wasm` only for offline tests; never include it in an extension package. Preservation evidence is written to `verification/race-capture-module-preservation.json`.

Checks include native mailbox-only writes, untouched CPU/game bytes, safe-point identity, committed pages, mailbox overlap, stale native tails, monotonic sample distances, career event/heat identity, clock restart, timeout, 256-window cap, gradual bends, S bends, exact module compilation, all-other-function preservation, loader hash gating and graceful capture failure. No live capture or driving result was tested.

## Geometry and hazard limits

The native observer runs in function 13186, guest `0x428030`, around its two planner calls to function 17087. It checks return EIP `0x4281ba` and SP, owned route and car, and the exact original function SHA-256 before insertion. Route node pointers are `route+8+4*i`; native node distance is `node+0x54` and native cap is `node+0x40`. Corner records are `route+0xd4+128*i`, with at most five records. Each observed record supplies five horizontal native sample points, five distances, a center index and eight producer markers. All markers, finite values and increasing distances gate ordered analysis.

These rolling windows are partial. If the planner supplies zero corner records (as reported on track 4715), the observer can report nodes and their native distances/caps but does not synthesize missing coordinates. Do not concatenate windows by storage order, call a driven vehicle trajectory the race route, or treat unknown geometry as straight.

The existing `core.Engine.hazards()` is a separate bounded car/barrier intersection reader. `cars[].ahead` is forward projection of car centers, `cars[].side` is lateral projection; `barrierAhead` is an enabled barrier-line intersection with the current forward ray. They are approximate local clearance observations, not vehicle extents, stopping guarantees, a complete wall/terrain mesh, collision callbacks or a route polyline. A supplemental slowdown may use them only conservatively with freshness/ownership guards and must preserve unknown coverage.
