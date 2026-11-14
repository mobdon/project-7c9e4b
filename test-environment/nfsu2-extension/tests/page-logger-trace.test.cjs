'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
// Production page/core/logger with existing UI/AI fixture doubles. Capture the
// producer call before the real logger applies its own cadence/size bounds.
const file=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(file);
let source=fs.readFileSync(file,'utf8');
const old="create:options=>require('../extension/diagnostics.js').create({...options,clock:()=>1000+now})";
assert.equal(source.split(old).length,2);
source=source.replace(old,"create:options=>{const api=require('../extension/diagnostics.js').create({...options,clock:()=>1000+now});return {...api,trace:data=>{compatibility.trace?.(data);return api.trace?.(data);},record:(event,data)=>{compatibility.record?.(event,data);return api.record(event,data);}}}");
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(source+'\nthis.fixture=fixture;',context,{filename:file});
const AA=require('../extension/aa-profile.js'),Core=require('../extension/core.js');
const clone=x=>JSON.parse(JSON.stringify(x));
async function fixture(options={}){const traces=[],records=[],f=await context.fixture(null,true,options.dyno===true,{revision:AA.revision,profile:options.profile||AA,...options,trace:data=>{traces.push(clone(data));options.trace?.(data);},record:(event,data)=>records.push({event,data:clone(data)})});return Object.assign(f,{traces,records});}
const road=f=>{f.put(0x89e7b0,1);f.drive(1);f.put(f.race,4);};
function nativeRoad(f){const record=0xe05000,driver=0xe06000,behavior=0xe07000;
 for(const[p,v]of[[f.car+0x14,record],[record+4,1],[f.car+0x24,3],[f.car+0x2c,driver],[driver,0x785370],[driver+4,f.car],[driver+8,behavior],[behavior,0x784eb0],[behavior+0x220,f.car]])f.put(p,v);
 f.d.setUint8(record+0x901,254);f.d.setFloat32(f.car+0x430,22,true);f.d.setFloat32(behavior+0x230,17,true);f.d.setFloat32(behavior+0x20c,.25,true);f.d.setFloat32(behavior+0x214,.75,true);f.d.setInt16(behavior+0x1e0,123,true);
 return{record,driver,behavior};
}
test('page emits trace on existing ticks with fresh settings and independent build metadata',async()=>{
 const f=await fixture(),before=Buffer.from(f.memory.buffer),start=f.traces.length;f.run(12);
 assert.equal(f.traces.length-start,12);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 for(const row of f.traces){assert.equal(row.traceStatus,'captured');assert.equal(row.producerFailureCode,0);assert.equal(row.producerStage,0);assert.equal(row.revision,AA.revision);assert.equal(row.moduleHash,AA.hash);assert.equal(row.tools.ai,false);assert.equal(row.tools.boost,false);assert.equal(row.tools.racePace,false);}
 f.input('race-pace-factor',1.95);f.run();assert.equal(f.traces.at(-1).tools.racePaceFactor,1.95);assert.equal(f.traces.at(-2).tools.racePaceFactor,1);
});
test('StreetX zero-record trace preserves selected commands and exports current native scalar evidence',async()=>{
 const f=await fixture();road(f);const {behavior}=nativeRoad(f);f.put(0x89e7a0,4603);f.d.setUint8(0x89e7e3,1);
 f.change('ai',true);f.change('race-pace',true);f.input('race-pace-factor',1.95);f.change('race-corner-assist',true);f.change('boost',true);f.input('power',1.3);f.change('grip',true);f.input('grip-factor',2);
 Object.assign(f.aiLog,{owned:true,paceApplied:1.95,cornerMode:2,cornerRequested:true,cornerPace:1.95,cornerBraking:.75,cornerHits:0,brakingHits:0,cornerContext:{cornerRouteOwned:true,cornerRouteNodes:30,cornerPlannerCorners:0,cornerPlannerUsable:0,cornerPlannerTelemetryStatus:'sampled',nativePaceRequested:1.95,nativePaceApplied:1.95,nativePaceHits:19,nativePaceTelemetryStatus:'sampled'}});
 f.run(8);const row=f.traces.at(-1),request=f.aiLog.updates.at(-1);
 assert.equal(request.pace,1.95);assert.equal(request.adaptiveCorners,false);assert.equal(request.raceCornerAssist,true);
 assert.equal(row.streetXRace,true);assert.equal(row.trackId,4603);assert.equal(row.cornerMode,2);assert.equal(row.cornerPlannerCorners,0);assert.equal(row.cornerPlannerUsable,0);assert.equal(row.cornerPlannerTelemetryStatus,'sampled');
 assert.equal(row.nativeRoadTarget,17);assert.equal(row.nativeRoadTargetStatus,'sampled');assert.equal(row.nativeBrake,.75);assert.equal(row.nativeThrottle,.25);assert.equal(row.nativeSteering,123);
 assert.equal(row.nativePaceRequested,1.95);assert.equal(row.nativePaceApplied,1.95);assert.equal(row.nativePaceHits,19);assert.equal(row.nativePaceTelemetryStatus,'sampled');
 assert.equal(row.planSelectedPace,1.95);assert.equal(row.planInputSpeedMps,22);assert.equal(row.tools.racePaceFactor,1.95);assert.equal(row.tools.power,1.3);assert.equal(row.tools.gripFactor,2);
 assert.equal(row.cornerApplied,null);assert.notEqual(row.forwardNativeApplied,true);assert.notEqual(row.forwardLiveVerified,true);
 f.d.setFloat32(behavior+0x230,0,true);f.d.setFloat32(behavior+0x214,0,true);f.run();assert.equal(f.traces.at(-1).nativeRoadTarget,0);assert.equal(f.traces.at(-1).nativeBrake,0);
});
test('forward trace includes returned plan diagnostics without manufacturing native application',async()=>{
 const evidence={forwardPlanAvailable:true,forwardPlanOverride:true,forwardPlanReasonCode:4,forwardPlanTarget:14,forwardPlanConstraints:2,forwardPlanKnots:8,forwardLimitingDistance:65,forwardLimitingAngle:80,forwardLimitingCurvature:.2,forwardPlanGrip:3.7,forwardPlanLateral:36.26,forwardPlanBrake:5.2};
 const forwardDriving={Controller:class{stop(){return{};}invalidate(){return{};}update(){return{forwardState:'armed',forwardCaptured:true,forwardSamples:12,forwardHorizon:100,forwardPriorityTurns:1,forwardRequestedTarget:14,forwardLeaseTicks:400,forwardNativeApplied:false,forwardLiveVerified:false};}diagnosticEvidence(){return evidence;}}};
 const f=await fixture({profile:{...AA,capabilities:{...AA.capabilities,nativeForwardGeometry:true,nativeForwardClamp:true}},forwardDriving});road(f);f.change('race-only-ai',true);f.change('adaptive-race',true);f.aiLog.owned=true;f.aiLog.paceApplied=1.3;f.run(8);const row=f.traces.at(-1);
 for(const[k,v]of Object.entries(evidence))assert.equal(row[k],v,k);assert.equal(row.forwardState,'armed');assert.equal(row.forwardRequestedTarget,14);assert.equal(row.forwardNativeApplied,false);assert.equal(row.forwardLiveVerified,false);
 assert.equal(row.adaptiveRaceRequested,true);assert.equal(row.planCurrentCorners,false);assert.equal(row.planClearanceAvailable,false);
});

