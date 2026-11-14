'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const profile=require('../extension/d2fa-profile.js'),AI=require('../extension/ai.js');
const {pinned,parse,CURRENT}=require('../../work-d2fa-profile/tools/native-proof.cjs');
const extension=path.resolve(__dirname,'../extension');

test('production current registration pins exact d2 bytes and preserves unsupported subsystem denials',()=>{
 assert.equal(profile.revision,'d2fa4f4c');assert.equal(profile.hash,CURRENT.hash);assert.equal(profile.size,CURRENT.size);
 for(const key of ['ai','pace','corner','dragAI','nativeDragInputHandoff','ownedNativeNos','nativeDragOverheat','onlineTraffic','onlinePlayers','onlineRaceCars'])assert.equal(profile.capabilities[key],true,key);
 for(const key of ['dyno','fullTuner','travel','nativeRaceCapture','nativeRouteProbe','nativeForwardGeometry','nativeForwardClamp'])assert.equal(profile.capabilities[key],false,key);
});

test('production d2 patch compiles and preserves every unreviewed native body and non-code section',async()=>{
 const raw=pinned(CURRENT),before=Buffer.from(raw),patched=Buffer.from(await AI.patchBytes(raw));
 assert.deepEqual(raw,before);assert(WebAssembly.validate(patched));await WebAssembly.compile(patched);
 const a=parse(raw),b=parse(patched),changed=[];
 for(const[index,body]of a.bodies)if(!body.equals(Buffer.from(b.bodies.get(index))))changed.push(index);
 assert.deepEqual(changed,[2459,3174,4497,4653,7395,8871,17404,19197,19277,21213,21263,22593]);
 assert.equal(a.sections.length,b.sections.length);assert.equal(a.bodies.size,b.bodies.size);
 for(let i=0;i<a.sections.length;i++){assert.equal(a.sections[i].id,b.sections[i].id);if(a.sections[i].id!==10)assert.deepEqual(a.sections[i].bytes,Buffer.from(b.sections[i].bytes));}
});

test('actual manifest loader grants current racing profile only after exact current compilation',async()=>{
 const fallback={},seen=[],context={crypto:crypto.webcrypto,Uint8Array,ArrayBuffer,SharedArrayBuffer,DataView,Atomics,Int32Array,Float32Array,WeakMap,WeakSet,URL,console,performance,atob,location:{origin:'https://nfsu2.xyz'},WebAssembly:{compile:WebAssembly.compile,validate:WebAssembly.validate,compileStreaming:async response=>{seen.push(response);return fallback;}}};
 context.globalThis=context;
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));
 for(const name of manifest.content_scripts[0].js)if(name!=='page.js')vm.runInNewContext(fs.readFileSync(path.join(extension,name),'utf8'),context,{filename:name});
 const ai=context.__NFSU2_AI__;ai.install();const raw=pinned(CURRENT);
 const response=bytes=>({url:'https://nfsu2.xyz/game.wasm?v=d2fa4f4c',clone:()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})});
 const module=await context.WebAssembly.compileStreaming(response(raw));
 assert.equal(ai.getModuleProfile(module).revision,'d2fa4f4c');assert.equal(ai.patchState.phase,'ready');assert.equal(ai.isPatchedModule(module),true);assert.equal(seen.length,0);
 for(const key of ['fullTuner','travel'])assert.equal(ai.getModuleProfile(module).capabilities[key],false,key);
 for(const key of ['nativeForwardGeometry','nativeForwardClamp'])assert.equal(ai.getModuleProfile(module).capabilities[key],true,key);
 const bad=Buffer.from(raw);bad[100]^=1;const original=response(bad);assert.equal(await context.WebAssembly.compileStreaming(original),fallback);assert.equal(seen.at(-1),original);assert.equal(ai.getModuleProfile(fallback),null);assert.equal(ai.patchState.patchCode,'module-hash');
});

test('production d2 size and hash checks reject corruption without substituting another profile',async()=>{
 const raw=pinned(CURRENT),bad=Buffer.from(raw);bad[100]^=1;
 await assert.rejects(AI.patchBytes(bad),/module changed/i);await assert.rejects(AI.patchBytes(raw.subarray(0,raw.length-1)),/module size changed/i);
});
