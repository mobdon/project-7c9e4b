const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {Controller,BASE:A,CORNER_BASE:C}=require('../extension/ai.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-bridge.wasm'));
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),calls=[];
 const p=0xe00000,car=0xe01000,race=0xe04000,rec=0xe05000,cpu=0xe08000,stack=0xe09000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true);
 put(cpu+16,stack);put(stack,0x581475);put(0x8654a4,6);put(0xd00000,p);put(0xd00030,1);put(p+4,car);put(car+0x24,1);put(car+0x14,rec);put(car+0x28,1);d.setUint8(car+0x5c0,1);put(0x890118,race);put(race,4);d.setUint8(rec+0x901,4);
 const inst=new WebAssembly.Instance(bridge,{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected unarmed dyno dispatch');},gcall:(c,fn,owner,n,args)=>{calls.push(fn);if(fn===0x5fae20){put(car+0x24,3);put(car+0x28,3);}if(fn===0x5faf10){put(car+0x24,1);put(car+0x28,1);}if(fn===0x5f46a0)put(owner+0x28,get(args));}}});
 const step=()=>inst.exports.step(cpu);step();const c=new Controller(memory,true),state={ready:true,driving:true,network:false,drag:false,car,race};
 const request=(extra={})=>c.update({enabled:true,safe:true,state,mode:2,cornerAssist:true,cornerFactor:.8,...extra});
 return {c,d,put,get,calls,step,state,request,car};
}
test('changing or disabling corner settings fully hands back before rebuilding cached native route',()=>{
 for(const extra of [{cornerFactor:.9},{cornerFactor:.7},{cornerAssist:false}]){
  const f=fixture();f.request();f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(C+4),1);
  const status=f.request(extra);assert.equal(status.switching,true);assert.equal(f.get(A+8),0);assert.equal(f.get(C+4),0);
  for(let i=0;i<3;i++){f.request(extra);assert.equal(f.get(A+8),0);}assert.deepEqual(f.calls,[0x5fae20]);
  f.step();assert.equal(f.c.status().manual,true);assert.equal(f.c.status().owned,false);
  f.request(extra);f.step();assert.equal(f.c.status().active,true);assert.deepEqual(f.calls,[0x5fae20,0x5faf10,0x605c70,0x5fae20]);
  f.request(extra);f.step();assert.equal(f.calls.length,4,'unchanged request does not repeatedly rebuild');
 }
});
test('native category changes rebuild AI even when HUD and all pointers stay the same',()=>{
 const f=fixture();f.request();f.step();f.put(0x89e7b0,7);assert.equal(f.request().switching,true);assert.equal(f.get(C+4),0);
 f.step();f.request();f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(C+4),0);assert.equal(f.c.status().cornerRequested,false);
 f.put(0x89e7b0,0);assert.equal(f.request().switching,true);f.step();f.request();f.step();assert.equal(f.get(C+4),1);
 assert.equal(f.calls.filter(x=>x===0x5fae20).length,3);
});
test('corner diagnostics do not claim application until native hit and clear on settings or mode change',()=>{
 const f=fixture();f.request();f.step();let s=f.c.status();assert.equal(s.cornerRequested,true);assert.equal(s.cornerFactor,.8);assert.equal(s.cornerApplied,null);assert.equal(s.cornerHits,0);
 f.put(C+12,f.car);f.put(C+16,5);f.put(C+32,80);s=f.c.status();assert.equal(s.cornerApplied,.8);assert.equal(s.cornerHits,5);
 f.request({cornerFactor:.9});s=f.c.status();assert.equal(s.cornerRequested,false);assert.equal(s.cornerApplied,null);assert.equal(s.cornerHits,0);assert.equal(f.get(C+16),0);
 f.step();f.request({cornerFactor:.9});f.step();assert.equal(f.c.status().cornerRequested,true);assert.equal(f.c.status().cornerApplied,null);
 f.put(C+12,f.car+4);f.put(C+16,1);f.put(C+32,90);assert.equal(f.c.status().cornerApplied,null,'wrong-car diagnostic not accepted');
 f.c.stop();assert.equal(f.get(C+4),0);assert.equal(f.get(C+16),0);
});
test('corner command is literal opt-in, bounded and only for actual free roam',()=>{
 for(const type of [1,7,8,99]){const f=fixture();f.put(0x89e7b0,type);f.request();assert.equal(f.get(C+4),0);}
 for(const cornerAssist of [false,1,'true']){const f=fixture();f.request({cornerAssist});assert.equal(f.get(C+4),0);}
 for(const cornerFactor of [NaN,Infinity,.59,.96,'0.8']){const f=fixture();f.request({cornerFactor});assert.equal(f.get(C+8),80);}
 const f=fixture();f.state.drag=true;f.d.setUint8(0x89e7d8,1);f.request({allowDragAI:true});assert.equal(f.get(C+4),0);
});
test('disabled corner factor changes and identical rounded factor do not cause unnecessary resets',()=>{
 let f=fixture();f.request({cornerAssist:false});f.step();f.request({cornerAssist:false,cornerFactor:.9});f.step();assert.equal(f.calls.length,1);
 f=fixture();f.request();f.step();f.request({cornerFactor:.801});f.step();assert.equal(f.calls.length,1);
});


test('adaptive margin changes rebuild cached route through the full OFF/manual/ON handback',()=>{
 const f=fixture();f.request({cornerMargin:15});f.step();assert.equal(f.get(C+36),15);
 f.put(C+12,f.car);f.put(C+16,3);f.put(C+32,80);f.put(C+40,15);
 assert.equal(f.request({cornerMargin:25}).switching,true);assert.equal(f.get(A+8),0);assert.equal(f.get(C+4),0);assert.equal(f.get(C+16),0);assert.equal(f.get(C+40),0);
 for(let i=0;i<3;i++)f.request({cornerMargin:25});assert.equal(f.calls.length,1);
 f.step();f.request({cornerMargin:25});f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(C+36),25);
 f.request({cornerMargin:25});f.step();assert.equal(f.calls.length,4);
 f.request({cornerMargin:0});assert.equal(f.get(C+4),0);f.step();f.request({cornerMargin:0});f.step();assert.equal(f.get(C+36),0);
});
test('margin is bounded, old baseline is API default, disabled changes do not rebuild',()=>{
 for(const cornerMargin of [-1,26,NaN,Infinity,'15']){const f=fixture();f.request({cornerMargin});assert.equal(f.get(C+36),0);}
 let f=fixture();f.request();assert.equal(f.get(C+36),0);
 f=fixture();f.request({cornerAssist:false});f.step();f.request({cornerAssist:false,cornerMargin:25});f.step();assert.equal(f.calls.length,1);
 f=fixture();f.put(C+40,123);f.request({cornerMargin:15});assert.equal(f.get(C),0,'occupied extension region is not overwritten');assert.equal(f.get(C+40),123);
});
