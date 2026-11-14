'use strict';
// Actual hash-pinned native query/sampler/publisher/setter with a controlled
// projection/construction boundary. No live race outcome is inferred.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {world}=require('./fixtures/forward-native-world.cjs'),Pacing=require('../extension/forward-pacing.js');
const B=0xd0d800,C=B+512,REVS=['3bdd9959','d2fa4f4c','cd5b74d5','8abf9be8'];
for(const revision of REVS){
 test(revision+' fresh native permission snapshot denies every raw nonzero network marker without a valid opt-in',async()=>{
  for(const marker of [[[0x850078,8]],[[0x850078,512]],[[0x866a14,2]],[[0x8669f4,2]],[[0x89cf69,2,1]]]){
   const f=await world(revision,{network:marker,permission:1});assert.equal(f.capture().forwardState,'armed');f.u(0xd0d100+84,0);f.u(B+124,f.u(B+8));assert.equal(f.e.fwg_network_snapshot(),1);f.u(B+124,0);assert.equal(f.e.fwg_network_bound(),0);assert.notEqual(f.e.fwg_context(f.route),0);assert.equal(f.target(180),180);f.session.stop();
  }
  const f=await world(revision,{permission:1}),a=f.profile.runtime.onlineAddresses;for(let i=0;i<3;i++)if(i===1)f.view.setUint8(a[i],2);else f.u(a[i],2);assert.equal(f.capture().forwardState,'armed');f.u(0xd0d100+84,0);f.u(B+124,f.u(B+8));assert.equal(f.e.fwg_network_snapshot(),1);f.u(B+124,0);assert.equal(f.e.fwg_network_bound(),0);assert.equal(f.target(180),180);f.session.stop();
 });
 test(revision+' final native fence rejects zero/negative/nonfinite caps while preserving native zero and lower targets',async()=>{
  for(const cap of [0,-0,-1,NaN,Infinity,-Infinity,151]){const f=await world(revision);assert.equal(f.capture().forwardState,'armed');f.f32(C+88,cap);assert.equal(f.target(180),180);f.session.stop();}
  const f=await world(revision);assert.equal(f.capture().forwardState,'armed');for(const native of [0,-0,-1,NaN,Infinity,-Infinity,1])assert(Object.is(f.target(native),Math.fround(native)));f.session.stop();
 });
}
test('production8ab native policy handles straight→gradual/75/90→aligned exit across.75–2 selected pace',async()=>{
 for(const pace of [.75,1,1.5,2])for(const angle of [0,15,75,90])for(const progress of [50,95,125]){
  const f=await world('8abf9be8',{pace,angle,progress}),s=f.capture(),capture=f.session.geometry.last,p=capture.nativePolicy;
  assert.equal(p.source,'exact-native-grade-policy-v1');assert.equal(p.grip,Math.fround(3.7));assert.equal(p.brakingDeceleration,12);assert.equal(capture.cornerCount,0);
  if(angle===0||progress>100){assert.equal(s.forwardState,'native-fallback');assert.equal(f.target(180),180);}
  else {assert.equal(s.forwardState,'armed');assert.equal(f.target(180),s.forwardRequestedTarget);assert.equal(f.target(0),0);assert.equal(f.target(1),1);}
  f.session.stop();
 }
});
test('production native policy follows bounded10-degree geometry/table/settings and holds an unaligned past apex',async()=>{
 const g=await world('8abf9be8',{pace:2,angle:10});g.options.policy={mode:'native',cornerFactor:.95,sharpMargin:0,brakingFactor:1,reactionSeconds:.1,marginDistance:0};
 const s=g.capture(),capture=g.session.geometry.last,p=capture.nativePolicy,curvature=2*Math.sin(5*Math.PI/180)/16,curve=Math.sqrt(p.grip*p.gravity/curvature)*.95,a=p.brakingDeceleration,expected=Math.fround(Math.max(curve,Math.sqrt((a*.1)**2+curve**2+2*a*50)-a*.1));
 assert.equal(s.forwardState,'armed');assert(Math.abs(s.forwardRequestedTarget-expected)<1e-4);assert.equal(g.target(180),s.forwardRequestedTarget);assert.equal(g.target(1),1);g.session.stop();
 const f=await world('8abf9be8',{pace:2,progress:125,exitAligned:false}),held=f.capture();assert.equal(held.forwardState,'armed');assert(held.forwardRequestedTarget<60);assert.equal(f.target(180),held.forwardRequestedTarget);f.session.stop();
});

