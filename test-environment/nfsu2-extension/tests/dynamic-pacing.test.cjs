'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Pacing,clearanceEnvelope}=require('../extension/dynamic-pacing.js');
const {adaptiveRaceSettings}=require('../extension/core.js');
const AI=require('../extension/ai.js'),profile=require('../extension/next-profile.js'),currentProfile=require('../extension/modern-profile.js');
const clear={cars:[],barrierAhead:null};
const evidence={active:true,owned:true,cornerMode:3,cornerGuardMask:0,cornerRouteOwned:true,cornerRouteNodes:28,cornerPlannerCorners:2,cornerPlannerUsable:2,cornerApplied:.8,cornerHits:2,brakingHits:3};
const input={enabled:true,ceiling:2,identity:'race1:car1:driver1:track4715',now:0,evidence,speedMps:60,hazards:clear};

test('road-race native fallback preserves the selected pace on zero-corner routes and partial clearance rays',()=>{
 const p=new Pacing(),missing={...evidence,cornerPlannerCorners:0,cornerPlannerUsable:0,cornerHits:0};
 for(const ceiling of [1,1.3,1.45,2])for(const now of [0,50,300,501,10000,NaN])for(const barrierAhead of [null,0,4.562,26.536,63.445,132.168]){
  const r=p.update({...input,ceiling,now,evidence:missing,hazards:{cars:[],barrierAhead},nativeFallback:true});
  assert.equal(r.pace,ceiling);assert.equal(r.state,'native-fallback');assert.equal(r.currentCorners,false);
 }
 assert.equal(p.update({...input,nativeFallback:true}).state,'native-route');
 assert.equal(p.update({...input,nativeFallback:true,enabled:false}).active,false);
 assert.equal(p.update({...input,nativeFallback:true,ceiling:3}).state,'invalid');
});

test('race fallback never enters city policy without the literal race option',()=>{
 for(const nativeFallback of [undefined,false,1,'true']){
  const r=new Pacing().update({...input,evidence:{},nativeFallback,hazards:{cars:[],barrierAhead:4.562}});
  assert.equal(r.pace,.75);assert.equal(r.state,'clearance-limited');
 }
});
test('28 nodes and zero corners never authorize the logged 2x adaptive boost',()=>{
 const p=new Pacing();for(let now=0;now<10000;now+=250){const r=p.update({...input,now,evidence:{...evidence,cornerPlannerCorners:0,cornerHits:0,brakingHits:401}});assert.equal(r.pace,1);assert.equal(r.state,'coverage-unknown');}
});
test('historical hits cannot authorize boost on an empty current route',()=>{
 const p=new Pacing();assert.equal(p.update({...input,evidence:{...evidence,cornerPlannerCorners:0}}).pace,1);
});

test('tail-only, straight or unvalidated records never authorize boost from historical hits',()=>{
 for(const cornerPlannerUsable of [0,null,undefined,-1,3,1.5,NaN]){
  const p=new Pacing();for(let now=0;now<=10000;now+=250){const r=p.update({...input,now,evidence:{...evidence,cornerPlannerCorners:1,cornerPlannerUsable}});assert.equal(r.pace,1);assert.equal(r.currentCorners,false);}
 }
});
test('current native envelope recovers gradually; clearance reduction is immediate',()=>{
 const p=new Pacing();assert.equal(p.update(input).pace,1);
 for(let now=250;now<=10000;now+=250)p.update({...input,now});
 assert(Math.abs(p.pace-2)<1e-12);
 const r=p.update({...input,now:10250,hazards:{cars:[],barrierAhead:30}});assert.equal(r.pace,.75);assert.equal(r.state,'clearance-limited');
 const recover=p.update({...input,now:10500});assert(recover.pace<=.78);
});
test('braking envelope uses speed, latency, distance margin and nearer in-lane car',()=>{
 const r=clearanceEnvelope({hazards:{barrierAhead:100,cars:[{ahead:50,side:2},{ahead:10,side:8}]},speedMps:20});
 assert.equal(r.distanceM,50);assert.equal(r.source,'vehicle');assert.equal(r.targetMps,Math.sqrt(2*4*(50-8-20*.6)));
 const fast=clearanceEnvelope({hazards:{barrierAhead:50,cars:[]},speedMps:60});assert(fast.targetMps<r.targetMps);
});
test('a high selected ceiling cannot cause acceleration while overspeed for observed clearance',()=>{
 const p=new Pacing();p.update({...input,speedMps:20});
 const r=p.update({...input,now:250,speedMps:20,hazards:{cars:[],barrierAhead:60}});
 assert(r.clearance.targetMps<20);assert(r.pace<1);assert.equal(r.state,'clearance-limited');
});

