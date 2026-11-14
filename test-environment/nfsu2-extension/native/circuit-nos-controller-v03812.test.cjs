'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {controller,A,E,built,nativeNOSBuilt}=require('./circuit-controller-v03812.cjs');
const {Engine}=require('../extension/core.js');
const controls=f=>{const o=f.outputs();return[o.throttle,o.brake,o.handbrake];};
function engine(f){
 f.put(0x8654a4,6);f.put(0xd00000,A.handle);f.put(A.handle+4,A.car);f.put(A.handle+0x10,0);f.put(E.race,4);
 f.f32(A.car+0x440,3000);f.put(A.car+0x434,3);
 const e=new Engine(f.memory);assert.equal(e.state().ready,true);return e;
}

test('current943 controller and native NOS readers retain pinned complete bodies',async()=>{
 const a=await built,b=await nativeNOSBuilt;
 assert.equal(a.sourceSha256,'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391');
 assert.equal(b.sourceSha256,a.sourceSha256);
 assert.equal(a.hashes[15844],'78812236c8963b86baee3a876c954bc507a155eb079facc0e8eec4a98e98032d');
 assert.equal(b.hashes[15844],a.hashes[15844]);
 assert.equal(b.hashes[17783],'dc68c682b0e62006037464fa77f04c3cbae21ef512bcf25eba4f7e0de69e5840');
 assert.equal(b.hashes[5896],'ad648f1a1ea3f0f4ab0430add319e5a7940c6869f35920e497c8cccbac922d7c');
 assert.equal(b.hashes[5585],'1076cb77fbb55741ffde856603857da8f58710a1a1766cf2322d51cd5067de11');
});

test('inactive native NOS leaves explicit zero-target wheel-contact braking intact',async()=>{
 for(const speed of[-5,0,1,27,80]){
  const f=await controller({nativeNOS:true,speed});const before=f.bytes(A.car,0x9e4);
  assert.equal(f.sampleNOS(),0);f.run();assert.deepEqual(controls(f),[0,1,0]);
  assert.equal(f.outputs().latch,0);assert.deepEqual(f.bytes(A.car,0x9e4),before);
 }
});

test('native zero and sentinel timestamps do not report active NOS',async()=>{
 for(const since of[0,0x7fffffff]){
  const f=await controller({nativeNOS:true,since});assert.equal(f.sampleNOS(),0);
  assert.equal(f.events.length,0);f.run();assert.deepEqual(controls(f),[0,1,0]);
 }
});

test('controller overwrites the already-produced full-brake pair after active NOS query',async()=>{
 const f=await controller({nos:true});const before=f.bytes(A.car,0x9e4);f.run();
 assert.deepEqual(f.events.find(e=>e.kind==='nos-query'),{kind:'nos-query',self:A.car+0x40,throttle:0,brake:1});
 assert.deepEqual(controls(f),[1,0,0]);assert.equal(f.outputs().target,0);assert.equal(f.outputs().latch,1);
 assert.deepEqual(f.bytes(A.car,0x9e4),before);
});

test('actual native active-timestamp and resource readers reproduce the same override',async()=>{
 const f=await controller({nativeNOS:true,nos:true});const before=f.bytes(A.car,0x9e4);
 assert(f.sampleNOS()>0);f.run();assert.deepEqual(controls(f),[1,0,0]);assert.equal(f.outputs().latch,1);
 assert.equal(f.events.some(e=>e.kind==='native-stop-nos'),false);assert.deepEqual(f.bytes(A.car,0x9e4),before);
});

test('a target fall clears the native override for one call and a stable target can relatch',async()=>{
 const f=await controller({nativeNOS:true,nos:true,previousTarget:34});f.run();
 assert.deepEqual(controls(f),[0,1,0]);assert.equal(f.outputs().latch,0);assert.equal(f.outputs().previousTarget,0);
 f.run();assert.deepEqual(controls(f),[1,0,0]);assert.equal(f.outputs().latch,1);
});

test('an existing native latch can retain held throttle after NOS query becomes inactive',async()=>{
 const f=await controller({nativeNOS:true,latch:true});assert.equal(f.sampleNOS(),0);f.run();
 assert.deepEqual(controls(f),[1,0,0]);assert.equal(f.outputs().latch,1);
 f.f32(E.controller+0x260,34);f.run();assert.deepEqual(controls(f),[0,1,0]);assert.equal(f.outputs().latch,0);
});

test('native Drag and forced-Drag gates clear this override',async()=>{
 for(const forced of[false,true]){
  const f=await controller({nativeNOS:true,nos:true,latch:true});
  if(forced)f.put(0x890108,1);else f.u8(0x89e7d8,1);
  f.run();assert.deepEqual(controls(f),[0,1,0]);assert.equal(f.outputs().latch,0);
 }
});

test('native override uses held-throttle field rather than the requested speed',async()=>{
 const f=await controller({nativeNOS:true,nos:true});f.f32(E.controller+0x22c,.35);f.run();
 assert.equal(f.outputs().throttle,Math.fround(.35));assert.equal(f.outputs().brake,0);assert.equal(f.outputs().target,0);
});

test('existing refill replenishes inactive resources without starting native NOS',async()=>{
 const f=await controller({nativeNOS:true,left:1000});const e=engine(f);
 assert.equal(e.refill(e.state()),true);assert.equal(f.get(A.car+0x45c),10000);assert.equal(f.get(A.car+0x460),0);
 assert.equal(f.sampleNOS(),0);f.run();assert.deepEqual(controls(f),[0,1,0]);
});

test('existing refill refreshes an active timestamp and can sustain native override eligibility',async()=>{
 const expired=await controller({nativeNOS:true,nos:true,ticks:13000});assert.equal(expired.sampleNOS(),0);
 const f=await controller({nativeNOS:true,nos:true,ticks:13000,left:1000});const e=engine(f);
 assert.equal(e.refill(e.state()),true);assert.equal(f.get(A.car+0x45c),10000);assert.equal(f.get(A.car+0x460),13000);
 assert(f.sampleNOS()>0);f.run();assert.deepEqual(controls(f),[1,0,0]);
});
