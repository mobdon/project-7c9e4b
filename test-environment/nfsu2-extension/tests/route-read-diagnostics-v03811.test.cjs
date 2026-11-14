'use strict';
// Controlled exact native query/world fixtures, not a complete live race.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Probe=require('../extension/route-probe.js'),PriorProbe=require('../../work-paced-v03810/extension/route-probe.js');
const Driving=require('../extension/forward-driving.js'),Registry=require('../extension/forward-native-config.js');
const {world,FILES}=require('./fixtures/forward-native-world.cjs');
const baselineWorld=require('../../work-paced-v03810/tests/fixtures/forward-native-world.cjs').world;
const NativeProof=require('../../work-current-profile/tools/native-proof.cjs');
const LOW=0x50000000,HIGH=0x7ffe0000,SIZE=0x8c;
const options=f=>({verified:true,moduleHash:f.profile.moduleHash,expectedPace:f.options.expectedPace});
const expectRead=(result,guard,phase,subreason)=>{
 assert.equal(result.status,'unavailable');assert.equal(result.forwardGuardCode,guard);
 assert.equal(result.forwardReadPhaseCode,Probe.readPhaseCodes[phase]);
 assert.equal(result.forwardReadSubreasonCode,Probe.readSubreasonCodes[subreason]);
 assert.deepEqual(Object.keys(result).sort(),['forwardGuardCode','forwardReadPhaseCode','forwardReadSubreasonCode','reason','status','wholeRaceChecked'].sort());
 assert.equal(result.wholeRaceChecked,false);
};
function highTrack(f,p=LOW+0x10000){
 f.memory.grow(HIGH/65536-f.memory.buffer.byteLength/65536);
 const view=new DataView(f.memory.buffer),data=new Uint8Array(f.memory.buffer),gwin=f.profile.runtime.nativePolicy?.gwin;
 if(gwin){view.setUint32(gwin,LOW,true);view.setUint32(gwin+4,HIGH,true);}
 data.set(f.data.subarray(f.trackInfo,f.trackInfo+SIZE),p);f.commit(p,SIZE);f.u(0x883dac,p);
 return{view,data,p,gwin};
}

test('native window initializers bind each exact profile to the fixed guest-data span',async()=>{
 const wabt=await require('../../build-deps/node_modules/wabt')();
 const pins={
  '8abf9be8':[22144,'d571302264d55262ddcaa4978f0b56e9e55d8735c9c30f881a87f4dfb425a8ca'],
  '93cfc6e9':[22146,'17ac59c30a5929836fa34f02ee98d02edfde2b98eda86d9488e7857b8d723b1a'],
  'aa2429fb':[22153,'14ad71fa1d2bf79ade8585ea90c9ee00d664a34c93c75c7a825c5aaa14b54316'],
  '15e5958f':[22153,'14ad71fa1d2bf79ade8585ea90c9ee00d664a34c93c75c7a825c5aaa14b54316'],
  '943ee537':[22153,'50ef41c48423c6a24ee4d5c43b7d4c1d3a5444f1a37f347b3075c829cab9e10d']
 };
 for(const[revision,[id,hash]]of Object.entries(pins)){
  const profile=Object.values(Registry.profiles).find(p=>p.revision===revision),bytes=fs.readFileSync(path.resolve(__dirname,'../..',FILES[revision]));
  assert.equal(NativeProof.hash(bytes),profile.moduleHash);
  const parsed=NativeProof.parse(bytes),body=parsed.bodies.get(id);assert.equal(body.length,431);assert.equal(NativeProof.hash(body),hash);
  const text=NativeProof.texts(wabt,bytes,[id])[id],gwin=profile.runtime.nativePolicy.gwin;
  assert(text.includes('i32.const 32766\n          i32.lt_u'),'Native full-window memory gate');
  assert(text.includes('i64.const 1342177281\n          i64.lt_u'),'Native runtime-heap separation gate');
  assert(text.includes('i32.const 1342177280\n      i32.atomic.store offset='+gwin));
  assert(text.includes('i32.const 2147352576\n      i32.atomic.store offset='+(gwin+4)));
 }
});

