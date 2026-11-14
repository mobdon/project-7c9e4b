'use strict';
// Research fixture: executes the exact pinned native heat-update body, with only
// its rare x87 slow helper replaced by a throwing boundary. Normal finite tested
// values must never reach that stub. Not a whole-race or browser claim.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readPinned,bodies,leb,section,string}=require('../tools/latest-native-utils.cjs'),AI=require('../extension/ai.js');
const B=0xd0d100,M=0x3749414e,config=require('../tools/drag-overheat.json');
function moduleFor(raw){
 const imports=[...string('env'),...string('memory'),2,3,...leb(256),...leb(65536)];
 for(let i=0;i<2393;i++)imports.push(...string('env'),...string(i===2392?'slow':'unused'),0,i===2392?1:0);
 return new WebAssembly.Module(Buffer.from([0,97,115,109,1,0,0,0,...section(1,[2,0x60,1,127,0,0x60,4,127,124,124,124,1,124]),...section(2,[...leb(2394),...imports]),...section(3,[1,0]),...section(7,[1,...string('run'),0,...leb(2393)]),...section(10,[1,...leb(raw.length),...raw])]));
}
function fixture(mod,{cpu=0xe00000}={}){
 const memory=new WebAssembly.Memory({initial:Math.max(256,Math.ceil((cpu+344)/65536)),maximum:65536,shared:true}),d=new DataView(memory.buffer),put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),flt=(a,v)=>d.setFloat32(a,v,true);
 const stack=0xe01000,p=0xe02000,car=0xe04000,race=0xe06000,rec=0xe08000,physics=0xe0a000,motor=0xe0c000,params=0xe0d000,tuning=0xe0e000;
 let slow=0;const run=new WebAssembly.Instance(mod,{env:{memory,unused:()=>{throw Error('Unexpected native call');},slow:()=>{slow++;throw Error('Unexpected x87 slow helper');}}}).exports.run;
 for(const [a,v]of [[B,M],[B+28,M],[B+4,2],[B+100,1],[B+12,p],[B+16,car],[B+20,race],[0xd00000,p],[0xd00030,1],[0x8654a4,6],[0x890118,race],[race,4],[p+4,car],[car+20,rec],[rec+4,1],[car+40,1],[car+52,physics],[physics+72,motor],[cpu+4,motor],[motor+24,params],[motor+32,tuning]])put(a,v);
 d.setUint16(cpu+140,0x37f,true);d.setUint8(0x89e7d8,1);
 // Exact constants read from the native image, expressed as authored numbers.
 for(const [a,v]of [[0x7d7d3c,0],[0x7a1910,2],[0x7a1d28,9.549304008483887],[0x7a1904,.45],[0x7a1908,-.1],[0x7a190c,1.2],[params+4,8000],[motor+20,9000/9.549304008483887],[motor+140,0]])flt(a,v);
 return {memory,d,put,get,flt,cpu,stack,motor,car,race,physics,p,rec,heat:()=>d.getFloat32(motor+140,true),step(dt=1/60){put(cpu+16,stack);put(stack,0x123456);flt(stack+4,dt);run(cpu);assert.equal(get(cpu+16),stack+8);assert.equal(get(cpu+32),0x123456);assert.equal(slow,0);}};
}
for(const version of ['latest','next']){
 const raw=bodies(readPinned(version)).get(2459),original=moduleFor(raw),patched=moduleFor(AI.patchDragOverheatBody(raw,config));
 test(version+' exact native baseline overheats above redline and cools below',()=>{
  const f=fixture(original);f.step(1);assert.ok(Math.abs(f.heat()-.45)<1e-6);f.flt(f.motor+20,7000/9.549304008483887);f.step(1);assert.ok(Math.abs(f.heat()-.35)<1e-6);f.flt(f.motor+20,9000/9.549304008483887);f.step(2);assert.equal(f.heat(),2);
 });
 test(version+' exact native patched routine survives 600 above-redline frames, then OFF restores native heat',()=>{
  const f=fixture(patched);for(let frame=0;frame<600;frame++){
   // Native full-physics setup clamps the disabled heat back to zero before the
   // engine update. Model that single observed store; no fake damage routine.
   f.flt(f.motor+140,Math.max(0,f.heat()));f.step();assert.equal(f.heat(),-1);
  }
  f.put(B+100,0);f.flt(f.motor+140,Math.max(0,f.heat()));for(let n=0;n<180;n++)f.step();assert.equal(f.heat(),2);
 });
 test(version+' exact native high-address runtime CPU survives and resumes heating when disabled',()=>{
  const f=fixture(patched,{cpu:0x28010000});for(let frame=0;frame<600;frame++){f.flt(f.motor+140,Math.max(0,f.heat()));f.step();assert.equal(f.heat(),-1);}
  f.put(B+100,0);f.flt(f.motor+140,0);f.step(1);assert.ok(Math.abs(f.heat()-.45)<1e-6);f.step(2);assert.equal(f.heat(),2);
 });
 test(version+' opted-in online current engine survives600frames and opt-out restores exact native heat',()=>{
  const f=fixture(patched,{cpu:0x28010000});f.put(0x850078,8);f.put(B+84,1);for(let frame=0;frame<600;frame++){f.flt(f.motor+140,Math.max(0,f.heat()));f.step();assert.equal(f.heat(),-1);}
  f.put(B+84,0);f.flt(f.motor+140,0);f.step(1);assert.ok(Math.abs(f.heat()-.45)<1e-6);f.step(2);assert.equal(f.heat(),2);
  for(const change of [x=>x.put(B+84,0),x=>x.put(B+84,2),x=>x.put(x.rec+4,2),x=>x.put(x.cpu+4,x.motor+512),x=>x.put(B+48,180),x=>x.flt(x.motor+140,2)]){const a=fixture(original),b=fixture(patched);for(const x of [a,b]){x.put(0x850078,8);x.put(B+84,1);change(x);}a.step();b.step();assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));}
 });
 test(version+' OFF, opponent, non-Drag and network match original native CPU and heat behavior byte for byte',()=>{
  for(const alter of [f=>f.put(B+100,0),f=>f.put(f.rec+4,2),f=>f.d.setUint8(0x89e7d8,0),f=>f.put(0x850078,8),f=>f.put(f.race,6),f=>f.put(B+48,180),f=>f.flt(f.motor+140,2)]){
   const a=fixture(original),b=fixture(patched);alter(a);alter(b);a.step();b.step();assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));
  }
 });
}
