# Next live validation after integration

Use this only after the native handoff repair and combined release pass review. This plan is not evidence that gameplay has already passed.

## First Drag run

1. Reload the game after installing the final combined extension. Record the extension exporter version and supported native revision from the new export.
2. Start a normal Drag event and enable Automatic AI. Preserve the selected car and settings so the result is comparable; note the track and whether it fails at launch, while shifting, or at lane/traffic avoidance.
3. Let the run reach active driving. The bridge deliberately waits for native race phase4, so pre-GO ownership is not expected.
4. Export the bounded log promptly after the problem or finish, before unrelated activity can evict the relevant samples.

During confirmed owned Drag driving, inspect actual driver3, physics1, current/requested input modes4/4, actual skill9, and the recognized goal. Goal2 is the opponent Drag goal; a temporary missing/recovery goal should not be mislabeled as a permanent wrong controller. Also inspect navigation/config presence, native throttle/gear/steering, speed/RPM, heartbeat and ownership transitions.

The repair's primary acceptance target is no repeat of the observed brief driver3/owned → driver2/unowned loss while the same active Drag context and permission remain valid. Merely seeing mode4 or an AI checkbox is insufficient.

## Handoff and skill checks

- Turn Automatic AI off while safely driving. It should relinquish its driver through the native input mode API and restore the saved normal skill. Native manual Drag driver2 may appear after the next Player update; a brief driver1 on handback is native behavior, not automatically a failure.
- On a later ordinary road race and a Drift race, inspect actual skill and owned state after activation and after a mode transition. Do not infer other race retention from the Drag result.
- A real native request change must not be overridden. A native/scripted AI replacement must not be turned off merely because it still uses driver kind3.

No test here establishes optimal launch RPM, best lap time, scoring parity or guaranteed wins. Those need measured gameplay after ownership is stable. The larger bounded records may retain less history than the old export, so export promptly.
