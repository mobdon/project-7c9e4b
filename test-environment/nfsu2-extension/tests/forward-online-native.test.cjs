'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Registry=require('../extension/forward-native-config.js');
const Probe=require('../extension/route-probe.js');
const {world,nativeModule}=require('./fixtures/forward-native-world.cjs');
const P=require('../../work-current-profile/tools/native-proof.cjs');
const Native=require('../../research/current-native-image/evaluator-audit.cjs');
const markers=[['mode8',0x850078,8],['mode512',0x850078,512],['host',0x866a14,1],['client',0x8669f4,1],['online',0x89cf69,1,1]];
for(const profile of Object.values(Registry.profiles)){
 const revision=profile.revision;
 test(revision+' actual native online sampler/setter require literal current permission for every marker',async()=>{
  for(const[label,p,value,n=4]of markers){
   const f=await world(revision,{network:[[p,value,n]],permission:1}),s=f.capture();assert.equal(s.forwardState,'armed',label);
   assert.equal(s.forwardPriorityTurns,1);assert.equal(s.forwardLeaseTicks,400);assert.equal(s.forwardNativeApplied,false);assert.equal(s.forwardLiveVerified,false);
   assert.equal(f.target(180),s.forwardRequestedTarget);assert.equal(f.session.geometry.last.moduleHash,profile.moduleHash);assert.equal(f.session.geometry.abi.bitmap,profile.runtime.bitmap);
   f.u(0xd0d100+84,0);assert.equal(f.target(180),180,'withdrawn permission');f.session.stop();
   for(const permission of [0,2]){const denied=await world(revision,{network:[[p,value,n]],permission});assert.equal(denied.session.update({...denied.options,allowNetwork:true}).forwardState,'unknown');assert.equal(denied.target(180),180);}
  }
 });
 test(revision+' native status-only online context and every tuple change remain bound to the request',async()=>{
  const [on,ok,inRoam]=profile.runtime.onlineAddresses;
  const f=await world(revision,{network:[[on,1],[ok,1,1],[inRoam,1]],permission:1});assert.equal(f.capture().forwardState,'armed');assert(f.target(180)<180);f.session.stop();
  for(const [p,value,n=4]of [[0xd0d100+84,2],[0x850078,512],[0x866a14,2],[0x8669f4,2],[0x89cf69,2,1],[0x850088,2],[on,2],[ok,2,1],[inRoam,2]]){
   const g=await world(revision,{network:[[0x850078,8]],permission:1});assert.equal(g.capture().forwardState,'armed');if(n===1)g.view.setUint8(p,value);else g.u(p,value);
   assert.notEqual(g.e.fwg_context(g.route),0);assert.equal(g.e.fwg_fresh(g.route),0);assert.equal(g.target(180),180);g.session.stop();
  }
  const changed=await world(revision,{network:[[0x850078,8]],permission:1});assert.equal(changed.capture({beforePoll:g=>g.u(inRoam,2)}).forwardState,'unknown');assert.equal(changed.target(180),180);
 });
 test(revision+' local ownership, memory, source, phase and special modes stay protected online',async()=>{
  const changes=[g=>g.u(g.player+4,g.car+4),g=>g.u(g.driver+4,g.car+4),g=>g.u(g.controller+0x220,g.car+4),g=>g.u(g.driver+0x6e8,g.route+4),g=>g.data[g.group+140+40]^=1,g=>g.u(0x89e7a4,1),g=>g.u(g.race+20,999),g=>g.u(0xd0d100+8,0),g=>g.u(0xd0d100+4,4),g=>g.u(g.race,3),g=>g.view.setUint8(0x89e7e3,1),g=>g.u(0x89010c,1),g=>g.u(0x850088,10),g=>g.view.setUint8(0x89e7d8,1),g=>g.view.setUint8(0x89e7d9,1),g=>g.u(0x89e7b0,7),g=>{g.u(0xd0d100+8,2);g.u(0x89e7b0,0);g.u(0xd00030,2);},g=>{const pg=0x850088>>>14,at=g.abi.bitmap+(pg>>>3);g.data[at]&=~(1<<(pg&7));}];
  for(const change of changes){const g=await world(revision,{network:[[0x850078,8]],permission:1});assert.equal(g.capture().forwardState,'armed');change(g);assert.equal(g.target(180),180);g.session.stop();}
 });
 test(revision+' exact400-tick lease, lower native requests and immediate Stop are preserved',async()=>{
  const f=await world(revision,{network:[[0x850078,8]],permission:1}),s=f.capture();assert.equal(s.forwardState,'armed');
  for(const value of [1,0,-0,-12,NaN,Infinity,-Infinity])assert(Object.is(f.target(value),Math.fround(value)));
  f.u(0x86518c,800);assert.equal(f.target(180),s.forwardRequestedTarget);f.u(0x86518c,801);assert.equal(f.target(180),180);
  f.session.stop();assert.equal(f.u(f.abi.base+512+12),0);assert.equal(f.u(f.abi.base+640),0);assert.equal(f.target(180),180);
 });
 test(revision+' dense JavaScript window preserves the later native knot with zero special corners',async()=>{
  const f=await world(revision,{network:[[0x850078,8]],permission:1,progress:0,dense:true}),s=f.capture();
  assert.equal(s.forwardState,'armed');assert.equal(f.session.geometry.last.points.length,19);assert.equal(f.session.geometry.last.cornerCount,0);
  assert.equal(s.forwardSamples,37);assert.equal(s.forwardHorizon,180);assert.equal(s.forwardPriorityTurns,1);assert.equal(f.target(180),s.forwardRequestedTarget);f.session.stop();
 });
 test(revision+' settled2xpace retains the zero-corner dense bend and changed pace requires a fresh capture',async()=>{
  const f=await world(revision,{network:[[0x850078,8]],permission:1,progress:0,dense:true,pace:2}),s=f.capture(),first=f.session.geometry.last.request;
  assert.equal(s.forwardState,'armed');assert.equal(f.session.geometry.last.pace,2);assert.equal(f.session.geometry.last.cornerCount,0);assert.equal(s.forwardSamples,37);assert.equal(s.forwardPriorityTurns,1);
  assert.equal(f.target(90*2),s.forwardRequestedTarget);
  f.u(0xd0d100+60,210);f.u(0xd0d100+76,210);f.f32(f.driver+0x770,2.1);assert.equal(f.target(180),180,'settled pace change invalidates the previous native cap');
  f.options.expectedPace=2.1;if(profile.capabilities.nativePolicy){assert.equal(f.session.update(f.options).forwardState,'unknown');assert.equal(f.target(180),180);f.session.stop();return;}
  const next=f.capture();assert.equal(next.forwardState,'armed');assert.notEqual(f.session.geometry.last.request,first);assert.equal(f.session.geometry.last.pace,2.1);assert.equal(f.target(180),next.forwardRequestedTarget);f.session.stop();
 });
 test(revision+' cross-build capture metadata cannot authorize a cap in another verified memory profile',async()=>{
  const f=await world(revision,{network:[[0x850078,8]],permission:1});assert.equal(f.capture().forwardState,'armed');
  const other=Object.values(Registry.profiles).find(p=>p.moduleHash!==profile.moduleHash),capture={...f.session.geometry.last,moduleHash:other.moduleHash};
  assert.throws(()=>f.session.publisher.publish({capture,policy:f.options.policy}));assert.equal(f.target(180),180);f.session.stop();
  assert.equal(Probe.capture(f.memory,{verified:true,moduleHash:'f'.repeat(64),expectedPace:1.45,allowNetwork:true}).status,'unavailable');
 });
 test(revision+' native online post-hook changes only the final owned controller target in the bounded memory comparison',async()=>{
  const f=await world(revision,{network:[[0x850078,8]],permission:1}),s=f.capture(),built=await nativeModule(profile);
  const raw=Native.privateModule(built.input,new Set([6140]),[6140]),imports={env:{memory:f.memory}};for(const item of WebAssembly.Module.imports(raw.module))if(item.kind==='function')((imports[item.module]??={})[item.name]=()=>{throw Error('Unexpected host import');});
  const original=new WebAssembly.Instance(raw.module,imports).exports,pre=Buffer.from(f.data.subarray(0,0x1000000));assert.equal(f.target(180),s.forwardRequestedTarget);const patched=Buffer.from(f.data.subarray(0,0x1000000));f.data.set(pre,0);
  f.u(f.cpu+4,f.controller);f.u(f.cpu+16,f.stack);f.u(f.stack,0x41c980);f.f32(f.stack+4,180);f.u(f.stack+8,0x7fa12345);f.u(f.stack+12,0xffc12345);f.u(f.stack+16,1);original.f6140(f.cpu);
  const changed=[];for(let i=0;i<patched.length;i++)if(f.data[i]!==patched[i])changed.push(i);assert(changed.length>0&&changed.length<=4);assert(changed.every(p=>p>=f.controller+0x230&&p<f.controller+0x234));f.session.stop();
 });
 test(revision+' full authored patch compiles and preserves every native body outside the reviewed hooks',async()=>{
  const b=await nativeModule(profile);await WebAssembly.compile(b.output);const before=P.parse(b.input),after=P.parse(b.output),changed=[];
  // Exact93cf/AA native proofs retain route planner13185.
  const expected=['aa2429fb','15e5958f','943ee537'].includes(revision)?[1298,6140,13185,13653,13962]:revision==='93cfc6e9'?[1298,6140,13185]:[1298,6140,13186];
  for(const[id,body]of before.bodies)if(!body.equals(after.bodies.get(id)))changed.push(id);assert.deepEqual(changed,expected);
  assert.equal(after.bodies.size,before.bodies.size+profile.helpers.length);for(const id of [2,4,7,8,9,11,12,13])assert.deepEqual(after.sections.find(s=>s.id===id)?.bytes,before.sections.find(s=>s.id===id)?.bytes);
 });
}
