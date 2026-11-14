'use strict';
// Execute byte-identical current native window init/commit bodies in private
// memory. External getenv, heap-break and logging callees are controlled stubs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const Proof=require('../../work-aa-profile/tools/native-proof.cjs');
const PIN=require('../../work-paced-v03811/native/profile-config.cjs').PROFILES.find(x=>x.revision==='943ee537').native;
const WLO=695785040,WHI=WLO+4,DONE=WLO+8,BITS=695752272,LO=0x50000000,HI=0x7ffe0000;
const leb=n=>{const a=[];do{let x=n&127;n>>>=7;if(n)x|=128;a.push(x);}while(n);return Buffer.from(a);};
const str=s=>Buffer.concat([leb(Buffer.byteLength(s)),Buffer.from(s)]);
const section=(id,b)=>Buffer.concat([Buffer.from([id]),leb(b.length),b]);
let cached;
async function prepare(){
 if(cached)return cached;
 const raw=Proof.pinned(PIN),parsed=Proof.parse(raw),wabt=await require('../../build-deps/node_modules/wabt')();
 const src=`(module (memory 2)
 (func (param i32)(result i32) (if (result i32) (i32.eq (local.get 0) (i32.const 671309483)) (then (i32.load (i32.const 65568))) (else (i32.const 0))))
 (func (result i64) (i64.load (i32.const 65576)))
 (func (param i32 i32 i32)(result i32) (i32.const 0))
 (func (param i32 i32 i32 i32)(result i32) (i32.const 0)))`;
 const stub=wabt.parseWat('controlled-window-dependencies.wat',src);stub.resolveNames();stub.validate();const sb=Buffer.from(stub.toBinary({}).buffer);stub.destroy();
 const stubs=[...Proof.parse(sb).bodies.values()],replacements=new Map([23974,23674,24127,24137].map((id,i)=>[id,stubs[i]]));
 const parts=[raw.subarray(0,8)];
 for(const s of parsed.sections){
  if(s.id>=1&&s.id<=6&&s.id!==2)parts.push(s.bytes);
  if(s.id===2){
   const old=Buffer.concat([str('env'),str('memory'),Buffer.from([2,3]),leb(11264),leb(65536)]),next=Buffer.concat([str('env'),str('memory'),Buffer.from([2,3]),leb(256),leb(65536)]),at=s.data.indexOf(old);
   assert(at>=0);assert.equal(s.data.indexOf(old,at+1),-1);parts.push(section(2,Buffer.concat([s.data.subarray(0,at),next,s.data.subarray(at+old.length)])));
  }
  if(s.id===7)parts.push(section(7,Buffer.concat([leb(2),...[[22153,'init'],[22154,'commit']].map(([id,name])=>Buffer.concat([str(name),Buffer.from([0]),leb(id)]))])));
  if(s.id===9)parts.push(s.bytes);
  if(s.id===10){const bodies=[leb(parsed.bodies.size)];for(const[id,original]of parsed.bodies){const body=[22153,22154].includes(id)?original:replacements.get(id)||Buffer.from([0,0,11]);bodies.push(leb(body.length),body);}parts.push(section(10,Buffer.concat(bodies)));}
 }
 const bytes=Buffer.concat(parts),actual=Proof.parse(bytes);assert(WebAssembly.validate(bytes));
 for(const id of[22153,22154])assert.deepEqual(actual.bodies.get(id),parsed.bodies.get(id));
 cached={module:new WebAssembly.Module(bytes),bodyHashes:Object.fromEntries([22153,22154].map(id=>[id,Proof.hash(parsed.bodies.get(id))])),moduleHash:PIN.hash,controlledCallees:[23974,23674,24127,24137]};return cached;
}
function attach(prepared,memory,{enabled=true,heapBreak=700000000n}={}){
 const view=new DataView(memory.buffer),imports={env:{memory}};
 for(const i of WebAssembly.Module.imports(prepared.module))if(i.kind==='function')(imports[i.module]??={})[i.name]=()=>{throw Error('Unexpected host call: '+i.name);};
 view.setUint8(0x10000,49);view.setUint32(65568,enabled?0x10000:0,true);view.setBigUint64(65576,heapBreak,true);
 return{memory,view,bytes:new Uint8Array(memory.buffer),exports:new WebAssembly.Instance(prepared.module,imports).exports};
}
const instance=(prepared,pages,options)=>attach(prepared,new WebAssembly.Memory({initial:pages,maximum:65536,shared:true}),options);
module.exports={prepare,attach,instance,PIN,WLO,WHI,DONE,BITS,LO,HI};