test('repeated unchanged clearance does not compound a slowdown before the car responds',()=>{
 const p=new Pacing(),sample={...input,evidence:{},speedMps:20,hazards:{cars:[],barrierAhead:60}};
 const expected=clearanceEnvelope(sample).targetMps/20;
 for(let now=0;now<=1000;now+=50){
  const r=p.update({...sample,now});assert.equal(r.state,'clearance-limited');
  assert.equal(r.pace,Math.round(expected*100)/100);assert(Math.abs(p.pace-expected)<1e-12);
 }
});

test('only an explicit city selection retains the user native pace without route evidence',()=>{
 for(const ceiling of [.75,1,1.75,2,3]){
  const p=new Pacing();for(let now=0;now<=1000;now+=50){
   const r=p.update({...input,ceiling,evidence:{},nativePaceSelected:true,now});
   assert.equal(r.pace,ceiling);assert.equal(r.state,'selected-native');assert.equal(r.currentCorners,false);
  }
 }
 for(const nativePaceSelected of [undefined,false,1,'true'])assert.equal(new Pacing().update({...input,evidence:{},nativePaceSelected}).pace,1);
 assert.equal(new Pacing().update({...input,ceiling:3,nativePaceSelected:true,nativeFallback:true}).state,'invalid');
});

test('city timing interruptions preserve the selected pace without an artificial1x limit',()=>{
 for(const ceiling of [1.01,2.05,3])for(const [now,timingState]of [[551,'gap'],[49,'rollback'],[NaN,'invalid']]){
  const p=new Pacing(),city={...input,ceiling,nativePaceSelected:true,evidence:{},hazards:clear};
  assert.equal(p.update({...city,now:0}).timingState,'initial');
  assert.equal(p.update({...city,now:50}).timingState,'continuous');
  const r=p.update({...city,now,speedMps:9});
  assert.equal(r.pace,ceiling);assert.equal(r.state,'selected-native');assert.equal(r.timingState,timingState);
  assert.equal(r.sampleGapMs,timingState==='gap'?501:null);assert.equal(r.currentCorners,false);
 }
});

test('city timing interruptions retain an observed reduction and grant no unobserved recovery',()=>{
 for(const [now,timingState]of [[551,'gap'],[49,'rollback'],[NaN,'invalid']]){
  const p=new Pacing(),city={...input,ceiling:2.05,nativePaceSelected:true,evidence:{},hazards:clear};
  p.update({...city,now:0,hazards:{cars:[],barrierAhead:30}});
  assert.equal(p.update({...city,now:50,hazards:{cars:[],barrierAhead:30}}).pace,.75);
  const r=p.update({...city,now});assert.equal(r.pace,.75);assert.equal(r.timingState,timingState);
  const restoreAt=timingState==='gap'?601:100;
  const resumed=p.update({...city,now:restoreAt});assert.equal(resumed.pace,timingState==='gap'?.77:.75);
  const recovered=p.update({...city,now:restoreAt+50});assert(recovered.pace>.75&&recovered.pace<.8);
 }
});

