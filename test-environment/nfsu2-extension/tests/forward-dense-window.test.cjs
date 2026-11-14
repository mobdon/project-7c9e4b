'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Candidate=require('../extension/forward-pacing.js');
const Released={plan:Candidate.plan,windowFromCapture:c=>Candidate.windowFromCapture(c,{maxSamples:24})};
const {Controller,PIN}=require('../extension/forward-driving.js');
const policy={lateralAcceleration:6,brakingDeceleration:4,cornerFactor:.8,sharpMargin:15,reactionSeconds:.6,marginDistance:8,maxSpacing:20};
function capture(points,progress=0,end=points.at(-1).distance){return{status:'captured',moduleHash:PIN,request:2,ownerSequence:6,pace:1.3,source:'owned-native-forward-query-v1',sampling:'native-node-anchors-linear-v1',postConstructionVerified:true,forwardOrderVerified:true,horizontalAxes:'xy',controlWord:0x37f,nativeUnitScaleVerified:true,physical:{speed:10},progress,end,points};}
function turn(){return capture(Array.from({length:19},(_,i)=>{const d=i*10;return{distance:d,xyz:[Math.min(d,140),Math.max(0,d-140),0]};}));}

test('same-spacing expansion reaches the acknowledged later corner without changing the released prefix',()=>{
 const c=turn(),before=structuredClone(c),old=Released.windowFromCapture(c),w=Candidate.windowFromCapture(c);
 const a=Released.plan(old,policy),b=Candidate.plan(w,policy);
 assert(a.available&&b.available);assert.equal(old.samples.length,24);assert.equal(old.samples.at(-1).distance,115);assert.equal(a.priorityTurns,0);
 assert.equal(w.samples.length,37);assert.equal(w.samples.at(-1).distance,180);assert.equal(b.priorityTurns,1);
 assert.deepEqual(w.samples.slice(0,old.samples.length),old.samples);assert.deepEqual(c,before);
 for(const knot of c.points)assert(w.samples.some(p=>p.distance===knot.distance&&p.xyz.every((x,i)=>x===knot.xyz[i])));
 for(let i=1;i<w.samples.length;i++)assert(w.samples[i].distance-w.samples[i-1].distance<=8);
 assert(w.samples.some(p=>p.distance===140&&p.xyz[0]===140&&p.xyz[1]===0));
 assert.equal(a.override,false);assert.equal(a.targetCap,null);assert.equal(b.samples.at(-1).entrySpeed,null);assert.equal(b.wholeRaceChecked,false);assert.equal(b.siCalibrated,false);
});

test('47-point near-worst subdivision remains inside the fixed local48 and raw24 budgets',()=>{
 // 22 intervals just over8 plus one short interval produce46 subdivisions.
 const distances=[0,...Array.from({length:22},(_,i)=>Math.fround((i+1)*8.0001)),Math.fround(184.01)];
 const c=capture(distances.map(distance=>({distance,xyz:[distance,0,0]}))),w=Candidate.windowFromCapture(c);
 assert.equal(c.points.length,24);assert(w.available);assert.equal(w.samples.length,47);
 assert.equal(w.samples.at(-1).distance,c.end);assert(Candidate.plan(w,policy).available);
 assert.equal(Candidate.windowFromCapture(c,{maxSamples:49}).available,false);
 assert.equal(Candidate.windowFromCapture({...c,points:[...c.points,{distance:200,xyz:[200,0,0]}]}).available,false);
 const tooMany={...w,samples:Array.from({length:49},(_,i)=>({distance:i*2,xyz:[i*2,0,0]}))};assert.equal(Candidate.plan(tooMany,policy).available,false);
});

test('a genuinely short dense native capture stays short and explicit smaller budgets still truncate',()=>{
 const c=capture(Array.from({length:24},(_,i)=>({distance:i*2,xyz:[i*2,0,0]}))),w=Candidate.windowFromCapture(c);
 assert(w.available);assert.equal(w.samples.length,24);assert.equal(w.samples.at(-1).distance,46);assert.equal(Candidate.plan(w,policy).horizonDistance,46);
 const old=Candidate.windowFromCapture(turn(),{maxSamples:24});assert.equal(old.samples.at(-1).distance,115);
 for(const changed of [{progress:-1},{end:181},{postConstructionVerified:false},{forwardOrderVerified:false},{nativeUnitScaleVerified:false}]){
  const result=Candidate.windowFromCapture({...turn(),...changed});assert(result.available===false||Candidate.plan(result,policy).available===false);
 }
});

test('expanded ordinary-race lifecycle publishes once and retains cap-before-geometry cancellation',()=>{
 globalThis.__NFSU2_FORWARD_PACING__=Candidate;const log=[],c=turn();let pending=false;
 const geometry={request(){log.push('request');pending=true;return{status:'waiting',request:2};},poll(){log.push('poll');return pending?c:{status:'waiting'};},stop(){log.push('geometry-stop');}};
 const publisher={stop(){log.push('cap-stop');},publish({window}){log.push('publish');assert.equal(window.samples.length,37);return{status:'armed',request:2,cap:Candidate.plan(window,policy).samples[0].entrySpeed,maxAgeTicks:400};}};
 const controller=new Controller({}, {installed:true,verified:true,moduleHash:PIN,moduleIdentity:{},geometry,publisher});
 const input={enabled:true,safe:true,offline:true,ordinaryRace:true,aiState:{active:true,owned:true,ownerSequence:6},expectedPace:1.3,identity:'isolated-window',policy};
 assert.equal(controller.update(input).forwardState,'requested');const state=controller.update(input);
 assert.equal(state.forwardState,'armed');assert.equal(state.forwardSamples,37);assert.equal(state.forwardHorizon,180);assert.equal(state.forwardPriorityTurns,1);
 assert.equal(state.forwardNativeApplied,false);assert.equal(state.forwardLiveVerified,false);assert.equal(state.forwardLeaseTicks,400);
 controller.stop();assert.deepEqual(log.slice(-2),['cap-stop','geometry-stop']);
});

test('diagnostics admit the expanded bounded count but retain request-only status and reject49',()=>{
 const D=require('../extension/diagnostics.js');
 for(const [count,present]of [[37,true],[48,true],[49,false]]){
  const logger=D.create({clock:()=>1000});logger.record('state',{forwardState:'armed',forwardSamples:count,forwardNativeApplied:true,forwardLiveVerified:true});
  const d=JSON.parse(logger.exportText()).events.at(-1).data;assert.equal('forwardSamples'in d,present);assert.equal('forwardNativeApplied'in d,false);assert.equal('forwardLiveVerified'in d,false);
 }
});