test('8abf9be8 receipt-backed planner retains nearby circular-radius sensitivity',async()=>{
 const f=await world('8abf9be8',{pace:2});f.capture();const captured=f.session.geometry.last,results=[];
 for(const radius of [50,55,60]){
  const points=Array.from({length:21},(_,i)=>{const angle=i*5*Math.PI/180;return{distance:radius*angle,xyz:[radius*Math.sin(angle),radius*(1-Math.cos(angle)),0]};});
  const capture={...captured,progress:0,end:points.at(-1).distance,points},policy=capture.nativePolicy,r=Pacing.planNative(capture,policy,{pace:2,cornerFactor:.95,sharpMargin:0,brakingFactor:1,reactionSeconds:.1,marginDistance:0});
  assert(r.available&&r.override);assert.equal(r.priorityTurns,1);
  for(const c of r.constraints){assert(Math.abs(c.curvature-1/radius)<1e-12);assert(Math.abs(c.curveSpeed-Math.sqrt(policy.grip*policy.gravity*radius)*.95)<1e-8);}
  results.push(r.targetCap);
 }
 assert(results[0]<results[1]&&results[1]<results[2]);f.session.stop();
});
test('production8ab policy source/receipt mutation immediately revokes native use and forged caller policy is rejected',async()=>{
 const mutations=[f=>f.view.setUint8(f.ride+0x14,1),f=>f.view.setUint8(f.ride+0x14,255),f=>f.u(f.ride,1),f=>f.u(f.car+16,f.ride+4),f=>f.u(0x8a1ccc,f.types+4),f=>f.view.setUint8(f.types+0x88a,1),f=>f.f32(0x7a4740,11),f=>f.f32(0x7a4750,1),f=>f.f32(0x7a51b8,9.81),f=>f.u(B+616,999),f=>f.f32(B+620,2),f=>{const pg=f.ride>>>14,at=f.abi.bitmap+(pg>>>3);f.view.setUint8(at,f.view.getUint8(at)&~(1<<(pg&7)));}];
 for(const mutate of mutations){const f=await world('8abf9be8');assert.equal(f.capture().forwardState,'armed');mutate(f);assert.equal(f.e.fwg_policy_current(),0);assert.equal(f.target(180),180);f.session.stop();}
 const f=await world('8abf9be8');f.capture();const capture=f.session.geometry.last;assert.throws(()=>f.session.publisher.publish({capture:{...capture,nativePolicy:{...capture.nativePolicy,grip:1}},policy:f.options.policy}),/Native policy receipt/);assert.equal(f.target(180),180);f.session.stop();
});
test('native-policy literal on older verified profiles remains capture-only and cannot fall through to guessed limits',async()=>{
 for(const revision of REVS.slice(0,3)){const f=await world(revision);f.options.applyTarget='native-policy';f.options.policy={mode:'native',brakingFactor:.75};const s=f.capture();assert.equal(s.forwardState,'observed');assert.equal(f.target(180),180);assert.equal(f.u(C+12),0);f.session.stop();}
});
test('production8ab policy can read the verified second window and its native lease denies window/page withdrawal',async()=>{
 for(const withdraw of ['window','page']){
  const f=await world('8abf9be8',{pace:2});f.memory.grow(32766-f.memory.buffer.byteLength/65536);const v=new DataView(f.memory.buffer),types=0x50010000;
  v.setUint32(0x2978be80,0x50000000,true);v.setUint32(0x2978be84,0x7ffe0000,true);f.u(0x8a1ccc,types);v.setUint8(types+0x88a,1);f.commit(types,0x890);
  const s=f.capture();assert.equal(s.forwardState,'armed');assert.equal(f.session.geometry.last.nativePolicy.grip,3);assert(f.target(180)<180);
  if(withdraw==='window')v.setUint32(0x2978be80,0x50004000,true);else{const pg=types>>>14,at=f.abi.bitmap+(pg>>>3);v.setUint8(at,v.getUint8(at)&~(1<<(pg&7)));}
  assert.equal(f.target(180),180);f.session.stop();
 }
});
test('unready native grade255 rejects capture without lazy initialization, publication or an invented stop',async()=>{
 const f=await world('8abf9be8');f.view.setUint8(f.ride+0x14,255);const s=f.capture({expectedNativeCode:10});assert.equal(s.forwardState,'unknown');assert.equal(s.forwardFailureCode,10);assert.equal(s.forwardCaptured,false);assert.equal(s.forwardRequestedTarget,undefined);assert.equal(f.view.getUint8(f.ride+0x14),255);assert.equal(f.u(C+12),0);assert.equal(f.target(180),180);assert.equal(require('../extension/forward-geometry.js').reasons[10],'Native car grade or policy data is unavailable');assert.equal(f.session.stop().forwardFailureCode,undefined);
});
