'use strict';
// Actual AA target consumers + actual production forward setter/helper. Only
// planner and behavior-cap providers are authored fixture boundaries.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
globalThis.__NFSU2_FORWARD_CLAMP__=require('../../nfsu2-extension/extension/forward-clamp.js');
const {world}=require('../../nfsu2-extension/tests/fixtures/forward-native-world.cjs'),P=require('../../work-aa-profile/tools/native-proof.cjs'),Replace=require('../../work-catchup-wrapper/cache-fix.cjs').replace;
const D={record:0x410000,behavior:0x420000,action:0x430000,difficulty:0x440000,driverVt:0x450000,actionVt:0x460000,caps:0x470000},B=0xd0d100;
const Probe=require('../../nfsu2-extension/extension/route-probe.js');
const IDS=[13649,9733,5669,13333,8173,5983,5982,6652,824,13653,13646,13647,13962,13963,13970,13971,12864,18266,21769,3485,4574];
async function stubs(){const wabt=await require('../../build-deps/node_modules/wabt')(),make=async(pop,off)=>{const w=wabt.parseWat('controlled-cap-provider.wat',`(module (import "env" "memory" (memory 256 65536 shared)) (func (param $cpu i32) (local $sp i32) (local $top i32) (local.set $sp (i32.load offset=16 (local.get $cpu))) (local.set $top (i32.and (i32.sub (i32.load offset=136 (local.get $cpu)) (i32.const 1)) (i32.const 7))) (i32.store offset=136 (local.get $cpu) (local.get $top)) (f64.store offset=72 (i32.add (local.get $cpu) (i32.shl (local.get $top) (i32.const 3))) (f64.promote_f32 (f32.load (i32.const ${D.caps+off})))) (i32.store offset=32 (local.get $cpu) (i32.load (local.get $sp))) (i32.store offset=16 (local.get $cpu) (i32.add (local.get $sp) (i32.const ${4+pop})))))`,{threads:true});w.resolveNames();w.validate({threads:true});return[...P.parse(Buffer.from(w.toBinary({}).buffer)).bodies.values()][0];};return{3485:await make(12,0),4574:await make(4,4)};}
const K=require('./full-publisher.cjs'),RB=require('./native-rubberband.js'),PHYS=require('../../work-rubberband-native/physics/audit.json').completeDirectClosureFunctions;
let stubBodies;
async function fixture(revision='aa2429fb'){stubBodies??=await stubs();const maker=K.create(K.PROFILES.find(p=>p.revision===revision)),physical=await maker.build();const f=await world(revision,{progress:50,pace:1.5,nativeOptions:{includeIDs:[...new Set([...IDS,...PHYS])],transformBytes:b=>Replace(b,{...stubBodies,3553:physical.body})}});
 const retail=fs.readFileSync(path.resolve(__dirname,'../../research/tuner-fixtures-93cf/GLOBALB.BUN'));f.data.set(retail.subarray(0x750988,0x750988+2784),D.difficulty);
 for(const[p,n]of[[D.record,0x920],[D.behavior,0x210],[D.action,4],[D.difficulty,2784],[D.driverVt,0x80],[D.actionVt,0x50],[D.caps,8],[f.car,0x480]])f.commit(p,n);
 for(const[p,v]of[[0x81cb60,D.difficulty],[f.car+0x14,D.record],[f.driver,D.driverVt],[D.driverVt+0x78,0x402580],[f.driver+0xc,f.route],[f.driver+0x6f8,D.behavior],[f.driver+0x750,0xffffffff],[D.action,D.actionVt],[D.actionVt+0x4c,0x401820],[f.driver+0x700,400],[f.car+0x424,2],[f.car+0x1c,0],[D.behavior+0x204,0],[D.record+4,1]])f.u(p,v);
 for(const p of[0x8650b0,f.driver+0x754,f.driver+0x730,f.driver+0x734])f.u(p,0);
 f.u(f.driver,0x785370);f.u(0x785370+0x78,0x402580);f.commit(0x785370,0x80);
 f.view.setUint8(D.record+0x901,254);f.view.setUint8(D.behavior+0x1fc,1);f.view.setUint8(D.behavior+0x1fd,1);f.view.setUint8(f.controller+0x10,3);f.f32(f.driver+0x770,1);f.f32(f.car+0x468,1);f.f32(f.car+0x42c,40);
 for(const[address,slot]of[[0x402580,83],[0x4054a0,168],[0x401820,30]])f.u(f.profile.runtime.lookup+4*(address-0x401000),slot);
 const context=0x480000;f.commit(context,8);f.u(context,f.car);f.u(context+4,1);
 f.policy=(id,plannerCap=180,behaviorCap=1000)=>{f.f32(D.caps,plannerCap);f.f32(D.caps+4,behaviorCap);f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+4,D.action);f.u(f.cpu+16,f.stack);f.u(f.stack,0x12345678);f.u(f.stack+4,context);f.h(f.cpu+140,0x37f);f.native['f'+id](f.cpu);assert.equal(f.u(f.cpu+16),f.stack+8);assert.equal(f.u(f.cpu+32),0x12345678);return f.f32(f.controller+0x230);};
 return f;
}
test('paired150 uses real target-consumption acknowledgement, actual physical publication and final corner cap without cache writes',async()=>{
 for(const revision of['aa2429fb','15e5958f','943ee537']){
  const f=await fixture(revision),out={chassis:0x510000,aux:0x520000,power:0x530000,carrier:0x540000,wheels:[0x550000,0x560000,0x570000,0x580000]};
  for(const[p,n]of[[f.car,0xa00],[f.controller,0x240],[0x7a25b0,0x80],[out.chassis,0x20c],[out.aux,0x94],[out.power,16],[out.carrier,0x1c],...out.wheels.map(p=>[p,0x18c])])f.commit(p,n);
  f.commit(f.cpu,344);f.view.setUint8(D.record+0x900,0);
  for(const[p,v]of[[f.car+0x28,1],[f.controller,0x7a25b0],[0x7a25b0+56,0x4054a0],[f.controller+0x5c,f.car],[f.controller+0x20,out.chassis],[f.controller+0x48,out.aux],[f.controller+0x50,out.power],[f.car+0x3c,out.carrier],[0x89e7f8,1],[672502872,0],[0x7fc0a0,1]])f.u(p,v);
  out.wheels.forEach((p,i)=>{f.u(f.controller+0x38+i*4,p);f.f32(p+0x188,1.125);});f.f32(f.car+0x4dc,.1);
  const pub=()=>{f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+4,f.controller);f.u(f.cpu+16,f.stack);f.u(f.stack,0x5a4c38);f.f32(f.stack+4,1);f.h(f.cpu+140,0x37f);f.native.f3553(f.cpu);assert.equal(f.u(f.cpu+16),f.stack+8);assert.equal(f.u(f.cpu+32),0x5a4c38);return f.f32(out.power+8);};
  const cache=f.u(f.driver+0x770),carFactor=f.u(f.car+0x468);
  f.u(B+80,0);RB.command(f.memory,{enabled:true,percent:150,stackingReady:true});assert.equal(pub(),1,'Physical publication stays native until actual selected target consumes pace');assert.equal(RB.readAck(f.memory).reason,3);
  f.u(B+60,100);const ordinary=f.policy(13962);f.u(B+60,150);f.u(B+80,0);const raised=f.policy(13962);assert(f.u(B+80)>0);assert.equal(f.u(B+76),150);assert(Math.abs(raised/ordinary-1.5)<1e-5,'Selected pace raises the actual native requested target by1.5 before later caps');
  assert.equal(pub(),1.5,'Actual full publisher receives paired1.5 only after native target acknowledgement');for(const p of out.wheels){assert.equal(f.f32(p+0x184),1.5);assert.equal(f.f32(p+0x188),1.125);}assert.equal(RB.readAck(f.memory).percent,150);
  const state=f.capture();assert.equal(state.forwardState,'armed');const cap=state.forwardRequestedTarget;assert(cap>0&&cap<raised);
  for(const id of[13653,13962]){assert.equal(f.policy(id),cap,'Final geometry cap retains priority over paired speed target');assert(f.policy(id,1)<cap,'Tighter native target stays lower');assert(f.policy(id,180,-5)<0,'Native reverse remains negative');}
  RB.command(f.memory,{enabled:false,forceGeneration:true});assert.equal(RB.readAck(f.memory),null);assert.equal(f.f32(out.power+8),1.5,'Stop request cannot invent physical reset');f.session.stop();f.u(B+8,0);f.u(B+4,4);f.u(B+60,100);assert.equal(pub(),1);const ack=RB.readAck(f.memory);assert.equal(ack.reason,2);assert.equal(ack.percent,100);assert(f.policy(13962)>cap,'Stop releases target cap and selected pace');
  assert.equal(f.u(f.driver+0x770),cache);assert.equal(f.u(f.car+0x468),carFactor);
 }
});
