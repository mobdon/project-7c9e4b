'use strict';
// Compile-only proof of exact inputs, complete output pins, native body scope,
// unchanged .5 outputs and authored insertions. Never instantiate a full game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),ext=path.join(root,'extension'),verify=path.join(root,'verification');
assert.equal(process.argv.length,2,'No arguments accepted');
const output=path.join(verify,'release-modules-v0386-final.json');assert(!fs.existsSync(output),'Preserve existing versioned receipts');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const prior=JSON.parse(fs.readFileSync(path.join(verify,'release-modules-v0385.json'),'utf8'));
const historicalFiles=['tools/verify-release-modules-v0385.cjs','verification/release-modules-v0385.json','verification/source-reviewed-v0385.json'];
const historical=Object.fromEntries(historicalFiles.map(name=>[name,sha(fs.readFileSync(path.join(root,name)))]));
const source=()=>Object.fromEntries(fs.readdirSync(ext).sort().map(name=>{const file=path.join(ext,name);assert(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink());return[name,sha(fs.readFileSync(file))];}));
function context(read){const c=vm.createContext({console,crypto:crypto.webcrypto,WebAssembly,Uint8Array,Int32Array,Float32Array,DataView,ArrayBuffer,SharedArrayBuffer,performance,atob});for(const name of JSON.parse(read('manifest.json')).content_scripts[0].js)if(name!=='page.js')new vm.Script(read(name),{filename:name}).runInContext(c);return c;}
function priorContext(){
 const archive=path.join(workspace,'artifacts/NFSU2-Driving-Tools-v0.38.5-Desktop-Folder.zip');assert.equal(sha(fs.readFileSync(archive)),'47f7f6a0b28cafc0e606f38d7f456468b1e71052390c1f240c79719f63ee3cf1');
 const python=process.env.NFS_PYTHON||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
 const result=spawnSync(python,['-c','import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n.split("/")[-1]:z.read(n).decode("utf-8") for n in z.namelist()}))',archive],{encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr);
 const files=JSON.parse(result.stdout);
 // The packer renders README installation sections; all runtime/source code
 // is exact, and the complete immutable archive hash seals that rendered text.
 for(const[name,pin]of Object.entries(prior.sourceHashes))if(name!=='README.md')assert.equal(sha(Buffer.from(files[name])),pin,'Immutable .5 source '+name);
 return context(name=>files[name]);
}
const leb=(b,p)=>{let value=0,shift=0,x;do{x=b[p++];value+=(x&127)*2**shift;shift+=7;assert(shift<=35);}while(x&128);return{value:value>>>0,end:p};};
function parse(bytes){const sections=[],bodies=new Map();let p=8;while(p<bytes.length){const start=p,id=bytes[p++],size=leb(bytes,p);p=size.end;const data=p,end=p+size.value;assert(end<=bytes.length);if(id===10){const count=leb(bytes,p);let q=count.end;for(let i=0;i<count.value;i++){const n=leb(bytes,q);q=n.end;bodies.set(i+37,bytes.subarray(q,q+n.value));q+=n.value;}assert.equal(q,end);}sections.push({id,bytes:bytes.subarray(start,end),data:bytes.subarray(data,end)});p=end;}return{sections,bodies};}
const files={
 '6f4f1e4e':'research/legacy/game.wasm','2f0ddd3b':'research/compatibility-v011/game.wasm','78e2bb69':'research/compatibility-78e2bb69/game.wasm','93af6ccb':'research/compatibility-93af6ccb/game.wasm','3bdd9959':'nfsu2-extension/research/game-3bdd9959.wasm','d2fa4f4c':'research/compatibility-d2fa4f4c/game.wasm','cd5b74d5':'research/compatibility-cd5b74d5/game.wasm','8abf9be8':'research/compatibility-8abf9be8/game.wasm','93cfc6e9':'research/compatibility-93cfc6e9/game.wasm','aa2429fb':'research/compatibility-aa2429fb/game.wasm'
};
const AA='aa2429fb',aaPin='6fc3e86184f642d695ceb27af65132da63bb1a9744d760c89a8f48b9bea0e80e';
async function patch(c,raw,row,withShortcut){
 let bytes=Buffer.from(await c.__NFSU2_AI__.patchBytes(raw));
 if(row.revision==='93af6ccb')bytes=Buffer.from(await c.__NFSU2_RACE_CAPTURE__.patchModule(bytes,c.__NFSU2_NEXT_PROFILE__));
 if(c.__NFSU2_FORWARD_NATIVE_CONFIG__?.select(row.inputSha256))bytes=Buffer.from(await c.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(bytes,{verifiedOriginalHash:row.inputSha256}));
 if(withShortcut&&row.revision===AA)bytes=Buffer.from(await c.__NFSU2_SHORTCUT_POLICY__.patchModule(bytes,{verifiedOriginalHash:row.inputSha256}));
 return bytes;
}
function insertionProof(oldBody,newBody,hook){
 assert.equal(sha(oldBody),hook.originalHash);assert.equal(oldBody.length,hook.originalLength);
 const parts=[Buffer.from(hook.locals,'base64')];let p=hook.originalLocalsEnd;
 for(const insertion of hook.insertions){assert(insertion.offset>=p);parts.push(oldBody.subarray(p,insertion.offset),Buffer.from(insertion.bytes,'base64'));p=insertion.offset;}
 parts.push(oldBody.subarray(p));assert.deepEqual(newBody,Buffer.concat(parts));
}
(async()=>{
 const sourceHashes=source(),manifest=JSON.parse(fs.readFileSync(path.join(ext,'manifest.json'),'utf8'));assert.equal(manifest.version,'0.38.6');assert.equal(prior.version,'0.38.5');assert.equal(prior.modules.length,10);
 const current=context(name=>fs.readFileSync(path.join(ext,name),'utf8')),old=priorContext(),modules=[];
 for(const row of prior.modules){
  const raw=fs.readFileSync(path.join(workspace,files[row.revision])),before=Buffer.from(raw);assert.equal(sha(raw),row.inputSha256);const previous=await patch(old,raw,row,false);assert.equal(sha(previous),row.outputSha256,'Reproduce complete sealed .5 '+row.revision);
  const next=await patch(current,raw,row,true),pin=row.revision===AA?aaPin:row.outputSha256;assert.equal(sha(next),pin,'Pinned complete .6 '+row.revision);assert.deepEqual(raw,before);assert(WebAssembly.validate(next));
  const originalModule=await WebAssembly.compile(raw),module=await WebAssembly.compile(next);assert.deepEqual(WebAssembly.Module.imports(module),WebAssembly.Module.imports(originalModule));assert.deepEqual(WebAssembly.Module.exports(module),WebAssembly.Module.exports(originalModule));
  const a=parse(raw),b=parse(next),previousParsed=parse(previous),changed=[...a.bodies].filter(([id,body])=>!body.equals(b.bodies.get(id))).map(([id])=>id),changedFromPrevious=[...previousParsed.bodies].filter(([id,body])=>!body.equals(b.bodies.get(id))).map(([id])=>id);
  let expected=row.changedFunctions;
  if(row.revision===AA){
   expected=row.changedFunctions.filter(id=>id!==21268).concat([5206,13653,13962]).sort((x,y)=>x-y);assert.deepEqual(changedFromPrevious,[5206,13653,13962,21268,24259]);assert.deepEqual(b.bodies.get(21268),a.bodies.get(21268),'Native catchup wrapper fully restored');
   assert.equal(sha(previousParsed.bodies.get(24259)),'07d7c64653fcd73d9ac9fd6c6bf61d67405553e5713e7ffa4d0cb75c9c53d8dd');assert.equal(sha(b.bodies.get(24259)),'b77099da356626122838e96ed0338bde5ea83ef2427dbbc1f245951a609f5b0c','AA finite0..4 native-factor contract; selected-pace acknowledgement retained');
   const config=current.__NFSU2_FORWARD_NATIVE_CONFIG__.select(row.inputSha256),hooks=config.hooks.filter(h=>[13653,13962].includes(h.index));assert.equal(hooks.length,2);for(const hook of hooks){assert.equal(hook.insertions.length,3);insertionProof(a.bodies.get(hook.index),b.bodies.get(hook.index),hook);}
   const text=fs.readFileSync(path.join(ext,'shortcut-policy.js'),'utf8'),plan=JSON.parse(text.match(/const config=(.*);\nconst hash=/)[1]),original=a.bodies.get(5206);assert.equal(sha(original),plan.originalHash);const authored=Buffer.concat([Buffer.from(plan.newLocals),Buffer.from(plan.entry),original.subarray(plan.originalLocalsEnd,plan.offset),Buffer.from(plan.fragment),original.subarray(plan.offset)]);assert.deepEqual(b.bodies.get(5206),authored);
   assert.equal(b.sections.length,previousParsed.sections.length);for(let i=0;i<b.sections.length;i++)if(b.sections[i].id!==10)assert.deepEqual(b.sections[i].bytes,previousParsed.sections[i].bytes,'AA noncode section unchanged from .5');
  }else{assert.deepEqual(next,previous);assert.deepEqual(changedFromPrevious,[]);}
  assert.deepEqual(changed,expected);assert.equal(b.bodies.size,previousParsed.bodies.size);assert.equal(b.sections.length,previousParsed.sections.length);
  modules.push({revision:row.revision,inputSha256:row.inputSha256,inputBytes:raw.length,outputSha256:pin,outputBytes:next.length,previousV0385OutputSha256:row.outputSha256,unchangedFromV0385:row.revision!==AA,valid:true,compiled:true,changedFunctions:changed,changedFromV0385:changedFromPrevious,otherNativeFunctionsPreserved:true,importsExportsDataAndTableUnchanged:true,exactAuthoredAppendVerified:true,appendedAuthoredHelpers:row.appendedAuthoredHelpers,appendedPrivateGlobals:row.appendedPrivateGlobals,appendedTypes:row.appendedTypes});
 }
 assert.deepEqual(source(),sourceHashes);for(const[name,pin]of Object.entries(historical))assert.equal(sha(fs.readFileSync(path.join(root,name))),pin);
 const report={version:'0.38.6',checkedAt:new Date().toISOString(),kind:'strict complete output pins and compile-only body/section/previous-release proof',verifierSha256:sha(fs.readFileSync(__filename)),sourceHashes,sourceUnchanged:true,historicalArtifactsPreserved:historical,modules,liveGameTested:false};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({version:report.version,modules:modules.map(x=>({revision:x.revision,outputSha256:x.outputSha256,changedFromV0385:x.changedFromV0385})),sourceUnchanged:true,liveGameTested:false},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
