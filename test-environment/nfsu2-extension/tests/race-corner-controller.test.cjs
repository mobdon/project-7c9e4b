const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {Controller,BASE:A,CORNER_BASE:C}=require('../extension/ai.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-'+(process.env.NFS_PROFILE||'latest')+'-bridge.wasm'));
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),calls=[];
 const p=0xe00000,car=0xe01000,race=0xe04000,rec=0xe05000,cpu=0xe08000,stack=0xe09000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true);
 put(cpu+16,stack);put(stack,0x581475);put(0x8654a4,6);put(0xd00000,p);put(0xd00030,1);put(p+4,car);put(car+0x24,1);put(car+0x14,rec);put(car+0x28,1);d.setUint8(car+0x5c0,1);put(0x890118,race);put(race,4);d.setUint8(rec+0x901,4);
 const inst=new WebAssembly.Instance(bridge,{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected unarmed dyno dispatch');},gcall:(c,fn,owner,n,args)=>{calls.push(fn);if(fn===0x5fae20){put(car+0x24,3);put(car+0x28,3);}if(fn===0x5faf10){put(car+0x24,1);put(car+0x28,1);}if(fn===0x5f46a0)put(owner+0x28,get(args));}}});
 const step=()=>inst.exports.step(cpu);step();const c=new Controller(memory,true,require('../extension/'+(process.env.NFS_PROFILE||'latest')+'-profile.js').capabilities),state={ready:true,driving:true,network:false,drag:false,car,race};
 const request=(extra={})=>c.update({enabled:true,safe:true,state,mode:2,cornerAssist:true,cornerFactor:.8,...extra});
 return {c,d,put,get,calls,step,state,request,car};
}
function road(){const x=fixture();x.put(0x89e7b0,1);const prior=x.request;x.request=(extra={})=>prior({mode:1,cornerAssist:false,raceCornerAssist:true,pace:3,...extra});return x;}
test('explicit network opt-in uses the same local owned race settings and restores the guard when removed',()=>{
 for(const [address,value] of [[0x850078,8],[0x850078,512],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
  for(const permission of [false,0,1,'true',true]){
   const f=road();f.put(address,value);f.state.network=true;f.request({allowNetwork:permission});f.step();
   assert.equal(f.get(C+4),permission===true?2:0);assert.equal(f.c.status().active,permission===true);assert.equal(f.c.status().cornerRequested,permission===true);assert.equal(f.get(address),value);
   if(permission===true){assert.equal(f.get(C+44),75);assert.equal(f.get(C+48),300);assert.equal(f.c.status().cornerGuardMask&32,0);f.request({allowNetwork:false});f.step();assert.equal(f.get(C+4),0);assert.equal(f.c.status().active,false);assert.equal(f.get(address),value);}
  }
 }
});
test('separate road request preserves selected pace and native AI ownership',()=>{
 const f=road();f.request();f.step();const s=f.c.status();assert.equal(s.active,true);assert.equal(s.cornerMode,2);assert.equal(s.cornerRequested,true);assert.equal(s.cornerApplied,null);assert.equal(s.cornerPace,3);assert.equal(s.cornerBraking,.75);assert.equal(f.get(A+60),300);assert.equal(f.get(C+44),75);assert.equal(f.get(C+48),300);assert.equal(f.get(C+8),80);assert.equal(f.get(C+36),15);assert.deepEqual(f.calls,[0x5fae20]);
});
test('race settings and effective selected pace changes rebuild cached route through OFF/manual/ON',()=>{
 for(const change of [{pace:2.6},{raceCornerFactor:.9},{raceCornerMargin:25},{raceBraking:.5},{raceCornerAssist:false}]){
  const f=road();f.request();f.step();f.put(C+60,10);f.put(C+52,300);f.put(C+56,75);
  assert.equal(f.request(change).switching,true);assert.equal(f.get(A+8),0);assert.equal(f.get(C+4),0);assert.equal(f.get(C+60),0);assert.equal(f.get(C+52),0);assert.equal(f.get(C+56),0);
  for(let i=0;i<3;i++)f.request(change);assert.equal(f.calls.length,1);
  f.step();f.request(change);f.step();assert.equal(f.c.status().active,true);assert.deepEqual(f.calls,[0x5fae20,0x5faf10,0x605c70,0x5fae20]);f.request(change);f.step();assert.equal(f.calls.length,4);
 }
});
test('disabled race option and same rounded selected pace do not force unnecessary resets',()=>{
 const f=road();f.request({raceCornerAssist:false});f.step();f.request({raceCornerAssist:false,pace:2,raceBraking:.5});f.step();assert.equal(f.calls.length,1);assert.equal(f.get(C+4),0);
 const g=road();g.request({pace:2.6});g.step();g.request({pace:2.601});g.step();assert.equal(g.calls.length,1);
});
test('race option is literal opt-in and does not spill into excluded events or non-opted-in network play',()=>{
 for(const v of [false,1,'true']){const f=road();f.request({raceCornerAssist:v});assert.equal(f.get(C+4),0);}
 for(const v of [0,7,8,99]){const f=road();f.put(0x89e7b0,v);f.request();assert.equal(f.get(C+4),0);}
 for(const p of [0x89e7d8,0x89e7d9,0x890104,0x890108,0x890114]){const f=road();f.put(p,1);f.request({allowNetwork:true,allowDragAI:true});assert.equal(f.get(C+4),0);}
 const f=road();f.put(0x850078,8);f.request({allowNetwork:false});assert.equal(f.get(C+4),0);
 const g=road();g.state.network=true;g.request({allowNetwork:false});assert.equal(g.get(C+4),0);
 const h=road();h.request({mode:2});assert.equal(h.get(C+4),0);
 const i=road();i.state.drag=true;i.request({allowDragAI:true});assert.equal(i.get(C+4),0);
});
test('race settings are bounded and full expanded mailbox ownership is preserved',()=>{
 for(const extra of [{raceCornerFactor:NaN},{raceCornerFactor:.96},{raceBraking:.49},{raceBraking:Infinity},{raceCornerMargin:26}]){const f=road();f.request(extra);assert.equal(f.get(C+8),80);assert.equal(f.get(C+44),75);assert.equal(f.get(C+36),15);}
 for(const off of [44,48,52,56,60]){const f=road();f.put(C+off,123);const before=Buffer.from(new Uint8Array(f.d.buffer,C,64));f.request();assert.equal(f.c.status().cornerMemoryBlocked,true);assert.deepEqual(Buffer.from(new Uint8Array(f.d.buffer,C,64)),before);}
 const f=road();f.put(C,0x32524e43);const before=Buffer.from(new Uint8Array(f.d.buffer,C,64));f.request();assert.deepEqual(Buffer.from(new Uint8Array(f.d.buffer,C,64)),before);
});
test('braking entry counts and pace acknowledgments cannot masquerade as actual corner hits',()=>{
 const f=road();f.request();f.step();f.put(A+76,300);f.put(A+80,1);f.put(C+60,7);let s=f.c.status();assert.equal(s.paceApplied,3);assert.equal(s.brakingHits,7);assert.equal(s.cornerHits,0);assert.equal(s.cornerApplied,null);
 f.put(C+12,f.car);f.put(C+16,1);f.put(C+32,80);f.put(C+40,15);f.put(C+52,260);f.put(C+56,75);f.d.setFloat32(C+20,30,true);f.d.setFloat32(C+24,8,true);assert.equal(f.c.status().cornerApplied,null);
 f.put(C+52,300);assert.ok(f.c.status().cornerApplied>0);f.c.stop();assert.equal(f.c.status().cornerRequested,false);assert.equal(f.get(C+60),0);assert.equal(f.get(C+16),0);
});
