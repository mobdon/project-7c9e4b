'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../extension/diagnostics.js');
function fixture(){let t=1000;const values=new Map(),writes=[];const storage={getItem:k=>values.get(k),setItem:(k,v)=>{values.set(k,v);writes.push(k);}};const logger=D.create({storage,clock:()=>t,version:'0.38.5'});return{logger,values,writes,advance:n=>t+=n,read:()=>JSON.parse(logger.exportText()).raceTrace};}
const sample=()=>({ready:true,driving:true,aiActive:true,aiOwned:true,revision:'aa2429fb',streetXRace:true,trackId:4603,requestedPace:1.95,nativePaceApplied:1.95,nativeRoadTarget:20,nativeBrake:0,speedMps:36.75,cornerPlannerCorners:0,cornerPlannerUsable:0,cornerPlannerTelemetryStatus:'sampled',forwardState:'off',traceStatus:'captured',producerFailureCode:0,tools:{ai:true,racePace:true,racePaceFactor:1.95,power:1.3,gripFactor:2,raceBraking:1}});
const object=(trace,row)=>Object.fromEntries(trace.columns.map((key,i)=>[key,row[i]]));

test('trace retains fast corner/control evidence independently of state event eviction',()=>{
 const f=fixture();
 for(let i=0;i<400;i++){f.logger.trace({...sample(),speedMps:i===100?1.774:36.75,nativeBrake:i===99?.278:0});f.advance(250);}
 for(let i=0;i<600;i++)f.logger.record('tools',{tools:{ai:!!(i%2)}});
 const trace=f.read();assert.equal(trace.rows.length,400);assert.equal(trace.coverage.spanMs,99750);assert.equal(trace.dropped,0);
 const before=object(trace,trace.rows[99]),after=object(trace,trace.rows[100]);assert.equal(before.nativeBrake,.278);assert.equal(after.speedMps,1.774);assert.equal(after['tools.racePaceFactor'],1.95);assert.equal(after.nativeRoadTarget,20);assert.equal(after.cornerPlannerUsable,0);assert.equal(after.forwardState,'off');
 assert.equal(f.logger.status().dropped>0,true);
});
test('absent/rejected fields remain null with explicit availability counts and source reasons',()=>{
 const f=fixture();f.logger.trace({...sample(),nativeRoadTarget:undefined,nativeRoadTargetStatus:'behavior-unverified',forwardRequestedTarget:NaN,producerFailureCode:1,traceStatus:'unavailable'});
 const trace=f.read(),row=object(trace,trace.rows[0]);assert.equal(row.nativeRoadTarget,null);assert.equal(row.forwardRequestedTarget,null);assert.equal(row.nativeBrake,0);assert.equal(row.nativeRoadTargetStatus,'behavior-unverified');assert.equal(row.producerFailureCode,1);assert.equal(trace.coverage.missingByColumn.nativeRoadTarget,1);
});
test('trace storage is throttled while memory captures at250ms; menus preserve race evidence',()=>{
 const f=fixture();for(let i=0;i<40;i++){f.logger.trace(sample());f.advance(50);}assert.equal(f.logger.status().traceSamples,8);assert.equal(f.writes.filter(k=>k===D.TRACE_KEY).length,1);
 f.logger.trace(sample());assert.equal(f.writes.filter(k=>k===D.TRACE_KEY).length,2);f.advance(250);f.logger.trace({ready:true,driving:false,aiActive:false,aiOwned:false,traceStatus:'captured'});
 const count=f.logger.status().traceSamples;for(let i=0;i<500;i++){f.advance(250);f.logger.trace({ready:true,driving:false});}assert.equal(f.logger.status().traceSamples,count);
});
test('trace reports real gaps, bounds rows/bytes and restores independently of event storage',()=>{
 const f=fixture();for(let i=0;i<650;i++){f.logger.trace(sample());f.advance(i===600?2500:250);}const trace=f.read();assert(trace.rows.length<=D.MAX_TRACE_SAMPLES);assert(trace.dropped>0);assert.equal(trace.coverage.maxGapMs,2500);assert.equal(trace.coverage.gapsOver500Ms,1);assert(f.values.get(D.TRACE_KEY).length<=D.MAX_TRACE_BYTES);
 const restored=JSON.parse(D.create({storage:{getItem:k=>f.values.get(k),setItem(){}},clock:()=>500000,version:'0.38.5'}).exportText()).raceTrace;assert.equal(restored.restoredFromSameTab,true);assert.deepEqual(restored.rows,trace.rows);
});
test('trace revalidates every persisted column and never retains arbitrary payloads',()=>{
 const f=fixture();f.logger.trace({...sample(),raw:'SECRET',tools:{...sample().tools,password:'SECRET'},nativeRoadTarget:Infinity,traceStatus:'SECRET',forwardNativeApplied:true});let trace=f.read(),row=object(trace,trace.rows[0]);assert.equal(row.nativeRoadTarget,null);assert.equal(row.traceStatus,null);assert.equal(row.forwardNativeApplied,null);assert.doesNotMatch(f.logger.exportText(),/SECRET/);
 const stored=JSON.parse(f.values.get(D.TRACE_KEY));stored.rows[0][stored.columns.indexOf('nativeBrake')]='SECRET';stored.rows[0][stored.columns.indexOf('tools.power')]=9999;stored.raw='SECRET';f.values.set(D.TRACE_KEY,JSON.stringify(stored));
 trace=JSON.parse(D.create({storage:{getItem:k=>f.values.get(k),setItem(){}},version:'0.38.5'}).exportText()).raceTrace;row=object(trace,trace.rows[0]);assert.equal(row.nativeBrake,null);assert.equal(row['tools.power'],null);assert.doesNotMatch(JSON.stringify(trace),/SECRET/);
});
test('trace is safe under storage failure, clock rollback and explicit clearing',()=>{
 let t=1000;const logger=D.create({clock:()=>t,storage:{getItem(){throw Error('blocked')},setItem(){throw Error('full')}}});assert.equal(logger.trace(sample()),true);t=500;assert.equal(logger.trace(sample()),true);const trace=JSON.parse(logger.exportText()).raceTrace;assert.equal(trace.persistence,'memory-only');assert.equal(trace.rows.length,2);assert.equal(trace.coverage.clockRollbacks,1);assert.equal(trace.coverage.spanMs,0);logger.clear();assert.equal(JSON.parse(logger.exportText()).raceTrace.rows.length,0);
});
test('stopped worker and repeated paused/unfocused failures cannot evict the previous race',()=>{
 const f=fixture();for(let i=0;i<100;i++){f.logger.trace(sample());f.advance(250);}
 for(let i=0;i<1000;i++){f.logger.trace({ready:false,driving:false,producerFailureCode:1,producerStage:1,traceStatus:'unavailable'});f.advance(250);}assert.equal(f.logger.status().traceSamples,101);
 for(let i=0;i<1000;i++){f.logger.trace({...sample(),safe:false,focused:false,producerFailureCode:1,producerStage:1,traceStatus:'unavailable'});f.advance(250);}assert.equal(f.logger.status().traceSamples,102);const trace=f.read();assert.equal(object(trace,trace.rows[0]).speedMps,36.75);assert.equal(object(trace,trace.rows.at(-1)).producerStage,1);
});
test('gentle curvature retains useful precision; exported plan codebook matches the actual producer',()=>{
 const f=fixture();f.logger.trace({...sample(),forwardLimitingCurvature:.00013742,forwardPlanConstraints:2.5,forwardPlanKnots:3.5,producerStage:3});const trace=f.read(),row=object(trace,trace.rows[0]);assert.equal(row.forwardLimitingCurvature,.00013742);assert.equal(row.forwardPlanConstraints,null);assert.equal(row.forwardPlanKnots,null);assert.equal(row.producerStage,3);
 const actual=require('../extension/forward-driving.js').planReasonCodes;for(const [reason,code]of Object.entries(actual))assert.equal(trace.codebooks.forwardPlanReasonCode[code],reason);
});
