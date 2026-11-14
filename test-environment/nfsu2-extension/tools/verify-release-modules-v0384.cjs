'use strict';
// Versioned compile-only proof. Harvest requires an explicit flag; neither mode
// instantiates a full game or replaces an existing verification receipt.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..'),extension=path.join(root,'extension');
const {spawnSync}=require('node:child_process');
const harvest=process.argv.includes('--harvest');
assert.ok(process.argv.slice(2).every(x=>x==='--harvest'),'Only --harvest is supported');
const output=path.join(root,'verification',harvest?'native-output-pins-v0384-harvest.json':'release-modules-v0384.json');
assert.equal(fs.existsSync(output),false,'Versioned receipt already exists; preserve it before an explicitly reviewed rerun.');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const historical={
 'tools/verify-release-modules-v0382.cjs':'b060243320eaf6d21df4031148384d51f10a5e596b90364ac26cfe150680842f',
 'verification/release-modules-v0382.json':'40140b024f31642f91b66535478d70ee9236bea79a4f985a21c39bae7afed880',
 'tools/verify-release-modules-v0381.cjs':'2d2fcea6632df96b3f71728e6610bca6fb5ea36c7b617719903c9f096d811dd3',
 'verification/release-modules-v0381.json':'5d4fb3598978ada43d44473a435d56f4b9a54da54408335eb554146390178e26',
 'tools/verify-release-modules.cjs':'a14eacf8f23bb6bab0391b190ec894721e2465482d085a9c784b746cee61e27d',
 'verification/release-modules.json':'e733945d10f51b2d9c430242c282056497d0032cf9de23a37e96318a8f63b323'
};
function preserveHistorical(){for(const[file,pin]of Object.entries(historical))assert.equal(hash(fs.readFileSync(path.join(root,file))),pin,'Historical v0.38 artifact changed: '+file);}
function sources(){const out={};for(const name of fs.readdirSync(extension).sort()){const file=path.join(extension,name),stat=fs.lstatSync(file);assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Unexpected production source entry '+name);out[name]=hash(fs.readFileSync(file));}return out;}
function leb(n){const bytes=[];do{const b=n&127;n>>>=7;bytes.push(b|(n?128:0));}while(n);return Buffer.from(bytes);}
function sections(bytes){let p=8;const out=[],bodies=new Map();const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};while(p<bytes.length){const start=p,id=bytes[p++],len=u(),payload=p,end=p+len;if(id===10){const count=u();for(let i=0;i<count;i++){const size=u();bodies.set(i+37,bytes.subarray(p,p+size));p+=size;}}out.push({id,bytes:bytes.subarray(start,end),data:bytes.subarray(payload,end)});p=end;}return {out,bodies};}
const slotCorrections={d2fa4f4c:[678644032,678646656],cd5b74d5:[678648576,678651200],'8abf9be8':[678649664,678652288]};
function contextFrom(read){const c=vm.createContext({console,crypto:crypto.webcrypto,WebAssembly,Uint8Array,Int32Array,Float32Array,DataView,ArrayBuffer,SharedArrayBuffer,performance,atob});const m=JSON.parse(read('manifest.json'));for(const file of m.content_scripts[0].js){const script=new vm.Script(read(file),{filename:file});if(file!=='page.js')script.runInContext(c);}return c;}
function priorSource(){
 const archive=path.join(workspace,'artifacts/NFSU2-Driving-Tools-v0.38.1-Desktop-Folder.zip');assert.equal(hash(fs.readFileSync(archive)),'1a8b3c373ee0002ddad30f22b29521f2de8a42e7a0d8dd07830c48c112d45bdc');
 const python=process.env.NFS_PYTHON||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
 const run=spawnSync(python,['-c','import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n.split("/")[-1]:z.read(n).decode("utf-8") for n in z.namelist() if n.endswith((".js",".json"))}))',archive],{encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(run.status,0,run.stderr);const files=JSON.parse(run.stdout),receipt=JSON.parse(fs.readFileSync(path.join(root,'verification/release-modules-v0381.json'),'utf8'));for(const[name,pin]of Object.entries(receipt.sourceHashes))if(name in files)assert.equal(hash(Buffer.from(files[name])),pin,'Immutable v0.38.1 source '+name);return contextFrom(name=>files[name]);
}
function sleb(n){const out=[];for(;;){const b=n&127;n>>=7;const done=(n===0&&!(b&64))||(n===-1&&(b&64));out.push(b|(done?0:128));if(done)return Buffer.from(out);}}
function replaceConstant(body,from,to){const needle=Buffer.concat([Buffer.from([65]),sleb(from)]),replacement=Buffer.concat([Buffer.from([65]),sleb(to)]),parts=[];let p=0,at,count=0;while((at=body.indexOf(needle,p))!==-1){parts.push(body.subarray(p,at),replacement);p=at+needle.length;count++;}parts.push(body.subarray(p));assert.equal(count,2,'Each folded cell has one guard and one load');return Buffer.concat(parts);}
// Output pins are sealed only after exact body/section and previous-release comparison.
const outputPins={
 '6f4f1e4e':'7f55229f8e89ebca310cab1939f2d52dd56977e4d606c995ba80554e3a0988d7',
 '2f0ddd3b':'b8dc2a2f6775d6a0eacce704068377b60f4daf9c7eff8074c8cae7d17c316f7e',
 '78e2bb69':'231fad9aa42ef731e479cd4115a8fa5647de485a112b14fd60fc086923275a21',
 '93af6ccb':'9f9de6d78a999eb4a341ef3bf4ffc4e2a5712d24b5ee6ca0d1ca8e0decf39e4a',
 '3bdd9959':'4355a0883fe9e33fc0752b29f9a67da0f76e41703c060f9b0f9f2aa683e6d8de',
 'd2fa4f4c':'fade94669268082bd7290916753e976417486deaa6c86e3fe36a7776e0980fb3',
 'cd5b74d5':'188513272e25b302cbc2093c84e437afdc418e6411692155ec0bd507a88a2cf1',
 '8abf9be8':'341c1e96d8229fae271ddf1ef32b2bb16f40ce489292446fa674b5338825b6ce',
 '93cfc6e9':'d110ff2905894159aeb735a3351d3381a9c7ae44408858df1806761be8b9b9af',
 'aa2429fb':'bdb971eb2a34eaef58a0d2da0ec6fdeb59aac3deb0867ba031f07c4e2c67898f'
};
const pins=[
 ['6f4f1e4e','research/legacy/game.wasm','ee5d281a3109240d5db25dc3921e1044672cf6d650eb58c3baa089b54fe2941f',[4497,4653,21213,21262,22720]],
 ['2f0ddd3b','research/compatibility-v011/game.wasm','5e33ad2cb4c4cc6893dee7cbd4d6e9bfb0f59a349d218fddbb5e3331ca69bc34',[4497,4653,21213,21262,22430]],
 ['78e2bb69','research/compatibility-78e2bb69/game.wasm','df7b930bb293ffdf975f0735d93e0797d51bd137d0cbeabcaff87fc5a693c759',[2459,3174,4497,4653,7395,8871,17404,19197,19277,21213,21263,22470]],
 ['93af6ccb','research/compatibility-93af6ccb/game.wasm','128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6',[2459,3174,4497,4653,7395,8871,13186,17404,19197,19277,21213,21263,22508]],
 ['3bdd9959','nfsu2-extension/research/game-3bdd9959.wasm','ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22937]],
 ['d2fa4f4c','research/compatibility-d2fa4f4c/game.wasm','e41d71453cecba5ee2cd3cbf70af1c84180020644151f5f9bc2fa828fa5123bb',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22593]],
 ['cd5b74d5','research/compatibility-cd5b74d5/game.wasm','32b09c8bfea0c23aff21e5edac8f3b99b4d3fe143e8b479b9bea506091ab2174',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22593]],
 ['8abf9be8','research/compatibility-8abf9be8/game.wasm','14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd',[1298,2459,3174,4497,4653,6140,7395,8871,13186,17404,19197,19277,21213,21263,22595]],
 ['93cfc6e9','research/compatibility-93cfc6e9/game.wasm','e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03',[1298,2459,3174,4497,4653,6140,7395,8870,13185,17403,19196,19276,21212,21262,22949]],
 ['aa2429fb','research/compatibility-aa2429fb/game.wasm','a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8',[1298,2459,3174,4497,4653,6140,7395,8870,13185,17403,19196,19276,21212,21268,22957]]
];
(async()=>{
 preserveHistorical();const sourceHashes=sources();
 const previousRelease=JSON.parse(fs.readFileSync(path.join(root,'verification/release-modules-v0381.json'),'utf8'));assert.equal(previousRelease.version,'0.38.1');const previousContext=priorSource();const releaseV0382=JSON.parse(fs.readFileSync(path.join(root,'verification/release-modules-v0382.json'),'utf8'));
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));assert.equal(manifest.version,'0.38.4');
 if(!harvest)for(const[revision,pin]of Object.entries(outputPins))assert.match(pin||'',/^[0-9a-f]{64}$/,'Unsealed v0.38.4 output pin '+revision);
 const context=contextFrom(name=>fs.readFileSync(path.join(extension,name),'utf8'));
 const ai=context.__NFSU2_AI__,modules=[],harvested={};
 for(const[revision,file,inputPin,expected]of pins){
  const raw=fs.readFileSync(path.join(workspace,file)),before=Buffer.from(raw),originalHash=hash(raw);assert.equal(originalHash,inputPin,'Exact original module '+revision);
  let patched=Buffer.from(await ai.patchBytes(raw));
  if(revision==='93af6ccb')patched=Buffer.from(await context.__NFSU2_RACE_CAPTURE__.patchModule(patched,context.__NFSU2_NEXT_PROFILE__));
  let config=null;
  if(context.__NFSU2_FORWARD_NATIVE_CONFIG__?.select?.(originalHash)){
   config=context.__NFSU2_FORWARD_NATIVE_CONFIG__.select(originalHash);assert.ok(context.__NFSU2_FORWARD_NATIVE_PATCHER__&&config);
   assert.equal(config.helpers.length,['8abf9be8','93cfc6e9','aa2429fb'].includes(revision)?26:22,'Reviewed appended helper count '+revision);
   assert.equal(config.globals.count,['8abf9be8','93cfc6e9','aa2429fb'].includes(revision)?581:571,'Reviewed appended global count '+revision);
   assert.equal(config.types.count,0,'No new native function signatures '+revision);
   patched=Buffer.from(await context.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(patched,{verifiedOriginalHash:originalHash}));
  }
  assert.deepEqual(raw,before);const outputHash=hash(patched),previous=previousRelease.modules.find(row=>row.revision===revision);if(previous)assert.equal(previous.inputSha256,originalHash);else assert.ok(['93cfc6e9','aa2429fb'].includes(revision));if(!harvest)assert.equal(outputHash,outputPins[revision],'Exact complete v0.38.4 output '+revision);
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
  const v0382=releaseV0382.modules.find(row=>row.revision===revision);if(v0382)assert.equal(outputHash,v0382.outputSha256,'Every previous complete v0.38.2 output remains identical '+revision);else assert.equal(revision,'aa2429fb');
  let previousReleaseComparison=null;
  if(previous){
   let old=Buffer.from(await previousContext.__NFSU2_AI__.patchBytes(raw));if(revision==='93af6ccb')old=Buffer.from(await previousContext.__NFSU2_RACE_CAPTURE__.patchModule(old,previousContext.__NFSU2_NEXT_PROFILE__));const oldConfig=previousContext.__NFSU2_FORWARD_NATIVE_CONFIG__?.select(originalHash);if(oldConfig)old=Buffer.from(await previousContext.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(old,{verifiedOriginalHash:originalHash}));assert.equal(hash(old),previous.outputSha256,'Reproduce immutable complete v0.38.1 output '+revision);
   if(slotCorrections[revision]){const index=config.helpers.findIndex(h=>h.name==='fwg_slot');assert.ok(index>=0);const oldShape=JSON.parse(JSON.stringify(oldConfig)),newShape=JSON.parse(JSON.stringify(config)),oldBody=Buffer.from(oldShape.helpers[index].body,'base64');let expectedBody=replaceConstant(oldBody,678642880,slotCorrections[revision][0]);expectedBody=replaceConstant(expectedBody,678645504,slotCorrections[revision][1]);assert.deepEqual(Buffer.from(newShape.helpers[index].body,'base64'),expectedBody);oldShape.helpers[index].body=newShape.helpers[index].body;assert.deepEqual(newShape,oldShape,'Only folded slot helper body changes in old config '+revision);const oldSections=sections(old);assert.equal(oldSections.bodies.size,b.bodies.size);const changedFromPrevious=[];for(const[i,body]of oldSections.bodies)if(!body.equals(b.bodies.get(i)))changedFromPrevious.push(i);const helperIndex=37+a.bodies.size+index;assert.deepEqual(changedFromPrevious,[helperIndex]);for(let i=0;i<oldSections.out.length;i++)if(oldSections.out[i].id!==10)assert.deepEqual(oldSections.out[i].bytes,b.out[i].bytes);previousReleaseComparison={identical:false,onlyAuthoredSlotHelperChanged:true,helperIndex,oldFoldedCells:[678642880,678645504],correctFoldedCells:slotCorrections[revision],oldHelperSha256:hash(oldBody),newHelperSha256:hash(expectedBody),otherBodiesAndSectionsPreserved:true};}
   else{assert.deepEqual(patched,old,'Earlier complete output unchanged '+revision);previousReleaseComparison={identical:true};}
  }
  harvested[revision]=outputHash;
  modules.push({revision,previousV0382OutputSha256:v0382?.outputSha256||null,unchangedFromV0382:v0382?true:null,inputSha256:originalHash,inputBytes:raw.length,previousV0381OutputSha256:previous?.outputSha256||null,previousReleaseComparison,outputSha256:outputHash,outputBytes:patched.length,valid:true,compiled:true,changedFunctions:changed,otherNativeFunctionsPreserved:true,importsExportsDataAndTableUnchanged:true,exactAuthoredAppendVerified:true,appendedAuthoredHelpers:config?.helpers.length||0,appendedPrivateGlobals:config?.globals.count||0,appendedTypes:config?.types.count||0});
 }
 for(const name of ['__NFSU2_MODERN_PROFILE__','__NFSU2_D2FA_PROFILE__','__NFSU2_CD5_PROFILE__','__NFSU2_ABF_PROFILE__','__NFSU2_CF_PROFILE__','__NFSU2_AA_PROFILE__']){
  const profile=context[name];for(const key of ['fullTuner','dyno','nativeRaceCapture','travel'])assert.equal(profile.capabilities[key],false,name+':'+key);
 }
 assert.deepEqual(sources(),sourceHashes,'Production source changed during native verification');preserveHistorical();
 const report={version:manifest.version,checkedAt:new Date().toISOString(),kind:harvest?'reviewed native output harvest; compile-only body/section proof':'strict pinned native output verification; compile-only body/section proof',verifierSha256:hash(fs.readFileSync(__filename)),sourceHashes,sourceUnchanged:true,historicalArtifactsPreserved:historical,outputPins:harvested,modules,liveGameTested:false};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,version:report.version,kind:report.kind,modules:modules.map(x=>({revision:x.revision,outputSha256:x.outputSha256,helpers:x.appendedAuthoredHelpers,globals:x.appendedPrivateGlobals})),sourceUnchanged:true,historicalArtifactsPreserved:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
