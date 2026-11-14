'use strict';
// Exact original query/sampler/setter with a controlled construction boundary.
// This does not execute a complete game loop or verify live cornering.
const {test}=require('node:test'),assert=require('node:assert/strict');
const Registry=require('../extension/forward-native-config.js'),Probe=require('../extension/route-probe.js');
const {world,nativeModule}=require('./fixtures/forward-native-world.cjs');
const Transform=require('../tools/route-trackinfo-window-v03811.cjs'),Proof=require('../../work-current-profile/tools/native-proof.cjs');
const REVISIONS=['8abf9be8','93cfc6e9','aa2429fb','15e5958f','943ee537'],LOW=0x50000000,HIGH=0x7ffe0000,SIZE=0x8c;
const profileFor=revision=>Object.values(Registry.profiles).find(p=>p.revision===revision);
const candidateWorld=(revision,options={})=>{const p=profileFor(revision);return world(revision,{...options,nativeOptions:{transformBytes:bytes=>Transform.transformModule(bytes,p)}});};
function highTrack(f,p=LOW+0x10000){
 f.memory.grow(HIGH/65536-f.memory.buffer.byteLength/65536);
 const view=new DataView(f.memory.buffer),data=new Uint8Array(f.memory.buffer),gwin=f.profile.runtime.nativePolicy.gwin;
 view.setUint32(gwin,LOW,true);view.setUint32(gwin+4,HIGH,true);data.set(f.data.subarray(f.trackInfo,f.trackInfo+SIZE),p);f.commit(p,SIZE);f.u(0x883dac,p);
 return{p,gwin,view,data};
}
const clone=x=>JSON.parse(JSON.stringify(x));

test('all five candidate configs change only the single TrackInfo caller operand and reproduce exactly',()=>{
 for(const revision of REVISIONS){
  const original=profileFor(revision),{config,receipt}=Transform.transformConfig(original),d=Transform.derive(original),expected=clone(original);expected.helpers[16].body=config.helpers[16].body;
  assert.deepEqual(config,expected);assert.equal(receipt.changedByteOffsets.length,1);assert.equal(receipt.originalNativeBodiesChanged,0);assert.equal(receipt.otherHelperBodiesChanged,0);assert.equal(receipt.newHelpers,0);assert.equal(receipt.liveVerified,false);
  assert.equal(d.before.length,d.after.length);assert.equal(Proof.hash(d.before),Transform.PINS[original.moduleHash].context);
  assert.deepEqual(Transform.transformConfig(config),{config,receipt});assert(Object.isFrozen(Transform.PINS[original.moduleHash]));
 }
 for(const revision of ['3bdd9959','d2fa4f4c','cd5b74d5'])assert.throws(()=>Transform.transformConfig(profileFor(revision)),/Exact reviewed/);
});

test('candidate rejects changed caller, type, gwin, bitmap and verified range helper bindings',()=>{
 const profile=profileFor('943ee537');
 for(const change of [p=>p.runtime.nativePolicy.gwin+=4,p=>p.runtime.bitmap+=4,p=>p.helpers[0].type=3,p=>p.helpers[13].type=3,p=>p.helpers[16].type=2,p=>p.helpers[16].name='other',p=>p.helpers[0].body=Buffer.from([0,11]).toString('base64'),p=>{const b=Buffer.from(p.helpers[16].body,'base64');b[100]^=1;p.helpers[16].body=b.toString('base64');}]){
  const candidate=clone(profile);change(candidate);assert.throws(()=>Transform.transformConfig(candidate));
 }
});

for(const revision of REVISIONS)test(revision+' exact module transform changes only one authored helper byte',async()=>{
 const profile=profileFor(revision),before=await nativeModule(profile),output=Transform.transformModule(before.output,profile),receipt=Transform.transformConfig(profile).receipt,a=Proof.parse(before.output),b=Proof.parse(output),changes=[];
 assert.equal(output.length,before.output.length);assert.doesNotThrow(()=>new WebAssembly.Module(output));
 for(const[id,body]of a.bodies)if(!body.equals(b.bodies.get(id)))changes.push(id);
 // Once root composes the candidate registry, the transform is an exact no-op.
 assert.deepEqual(changes,Buffer.from(profile.helpers[16].body,'base64').equals(Transform.derive(profile).after)?[]:[receipt.helperIndex]);
 assert.deepEqual(b.bodies.get(receipt.helperIndex),Transform.derive(profile).after);
 for(let i=0;i<a.sections.length;i++)if(a.sections[i].id!==10)assert.deepEqual(a.sections[i].bytes,b.sections[i].bytes);
 assert.deepEqual(Transform.transformModule(output,profile),output);
});

