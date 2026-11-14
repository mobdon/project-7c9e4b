# v0.38 continuation — November 10, 2026

Stable Desktop target: `C:\Users\Admin\Desktop\NFSU2-Driving-Tools`.
The user confirmed v0.37 finally appeared only after completely closing Chrome.
Reload/refresh previously retained v0.34 despite correct disk files. Browser
internal-page policy blocks extension-card access; permission was never denied
by the user. Do not attempt an indirect bypass. Normal browser clicks/keys were
also ineffective in the closed-shadow/game UI; native capture/input timed out.
User screenshots remain valid visible evidence.

## Current build and racing

Observed exact 8abf9be8 once at 16:13:54 UTC. Size38,566,252;
SHA25614074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd.
Read-only acquisition is under `research/compatibility-8abf9be8`.
Base proof: `work-8abf-profile`; forward proof: `work-forward-online-8ab`;
independent memory audit: `work-baseline-verification/8ab-memory-audit.json`.
The eight-module verifier asserts exact complete outputs, with all seven older
outputs identical to v0.37. Unknown future builds still refuse memory tools.

Current native fixtures cover2x pace, zero special corner records, the later
sharp bend retained by48-point local resampling, permission/context/ownership,
Stop and400-tick expiry. No live online corner/race outcome is inferred from it.
Streaming autonomy still lacks travel, selected-host join and return proof.
Never create a replacement lobby when the selected host disappears.

## Stream display contract requested by user

Shift+Insert hides all extension chrome, old Info HUD and public native `#fps`
performance column, while keeping only selected Streaming HUD/rear radar.
It restores the previous controls on second use; F8 opens controls. F7/manual
and F9/Stop remain effective while hidden. Paste in text/editable controls stays
normal. Hiding does not enable/disable driving tools, except cancelling a tuner
before hiding its controls, as prior menu-close behavior required.

Stream HUD and rear radar are independent default-off display choices. Seven
widgets have separate normalized positions and0.6–1.6 scales. Edit HUD layout
enables handles; normal rendering is click-through. Layout has a dedicated local
key and never enters saved driving profiles. The old shell filter was removed
because it created a containing block that prevented a fixed full-viewport HUD.

Final user styling: rear radar has no background, border or padding, a220px
natural width, smaller labels and3px dots. Stream panels show racing statistics
only: session/mode, current speed, track, observed segments, recorded timestamp
spans, distinct tracks, recent run and peak speed. AI ownership/time, pace
requests/acknowledgements and forward-planner inputs are not displayed. Recorded
time is summed valid run timestamp spans, not a continuously verified motion
timer. No wins, finishes or lap times are fabricated.

Rear radar reads a committed, reciprocal and stable native world-car list on
the four exact forward builds. It reports nearest32 behind candidates; UI shows
nearest8. Range50–500 native units; metres are uncalibrated. Positive native
lateral is left and maps to negative SVGx. No peer identity/classification or
all-server visibility claim. Radar caches bind player/car/driver/race/track/
session identity and clear immediately on pause, menu, blur, hidden, Stop or
worker replacement, with no throttled stale distance retention.

Visual verification caught an SVG-specific issue after an initial2300-test pass:
assigning SVGg.hidden=false did not remove its real hidden attribute. The fix
removes/restores the attribute explicitly. The fixture was corrected to model
that browser behavior. The earlier suite artifacts are retained as pre-svg-fix;
only the post-fix canonical result/source lock is valid for packaging.

`artifacts/stream-hud-preview-v038.png` shows synthetic layout readings, including
three actually visible rear dots. Actual IAB UI also verified 100→80% radar
scaling and all edit controls disappearing on finish. Separate isolated Chromium
tests cover20 widget/layout checks. These are UI proofs, not live-game telemetry.

## Packaging and remaining work

Use `integration/deliver-v038.py` after final canonical checks/source lock.
Do not run obsolete tools/prepare-release.cjs. Keep immutable v0.37 ZIP and
backup before writing the same Desktop folder. Final count, exact exclusions,
source/package/native receipts live in verification/*v038*.

Music correction from v0.37 handoff still applies: unwanted alternatives were
removed to Recycle Bin; `Music\nfsu2` has only the exact seven-song wishlist and
source notes. No paid songs purchased/downloaded or purchase budget authorized.
Do not restore substitutes. Original27 EA tracks remain unprovided; do not fake
recognition by renaming unrelated audio.
