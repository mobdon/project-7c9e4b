'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,Product,B,profiles}=require('./pace-phase-fixture-v03812.cjs');
const X=0xd0d240,MAX_AGE=400;

test('actual native cache rise and fall preserve only the physically published target factor until next publication',async()=>{
 for(const profile of profiles)for(const kind of[1,3])for(const [before,next] of [[1,1.485],[1.485,1]]){
  const{f}=await make(profile.revision,kind),M=Math.fround(before),N=Math.fround(next),ack=f.enable(M);assert(ack,profile.revision+'/'+kind);
  const targets=[13653,13962].map(id=>f.policy(id)),outputs=f.phaseOutputs(),pub=f.u(B+252),receipt=f.data.slice(X,X+64);
  f.nativeCache(N);assert.deepEqual(f.phaseOutputs(),outputs);assert.equal(f.u(B+252),pub);assert.deepEqual(f.data.slice(X,X+64),receipt);
  for(const [i,id]of[13653,13962].entries()){const cache=[f.u(f.driver+0x770),f.u(f.car+0x468)];assert.equal(f.policy(id),targets[i]);assert.equal(f.u(B+76),120);assert.deepEqual([f.u(f.driver+0x770),f.u(f.car+0x468)],cache);}
  const phase=Product.readEvidence(f.memory);assert.equal(phase.ackRejectCode,0);assert.equal(phase.ack.sourceFactor,M);assert.equal(phase.ack.nativeTargetFactor,M);assert.equal(phase.ack.currentNativeSourceFactor,N);
  f.publish(N);const fresh=Product.readAck(f.memory);assert(fresh);assert.equal(fresh.sourceFactor,N);assert.equal(fresh.nativeTargetFactor,N);assert.notDeepEqual(f.phaseOutputs(),outputs);
  const updated=f.policy(13962);assert.equal(f.u(B+76),120);assert(next>before?updated>targets[1]:updated<targets[1]);
 }
});

test('publication records the exact native target factor separately from the floored physical M',async()=>{
 for(const kind of[1,3]){
  const{f}=await make('943ee537',kind);const ack=f.enable(1,{driverM:.95});assert(ack);assert.equal(ack.nativeTargetFactor,Math.fround(.95));assert.equal(ack.sourceFactor,1);
  const target=f.policy(13962);f.nativeCache(1.485);assert.equal(f.policy(13962),target);assert.equal(f.u(B+76),120);
 }
});

test('zero and negative current native intent cannot inherit a positive published target',async()=>{
 for(const kind of[1,3])for(const next of[0,-.5]){
  const{f}=await make('943ee537',kind);assert(f.enable());f.nativeCache(next);
  f.policy(13962);assert.equal(f.u(B+76),100);assert(f.f32(f.controller+0x230)<=0);
 }
});

test('real scalar, tire or combined-grip changes revoke native P despite a valid prior source receipt',async()=>{
 for(const kind of[1,3])for(const field of kind===1?['power','chassis','wheel0','wheel3']:['power','chassis','drive','grip']){
  const{f,out}=await make('943ee537',kind);assert(f.enable());f.nativeCache(1.485);
  const address=field==='power'?(kind===1?out.power+8:out.aero+8):field==='chassis'?out.chassis+0x208:field==='drive'?out.drivetrain+0x13c:field==='grip'?out.drivetrain+0x140:out.wheels[field==='wheel0'?0:3]+0x184;
  f.f32(address,f.f32(address)+.25);assert.equal(Product.readAck(f.memory),null);f.policy(13962);assert.equal(f.u(B+76),100);
 }
});

test('game and race tick leases expire, roll back and reject missing or malformed phase metadata',async()=>{
 for(const kind of[1,3])for(const mutate of[
  f=>f.u(0x86518c,f.u(X+44)+MAX_AGE+1),f=>f.u(f.race+20,f.u(X+56)+MAX_AGE+1),
  f=>f.u(0x86518c,f.u(X+44)-1),f=>f.u(f.race+20,f.u(X+56)-1),
  f=>f.u(X+52,0),f=>f.f32(X+48,NaN),f=>f.f32(X+8,Infinity)
 ]){
  const{f}=await make('943ee537',kind);assert(f.enable());f.nativeCache(1.485);mutate(f);
  assert.equal(Product.readAck(f.memory),null);f.policy(13962);assert.equal(f.u(B+76),100);
 }
});

test('owner, command, physical kind, receiver identity and manual/F9 Off revoke publication authority immediately',async()=>{
 for(const kind of[1,3])for(const mutate of[
  f=>f.u(B+4,4),f=>{Product.command(f.memory,{enabled:false});f.u(B+8,0);f.u(B+60,100);},f=>f.u(f.car+0x28,kind===1?3:1),
  f=>f.u(f.car+0x34,f.u(f.car+0x34)+4),f=>f.u(B+8,0),f=>f.u(B+52,0),f=>f.u(f.car+0x24,1),
  f=>f.u(0x8654a4,3),f=>f.u(B+48,180)
 ]){
  const{f}=await make('943ee537',kind);assert(f.enable());f.nativeCache(1.485);mutate(f);
  f.policy(13962);assert.equal(f.u(B+76),100);
 }
});

test('independent Wasm instances share the same bounded publication phase without native input writes',async()=>{
 for(const kind of[1,3]){
  const{f}=await make('943ee537',kind);assert(f.enable());const target=f.policy(13962);f.nativeCache(1.485);
  const source=[f.u(f.driver+0x770),f.u(f.car+0x468)],controls=f.data.slice(f.controller+0x1e0,f.controller+0x218),old=f.native;f.native=f.createPeer();
  assert.equal(f.policy(13962),target);assert.equal(f.u(B+76),120);assert.deepEqual([f.u(f.driver+0x770),f.u(f.car+0x468)],source);assert.deepEqual(f.data.slice(f.controller+0x1e0,f.controller+0x218),controls);f.native=old;
 }
});
