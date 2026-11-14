'use strict';
// Read-only independent scope reconstruction and fixture execution. Native
// modules are rebuilt only in memory; this writes review artifacts, not runtime.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),P=require('../../work-aa-profile/tools/native-proof.cjs');
const Build=require('../native/build-paced.cjs'),Product=require('../extension/paced-catchup.js');
const {PROFILES}=require('../native/paced-profile-config.cjs'),plans=require('../native/paced-plans.json');
const PIN='eac924d8447ade2ba0166d10019fda8c4ec9860dfde08bf282dec246b8d8153a';
const INPUTS={aa2429fb:'cc8d3b46da22d6dad1a99de1e1c8c8a28d3782cfcd92d01fe722a7ee4c54baed','15e5958f':'314b47584891c237f8ce7826c3424f3e2c2610131542fdda6564b6e22288db71','943ee537':'73581fa5430fae6e6b2d7276b264deed29d0ec90232c4e6d0b6b402069e086fe'};
const OUTPUTS={aa2429fb:'d04b19c0ec88b0b5ec7c57a4bfb34c04289ce216fc55cf215306121aa53b3b1b','15e5958f':'c57349e87fe7e7b98abfe80ed22aa0c05eacb082588961eece31f6c9ea8d57c7','943ee537':'02b0b494f74940265e0cc0d8222bdf9b4a9bb7154c175b74a1e861abc89c79b8'};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),digest=n=>hash(fs.readFileSync(path.join(ROOT,n)));
const TESTS=['native/paced.test.cjs','native/free-braking.test.cjs','tests/paced-catchup-integration.test.cjs','tests/catchup-shortcut-loader.test.cjs','tests/paced-catchup-controller.test.cjs'];
const SOURCES=[...new Set([path.relative(ROOT,__filename).replaceAll('\\','/'),...TESTS,
 'extension/paced-catchup.js','extension/paced-catchup-controller.js','extension/forward-driving.js','extension/forward-pacing.js','extension/forward-geometry.js','extension/forward-clamp.js','extension/forward-native-config.js',
 'native/build-paced.cjs','native/paced-catchup.js','native/paced-catchup.template.js','native/paced-build.json','native/paced-plans.json','native/paced-protocol.cjs','native/paced-publisher.cjs','native/paced-profile-config.cjs','native/paced-guard.cjs','native/paced-fixture.cjs','native/free-braking.cjs','native/free-braking-fixture.cjs','native/free-braking-tests-v0388.json','native/paced-tests-v0388.json','tests/fixtures/forward-native-world.cjs'])].sort();
