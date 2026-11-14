'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const extension=path.resolve(__dirname,'../extension'),workspace=path.resolve(__dirname,'../..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const input=(revision='aa2429fb')=>fs.readFileSync(path.join(workspace,'research/compatibility-'+revision+'/game.wasm'));
// The prior shortcut-only base remains the fallback when its optional layer
// fails; the exact sealed publisher refuses that incomplete input by hash.
const FORWARD_OUTPUT='6b711ae003bb64417f6ebdbf21fa8454941ff3f50347c32c8f75f2faec7eeac2';
// Exact .12 fallback/full outputs were independently reconstructed and compiled:
// release-modules-v03812-final.json SHA2d6583714d1285b0c116b0988e90b70c30b472388c3e4973c9823a6fbdc3a785.
// Literal pins remain independent of runtime output. AA/15e pre-paced fallback
// bytes are unchanged;943 includes the separately reviewed normal tuner prefix.
const CORNER_OUTPUTS={"aa2429fb":"e71b34af8fd926f58754df7536b44bd122b077e28af528200c24602b63b47a73","15e5958f":"2863cd57dc898efa1bee1dffd83bace6872cf72b355c2e8043d501a8d7ddf7d0","943ee537":"7d7b7854340965a964b255c01ff2750d12e82cd814144156bb2050137a931c3e"};
const FINAL_OUTPUTS={"aa2429fb":"c4b99d9e25f2c0999ccdbd86172a4a5ced8932eb85b972e5cf4f2918f1769863","15e5958f":"cae9276ef7f8b9f07b6526bd7c889844d071e3d1ff5510052f311d52a5a7ddd4","943ee537":"fd55b4c12fa7e64fae8e60634e976af25da76f4a87498576756130813737c5dd"};
const SEALED_PUBLISHER_OUTPUT='2ecc7cb9515f611221bbd844873fb11d2c7ce4f8757844181d52d0e532cf904a';
function loader({rejectCornerCompile=false,rejectPacedCompile=false}={}){
 const compiled=[],fallback={},c=vm.createContext({location:{origin:'https://nfsu2.xyz'},crypto:crypto.webcrypto,Uint8Array,Int32Array,Float32Array,ArrayBuffer,SharedArrayBuffer,DataView,Atomics,WeakMap,WeakSet,console,URL,atob,performance,WebAssembly:{validate:WebAssembly.validate,compile:async bytes=>{const copy=Buffer.from(bytes);compiled.push(copy);const pin=hash(copy);if(rejectCornerCompile&&[...Object.values(CORNER_OUTPUTS),...Object.values(FINAL_OUTPUTS)].includes(pin))throw new WebAssembly.CompileError('Controlled optional corner compile failure');if(rejectPacedCompile&&Object.values(FINAL_OUTPUTS).includes(pin))throw new WebAssembly.CompileError('Controlled optional paced compile failure');return WebAssembly.compile(bytes);},compileStreaming:async()=>fallback}});
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));
 for(const name of manifest.content_scripts[0].js)if(name!=='page.js')new vm.Script(fs.readFileSync(path.join(extension,name),'utf8'),{filename:name}).runInContext(c);
 const ai=c.__NFSU2_AI__;ai.install();return{c,ai,compiled,fallback,run:bytes=>c.WebAssembly.compileStreaming({url:'https://nfsu2.xyz/game.wasm?v=test',clone:()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})})};
}
test('complete AA loader grants target-consumer and shortcut capabilities only after compiled output matches its pin',async()=>{
 const f=loader(),bytes=input(),before=Buffer.from(bytes),module=await f.run(bytes),p=f.ai.getModuleProfile(module);
 assert.equal(hash(f.compiled.at(-1)),FINAL_OUTPUTS.aa2429fb);assert.deepEqual(bytes,before);
 for(const k of['nativePaceCacheFix','nativePaceTargetConsumers','nativeForwardGeometry','nativeForwardClamp','nativeRouteChoice','nativeRubberband','nativeCornerTarget','nativePacedCatchup','pace','onlineRivals','onlinePlayerOutrun'])assert.equal(p.capabilities[k],true,k);
 assert.equal(f.ai.patchState.nativeRouteChoice,true);assert.equal(f.ai.patchState.phase,'ready');
});
test('optional shortcut mismatch cannot corrupt or discard the verified target-consumer and forward adapter',async()=>{
 const f=loader();f.c.__NFSU2_SHORTCUT_POLICY__={...f.c.__NFSU2_SHORTCUT_POLICY__,patchModule:async bytes=>{bytes[0]=255;throw Error('fixture mismatch');}};
 const module=await f.run(input()),p=f.ai.getModuleProfile(module);
 assert.equal(hash(f.compiled.at(-1)),FORWARD_OUTPUT);assert.equal(p.capabilities.nativeRouteChoice,undefined);assert.equal(p.capabilities.nativePaceTargetConsumers,true);assert.equal(p.capabilities.nativeForwardClamp,true);assert.equal(p.capabilities.nativeRubberband,false);assert.equal(p.capabilities.nativeCornerTarget,false);assert.equal(p.capabilities.nativePacedCatchup,false);assert.equal(f.ai.patchState.routeChoiceUnavailable,true);assert.equal(f.ai.patchState.forwardUnavailable,undefined);
});
test('forward adapter rejection leaves native catchup wrapper and denies target-consumer pacing capability',async()=>{
 const f=loader();let routeCalls=0;f.c.__NFSU2_FORWARD_NATIVE_PATCHER__={...f.c.__NFSU2_FORWARD_NATIVE_PATCHER__,patchModule:async bytes=>{bytes[0]=255;throw Error('fixture forward rejection');}};
 f.c.__NFSU2_SHORTCUT_POLICY__={...f.c.__NFSU2_SHORTCUT_POLICY__,patchModule:async()=>{routeCalls++;throw Error('unexpected route call');}};
 const bytes=input(),module=await f.run(bytes),p=f.ai.getModuleProfile(module);
 assert.equal(routeCalls,0);assert.equal(p.capabilities.ai,true);assert.equal(p.capabilities.pace,false);assert.equal(p.capabilities.nativePaceTargetConsumers,false);assert.equal(p.capabilities.nativePaceCacheFix,true);assert.equal(p.capabilities.nativeForwardGeometry,false);assert.equal(p.capabilities.nativeForwardClamp,false);assert.equal(p.capabilities.nativeRouteChoice,undefined);assert.equal(p.capabilities.nativeRubberband,false);assert.equal(p.capabilities.nativeCornerTarget,false);assert.equal(p.capabilities.nativePacedCatchup,false);
 assert.deepEqual(f.compiled.at(-1),Buffer.from(await f.ai.patchBytes(bytes)));
 const parse=require('../../work-aa-profile/tools/native-proof.cjs').parse;assert.deepEqual(parse(f.compiled.at(-1)).bodies.get(21268),parse(bytes).bodies.get(21268));
});
test('unknown AA-sized original never reaches target or shortcut patchers',async()=>{
 const f=loader(),bytes=input();bytes[bytes.length-1]^=1;let calls=0;
 f.c.__NFSU2_SHORTCUT_POLICY__={...f.c.__NFSU2_SHORTCUT_POLICY__,patchModule:async()=>{calls++;throw Error('unexpected');}};
 f.c.__NFSU2_PACED_CATCHUP__={...f.c.__NFSU2_PACED_CATCHUP__,patchModule:async()=>{calls++;throw Error('unexpected');}};
 assert.equal(await f.run(bytes),f.fallback);assert.equal(calls,0);assert.equal(f.ai.getModuleProfile(f.fallback),null);assert.equal(f.ai.patchState.patchCode,'module-hash');
});
for(const revision of ['15e5958f','943ee537']){
 test(revision+' loader compiles exact combined target and shortcut output; tampering stays rejected',async()=>{
  const f=loader(),bytes=input(revision),module=await f.run(bytes),p=f.ai.getModuleProfile(module);assert.equal(p.revision,revision);assert.equal(hash(f.compiled.at(-1)),FINAL_OUTPUTS[revision]);
  for(const k of['nativePaceCacheFix','nativePaceTargetConsumers','nativeForwardGeometry','nativeForwardClamp','nativeRouteChoice','nativeRubberband','nativeCornerTarget','nativePacedCatchup','pace','onlineRivals','onlinePlayerOutrun'])assert.equal(p.capabilities[k],true,k);
  for(const k of['fullTuner','dyno'])assert.equal(p.capabilities[k],revision==='943ee537',k);
  for(const k of['nativeRaceCapture','travel'])assert.equal(p.capabilities[k],false,k);
  if(revision==='943ee537'){for(const k of['tunerSecondGuestWindow','tunerCurrentNativeClamp'])assert.equal(p.capabilities[k],true,k);assert.equal(p.capabilities.tunerOrderedRecipe,false);}
  const bad=Buffer.from(bytes);bad[100]^=1;assert.equal(await f.run(bad),f.fallback);assert.equal(f.ai.patchState.patchCode,'module-hash');
 });
}

