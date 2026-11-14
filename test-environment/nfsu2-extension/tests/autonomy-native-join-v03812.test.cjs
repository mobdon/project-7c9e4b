'use strict';
// Complete pinned native mp_act recompiled in isolation. Dependencies are
// explicit stubs: this proves routing, not an online host's acceptance.
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../../work-aa-profile/tools/native-proof.cjs'),H=require('../extension/autonomy-hosted.js');
let compiled;
async function moduleFixture(){
 if(compiled)return compiled;compiled=(async()=>{
  const bytes=fs.readFileSync(require.resolve('../../research/compatibility-943ee537/game.wasm'));assert.equal(P.hash(bytes),H.C.hash);
  const wabt=await require('../../research/compatibility-v011/node_modules/wabt')(),body=P.texts(wabt,bytes,[22831])[22831],calls=[...new Set([...body.matchAll(/\bcall (\d+)/g)].map(m=>+m[1]))],texts=P.texts(wabt,bytes,calls);
  assert.match(body,/local.get 2\s+i32.const -1\s+i32.add\s+br_table 0 \(;@9;\) 2 \(;@7;\) 6 \(;@3;\) 7 \(;@2;\) 1 \(;@8;\)/);
  const shape=id=>texts[id].split('\n')[0].replace(/^\s*\(func \(;\d+;\) \(type \d+\)/,'');
  const imports=calls.map(id=>`(import "env" "f${id}" (func $f${id}${shape(id)}))`).join('\n'),isolated=body.replace(/\(func \(;22831;\) \(type 100\)/,'(func (export "act")').replace(/\bcall (\d+)/g,(_m,n)=>'call $f'+n);
  const m=wabt.parseWat('pinned-native-mp-act.wat',`(module (import "env" "memory" (memory 11000 11000 shared)) ${imports} (global (mut i32) (i32.const 15007744)) ${isolated})`,{threads:true,simd:true});m.resolveNames();m.validate({threads:true,simd:true});const raw=Buffer.from(m.toBinary({}).buffer);m.destroy();
  assert(WebAssembly.validate(raw));const roundtrip=wabt.readWasm(Uint8Array.from(raw),{readDebugNames:false,threads:true,simd:true}),text=roundtrip.toText({foldExprs:false,inlineExport:false});roundtrip.destroy();const start=text.indexOf('  (func (;'+calls.length+';)'),end=text.indexOf('\n  (global',start),recovered=text.slice(start,end);
  const normalized=s=>s.trim().replace(/\(func \(;\d+;\) \(type \d+\)/,'(func (;N;) (type N)').replace(/\bcall \d+/g,'call N');assert.equal(normalized(recovered),normalized(body),'entire native body, operands and control flow retained except declared call/index relocation');
  return{module:await WebAssembly.compile(raw),calls,originalBodySha256:P.hash(P.parse(bytes).bodies.get(22831))};
 })();return compiled;
}
async function fixture(){
 const built=await moduleFixture(),memory=new WebAssembly.Memory({initial:11000,maximum:11000,shared:true}),v=new DataView(memory.buffer),log=[],table=0x250000,spot=0x260000;
 const u=(p,n)=>v.setUint32(p,n,true),commit=(p,n)=>{for(let q=Math.floor(p/16384);q*16384<p+n;q++){const at=695752272+(q>>>3);v.setUint8(at,v.getUint8(at)|(1<<(q&7)));}};
 u(0x8383e0,table);u(0x8383e4,1);commit(0x8383e0,8);commit(table,136);u(table+8,101);v.setUint8(table+15,0);v.setUint16(table+24,4011,true);v.setUint8(table+126,1);u(701194616,1);v.setUint8(spot+24,2);
 const imports={memory};for(const id of built.calls)imports['f'+id]=(...args)=>{log.push({id,args});if(id===21196)return 1;if(id===22748)return spot;if(id===22832)return 0;if(id===22856)return 0;if(id===22909){v.setFloat32(args[1],100,true);v.setFloat32(args[2],0,true);return 1;}if(id===22840){const p=args[1];log.at(-1).tuple={lobby:v.getUint32(p,true),host:v.getUint32(p+4,true),race:v.getUint32(p+8,true)};return 1;}if(id===22841)return 1;if(id===22848)return 0;return 0;};
 const{exports}=await WebAssembly.instantiate(built.module,{env:imports});return{v,u,log,table,act:(action=4,host=9,lobby=77,event=101,inRoam=1)=>exports.act(1n,inRoam,action,host,lobby,event)};
}
test('complete current native action4 routes exact JOIN tuple and never runs the hosting branch',async()=>{const f=await fixture();f.act();assert.deepEqual(f.log.filter(x=>x.id===22840).map(x=>x.tuple),[{lobby:77,host:9,race:f.table}]);assert.equal(f.log.some(x=>x.id===22841),false);f.log.length=0;f.act(5);assert.equal(f.log.some(x=>x.id===22841),true,'positive control observes native NEW5 hosting branch');assert.equal(f.log.some(x=>x.id===22840),false);});
test('native invite JOIN may proceed with no advert; it still never creates a host lobby',async()=>{const f=await fixture();f.u(H.C.nseen,0);f.act();assert.equal(f.log.filter(x=>x.id===22840).length,1);assert.equal(f.log.some(x=>x.id===22841),false);});
test('native typed JOIN rejects current hosting, self, missing identity, nonroam and absent canonical event',async()=>{for(const alter of[f=>f.u(H.C.mp,1),f=>f.u(701194616,9),f=>f.u(f.table+8,999)]){const f=await fixture();alter(f);f.act();assert.equal(f.log.some(x=>x.id===22840||x.id===22841),false);}for(const args of[[4,0,77,101],[4,9,0,101],[4,9,77,101,0]]){const f=await fixture();f.act(...args);assert.equal(f.log.some(x=>x.id===22840||x.id===22841),false);}});
module.exports={moduleFixture};
