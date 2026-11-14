'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const coreFile=require.resolve('./core.test.cjs'),baseRequire=createRequire(coreFile);
let source=fs.readFileSync(coreFile,'utf8');
function replace(from,to){assert.equal(source.split(from).length-1,1,from.slice(0,90));source=source.replace(from,to);}
replace('class Worker {constructor(){this.handlers={};}postMessage(){}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}emit(data){for(const f of this.handlers.message||[])f({data});}}',
 'class Worker {constructor(){this.handlers={};this.sent=[];}postMessage(m,...rest){this.sent.push({message:m,rest});}terminate(){}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}emit(data){for(const f of this.handlers.message||[])f({data});}}');
replace('  context.window=context;context.top=context;',`
  const bootLog={installed:0,compiled:0,fetches:[],sourceProfile:null,prepared:null,metadataReads:0,readMetadata:null};
  if(compatibility.explicitBoot){
    const bytes=Uint8Array.from([0,97,115,109,1,0,0,0]);
    const expected={...verifiedProfile,size:8,hash:'a'.repeat(64),sourceInterface:{imports:[],exports:[]}};
    if(compatibility.variant==='no-interface')delete expected.sourceInterface;
    if(compatibility.variant==='wrong-interface')expected.sourceInterface.exports=[{name:'wrong',kind:'function'}];
    bootLog.sourceProfile=expected;bootLog.prepared=new WebAssembly.Module(bytes);
    context.__NFSU2_AI__.install=()=>{bootLog.installed++;throw Error('Streaming hook must not run');};
    context.__NFSU2_AI__.getSourceProfile=info=>compatibility.variant==='unknown'||info.rev!==revision?null:expected;
    context.__NFSU2_AI__.compileLocal=async()=>{
      bootLog.compiled++;if(compatibility.variant==='compile-error')throw Error('Preparation failed');
      return bootLog.prepared;
    };
    context.__NFSU2_AI__.getModuleProfile=module=>module===bootLog.prepared&&compatibility.variant!=='unverified'?expected:null;
    context.__NFSU2_WORKER_MODULE_LOADER__=compatibility.variant==='missing-helper'?null:require('../extension/worker-module-loader.js');
    context.fetch=async(url,options)=>{
      bootLog.fetches.push({url,options});
      if(url==='/game.json'){
        const read=++bootLog.metadataReads;
        if(bootLog.readMetadata)return bootLog.readMetadata(read);
        if(compatibility.variant==='late-initial-metadata'&&read===1)return new Promise(resolve=>bootLog.releaseInitialMetadata=()=>resolve({ok:true,json:async()=>({rev:'unknown',size:8,game:'ug2'})}));
        return {ok:true,json:async()=>({rev:revision,size:8,game:'ug2',module:compatibility.variant==='no-module-token'?'':'fixture module token'})};
      }
      return {ok:compatibility.variant!=='fetch-error',arrayBuffer:async()=>compatibility.variant==='wrong-size'?new ArrayBuffer(9):bytes.slice().buffer};
    };
  }
  context.window=context;context.top=context;`);
replace('  return {...f,nodes,worker,status,physics,wheels,gameModule,',
 '  return {...f,nodes,worker,status,physics,wheels,gameModule,bootLog,originalProfile:context.__NFSU2_AI__.getModuleProfile(gameModule),');
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,URL,setImmediate};
vm.runInNewContext(source+'\nthis.makeBootFixture=pageFixture;',context,{filename:coreFile});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(variant){
 const f=await context.makeBootFixture(null,true,true,{explicitBoot:true,variant});
 await flush();await flush();
 f.worker.emit({t:'register',kind:5,ptr:f.status});
 return f;
}

test('actual page uses explicit worker preparation without installing a streaming hook or trusting the original module',async()=>{
 const nativeStreaming=WebAssembly.compileStreaming,f=await fixture();
 assert.equal(f.bootLog.installed,0);assert.equal(f.bootLog.compiled,1);
 assert.equal(f.originalProfile,null);assert.equal(f.worker.sent.length,1);
 assert.equal(f.worker.sent[0].message.mod,f.bootLog.prepared);
 assert.equal(f.aiLog.controllers[0].memory,f.memory);
 assert.equal(f.bootLog.fetches.filter(x=>x.url==='/game.json').length,2);
 assert(f.bootLog.fetches.filter(x=>x.url==='/game.json').every(x=>x.options.cache==='no-store'));
 const wasmFetch=f.bootLog.fetches.find(x=>x.url.startsWith('/game.wasm'));
 assert.equal(wasmFetch.url,'/game.wasm?v=fixture%20module%20token');assert.equal(wasmFetch.options.cache,'default');
 f.change('ai',true);f.run(2);assert.equal(f.aiLog.updates.at(-1).safe,true);
 assert.equal(WebAssembly.compileStreaming,nativeStreaming);
});