test('a car responding to an unchanged obstacle can recover toward its current clearance request',()=>{
 const p=new Pacing(),hazards={cars:[],barrierAhead:60};
 assert.equal(p.update({...input,evidence:{},speedMps:40,hazards}).pace,.75);
 let last=.75;
 for(let now=50;now<=2000;now+=50){
  const r=p.update({...input,evidence:{},speedMps:20,hazards,now});
  assert(r.pace>=last);assert(r.pace<=.89);last=r.pace;
 }
 assert.equal(last,.89);
});
test('empty or invalid scans never stand for a straight route; no zero-speed command',()=>{
 for(const hazards of [null,{},clear,{cars:[],barrierAhead:NaN},{cars:[{ahead:Infinity,side:0}],barrierAhead:null}]){
  const r=new Pacing().update({...input,hazards,evidence:{}});assert.equal(r.pace,1);
 }
 assert.equal(new Pacing().update({...input,hazards:{cars:[],barrierAhead:0}}).pace,.75);
 assert.equal(clearanceEnvelope({hazards:clear,speedMps:NaN}).available,false);
});
test('delay and reverse clock discard boost while owner replacement, Stop and invalid requests reset recovery',()=>{
 const p=new Pacing();p.update(input);for(let now=250;now<=5000;now+=250)p.update({...input,now});assert(p.pace>1);
 for(const extra of [{now:6000},{now:4000},{now:5000,identity:'replacement'},{now:5000,ceiling:Infinity}]){
  assert.equal(p.update({...input,...extra}).pace,1);
 }
 assert.equal(p.update({enabled:false}).pace,null);assert.equal(p.key,null);
});
test('same-owner callback gaps over 500 ms retain a clearance reduction on scan dropout',()=>{
 for(const gap of [501,1000,60000,Number.MAX_SAFE_INTEGER])for(const hazards of [null,{},clear,{cars:[],barrierAhead:NaN}]){
  const p=new Pacing(),slowed=p.update({...input,hazards:{cars:[],barrierAhead:30}});assert.equal(slowed.pace,.75);
  const after=p.update({...input,now:gap,hazards});assert.equal(after.active,true);assert.equal(after.pace,.75,`gap ${gap}`);assert.equal(p.key,input.identity);
 }
});
test('continuous samples up to 500 ms recover normally and delayed samples earn no catch-up credit',()=>{
 for(const gap of [0,50,499,500]){
  const p=new Pacing();p.update({...input,hazards:{cars:[],barrierAhead:30}});
  assert.equal(p.update({...input,now:gap}).pace,Math.round((.75+.1*gap/1000)*100)/100);
 }
 const p=new Pacing();p.update({...input,hazards:{cars:[],barrierAhead:30}});
 assert.equal(p.update({...input,now:501,hazards:null}).pace,.75);
 assert.equal(p.update({...input,now:551}).pace,.76);assert.ok(Math.abs(p.pace-.755)<1e-12);
});
test('invalid clock samples keep an active same-owner reduction without recovery or poisoning time',()=>{
 for(const now of [undefined,null,NaN,Infinity,-Infinity,-1,'501',Number.MAX_SAFE_INTEGER+1]){
  const p=new Pacing();p.update({...input,now:100,hazards:{cars:[],barrierAhead:30}});
  const result=p.update({...input,now,hazards:null});assert.equal(result.active,true);assert.equal(result.pace,.75,String(now));assert.equal(p.at,100);
  assert.equal(p.update({...input,now:200}).pace,.75,'first valid sample only reestablishes continuity');
  assert.equal(p.update({...input,now:250}).pace,.76);assert.ok(Math.abs(p.pace-.755)<1e-12);
 }
});
test('clock rollback retains a reduction and cannot credit an already observed interval twice',()=>{
 const p=new Pacing();p.update({...input,now:1000,hazards:{cars:[],barrierAhead:30}});
 for(const now of [999,500,0,500,999]){assert.equal(p.update({...input,now,hazards:null}).pace,.75);assert.equal(p.at,1000);}
 assert.equal(p.update({...input,now:1000}).pace,.75);
 assert.equal(p.update({...input,now:1050}).pace,.76);assert.ok(Math.abs(p.pace-.755)<1e-12);
});
test('timing interruption removes boost and a lower ceiling still applies immediately',()=>{
 for(const now of [5501,4999,NaN]){
  const p=new Pacing();p.update(input);for(let at=250;at<=5000;at+=250)p.update({...input,now:at});assert.ok(p.pace>1);
  const after=p.update({...input,now,hazards:null});assert.equal(after.pace,1);
 }
 const p=new Pacing();p.update(input);for(let now=250;now<=10000;now+=250)p.update({...input,now});
 assert.equal(p.update({...input,now:10250,ceiling:1.2}).pace,1.2);
 p.update({...input,now:10300,hazards:{cars:[],barrierAhead:30}});assert.equal(p.pace,.75);
 assert.equal(p.update({...input,now:10801,ceiling:1,hazards:null}).pace,.75);
});
test('new owner and disabled Adaptive preserve their independent baseline resets after a slowdown',()=>{
 const p=new Pacing();p.update({...input,hazards:{cars:[],barrierAhead:30}});
 assert.equal(p.update({...input,now:501,identity:'new-race',hazards:null}).pace,1);assert.equal(p.key,'new-race');
 p.update({...input,identity:'new-race',now:550,hazards:{cars:[],barrierAhead:30}});assert.equal(p.pace,.75);
 assert.equal(p.update({enabled:false}).pace,null);assert.equal(p.key,null);assert.equal(p.at,null);assert.equal(p.timingReady,false);
 assert.equal(p.update({...input,now:600}).pace,1);
});
test('timing-held reductions reset when existing Street X, special-mode, manual or permission guards suspend Adaptive',()=>{
 const eligible={enabled:true,ceiling:2,verified:true,ai:true,safe:true,network:false,allowNetwork:false,hud:1,raceType:1};
 for(const extra of [{streetX:true},{drag:true},{drift:true},{raceType:7},{hud:2,raceType:0},{ai:false},{safe:false},{network:true,allowNetwork:false}]){
  const p=new Pacing();p.update({...input,hazards:{cars:[],barrierAhead:30}});assert.equal(p.update({...input,now:501,hazards:null}).pace,.75);
  const mode=adaptiveRaceSettings({...eligible,...extra});assert.equal(mode.requested,false);
  const stopped=p.update({...input,enabled:mode.requested,now:551});assert.equal(stopped.active,false);assert.equal(stopped.pace,null);assert.equal(p.key,null);
  assert.equal(p.update({...input,now:601}).pace,1);
 }
});
function driver(capabilities=profile.capabilities){
 const memory=new WebAssembly.Memory({initial:256,maximum:256,shared:true}),d=new DataView(memory.buffer),put=(a,v)=>d.setUint32(a,v,true);
 const player=0xe00000,car=0xe01000,race=0xe04000,c=new AI.Controller(memory,true,capabilities);
 put(AI.BASE+28,AI.MAGIC);put(0xd00000,player);put(player+4,car);put(0x89e7b0,1);
 return {memory,d,put,c,player,car,race,settings:{enabled:true,safe:true,state:{ready:true,driving:true,network:false,drag:false,car,race},mode:1,pace:2,raceCornerAssist:true,adaptiveCorners:true}};
}
test('dynamic reductions keep cached route identity and compensation ceiling intact',()=>{
 const {c,settings}=driver();c.update({...settings,adaptivePace:1});const identity=c.requestTarget;
 assert.equal(c.read(60),100);assert.equal(c.handbackPending,false);
 for(const adaptivePace of [.75,.9,1,1.5,2]){c.update({...settings,adaptivePace});assert.equal(c.read(60),Math.round(adaptivePace*100));assert.equal(c.requestTarget,identity);assert.equal(c.handbackPending,false);}
 assert.equal(new DataView(c.memory.buffer).getUint32(AI.CORNER_BASE+48,true),200);
});
test('real next/current AI mailboxes retain 0.75 through a same-owner 501 ms gap and absent scan',()=>{
 for(const capabilities of [profile.capabilities,currentProfile.capabilities]){
  const {c,settings}=driver(capabilities),p=new Pacing();
  let result=p.update({...input,hazards:{cars:[],barrierAhead:30}});c.update({...settings,adaptivePace:result.active?result.pace:null});
  const identity=c.requestTarget;assert.equal(c.read(60),75);
  for(const now of [501,NaN,400,Number.MAX_SAFE_INTEGER]){
   result=p.update({...input,now,hazards:null});c.update({...settings,adaptivePace:result.active?result.pace:null});
   assert.equal(result.active,true);assert.equal(c.read(60),75);assert.equal(c.requestTarget,identity);assert.equal(c.handbackPending,false);
   assert.equal(new DataView(c.memory.buffer).getUint32(AI.CORNER_BASE+48,true),200);
  }
 }
});
test('permitted online ordinary races keep the same timing hold and permission withdrawal still publishes OFF',()=>{
 const f=driver(currentProfile.capabilities),p=new Pacing(),mode=adaptiveRaceSettings({enabled:true,ceiling:2,verified:true,ai:true,safe:true,network:true,allowNetwork:true,hud:1,raceType:1});
 assert.equal(mode.requested,true);f.settings.state.network=true;f.settings.allowNetwork=true;f.put(0x850078,8);
 let result=p.update({...input,enabled:mode.requested,hazards:{cars:[],barrierAhead:30}});f.c.update({...f.settings,adaptivePace:result.pace});assert.equal(f.c.read(60),75);
 const identity=f.c.requestTarget;result=p.update({...input,enabled:mode.requested,now:501,hazards:null});f.c.update({...f.settings,adaptivePace:result.pace});assert.equal(f.c.read(60),75);assert.equal(f.c.requestTarget,identity);
 f.settings.allowNetwork=false;f.c.update({...f.settings,adaptivePace:result.pace});assert.equal(f.c.read(8),0);assert.equal(f.c.handbackPending,true);
});
test('invalid runtime factors never expand the selected ceiling or bypass protected modes',()=>{
 for(const adaptivePace of [0,.74,2.01,3,NaN,Infinity,'0.75']){const {c,settings}=driver();c.update({...settings,adaptivePace});assert.equal(c.read(60),200);}
 for(const mark of [f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>f.d.setUint8(0x89e7d8,1),f=>f.d.setUint8(0x89e7d9,1),f=>f.put(0x890104,1),f=>f.put(0x890108,1),f=>f.put(0x890114,1),f=>{f.put(0x850078,8);f.put(0x850088,10);f.settings.allowNetwork=true;f.settings.state.network=true;}]){const f=driver(),baseline=driver();mark(f);mark(baseline);baseline.c.update(baseline.settings);f.c.update({...f.settings,adaptivePace:.75});assert.equal(f.c.read(60),baseline.c.read(60));}
 const f=driver();f.c.update({...f.settings,adaptiveCorners:false,adaptivePace:.75});assert.equal(f.c.read(60),200);
});
test('real Stop and permission withdrawal still publish OFF with a pending native handback',()=>{
 const f=driver();f.c.update({...f.settings,adaptivePace:.75});f.c.stop();assert.equal(f.c.read(8),0);assert.equal(f.c.handbackPending,true);
 const g=driver();g.c.update({...g.settings,adaptivePace:.75});g.settings.state.network=true;g.c.update({...g.settings,adaptivePace:.75});assert.equal(g.c.read(8),0);
});
