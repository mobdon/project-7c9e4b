'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../extension/diagnostics.js');
function fixture(){let at=1000;const writes=[],stored=new Map();const logger=D.create({clock:()=>at,storage:{getItem:k=>stored.get(k),setItem:(k,v)=>{stored.set(k,v);writes.push({at,key:k});}}});writes.length=0;return{logger,writes,setTime:t=>at=t,read:()=>JSON.parse(logger.exportText())};}
function sample(tick){
 const phase=tick%20;
 return{ready:true,driving:true,aiActive:true,aiOwned:true,safe:true,supported:true,revision:'aa2429fb',trackId:4014,raceType:1,racePhase:4,
  nativeTelemetry:true,nativeTelemetryStatus:'sampled',traceStatus:'captured',producerFailureCode:0,producerStage:0,
  requestedPace:1.3,paceApplied:1.3,paceConfirmed:true,nativePaceRequested:1.3,nativePaceApplied:1.3,nativePaceTelemetryStatus:'sampled',nativePaceHits:tick,
  speedMps:20+phase/5,forwardMps:20+phase/6,nativeThrottle:phase/20,nativeBrake:(20-phase)/20,nativeSteering:phase*100,nativeRoadTarget:25+phase/10,nativeRoadTargetStatus:'sampled',
  cornerMode:3,cornerRequested:true,cornerHits:tick,brakingHits:tick*2,cornerApplied:.7+phase/100,cornerRouteNodes:21+phase,cornerPlannerCorners:phase%5,cornerPlannerUsable:phase%5,cornerPlannerTelemetryStatus:'sampled',
  forwardState:'armed',forwardCaptured:true,forwardSamples:20+phase,forwardHorizon:100+phase,forwardPriorityTurns:phase%3,forwardRequestedTarget:20+phase/10,forwardLeaseTicks:100+phase,forwardNativeApplied:false,forwardLiveVerified:false,
  forwardPlanAvailable:true,forwardPlanOverride:true,forwardPlanReasonCode:9,forwardPlanTarget:20+phase/10,forwardPlanConstraints:1+phase,forwardPlanKnots:3+phase,forwardLimitingDistance:30+phase,forwardLimitingAngle:75+phase,forwardLimitingCurvature:.01+phase/1000,forwardLimitingCurveTarget:20+phase/10,forwardLimitingEntryTarget:25+phase/10,forwardPlanGrip:3+phase/100,forwardPlanLateral:30+phase/10,forwardPlanBrake:5+phase/100,
  planCurrentCorners:true,planClearanceAvailable:true,planClearanceObserved:true,planClearanceSource:'barrier',planClearanceTarget:20+phase/10,planInputSpeedMps:20+phase/5,planSelectedPace:1.3,
  tools:{ai:true,racePace:true,racePaceFactor:1.3,adaptiveRace:true,adaptiveRaceCeiling:1.3}};
}
test('fast changing target, route and native-hit observations do not force legacy storage writes',()=>{
 const f=fixture();for(let tick=0;tick<=200;tick++){f.setTime(1000+tick*50);const row=sample(tick);f.logger.trace(row);f.logger.snapshot(row);}
 const legacy=f.writes.filter(w=>w.key===D.KEY),fast=f.writes.filter(w=>w.key===D.TRACE_KEY);
 assert.equal(f.logger.status().traceSamples,41);assert(legacy.length<=6,'Expected at most initial+five2s checkpoints; got'+legacy.length);assert(fast.length<=6,'Fast ring persistence must stay bounded separately');
 for(let i=1;i<legacy.length;i++)assert(legacy[i].at-legacy[i-1].at>=2000);
 const report=f.read();assert.equal(report.raceTrace.rows.length,41);assert(report.events.filter(e=>e.event==='state').length<=6);
 const target=report.raceTrace.columns.indexOf('nativeRoadTarget');assert.notEqual(report.raceTrace.rows[0][target],report.raceTrace.rows[1][target]);
});
test('mode and producer-availability changes remain immediate legacy records between checkpoints',()=>{
 const f=fixture();f.logger.snapshot(sample(0));f.setTime(1300);f.logger.snapshot({...sample(1),streetXRace:true,trackId:4603,adaptiveRaceState:'street-x'});
 f.setTime(1600);f.logger.snapshot({...sample(2),streetXRace:true,trackId:4603,adaptiveRaceState:'street-x',nativeTelemetry:false,nativeTelemetryStatus:'context-changed',traceStatus:'unavailable',producerFailureCode:1,producerStage:1});
 const rows=f.read().events.filter(e=>e.event==='state');assert.equal(rows.length,3);assert.equal(rows[1].data.trackId,4603);assert.equal(rows[1].data.adaptiveRaceState,'street-x');assert.equal(rows[2].data.nativeTelemetryStatus,'context-changed');assert.equal(rows[2].data.traceStatus,'unavailable');
});
