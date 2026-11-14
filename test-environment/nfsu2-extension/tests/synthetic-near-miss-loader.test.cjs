'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..'),EXT=path.join(ROOT,'nfsu2-extension/extension');
const raw=fs.readFileSync(path.join(ROOT,'work-functions-20261112/game-60946132.wasm'));
const rawHash=crypto.createHash('sha256').update(raw).digest('hex');
assert.equal(rawHash,'81d2e32d7ee67bb93a8fafee4dbc17570f8d4980be238d7434e15c791904b945');
function context(variant='actual'){
  const c=vm.createContext({crypto:crypto.webcrypto,WebAssembly,SharedArrayBuffer,atob:globalThis.atob,btoa:globalThis.btoa,TextEncoder,TextDecoder,console,URL,setTimeout,clearTimeout});
  const scripts=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json'))).content_scripts[0].js;
  for(const name of scripts){
    if(name==='ai.js'){
      const actual=c.__NFSU2_NATIVE_SYNTHETIC_NEAR_MISS_609__;
      if(variant==='missing')delete c.__NFSU2_NATIVE_SYNTHETIC_NEAR_MISS_609__;
      if(variant==='failed')c.__NFSU2_NATIVE_SYNTHETIC_NEAR_MISS_609__={...actual,patchModule:async()=>{throw Error('offline preparation failure');}};
      if(variant==='wrong-output')c.__NFSU2_NATIVE_SYNTHETIC_NEAR_MISS_609__={...actual,outputModuleHash:'0'.repeat(64)};
    }
    vm.runInContext(fs.readFileSync(path.join(EXT,name),'utf8'),c,{filename:name,timeout:3000});
    if(name==='ai.js')break;
  }
  return c;
}

function initializeOwnedDrivingGraph(memory){
  // Owned runtime data for factory eligibility only. No guest/native routine
  // is executed and no native award is simulated by this loader fixture.
  const d=new DataView(memory.buffer),put=(at,value)=>d.setUint32(at,value,true);
  const player=0xe00000,car=0xe01000,race=0xe03000,racer=0xe05000,ds=0xe06000,manager=0xe07000,style=0xe08000,metadata=0xe09000;
  put(0x8654a4,6);put(0x850078,0);put(0xd00030,1);put(0xd00000,player);put(player+4,car);
  put(0x890118,race);put(race,4);put(race+0x24,1);put(race+0xbd0,racer);put(car+0x1c,racer);put(racer,car);
  put(racer+468,ds);put(racer+476,manager);put(manager,racer);put(manager+4,ds);put(ds+84,style);
  put(style+8,metadata);put(style+12,21);d.setUint8(style+16,1);put(metadata,0xe3fa9491);
}

test('actual 609 compilation grants near-miss capability only to the registered complete native output',async()=>{
  const c=context(),adapter=c.__NFSU2_NATIVE_SYNTHETIC_NEAR_MISS_609__;
  assert(adapter,'Native near-miss patcher must load before ai.js');
  const original=await WebAssembly.compile(raw),module=await c.__NFSU2_AI__.compileLocal(raw);
  const profile=c.__NFSU2_AI__.getModuleProfile(module);
  assert.equal(profile.hash,rawHash);assert.equal(profile.capabilities.nativeSyntheticNearMiss,true);
  assert.equal(c.__NFSU2_AI__.getNearMissBridge(original),null);
  assert.equal(c.__NFSU2_AI__.getNearMissBridge(module),null,'A compiled module alone has no page mailbox owner');
  assert.deepEqual(WebAssembly.Module.imports(module),WebAssembly.Module.imports(original));
  assert.deepEqual(WebAssembly.Module.exports(module),WebAssembly.Module.exports(original));
  const memory=new WebAssembly.Memory({initial:11264,maximum:65536,shared:true});
  const before=Buffer.from(new Uint8Array(memory.buffer,adapter.mailbox.base,adapter.mailbox.size));
  assert.equal(c.__NFSU2_AI__.getNearMissBridge(module,memory,1),null,'A registered module must not claim scratch while runtime startup is incomplete');
  assert.deepEqual(Buffer.from(new Uint8Array(memory.buffer,adapter.mailbox.base,adapter.mailbox.size)),before);
  initializeOwnedDrivingGraph(memory);
  const bridge=c.__NFSU2_AI__.getNearMissBridge(module,memory,1);
  assert(bridge,'Actual registered module can reserve its owned command header');
  assert.equal(bridge.moduleIdentity,module);assert.equal(bridge.moduleHash,rawHash);assert.equal(bridge.protocolVersion,4);
  assert.equal(c.__NFSU2_AI__.getNearMissBridge(module),bridge);
  assert.equal(c.__NFSU2_AI__.getNearMissBridge(module,memory,1),bridge);
  assert.equal(c.__NFSU2_AI__.getNearMissBridge(original,memory,1),null);
});

test('missing, failed or incorrectly pinned near-miss adapters retain the compiled driving module without its capability',async()=>{
  for(const variant of ['missing','failed','wrong-output']){
    const c=context(variant),module=await c.__NFSU2_AI__.compileLocal(raw),profile=c.__NFSU2_AI__.getModuleProfile(module);
    assert(profile,variant);assert.equal(profile.capabilities.nativeOnlineAI,true,variant);
    assert.equal(profile.capabilities.nativeSyntheticNearMiss,false,variant);
    assert.equal(c.__NFSU2_AI__.getNearMissBridge(module),null,variant);
  }
});
