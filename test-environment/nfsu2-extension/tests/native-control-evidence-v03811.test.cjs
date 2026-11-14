'use strict';
// Bounded, read-only native state evidence. No complete native update or live
// contact/NOS/recovery branch is executed or certified by these fixtures.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {Engine,A}=require('../extension/core.js');
const FIELDS=['nativeControlOverrideLatched','nativePreviousTarget','nativeThrottleHold','nativeWheelContactMask'];
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:256,shared:true}),e=new Engine(memory),d=new DataView(memory.buffer);
 const player=0xe00000,car=0xe02000,race=0xe04000,driver=0xe06000,behavior=0xe08000;
 const u=(p,v)=>d.setUint32(p,v,true),f=(p,v)=>d.setFloat32(p,v,true),b=(p,v)=>d.setUint8(p,v);
 for(const[p,v]of [[A.FLOW,6],[A.PLAYER,player],[player+4,car],[A.RACE,race],[race,4],[car+A.GEAR,3],[car+0x24,3],[car+0x28,1],[car+0x2c,driver],[driver,0x785370],[driver+4,car],[driver+8,behavior],[behavior,0x784eb0],[behavior+0x220,car]])u(p,v);
 f(car+A.RPM,6000);f(behavior+0x230,34);f(behavior+0x260,33);f(behavior+0x22c,.85);b(behavior+0x25c,1);
 return{memory,e,d,u,f,b,player,car,race,driver,behavior,sample:()=>e.nativeDiagnostics(e.state(),true,false,true)};
}
function pick(s){return Object.fromEntries(FIELDS.filter(k=>Object.hasOwn(s,k)).map(k=>[k,s[k]]));}

test('road controller evidence is read-only and does not replace sampled output controls',()=>{
 const x=fixture();x.b(x.car+0x390,1);x.b(x.car+0x392,255);x.f(x.behavior+0x20c,0);x.f(x.behavior+0x214,.5);
 const before=Buffer.from(x.memory.buffer),s=x.sample();
 assert.deepEqual(pick(s),{nativeControlOverrideLatched:true,nativePreviousTarget:33,nativeThrottleHold:Math.fround(.85),nativeWheelContactMask:5});
 assert.equal(s.nativeThrottle,0);assert.equal(s.nativeBrake,.5);assert.equal(s.nativeRoadTarget,34);assert.deepEqual(Buffer.from(x.memory.buffer),before);
 x.b(x.behavior+0x25c,0);for(let i=0;i<4;i++)x.b(x.car+0x390+i,1);assert.equal(x.sample().nativeControlOverrideLatched,false);assert.equal(x.sample().nativeWheelContactMask,15);
});

test('evidence retains signed previous target and rejects nonfinite or out-of-contract scalars',()=>{
 const x=fixture();
 for(const value of [-500,-20,-0,0,500]){x.f(x.behavior+0x260,value);assert(Object.is(x.sample().nativePreviousTarget,value));}
 for(const value of [NaN,Infinity,-Infinity,-500.1,500.1]){x.f(x.behavior+0x260,value);assert.equal(Object.hasOwn(x.sample(),'nativePreviousTarget'),false);}
 for(const value of [0,.5,1]){x.f(x.behavior+0x22c,value);assert.equal(x.sample().nativeThrottleHold,value);}
 for(const value of [NaN,Infinity,-.01,1.01]){x.f(x.behavior+0x22c,value);assert.equal(Object.hasOwn(x.sample(),'nativeThrottleHold'),false);}
 for(const value of [2,255]){x.b(x.behavior+0x25c,value);assert.equal(Object.hasOwn(x.sample(),'nativeControlOverrideLatched'),false);}
});

test('evidence requires aligned native road controller, reciprocal car and complete264-byte span',()=>{
 for(const change of [x=>x.u(x.driver,0),x=>x.u(x.car+0x24,1),x=>x.u(x.driver+4,0),x=>x.u(x.driver+8,x.behavior+1),x=>x.u(x.behavior,0x784f40),x=>x.u(x.behavior+0x220,0),x=>{const p=x.memory.buffer.byteLength-0x260;x.u(x.driver+8,p);x.u(p,0x784eb0);x.u(p+0x220,x.car);x.f(p+0x230,34);}]){
  const x=fixture();change(x);const before=Buffer.from(x.memory.buffer);assert.deepEqual(pick(x.sample()),{});assert.deepEqual(Buffer.from(x.memory.buffer),before);
 }
 const x=fixture(),ok=x.e.ok.bind(x.e);x.e.ok=(p,n)=>p===x.car+0x390&&n===4?false:ok(p,n);assert.deepEqual(pick(x.sample()),{});
});

test('changing native controller identity rejects the complete sampled evidence',()=>{
 for(const change of [x=>x.u(x.driver+8,x.behavior+4),x=>x.u(x.behavior+0x220,0),x=>x.u(x.behavior,0x784f40)]){
  const x=fixture(),read=x.e.u32.bind(x.e);let changed=false;x.e.u32=p=>{const v=read(p);if(p===x.car+0x1c&&!changed){changed=true;change(x);}return v;};
  assert.deepEqual(x.sample(),{nativeTelemetry:false,nativeTelemetryStatus:'context-changed'});assert(changed);
 }
 const x=fixture();assert.deepEqual(pick(x.e.nativeDiagnostics(x.e.state(),false)),{});
});

test('exact current943 native controller and PE pin the evidence types and source locations',()=>{
 const P=require('../../work-aa-profile/tools/native-proof.cjs'),K=require('../native/paced-profile-config.cjs'),profile=K.PROFILES.find(p=>p.revision==='943ee537'),raw=P.pinned(profile.native),map=P.guestMap(raw),parsed=P.parse(raw);
 assert.deepEqual(map.get(0x421030),{slot:742,index:15844});assert.equal(P.hash(parsed.bodies.get(15844)),'78812236c8963b86baee3a876c954bc507a155eb079facc0e8eec4a98e98032d');
 const pe=fs.readFileSync(require('node:path').resolve(__dirname,'../../research/current-native-image/SPEED2.EXE'));assert.equal(P.hash(pe),'f9dd86c054878ce6276beb07c1fd61874f7a1e4bf1f241b084c65b73e24168a7');
 const header=pe.readUInt32LE(0x3c),sections=header+24+pe.readUInt16LE(header+20),base=pe.readUInt32LE(header+52);
 function bytes(guest,size){for(let i=0;i<pe.readUInt16LE(header+6);i++){const s=sections+40*i,va=base+pe.readUInt32LE(s+12),n=pe.readUInt32LE(s+16);if(guest>=va&&guest+size<=va+n)return pe.subarray(pe.readUInt32LE(s+20)+guest-va,pe.readUInt32LE(s+20)+guest-va+size);}throw Error('Unmapped pinned PE span');}
 // mov al,[esi+25c]; mov edx,[esi+22c]; fld[f32 esi+230] / fcomp[esi+260];
 // mov eax,[esi+230] / store[esi+260]; mov cl,[eax+edi+390] source byte.
 for(const[guest,hex]of [[0x421f57,'8a865c020000'],[0x421f97,'8b962c020000'],[0x421f84,'d98630020000d89e60020000'],[0x421fbd,'8b8630020000'],[0x421fc7,'898660020000'],[0x4210e6,'8a8c3890030000']])assert.equal(bytes(guest,hex.length/2).toString('hex'),hex);
});
