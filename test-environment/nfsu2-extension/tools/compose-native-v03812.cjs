'use strict';
// Isolated .11 composition. Original and complete native modules stay in
// memory; only authored profiles/fragments/plans and scalar receipts are saved.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const Proof=require('../../work-aa-profile/tools/native-proof.cjs'),Replace=require('../../work-catchup-wrapper/cache-fix.cjs').replace;
const ROOT=path.resolve(__dirname,'..'),EXT=path.join(ROOT,'extension'),NATIVE=path.join(ROOT,'native'),VERIFY=path.join(ROOT,'verification'),BASELINE=path.resolve(ROOT,'../work-paced-v03811');
const hash=Proof.hash,read=p=>JSON.parse(fs.readFileSync(p,'utf8')),same=(a,b)=>assert.deepEqual(a,b);
const load=p=>{delete require.cache[require.resolve(p)];return require(p);};
function context(){const c=vm.createContext({console,crypto:crypto.webcrypto,WebAssembly,Uint8Array,Uint32Array,Int32Array,Float32Array,DataView,ArrayBuffer,SharedArrayBuffer,Atomics,performance,atob});for(const name of read(path.join(EXT,'manifest.json')).content_scripts[0].js)if(name!=='page.js')new vm.Script(fs.readFileSync(path.join(EXT,name),'utf8'),{filename:name}).runInContext(c);return c;}
function configs(source){const match=source.match(/const configs=freeze\(Object\.assign\(Object\.create\(null\),(\{.*\})\)\);/);assert(match,'Exact current three-profile shortcut registry');return{match,value:JSON.parse(match[1])};}
async function applyNpc(expectedManifestHash){
 assert.match(expectedManifestHash,/^[a-f0-9]{64}$/);const dir=path.join(ROOT,'integration/online-rival-cars-v03811'),manifestBytes=fs.readFileSync(path.join(dir,'manifest.json'));assert.equal(hash(manifestBytes),expectedManifestHash,'Final reviewed NPC artifact freeze');const manifest=JSON.parse(manifestBytes);
 for(const item of manifest.sourceFiles)assert.equal(hash(fs.readFileSync(path.join(ROOT,item.file))),item.sha256,'NPC reviewed source '+item.file);
 const artifacts=new Map();for(const item of manifest.files){const bytes=fs.readFileSync(path.join(dir,item.file));assert.equal(hash(bytes),item.sha256);const a=JSON.parse(bytes);artifacts.set(a.revision,a);}
 const apply=require('./build-online-rival-cars-v03811.cjs').applyArtifact,aaPath=path.join(EXT,'aa-profile.js'),source=fs.readFileSync(aaPath,'utf8'),before=load(aaPath),after=apply(before,artifacts.get(before.revision));
 assert.equal(after.cars.onlineRivals,true);assert.equal(after.cars.onlinePlayerOutrun,true);
 const match=source.match(/const profile=(\{.*\});const freeze=/);assert(match,'Exact captured AA profile source shape');const next=source.replace(match[0],'const profile='+JSON.stringify(after)+';const freeze=');
 fs.writeFileSync(aaPath,next);same(load(aaPath),after);
 // Both family profiles intentionally inherit the captured AA authored body.
 // Their own verified host metadata overrides must reproduce each artifact.
 const familyPath=path.join(EXT,'family-profiles.js'),familyBefore=fs.readFileSync(familyPath),family=load(familyPath).profiles;assert.equal(family.length,2);
 for(const p of family)same(apply(p,artifacts.get(p.revision)),p);
 same(fs.readFileSync(familyPath),familyBefore);
 const receipt={version:'0.38.12',manifestSha256:expectedManifestHash,profiles:[after,...family].map(p=>({revision:p.revision,contactHash:hash(Buffer.from(p.wall.bridge)),onlineRivals:p.cars.onlineRivals,onlinePlayerOutrun:p.cars.onlinePlayerOutrun,mailboxBytes:p.cars.bytes})),aaProfileSha256:hash(fs.readFileSync(aaPath)),familyProfileSourceUnchanged:true,liveVerified:false};
 fs.writeFileSync(path.join(VERIFY,'npc-profile-integration-v03811.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
}
async function repinShortcut(){
 const file=path.join(EXT,'shortcut-policy.js'),source=fs.readFileSync(file,'utf8'),frozen=fs.readFileSync(path.join(BASELINE,'extension/shortcut-policy.js'),'utf8'),before=configs(frozen).value,provided=configs(source),next=JSON.parse(JSON.stringify(before)),c=context(),rows=[];
 for(const p of load(path.join(NATIVE,'profile-config.cjs')).PROFILES){
  const raw=Proof.pinned(p.native),ai=Buffer.from(await c.__NFSU2_AI__.patchBytes(raw)),base=Buffer.from(await c.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(ai,{verifiedOriginalHash:p.native.hash})),plan=before[p.native.hash],parsed=Proof.parse(base),native=parsed.bodies.get(plan.index);
  assert.equal(plan.index,5206);assert.equal(native.length,plan.originalLength);assert.equal(hash(native),plan.originalHash);
  const body=Buffer.concat([Buffer.from(plan.newLocals),Buffer.from(plan.entry),native.subarray(plan.originalLocalsEnd,plan.offset),Buffer.from(plan.fragment),native.subarray(plan.offset)]),full=Replace(base,{[plan.index]:body});
  assert(WebAssembly.validate(full));await WebAssembly.compile(full);const after=Proof.parse(full);same([...parsed.bodies].filter(([id,b])=>!b.equals(after.bodies.get(id))).map(([id])=>id),[5206]);same(parsed.sections.filter(s=>s.id!==10).map(s=>s.bytes),after.sections.filter(s=>s.id!==10).map(s=>s.bytes));
  next[p.native.hash].baseModuleHash=hash(base);next[p.native.hash].expectedOutputHash=hash(full);const oldBody=Proof.parse(Proof.pinned(p.native)).bodies.get(5206);assert.equal(hash(oldBody),plan.originalHash);
  const probe={...provided.value[p.native.hash]};probe.baseModuleHash=plan.baseModuleHash;probe.expectedOutputHash=plan.expectedOutputHash;same(probe,plan);
  rows.push({revision:p.revision,sourceModuleHash:p.native.hash,aiModuleHash:hash(ai),forwardModuleHash:hash(base),completeInputHash:hash(full),branchBodySha256:hash(body),onlyAuthoredBranchFunctionChanged:5206,otherBodiesAndNonCodeSectionsPreserved:true});
 }
 const out=source.replace(provided.match[0],'const configs=freeze(Object.assign(Object.create(null),'+JSON.stringify(next)+'));');fs.writeFileSync(file,out);
 // Repin the .11-local base configuration; no authored publisher/branch bytes
 // change as a consequence of these upstream composition hashes.
 const configFile=path.join(NATIVE,'profile-config.cjs');let configSource=fs.readFileSync(configFile,'utf8');
 for(const row of rows){const p=load(configFile).PROFILES.find(p=>p.revision===row.revision);assert(configSource.includes("'"+p.completeInputHash+"'"));configSource=configSource.replace("'"+p.completeInputHash+"'","'"+row.completeInputHash+"'");}
 fs.writeFileSync(configFile,configSource);
 const afterConfig=load(configFile);for(const row of rows)assert.equal(afterConfig.PROFILES.find(p=>p.revision===row.revision).completeInputHash,row.completeInputHash);
 const check=context();for(const p of afterConfig.PROFILES){const raw=Proof.pinned(p.native),ai=await check.__NFSU2_AI__.patchBytes(raw),base=await check.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(ai,{verifiedOriginalHash:p.native.hash}),full=await check.__NFSU2_SHORTCUT_POLICY__.patchModule(base,{verifiedOriginalHash:p.native.hash});assert.equal(hash(full),p.completeInputHash);}
 const receipt={version:'0.38.12',kind:'exact unchanged authored shortcut repin after reviewed contact and TrackInfo helpers',baselineAdapterSha256:hash(Buffer.from(frozen)),adapterSha256:hash(Buffer.from(out)),profileConfigSha256:hash(fs.readFileSync(configFile)),authoredPlansUnchanged:true,modules:rows,fullGameInstantiated:false,liveVerified:false};fs.writeFileSync(path.join(VERIFY,'shortcut-repin-v03812.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;
}
async function main(){const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--npc-manifest');const npc=await applyNpc(args[1]),branch=await repinShortcut();console.log(JSON.stringify({npc,branch},null,2));}
module.exports={applyNpc,repinShortcut,context,configs};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
