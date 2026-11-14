# v0.38.2 continuation — November 10, 2026

Stable target: `C:\Users\Admin\Desktop\NFSU2-Driving-Tools`.
Delivery is established by `verification/package-v0382.json` and the independent
delivery audit, not by this note. Use `integration/deliver-v0382.py` only after the
canonical source lock exists. Never run obsolete `tools/prepare-release.cjs`.

Delivered v0.38.2 after 2407/2407 selected tests passed across 111 files, with
zero failures/skips/cancellations and the same 8 historical exclusions. All 49
production source files were unchanged throughout the canonical suite and match
the strict 9-module native receipt. Desktop 51 files/50 checksum entries verified.
ZIP: `artifacts/NFSU2-Driving-Tools-v0.38.2-Desktop-Folder.zip`, SHA256
`23ec20ebc7fbc6e8ac7180d68dea19965a832574057ec5b12cf3bcf2d385913f`.
Prior folder backup: `artifacts/Desktop-v0.38.1-backup-20261110-before-v0382`.
Public manifest rechecked at 2026-11-10T20:24:44 UTC still advertises 93cfc6e9;
see `research/manifest-at-v0382-delivery.json`. Live reload/racing unverified.

## Reload and testing

The delivered folder is ready, but no live extension reload was observed.
The browser's enforced internal-page restriction prevents the reload click;
do not work around it through native UI, CDP, direct profile editing or another
route. The user previously obtained updated scripts after fully closing Chrome
and reopening the game. Check the displayed version before any live comparison.

## Scope and evidence

The user had not tried v0.38.1 before the next public game build arrived. Do not
reinterpret the new compatibility request as a new observed v0.38.1 regression.
Retain the v0.38.1 investigation and immutable ZIP/receipts.

Current acquired input: `research/compatibility-93cfc6e9/game.wasm`, 38,615,704
bytes, SHA256 `e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03`.
The adjacent acquisition receipt and main.js are retained. Manifest memory
defaults remain 16,384 initial pages, 65,536 max and guestEnd 0x28000000.

Base CF port: `extension/cf-profile.js`, exact SHA256
`8977c19bf52cc94501b55184aef5ad1e27296cd720e8be89aedd543367c9c53b`.
The isolated base proof passed 426 tests. New production CF tests exercise the
actual manifest loader, exact metadata, corruption/size fallback, twelve changed
bodies, unchanged other bodies/sections/imports/exports and untouched skill getter.
See `work-93cf-profile/README.md` and its verification receipts.

The new combined output is 38,660,397 bytes, SHA256
`d110ff2905894159aeb735a3351d3381a9c7ae44408858df1806761be8b9b9af`.
It changes fifteen reviewed original bodies and appends 26 authored helpers,
581 private globals and no function types. Original bodies outside the reviewed
hooks and non-code prefixes remain intact. The full game is compiled, never
instantiated by offline tests. Forward integration proof is retained under
`integration/93cf-forward` and `work-93cf-forward`.

The new build uses bitmap 0x297852f0, lookup 0x28706780, guest-window metadata
0x2978d2f0 and online fields [702897808,705325968,705310588]. The native guest
windows remain unchanged. No bounds are widened to recognize a new hash.

## Corrected stale evaluator guards

The d2fa4f4c, cd5b74d5 and 8abf9be8 authored fwg_slot helper contained two folded
lookup cells from older 3bdd9959. Tests had also filled those stale cells. The
current fixtures clear stale cells; exact guard/load operands are corrected to:

- d2fa4f4c: 678644032 and 678646656.
- cd5b74d5: 678648576 and 678651200.
- 8abf9be8: 678649664 and 678652288.
- New 93cfc6e9: 678652736 and 678655360.

Do not claim every prior complete output is unchanged. Five prior complete
outputs remain byte-identical. The three affected outputs change only their
appended fwg_slot helper; all original native bodies and every other section
remain identical to v0.38.1. The strict versioned verifier reconstructs the
hash-pinned v0.38.1 ZIP and proves the two guard/load substitutions for each
affected helper. The existing 8ab policy-source builder was corrected too.

Strict verifier: `tools/verify-release-modules-v0382.cjs`; receipts:
`verification/native-output-pins-v0382-harvest.json` and
`verification/release-modules-v0382.json`. Preserve earlier versioned receipts.
Canonical suite runner: `integration/run-suite-v0382.cjs`; final result, log,
file list and hash lock are in `verification/*v0382*`. Retain the same eight
documented historical missing-fixture exclusions; do not sum overlapping runs.
The first canonical run had 2406/2407 pass: the existing online-native test
hardcoded the old route-planner index13186 for every profile. Its expectation
now pins93cf to independently verified13185; no production byte changed. The
failed run is preserved under `*v0382-pre-index-expectation-fix*`. The focused
45-case online-native rerun passed before the canonical rerun.

## Retained behavior and limits

Native selected-pace fallback, positive-only optional cap, 512-unit bounded
lookahead on8ab/93cf, original-anchor gradual/75-degree bend analysis, native
grade-dependent planning-table receipt, approach envelope and authored heading
exit rule are retained. Bounds still clip to actual checked road data, with
24 raw anchors, 40 native nodes, 48 display samples and a 2048-byte mailbox.
Native lower/zero/reverse outputs remain authoritative.

Free-roam pace compensation/rebuild and city waiting-owner ceiling are retained;
new forward-node route following is still not enabled in free roam. Radar keeps
the byte-sized blink flag and observes only locally loaded world cars. Street X,
profiles, Drag AI/engine protection, online permission, HUD/hub, compact menu,
Clean View, F7/manual and F9/Stop remain in place.

No new live race, clean lap, win, all-map result, full-route coverage or online
synchronization proof exists. Travel/arrival/parking and selected-host join →
race → return remain unfinished and disabled. Missing hosts must never create
replacement lobbies. Newer full tuner/recorder, live grip/downforce, no-clip and
aircraft remain unverified. S42 candidate remains exact93af only.

## Music recovery is separate

The user supplied `C:\Users\Admin\Downloads\Need for Speed - Underground 2
(USA).zip` (PS2). Preserve this archive and extracted source image. Do not fetch
copyrighted replacement downloads or make purchases; user explicitly declined.

The actual SLUS_210.65 executable names sound\PFData\MusicSFX.mus/.mpf. Their
hashed ZDIR records in ZZDATA3 contain genuine original files. Extracted hashes:
MUS 265,576,064 bytes, `23bdfd9cdb754e1c63733c67f57e3448026012928ae49bf7a4f79003defc4af2`;
MPF 6,840 bytes, `4e86e0c31d4d2871322fb85ff22df4a7bc98e20b75bcd4dae61d16b7684431c8`.
The exact acquired current client picker validator accepts the pair and indexes
43 SCHl streams. Both files are copied into `C:\Users\Admin\Music\nfsu2`, with
destination hashes verified. Automated browser selection was blocked by the
ChatGPT extension's local-file-access setting; it was not bypassed. The user
manually selected the pair, and a fresh read-only DOM snapshot confirmed the
game's `Added.` status and Remove control. See
`research/music-recovery/browser-import-result.json`; this later observation
supersedes the earlier delivery receipt's unverified import status. Audible
native playback remains unverified.
Music assets are excluded from the authored extension ZIP.

The seven custom requests are identified but no audio was downloaded/purchased:
Cocky—Jo Tyler; You're Gonna Go Far, Kid—The Offspring; Mr. Please—Rare Americans;
Nobody Speak—DJ Shadow/Run the Jewels; Numb/Encore; Pop the Trunk—Yelawolf;
Bartender Song—Rehab. Do not restore the rejected substitute pack.