for(const revision of REVISIONS)test(revision+' high TrackInfo now reaches actual zero-native-corner geometry/planning/publication',async()=>{
 for(const angle of [10,75,90]){
  const f=await candidateWorld(revision,{pace:1.8,angle}),high=highTrack(f),metadataBefore=Buffer.from(high.data.subarray(high.p,high.p+SIZE)),result=f.capture();
  assert.equal(result.forwardState,'armed');assert.equal(f.session.geometry.last.cornerCount,0);assert.equal(f.session.geometry.last.identity.track,4715);
  assert.equal(f.session.geometry.last.forwardOrderVerified,true);assert.equal(f.e.fwg_context(f.route),0);assert.equal(f.e.fwg_span(high.p,SIZE),0,'Other native spans retain low bounds');assert.equal(f.e.fwg_policy_range(high.p,SIZE),1);
  assert.equal(f.target(180),result.forwardRequestedTarget);assert.equal(f.target(1),1);assert.equal(f.target(0),0);assert.equal(result.forwardNativeApplied,false);assert.equal(result.forwardLiveVerified,false);
  assert.deepEqual(Buffer.from(high.data.subarray(high.p,high.p+SIZE)),metadataBefore);f.session.stop();assert.equal(f.target(180),180);
 }
});

test('current high metadata retains native low/high extent and full-memory gates without trapping',async()=>{
 const f=await candidateWorld('943ee537',{pace:2}),high=highTrack(f,HIGH-SIZE);assert.equal(f.capture().forwardState,'armed');
 for(const p of [HIGH-SIZE+4,HIGH,0xfffffff0,0x28000000-SIZE+4,0x28000000,LOW-4]){
  f.u(0x883dac,p);assert.doesNotThrow(()=>assert.equal(f.e.fwg_context(f.route),4));assert.equal(f.target(180),180);
 }
 f.u(0x883dac,high.p);assert.equal(f.e.fwg_context(f.route),0);f.session.stop();
 const small=await candidateWorld('943ee537',{pace:2});assert.equal(small.capture().forwardState,'armed');small.u(small.profile.runtime.nativePolicy.gwin,LOW);small.u(small.profile.runtime.nativePolicy.gwin+4,HIGH);small.u(0x883dac,LOW+0x10000);
 assert.doesNotThrow(()=>assert.equal(small.e.fwg_context(small.route),4));assert.equal(small.target(180),180);small.session.stop();
});

for(const revision of REVISIONS)test(revision+' native high metadata window/page withdrawal immediately restores the native target',async()=>{
 for(const kind of ['window-low','window-high','commit','identity','region']){
  const f=await candidateWorld(revision,{pace:2}),high=highTrack(f),result=f.capture();assert.equal(result.forwardState,'armed');assert(f.target(180)<180);
  if(kind==='window-low')high.view.setUint32(high.gwin,LOW+0x4000,true);
  else if(kind==='window-high')high.view.setUint32(high.gwin+4,HIGH-0x4000,true);
  else if(kind==='commit'){const pg=high.p>>>14,at=f.abi.bitmap+(pg>>>3);high.view.setUint8(at,high.view.getUint8(at)&~(1<<(pg&7)));}
  else if(kind==='identity')high.view.setUint16(high.p+0x8a,4014,true);
  else high.view.setUint8(high.p+0x40,0);
  assert.notEqual(f.e.fwg_context(f.route),0);assert.equal(f.target(180),180);assert.equal(f.target(1),1);f.session.stop();
 }
});

test('current high metadata retains exact online permission and native owner protections',async()=>{
 const f=await candidateWorld('943ee537',{pace:1.8,network:[[0x850078,8]],permission:1});highTrack(f);assert.equal(f.capture().forwardState,'armed');
 f.u(0xd0d100+84,0);assert.notEqual(f.e.fwg_context(f.route),0);assert.equal(f.target(180),180);f.session.stop();
 const owner=await candidateWorld('943ee537',{pace:1.8});highTrack(owner);assert.equal(owner.capture().forwardState,'armed');owner.u(owner.driver+4,owner.car+4);assert.notEqual(owner.e.fwg_context(owner.route),0);assert.equal(owner.target(180),180);owner.session.stop();
});

test('high TrackInfo publication revalidation still rejects snapshot withdrawal before JavaScript reads',async()=>{
 const f=await candidateWorld('943ee537',{pace:1.8}),high=highTrack(f),result=f.capture({beforePoll:()=>high.view.setUint32(high.gwin,0,true)});
 assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,103);assert.equal(result.forwardReadPhaseCode,Probe.readPhaseCodes['track-info']);assert.equal(result.forwardReadSubreasonCode,Probe.readSubreasonCodes['window-unavailable']);assert.equal(f.target(180),180);f.session.stop();
});
