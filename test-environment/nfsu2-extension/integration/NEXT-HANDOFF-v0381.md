# v0.38.1 continuation — November 10, 2026

Stable target: `C:\Users\Admin\Desktop\NFSU2-Driving-Tools`.
Delivery is established by `verification/package-v0381.json`, not this note.
Use `integration/deliver-v0381.py` after the canonical source lock exists.
Never run obsolete `tools/prepare-release.cjs` (it prepares v0.34).

Delivered0.38.1 after2368/2368 canonical selected tests passed across107 files,
with8 historical missing-fixture exclusions; zero failures/skips/cancellations.
All48 production files were unchanged throughout the final suite and match the
strict native receipt. Desktop50 files/49 checksum entries were verified.
ZIP: `artifacts/NFSU2-Driving-Tools-v0.38.1-Desktop-Folder.zip`, SHA256
`1a8b3c373ee0002ddad30f22b29521f2de8a42e7a0d8dd07830c48c112d45bdc`.
Prior folder backup: `artifacts/Desktop-v0.38.0-backup-20261110-before-v0381`.
Live extension reload/game outcome remains unverified.

## Report and established causes

User reported severe slowdown, stopped driving, poor race results, free-roam
corner collisions and radar unknown in both solo/online. Fresh input is
`C:\Users\Admin\Downloads\nfsu2-driving-tools-diagnostics (29).json`, exporter
0.38.0, track4014. Compact timeline is under
`work-baseline-verification/diagnostics29-timeline.json`.

During active samples the AI remained owned, but requested2x became0.75–0.95x.
There were zero usable native corner records. The legacy JS policy capped
missing coverage at1x, compounded partial heading-ray clearance reductions,
and recovered0.10x/s. Native reverse/recovery was also present. The actual
stopped samples during blur correctly released ownership; this is distinct
from the pacing policy. Forward state was unknown/samples0 in this log.

An independent exact-native witness reproduced a different defect: every
preview endpoint was treated as a stop, causing straight184 target180→30.75,
short16→5.36, and a compressed checked tail→0 while still owned. Original
release source and proof remain in `work-forward-stall/released-v038`.

## Production changes

- Ordinary-race page requests `nativeFallback:true` from dynamic Pacing.
  Selected native pace is retained on missing optional records; approximate
  wall/car rays stay diagnostic in races. City pacing retains its old policy.
- Page passes `applyTarget:'native-policy'` and native corner/braking settings.
  Exact8ab uses a fresh native policy receipt; older3 forward profiles return
  observed/read-only. A publisher canonicalizes/recomputes from the receipt.
- Exact8ab native sampler binds grade/ride/type/selector/tables/window/receipt
  to a short final-target lease. It never invokes lazy grade255 initialization.
  Grade255 returns native failure10 and no optional cap. No global skill-byte
  overwrite is shipped.
- Native plan uses original selected road anchors, native grade-dependent grip
  and braking tables, gradual/accumulated75-degree bends and backward approach
  envelopes. Interpolated display points do not create extra knot curvature.
  Passing a vertex does not establish exit; outgoing heading within15degrees
  releases a past apex. This exit rule and raw-knot policy are authored.
- Exact8ab maximum horizon512, clipped to actually selected checked anchors.
  Same2048-byte mailbox,24 raw-anchor/40 checked-node budgets. Short cache200
  remains200; exhausting24 anchors can clip to230. A bend at450 still constrains
  when the48-point display preview ends earlier. Other3 forward builds retain
  max184. This is bounded lookahead, not a complete race route.
- All4 forward native emitters normalize network markers to booleans for
  independent permission guards, and reject optional cap<=0/nonfinite. Native
  lower/zero/reverse results remain authoritative.
- Free-roam command1 compensates selected high pace and rebuilds cached corner
  caps once when that planning pace changes. Runtime<=1 shares plan100 and
  original behavior. City waiting-owner holds<=1 to avoid acquisition oscillation.
  New native forward node lookahead is NOT enabled for free roam.
- Radar local/peer CAR_BLINKOUT+0x998 is a byte, previously read as a dword;
  adjacent nonzero bytes falsely rejected visible cars. Pointer/commitment/list
  and freshness guards remain. Live cause/result still requires verification.
- Bounded forwardFailureCode1..10 reaches diagnostics, clears on Stop and is
  integer-only. No raw failure text, pointers or peer identity is persisted.

## Verification and immutable history

Canonical suite runner: `integration/run-suite-v0381.cjs`.
Canonical log/list/result/source lock use `verification/*v0381*`.
The initial2363-test run had two old-behavior expectation failures; it is
preserved under `*v0381-pre-expectation-fix*`. The city fixture now starts at
the page's city ceiling while retaining saved3, and native-fallback assertions
replace the old coverage ceiling. Real native bridge tests additionally cover
owned3→city1→0.75 with one rebuild and stable subsequent requests.

Strict eight-module verifier: `tools/verify-release-modules-v0381.cjs`.
Receipt: `verification/release-modules-v0381.json`, source-hash bound and
verifier-hash bound. Current complete8ab output38,610,945 bytes:
`e84454f29b90bf0b03265b4fe242e26079fab1c131537b5d1cf59fc384afb8d5`.
Current26 helpers/581 private globals; other forward builds22/571. All original
bodies/sections outside explicit hooks and exact authored append are compared.
The pre512 verifier/receipts remain under `*v0381-pre512*`; original0.38 ZIP,
source lock, native receipt and tool are preserved. Do not overwrite artifacts
to imply a different source was tested. The same8 historical missing-fixture
test-file exclusions remain explicit; do not sum overlapping focused runs.

Public manifest rechecked17:48:38UTC still8abf9be8/38,566,252/tokenFAdFB6hNQzZWEP6uOo-tgP.
Receipt `research/compatibility-8abf9be8/manifest-freshness-v0381.json`.
Module bytes were not downloaded again; original hash stays
`14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd`.

## Still pending

Live reload, car readings, clean corners, race finishes/wins and all-map outcomes
are unverified. Computer Use was explicitly stopped by physical Escape; it was
not resumed. Chrome internal extension URLs are also denied by enforced tool
policy despite user authorization. Do not bypass with native/CDP/indirect calls.
Prior updates only visibly loaded after closing/reopening Chrome. Known latest
inventory was browser5/tab1027793126; query fresh inventory on an allowed new
computer-use session before reusing handles.

Free-roam node lookahead needs a distinct proof for mode2/type0/command1,
captured mode/type binding, native query and lease guards. Native0x428030
has a type0/7 maintenance branch and common private route layout, but existing
forward Probe/context/setter deliberately restrict mode1/type1/command3.
Do not merely broaden one page predicate; keep Outrun7 excluded.

Skill254 research: signed-2 selects speed table0. Preferred isolated candidate
in `work-skill8ab-candidate` returns9 only at pinned speed-caller return0x41c9c9,
preserving record254 and all other virtual consumers.76 isolated tests passed.
It is NOT shipped; broad sentinel semantics remain unknown. Do not relabel
raw254 as a live effective-skill acknowledgement.

Travel/parking/selected-host join→race→return, AI-filled hosted-lobby adapter,
complete route capture, newest tuner/S42 port, live grip/downforce/no-clip and
aircraft remain unfinished. Never create a replacement disappeared lobby.
Unwanted music remains removed; Music\nfsu2 has wishlist/source notes only.
User explicitly rejected purchases. No requested tracks have been downloaded.
