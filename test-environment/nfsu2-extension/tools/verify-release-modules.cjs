'use strict';
// Compile-only verification. Never instantiate a complete original game world.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..'),extension=path.join(root,'extension');
function sections(bytes){let p=8;const out=[],bodies=new Map();const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};while(p<bytes.length){const start=p,id=bytes[p++],len=u(),payload=p,end=p+len;if(id===10){const count=u();for(let i=0;i<count;i++){const size=u();bodies.set(i+37,bytes.subarray(p,p+size));p+=size;}}out.push({id,bytes:bytes.subarray(start,end),data:bytes.subarray(payload,end)});p=end;}return {out,bodies};}
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));
 const context=vm.createContext({console,crypto:crypto.webcrypto,WebAssembly,Uint8Array,Int32Array,Float32Array,DataView,ArrayBuffer,SharedArrayBuffer,performance,atob});
 for(const file of manifest.content_scripts[0].js){const script=new vm.Script(fs.readFileSync(path.join(extension,file),'utf8'),{filename:file});if(file!=='page.js')script.runInContext(context);}
 const ai=context.__NFSU2_AI__;
 const outputPins={
  '6f4f1e4e':'3acae93f4c5d7894009738c6848a17b6bd50a7399f517b91716a8b2a7326f33e',
  '2f0ddd3b':'c3dfee48f08eb66418a0521b34652c296b24eb0272d5f68712a68ff255b037ad',
  '78e2bb69':'909a814bb79892547872cb601d39b12c8582cf7b79bd6447afa0dd6111bc003c',
  '93af6ccb':'bd206313ba2edc4b446bbb0de2bc4aebd2327ddd38ce97045ddb4cd579aea5dc',
  '3bdd9959':'48d020299897aa8769e33a40d574e41b607ef80ec69315f6b355d246d1f0f208',
  'd2fa4f4c':'02316771f149328479a5b42b0f401fdbe979d72682e12c701df370537b264c06',
  'cd5b74d5':'bdd76f53d11410cb49f4f1df213c5b97d082069ed6cc2da0dc3e2076b2b7aaed',
  '8abf9be8':'d2d221f76fb7447d2801e4b86f9f7ca953e8a6c3bad8dd281ee0fd2370ae82e0'
 };
 const pins=[
  ['6f4f1e4e','research/legacy/game.wasm',[4497,4653,21213,21262,22720]],
  ['2f0ddd3b','research/compatibility-v011/game.wasm',[4497,4653,21213,21262,22430]],
  ['78e2bb69','research/compatibility-78e2bb69/game.wasm',[2459,3174,4497,4653,7395,8871,17404,19197,19277,21213,21263,22470]],
  ['93af6ccb','research/compatibility-93af6ccb/game.wasm',[2459,3174,4497,4653,7395,8871,13186,17404,19197,19277,21213,21263,22508]],
  ['3bdd9959','research/game-3bdd9959.wasm',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22937]],
  ['d2fa4f4c','research/compatibility-d2fa4f4c/game.wasm',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22593]],
  ['cd5b74d5','research/compatibility-cd5b74d5/game.wasm',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22593]],
  ['8abf9be8','research/compatibility-8abf9be8/game.wasm',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22595]],
 ];
 const modules=[];
 for(const[revision,file,expected]of pins){
  const raw=fs.readFileSync(path.join(workspace,file)),before=Buffer.from(raw);let patched=Buffer.from(await ai.patchBytes(raw));
  // The production streaming loader composes optional capture after the
  // independently verified AI patch; patchBytes itself remains AI-only.
  if(revision==='93af6ccb')patched=Buffer.from(await context.__NFSU2_RACE_CAPTURE__.patchModule(patched,context.__NFSU2_NEXT_PROFILE__));
  let forwardConfig=null;
  const originalHash=crypto.createHash('sha256').update(raw).digest('hex');
  if(context.__NFSU2_FORWARD_NATIVE_CONFIG__?.select?.(originalHash)){
   const forward=context.__NFSU2_FORWARD_NATIVE_PATCHER__;forwardConfig=context.__NFSU2_FORWARD_NATIVE_CONFIG__.select(originalHash);
   assert(forward&&forwardConfig,'Forward native scripts must be present in manifest content scripts.');
   patched=Buffer.from(await forward.patchModule(patched,{verifiedOriginalHash:forwardConfig.moduleHash}));
  }
  assert.deepEqual(raw,before);assert.equal(crypto.createHash('sha256').update(patched).digest('hex'),outputPins[revision],'Exact complete patched output '+revision);assert(WebAssembly.validate(patched));await WebAssembly.compile(patched);
  const a=sections(raw),b=sections(patched),changed=[];assert.equal(b.bodies.size,a.bodies.size+(forwardConfig?.helpers.length||0));
  for(const[index,body]of a.bodies)if(!body.equals(Buffer.from(b.bodies.get(index))))changed.push(index);
  assert.deepEqual(changed,expected,revision);assert.equal(a.out.length,b.out.length);
  for(let i=0;i<a.out.length;i++){
   const id=a.out[i].id;assert.equal(id,b.out[i].id);
   if(forwardConfig&&[1,3,6].includes(id)){
    const read=context.__NFSU2_FORWARD_NATIVE_PATCHER__.read,oldCount=read(a.out[i].data),newCount=read(b.out[i].data),extra=id===1?forwardConfig.types.count:id===3?forwardConfig.helpers.length:forwardConfig.globals.count;
    assert.equal(newCount.value,oldCount.value+extra);const prefix=a.out[i].data.subarray(oldCount.end);assert.deepEqual(b.out[i].data.subarray(newCount.end,newCount.end+prefix.length),prefix,'native vector prefix section '+id);
   }else if(id!==10)assert.deepEqual(a.out[i].bytes,b.out[i].bytes,revision+' section '+id);
  }
  const originalModule=await WebAssembly.compile(raw),patchedModule=await WebAssembly.compile(patched);assert.deepEqual(WebAssembly.Module.imports(patchedModule),WebAssembly.Module.imports(originalModule));assert.deepEqual(WebAssembly.Module.exports(patchedModule),WebAssembly.Module.exports(originalModule));
  modules.push({revision,inputSha256:crypto.createHash('sha256').update(raw).digest('hex'),outputSha256:crypto.createHash('sha256').update(patched).digest('hex'),valid:true,compiled:true,changedFunctions:changed,otherNativeFunctionsPreserved:true,importsExportsDataAndTableUnchanged:true,appendedAuthoredHelpers:forwardConfig?.helpers.length||0,appendedPrivateGlobals:forwardConfig?.globals.count||0,appendedTypes:forwardConfig?.types.count||0});
 }
 const current=context.__NFSU2_MODERN_PROFILE__;for(const key of ['fullTuner','dyno','nativeRaceCapture','travel'])assert.equal(current.capabilities[key],false,key);
 const latest=context.__NFSU2_D2FA_PROFILE__;for(const key of ['fullTuner','dyno','nativeRaceCapture','travel','nativeRouteProbe','nativeForwardGeometry','nativeForwardClamp'])assert.equal(latest.capabilities[key],false,key);
 const currentSite=context.__NFSU2_CD5_PROFILE__;for(const key of ['fullTuner','dyno','nativeRaceCapture','travel','nativeRouteProbe','nativeForwardGeometry','nativeForwardClamp'])assert.equal(currentSite.capabilities[key],false,key);
 const newest=context.__NFSU2_ABF_PROFILE__;for(const key of ['fullTuner','dyno','nativeRaceCapture','travel','nativeRouteProbe','nativeForwardGeometry','nativeForwardClamp'])assert.equal(newest.capabilities[key],false,key);
 const report={version:manifest.version,kind:'compile-only; exact native bodies and section comparison',modules,liveGameTested:false};
 fs.writeFileSync(path.join(root,'verification/release-modules.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
