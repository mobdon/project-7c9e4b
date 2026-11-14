'use strict';
const fs=require('node:fs'),path=require('node:path');
const extension=path.resolve(__dirname,'../extension'),version='0.34.0';
const manifestPath=path.join(extension,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
manifest.version=version;
manifest.description='Guarded native race AI, clearance-aware adaptive pace, Drag protection and compact driving tools. Experimental; travel is unfinished.';
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
for(const file of ['page.js','diagnostics.js','popup.html']){
 const target=path.join(extension,file);let text=fs.readFileSync(target,'utf8');
 text=text.replaceAll("version:'0.33.0'","version:'"+version+"'").replaceAll("version='0.33.0'","version='"+version+"'").replaceAll('class="version">0.33.0<','class="version">'+version+'<').replaceAll('class="version">v0.33.0<','class="version">v'+version+'<');
 fs.writeFileSync(target,text);
}
const readmeFile=path.join(extension,'README.md'),readme=fs.readFileSync(readmeFile,'utf8');
if(!readme.startsWith('# NFSU2 Driving Tools: experimental v0.34.0')){
 const intro=`# NFSU2 Driving Tools: experimental v0.34.0

This update improves native race pacing and adds support for exact game build **3bdd9959**. It is an offline-verified test build. **It is not ready for unattended streaming autonomy.** Destination travel, reliable arrival/parking and a live join → race → return loop remain unfinished. No clean lap, win or collision reduction is claimed.

## What changed

- Adaptive road-race pace now has a separate live request. It can slow without repeatedly releasing/rebuilding the native AI route. The selected straight ceiling stays separate from the live request and its native acknowledgement.
- The existing wall/vehicle reader supplies approximate forward distance. The controller uses speed, a provisional braking assumption and a reaction margin for additional pace reduction, then restores pace gradually. This is a requested factor, not a physical speed cap or a collision-avoidance guarantee.
- Zero current corner records means **unknown coverage**. Historical hook hits and an empty obstacle scan cannot authorize the extra adaptive boost. On the reported 28-node/zero-corner path, the adaptive request stays at or below normal 1×, with additional clearance reductions down to the existing 0.75× limit.
- A visible **STOP / TAKE CONTROL** button remains available while the compact menu is closed. F7 and F9 retain their existing roles.
- On exact **93af6ccb**, the tuner accepts validated, committed snapshot sources in the verified second guest-memory window. Runtime gaps, invalid pages, live write destinations and ownership checks remain guarded. This addresses a reproduced S42 compatibility case; the user's live S42 outcome is unverified.
- Optional offline native route recording on **93af6ccb** analyzes fresh sampled chords, including gradual same-direction bends and 75°+ heading changes. It is read-only apart from its request mailbox, off by default and exports locally. It does not supply missing corner coordinates or a complete real race route. See RACE-CAPTURE.md.

## Current build compatibility

| Exact build | Racing tools | Full tuner | Native route recorder | Autonomous travel |
|---|---|---|---|---|
| 3bdd9959 | Reviewed native AI/pace/corners, Street X, Drag protection, NOS and contact hooks | Unavailable: current native tuning behavior requires a separate evaluator port | Unavailable | Unfinished; disabled |
| 93af6ccb | Retained, plus revised adaptive pacing | Includes guarded S42 compatibility candidate | Optional offline partial capture | Unfinished; disabled |
| 78e2bb69 / 2f0ddd3b / 6f4f1e4e | Retained supported features and existing build-specific limits | Existing build-specific support | Unavailable | Unfinished; disabled |

Unknown or changed binaries still refuse memory tools. The new profile does not enable the old tuner or recorder on an unproved build. Grip/downforce multipliers and online no-clip are not presented as live fixes.

## Testing the racing update

Keep your established Street X settings. For an ordinary road race, select Automatic driver or Race-only automatic driver, then optionally Adaptive road-race speed. Online use needs the existing separate Allow network tools choice. Start conservatively with the existing 1.30× ceiling, 0.80 corner factor and 0.75 braking factor; selected values remain your choices.

The HUD distinguishes selected ceiling, live requested factor, native acknowledgement, missing coverage and clearance reductions. It does not report a successful corner simply because a hook ran. The obstacle reader uses center projections and barrier-line intersections; vehicle extents, splines, crests, banking and unobserved geometry remain incomplete.

Saved-profile keys/schema, the existing HUD, compact controls, Drag AI/engine protection, Street X and online permission guards are preserved. The optional adaptive choice and route recorder remain session-only and default off. No new browser permissions, game-save writes or streaming-platform integration are added.

## Verification limits

Fresh local tests exercise the actual authored hooks against hash-pinned native functions and controlled dependencies, plus page lifecycle, saved profiles, HUD and packaging. The native game modules and private extracts are research inputs and are excluded from the desktop folder. Some historical tuner/Drag/Drift tests require research fixtures intentionally omitted from the handoff; the verification report lists those gaps explicitly.

No game browser was running when checked. This update has not been installed or used for a live race, lobby join, finish, return or unattended broadcast. Historical pass counts in the retained notes below describe their original runs, not this update's live status. See CHANGELOG.md for the current change list.

## Retained v0.33 reference notes

The following detailed feature explanations are historical. Use the current build table and verification limits above. The packaged Windows guide contains the current same-folder update steps.

`;
 fs.writeFileSync(readmeFile,intro+readme.split('\n').slice(1).join('\n'));
}
const changeFile=path.join(extension,'CHANGELOG.md'),changelog=fs.readFileSync(changeFile,'utf8');
if(!changelog.includes('## 0.34.0'))fs.writeFileSync(changeFile,`# Changelog\n\n## 0.34.0 — racing test update\n\n- Adds exact 3bdd9959 native racing/Drag/NOS/contact profile with independently reviewed helper relocations and current native tails preserved. Its full tuner, recorder and travel remain unavailable.\n- Separates bounded adaptive live pace from the cached planning ceiling. Command 3 native corner/braking hooks admit only live pace 0.75× through that ceiling; legacy equality guards stay intact.\n- Uses existing forward barrier/vehicle distances for supplemental reductions and gradual recovery. Zero current corner records withhold the extra boost; historic counters cannot establish coverage.\n- Adds an always-visible Stop/Take Control button, matching existing F9 behavior.\n- Integrates the guarded 93af6ccb S42 second-window snapshot candidate and optional offline partial native-route recorder. No complete route, saved-game persistence or live fix is claimed.\n- Retains working Street X settings, saved-profile schema, HUD, compact menu, Drag engine protection and online guards.\n- Full autonomous travel and join/race/return verification remain unfinished. No aircraft controls, unverified grip/downforce activation or streaming-platform integration.\n- Fresh offline/native/UI checks and exact excluded-fixture reasons accompany the source; live gameplay remains unverified.\n\n`+changelog.replace(/^# Changelog\s*/,''));
console.log(JSON.stringify({version,files:manifest.content_scripts[0].js.length}));
