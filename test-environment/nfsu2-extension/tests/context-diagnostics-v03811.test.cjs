'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../extension/diagnostics.js'),Probe=require('../extension/route-probe.js');
const storage=()=>{const data=new Map();return{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
const unpack=trace=>Object.fromEntries(trace.columns.map((key,i)=>[key,trace.rows.at(-1)[i]]));
const output=log=>JSON.parse(log.exportText()).raceTrace;

test('real delivered .10 trace migrates without moving any old column or inventing new evidence',()=>{
 const saved=storage(),before=require('./fixtures/race-trace-v03810-for-v03811.json');saved.setItem(D.TRACE_KEY,JSON.stringify(before));
 const next=output(D.create({storage:saved,clock:()=>2000}));
 assert.equal(next.restoredFromSameTab,true);
 assert.deepEqual(next.columns.slice(0,before.columns.length),before.columns);
 assert.deepEqual(next.rows.at(-1).slice(0,before.columns.length),before.rows.at(-1));
 for(const value of next.rows.at(-1).slice(before.columns.length))assert.equal(value,null);
});

test('route denial exports fixed matching phase and subreason codebooks without raw data',()=>{
 const log=D.create({clock:()=>1000}),phase=Probe.readPhaseCodes['track-info'],sub=Probe.readSubreasonCodes['window-state-changed'];
 log.trace({ready:true,driving:true,forwardGuardCode:103,forwardReadPhaseCode:phase,forwardReadSubreasonCode:sub,address:0x50000000,reason:'SECRET'});
 const t=output(log),r=unpack(t);
 assert.equal(r.forwardReadPhaseCode,phase);assert.equal(r.forwardReadSubreasonCode,sub);
 assert.deepEqual(t.codebooks.forwardReadPhaseCode,Object.fromEntries(Object.entries(Probe.readPhaseCodes).map(([name,code])=>[code,name])));
 assert.deepEqual(t.codebooks.forwardReadSubreasonCode,Object.fromEntries(Object.entries(Probe.readSubreasonCodes).map(([name,code])=>[code,name])));
 assert.doesNotMatch(log.exportText(),/SECRET|1342177280/);
});

test('city request, native application, clearance, timing and sampled native override stay distinct',()=>{
 const log=D.create({clock:()=>1000});
 log.trace({ready:true,driving:true,cityPacingEnabled:true,cityPacingState:'clearance-limited',citySelectedPace:2.05,cityRuntimePace:.85,cityClearanceObserved:true,cityClearanceDistance:14,cityClearanceSource:'vehicle',cityClearanceTarget:8,cityTimingState:'gap',citySampleGapMs:501,requestedPace:2.05,nativePaceApplied:.85,nativeControlOverrideLatched:true,nativePreviousTarget:31,nativeThrottleHold:.8,nativeWheelContactMask:5,gameTicks:1234,nosTelemetry:true,nosTimestampActive:true,nosClockTicks:1234,nosSinceTicks:1000,nosFullTicks:4000,nosRemainingTicks:3766,nosElapsedTicks:234,onlineRivalsRequested:true,trafficHitsExact:false,carHits:42});
 const r=unpack(output(log));
 for(const[key,value]of Object.entries({citySelectedPace:2.05,cityRuntimePace:.85,nativePaceApplied:.85,cityTimingState:'gap',citySampleGapMs:501,cityClearanceSource:'vehicle',nativeControlOverrideLatched:true,nativeWheelContactMask:5,nosTimestampActive:true,nosElapsedTicks:234,onlineRivalsRequested:true,trafficHitsExact:false,carHits:42}))assert.equal(r[key],value,key);
});

test('invalid pairs, unknown states and unbounded native values remain absent',()=>{
 const log=D.create({clock:()=>1000});
 log.trace({ready:true,driving:true,forwardReadPhaseCode:21,forwardReadSubreasonCode:99,cityPacingState:'SECRET',cityTimingState:'SECRET',cityClearanceSource:'SECRET',cityRuntimePace:10,citySampleGapMs:Infinity,nativeControlOverrideLatched:1,nativePreviousTarget:NaN,nativeThrottleHold:2,nativeWheelContactMask:3.5});
 const r=unpack(output(log));
 for(const key of ['forwardReadPhaseCode','forwardReadSubreasonCode','cityPacingState','cityTimingState','cityClearanceSource','cityRuntimePace','citySampleGapMs','nativeControlOverrideLatched','nativePreviousTarget','nativeThrottleHold','nativeWheelContactMask'])assert.equal(r[key],null,key);
 assert.doesNotMatch(log.exportText(),/SECRET/);
});
