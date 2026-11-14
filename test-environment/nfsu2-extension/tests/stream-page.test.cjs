'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=require.resolve('./core.test.cjs'),baseRequire=createRequire(file),context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,URL,Blob,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.makeStreamFixture=pageFixture;',context,{filename:file});
const profile=require('../extension/abf-profile.js'),Core=require('../extension/core.js'),Profiles=require('../extension/tool-profiles.js');
const STREAM='nfsu2-driving-tools-stream-hud-v1',RADAR='nfsu2-driving-tools-rear-radar-v1',LAYOUT='nfsu2-driving-tools-hud-layout-v1';
const copy=f=>Buffer.from(new Uint8Array(f.memory.buffer));
const HUD=require('../extension/stream-hud.js');
const sample=()=>({available:true,rangeNative:200,cars:[{distanceNative:25,behindNative:20,lateralNative:15,classification:'unknown'}],nearest:null,truncated:false});
function clean(f){let prevented=false;f.fire({type:'keydown',code:'Insert',shiftKey:true,isTrusted:true,composedPath:()=>[],preventDefault(){prevented=true;}});assert.equal(prevented,true);}
async function fixture(options={}){
 const calls=[],rearRadar=options.rearRadar||{observe(engine,state,settings){calls.push({engine,state:{...state},settings});return sample();}};
 const f=await context.makeStreamFixture(options.saved||null,true,options.withDyno===true,{profile,revision:profile.revision,rearRadar,...options});
 f.run();return Object.assign(f,{radarCalls:calls});
}

