'use strict';
// Circuit current943 controlled fixture, adapted from the existing authored shortcut scaffold.
// Offline proof only. Exact original bodies are read into memory, never written,
// packaged, or instantiated as a game. Every unspecified callee traps.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {parse}=require('../../research/guarded-hosted-join-fixture/adapter.cjs');
const ROOT=path.resolve(__dirname,'../..'),PIN='c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const leb=n=>{const a=[];do{let x=n&127;n>>>=7;a.push(x|(n?128:0));}while(n);return Buffer.from(a)};
const sec=(n,p)=>Buffer.concat([Buffer.from([n]),leb(p.length),p]);
const values={127:'i32',126:'i64',125:'f32',124:'f64',123:'v128',112:'funcref',111:'externref'};
const signature=t=>`${t.args.length?'(param '+t.args.map(x=>values[x]).join(' ')+')':''} ${t.res.length?'(result '+t.res.map(x=>values[x]).join(' ')+')':''}`;
let ready;
async function source(){if(ready)return ready;ready=(async()=>{const bytes=fs.readFileSync(path.join(ROOT,'research/compatibility-943ee537/game.wasm'));assert.equal(sha(bytes),PIN);const orig=parse(bytes);assert.equal(orig.imtypes.length,37);assert.equal(orig.bodies.length,24204);assert(WebAssembly.validate(bytes));new WebAssembly.Module(bytes); // COMPILE ONLY; no original instance.
const wabt=await require('../../build-deps/node_modules/wabt')();return{orig,wabt,allTypes:[...orig.imtypes,...orig.ft]};})();return ready;}
async function fixture(real,stubs=[],extraExports={},options={}){const {orig,wabt,allTypes}=await source();const realSet=new Set(real),stubSet=new Set(stubs);assert(!realSet.has(0));
const native=options.sourceBytes?parse(options.sourceBytes):orig;
const types=orig.types.map((t,i)=>`(type $t${i} (func ${signature(t)}))`).join('\n');
// Index 0 is an authored recorder callback. All other original indices remain
// fixed. Unlisted functions have unreachable bodies, no game imports/data/start.
const funcs=allTypes.slice(1).map((t,j)=>{const i=j+1,s=orig.types[t];let body='unreachable';if(stubSet.has(i)){assert.deepEqual(s.res,[]);assert(s.args.length===1||s.args.length===2);assert(s.args.every(x=>x===127));body=`(call 0 (i32.const ${i}) (local.get 0) ${s.args.length===2?'(local.get 1)':'(i32.const 0)'})`; }return `(func $f${i} (type $t${t}) ${body})`;}).join('\n');
const wat=`(module ${types} (import "fixture" "stub" (func (param i32 i32 i32))) (import "env" "memory" (memory 256 65536 shared)) (import "env" "sp" (global (mut i32))) (table 1 funcref) ${funcs} ${Object.entries({...Object.fromEntries(real.map(i=>['f'+i,i])),...extraExports}).map(([n,i])=>`(export "${n}" (func ${i}))`).join('\n')})`;
const w=wabt.parseWat('authored-offline-scaffold.wat',wat,{threads:true,simd:true,bulk_memory:true});w.validate({threads:true,simd:true,bulk_memory:true});const p=parse(Buffer.from(w.toBinary({}).buffer));for(const i of real){p.bodies[i-1]=native.bodies[i-orig.imtypes.length];assert(p.bodies[i-1]);}
const code=Buffer.concat([leb(p.bodies.length),...p.bodies.map(b=>Buffer.concat([leb(b.length),b]))]);const bytes=Buffer.concat([Buffer.from([0,97,115,109,1,0,0,0]),...p.sections.map(s=>sec(s.id,s.id===10?code:s.payload))]);
assert(WebAssembly.validate(bytes));const module=new WebAssembly.Module(bytes);const parsed=parse(bytes);for(const i of real)assert.deepEqual(parsed.bodies[i-1],native.bodies[i-orig.imtypes.length]);
return{module,bytes,real:[...real],stubs:[...stubs],hashes:Object.fromEntries(real.map(i=>[i,sha(native.bodies[i-orig.imtypes.length])])),sourceSha256:options.sourceBytes?sha(options.sourceBytes):PIN};}
const A={cpu:0x100000,stack:0x180000,driver:0x200000,car:0x210000,targetCar:0x220000,context:0x230000,handle:0x240000,desc:0x250000,road:0x260000,links:0x270000,target:0x280000,scratch:0x290000,vtable:0x2a0000};
function instance(built,handlers={}){const memory=new WebAssembly.Memory({initial:11000,maximum:65536,shared:true}),sp=new WebAssembly.Global({value:'i32',mutable:true},712000000);const d=new DataView(memory.buffer),calls=[];const f={memory,sp,d,calls,...A};
f.get=p=>d.getUint32(p,true);f.put=(p,v)=>d.setUint32(p,v>>>0,true);f.f32=(p,v)=>d.setFloat32(p,v,true);f.u8=(p,v)=>d.setUint8(p,v);f.u16=(p,v)=>d.setUint16(p,v,true);f.zero=(p,n)=>new Uint8Array(memory.buffer,p,n).fill(0);f.bytes=(p,n)=>Buffer.from(new Uint8Array(memory.buffer,p,n));f.reg=(n,v)=>v===undefined?f.get(A.cpu+n*4):f.put(A.cpu+n*4,v);
f.ret=(cpu,pop=0,eax)=>{const s=f.get(cpu+16);f.put(cpu+32,f.get(s));f.put(cpu+16,s+4+pop);if(eax!==undefined)f.put(cpu,eax);};
f.fpu=(cpu,value)=>{const top=(f.get(cpu+136)-1)&7;f.put(cpu+136,top);d.setFloat64(cpu+72+top*8,value,true);};
f.call=(name,{ecx=0,args=[],eax=0}={})=>{f.zero(A.cpu,256);f.reg(0,eax);f.reg(1,ecx);f.reg(4,A.stack);f.u16(A.cpu+140,0x37f);f.put(A.stack,0x12345678);args.forEach((v,i)=>f.put(A.stack+4+i*4,v));f.exports[name](A.cpu);return f.reg(0);};
f.exports=new WebAssembly.Instance(built.module,{env:{memory,sp},fixture:{stub:(id,cpu,aux)=>{calls.push({id,cpu,aux,esp:f.get(cpu+16),ecx:f.get(cpu+4)});if(!handlers[id])throw new Error('Unexpected stub '+id);handlers[id](f,cpu,aux);}}}).exports;return f;}
module.exports={source,fixture,instance,A,PIN,sha};
