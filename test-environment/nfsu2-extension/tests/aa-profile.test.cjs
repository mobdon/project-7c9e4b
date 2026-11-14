'use strict';
// Exact isolated candidate entry. Full game modules are compiled, never instantiated.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const AA=require('../extension/aa-profile.js'),CF=require('../extension/cf-profile.js'),AI=require('../extension/ai.js');
const {parse}=require('../../work-current-profile/tools/native-proof.cjs'),{locals}=require('../tools/compose-contact-prefixes.cjs');
const extension=path.resolve(__dirname,'../extension'),pin={revision:'aa2429fb',size:38619724,hash:'a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8'},hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(path.resolve(__dirname,'../../research/compatibility-aa2429fb/game.wasm'));assert.equal(raw.length,pin.size);assert.equal(hash(raw),pin.hash);
let patched;const output=()=>patched??=(async()=>Buffer.from(await AI.patchBytes(raw)))();

test('candidate AA registration pins exactaa2429fb and retains every base capability and denial',()=>{
 assert.deepEqual({revision:AA.revision,size:AA.size,hash:AA.hash},pin);
 const {nativePaceCacheFix,nativePaceTargetConsumers,onlineRivals,onlinePlayerOutrun,...baseCapabilities}=AA.capabilities;assert.deepEqual(baseCapabilities,CF.capabilities);assert.equal(nativePaceCacheFix,true);assert.equal(nativePaceTargetConsumers,true);assert.equal(onlineRivals,true);assert.equal(onlinePlayerOutrun,true);
 for(const key of ['ai','pace','corner','dragAI','nativeDragInputHandoff','ownedNativeNos','nativeDragOverheat','nativeDriftPhysics','nativeDriftRecovery','nativeDriftPace','onlineTraffic','onlinePlayers','onlineRaceCars'])assert.equal(AA.capabilities[key],true,key);
 for(const key of ['dyno','fullTuner','travel','nativeRaceCapture','nativeRouteProbe','nativeForwardGeometry','nativeForwardClamp'])assert.equal(AA.capabilities[key],false,key);
 assert.equal(AA.fullTuner,undefined);assert(Object.isFrozen(AA)&&Object.isFrozen(AA.capabilities)&&Object.isFrozen(AA.ownedNos));
 assert.equal(AA.target,21212-37);assert.equal(AA.pace.target,21268-37);assert.equal(AA.wall.functionIndex,22957);assert.equal(AA.driftRecovery.functionIndex,8870);
 const scripts=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8')).content_scripts[0].js;
 assert(scripts.indexOf('cf-profile.js')<scripts.indexOf('aa-profile.js'));assert(scripts.indexOf('aa-profile.js')<scripts.indexOf('ai.js'));
});

test('candidate AA base output restores native catchup wrapper and compiles with exactly11 changed bodies',async()=>{
 const before=Buffer.from(raw),out=await output();assert.deepEqual(raw,before);assert(WebAssembly.validate(out));
 assert.equal(out.length,38641916);assert.equal(hash(out),'19d259c65c51ca15997ccd719ed27f73b8212988db362088eccd51bd088758a5');
 const originalModule=await WebAssembly.compile(raw),patchedModule=await WebAssembly.compile(out);assert.deepEqual(WebAssembly.Module.imports(patchedModule),WebAssembly.Module.imports(originalModule));assert.deepEqual(WebAssembly.Module.exports(patchedModule),WebAssembly.Module.exports(originalModule));
 const a=parse(raw),b=parse(out),changed=[];for(const[id,body]of a.bodies)if(!body.equals(b.bodies.get(id)))changed.push(id);
 assert.deepEqual(changed,[2459,3174,4497,4653,7395,8870,17403,19196,19276,21212,22957]);assert.deepEqual(b.bodies.get(21268),a.bodies.get(21268));assert.equal(b.bodies.size,a.bodies.size);assert.equal(b.sections.length,a.sections.length);
 for(let i=0;i<a.sections.length;i++){assert.equal(b.sections[i].id,a.sections[i].id);if(a.sections[i].id!==10)assert.deepEqual(b.sections[i].bytes,a.sections[i].bytes);}
});

test('AA keeps current native tails, both contact prehooks and skill getter intact',async()=>{
 const a=parse(raw),b=parse(await output());
 for(const id of [2459,19196,21212,22957]){const native=a.bodies.get(id),tail=native.subarray(locals(native).end),out=b.bodies.get(id);assert.deepEqual(out.subarray(out.length-tail.length),tail,'Exact current native tail f'+id);}
 for(const id of [12864,22523,22996,22911,22913,21769,21783,22879,22880])assert.deepEqual(b.bodies.get(id),a.bodies.get(id),'Unmodified native skill/contact/ABI helper f'+id);
 for(const cfg of AA.ownedNos){const native=a.bodies.get(cfg.index);assert.deepEqual(b.bodies.get(cfg.index),Buffer.concat([Buffer.from(cfg.header),native.subarray(locals(native).end,cfg.offset),Buffer.from(cfg.expression),native.subarray(cfg.offset)]),'Exact NOS splice f'+cfg.index);}
 const cfg=AA.driftRecovery,native=a.bodies.get(cfg.functionIndex),out=b.bodies.get(cfg.functionIndex),header=locals(out).end,split=header+cfg.offset-locals(native).end;
 assert.equal(hash(native),cfg.bodySha256);assert.deepEqual(out.subarray(header,split),native.subarray(locals(native).end,cfg.offset));assert.deepEqual(out.subarray(split+cfg.expression.length),native.subarray(cfg.offset+cfg.needle.length));
});

test('AA exact-size corruption and unsupported size are rejected without selecting another profile',async()=>{
 const bad=Buffer.from(raw);bad[100]^=1;await assert.rejects(AI.patchBytes(bad),/module changed/i);await assert.rejects(AI.patchBytes(raw.subarray(0,raw.length-1)),/module size changed/i);
});

test('actual manifest loader selects AA only after exact compile and preserves original corruption fallback',async()=>{
 const fallback={},seen=[],context={crypto:crypto.webcrypto,Uint8Array,ArrayBuffer,SharedArrayBuffer,DataView,Atomics,Int32Array,Float32Array,WeakMap,WeakSet,URL,console,performance,atob,location:{origin:'https://nfsu2.xyz'},WebAssembly:{compile:WebAssembly.compile,validate:WebAssembly.validate,compileStreaming:async response=>{seen.push(response);return fallback;}}};context.globalThis=context;
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));for(const name of manifest.content_scripts[0].js)if(name!=='page.js')vm.runInNewContext(fs.readFileSync(path.join(extension,name),'utf8'),context,{filename:name});
 const ai=context.__NFSU2_AI__;ai.install();const response=bytes=>({url:'https://nfsu2.xyz/game.wasm?v=aa2429fb',clone:()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})});
 const module=await context.WebAssembly.compileStreaming(response(raw));assert.equal(ai.getModuleProfile(module).revision,pin.revision);assert.equal(ai.isPatchedModule(module),true);assert.equal(ai.patchState.phase,'ready');assert.equal(ai.getNativeEvaluator(module),null);assert.equal(seen.length,0);
 for(const key of ['dyno','fullTuner','travel','nativeRaceCapture'])assert.equal(ai.getModuleProfile(module).capabilities[key],false,key);
 const bad=Buffer.from(raw);bad[100]^=1;const original=response(bad);assert.equal(await context.WebAssembly.compileStreaming(original),fallback);assert.equal(seen.at(-1),original);assert.equal(ai.getModuleProfile(fallback),null);assert.equal(ai.patchState.patchCode,'module-hash');
});