test('viewer meter runs with the HUD hidden and shows current free-roam speed, gear and RPM without AI ownership',async()=>{
 let meter;const f=await fixture({streamHud:{...HUD,createSession(){return meter=HUD.createSession();}}});
 f.put(0x89e7a0,4000);f.d.setFloat32(f.car+0x430,20,true);f.d.setFloat32(f.car+0x440,5500,true);f.put(f.car+0x434,4);f.run(8);
 assert(meter.snapshot().driveMilliseconds>0);assert.equal(meter.snapshot().peakNativeSpeed,20);assert.equal(f.nodes['stream-hud'].hidden,true);assert.equal(!!f.prefs().ai,false);
 f.change('stream-hud-enable',true);f.run(6);assert.equal(f.nodes['stream-speed'].textContent,'44');assert.equal(f.nodes['stream-gear'].textContent,'3');assert.equal(f.nodes['stream-rpm'].textContent,'5500');assert.equal(f.nodes['stream-context'].textContent,'Bayview');assert.equal(f.nodes['stream-pace'].textContent,'44 MPH');
 const atPause=meter.snapshot().driveMilliseconds;f.hidden(true);f.run(20);assert.equal(meter.snapshot().driveMilliseconds,atPause);f.hidden(false);f.run();assert.equal(meter.snapshot().driveMilliseconds,atPause);f.run();assert(meter.snapshot().driveMilliseconds>atPause);
});
test('display preferences persist under separate keys and never change selected driving settings, saved profiles or guest memory',async()=>{
 const f=await fixture();f.change('ai',true);f.change('nos',true);f.input('profile-name','Existing drive settings');f.click('profile-save');await new Promise(r=>setImmediate(r));
 const prefs=JSON.stringify(f.prefs()),stored=f.profileStorage.get(Profiles.KEY),before=copy(f),stops=f.aiLog.stops;
 f.change('stream-hud-enable',true);f.change('rear-radar-enable',true);f.input('radar-range',325);f.change('hud-layout-enable',true);clean(f);
 assert.equal(JSON.stringify(f.prefs()),prefs);assert.equal(f.profileStorage.get(Profiles.KEY),stored);assert.deepEqual(copy(f),before);assert.equal(f.aiLog.stops,stops);assert.equal(f.sessions.get(STREAM),'1');assert.deepEqual(JSON.parse(f.sessions.get(RADAR)),{enabled:true,range:325});assert.equal(f.nodes['hud-layout-enable'].checked,false);assert.equal(f.profileStorage.has(LAYOUT),false);
 const sessionStorage={getItem:key=>f.sessions.get(key)??null,setItem:(key,value)=>f.sessions.set(key,String(value)),removeItem:key=>f.sessions.delete(key)};
 const again=await fixture({saved:f.stored(),sessionStorage,profileStorage:f.profileStorage});assert.equal(again.nodes['stream-hud-enable'].checked,true);assert.equal(again.nodes['rear-radar-enable'].checked,true);assert.equal(Number(again.nodes['radar-range'].value),325);assert.equal(again.nodes['hud-layout-enable'].checked,false);assert.equal(again.nodes['tools-panel'].hidden,true);assert.equal(again.nodes.min.hidden,false);assert.equal(again.nodes.ai.checked,false);
});
test('clean view temporarily hides native debug CSS and every tool surface while restoring unrelated document styles and prior hub state',async()=>{
 const f=await fixture({raceHub:require('../extension/race-hub.js'),raceCatalog:require('../extension/race-catalog.js')}),existing={untouched:true};f.documentStylesheets().push(existing);f.change('stream-hud-enable',true);f.change('rear-radar-enable',true);f.click('race-hub-open');assert.equal(f.nodes['race-hub'].hidden,false);
 const before=copy(f),prefs=JSON.stringify(f.prefs());clean(f);
 for(const id of ['min','quick-stop','race-hub-open','tools-panel','info-hud','race-hub'])assert.equal(f.nodes[id].hidden,true,id);
 assert.equal(f.nodes['stream-hud'].hidden,false);assert.equal(f.nodes['stream-widget-radar'].hidden,false);assert.equal(f.documentStylesheets().length,2);assert.equal(f.documentStylesheets()[0],existing);assert.equal(f.documentStylesheets()[1].css,'#fps{display:none!important}');
 clean(f);assert.equal(f.nodes['race-hub'].hidden,false);assert.equal(f.nodes.min.hidden,false);assert.equal(f.documentStylesheets().length,1);assert.equal(f.documentStylesheets()[0],existing);assert.equal(JSON.stringify(f.prefs()),prefs);assert.deepEqual(copy(f),before);
});
test('read-only radar is wired to the actual current Engine/hash/range online and disabled radar never scans',async()=>{
 const f=await fixture();f.put(Core.A.MODE,8);f.drive(2);f.run(8);assert.equal(f.radarCalls.length,0);f.change('rear-radar-enable',true);f.run(6);
 const last=f.radarCalls.at(-1);assert.ok(last.engine instanceof Core.Engine);assert.equal(last.engine.memory,f.memory);assert.equal(last.state.network,true);assert.equal(last.settings.verified,true);assert.equal(last.settings.moduleHash,profile.hash);assert.equal(last.settings.range,200);assert.equal(!!f.prefs().online,false);assert.equal(f.nodes['radar-dot-0'].hidden,false);assert.equal(f.nodes['radar-nearest'].textContent,'25 away');
 f.input('radar-range',325);f.run(6);assert.equal(f.radarCalls.at(-1).settings.range,325);const count=f.radarCalls.length;f.change('rear-radar-enable',false);f.run(8);assert.equal(f.radarCalls.length,count);assert.equal(f.nodes['stream-widget-radar'].hidden,true);
});
test('radar backend is never sampled without a verified active focused driving context',async()=>{
 for(const options of [{verified:false},{rearRadar:{observe(){throw Error('unexpected radar scan');}}}]){
  const f=await fixture(options);if(options.verified!==false)f.put(f.race,6);f.change('rear-radar-enable',true);assert.doesNotThrow(()=>f.run(6));assert.equal(f.nodes['radar-dot-0'].hidden,true);
 }
 for(const pause of [f=>f.focus(false),f=>f.hidden(true),f=>f.gameDialog(true),f=>f.put(f.race,6),f=>f.put(Core.A.FLOW,3)]){
  const f=await fixture();pause(f);f.change('rear-radar-enable',true);f.run(6);assert.equal(f.radarCalls.length,0);assert.equal(f.nodes['radar-dot-0'].hidden,true);
 }
});
for(const[label,suspend]of [['blur',f=>f.focus(false)],['hidden tab',f=>f.hidden(true)],['worker module replacement',f=>f.worker.postMessage({mod:new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0])),memory:f.memory,slot:0})]])test('a current radar observation clears immediately on '+label,async()=>{
 const f=await fixture();f.change('rear-radar-enable',true);f.run(6);assert.equal(f.nodes['radar-dot-0'].hidden,false);suspend(f);assert.equal(f.nodes['radar-dot-0'].hidden,true);assert.equal(f.nodes['radar-nearest'].textContent,'Waiting for cars');
});
test('a previously observed rear distance clears in the first tick that driving/game-menu context becomes invalid',async()=>{
 for(const pause of [f=>f.put(f.race,6),f=>f.gameDialog(true),f=>f.put(Core.A.FLOW,3)]){const f=await fixture();f.change('rear-radar-enable',true);f.run(6);assert.equal(f.nodes['radar-dot-0'].hidden,false);pause(f);f.run();assert.equal(f.nodes['radar-dot-0'].hidden,true);assert.equal(f.nodes['radar-nearest'].textContent,'Waiting for cars');}
});
test('a rear distance from a replaced player car is discarded before rendering the replacement context',async()=>{
 let initialCar=null;
 const f=await fixture({rearRadar:{observe(_engine,state){initialCar??=state.car;const distance=state.car===initialCar?25:80;return {available:true,rangeNative:200,cars:[{distanceNative:distance,behindNative:distance,lateralNative:0}],truncated:false};}}});
 f.change('rear-radar-enable',true);f.run(6);assert.equal(f.nodes['radar-nearest'].textContent,'25 away');
 const nextCar=0xe30000;new Uint8Array(f.memory.buffer).copyWithin(nextCar,f.car,f.car+0x9e4);f.put(f.player+4,nextCar);f.run();
 assert.notEqual(f.nodes['radar-nearest'].textContent,'25 away');assert.equal(f.prefs().ai,false);
});
test('stream telemetry is invalidated synchronously on F9 while clean-view display selections remain presentation-only',async()=>{
 const f=await fixture();f.change('stream-hud-enable',true);f.change('rear-radar-enable',true);f.run(6);assert.equal(f.nodes['radar-dot-0'].hidden,false);clean(f);f.press('F9');assert.equal(f.nodes.min.hidden,true);assert.equal(f.nodes['stream-hud-enable'].checked,true);assert.equal(f.nodes['rear-radar-enable'].checked,true);assert.equal(f.nodes['radar-dot-0'].hidden,true);assert.equal(f.nodes['stream-speed'].textContent,'—');f.press('F8');assert.equal(f.nodes['tools-panel'].hidden,false);assert.equal(f.nodes.min.hidden,false);
});
test('production shell has no filter containing block for full-viewport fixed stream widgets and layout stores only its dedicated key',()=>{
 const page=fs.readFileSync(require.resolve('../extension/page.js'),'utf8'),layout=fs.readFileSync(require.resolve('../extension/hud-layout.js'),'utf8');
 assert.match(page,/\.shell\{[^}]*filter:none/);assert.match(page,/__NFSU2_HUD_LAYOUT__\?\.create\(ui,\{storage:layoutStorage\}\)/);assert.match(layout,/nfsu2-driving-tools-hud-layout-v1/);assert.doesNotMatch(layout,/nfsu2-driving-tools-(?:profiles|v1|stream-hud-v1|rear-radar-v1)/);
});
