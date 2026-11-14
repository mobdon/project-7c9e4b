'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const AI=require('../extension/ai.js'),profile=require('../extension/next-profile.js'),{readPinned,bodies}=require('../tools/latest-native-utils.cjs');
const selector=new WebAssembly.Module(fs.readFileSync(__dirname+'/drift-recovery-selector.wasm'));
function header(b){let p=0;const u=()=>{let n=0,s=0,x;do{x=b[p++];n|=(x&127)<<s;s+=7}while(x&128);return n};const out=[];for(let n=u();n--;){const count=u(),t=b[p++];out.push(...Array(count).fill(t));}return{end:p,types:out};}
test('recovery splice preserves all native instructions except the reviewed curve expression',()=>{
 for(const pin of ['latest','next']){
  const b=bodies(readPinned(pin)).get(8871),c=profile.driftRecovery,out=Buffer.from(AI.patchDriftRecoveryBody(b,c)),a=header(b),h=header(out);
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),c.bodySha256);
  assert.deepEqual(h.types.slice(0,a.types.length),a.types);assert.deepEqual(h.types.slice(a.types.length),Array(8).fill(127));
  const split=h.end+c.offset-a.end;assert.deepEqual(out.subarray(h.end,split),b.subarray(a.end,c.offset));assert.deepEqual(out.subarray(split+c.expression.length),b.subarray(c.offset+c.needle.length));
  for(const mutate of [x=>x[c.offset]^=1,x=>x[c.sliceOffset]^=1,x=>x[2]=124]){const bad=Buffer.from(b);mutate(bad);assert.throws(()=>AI.patchDriftRecoveryBody(bad,c),/layout changed/);}
  assert.throws(()=>AI.patchDriftRecoveryBody(b.subarray(1),c),/layout changed/);
 }
 assert.equal(profile.capabilities.nativeDriftRecovery,true);assert.equal(require('../extension/current-profile.js').capabilities.nativeDriftRecovery,undefined);
});
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),B=AI.BASE;
 const p=0xe00000,car=0xe01000,race=0xe04000,rec=0xe05000,cpu=0xe08000,stack=0xe09000,driver=0xe0a000,behavior=0xe0c000,phys=0xe0e000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),byte=(a,v)=>d.setUint8(a,v);
 for(const [a,v]of [[cpu+16,stack],[cpu+28,phys],[stack,0x581475],[0x8654a4,6],[0xd00000,p],[0xd00030,1],[p+4,car],[car+0x24,1],[car+0x14,rec],[car+0x28,1],[car+0x34,phys],[phys+0x5c,car],[0x890118,race],[race,4],[rec+4,1]])put(a,v);
 byte(car+0x5c0,1);byte(rec+0x901,4);byte(0x89e7d9,1);
 const bridge=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-next-bridge.wasm')),{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected dyno call')},gcall:(cpu,fn,thisP,n,args)=>{
  if(fn===0x5fae20){put(car+0x24,3);put(car+0x28,3);put(car+0x2c,driver);put(driver,0x785370);put(driver+4,car);put(driver+8,behavior);put(behavior,0x784f40);put(behavior+0x220,car);put(car+0x30,behavior);put(phys+4,behavior);}
  else if(fn===0x5f46a0)put(car+0x28,get(args));
  else if(fn===0x5faf10){put(car+0x24,1);put(car+0x28,1);}
  else if(fn!==0x605c70)throw Error('Unexpected native call');
 }}});
 const choose=new WebAssembly.Instance(selector,{env:{memory}}).exports.select;
 const step=()=>bridge.exports.step(cpu);step();const c=new AI.Controller(memory,true,profile.capabilities),s={ready:true,driving:true,network:false,car,race};
 const on=()=>c.update({enabled:true,safe:true,state:s,mode:2,allowDragAI:true});
 return{d,memory,p,car,race,rec,cpu,driver,behavior,phys,B,put,get,byte,step,c,s,on,choose:()=>choose(cpu)};
}
test('production bridge acquisition makes the selector eligible; stop immediately restores native curve selection',()=>{
 const f=fixture();assert.equal(f.choose(),0x86b3c8);f.on();assert.equal(f.choose(),0x86b3c8);f.step();assert.equal(f.c.status().active,true);assert.equal(f.choose(),0x86b570);
 const before=Buffer.from(f.memory.buffer);for(let i=0;i<10;i++)assert.equal(f.choose(),0x86b570);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 f.c.stop();assert.equal(f.choose(),0x86b3c8);f.step();assert.equal(f.c.status().manual,true);assert.equal(f.choose(),0x86b3c8);assert.equal(f.d.getUint8(f.rec+0x901),4);
});
test('heartbeat expiry, pause, changed identity and handback never leave persistent curve state',()=>{
 for(const change of [f=>{for(let i=0;i<180;i++)f.step()},f=>f.put(f.p+16,1),f=>f.put(f.B+40,f.race+0x1000),f=>f.put(f.car+0x34,f.phys+0x1000),f=>f.put(f.driver+8,0),f=>f.put(f.phys+4,0)]){
  const f=fixture();f.on();f.step();assert.equal(f.choose(),0x86b570);change(f);assert.equal(f.choose(),0x86b3c8);f.c.stop();f.step();assert.equal(f.choose(),0x86b3c8);
 }
});
test('road/drag handback disables recovery before the next native mode is acquired',()=>{
 const f=fixture();f.on();f.step();assert.equal(f.choose(),0x86b570);
 f.byte(0x89e7d9,0);f.byte(0x89e7d8,1);f.s.drag=true;assert.equal(f.on().switching,true);assert.equal(f.choose(),0x86b3c8);f.step();assert.equal(f.c.status().manual,true);
});