for(const fault of ['absent','throws','mutates-invalid','compile-rejects','supports-throws'])test('optional corner '+fault+' retains the exact sealed publisher, shortcut and forward composition',async()=>{
 const f=loader({rejectCornerCompile:fault==='compile-rejects'}),bytes=input(),before=Buffer.from(bytes),corner=f.c.__NFSU2_NATIVE_CORNER_TARGET__;
 if(fault==='absent')f.c.__NFSU2_NATIVE_CORNER_TARGET__=undefined;
 if(fault==='throws')f.c.__NFSU2_NATIVE_CORNER_TARGET__={...corner,patchModule:async()=>{throw Error('Controlled optional corner rejection');}};
 if(fault==='mutates-invalid')f.c.__NFSU2_NATIVE_CORNER_TARGET__={...corner,patchModule:async bytes=>{bytes[0]=255;return bytes;}};
 if(fault==='supports-throws')f.c.__NFSU2_NATIVE_CORNER_TARGET__={...corner,supports:()=>{throw Error('Controlled optional support lookup failure');}};
 const module=await f.run(bytes),p=f.ai.getModuleProfile(module);assert.deepEqual(bytes,before);assert.equal(hash(f.compiled.at(-1)),SEALED_PUBLISHER_OUTPUT);
 for(const key of ['nativeRubberband','nativeRouteChoice','nativeForwardGeometry','nativeForwardClamp','nativePaceTargetConsumers','pace'])assert.equal(p.capabilities[key],true,key);
 assert.equal(p.capabilities.nativeCornerTarget,false);assert.equal(p.capabilities.nativePacedCatchup,false);assert.equal(f.ai.patchState.nativeCornerUnavailable,fault==='absent'?undefined:true);assert.equal(f.ai.patchState.forwardUnavailable,undefined);assert.equal(f.ai.patchState.rubberbandUnavailable,undefined);assert.equal(f.ai.patchState.phase,'ready');
 if(fault==='compile-rejects'){assert.equal(f.compiled.length,3);assert.equal(hash(f.compiled[0]),FINAL_OUTPUTS.aa2429fb);assert.equal(hash(f.compiled[1]),CORNER_OUTPUTS.aa2429fb);}
});

