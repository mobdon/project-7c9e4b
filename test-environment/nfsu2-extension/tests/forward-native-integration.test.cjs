'use strict';
// Controlled receipt at the native boundary; real production sampler, planner,
// publisher and patched native setter thereafter. This is not a live race.
const {test}=require('node:test'),assert=require('node:assert/strict');
// Mirror manifest load order before research fixtures load isolated modules.
const Pacing=require('../extension/forward-pacing.js'),ProductionClamp=require('../extension/forward-clamp.js');
const proof=require('../../work-current-profile/tools/native-proof.cjs');
const Query=require('../../research/current-native-image/query-audit.cjs');
const Native=require('../../research/current-native-image/evaluator-audit.cjs');
const {fixture,A}=require('../../work-forward-geometry/tests/fixture.cjs');
const Config=require('../extension/forward-native-config.js');
const Patcher=require('../extension/forward-native-patcher.js');
const Driving=require('../extension/forward-driving.js');
const {ABI:GeometryABI}=require('../extension/forward-geometry.js');
const {ABI:ClampABI}=require('../extension/forward-clamp.js');
const B=GeometryABI.base,CTL=0x320000,VT=0x340000,CORNER=0xd0d200;
let modulePromise;
function nativeModule(){return modulePromise??=(async()=>{
 const output=await Patcher.patchModule(proof.pinned(proof.CURRENT));
 const base=Config.importFunctions+Config.definedFunctions;
 const helperIds=Config.helpers.map((h,i)=>base+i),ids=[...Query.IDS,...helperIds,6140];
 const built=Native.privateModule(Buffer.from(output),new Set(ids),[...helperIds,6140]);
 return{module:built.module,helperIds};
})();}
async function world({progress=50,dense=false}={}){
 globalThis.__NFSU2_FORWARD_PACING__=Pacing;globalThis.__NFSU2_FORWARD_CLAMP__=ProductionClamp;const f=await fixture(),built=await nativeModule();f.context();f.commit(f.stack-4096,8192);
 f.commit(CTL,0x240);f.commit(VT,60);f.commit(CORNER,64);
 f.u(A.driver+8,CTL);f.u(A.car+0x34,CTL);f.u(CTL+0x220,A.car);f.u(CTL,VT);f.u(VT+56,0x4054a0);
 f.u(CORNER,0x33524e43);f.u(CORNER+4,3);
 for(let i=0;i<3;i++){
  const road=f.group+140+56*i;f.f32(road,Math.min(i,1)*100);f.f32(road+4,i===2?100:0);f.h(road+18,0);f.h(road+24,i===2?0:32767);f.h(road+26,i===2?32767:0);
  f.view.setInt8(road+32,0);f.view.setInt8(road+33,0);
 }
 if(dense){
  const count=19;f.u(f.route+4,count);f.view.setInt16(f.group+52,count,true);f.commit(f.group,140+56*count);f.commit(A.nodeBase,count*128);
  for(let i=0;i<count;i++){
   const node=A.nodeBase+i*128,road=f.group+140+56*i,d=i*10;
   f.u(f.route+8+i*4,node);f.u(node,0x784a48);f.u(node+100,f.route);f.f32(node+84,d);f.f32(node+88,0);f.h(node+92,0);f.h(node+94,i);
   f.f32(road,Math.min(d,140));f.f32(road+4,Math.max(0,d-140));f.u(road+12,0);f.h(road+18,0);f.h(road+24,d>=140?0:32767);f.h(road+26,d>=140?32767:0);f.view.setInt8(road+32,0);f.view.setInt8(road+33,0);
  }
 }
 [Math.min(progress,100),Math.max(0,progress-100),0].forEach((x,i)=>f.f32(f.car+0x60+4*i,x));
 const imports={env:{memory:f.memory}};
 for(const item of WebAssembly.Module.imports(built.module))if(item.kind==='function')((imports[item.module]??={})[item.name]=()=>{throw Error('Unexpected native host import: '+item.name);});
 const native=new WebAssembly.Instance(built.module,imports).exports;
 const e=Object.fromEntries(Config.helpers.map((h,i)=>[h.name,native['f'+built.helperIds[i]]]));
 f.data.fill(0,B,B+GeometryABI.size);
 const session=new Driving.Controller(f.memory,{installed:true,verified:true,moduleHash:proof.CURRENT.hash,moduleIdentity:{}});
 const options={enabled:true,safe:true,offline:true,ordinaryRace:true,aiState:{active:true,owned:true,ownerSequence:2},expectedPace:1.45,identity:'controlled-native-race-4715',
  policy:{lateralAcceleration:6,brakingDeceleration:5,reactionSeconds:.6,marginDistance:8}};
 function capture(){
  assert.equal(session.update(options).forwardState,'requested');const seq=f.u(B+8);
  const projectionSP=f.stack,targetSP=f.stack-4;
  f.u(projectionSP,0x42879f);f.u(f.cpu+32,0x42879f);f.u(f.cpu+16,projectionSP+20);f.u(f.cpu,progress<=100?1:2);
  f.f32(projectionSP+40,progress);f.f32(projectionSP+56,0);
  e.fwg_projection_post(f.cpu,f.route,projectionSP,f.car+0x60,projectionSP+40,projectionSP+56);
  assert.equal(f.u(B+640),seq);
  f.u(targetSP,0x428a6b);f.u(f.cpu+16,targetSP);const prepared=e.fwg_ready(f.cpu,f.route,targetSP,0);assert.equal(prepared,seq);
  f.u(f.cpu+16,targetSP+24);f.u(f.cpu+32,0x428a6b);e.fwg_after(f.cpu,f.route,targetSP,prepared,1);
  assert.equal(f.u(B+16),seq);assert.equal(f.u(B+20),0);assert.equal(e.fwg_generation(),seq);
  return session.update(options);
 }
 function target(speed){
  f.u(f.cpu+4,CTL);f.u(f.cpu+16,f.stack);f.u(f.stack,0x41c980);f.f32(f.stack+4,speed);
  f.u(f.stack+8,0x7fa12345);f.u(f.stack+12,0xffc12345);f.u(f.stack+16,1);
  native.f6140(f.cpu);return f.f32(CTL+0x230);
 }
 return{...f,e,native,session,options,capture,target};
}

