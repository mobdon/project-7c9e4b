'use strict';
// Read-only evidence behind new fields:
// - AA f6140/guest4054a0, body SHA dddfb2c77a00d29da2ed14ee2c6ca22e772045daa7d824875988d36093239e2b,
//   stores first target argument at controller+230 (actual execution below).
// - Street X: native42b340 tests89e7e3/89010c; port runtime/discord.c,
//   drift.c and mprace.h identify the local byte, forced flag and online10 enum.
// - AA native422780/f17086, SHA c7a537c68cdb34b861624bba5e3307805d4c2e3034aa441da569b3dde22efd8f,
//   consumes the same128-byte private route records for corner commands2/3.
//   Extending this readout does not edit the native helper or a control command.
// - tools/build-ai-pace.cjs publishes requested percent B60, applied B76,
//   hit counter B80; that authored hook remains unchanged.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Engine,A}=require('../extension/core.js'),AI=require('../extension/ai.js'),profile=require('../extension/next-profile.js');
const B=AI.BASE,C=AI.CORNER_BASE;
function core(memory=new WebAssembly.Memory({initial:256,maximum:300,shared:true})){
 const e=new Engine(memory),d=new DataView(memory.buffer),put=(p,v)=>d.setUint32(p,v,true),float=(p,v)=>d.setFloat32(p,v,true);
 const p=0xe00000,car=0xe02000,race=0xe04000,record=0xe06000,driver=0xe08000,behavior=0xe0a000,action=0xe0b000;
 for(const [a,v]of [[A.FLOW,6],[A.PLAYER,p],[p+4,car],[A.RACE,race],[race,4],[car+A.GEAR,3],[car+0x14,record],[record+4,1],[car+0x24,3],[car+0x28,3],[car+0x2c,driver],[driver,0x785370],[driver+4,car],[driver+8,behavior],[driver+0x6fc,action],[behavior,0x784eb0],[behavior+0x220,car],[action,0x784768],[action+20,1],[0x89e7a0,4715]])put(a,v);
 float(car+A.RPM,6000);float(behavior+0x230,-20);d.setUint8(record+0x901,254);
 return {memory,e,d,put,float,p,car,race,record,driver,behavior,action,sample:()=>e.nativeDiagnostics(e.state(),true,false,true)};
}
function ai(){
 const x=core(),{put,float,d,driver,car,race,p}=x,route=driver+0x370,record=route+0xd4;
 for(const [a,v]of [[B,AI.MAGIC],[B+28,AI.MAGIC],[B+4,2],[B+8,1],[B+12,p],[B+16,car],[B+20,race],[B+32,p],[B+36,car],[B+40,race],[B+52,1],[B+60,200],[B+76,125],[B+80,7],[C,AI.CORNER_MAGIC],[C+4,2],[C+8,80],[C+12,car],[C+16,1],[C+32,80],[C+36,15],[C+40,15],[C+44,75],[C+48,200],[C+52,200],[C+56,75],[C+60,9],[0xd00030,1],[0x89e7b0,1],[driver+0x6e8,route],[route+4,28],[route+0xd0,1]])put(a,v);
 float(C+20,60);float(C+24,30);
 const nodes=Array.from({length:28},(_,i)=>{const node=0xf00000+i*256;put(route+8+i*4,node);put(node+0x64,route);return node;});
 [[-10,0],[0,0],[10,0],[10,10],[10,20]].forEach(([a,b],i)=>{float(record+i*8,a);float(record+i*8+4,b);float(record+40+i*4,i*10);});
 d.setInt8(record+116,10);for(let i=0;i<8;i++)d.setInt8(record+117+i,i);float(record+0x60,30);
 return {...x,route,cornerRecord:record,nodes,c:new AI.Controller(x.memory,true,profile.capabilities)};
}
test('native setter supplies signed road target; telemetry preserves native units and writes nothing',async()=>{
 const {fixture,instance}=require('../../work-race-shortcuts/native-fixture.cjs');
 const built=await fixture([6140]);assert.equal(built.hashes[6140],'dddfb2c77a00d29da2ed14ee2c6ca22e772045daa7d824875988d36093239e2b');
 const native=instance(built),x=core(native.memory),bits=new DataView(new ArrayBuffer(4));
 for(const value of [-500,-20,-0,0,80,500]){
  bits.setFloat32(0,value,true);native.call('f6140',{ecx:x.behavior,args:[bits.getUint32(0,true),0,0,0]});
  const before=native.bytes(x.behavior,0x240),sample=x.sample();assert(Object.is(sample.nativeRoadTarget,value));assert.equal(sample.nativeRoadTargetStatus,'sampled');assert.equal(sample.nativeTelemetryStatus,'sampled');assert.equal('nativeRoadTargetMps' in sample,false);assert.deepEqual(native.bytes(x.behavior,0x240),before);
 }
});
test('Street X flags remain distinct; online enum alone never identifies a local Street X race',()=>{
 const x=core(),before=Buffer.from(x.memory.buffer);let s=x.sample();assert.equal(s.streetXRace,false);assert.equal(s.forcedStreetX,false);assert.equal(s.onlineStreetX,false);assert.deepEqual(Buffer.from(x.memory.buffer),before);
 x.d.setUint8(0x89e7e3,1);s=x.sample();assert.equal(s.streetXRace,true);assert.equal(s.forcedStreetX,false);x.d.setUint8(0x89e7e3,0);x.put(0x89010c,1);s=x.sample();assert.equal(s.forcedStreetX,true);assert.equal(s.streetXRace,false);
 x.put(0x89010c,0);x.put(0x850088,10);assert.equal(x.sample().onlineStreetX,false);x.put(A.MODE,8);assert.equal(x.sample().onlineStreetX,true);x.put(0x850088,0);assert.equal(x.sample().onlineStreetX,false);
});
test('road target requires full234-byte span, alignment, native road vtable and car backlink',()=>{
 for(const change of [x=>x.put(x.driver,0),x=>x.put(x.behavior,0x784f40),x=>x.put(x.behavior+0x220,0),x=>x.put(x.driver+8,x.behavior+1),x=>{const end=x.memory.buffer.byteLength-0x230;x.put(x.driver+8,end);x.put(end,0x784eb0);x.put(end+0x220,x.car);}]){
  const x=core();change(x);const before=Buffer.from(x.memory.buffer),s=x.sample();assert.equal('nativeRoadTarget' in s,false);assert.notEqual(s.nativeRoadTargetStatus,'sampled');assert.deepEqual(Buffer.from(x.memory.buffer),before);
 }
 for(const value of [NaN,Infinity,-Infinity,-500.1,500.1]){const x=core();x.float(x.behavior+0x230,value);const s=x.sample();assert.equal('nativeRoadTarget' in s,false);assert.equal(s.nativeRoadTargetStatus,'value-invalid');}
});
test('opt-in failures use fixed codes while legacy optional readers retain empty results',()=>{
 const x=core(),state=x.e.state();assert.deepEqual(x.e.nativeDiagnostics(state,false,false,true),{nativeTelemetry:false,nativeTelemetryStatus:'profile-unverified'});assert.deepEqual(x.e.nativeDiagnostics({ready:false},true,false,true),{nativeTelemetry:false,nativeTelemetryStatus:'state-unavailable'});assert.deepEqual(x.e.nativeDiagnostics(state,false),{});
 assert.deepEqual(x.e.nativeDiagnostics(state,true,true,true),{nativeTelemetry:false,nativeTelemetryStatus:'drift-ineligible'});x.put(x.p+4,0);assert.deepEqual(x.e.nativeDiagnostics(state,true,false,true),{nativeTelemetry:false,nativeTelemetryStatus:'context-stale'});assert.deepEqual(x.e.nativeDiagnostics(state,true),{});
});
test('Street X and native ownership transitions reject a partial scalar sample with fixed status',()=>{
 for(const mutate of [x=>x.d.setUint8(0x89e7e3,1),x=>x.put(0x89010c,1),x=>x.put(0x850088,10),x=>x.put(A.HOST,1),x=>x.put(x.behavior+0x220,0)]){
  const x=core(),read=x.e.u32.bind(x.e);let changed=false;x.e.u32=p=>{const v=read(p);if(p===x.car+0x1c&&!changed){changed=true;mutate(x);}return v;};assert.deepEqual(x.sample(),{nativeTelemetry:false,nativeTelemetryStatus:'context-changed'});assert(changed);
 }
});
test('legacy Street X command2 reports bounded native corner coverage without changing controls',()=>{
 const x=ai();x.d.setUint8(0x89e7e3,1);const before=Buffer.from(x.memory.buffer),s=x.c.status();assert.equal(s.cornerMode,2);assert.equal(s.cornerPlannerUsable,1);assert.equal(s.cornerPlannerTelemetryStatus,'sampled');assert.deepEqual(Buffer.from(x.memory.buffer),before);
 x.put(C+4,3);assert.equal(x.c.status().cornerPlannerUsable,1);
});
test('command2 retains all route, record and node ownership denials',()=>{
 for(const [mutate,code]of [[x=>x.put(x.driver+0x6e8,x.route+4),'route-unavailable'],[x=>x.put(x.route+4,41),'record-invalid'],[x=>x.put(x.route+0xd0,6),'record-invalid'],[x=>x.d.setInt8(x.cornerRecord+116,28),'record-invalid'],[x=>x.put(x.nodes[0]+0x64,0),'record-invalid'],[x=>x.float(x.cornerRecord+0x60,NaN),'record-invalid']]){
  const x=ai();mutate(x);const before=Buffer.from(x.memory.buffer),s=x.c.status();assert.equal(s.cornerPlannerUsable,null);assert.equal(s.cornerPlannerTelemetryStatus,code);assert.deepEqual(Buffer.from(x.memory.buffer),before);
 }
 const x=ai();x.put(C+4,1);assert.equal(x.c.status().cornerPlannerTelemetryStatus,'command-ineligible');
});
test('requested pace, mailbox applied pace and application count are separate observations',()=>{
 const x=ai(),before=Buffer.from(x.memory.buffer),s=x.c.status();assert.equal(s.nativePaceTelemetryStatus,'sampled');assert.equal(s.nativePaceRequested,2);assert.equal(s.nativePaceApplied,1.25);assert.equal(s.nativePaceHits,7);assert.equal(s.paceRequested,2);assert.equal(s.paceApplied,1.25);assert.deepEqual(Buffer.from(x.memory.buffer),before);
 x.put(B+80,0);x.put(B+76,0);let z=x.c.status();assert.equal(z.nativePaceHits,0);assert.equal(z.nativePaceApplied,null);assert.equal(z.nativePaceTelemetryStatus,'sampled');x.put(B+80,0xffffffff);x.put(B+76,125);assert.equal(x.c.status().nativePaceHits,0xffffffff);
});
test('mailbox validation and ownership reject applied telemetry without touching native memory',()=>{
 for(const mutate of [x=>x.put(B,0),x=>x.put(B+4,3),x=>x.put(B+4,0),x=>x.put(B+60,74),x=>x.put(B+60,301),x=>x.put(B+76,74)]){const x=ai();mutate(x);const before=Buffer.from(x.memory.buffer),s=x.c.status();assert.equal(s.nativePaceTelemetryStatus,'mailbox-invalid');assert.equal(s.nativePaceApplied,null);assert.equal(s.nativePaceHits,null);assert.deepEqual(Buffer.from(x.memory.buffer),before);}
 for(const mutate of [x=>x.put(B+36,0),x=>x.put(B+16,0),x=>x.put(B+40,x.race+4),x=>x.put(x.driver,0),x=>x.put(B+48,180),x=>x.put(0x8654a4,0),x=>x.put(0xd00030,0),x=>x.put(x.race,6),x=>x.put(x.p+16,1),x=>x.put(A.HOST,1)]){const x=ai();mutate(x);const s=x.c.status();assert.equal(s.nativePaceTelemetryStatus,'context-unowned');assert.equal(s.nativePaceApplied,null);}
});
test('changing native mailbox generation marks telemetry unknown instead of mixing publications',()=>{
 const x=ai(),read=x.c.read.bind(x.c);let changed=false;x.c.read=off=>{const v=read(off);if(off===80&&!changed){changed=true;x.put(B+4,4);}return v;};const s=x.c.status();assert.equal(s.nativePaceTelemetryStatus,'mailbox-changed');assert.equal(s.nativePaceRequested,null);assert.equal(s.nativePaceApplied,null);assert.equal(s.nativePaceHits,null);
});
test('unavailable optional telemetry emits fixed status without raw errors',()=>{
 const memory=new WebAssembly.Memory({initial:1,maximum:1,shared:true});assert.equal(new AI.Controller(memory,false,profile.capabilities).status().nativePaceTelemetryStatus,'unavailable');assert.equal(new AI.Controller(memory,true,profile.capabilities).status().nativePaceTelemetryStatus,'mailbox-unready');
 const x=ai();const c=new AI.Controller(x.memory,true,{...profile.capabilities,pace:false,corner:false});assert.equal(c.status().nativePaceTelemetryStatus,'unsupported');assert.equal(c.status().cornerPlannerTelemetryStatus,'unsupported');
});
