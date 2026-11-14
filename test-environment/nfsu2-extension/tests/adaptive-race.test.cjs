'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const {adaptiveRaceSettings:select}=require('../extension/core.js');
const accepted={enabled:true,verified:true,ai:true,safe:true,hud:1,raceType:1,ceiling:1.3};
test('adaptive request is default-off, literal, bounded and road-race only',()=>{
 assert.equal(select().state,'off');assert.deepEqual(select(accepted),{requested:true,state:'requested',ceiling:1.3});
 for(const value of [false,0,1,'true',null])assert.equal(select({...accepted,enabled:value}).requested,false);
 for(const value of [NaN,Infinity,-Infinity,0,.99,2.01,'1.3',null])assert.equal(select({...accepted,ceiling:value}).state,'invalid');
 for(const ceiling of [1,1.05,1.3,1.5,2])assert.equal(select({...accepted,ceiling}).requested,true);
 for(const field of ['verified','ai','safe'])for(const value of [false,0,1,'true',null])assert.equal(select({...accepted,[field]:value}).requested,false);
 for(const hud of [0,2,3,99])assert.equal(select({...accepted,hud}).state,'mode');
 for(const raceType of [0,2,3,4,5,6,7,8,9,99,null])assert.equal(select({...accepted,raceType}).state,'mode');
 for(const field of ['drag','drift','streetX'])assert.equal(select({...accepted,[field]:true}).requested,false);
 for(const allowNetwork of [false,0,1,'true',null])assert.equal(select({...accepted,network:true,allowNetwork}).state,'network-permission');
 assert.equal(select({...accepted,network:true,allowNetwork:true}).requested,true);
});
// Real page, Engine, profile store, and local logger. Only browser/worker/AI are doubles.
const file=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(file),ctx={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.fixture=fixture;',ctx,{filename:file});
const profile=require('../extension/next-profile.js'),Profiles=require('../extension/tool-profiles.js');
const actual=(saved=null,opts={})=>ctx.fixture(saved,true,false,{revision:profile.revision,profile,...opts});
const road=f=>{f.put(0x89e7b0,1);f.drive(1);f.change('ai',true);};
const last=f=>f.aiLog.updates.at(-1),data=f=>f.log().events.filter(e=>e.event==='state').at(-1).data;
const plain=v=>JSON.parse(JSON.stringify(v));
function oldSettings(f){f.change('race-pace',true);f.input('race-pace-factor',1.65);f.change('race-corner-assist',true);f.input('race-corner-factor',.85);f.input('race-corner-margin',20);f.input('race-braking',.6);}
function signature(f){const {pace,adaptiveCorners,raceCornerAssist,raceCornerFactor,raceCornerMargin,raceBraking,enabled,allowNetwork,cornerAssist,cornerFactor,cornerMargin,allowDragAI,dragNoBlowout}=last(f);return {pace,adaptiveCorners,raceCornerAssist,raceCornerFactor,raceCornerMargin,raceBraking,enabled,allowNetwork,cornerAssist,cornerFactor,cornerMargin,allowDragAI,dragNoBlowout};}
test('optional UI starts off despite forged saved adaptive fields and old commands are unchanged',async()=>{
 const f=await actual(JSON.stringify({adaptiveRace:true,adaptiveRaceCeiling:2}));road(f);oldSettings(f);f.run(8);
 assert.equal(f.nodes['adaptive-race'].checked,false);assert.equal(last(f).pace,1.65);assert.equal(last(f).raceCornerAssist,true);assert.equal(data(f).adaptiveRaceState,'off');assert.equal(data(f).tools.adaptiveRace,false);assert.equal(data(f).adaptiveRaceCeiling,1.3);
 assert.equal('adaptiveRace' in f.prefs(),false);assert.equal('adaptiveRaceCeiling' in f.prefs(),false);
});
test('eligible request combines constant ceiling and existing native planner controls without changing saved choices',async()=>{
 const f=await actual();road(f);oldSettings(f);f.change('race-corner-assist',false);f.run(8);const prior=f.prefs(),before=Buffer.from(new Uint8Array(f.memory.buffer));
 f.change('adaptive-race',true);f.run(8);assert.equal(last(f).pace,1.3);assert.equal(last(f).adaptiveCorners,true);assert.equal(last(f).raceCornerAssist,true);assert.equal(last(f).raceCornerFactor,.85);assert.equal(last(f).raceCornerMargin,20);assert.equal(last(f).raceBraking,.6);assert.deepEqual(f.prefs(),prior);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);assert.deepEqual(Array.from(f.aiLog.keys),[]);
 assert.equal(data(f).adaptiveRaceRequested,true);assert.equal(data(f).adaptiveRaceState,'pace-pending');assert.equal(data(f).tools.adaptiveRace,true);
 // No per-tick multiplier changes; the native route, not JavaScript, varies target by distance.
 assert.equal(new Set(f.aiLog.updates.slice(-8).map(v=>v.pace)).size,1);
 f.change('adaptive-race',false);f.run();assert.equal(last(f).pace,1.65);assert.equal(last(f).raceCornerAssist,false);assert.deepEqual(f.prefs(),prior);
});
test('actual, forced and online Street X retain exact prior effective commands for both assist selections',async()=>{
 for(const assist of [false,true])for(const mark of [f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>{f.put(0x850078,8);f.put(0x850088,10);f.change('online',true);}]){
  const f=await actual();road(f);oldSettings(f);f.change('race-corner-assist',assist);mark(f);f.run(8);const before=signature(f),prefs=f.prefs();f.change('adaptive-race',true);f.input('adaptive-race-ceiling',2);f.run(8);
  assert.deepEqual(signature(f),before);assert.deepEqual(f.prefs(),prefs);assert.equal(data(f).adaptiveRaceState,'street-x');assert.match(f.nodes['adaptive-race-state'].textContent,/Street X unchanged/);assert.doesNotMatch(f.nodes['hud-pace'].textContent,/Adaptive/);
 }
});
test('excluded free roam, Outrun, Drag, Drift, forced variants and unknown modes retain old commands',async()=>{
 for(const mode of [f=>{f.put(0x89e7b0,0);f.drive(2);},f=>f.put(0x89e7b0,7),f=>f.put(0x89e7b0,99),f=>f.d.setUint8(0x89e7d8,1),f=>f.d.setUint8(0x89e7d9,1),f=>f.put(0x890108,1),f=>f.put(0x890104,1),f=>f.put(0x890114,1)]){
  const f=await actual();road(f);oldSettings(f);f.change('ai-pace',true);f.input('pace-factor',1.45);mode(f);f.run(8);const before=signature(f);f.change('adaptive-race',true);f.run(8);assert.deepEqual(signature(f),before);assert.equal(data(f).adaptiveRaceRequested,false);assert.equal(data(f).adaptiveRaceState,'mode');
 }
});
test('online gating and supported-build checks cannot be bypassed by new toggle',async()=>{
 const f=await actual();road(f);f.put(0x850078,8);f.change('adaptive-race',true);f.run(8);assert.equal(last(f).safe,false);assert.equal(data(f).adaptiveRaceState,'network-permission');
 f.change('online',true);f.run(8);assert.equal(last(f).safe,true);assert.equal(last(f).allowNetwork,true);assert.equal(last(f).pace,1.3);assert.equal(last(f).raceCornerAssist,true);assert.equal(data(f).adaptiveRaceRequested,true);
 f.change('online',false);f.run(8);assert.equal(last(f).safe,false);assert.equal(data(f).adaptiveRaceRequested,false);assert.doesNotMatch(f.nodes['hud-pace'].textContent,/planner observed/);
 for(const opts of [{verified:false},{revision:'2f0ddd3b',profile:require('../extension/current-profile.js')},{profile:{...profile,capabilities:{...profile.capabilities,corner:false}}}]){
  const g=await actual(null,opts);road(g);g.run();assert.equal(g.nodes['adaptive-race'].disabled,true);g.change('adaptive-race',true);g.run(8);assert.equal(g.nodes['adaptive-race'].checked,false);assert.equal(data(g).adaptiveRaceRequested,false);
 }
});
test('race transition applies adaptive only outside Street X and restores previous controls without edits',async()=>{
 const f=await actual();road(f);oldSettings(f);f.change('adaptive-race',true);const prefs=f.prefs();
 for(const street of [false,true,false,true]){f.d.setUint8(0x89e7e3,+street);f.run(8);assert.equal(last(f).pace,street?1.65:1.3);assert.equal(last(f).raceCornerAssist,true);assert.deepEqual(f.prefs(),prefs);assert.equal(data(f).adaptiveRaceRequested,!street);}
});
test('adaptive planner evidence requires matching live pace, current records and both hook observations',async()=>{
 const f=await actual();road(f);f.change('adaptive-race',true);f.run(8);assert.equal(data(f).adaptiveRaceState,'pace-pending');
 Object.assign(f.aiLog,{paceApplied:1.3,cornerMode:3,cornerApplied:.8,cornerHits:0,brakingHits:1});f.run(8);assert.equal(data(f).adaptiveRaceState,'native-fallback');
 f.aiLog.paceApplied=1;f.input('adaptive-race-ceiling',1);Object.assign(f.aiLog,{owned:true,cornerContext:{cornerGuardMask:0,cornerRouteOwned:true,cornerRouteNodes:28,cornerPlannerCorners:2,cornerPlannerUsable:2}});
 f.run(8);assert.equal(data(f).adaptiveRaceState,'native-fallback');
 f.aiLog.cornerHits=3;f.aiLog.brakingHits=0;f.run(8);assert.equal(data(f).adaptiveRaceState,'native-fallback');
 f.aiLog.brakingHits=2;f.run(8);assert.equal(data(f).adaptiveRaceState,'planner-observed');assert.match(f.nodes['hud-pace'].textContent,/1.00× ceiling.*planner observed/);
 f.aiLog.cornerContext.cornerPlannerUsable=0;f.run(8);assert.equal(data(f).adaptiveRaceState,'native-fallback');assert.equal(data(f).cornerPlannerUsable,0);assert.match(f.nodes['hud-pace'].textContent,/native pace.*corner coverage unknown/);
 f.aiLog.cornerContext.cornerPlannerUsable=2;f.run(8);assert.equal(data(f).adaptiveRaceState,'planner-observed');
 f.input('adaptive-race-ceiling',1.5);assert.doesNotMatch(f.nodes['hud-pace'].textContent,/planner observed/);f.run(8);assert.equal(data(f).adaptiveRaceState,'pace-pending');
 f.aiLog.paceApplied=1.5;f.aiLog.cornerApplied=null;f.run(8);assert.equal(data(f).adaptiveRaceState,'native-fallback');
});
test('manual takeover, stop, pause, race finish and session replacement do not retain active evidence',async()=>{
 for(const action of [f=>f.press('F7'),f=>f.press('ArrowLeft'),f=>f.press('F9'),f=>f.focus(false),f=>f.hidden(true),f=>f.put(f.race,6)]){
  const f=await actual();road(f);f.change('adaptive-race',true);f.input('adaptive-race-ceiling',1);Object.assign(f.aiLog,{paceApplied:1,owned:true,cornerMode:3,cornerApplied:.8,cornerHits:3,brakingHits:2,cornerContext:{cornerGuardMask:0,cornerRouteOwned:true,cornerRouteNodes:28,cornerPlannerCorners:2,cornerPlannerUsable:2}});f.run(8);assert.equal(data(f).adaptiveRaceState,'planner-observed');action(f);f.run(8);assert.equal(data(f).adaptiveRaceRequested,false);assert.doesNotMatch(f.nodes['hud-pace'].textContent,/planner observed/);
 }
 const f=await actual();road(f);f.change('adaptive-race',true);f.run();f.press('F9');assert.equal(f.nodes['adaptive-race'].checked,false);f.run(8);assert.equal(data(f).adaptiveRaceState,'off');
 const g=await actual();road(g);g.change('adaptive-race',true);g.run();g.focus(false);g.run();g.focus(true);g.run(8);assert.equal(data(g).adaptiveRaceRequested,true);g.worker.emit({t:'exit'});assert.doesNotMatch(g.nodes['hud-pace'].textContent,/planner observed/);
});
test('ceiling input is bounded and rounded, never added to named profiles or restored on load/reload',async()=>{
 const f=await actual();road(f);oldSettings(f);f.change('adaptive-race',true);
 for(const [input,want] of [['',1.3],['bad',1.3],[NaN,1.3],[Infinity,1.3],[0,1],[5,2],[1.327,1.35],[1.3,1.3]]){f.input('adaptive-race-ceiling',input);f.run(8);assert.equal(last(f).pace,want);assert.equal(data(f).adaptiveRaceCeiling,want);}
 f.input('profile-name','Prior Street X');f.click('profile-save');const saved=JSON.parse(f.profileStorage.get(Profiles.KEY)),record=saved.profiles.at(-1);assert.doesNotMatch(JSON.stringify(record),/adaptiveRace/);assert.equal(record.settings.racePaceFactor,1.65);assert.equal(record.settings.raceCornerFactor,.85);
 f.click('profile-load');assert.equal(f.nodes['adaptive-race'].checked,false);f.run(8);assert.equal(last(f).pace,1.65);assert.equal(data(f).adaptiveRaceState,'off');
 const g=await actual(f.stored(),{profileStorage:f.profileStorage});assert.equal(g.nodes['adaptive-race'].checked,false);g.run(8);assert.equal(data(g).tools.adaptiveRace,false);assert.equal(data(g).adaptiveRaceCeiling,1.3);
});
test('local adaptive diagnostics accept only bounded fields and fixed state labels',()=>{
 const d=require('../extension/diagnostics.js').create();d.record('state',{adaptiveRaceRequested:true,adaptiveRaceState:'planner-observed',adaptiveRaceCeiling:1.3,tools:{adaptiveRace:true,adaptiveRaceCeiling:2}});
 let v=JSON.parse(d.exportText()).events.at(-1).data;assert.deepEqual(v,{adaptiveRaceRequested:true,adaptiveRaceCeiling:1.3,adaptiveRaceState:'planner-observed',tools:{adaptiveRace:true,adaptiveRaceCeiling:2}});
 d.record('state',{adaptiveRaceRequested:'true',adaptiveRaceState:'private data',adaptiveRaceCeiling:3,tools:{adaptiveRace:1,adaptiveRaceCeiling:NaN}});v=JSON.parse(d.exportText()).events.at(-1).data;assert.deepEqual(v,{tools:{}});
});
