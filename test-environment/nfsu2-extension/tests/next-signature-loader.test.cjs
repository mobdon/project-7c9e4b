'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function loader({scanError=false}={}){
 const fallback={},responses=[];
 const context={location:{origin:'https://nfsu2.xyz'},crypto:globalThis.crypto,Uint8Array,ArrayBuffer,DataView,Atomics,Int32Array,WeakMap,WeakSet,console,URL,WebAssembly:{compile:WebAssembly.compile,compileStreaming:async response=>(responses.push(response),fallback)}};
 context.globalThis=context;
 for(const name of ['current-profile.js','next-profile.js','signatures.js','signature-profile.js','signature-profile-next.js','ai.js'])vm.runInNewContext(fs.readFileSync(__dirname+'/../extension/'+name,'utf8'),context);
 if(scanError)context.__NFSU2_SIGNATURES__={scanAll:async()=>{throw Error('Simulated diagnostic failure')}};
 const ai=context.__NFSU2_AI__;ai.install();
 return {ai,context,fallback,responses,run:bytes=>context.WebAssembly.compileStreaming({url:'https://nfsu2.xyz/game.wasm?v=test',clone:()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})})};
}
const next=()=>fs.readFileSync(__dirname+'/../research/compatibility-93af6ccb/game.wasm');
test('full next loader scans read-only and activates only independently exact-pinned module',async()=>{
 const f=loader(),raw=next(),before=Buffer.from(raw),module=await f.run(raw),s=f.ai.patchState;
 assert.equal(f.ai.getModuleProfile(module).revision,'93af6ccb');assert.equal(s.phase,'ready');assert.equal(s.signatureReference,'93af6ccb');assert.equal(s.signatureExact,true);assert.equal(s.signatureUnique,34);assert.equal(s.signatureMissing,0);assert.equal(s.signatureAmbiguous,0);assert.equal(s.moduleHash,require('../extension/next-profile.js').hash);assert.deepEqual(raw,before);assert.equal(f.responses.length,0);
});
test('34 unique function matches cannot permit an unknown module with valid extra custom section',async()=>{
 const f=loader(),raw=Buffer.concat([next(),Buffer.from([0,3,1,120,0])]),before=Buffer.from(raw);assert(WebAssembly.validate(raw));
 assert.equal(await f.run(raw),f.fallback);const s=f.ai.patchState;
 assert.equal(s.phase,'unavailable');assert.equal(s.patchCode,'module-size');assert.equal(s.signatureUnique,34);assert.equal(s.signatureTotal,34);assert.equal(s.signatureExact,false);assert.match(s.moduleHash,/^[a-f0-9]{64}$/);assert.equal(f.ai.getModuleProfile(f.fallback),null);assert.deepEqual(raw,before);assert.equal(f.responses.length,1);
});
test('diagnostic scanner failure neither authorizes unknown data nor disables a known exact profile',async()=>{
 const f=loader({scanError:true});const module=await f.run(next());assert.equal(f.ai.getModuleProfile(module).revision,'93af6ccb');assert.equal(f.ai.patchState.signatureFailed,true);assert.equal(f.ai.patchState.signatureUnique,undefined);
 assert.equal(await f.run(Buffer.alloc(64)),f.fallback);assert.equal(f.ai.patchState.phase,'unavailable');assert.equal(f.ai.patchState.signatureFailed,true);assert.equal(f.ai.patchState.revision,undefined);assert.equal(f.ai.getModuleProfile(f.fallback),null);
});
test('signature diagnostic fields are bounded and no profile names/code or arbitrary strings are saved',()=>{
 const {create}=require('../extension/diagnostics.js'),l=create();l.record('patch-state',{signatureReference:'93af6ccb',signatureTotal:34,signatureUnique:33,signatureMissing:1,signatureAmbiguous:0,signatureExact:false,signatureFailed:false,anchors:[{name:'SECRET'}],signatureDetails:'SECRET'});
 const data=JSON.parse(l.exportText()).events.at(-1).data;assert.equal(data.signatureReference,'93af6ccb');assert.equal(data.signatureUnique,33);assert.equal(data.signatureExact,false);assert.doesNotMatch(l.exportText(),/SECRET/);
 l.record('patch-state',{signatureReference:'SECRET',signatureTotal:999,signatureUnique:-1,signatureMissing:NaN,signatureExact:'true'});assert.deepEqual(JSON.parse(l.exportText()).events.at(-1).data,{});
});
for(const heldKnown of [true,false])test(`concurrent module diagnostics do not mix loads when older ${heldKnown?'known':'unknown'} load completes last`,async()=>{
 const f=loader(),scanner=f.context.__NFSU2_SIGNATURES__;let release,entered;
 const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r);
 f.context.__NFSU2_SIGNATURES__={...scanner,scanAll:async(bytes,profiles)=>{if((bytes.byteLength===38205596)===heldKnown){entered();await gate;}return scanner.scanAll(bytes,profiles)}};
 const older=f.run(heldKnown?next():Buffer.alloc(64));await seen;
 const newer=await f.run(heldKnown?Buffer.alloc(64):next());const expected=JSON.stringify(f.ai.patchState);
 release();const oldModule=await older;assert.equal(JSON.stringify(f.ai.patchState),expected,'older completion must not overwrite any newer-load diagnostic field');
 if(heldKnown){assert.equal(f.ai.patchState.phase,'unavailable');assert.equal(f.ai.patchState.moduleBytes,64);assert.equal(f.ai.patchState.patchCode,'module-size');assert.equal(f.ai.patchState.revision,undefined);assert.equal(f.ai.getModuleProfile(newer),null);assert.equal(f.ai.getModuleProfile(oldModule).revision,'93af6ccb');}
 else{assert.equal(f.ai.patchState.phase,'ready');assert.equal(f.ai.patchState.moduleBytes,38205596);assert.equal(f.ai.patchState.patchCode,undefined);assert.equal(f.ai.patchState.revision,'93af6ccb');assert.equal(f.ai.getModuleProfile(newer).revision,'93af6ccb');assert.equal(f.ai.getModuleProfile(oldModule),null);}
});
