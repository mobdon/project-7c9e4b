'use strict';
// Versioned compile-only proof. Harvest requires an explicit flag; neither mode
// instantiates a full game or replaces an existing verification receipt.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..'),extension=path.join(root,'extension');
const harvest=process.argv.includes('--harvest');
assert.ok(process.argv.slice(2).every(x=>x==='--harvest'),'Only --harvest is supported');
const output=path.join(root,'verification',harvest?'native-output-pins-v0381-harvest.json':'release-modules-v0381.json');
assert.equal(fs.existsSync(output),false,'Versioned receipt already exists; preserve it before an explicitly reviewed rerun.');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const historical={
 'tools/verify-release-modules.cjs':'a14eacf8f23bb6bab0391b190ec894721e2465482d085a9c784b746cee61e27d',
 'verification/release-modules.json':'e733945d10f51b2d9c430242c282056497d0032cf9de23a37e96318a8f63b323'
};
function preserveHistorical(){for(const[file,pin]of Object.entries(historical))assert.equal(hash(fs.readFileSync(path.join(root,file))),pin,'Historical v0.38 artifact changed: '+file);}
function sources(){const out={};for(const name of fs.readdirSync(extension).sort()){const file=path.join(extension,name),stat=fs.lstatSync(file);assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Unexpected production source entry '+name);out[name]=hash(fs.readFileSync(file));}return out;}
function leb(n){const bytes=[];do{const b=n&127;n>>>=7;bytes.push(b|(n?128:0));}while(n);return Buffer.from(bytes);}
function sections(bytes){let p=8;const out=[],bodies=new Map();const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};while(p<bytes.length){const start=p,id=bytes[p++],len=u(),payload=p,end=p+len;if(id===10){const count=u();for(let i=0;i<count;i++){const size=u();bodies.set(i+37,bytes.subarray(p,p+size));p+=size;}}out.push({id,bytes:bytes.subarray(start,end),data:bytes.subarray(payload,end)});p=end;}return {out,bodies};}
// Sealed after final source freeze: exact8ab512; the other seven outputs retain
// the archived184-horizon hashes. Bounds remain per exact native profile.
const outputPins={
 '6f4f1e4e':'7f55229f8e89ebca310cab1939f2d52dd56977e4d606c995ba80554e3a0988d7',
 '2f0ddd3b':'b8dc2a2f6775d6a0eacce704068377b60f4daf9c7eff8074c8cae7d17c316f7e',
 '78e2bb69':'231fad9aa42ef731e479cd4115a8fa5647de485a112b14fd60fc086923275a21',
 '93af6ccb':'9f9de6d78a999eb4a341ef3bf4ffc4e2a5712d24b5ee6ca0d1ca8e0decf39e4a',
 '3bdd9959':'4355a0883fe9e33fc0752b29f9a67da0f76e41703c060f9b0f9f2aa683e6d8de',
 'd2fa4f4c':'42202b755b24edd05fac18a8b83e8bfd08d02f1442cc77cbd88e5ab89cca0d96',
 'cd5b74d5':'6da7345575d544ae021b52c45d646f0ccef277cb0685ebfb5322a97eb01e0ce3',
 '8abf9be8':'e84454f29b90bf0b03265b4fe242e26079fab1c131537b5d1cf59fc384afb8d5'
};
const pins=[
 ['6f4f1e4e','research/legacy/game.wasm','ee5d281a3109240d5db25dc3921e1044672cf6d650eb58c3baa089b54fe2941f',[4497,4653,21213,21262,22720]],
 ['2f0ddd3b','research/compatibility-v011/game.wasm','5e33ad2cb4c4cc6893dee7cbd4d6e9bfb0f59a349d218fddbb5e3331ca69bc34',[4497,4653,21213,21262,22430]],
 ['78e2bb69','research/compatibility-78e2bb69/game.wasm','df7b930bb293ffdf975f0735d93e0797d51bd137d0cbeabcaff87fc5a693c759',[2459,3174,4497,4653,7395,8871,17404,19197,19277,21213,21263,22470]],
 ['93af6ccb','research/compatibility-93af6ccb/game.wasm','128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6',[2459,3174,4497,4653,7395,8871,13186,17404,19197,19277,21213,21263,22508]],
 ['3bdd9959','nfsu2-extension/research/game-3bdd9959.wasm','ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22937]],
 ['d2fa4f4c','research/compatibility-d2fa4f4c/game.wasm','e41d71453cecba5ee2cd3cbf70af1c84180020644151f5f9bc2fa828fa5123bb',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22593]],
 ['cd5b74d5','research/compatibility-cd5b74d5/game.wasm','32b09c8bfea0c23aff21e5edac8f3b99b4d3fe143e8b479b9bea506091ab2174',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22593]],
 ['8abf9be8','research/compatibility-8abf9be8/game.wasm','14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22595]]
];
(async()=>{
 preserveHistorical();const sourceHashes=sources();
 const previousRelease=JSON.parse(fs.readFileSync(path.join(root,'verification/release-modules.json'),'utf8'));assert.equal(previousRelease.version,'0.38.0');
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));assert.equal(manifest.version,'0.38.1');
 if(!harvest)for(const[revision,pin]of Object.entries(outputPins))assert.match(pin||'',/^[0-9a-f]{64}$/,'Unsealed v0.38.1 output pin '+revision);
 const context=vm.createContext({console,crypto:crypto.webcrypto,WebAssembly,Uint8Array,Int32Array,Float32Array,DataView,ArrayBuffer,SharedArrayBuffer,performance,atob});
 for(const file of manifest.content_scripts[0].js){const script=new vm.Script(fs.readFileSync(path.join(extension,file),'utf8'),{filename:file});if(file!=='page.js')script.runInContext(context);}
 const ai=context.__NFSU2_AI__,modules=[],harvested={};
 for(const[revision,file,inputPin,expected]of pins){
  const raw=fs.readFileSync(path.join(workspace,file)),before=Buffer.from(raw),originalHash=hash(raw);assert.equal(originalHash,inputPin,'Exact original module '+revision);
  let patched=Buffer.from(await ai.patchBytes(raw));
  if(revision==='93af6ccb')patched=Buffer.from(await context.__NFSU2_RACE_CAPTURE__.patchModule(patched,context.__NFSU2_NEXT_PROFILE__));
  let config=null;
  if(context.__NFSU2_FORWARD_NATIVE_CONFIG__?.select?.(originalHash)){
   config=context.__NFSU2_FORWARD_NATIVE_CONFIG__.select(originalHash);assert.ok(context.__NFSU2_FORWARD_NATIVE_PATCHER__&&config);
   assert.equal(config.helpers.length,revision==='8abf9be8'?26:22,'Reviewed appended helper count '+revision);
   assert.equal(config.globals.count,revision==='8abf9be8'?581:571,'Reviewed appended global count '+revision);
   assert.equal(config.types.count,0,'No new native function signatures '+revision);
   patched=Buffer.from(await context.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(patched,{verifiedOriginalHash:originalHash}));
  }
  assert.deepEqual(raw,before);const outputHash=hash(patched),previous=previousRelease.modules.find(row=>row.revision===revision);assert.ok(previous);assert.equal(previous.inputSha256,originalHash);assert.notEqual(outputHash,previous.outputSha256,'New free-roam hook must change the v0.38 output '+revision);if(!harvest)assert.equal(outputHash,outputPins[revision],'Exact complete v0.38.1 output '+revision);
  assert.ok(WebAssembly.validate(patched),'Valid patched module '+revision);const originalModule=await WebAssembly.compile(raw),patchedModule=await WebAssembly.compile(patched);
  assert.equal(WebAssembly.Module.imports(originalModule).filter(x=>x.kind==='function').length,37);
  assert.deepEqual(WebAssembly.Module.imports(patchedModule),WebAssembly.Module.imports(originalModule));assert.deepEqual(WebAssembly.Module.exports(patchedModule),WebAssembly.Module.exports(originalModule));
  const a=sections(raw),b=sections(patched),changed=[];assert.equal(b.bodies.size,a.bodies.size+(config?.helpers.length||0));
  for(const[index,body]of a.bodies)if(!body.equals(Buffer.from(b.bodies.get(index))))changed.push(index);
  assert.deepEqual(changed,expected,'Reviewed changed original function list '+revision);assert.equal(a.out.length,b.out.length);
  if(config)for(let i=0;i<config.helpers.length;i++)assert.deepEqual(Buffer.from(b.bodies.get(37+a.bodies.size+i)),Buffer.from(config.helpers[i].body,'base64'),'Exact appended authored helper '+revision+':'+config.helpers[i].name);
  for(let i=0;i<a.out.length;i++){
   const id=a.out[i].id;assert.equal(id,b.out[i].id);
   if(config&&[1,3,6].includes(id)){
    const read=context.__NFSU2_FORWARD_NATIVE_PATCHER__.read,oldCount=read(a.out[i].data),newCount=read(b.out[i].data),extra=id===1?config.types.count:id===3?config.helpers.length:config.globals.count;
    assert.equal(newCount.value,oldCount.value+extra);const prefix=a.out[i].data.subarray(oldCount.end),tail=id===1?Buffer.from(config.types.bytes,'base64'):id===6?Buffer.from(config.globals.bytes,'base64'):Buffer.concat(config.helpers.map(h=>leb(h.type)));
    assert.deepEqual(b.out[i].data.subarray(newCount.end),Buffer.concat([prefix,tail]),'Exact original prefix and authored append section '+revision+':'+id);
   }else if(id!==10)assert.deepEqual(a.out[i].bytes,b.out[i].bytes,'Untouched non-code section '+revision+':'+id);
  }
  harvested[revision]=outputHash;
  modules.push({revision,inputSha256:originalHash,inputBytes:raw.length,previousV038OutputSha256:previous.outputSha256,outputSha256:outputHash,outputBytes:patched.length,valid:true,compiled:true,changedFunctions:changed,otherNativeFunctionsPreserved:true,importsExportsDataAndTableUnchanged:true,exactAuthoredAppendVerified:true,appendedAuthoredHelpers:config?.helpers.length||0,appendedPrivateGlobals:config?.globals.count||0,appendedTypes:config?.types.count||0});
 }
 for(const name of ['__NFSU2_MODERN_PROFILE__','__NFSU2_D2FA_PROFILE__','__NFSU2_CD5_PROFILE__','__NFSU2_ABF_PROFILE__']){
  const profile=context[name];for(const key of ['fullTuner','dyno','nativeRaceCapture','travel'])assert.equal(profile.capabilities[key],false,name+':'+key);
 }
 assert.deepEqual(sources(),sourceHashes,'Production source changed during native verification');preserveHistorical();
 const report={version:manifest.version,checkedAt:new Date().toISOString(),kind:harvest?'reviewed native output harvest; compile-only body/section proof':'strict pinned native output verification; compile-only body/section proof',verifierSha256:hash(fs.readFileSync(__filename)),sourceHashes,sourceUnchanged:true,historicalArtifactsPreserved:historical,outputPins:harvested,modules,liveGameTested:false};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,version:report.version,kind:report.kind,modules:modules.map(x=>({revision:x.revision,outputSha256:x.outputSha256,helpers:x.appendedAuthoredHelpers,globals:x.appendedPrivateGlobals})),sourceUnchanged:true,historicalArtifactsPreserved:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