test('production native pipeline captures zero-corner route geometry and lowers the fully factored target',async()=>{
 const f=await world(),car=Buffer.from(f.data.subarray(f.car,f.car+0x9c)),state=f.capture();
 assert.equal(state.forwardState,'armed');assert.equal(f.session.geometry.last.cornerCount,0);
 assert.equal(f.session.geometry.last.postConstructionVerified,true);assert.equal(f.session.geometry.last.nativeUnitScaleVerified,true);
 assert.equal(f.session.geometry.last.metricScaleVerified,false);assert.equal(f.session.geometry.last.controlWord,0x37f);
 assert.ok(state.forwardSamples>=3&&state.forwardSamples<=24);assert.ok(state.forwardHorizon>0);assert.ok(state.forwardPriorityTurns>=1);
 assert.ok(state.forwardRequestedTarget>0&&state.forwardRequestedTarget<180);
 assert.equal(state.forwardNativeApplied,false);assert.equal(state.forwardLiveVerified,false);
 assert.equal(f.target(180),state.forwardRequestedTarget);
 assert.equal(f.u(CTL+0x234),0x7fa12345);assert.equal(f.u(CTL+0x238),0xffc12345);assert.equal(f.view.getUint8(CTL+0x23c),1);
 assert.deepEqual(Buffer.from(f.data.subarray(f.car,f.car+0x9c)),car);
});

test('production Stop revokes the native cap and preserves the original native request',async()=>{
 const f=await world();assert.equal(f.capture().forwardState,'armed');assert.ok(f.target(180)<180);
 assert.equal(f.session.stop().forwardState,'off');assert.equal(f.u(ClampABI.base+12),0);assert.equal(f.u(B+640),0);
 assert.equal(f.target(180),180);
});

test('production cap expires at its native tick lease and rejects same-pointer road changes',async()=>{
 for(const kind of ['expired','road-change','clock-reset']){
  const f=await world();assert.equal(f.capture().forwardState,'armed');
  if(kind==='expired')f.u(0x86518c,400+ClampABI.maxAgeTicks+1);
  if(kind==='road-change')f.view.setUint8(f.group+140+40,f.view.getUint8(f.group+140+40)^1);
  if(kind==='clock-reset')f.u(f.race+20,999);
  assert.equal(f.target(180),180,kind);f.session.stop();
 }
});

test('production native two-anchor straight tail is observed without extrapolation or an artificial target',async()=>{
 const f=await world({progress:150}),state=f.capture(),capture=f.session.geometry.last;
 assert.equal(state.forwardState,'native-fallback');assert.equal(capture.points.length,2);assert.deepEqual(capture.points.map(p=>p.distance),[100,200]);
 assert.equal(capture.progress,150);assert.equal(capture.end,200);assert(state.forwardSamples>=3);assert.equal(state.forwardHorizon,50);
 assert.equal(state.forwardRequestedTarget,undefined);assert.equal(state.forwardLeaseTicks,0);assert.equal(f.target(180),180);f.session.stop();
});

test('unchanged native sampler reaches the later sharp knot through the expanded local window',async()=>{
 const f=await world({progress:0,dense:true}),state=f.capture(),capture=f.session.geometry.last;
 assert.equal(state.forwardState,'armed');assert.equal(capture.points.length,19);assert.equal(capture.end,180);assert.equal(capture.cornerCount,0);
 assert.equal(state.forwardSamples,37);assert.equal(state.forwardHorizon,180);assert.equal(state.forwardPriorityTurns,1);
 const released=require('../extension/forward-pacing.js'),old=released.windowFromCapture(capture,{maxSamples:24}),oldPlan=released.plan(old,f.options.policy);
 assert.equal(old.samples.at(-1).distance,115);assert.equal(oldPlan.priorityTurns,0);
 assert.equal(f.target(180),state.forwardRequestedTarget);assert.equal(state.forwardLeaseTicks,400);assert.equal(state.forwardNativeApplied,false);assert.equal(state.forwardLiveVerified,false);
 // The new JavaScript budget does not extend the native lease or permit a
 // changed same-pointer road, even when the retained window includes a turn.
 f.u(0x86518c,400+ClampABI.maxAgeTicks+1);assert.equal(f.target(180),180);f.session.stop();
});