for(const fault of ['absent','throws','mutates-invalid','compile-rejects','supports-throws'])test('optional paced '+fault+' retains exact .7 corner, publisher, shortcut and forward composition',async()=>{
 const f=loader({rejectPacedCompile:fault==='compile-rejects'}),bytes=input(),before=Buffer.from(bytes),paced=f.c.__NFSU2_PACED_CATCHUP__;
 if(fault==='absent')f.c.__NFSU2_PACED_CATCHUP__=undefined;
 if(fault==='throws')f.c.__NFSU2_PACED_CATCHUP__={...paced,patchModule:async()=>{throw Error('Controlled optional paced rejection');}};
 if(fault==='mutates-invalid')f.c.__NFSU2_PACED_CATCHUP__={...paced,patchModule:async bytes=>{bytes[0]=255;return bytes;}};
 if(fault==='supports-throws')f.c.__NFSU2_PACED_CATCHUP__={...paced,supports:()=>{throw Error('Controlled optional paced lookup failure');}};
 const module=await f.run(bytes),p=f.ai.getModuleProfile(module);assert.deepEqual(bytes,before);assert.equal(hash(f.compiled.at(-1)),CORNER_OUTPUTS.aa2429fb);
 for(const key of ['nativeRubberband','nativeCornerTarget','nativeRouteChoice','nativeForwardGeometry','nativeForwardClamp','nativePaceTargetConsumers','pace'])assert.equal(p.capabilities[key],true,key);
 assert.equal(p.capabilities.nativePacedCatchup,false);assert.equal(f.ai.patchState.pacedCatchupUnavailable,fault==='absent'?undefined:true);
 assert.equal(f.ai.patchState.nativeCornerUnavailable,undefined);assert.equal(f.ai.patchState.forwardUnavailable,undefined);assert.equal(f.ai.patchState.rubberbandUnavailable,undefined);assert.equal(f.ai.patchState.phase,'ready');
 if(fault==='compile-rejects'){assert.equal(f.compiled.length,2);assert.equal(hash(f.compiled[0]),FINAL_OUTPUTS.aa2429fb);}
});