const inventory=()=>Object.fromEntries(SOURCES.map(n=>[n,digest(n)]));
function authored(before,native,plan){
 const base=plan.kind==='publisher'?native:before;
 assert.equal(hash(base),plan.originalHash);assert.equal(base.length,plan.originalLength);
 const parts=[Buffer.from(plan.locals,'base64')];let cursor=plan.originalLocalsEnd;
 if(plan.kind==='publisher'){
  parts.push(Buffer.from(plan.entry,'base64'));
  for(const x of plan.insertions){assert(x.offset>=cursor&&x.offset<base.length);parts.push(base.subarray(cursor,x.offset),Buffer.from(x.bytes,'base64'));cursor=x.offset;}
 }else{
  for(const x of plan.edits){const needle=Buffer.from(x.needle,'base64');assert(x.offset>=cursor);assert.deepEqual(base.subarray(x.offset,x.offset+needle.length),needle);parts.push(base.subarray(cursor,x.offset),Buffer.from(x.replacement,'base64'));cursor=x.offset+needle.length;}
 }
 parts.push(base.subarray(cursor));const result=Buffer.concat(parts);assert.equal(hash(result),plan.outputHash);return result;
}
async function main(){
 const reportPath=path.join(ROOT,'integration/paced-native-independent-review-v0388.json');
 assert(!fs.existsSync(reportPath),'Preserve final independent review');
 const sourceHashes=inventory(),startedAt=new Date().toISOString(),rows=[];
 assert.equal(digest('extension/paced-catchup.js'),PIN);assert.equal(digest('native/paced-catchup.js'),PIN);
 for(const profile of PROFILES){
  const {raw,full}=await Build.compose7(profile),before=P.parse(full),native=P.parse(raw);
  assert.equal(hash(full),INPUTS[profile.revision]);
  const original=Buffer.from(full),next=Buffer.from(await Product.patchModule(full,{verifiedOriginalHash:profile.native.hash})),after=P.parse(next);
  assert.deepEqual(full,original);assert.equal(hash(next),OUTPUTS[profile.revision]);
  const helpers=profile.revision==='943ee537'?[24257,24266]:[24259,24268],expected=[3553,4497,4653,13653,13962,...helpers];
  const changed=[...before.bodies].filter(([id,b])=>!b.equals(after.bodies.get(id))).map(([id])=>id);
  assert.deepEqual(changed,expected);assert.equal(before.bodies.size,after.bodies.size);
  assert.deepEqual(before.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]),after.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]));
  const plan=plans[profile.native.hash];assert.equal(plan.inputModuleHash,INPUTS[profile.revision]);assert.equal(plan.outputModuleHash,OUTPUTS[profile.revision]);
  assert.deepEqual(plan.changes.map(x=>x.index).sort((a,b)=>a-b),expected);
  for(const edit of plan.changes)assert.deepEqual(authored(before.bodies.get(edit.index),native.bodies.get(edit.index),edit),after.bodies.get(edit.index));
  for(const id of [16153,21267,21268,6140,6837,13093,19579,6454])assert.deepEqual(before.bodies.get(id),after.bodies.get(id));
  assert(WebAssembly.validate(next));await WebAssembly.compile(next);
  rows.push({revision:profile.revision,inputSha256:hash(full),outputSha256:hash(next),modifiedFunctions:changed,independentAuthoredBytesReconstructed:true,allOtherFunctionsPreserved:true,allNonCodeSectionsPreserved:true,appendedPrivateGlobals:0,valid:true,compiled:true});
 }
 const run=spawnSync(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...TESTS],{cwd:ROOT,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});
 const log=(run.stdout||'')+(run.stderr||''),stamp=startedAt.replace(/[:.]/g,'-'),logName='integration/paced-native-independent-'+stamp+'.txt';
 fs.writeFileSync(path.join(ROOT,logName),log,{flag:'wx'});
 const counts={};for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const matches=[...log.matchAll(new RegExp('^# '+key+' (\\d+)\\r?$','gm'))];counts[key]=matches.length===1?Number(matches[0][1]):null;}
 const unchanged=JSON.stringify(sourceHashes)===JSON.stringify(inventory());
 assert.equal(run.status,0,log.slice(-10000));assert(unchanged,'Review input changed during independent run');
 assert.equal(counts.tests,counts.pass);assert(counts.pass>=73);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(counts[key],0);
 const report={version:'0.38.8',kind:'independent native authored-byte scope and actual-fixture review',result:'passed',findings:[],startedAt,finishedAt:new Date().toISOString(),productSha256:PIN,sourceUnchanged:unchanged,sourceHashes,
  inputOutputPins:rows,validation:{testFiles:TESTS,counts,log:logName,logSha256:hash(Buffer.from(log)),liveGameTested:false,fullGameInstantiated:false},
  contract:{paceRange:[1,2],strengthRange:[1,10],strengthStep:.25,power:'f32(f32(M*Pf32)*S)',tire:'f32(E*Pf32)',sourceCachesUnchanged:true,cornerGain:'P*sqrt(S)',nativeBrakingAssumptionUnscaled:true,sharedPublishedOwnerWord:244,privateWasmPublicationStateAdded:false,coldExtraPaceRequiresPhysicalOutputs:true,freeRoamBrakingCompensation:'a/P^2 only for owned command1 above1x; native getter and propagation preserved'},
  checks:{exactThreeV0387InputsBound:true,sevenFunctionScopeOnly:true,nativeSourceCacheWritesAbsent:true,physicalFourWheelAndPowerChassisProof:true,currentAISharedOwnerBound:true,nativeTargetAndCapUseTimeGuards:true,repeatedWithdrawalFallbackVerified:true,freeEntrySnapshotAndPostCommitFencesReviewed:true,ordinaryNetworkPermissionAndProtectedModesRetained:true,optionalPacedAndCornerLoaderFailureFallbacksVerified:true,stopNeedsAdvancingPhysicalRestoration:true},
  limits:['Offline actual-function fixtures use controlled planner/cap providers and are not a full game.','No live driving, win, speed, grip, downforce, shortcut or collision fix is established.','Known v0.38.7 track4014 wall/shortcut/corner observations remain unresolved by live v0.38.8 verification.']};
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'passed',report:reportPath,productSha256:PIN,counts,scope:rows.map(r=>({revision:r.revision,modifiedFunctions:r.modifiedFunctions}))},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
