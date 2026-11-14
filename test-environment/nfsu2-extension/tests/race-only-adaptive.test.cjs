'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const file=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(file),ctx={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.fixture=fixture;',ctx,{filename:file});
const profile=require('../extension/next-profile.js'),TP=require('../extension/tool-profiles.js'),fixture=()=>ctx.fixture(null,true,false,{revision:profile.revision,profile});
const road=f=>{f.put(0x89e7b0,1);f.drive(1);f.put(f.race,4);},last=f=>f.aiLog.updates.at(-1),state=f=>f.log().events.filter(e=>e.event==='state').at(-1).data;
const arm=f=>{f.change('race-only-ai',true);f.change('adaptive-race',true);},plain=o=>JSON.parse(JSON.stringify(o)),copy=f=>Buffer.from(new Uint8Array(f.memory.buffer));
test('adaptive works with race-only effective request without enabling all-modes AI or changing saved controls',async()=>{
 const f=await fixture();road(f);f.change('race-pace',true);f.input('race-pace-factor',1.6);f.change('race-corner-assist',false);f.input('race-corner-factor',.85);f.input('race-braking',.6);arm(f);const old=f.prefs(),before=copy(f);f.run(8);
 assert.equal(last(f).enabled,true);assert.equal(last(f).pace,1.3);assert.equal(last(f).raceCornerAssist,true);assert.equal(last(f).raceCornerFactor,.85);assert.equal(last(f).raceBraking,.6);assert.equal(f.nodes.ai.checked,false);assert.equal(state(f).raceOnlyRequested,true);assert.equal(state(f).adaptiveRaceRequested,true);assert.deepEqual(f.prefs(),old);assert.deepEqual(copy(f),before);
 f.change('race-only-ai',false);f.run(8);assert.equal(last(f).enabled,false);assert.equal(state(f).adaptiveRaceRequested,false);assert.equal(state(f).adaptiveRaceState,'ai-off');assert.equal(f.nodes['adaptive-race'].checked,true);assert.equal(f.nodes.ai.checked,false);
});
test('combined Street X modes preserve exact old effective commands for both saved assist selections',async()=>{
 for(const assist of [false,true])for(const mark of [f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>{f.put(0x850078,8);f.put(0x850088,10);f.change('online',true);}]){
  const f=await fixture();road(f);f.change('race-only-ai',true);f.change('race-pace',true);f.input('race-pace-factor',1.65);f.change('race-corner-assist',assist);f.input('race-corner-factor',.95);f.input('race-corner-margin',25);f.input('race-braking',1);mark(f);f.run(8);const before=plain(last(f));f.change('adaptive-race',true);f.input('adaptive-race-ceiling',2);f.run(8);assert.deepEqual(plain(last(f)),before);assert.equal(state(f).raceOnlyRequested,true);assert.equal(state(f).adaptiveRaceState,'street-x');assert.doesNotMatch(f.nodes['hud-pace'].textContent,/Adaptive/);
 }
});
test('race-only and adaptive follow same-object roam/race/Drag/Drift/results transitions independently',async()=>{
 const f=await fixture();arm(f);const cases=[{type:0,hud:2,phase:4,request:false,adaptive:false},{type:1,hud:1,phase:3,request:false,adaptive:false},{type:1,hud:1,phase:4,request:true,adaptive:true},{type:1,hud:1,phase:4,drag:1,request:true,adaptive:false},{type:1,hud:1,phase:4,drift:1,request:true,adaptive:false},{type:1,hud:1,phase:6,request:false,adaptive:false},{type:7,hud:1,phase:4,request:false,adaptive:false},{type:1,hud:1,phase:4,request:true,adaptive:true}];
 for(const c of cases){f.put(0x89e7b0,c.type);f.drive(c.hud);f.put(f.race,c.phase);f.d.setUint8(0x89e7d8,c.drag||0);f.d.setUint8(0x89e7d9,c.drift||0);f.run(8);assert.equal(last(f).enabled,c.request,JSON.stringify(c));assert.equal(state(f).adaptiveRaceRequested,c.adaptive,JSON.stringify(c));assert.equal(f.nodes['race-only-ai'].checked,true);assert.equal(f.nodes.ai.checked,false);}
});
test('combined permission withdrawal and held controls cannot leave adaptive or race-only effective',async()=>{
 const f=await fixture();road(f);f.put(0x850078,8);arm(f);f.run(8);assert.equal(last(f).enabled,false);assert.equal(state(f).adaptiveRaceRequested,false);f.change('online',true);f.run(8);assert.equal(last(f).enabled,true);assert.equal(state(f).adaptiveRaceRequested,true);f.change('online',false);f.run(8);assert.equal(last(f).enabled,false);assert.equal(state(f).adaptiveRaceRequested,false);
 f.change('online',true);f.put(0x89e7b0,0);f.drive(2);f.press('ArrowUp');road(f);f.run(8);assert.equal(last(f).enabled,false);assert.equal(state(f).adaptiveRaceRequested,false);f.fire({type:'keyup',code:'ArrowUp',isTrusted:true});f.run(8);assert.equal(last(f).enabled,true);assert.equal(state(f).adaptiveRaceRequested,true);
});
test('manual takeover leaves adaptive dormant while Stop and profile Load clear both new session choices',async()=>{
 const f=await fixture();road(f);arm(f);f.run(8);f.press('F7');f.run(8);assert.equal(f.nodes['race-only-ai'].checked,false);assert.equal(f.nodes['adaptive-race'].checked,true);assert.equal(last(f).enabled,false);assert.equal(state(f).adaptiveRaceRequested,false);
 arm(f);f.press('F9');assert.equal(f.nodes['race-only-ai'].checked,false);assert.equal(f.nodes['adaptive-race'].checked,false);f.input('profile-name','Old schema');f.click('profile-save');const saved=JSON.parse(f.profileStorage.get(TP.KEY)),p=saved.profiles[0];assert.equal('raceOnlyAI' in p.settings,false);assert.equal('adaptiveRace' in p.settings,false);arm(f);f.change('profile-select',p.id);f.click('profile-load');assert.equal(f.nodes['race-only-ai'].checked,false);assert.equal(f.nodes['adaptive-race'].checked,false);f.run(8);assert.equal(last(f).enabled,false);
});
test('combined native pace acknowledgement keeps corner coverage separate and clears on exit',async()=>{
 const f=await fixture();road(f);arm(f);f.run(8);assert.equal(state(f).adaptiveRaceState,'pace-pending');
 f.aiLog.paceApplied=1.3;f.run(8);assert.equal(state(f).adaptiveRaceState,'native-fallback');
 f.aiLog.paceApplied=1;f.run(8);assert.equal(state(f).adaptiveRaceState,'pace-pending');assert.equal(state(f).adaptiveRuntimePace,1.3);
 Object.assign(f.aiLog,{owned:true,cornerMode:3,cornerHits:2,brakingHits:1,cornerApplied:.8,cornerContext:{cornerGuardMask:0,cornerRouteOwned:true,cornerRouteNodes:28,cornerPlannerCorners:0,cornerPlannerUsable:0}});
 f.aiLog.paceApplied=1.3;f.run(8);assert.equal(state(f).adaptiveRaceState,'native-fallback');assert.match(f.nodes['hud-pace'].textContent,/native pace.*corner coverage unknown/);
 f.input('adaptive-race-ceiling',1);f.aiLog.paceApplied=1;f.aiLog.cornerContext.cornerPlannerCorners=2;f.run(8);assert.equal(state(f).adaptiveRaceState,'native-fallback');assert.equal(state(f).cornerPlannerUsable,0);assert.equal(last(f).adaptivePace,1);
 f.aiLog.cornerContext.cornerPlannerUsable=2;f.run(8);assert.equal(state(f).adaptiveRaceState,'planner-observed');assert.match(f.nodes['hud-pace'].textContent,/planner observed/);
 f.worker.emit({t:'exit'});f.click('diagnostic-export');const d=JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;assert.equal(d.raceOnlyRequested,false);assert.equal(d.adaptiveRaceRequested,false);assert.equal(d.paceConfirmed,false);assert.equal(d.adaptiveRuntimePace,undefined);assert.doesNotMatch(f.nodes['race-only-state'].textContent,/Native race AI active/);assert.doesNotMatch(f.nodes['adaptive-race-state'].textContent,/observed/);
});
