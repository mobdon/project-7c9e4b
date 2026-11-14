'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),Capture=require('../extension/race-capture.js'),Config=require('../extension/race-capture-config.js'),AI=require('../extension/ai.js'),Profile=require('../extension/next-profile.js');
const {parse}=require('../tools/race-capture-wasm.cjs');
const raw=()=>fs.readFileSync(path.join(ROOT,'../research/compatibility-93af6ccb/game.wasm'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const localEnd=b=>{let at=0;const read=()=>{let n=0,shift=0,x;do{x=b[at++];n|=(x&127)<<shift;shift+=7;}while(x&128);return n;};for(let n=read();n;n--){read();at++;}return at;};
test('full candidate module validates and compiles, only observer target changes from verified v033',async()=>{
 const original=raw();assert.equal(digest(original),Capture.PIN);const base=await AI.patchBytes(original),baseCopy=Uint8Array.from(base),patched=await Capture.patchModule(base,Profile);assert.deepEqual(base,baseCopy);
 assert.equal(WebAssembly.validate(patched),true);await WebAssembly.compile(patched);
 const a=parse(Buffer.from(base)),b=parse(Buffer.from(patched));assert.equal(a.sections.length,b.sections.length);for(let i=0;i<a.sections.length;i++){assert.equal(a.sections[i].id,b.sections[i].id);if(a.sections[i].id!==10)assert.deepEqual(a.sections[i].payload,b.sections[i].payload);}
 const target=Config.functionIndex-a.imtypes.length;assert.equal(a.bodies.length,b.bodies.length);for(let i=0;i<a.bodies.length;i++)if(i!==target)assert.deepEqual(a.bodies[i],b.bodies[i]);
 const old=a.bodies[target],next=b.bodies[target],pre=Buffer.from(Config.pre),post=Buffer.from(Config.post),newHeader=localEnd(pre),preCode=pre.subarray(newHeader,-1),postCode=post.subarray(localEnd(post),-1);
 let cursor=Config.headerBytes,parts=[pre.subarray(0,newHeader)];for(const call of Config.callOffsets){parts.push(old.subarray(cursor,call),preCode,old.subarray(call,call+Config.callBytes.length),postCode);cursor=call+Config.callBytes.length;}parts.push(old.subarray(cursor));assert.deepEqual(next,Buffer.concat(parts));
 const report={originalModuleSha256:digest(original),baselinePatchedModuleSha256:digest(base),candidatePatchedModuleSha256:digest(patched),candidateBytes:patched.length,changedFunctionIndexes:[Config.functionIndex],allOtherFunctionsAndSectionsUnchanged:true,allOriginalTargetInstructionsPreserved:true,webAssemblyValidate:true,webAssemblyCompile:true};fs.mkdirSync(path.join(ROOT,'verification'),{recursive:true});fs.writeFileSync(path.join(ROOT,'verification/race-capture-module-preservation.json'),JSON.stringify(report,null,2)+'\n');
});
test('observer refuses unsupported profile or a changed target body',async()=>{
 const base=await AI.patchBytes(raw());await assert.rejects(()=>Capture.patchModule(base,{hash:'unknown'}),/not verified/);
 const p=parse(Buffer.from(base)),body=p.bodies[Config.functionIndex-p.imtypes.length];body[Config.callOffsets[0]]^=1;const changed=Buffer.from(base);const start=changed.indexOf(p.bodies[Config.functionIndex-p.imtypes.length].subarray(0,200));assert.ok(start>=0);changed[start+Config.callOffsets[0]]^=1;await assert.rejects(()=>Capture.patchModule(changed,Profile),/safe point changed/);
});
function loader(){
 const fallback={},c={location:{origin:'https://nfsu2.xyz'},crypto:globalThis.crypto,Uint8Array,ArrayBuffer,DataView,Atomics,Int32Array,WeakMap,WeakSet,console,URL,WebAssembly:{validate:WebAssembly.validate,compile:WebAssembly.compile,compileStreaming:async()=>fallback}};c.globalThis=c;
 for(const name of ['current-profile.js','latest-profile.js','next-profile.js','race-capture-config.js','race-window-geometry.js','race-capture.js','ai.js'])vm.runInNewContext(fs.readFileSync(ROOT+'/extension/'+name,'utf8'),c);
 const ai=c.__NFSU2_AI__;ai.install();return{c,ai,fallback,run:bytes=>c.WebAssembly.compileStreaming({url:'https://nfsu2.xyz/game.wasm?v=test',clone:()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})})};
}
test('loader establishes exact whole-module identity before granting capture capability',async()=>{
 const f=loader(),original=raw(),mod=await f.run(original);assert.equal(f.ai.getModuleProfile(mod).capabilities.nativeRaceCapture,true);assert.equal(f.ai.patchState.phase,'ready');
 const changed=Buffer.from(original);changed[changed.length-1]^=1;assert.equal(await f.run(changed),f.fallback);assert.equal(f.ai.getModuleProfile(f.fallback),null);assert.equal(f.ai.patchState.patchCode,'module-hash');
});
test('capture adapter failure retains verified v033 and disables only capture',async()=>{
 const f=loader();f.c.__NFSU2_RACE_CAPTURE__.patchModule=async()=>{throw Error('Simulated capture mismatch');};const mod=await f.run(raw());assert.equal(f.ai.getModuleProfile(mod).revision,'93af6ccb');assert.equal(f.ai.getModuleProfile(mod).capabilities.nativeRaceCapture,undefined);assert.equal(f.ai.patchState.phase,'ready');assert.equal(f.ai.patchState.captureUnavailable,true);
});