test('all five native TrackInfo loaders/getters retain identical verified guest BUN metadata provenance',()=>{
 const pins={1527:[186,'cf1bf6a8178a35b69fc315d295abc159b30443eb2ef659158f3c20a66c22bc6b'],1215:[228,'3cc781c3c2f5b94c654b92fb2b576e20870cf306634473b8e3371f9ee09aa3a2'],1371:[138,'0694c2c2f456fbfdbffd403da6fa2ad8727d57e88e588fda7ea84772fc5abf77']};
 for(const profile of Object.values(Registry.profiles).filter(p=>p.capabilities.nativePolicy===true)){
  const bytes=fs.readFileSync(path.resolve(__dirname,'../..',FILES[profile.revision]));assert.equal(NativeProof.hash(bytes),profile.moduleHash);const parsed=NativeProof.parse(bytes);
  for(const[id,[length,hash]]of Object.entries(pins)){const body=parsed.bodies.get(+id);assert.equal(body.length,length);assert.equal(NativeProof.hash(body),hash);}
 }
});

test('fixed per-read diagnostics distinguish pointer source, destination and sparse guest denial',async()=>{
 const f=await world('943ee537',{pace:1.8});
 assert.equal(Probe.capture(f.memory,options(f)).status,'captured');
 for(const[p,value,phase,subreason]of [
  [0xd00000,0,'player','below-guest-minimum'],
  [f.player+4,0x28000000,'car','runtime-gap'],
  [0x890118,LOW+0x10000,'race','window-unavailable'],
  [f.car+0x2c,f.driver+1,'driver','unaligned-pointer'],
  [0x883dac,0x2a6b5098,'track-info','runtime-gap'],
  [f.route+8,0,'route-node','below-guest-minimum'],
  [0x88a334,0x28000000,'road-group','runtime-gap']
 ]){
  const prior=f.u(p);f.u(p,value);const result=Probe.capture(f.memory,options(f));
  expectRead(result,subreason==='unaligned-pointer'?105:103,phase,subreason);f.u(p,prior);
  assert(!JSON.stringify(result).includes('2a6b5098'));
 }
 const pg=f.nodeBase>>>14,at=f.abi.bitmap+(pg>>>3),old=f.view.getUint8(at);f.view.setUint8(at,old&~(1<<(pg&7)));
 expectRead(Probe.capture(f.memory,options(f)),104,'route-node','uncommitted-page');f.view.setUint8(at,old);
 f.session.stop();
});

test('read diagnostics preserve fixed source phase for final snapshot and bitmap rechecks',async()=>{
 const f=await world('943ee537',{pace:1.8}),pg=f.nodeBase>>>14,at=f.abi.bitmap+(pg>>>3),bit=f.view.getUint8(at),trackByte=f.view.getUint8(f.trackInfo+0x40);
 for(const[change,restore,guard,phase,subreason]of [
  [()=>f.view.setUint8(f.trackInfo+0x40,trackByte^1),()=>f.view.setUint8(f.trackInfo+0x40,trackByte),109,'track-info','snapshot-changed'],
  [()=>f.view.setUint8(at,bit&~(1<<(pg&7))),()=>f.view.setUint8(at,bit),108,'route-node','commit-state-changed']
 ]){
  let calls=0;const memory={get buffer(){if(++calls===2)change();return f.memory.buffer;}};
  expectRead(Probe.capture(memory,options(f)),guard,phase,subreason);restore();
 }
 let calls=0;const memory={get buffer(){return++calls===2?{}:f.memory.buffer;}};
 expectRead(Probe.capture(memory,options(f)),107,'memory','memory-buffer-changed');f.session.stop();
});

