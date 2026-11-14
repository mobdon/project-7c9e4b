'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'../combined-v021-integration');
const before=require(base+'/extension/next-profile.js'),after=require(root+'/extension/next-profile.js');
for(const key of Object.keys(before))if(!['cars','wall','capabilities'].includes(key))assert.deepEqual(after[key],before[key],key);
assert.equal(after.locals,170);assert.deepEqual(after.bridge,before.bridge);assert.deepEqual(after.fullTuner,before.fullTuner);assert.equal(after.capabilities.fullTuner,true);assert.equal(after.capabilities.onlineRaceCars,true);assert.equal(after.cars.onlineRaceCars,true);
const fixed=['ai.js','walls.js','current-profile.js','latest-profile.js','signatures.js','signature-profile.js','signature-profile-latest.js','signature-profile-next.js','core.js','dyno-core.js','dyno.js','dyno-native-profile.js','dyno-native.js','dyno-evaluator.js','dyno-full.js'];for(const n of fixed)assert.deepEqual(fs.readFileSync(root+'/extension/'+n),fs.readFileSync(base+'/extension/'+n),n);
function parse(bytes){let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};const sections=[],functions=[];while(p<bytes.length){const id=bytes[p++],len=u(),start=p,end=p+len;sections.push({id,bytes:bytes.subarray(start,end)});if(id===10){const n=u();for(let i=0;i<n;i++){const size=u();functions.push(bytes.subarray(p,p+size));p+=size;}}p=end;}return {sections,functions};}
(async()=>{
 // Loading profiles before the loaders can seed globals, so use exact pins in separate contexts below.
 const vm=require('node:vm'),{createRequire}=require('node:module');
 function loader(dir){const context={module:{exports:{}},require:createRequire(dir+'/extension/ai.js'),crypto:globalThis.crypto,WebAssembly,Uint8Array,ArrayBuffer,DataView,Int32Array,Atomics,WeakMap,WeakSet,console,URL};context.globalThis=context;vm.runInNewContext(fs.readFileSync(dir+'/extension/ai.js','utf8'),context);return context.module.exports;}
 const old=loader(base),next=loader(root),bytes=fs.readFileSync(root+'/research/compatibility-93af6ccb/game.wasm'),a=parse(await old.patchBytes(bytes)),b=parse(await next.patchBytes(bytes));const changes=[];
 for(let i=0;i<a.functions.length;i++)if(!Buffer.from(a.functions[i]).equals(Buffer.from(b.functions[i])))changes.push(i+37);assert.deepEqual(changes,[22508]);for(let i=0;i<a.sections.length;i++)if(a.sections[i].id!==10)assert.deepEqual(a.sections[i].bytes,b.sections[i].bytes);
 console.log(JSON.stringify({preservedFiles:fixed,fullTunerBridgeAndMetadata:'byte-identical',onlineCornerBrakingAI:'byte-identical',nativeFunctionsChangedRelativeToV021:changes,allOtherBodiesAndNonCodeSections:'byte-identical',newCapability:'onlineRaceCars only',nativeGripDownforce:'not activated'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
