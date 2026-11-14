'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {create}=require('../extension/diagnostics.js');
function loader(){
 const fallback={},seen=[];
 const context={location:{origin:'https://nfsu2.xyz'},crypto:globalThis.crypto,Uint8Array,ArrayBuffer,DataView,Atomics,Int32Array,WeakMap,WeakSet,console,URL,WebAssembly:{compile:WebAssembly.compile,compileStreaming:async response=>(seen.push(response),fallback)}};
 context.globalThis=context;
 for(const name of ['current-profile.js','ai.js'])vm.runInNewContext(fs.readFileSync(__dirname+'/../extension/'+name,'utf8'),context);
 const ai=context.__NFSU2_AI__;ai.install();
 return {ai,context,fallback,seen,run:bytes=>context.WebAssembly.compileStreaming({url:'https://nfsu2.xyz/game.wasm?v=fixture',clone:()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})})};
}
test('unsupported binary records actual size, clears old success and does not gain a module profile',async()=>{
 const f=loader(),state=f.ai.patchState;
 Object.assign(state,{revision:'2f0ddd3b',candidateRevision:'2f0ddd3b',moduleHash:'a'.repeat(64),patchCode:'module-hash'});
 assert.equal(await f.run(Buffer.alloc(38170601)),f.fallback);
 assert.equal(state.phase,'unavailable');assert.equal(state.patchCode,'module-size');assert.equal(state.moduleBytes,38170601);
 assert.equal(state.revision,undefined);assert.equal(state.candidateRevision,undefined);assert.equal(state.moduleHash,undefined);
 assert.equal(f.ai.getModuleProfile(f.fallback),null);assert.equal(f.seen.length,1);
});
test('same-size changed binary records observed hash without accepting it',async()=>{
 const f=loader(),profile=require('../extension/current-profile.js'),bytes=Buffer.alloc(profile.size);
 assert.equal(await f.run(bytes),f.fallback);
 assert.equal(f.ai.patchState.patchCode,'module-hash');assert.equal(f.ai.patchState.candidateRevision,profile.revision);
 assert.equal(f.ai.patchState.moduleBytes,profile.size);assert.match(f.ai.patchState.moduleHash,/^[a-f0-9]{64}$/);
 assert.equal(f.ai.getModuleProfile(f.fallback),null);
});
test('diagnostics keep only allowlisted mismatch codes and build facts, including after reload',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(_,s)=>saved=s};const logger=create({storage});
 logger.record('patch-state',{phase:'preparing',moduleBytes:38170601,reportedRevision:'78e2bb69',candidateRevision:'2f0ddd3b',moduleHash:'a'.repeat(64),patchCode:'module-size',raw:'SECRET',error:'SECRET'});
 const data=JSON.parse(logger.exportText()).events.at(-1).data;
 assert.equal(data.moduleBytes,38170601);assert.equal(data.reportedRevision,'78e2bb69');assert.equal(data.candidateRevision,'2f0ddd3b');assert.equal(data.moduleHash,'a'.repeat(64));assert.equal(data.patchCode,'module-size');assert.equal(data.phase,'preparing');
 assert.doesNotMatch(create({storage}).exportText(),/SECRET/);
 logger.record('patch-state',{moduleBytes:-1,reportedRevision:'SECRET',candidateRevision:'SECRET',moduleHash:'SECRET',patchCode:'SECRET'});
 assert.deepEqual(JSON.parse(logger.exportText()).events.at(-1).data,{});
});
// Reuse the production page fixture but suppress its unrelated test registrations.
const coreFile=require.resolve('./core.test.cjs'),baseRequire=createRequire(coreFile);
let source=fs.readFileSync(coreFile,'utf8');
source=source.replace('context.__NFSU2_AI__??={install(){}};',"context.__NFSU2_AI__??={install(){}};context.__NFSU2_AI__.patchState=compatibility.patchState;");
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,URL,setImmediate};
vm.runInNewContext(source+'\nthis.makeStatusFixture=pageFixture;',context,{filename:coreFile});
test('AI and dyno explain unsupported build rather than requesting another screen or online opt-in',async()=>{
 const patchState={phase:'unavailable',patchCode:'module-size',moduleBytes:38170601};
 const f=await context.makeStatusFixture(null,true,true,{revision:'78e2bb69',verified:false,patchState});
 f.change('ai',true);f.change('dyno-enable',true);f.run();
 for(const id of ['ai-state','dyno-state']){assert.match(f.nodes[id].textContent,/unavailable/);assert.match(f.nodes[id].textContent,/78e2bb69/);assert.match(f.nodes[id].textContent,/38170601/);assert.match(f.nodes[id].textContent,/compatible Driving Tools update/);}
 assert.equal(f.nodes['ai-state'].dataset.unavailable,'true');assert.equal(f.nodes['ai-state'].title,f.nodes['ai-state'].textContent);
 assert.equal(f.nodes['dyno-find'].disabled,true);assert.equal(f.nodes['dyno-apply'].disabled,true);assert.equal(f.nodes['dyno-restore'].disabled,true);
 assert.doesNotMatch(f.nodes['dyno-state'].textContent,/Open the solo Performance Tuning/);
 f.put(0x850078,8);f.run();assert.doesNotMatch(f.nodes['ai-state'].textContent,/enable Session mode/);
 const before=Buffer.from(f.memory.buffer);f.run(5);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 assert.match(f.stylesheets()[0].css,/#ai-state\[data-unavailable="true"\]\{white-space:normal;overflow:visible/);
});
test('verified module is not hidden by another failed load and unavailability does not stick',async()=>{
 const patchState={phase:'unavailable',patchCode:'module-size',moduleBytes:38170601};
 const f=await context.makeStatusFixture(null,true,true,{patchState});f.change('ai',true);f.run();
 assert.equal(f.nodes['ai-state'].dataset.unavailable,'false');assert.doesNotMatch(f.nodes['ai-state'].textContent,/unavailable/);
 assert.doesNotMatch(f.nodes['dyno-state'].textContent,/unavailable/);
});
