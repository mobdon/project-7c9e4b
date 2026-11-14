'use strict';
// Native publication/target phase fixture; position provider is an authored boundary.
const assert=require('node:assert/strict');
const Product=require('./paced-catchup.js'),Maker=require('./mode3-publisher.cjs'),{fixture,physics,B}=require('./paced-fixture.cjs');
const profiles=require('./paced-profile-config.cjs').PROFILES;
async function mode3(profile){const f=await fixture(profile.revision,{includeIDs:[16153]}),out={physics:0x500000,chassis:0x510000,drivetrain:0x520000,aero:0x530000,raw:0x540000};
 for(const[p,n]of[[out.physics,0x60],[out.chassis,0x20c],[out.drivetrain,0x144],[out.aero,16],[out.raw,0x270]])f.commit(p,n);
 for(const[p,v]of[[f.car+0x28,3],[f.car+0x30,f.controller],[f.car+0x34,out.physics],[out.physics,0x7a2538],[out.physics+4,f.controller],[out.physics+0x34,f.car],[out.physics+0x20,out.chassis],[out.physics+0x24,out.drivetrain],[out.physics+0x28,out.aero],[out.physics+0x2c,out.raw],[out.drivetrain,0x7a2560],[out.drivetrain+0x14,out.chassis],[out.drivetrain+0x18,out.raw],[out.aero,out.raw+0x260],[out.aero+4,out.chassis],[0x89e7f8,1],[672502872,0],[0x7fc0a0,1]])f.u(p,v);
 f.f32(f.car+0x4dc,.1);const wabt=await require('../../build-deps/node_modules/wabt')(),m=wabt.parseWat('controlled-position-provider.wat',Maker.create(profile).proofSource(),{threads:true});m.resolveNames();m.validate({threads:true});const advance=new WebAssembly.Instance(new WebAssembly.Module(m.toBinary({}).buffer),{env:{memory:f.memory}}).exports.advance;m.destroy();
 f.publish=M=>{f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+4,out.physics);f.u(f.cpu+16,f.stack);f.u(f.stack,0x5ab00c);f.f32(f.stack+4,M);f.h(f.cpu+140,0x37f);f.native.f6837(f.cpu);assert.equal(f.u(f.cpu+16),f.stack+8);assert.equal(f.u(f.cpu+32),0x5ab00c);};
 f.position=r=>{f.u(f.cpu+4,out.physics);advance(f.cpu,r);};return{f,out};
}

async function make(revision='943ee537',kind=1){
 const profile=profiles.find(p=>p.revision===revision);assert(profile);
 let f,out;
 if(kind===3){({f,out}=await mode3(profile));const scalar=f.publish;f.publish=M=>{scalar(M);f.position(1);};}
 else {f=await fixture(revision,{includeIDs:[16153]});out=physics(f);}
 f.phaseOutputs=()=>kind===1?[f.u(out.power+8),f.u(out.chassis+0x208),...out.wheels.map(p=>f.u(p+0x184))]:[f.u(out.aero+8),f.u(out.chassis+0x208),f.u(out.drivetrain+0x13c),f.u(out.drivetrain+0x140)];
 f.nativeCache=next=>{
  // Controlled cached input; actual native16153 performs its own read and
  // car+468 floor/publication and driver+770 store. No native gap computation
  // or complete game scheduling is simulated here.
  const own=0x490000;f.commit(own,0x100);f.u(f.car+0x18,0);f.u(f.car+0x1c,own);f.view.setUint8(own+0xa,1);f.view.setUint8(f.driver+0x744,1);
  f.u(f.driver+0x72c,f.u(0x86518c));f.f32(f.driver+0x770,next);f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+4,f.driver);f.u(f.cpu+16,f.stack);f.u(f.stack,0x12345678);f.h(f.cpu+140,0x37f);f.native.f16153(f.cpu);
  assert.equal(f.u(f.cpu+16),f.stack+4);assert.equal(f.u(f.cpu+32),0x12345678);assert.equal(f.f32(f.driver+0x770),Math.fround(next));assert.equal(f.f32(f.car+0x468),Math.fround(Math.max(next,1)));
 };
 f.enable=(M=1,{percent=120,strength=1.25,driverM=M}={})=>{f.f32(f.driver+0x770,driverM);f.f32(f.car+0x468,M);f.u(B+60,percent);Product.command(f.memory,{enabled:true,percent,strength,ownerSequence:2,stackingReady:true,forceGeneration:true});f.publish(M);return Product.readAck(f.memory);};
 return{f,out,profile,kind};
}
module.exports={make,Product,B,profiles};