test('online combined selection exports aggregate contact counts without presenting them as traffic-only',async()=>{
 const profile={...AA,capabilities:{...AA.capabilities,onlineTraffic:true,onlinePlayers:true,onlineRaceCars:true,onlineRivals:true,onlinePlayerOutrun:true}};
 const f=await fixture({profile});f.change('online-all',true);
 f.carLog.result={requested:true,onlineRivals:true,onlinePlayers:true,onlinePlayerOutrun:true,hits:9,trafficHits:8,playerHits:1,trafficHitsExact:false,contactCounterScope:'aggregate-car-contacts'};f.run(8);
 const row=f.traces.at(-1);assert.equal(row.onlineRivalsSelected,true);assert.equal(row.onlineAllCarsSelected,true);assert.equal(row.onlinePlayerOutrunRequested,true);assert.equal(row.carHits,9);assert.equal(row.playerHits,1);assert.equal(row.trafficHits,undefined);assert.equal(row.trafficHitsExact,false);assert.equal(row.contactCounterScope,'aggregate-car-contacts');
 f.click('diagnostic-export');const trace=JSON.parse(await f.downloads.at(-1).text()).raceTrace,exported=Object.fromEntries(trace.columns.map((key,i)=>[key,trace.rows.at(-1)[i]]));
 assert.equal(exported.carHits,9);assert.equal(exported.trafficHits,null);assert.equal(exported.contactCounterScope,'aggregate-car-contacts');
});
test('same-object race mode transitions are emitted independently of ordinary snapshot throttling',async()=>{
 const f=await fixture();road(f);nativeRoad(f);f.run();f.d.setUint8(0x89e7e3,1);f.put(0x89e7a0,4603);f.run();const street=f.traces.at(-1);
 f.d.setUint8(0x89e7e3,0);f.d.setUint8(0x89e7d8,1);f.put(0x89e7a0,4201);f.run();const drag=f.traces.at(-1);
 assert.equal(street.streetXRace,true);assert.equal(street.dragRace,false);assert.equal(drag.streetXRace,false);assert.equal(drag.dragRace,true);assert.equal(street.gameTicks,drag.gameTicks);assert.equal(street.generation,drag.generation);
});
test('detailed native producer failure emits fixed unavailability and keeps control path unchanged',async()=>{
 const previous=Core.Engine.prototype.nativeDiagnostics;
 try{Core.Engine.prototype.nativeDiagnostics=function(...args){if(args[3]===true)throw Error('SECRET native diagnostic');return previous.apply(this,args);};const f=await fixture();road(f);f.change('ai',true);const before=f.aiLog.updates.length;f.run(4);
  assert.equal(f.aiLog.updates.length-before,4);for(const row of f.traces.slice(-4)){assert.equal(row.traceStatus,'unavailable');assert.equal(row.producerFailureCode,1);assert.equal(row.producerStage,1);assert.equal(row.tools.ai,true);assert.equal(row.raceType,1);assert.equal(row.nativeRoadTarget,undefined);}assert.doesNotMatch(JSON.stringify(f.traces),/SECRET/);
 }finally{Core.Engine.prototype.nativeDiagnostics=previous;}
});
test('AI mailbox read failure retains fresh native evidence and explicit stage2',async()=>{
 const f=await fixture();road(f);nativeRoad(f);f.aiLog.mailbox=new Proxy({},{get(){throw Error('SECRET mailbox');}});f.run();const row=f.traces.at(-1);
 assert.equal(row.traceStatus,'unavailable');assert.equal(row.producerFailureCode,2);assert.equal(row.producerStage,2);assert.equal(row.nativeRoadTarget,17);assert.equal(row.nativeTelemetryStatus,'sampled');assert.equal(row.nativePaceApplied,undefined);assert.doesNotMatch(JSON.stringify(row),/SECRET/);
});
test('trace sink failure records fixed stage3 without error contents or stopping controls',async()=>{
 const f=await fixture({trace(){throw Error('SECRET sink');}});f.change('ai',true);f.run(3);const failures=f.records.filter(x=>x.event==='state'&&x.data.producerFailureCode===3);
 assert.ok(failures.length>=3);assert.equal(failures.at(-1).data.traceStatus,'unavailable');assert.equal(failures.at(-1).data.tools.ai,true);assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.doesNotMatch(JSON.stringify(f.records),/SECRET/);
});
test('worker exit traces unavailable source without carrying prior native target or ownership',async()=>{
 const f=await fixture();road(f);nativeRoad(f);f.run();assert.equal(f.traces.at(-1).nativeRoadTarget,17);f.worker.emit({t:'exit'});f.run();const row=f.traces.at(-1);
 assert.equal(row.traceStatus,'unavailable');assert.equal(row.producerFailureCode,1);assert.equal(row.nativeRoadTarget,undefined);assert.equal(row.nativeBrake,undefined);assert.equal(row.aiOwned,undefined);assert.equal(row.tools.ai,false);
});
