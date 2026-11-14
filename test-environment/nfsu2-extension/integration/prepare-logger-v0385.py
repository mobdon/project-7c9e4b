from pathlib import Path
import hashlib
import json
import shutil

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent/'work-collision-v0383'
for name in ['manifest.json','page.js','popup.html']:
    p=ROOT/'extension'/name
    text=p.read_text(encoding='utf-8')
    assert '0.38.4' in text
    p.write_text(text.replace('0.38.4','0.38.5'),encoding='utf-8')
p=ROOT/'tests/package-release.test.cjs'
text=p.read_text();assert '0.38.4' in text
p.write_text(text.replace('0.38.4','0.38.5'),encoding='utf-8')
p=ROOT/'extension/README.md'
text=p.read_text(encoding='utf-8').replace('experimental v0.38.4','experimental v0.38.5',1)
intro="""
This is a diagnostics update. Racing behavior and all ten complete native patch outputs remain unchanged from v0.38.4. A separate 250 ms driving trace retains up to 480 samples under a 384 KiB budget, with current settings/build on every sample, actual timing gaps, clipping and explicit nulls for missing values. Native target, throttle, brake, steering, pace request/application and corner-record coverage are sampled separately. Street X and other mode flags are explicit. When the forward planner runs, the trace includes its limiting bend distance/angle/curve and entry targets, assumptions and rejection reason. These are best-effort observations and requests, not proof of applied braking, collision detection or a race result.

Trace persistence has a separate two-second checkpoint to limit synchronous storage work. Menus and repeated stopped-worker errors do not continuously evict the previous race. Export the local crash log after the relevant run; its raceTrace columns describe every row and its coverage section reports what was retained. The original event log and older historical samples remain separately available. Street X pacing/zero-record behavior and missed corners are still being investigated; this build does not claim to fix them. The experimental branch-only skill candidate is not included.
"""
text=text.replace('\n\nThis update supports','\n'+intro+'\nThis update supports',1)
p.write_text(text,encoding='utf-8')
p=ROOT/'extension/CHANGELOG.md'
text=p.read_text(encoding='utf-8')
text=text.replace('# Changelog\n','# Changelog\n\n## 0.38.5 — driving trace and explicit diagnostic availability\n\n- Adds a bounded 250 ms trace independent of the small event/history buffers, with settings/build per row, null unavailable values and actual retention/gap/missing-field coverage. Separate same-tab storage checkpoints at two seconds limit synchronous work.\n- Records actual native road target and existing control outputs, separate native pace mailbox facts, explicit Street X flags and bounded command2 corner-record coverage. Every read retains its ownership/layout/range guards.\n- Exposes the current forward plan limiting constraint and assumptions as read-only diagnostics; no world coordinates or memory pointers are exported. Requests are never promoted to native application or live verification.\n- Reports fixed producer/read status and failure codes; repetitive idle errors and menus preserve prior race trace.\n- All native hooks, pace formulas, route choices, saved profiles and ten complete native outputs remain unchanged from0.38.4. Live trace export and race outcomes remain unverified.\n',1)
p.write_text(text,encoding='utf-8')

# Preserve every older verifier and receipt used by the strict compile proof.
for name in ['release-modules-v0382.json','release-modules-v0381.json','release-modules.json']:
    shutil.copy2(BASE/'verification'/name,ROOT/'verification'/name)
old=(ROOT/'tools/verify-release-modules-v0384.cjs').read_text()
text=old.replace('v0384','v0385').replace('0.38.4','0.38.5')
historic={
    'tools/verify-release-modules-v0384.cjs':hashlib.sha256((BASE/'tools/verify-release-modules-v0384.cjs').read_bytes()).hexdigest(),
    'verification/release-modules-v0384.json':hashlib.sha256((BASE/'verification/release-modules-v0384.json').read_bytes()).hexdigest(),
}
addition='const historical={\n'+''.join(' '+json.dumps(k)+':'+json.dumps(v)+',\n' for k,v in historic.items())
assert text.count('const historical={\n')==1
text=text.replace('const historical={\n',addition)
anchor="preserveHistorical();const sourceHashes=sources();"
text=text.replace(anchor,anchor+"const priorV0384=JSON.parse(fs.readFileSync(path.join(root,'verification/release-modules-v0384.json'),'utf8'));for(const row of priorV0384.modules)assert.equal(outputPins[row.revision],row.outputSha256,'All ten previous native pins unchanged');")
(ROOT/'tools/verify-release-modules-v0385.cjs').write_text(text,encoding='utf-8')
suite=(ROOT/'integration/run-suite-v0384.cjs').read_text().replace("tag='v0384'","tag='v0385'").replace("'release-summary-v0382.json'","'release-summary-v0384.json'").replace("version:'0.38.4'","version:'0.38.5'")
(ROOT/'integration/run-suite-v0385.cjs').write_text(suite,encoding='utf-8')
print(json.dumps({'version':'0.38.5','candidate':str(ROOT),'nativeOutputsExpectedUnchanged':10}))
