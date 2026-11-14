'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Product=require('./paced-catchup.js'),Maker=require('./mode3-publisher.cjs'),{fixture,B}=require('./paced-fixture.cjs');
const Controller=require('../extension/paced-catchup-controller.js').Controller,profiles=require('./paced-profile-config.cjs').PROFILES;
async function mode3(profile){const f=await fixture(profile.revision),out={physics:0x500000,chassis:0x510000,drivetrain:0x520000,aero:0x530000,raw:0x540000};
 for(const[p,n]of[[out.physics,0x60],[out.chassis,0x20c],[out.drivetrain,0x144],[out.aero,16],[out.raw,0x270]])f.commit(p,n);
 for(const[p,v]of[[f.car+0x28,3],[f.car+0x30,f.controller],[f.car+0x34,out.physics],[out.physics,0x7a2538],[out.physics+4,f.controller],[out.physics+0x34,f.car],[out.physics+0x20,out.chassis],[out.physics+0x24,out.drivetrain],[out.physics+0x28,out.aero],[out.physics+0x2c,out.raw],[out.drivetrain,0x7a2560],[out.drivetrain+0x14,out.chassis],[out.drivetrain+0x18,out.raw],[out.aero,out.raw+0x260],[out.aero+4,out.chassis],[0x89e7f8,1],[672502872,0],[0x7fc0a0,1]])f.u(p,v);
 f.f32(f.car+0x4dc,.1);const wabt=await require('../../build-deps/node_modules/wabt')(),m=wabt.parseWat('controlled-position-provider.wat',Maker.create(profile).proofSource(),{threads:true});m.resolveNames();m.validate({threads:true});const advance=new WebAssembly.Instance(new WebAssembly.Module(m.toBinary({}).buffer),{env:{memory:f.memory}}).exports.advance;m.destroy();
 f.publish=M=>{f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+4,out.physics);f.u(f.cpu+16,f.stack);f.u(f.stack,0x5ab00c);f.f32(f.stack+4,M);f.h(f.cpu+140,0x37f);f.native.f6837(f.cpu);assert.equal(f.u(f.cpu+16),f.stack+8);assert.equal(f.u(f.cpu+32),0x5ab00c);};
 f.position=r=>{f.u(f.cpu+4,out.physics);advance(f.cpu,r);};return{f,out};
}
test('actual native mode3 publication and bounded post-position receipt preserve native source, combined-grip identity and Stop',async()=>{
 for(const profile of profiles){const{f,out}=await mode3(profile);
  for(const M of[1,Math.fround(1.485),5])for(const percent of[100,125,200])for(const strength of[1,2,10])for(const position of[0,1,20,-20]){
   f.f32(f.car+0x468,M);f.f32(f.driver+0x770,M);f.u(B+60,percent);Product.command(f.memory,{enabled:true,percent,strength,ownerSequence:2,stackingReady:true,forceGeneration:true});
   const E=Math.fround(Math.fround(M*Math.fround(percent/100))*strength),T=Math.fround(E*Math.fround(percent/100));f.publish(M);
   assert.equal(f.f32(out.aero+8),E);assert.equal(f.f32(out.chassis+0x208),E);assert.equal(f.f32(out.drivetrain+0x13c),E);assert.equal(f.f32(out.drivetrain+0x140),T);
   assert.equal(Product.readAck(f.memory),null,'Scalar publication alone cannot pretend position-modified grip was observed');
   f.position(position);const evidence=Product.readEvidence(f.memory),ack=evidence.ack;assert(ack,profile.revision+JSON.stringify({M,percent,strength,position,evidence}));
   const expected=Math.fround(T*(1-position*(1-f.f32(0x7a1984))));assert.equal(f.f32(out.drivetrain+0x140),expected);assert.equal(ack.combinedGripFactor,expected);assert.equal(ack.tireFactor,T);assert.equal(ack.physicsKind,3);assert.equal(ack.evidenceKind,'combined-grip');assert.equal(ack.gripHits,1);assert.equal(ack.wheelHits,0);assert.equal(evidence.ackRejectCode,0);assert.equal(evidence.nativeStage,24);
   assert(Product.readGain(f.memory,{moduleHash:profile.native.hash,currentCar:f.car,pace:percent/100,ownerSequence:2}));assert.equal(f.u(f.car+0x28),3);assert.equal(f.u(out.physics),0x7a2538);assert.equal(f.f32(f.car+0x468),M);assert.equal(f.f32(f.driver+0x770),M);
   f.f32(out.drivetrain+0x140,Math.fround(expected+1));assert.equal(Product.readEvidence(f.memory).ackRejectCode,20);f.f32(out.drivetrain+0x140,expected);
   Product.command(f.memory,{enabled:false,forceGeneration:true});f.u(B+60,100);f.publish(M);f.position(position);const off=Product.readAck(f.memory);assert(off);assert.equal(off.reason,2);assert.equal(off.strength,1);assert.equal(off.combinedGripFactor,Math.fround(M*(1-position*(1-f.f32(0x7a1984)))));
  }
 }
});
test('controller reports combined grip only after advancing actual receipts and exposes bounded waiting evidence',async()=>{
 const profile=profiles.find(p=>p.revision==='943ee537'),{f,out}=await mode3(profile),controller=new Controller(f.memory,{protocol:Product,installed:true,verified:true,moduleHash:profile.native.hash,moduleIdentity:{}}),input={enabled:true,percent:200,strength:2,ownerSequence:2,currentCar:f.car,safe:true,ordinaryRace:true,network:false,aiState:{active:true,owned:true},selectedPace:2,featureOwnsPace:true,customPower:1,customGrip:1,now:0};
 f.f32(f.car+0x468,1);f.u(B+60,200);let s=controller.update(input);assert.equal(s.active,false);assert.equal(s.physicsKind,3);assert.equal(s.ackRejectCode,3);
 f.publish(1);f.position(1);s=controller.update({...input,now:50});assert.equal(s.active,false);f.publish(1);f.position(1);s=controller.update({...input,now:100});assert.equal(s.active,true);assert.equal(s.wheelHits,0);assert.equal(s.gripHits,1);assert.equal(s.evidenceKind,'combined-grip');assert.equal(s.combinedGripFactor,f.f32(out.drivetrain+0x140));
 f.f32(out.drivetrain+0x140,1);s=controller.update({...input,now:150});assert.equal(s.active,false);assert.equal(s.ackRejectCode,20);
});
test('real mode3 receipt unlocks native P and node geometry caps the distinct behavior controller',async()=>{
 globalThis.__NFSU2_PACED_CATCHUP__=Product;
 for(const profile of profiles){const{f,out}=await mode3(profile);f.f32(f.car+0x468,1);f.f32(f.driver+0x770,1);f.u(B+60,100);const base=f.policy(13962);
  f.u(B+60,200);Product.command(f.memory,{enabled:true,percent:200,strength:2,ownerSequence:2,stackingReady:true});assert.equal(f.policy(13962),base);f.publish(1);f.position(1);assert(Math.abs(f.policy(13962)/base-2)<1e-6);
  f.options.policy={mode:'native',cornerFactor:1,sharpMargin:0,brakingFactor:1,reactionSeconds:.1,marginDistance:0};f.options.expectedPace=2;const state=f.capture();assert.equal(state.forwardState,'armed',JSON.stringify(state));assert.equal(f.policy(13962),state.forwardRequestedTarget);
  f.f32(out.drivetrain+0x140,1);const fallback=f.policy(13962);assert(fallback>0&&fallback<state.forwardRequestedTarget);assert.equal(f.u(B+76),100);assert.equal(f.u(f.car+0x28),3);assert.equal(f.u(f.car+0x34),out.physics);assert.equal(f.u(f.car+0x30),f.controller);assert.notEqual(out.physics,f.controller);
 }
});
test('mode3 guards preserve native values for denied event, ownership, network, graph and finite-gain cases',async()=>{
 for(const profile of profiles){const{f,out}=await mode3(profile),rec=f.u(f.car+0x14),locations=[B+4,B+8,B+48,B+52,B+60,B+84,0xd00030,0x8654a4,0x89e7b0,0x89e7f8,672502872,0x7fc0a0,0x890104,0x890108,0x89010c,0x890114,0x850078,0x850088,f.player+4,f.car+0x28,f.car+0x34,rec+4,out.physics,out.drivetrain,out.drivetrain+0x14,out.drivetrain+0x18,out.aero,out.aero+4,...profile.online],saved=locations.map(p=>[p,f.u(p)]),bytes=[0x89e7d8,0x89e7d9,0x89e7e3,rec+0x900].map(p=>[p,f.view.getUint8(p)]),reset=()=>{saved.forEach(([p,v])=>f.u(p,v));bytes.forEach(([p,v])=>f.view.setUint8(p,v));f.f32(f.car+0x468,1);f.f32(f.driver+0x770,1);f.u(B+60,200);};
  const denials=[()=>f.u(B+48,180),()=>f.u(B+52,0),()=>f.u(B+8,2),()=>f.u(B+4,4),()=>f.u(0xd00030,0),()=>f.u(0x8654a4,3),()=>f.u(0x89e7b0,0),()=>f.u(0x89e7f8,0),()=>f.u(672502872,1),()=>f.u(0x7fc0a0,0),()=>f.view.setUint8(0x89e7e3,1),()=>f.view.setUint8(0x89e7d8,1),()=>f.view.setUint8(0x89e7d9,1),()=>f.u(0x890108,1),()=>f.u(0x890104,1),()=>f.u(0x89010c,1),()=>f.u(0x890114,1),()=>f.u(0x850078,8),()=>{f.u(B+84,1);f.u(0x850078,8);f.u(0x850088,10);},()=>{f.u(profile.online[0],1);f.view.setUint8(profile.online[1],1);f.u(profile.online[2],1);},()=>f.u(f.car+0x28,1),()=>f.u(f.car+0x34,out.physics+0x100),()=>f.u(out.physics,0x7a25b0),()=>f.u(out.drivetrain,0),()=>f.u(out.drivetrain+0x14,out.chassis+4),()=>f.u(out.drivetrain+0x18,out.raw+4),()=>f.u(out.aero,out.raw+0x264),()=>f.u(out.aero+4,out.chassis+4),()=>f.u(rec+4,2),()=>f.view.setUint8(rec+0x900,1),()=>f.u(B+60,125)];
  for(const change of denials){reset();Product.command(f.memory,{enabled:true,percent:200,strength:10,ownerSequence:2,stackingReady:true,forceGeneration:true});change();f.publish(1);assert.equal(f.f32(out.aero+8),1);assert.equal(f.f32(out.chassis+0x208),1);assert.equal(f.f32(out.drivetrain+0x140),1);f.position(1);assert.equal(Product.readAck(f.memory),null);}
  reset();f.u(B+84,1);f.u(profile.online[0],1);f.view.setUint8(profile.online[1],1);f.u(profile.online[2],1);Product.command(f.memory,{enabled:true,percent:200,strength:2,ownerSequence:2,stackingReady:true,forceGeneration:true});f.publish(1);f.position(1);assert.equal(Product.readAck(f.memory).physicsKind,3,'Separate network opt-in is preserved');
  reset();const M=Math.fround(3.4028234663852886e38);f.f32(f.car+0x468,M);Product.command(f.memory,{enabled:true,percent:200,strength:10,ownerSequence:2,stackingReady:true,forceGeneration:true});f.publish(M);assert.equal(f.f32(out.drivetrain+0x140),M,'Overflow rejects enhancement and preserves finite original native scalar');
 }
});
test('extended receipt claim preserves foreign occupancy and refuses lost ownership',async()=>{
 const protocol=require('./paced-protocol.cjs'),memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),x=protocol.extra.base;d.setUint32(x+4,0x12345678,true);const before=new Uint8Array(memory.buffer,x,64).slice();assert.equal(protocol.claim(memory),false);assert.deepEqual(new Uint8Array(memory.buffer,x,64),before);assert.equal(d.getUint32(x,true),0);
 d.setUint32(x+4,0,true);assert.equal(protocol.claim(memory),true);d.setUint32(x,0xdeadbeef,true);const foreign=new Uint8Array(memory.buffer,x,64).slice();assert.equal(protocol.claim(memory),false);assert.deepEqual(new Uint8Array(memory.buffer,x,64),foreign);
});