test('unknown metadata, missing source ABI, and mismatched opaque-module ABI retain the game unverified',async()=>{
 for(const variant of ['unknown','no-interface','wrong-interface']){
  const f=await fixture(variant);assert.equal(f.bootLog.installed,0);assert.equal(f.bootLog.compiled,0);
  assert.equal(f.bootLog.fetches.length,2);assert.equal(f.worker.sent.length,1);
  assert.notEqual(f.worker.sent[0].message.mod,f.bootLog.prepared);
  const before=Buffer.from(f.memory.buffer);f.change('ai',true);f.change('boost',true);f.run(3);
  assert.equal(f.aiLog.updates.at(-1).safe,false);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 }
});

test('unversioned source revalidates the browser cache and new original modules read fresh metadata',async()=>{
 const f=await fixture('no-module-token');
 assert.equal(f.bootLog.fetches.find(x=>x.url==='/game.wasm').options.cache,'no-cache');
 f.change('ai',true);f.run(2);assert.equal(f.aiLog.updates.at(-1).safe,true);
 f.bootLog.readMetadata=async()=>({ok:true,json:async()=>({rev:'new unknown build',size:8,game:'ug2',module:'new'})});
 const worker=f.createWorker(),original=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));
 worker.postMessage({mod:original,memory:f.memory,slot:0});await flush();await flush();
 worker.emit({t:'register',kind:5,ptr:f.status});f.run(2);
 assert.equal(f.bootLog.metadataReads,3);assert.equal(f.bootLog.compiled,1);
 assert.notEqual(worker.sent[0].message.mod,f.bootLog.prepared);
 assert.equal(f.aiLog.updates.at(-1).safe,false);
});

test('late initial metadata cannot overwrite newer verified boot metadata',async()=>{
 const f=await fixture('late-initial-metadata');
 f.change('ai',true);f.run(2);assert.equal(f.aiLog.updates.at(-1).safe,true);
 f.bootLog.releaseInitialMetadata();await flush();await flush();f.run(2);
 assert.equal(f.aiLog.updates.at(-1).safe,true);
});

test('a late older metadata response cannot displace a newer worker session or revision',async()=>{
 const f=await fixture(),oldWorker=f.createWorker(),newWorker=f.createWorker();let resolveOld,calls=0;
 f.bootLog.readMetadata=async()=>{
  if(++calls===1)return new Promise(resolve=>resolveOld=resolve);
  return {ok:true,json:async()=>({rev:f.bootLog.sourceProfile.revision,size:8,game:'ug2',module:'newest'})};
 };
 const makeModule=()=>new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));
 oldWorker.postMessage({mod:makeModule(),memory:f.memory,slot:0});
 newWorker.postMessage({mod:makeModule(),memory:f.memory,slot:0});await flush();await flush();
 newWorker.emit({t:'register',kind:5,ptr:f.status});f.change('ai',true);f.run(2);
 assert.equal(f.aiLog.updates.at(-1).safe,true);const controllers=f.aiLog.controllers.length;
 resolveOld({ok:true,json:async()=>({rev:'old unknown',size:8,game:'ug2'})});await flush();await flush();
 oldWorker.emit({t:'register',kind:5,ptr:0});oldWorker.emit({t:'exit'});f.run(2);
 assert.equal(f.aiLog.controllers.length,controllers);assert.equal(f.aiLog.updates.at(-1).safe,true);
 assert.equal(oldWorker.sent.length,1);assert.equal(newWorker.sent.length,1);
});

test('raw-size mismatch, failed preparation, or absent compiled profile falls back without a streaming hook',async()=>{
 for(const variant of ['wrong-size','compile-error','unverified','fetch-error','missing-helper']){
  const f=await fixture(variant);assert.equal(f.bootLog.installed,0);assert.equal(f.worker.sent.length,1);
  assert.notEqual(f.worker.sent[0].message.mod,f.bootLog.prepared);
  f.change('ai',true);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);
  assert.match(f.html(),/id="tools-panel"/);
 }
});