for(const revision of ['8abf9be8','93cfc6e9','aa2429fb','15e5958f','943ee537'])test(revision+' high TrackInfo metadata is read-only while the unchanged native sampler retains its denial',async()=>{
 const f=await baselineWorld(revision,{pace:1.8});f.session=new Driving.Controller(f.memory,{installed:true,verified:true,moduleHash:f.profile.moduleHash,moduleIdentity:{}});const before=f.capture();assert.equal(before.forwardState,'armed');f.session.stop();
 const high=highTrack(f),lowBefore=Buffer.from(f.data.subarray(0xd0d100,0xd0d168)),highBefore=Buffer.from(high.data.subarray(high.p,high.p+SIZE));
 const old=PriorProbe.capture(f.memory,options(f));assert.equal(old.forwardGuardCode,103);
 const capture=Probe.capture(f.memory,options(f));assert.equal(capture.status,'captured');assert.equal(capture.identity.track,4715);assert.equal(capture.identity.region,'L4RA');
 assert.equal(capture.cornerCount,0);assert.equal(capture.capabilities.authorizesPacing,false);assert.equal(capture.consistency.nativeSafePoint,false);
 assert.deepEqual(Buffer.from(f.data.subarray(0xd0d100,0xd0d168)),lowBefore);assert.deepEqual(Buffer.from(high.data.subarray(high.p,high.p+SIZE)),highBefore);
 const requested=f.session.update(f.options);assert.equal(requested.forwardState,'requested');
 assert.equal(f.e.fwg_context(f.route),4,'The native context retains its low TrackInfo span guard');
 const request=f.u(f.abi.base+8),sp=f.stack;f.u(sp,0x42879f);f.u(f.cpu+32,0x42879f);f.u(f.cpu+16,sp+20);f.u(f.cpu,1);f.f32(sp+40,50);f.f32(sp+56,0);
 f.e.fwg_projection_post(f.cpu,f.route,sp,f.car+0x60,sp+40,sp+56);assert.equal(f.u(f.abi.base+640),0);assert.equal(f.target(180),180);
 assert.equal(f.session.update(f.options).forwardState,'waiting');f.session.geometry.pending.time=Date.now()-3000;
 const denied=f.session.update(f.options);assert.equal(denied.forwardState,'unknown');assert.equal(denied.forwardGuardCode,28);assert.equal(denied.forwardRequestedTarget,undefined);assert.equal(denied.forwardLiveVerified,false);assert.equal(f.u(f.abi.base+8),request);
 f.session.stop();assert.equal(f.target(180),180);
});

test('high TrackInfo requires exact active window bounds, full memory, sparse commits and complete extent',async()=>{
 const f=await world('943ee537',{pace:1.8}),high=highTrack(f);
 for(const[lo,hi]of [[0,0],[LOW+0x4000,HIGH],[LOW,HIGH-0x4000],[LOW,0x80000000]]){
  high.view.setUint32(high.gwin,lo,true);high.view.setUint32(high.gwin+4,hi,true);
  expectRead(Probe.capture(f.memory,options(f)),103,'track-info','window-unavailable');
 }
 high.view.setUint32(high.gwin,LOW,true);high.view.setUint32(high.gwin+4,HIGH,true);
 const pg=high.p>>>14,at=f.abi.bitmap+(pg>>>3),bit=high.view.getUint8(at);high.view.setUint8(at,bit&~(1<<(pg&7)));
 expectRead(Probe.capture(f.memory,options(f)),104,'track-info','uncommitted-page');high.view.setUint8(at,bit);
 const end=HIGH-SIZE;high.data.set(high.data.subarray(high.p,high.p+SIZE),end);f.commit(end,SIZE);f.u(0x883dac,end);assert.equal(Probe.capture(f.memory,options(f)).status,'captured');
 f.u(0x883dac,end+4);expectRead(Probe.capture(f.memory,options(f)),103,'track-info','span-end');
 f.u(0x883dac,0x28000000-SIZE+4);expectRead(Probe.capture(f.memory,options(f)),103,'track-info','span-end');
 f.u(0x883dac,high.p);let calls=0;const changing={get buffer(){if(++calls===2)high.view.setUint32(high.gwin,0,true);return f.memory.buffer;}};
 expectRead(Probe.capture(changing,options(f)),109,'window-control','window-state-changed');f.session.stop();
 const small=await world('943ee537',{pace:1.8});small.u(0x883dac,LOW+0x10000);small.u(small.profile.runtime.nativePolicy.gwin,LOW);small.u(small.profile.runtime.nativePolicy.gwin+4,HIGH);
 expectRead(Probe.capture(small.memory,options(small)),103,'track-info','linear-memory-end');small.session.stop();
});

