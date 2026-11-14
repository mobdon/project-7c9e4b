'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=path.join(root,'extension'),python=process.env.NFS_PYTHON||'python3';
const read=n=>fs.readFileSync(path.join(source,n),'utf8');
test('release retains every original script in order and adds only reviewed scripts',()=>{
 const manifest=JSON.parse(read('manifest.json')),scripts=manifest.content_scripts[0].js;
 const retained=['diagnostics.js','walls.js','cars.js','current-profile.js','latest-profile.js','next-profile.js','signatures.js','signature-profile.js','signature-profile-latest.js','signature-profile-next.js','dyno-native-profile.js','dyno-native.js','ai.js','core.js','dyno-core.js','dyno.js','dyno-evaluator.js','dyno-full.js','tool-profiles.js','page.js'];
 let at=-1;for(const name of retained){const next=scripts.indexOf(name);assert(next>at,name);at=next;}
 assert.deepEqual(scripts.filter(n=>!retained.includes(n)),['modern-profile.js','d2fa-profile.js','cd5-profile.js','abf-profile.js','cf-profile.js','aa-profile.js','tuner-profile-943.js','family-profiles.js','dyno-native-profile-943.js','race-capture-config.js','race-window-geometry.js','race-capture.js','forward-native-config.js','rear-radar.js','forward-native-patcher.js','route-probe.js','forward-geometry.js','forward-pacing.js','forward-clamp.js','forward-driving.js','shortcut-policy.js','native-rubberband.js','native-corner-target.js','paced-catchup.js','race-catalog.js','race-telemetry.js','race-stats.js','race-hub.js','dynamic-pacing.js','city-contact-preview.js','city-pacing.js','stream-hud.js','hud-layout.js','rubberband-controller.js','paced-catchup-controller.js','autonomy-road.js','autonomy-drive.js','autonomy-hosted.js','autonomy-loop.js']);
 assert(scripts.indexOf('race-capture.js')<scripts.indexOf('ai.js'));assert(scripts.indexOf('dynamic-pacing.js')<scripts.indexOf('page.js'));
 assert(scripts.indexOf('native-rubberband.js')<scripts.indexOf('native-corner-target.js'));assert(scripts.indexOf('native-corner-target.js')<scripts.indexOf('ai.js'));assert(scripts.indexOf('rubberband-controller.js')<scripts.indexOf('page.js'));
 assert.equal(manifest.version,'0.38.12');assert.equal(manifest.permissions,undefined);assert.equal(manifest.background,undefined);assert.equal(manifest.content_scripts[0].world,'MAIN');assert.deepEqual(manifest.content_scripts[0].matches,['https://nfsu2.xyz/*']);
 for(const n of scripts)assert(fs.statSync(path.join(source,n)).isFile());
 assert.match(read('page.js'),/version:'0\.38\.12'/);assert.match(read('page.js'),/class="version">0\.38\.12</);assert.match(read('diagnostics.js'),/version='0\.38\.12'/);assert.match(read('popup.html'),/class="version">v0\.38\.12</);
 assert.match(read('README.md'),/Unattended streaming autonomy remains unfinished\./);assert.match(read('page.js'),/id="quick-stop"/);
});
test('stable desktop archive is canonical, authored-only, checksummed and refuses overwrite',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nfsu2-v034-package-'));
 try{
  const run=output=>spawnSync(python,[path.join(root,'tools/package-release.py'),'--source',source,'--output',output,'--layout','desktop-folder'],{encoding:'utf8'});
  const one=path.join(tmp,'one.zip'),two=path.join(tmp,'two.zip');const first=run(one);assert.equal(first.status,0,first.stderr||String(first.error));const report=JSON.parse(first.stdout);
  assert.equal(report.version,'0.38.12');assert.equal(report.files.length,66);assert(report.files.every(n=>/^NFSU2-Driving-Tools\/[A-Za-z0-9_.-]+$/.test(n)));assert(!report.files.some(n=>/\.(wasm|wat|exe|bin)$/i.test(n)));
  assert(report.files.includes('NFSU2-Driving-Tools/PACKAGE-CHECKSUMS.json'));assert(report.files.includes('NFSU2-Driving-Tools/UPDATE-WINDOWS.txt'));
  assert.equal(run(two).status,0);assert.deepEqual(fs.readFileSync(one),fs.readFileSync(two));const before=fs.readFileSync(one);assert.notEqual(run(one).status,0);assert.deepEqual(fs.readFileSync(one),before);
  const check='import json,hashlib,zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); p="NFSU2-Driving-Tools/"; r=json.loads(z.read(p+"PACKAGE-CHECKSUMS.json")); assert r["folder"]=="NFSU2-Driving-Tools"; assert r["extension_version"]=="0.38.12"; assert all(i.date_time==(1980,1,1,0,0,0) for i in z.infolist()); assert all(hashlib.sha256(z.read(p+n)).hexdigest()==m["sha256"] and len(z.read(p+n))==m["bytes"] for n,m in r["files"].items()); print("verified")';
  const checked=spawnSync(python,['-c',check,one],{encoding:'utf8'});assert.equal(checked.status,0,checked.stderr||String(checked.error));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
