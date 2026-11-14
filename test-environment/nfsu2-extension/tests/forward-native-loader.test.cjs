'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const extension=path.resolve(__dirname,'../extension'),workspace=path.resolve(__dirname,'../..');
const Config=require('../extension/forward-native-config.js'),Patcher=require('../extension/forward-native-patcher.js');
const {parse}=require('../../work-current-profile/tools/native-proof.cjs');
const raw=()=>fs.readFileSync(path.join(workspace,'research/game-3bdd9959.wasm'));
function loader({rejectForwardCompile=false}={}){
 const fallback={},compiled=[],c={location:{origin:'https://nfsu2.xyz'},crypto:crypto.webcrypto,Uint8Array,ArrayBuffer,DataView,Atomics,Int32Array,WeakMap,WeakSet,console,URL,atob,WebAssembly:{validate:WebAssembly.validate,compile:async bytes=>{
  const copy=Buffer.from(bytes);compiled.push(copy);const f=Patcher.parse(copy).sections.find(s=>s.id===3);if(rejectForwardCompile&&Patcher.read(f.data).value===Config.definedFunctions+Config.helpers.length)throw new WebAssembly.CompileError('Simulated optional forward compile failure');return WebAssembly.compile(bytes);
 },compileStreaming:async()=>fallback}};c.globalThis=c;
 for(const file of ['current-profile.js','latest-profile.js','next-profile.js','modern-profile.js','race-capture-config.js','race-window-geometry.js','race-capture.js','forward-native-config.js','forward-native-patcher.js','ai.js'])vm.runInNewContext(fs.readFileSync(path.join(extension,file),'utf8'),c,{filename:file});
 const ai=c.__NFSU2_AI__;ai.install();return{c,ai,fallback,compiled,run:bytes=>c.WebAssembly.compileStreaming({url:'https://nfsu2.xyz/game.wasm?v=test',clone:()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})})};
}
test('current loader grants bothforward capabilities onlyafter verified combinedmodule compiles',async()=>{
 const f=loader(),input=raw(),before=Buffer.from(input),module=await f.run(input),profile=f.ai.getModuleProfile(module);assert.deepEqual(input,before);assert.equal(profile.revision,'3bdd9959');assert.equal(profile.capabilities.nativeForwardGeometry,true);assert.equal(profile.capabilities.nativeForwardClamp,true);assert.equal(f.ai.patchState.forwardUnavailable,undefined);assert.equal(f.ai.patchState.phase,'ready');
 const base=Buffer.from(await f.ai.patchBytes(input)),expected=Buffer.from(await Patcher.patchModule(base,{verifiedOriginalHash:Config.moduleHash}));assert.deepEqual(f.compiled.at(-1),expected);
 const a=parse(base),b=parse(expected),changed=[];for(const[id,body]of a.bodies)if(!body.equals(b.bodies.get(id)))changed.push(id);assert.deepEqual(changed,[1298,6140,13186]);assert.equal(b.bodies.size,a.bodies.size+Config.helpers.length);
 for(const id of [2,4,7,8,9,11,12])assert.deepEqual(a.sections.find(s=>s.id===id)?.bytes,b.sections.find(s=>s.id===id)?.bytes,'unchanged section'+id);
 const originalModule=await WebAssembly.compile(base);assert.deepEqual(WebAssembly.Module.imports(module),WebAssembly.Module.imports(originalModule));assert.deepEqual(WebAssembly.Module.exports(module),WebAssembly.Module.exports(originalModule));
});
test('forward adapter failure retains verified baseAI and bothnew capabilities stayfalse',async()=>{
 const f=loader();f.c.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule=async bytes=>{bytes[0]=255;throw Error('Simulated optional adapter mismatch');};const input=raw(),module=await f.run(input),p=f.ai.getModuleProfile(module);
 assert.equal(p.revision,'3bdd9959');assert.equal(p.capabilities.nativeForwardGeometry,false);assert.equal(p.capabilities.nativeForwardClamp,false);assert.equal(f.ai.patchState.phase,'ready');assert.equal(f.ai.patchState.forwardUnavailable,true);assert.match(f.ai.patchState.forwardReason,/adapter mismatch/);assert.deepEqual(f.compiled.at(-1),Buffer.from(await f.ai.patchBytes(input)));
});
test('optional combined compile failure fallsbackto verified AI module beforegranting capabilities',async()=>{
 const f=loader({rejectForwardCompile:true}),input=raw(),module=await f.run(input),p=f.ai.getModuleProfile(module);assert.equal(p.capabilities.nativeForwardGeometry,false);assert.equal(p.capabilities.nativeForwardClamp,false);assert.equal(f.ai.patchState.forwardUnavailable,true);assert.match(f.ai.patchState.forwardReason,/compile failure/);assert.equal(f.compiled.length,2);assert.deepEqual(f.compiled.at(-1),Buffer.from(await f.ai.patchBytes(input)));
});
test('unknown originalmodule cannot reach forwardpatcher or gainmodule ownership',async()=>{
 const f=loader();let calls=0;f.c.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule=async()=>{calls++;throw Error('must not reach');};const input=raw();input[input.length-1]^=1;assert.equal(await f.run(input),f.fallback);assert.equal(calls,0);assert.equal(f.ai.getModuleProfile(f.fallback),null);assert.equal(f.ai.patchState.patchCode,'module-hash');
});
test('the otherfourexactbuilds retain their existingmodule bytes and never invoke forward adapter',async()=>{
 for(const[revision,file]of [['6f4f1e4e','research/legacy/game.wasm'],['2f0ddd3b','research/compatibility-v011/game.wasm'],['78e2bb69','research/compatibility-78e2bb69/game.wasm'],['93af6ccb','research/compatibility-93af6ccb/game.wasm']]){
  const f=loader();let calls=0;f.c.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule=async()=>{calls++;throw Error('must not reach');};const bytes=fs.readFileSync(path.join(workspace,file)),module=await f.run(bytes);assert.equal(f.ai.getModuleProfile(module).revision,revision);assert.notEqual(f.ai.getModuleProfile(module).capabilities.nativeForwardGeometry,true);assert.notEqual(f.ai.getModuleProfile(module).capabilities.nativeForwardClamp,true);assert.equal(calls,0);
  let expected=await f.ai.patchBytes(bytes);if(revision==='93af6ccb')expected=await f.c.__NFSU2_RACE_CAPTURE__.patchModule(expected,f.c.__NFSU2_NEXT_PROFILE__);assert.deepEqual(f.compiled.at(-1),Buffer.from(expected));
 }
});