test('older unproven profiles and nonmetadata route objects keep their original guest bounds',async()=>{
 const old=await world('cd5b74d5',{pace:1.8});highTrack(old);expectRead(Probe.capture(old.memory,options(old)),103,'track-info','window-unavailable');old.session.stop();
 const f=await world('943ee537',{pace:1.8}),high=highTrack(f),prior=f.u(f.route+8);f.u(f.route+8,high.p);
 expectRead(Probe.capture(f.memory,options(f)),103,'route-node','window-unavailable');f.u(f.route+8,prior);
 high.view.setUint16(high.p+0x8a,4014,true);const identity=Probe.capture(f.memory,options(f));assert.equal(identity.forwardGuardCode,125);assert.equal(identity.forwardReadPhaseCode,undefined);f.session.stop();
});

test('real request and publication revalidation propagate only current fixed read evidence and Stop clears',async()=>{
 const f=await world('943ee537',{pace:1.8}),prior=f.u(0x883dac);f.u(0x883dac,0x2a6b5098);
 let result=f.session.update(f.options);assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,103);assert.equal(result.forwardReadPhaseCode,21);assert.equal(result.forwardReadSubreasonCode,3);
 assert.equal(f.u(f.abi.base+12),0);assert.equal(f.session.stop().forwardReadPhaseCode,undefined);f.u(0x883dac,prior);
 result=f.capture({beforePoll:()=>f.u(0x883dac,0x2a6b5098)});assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,103);assert.equal(result.forwardReadPhaseCode,21);assert.equal(result.forwardReadSubreasonCode,3);assert.equal(f.target(180),180);
 f.u(0x883dac,prior);result=f.capture();assert.equal(result.forwardState,'armed');assert.equal(result.forwardReadPhaseCode,undefined);assert.equal(result.forwardReadSubreasonCode,undefined);f.session.stop();
});

test('bounded evidence validation cannot persist caller numbers, strings, getters or raw details',()=>{
 assert.equal(Object.keys(Probe.readPhaseCodes).length,31);assert.equal(Object.keys(Probe.readSubreasonCodes).length,16);
 assert.deepEqual(Probe.readEvidence({forwardReadPhaseCode:21,forwardReadSubreasonCode:3,pointer:0x2a6b5098,reason:'private'}),{forwardReadPhaseCode:21,forwardReadSubreasonCode:3});
 for(const[phase,subreason]of [[0,3],[32,3],[21,0],[21,17],[21.5,3],['21',3],[21,'3'],[NaN,3],[21,Infinity]])assert.deepEqual(Probe.readEvidence({forwardReadPhaseCode:phase,forwardReadSubreasonCode:subreason}),{});
 assert.deepEqual(Probe.readEvidence({get forwardReadPhaseCode(){throw Error('private');}}),{});
 for(const bad of [{forwardReadPhaseCode:0x2a6b5098,forwardReadSubreasonCode:3},{forwardReadPhaseCode:21,forwardReadSubreasonCode:'private'}]){
  const geometry={stop(){},request(){throw Object.assign(Error('private'),{forwardGuardCode:103,...bad});}},publisher={stop(){}};
  const c=new Driving.Controller({}, {installed:true,verified:true,moduleHash:Driving.PIN,moduleIdentity:{},geometry,publisher});
  const r=c.update({enabled:true,safe:true,offline:true,ordinaryRace:true,aiState:{active:true,owned:true},expectedPace:1.3,identity:'fixture',policy:{lateralAcceleration:4,brakingDeceleration:4}});
  assert.equal(r.forwardGuardCode,103);assert.equal(r.forwardReadPhaseCode,undefined);assert.equal(r.forwardReadSubreasonCode,undefined);assert(!JSON.stringify(r).includes('private'));
 }
});
