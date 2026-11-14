'use strict';
// Pure file copy, byte hashes and JavaScript parsing. No game/runtime/provider imports or WASM APIs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm'),Module=require('node:module');
const ROOT=path.resolve(__dirname,'../..'),BASE='work-update-check-20261113/';
const parentName='current-native-combined-observer-4c-v2',name='current-native-ordered-world-history-4c-v2';
const parent=path.resolve(ROOT,BASE+parentName),target=path.resolve(ROOT,BASE+name);
const read=p=>fs.readFileSync(path.resolve(ROOT,p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const freezePath=BASE+'native-combined-observer-output-4c-v2/frozen-output-manifest.json';
assert.equal(sha(read(freezePath)),'3e95aa085395a912848274529b4a7c9f36ec6aa32d4ed9ae63bf42dfc8a7da26');
const frozen=JSON.parse(read(freezePath));assert.equal(Object.keys(frozen.pins).length,138);assert.deepEqual(fs.readdirSync(parent).sort(),Object.keys(frozen.pins).sort());
for(const[file,hash]of Object.entries(frozen.pins))assert.equal(sha(read(path.join(parent,file))),hash,file);
const prepPath=BASE+parentName+'/source-preparation.json',prep=JSON.parse(read(prepPath));
const priorExecutionPath=BASE+parentName+'/execution-source-contract.json',priorExecution=JSON.parse(read(priorExecutionPath));
for(const[file,hash]of Object.entries(priorExecution.sourcePins))assert.equal(sha(read(file)),hash,file);
const closureInputs={
  'native-preworld-network-order-source-4c-v1/ordering-assessment.json':'eb88e5e49114d14e0b3a3c42763869f5bcbe426b6dba41abf9c47c5051739e34',
  'native-preworld-network-order-source-4c-v1/shared-branch-render-review.json':'994df2b9718060f585a75e067d4d021288106686ac78a72ac31b25d57bef254c',
  'native-combined-null-context-analysis-4c-v1/frozen-null-context-analysis.json':'768a97af3b33e53483d9f951ee8df68a7377f0535ec6eb02176986821d530ac3',
  'native-combined-null-owner-source-4c-v1/contract-v1.json':'1ed4e4ce6e116b421a341f1bd2176cf1cd16af2f8a849cb97d4d064f99ce282b'
};
for(const[file,hash]of Object.entries(closureInputs))assert.equal(sha(read(BASE+file)),hash,file);
let replacingUnexecutedPreparation=false;
if(fs.existsSync(target)){
  for(const output of ['execution-source-contract.json','bounded-started.json','bounded-receipt.json','remote-condition-receipt.json'])assert(!fs.existsSync(path.join(target,output)),'Only an unexecuted, unapproved source preparation can be regenerated: '+output);
  const previous=JSON.parse(read(path.join(target,'source-preparation.json')));assert.equal(previous.condition,name);assert.equal(previous.nativeExecuted,false);assert.equal(previous.preparedOnly,true);
  assert.deepEqual(fs.readdirSync(target).sort(),[...Object.keys(previous.files),'source-preparation.json'].sort(),'Do not replace a target with additional outputs');
  for(const[file,spec]of Object.entries(previous.files))assert.equal(sha(read(path.join(target,file))),spec.sha256,file);
  replacingUnexecutedPreparation=true;
}else fs.mkdirSync(target);
const files={},sourcePins={...priorExecution.sourcePins};
const pin=p=>{const full=path.resolve(ROOT,p),key=path.relative(ROOT,full).replaceAll('\\','/');sourcePins[key]=sha(read(full));};
function put(file,value){const bytes=Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');if(file.endsWith('.cjs'))new vm.Script(Module.wrap(bytes.toString()),{filename:file});fs.writeFileSync(path.join(target,file),bytes,{flag:replacingUnexecutedPreparation?'w':'wx'});files[file]={bytes:bytes.length,sha256:sha(bytes)};pin(path.join(target,file));}
function once(text,old,value){assert.equal(text.split(old).length,2,old.slice(0,160));return text.replace(old,value);}
const changedFiles=['probe-current-native-ai.cjs','world-initializer-stages.cjs','native-legacy-enrollment.cjs','replay-context-diagnostics.cjs','run-bounded.cjs','combined-observer-source-addendum.json'];
for(const[file,spec]of Object.entries(prep.files)){const bytes=read(path.join(parent,file));assert.equal(sha(bytes),spec.sha256,file);if(!changedFiles.includes(file))put(file,bytes);}
put('history-pool-witness.cjs',read(path.join(__dirname,'history-pool-witness.cjs')));
let diagnostics=read(path.join(parent,'replay-context-diagnostics.cjs')).toString();
diagnostics=once(diagnostics,'eventPool: 8978652 });','eventPool: 8978652, extrapolatedStatePool: 8978732 });');
diagnostics=once(diagnostics,'eventPool: 64 });','eventPool: 64, extrapolatedStatePool: 64 });');
put('replay-context-diagnostics.cjs',diagnostics);
let world=read(path.join(parent,'world-initializer-stages.cjs')).toString();
world=once(world,'const result=q.rawCall(21991,receiver);abi(4);assert.equal(result.eax,receiver);assert.equal(f.get(8978560),receiver);','const historyBefore=ctx.historyWitness.beforeWorld({q});const result=q.rawCall(21991,receiver);abi(4);assert.equal(result.eax,receiver);assert.equal(f.get(8978560),receiver);const historyAfter=ctx.historyWitness.afterWorld({q,Shared,receiver});');
world=once(world,'state.world={entry:21991,core:1690,','state.world={entry:21991,core:1690,historyBefore,historyPoolProof:historyAfter,');
put('world-initializer-stages.cjs',world);
let legacy=read(path.join(parent,'native-legacy-enrollment.cjs')).toString();
legacy=once(legacy,'retainedMaximum:null,hubReportAttempt:','retainedMaximum:null,retainedMaximumExcludedFromUnit:true,hubReportAttempt:');
legacy=once(legacy,'for(const id of [22873,23139])','for(const id of [23139])');
const getterStart=legacy.indexOf('        const value=f.exports.f22873(INPUT.maximumName),tmp=Buffer.alloc(4);tmp.writeFloatLE(value);');
assert(getterStart>=0);const getterEnd=legacy.indexOf('        return{observer:proof.observerAfter,maximum:proof.retainedMaximum};',getterStart);assert(getterEnd>getterStart);
legacy=legacy.slice(0,getterStart)+'        return{observer:proof.observerAfter,retainedMaximumExcludedFromUnit:true};'+legacy.slice(getterEnd+'        return{observer:proof.observerAfter,maximum:proof.retainedMaximum};'.length);
assert(!legacy.includes('f.exports.f22873('));put('native-legacy-enrollment.cjs',legacy);
let probe=read(path.join(parent,'probe-current-native-ai.cjs')).toString();
probe=once(probe,'// SOURCE ONLY: verified legacy names/enrollment followed by192 native World/automatic observer frames.','// SOURCE ONLY: ordered network startup before World, then legacy history/enrollment only; zero movement frames and no typed maximum getters.');
probe=once(probe,"ReplayDiagnostics=require('./replay-context-diagnostics.cjs');","ReplayDiagnostics=require('./replay-context-diagnostics.cjs'),HistoryWitness=require('./history-pool-witness.cjs');");
probe=once(probe,'const replayDiagnostics=ReplayDiagnostics.create({directory:__dirname});','const replayDiagnostics=ReplayDiagnostics.create({directory:__dirname}),historyWitness=HistoryWitness.create({directory:__dirname});');
probe=once(probe,'worldContext={q,stage,abi,writeJson,Shared,state:worldState};','worldContext={q,stage,abi,writeJson,Shared,state:worldState,historyWitness};');
const networkBlock=" let pendingClient=null;if(initialized)initialized=offlinePlatform.initializeLAN({q,stage,abi});if(initialized)initialized=SessionStart.requestStart({q,stage,abi,writeJson});if(initialized){pendingClient=Lifecycle.initialize({q,stage,abi,writeJson,expectedLocalIpv4Host:offlinePlatform.localVip});initialized=pendingClient.completed;}";
probe=once(probe,networkBlock+'\n','');
probe=once(probe,' if(initialized)initialized=World.constructWholeWorld(worldContext);',networkBlock+'\n if(initialized)initialized=World.constructWholeWorld(worldContext);');
const replayLine=probe.split('\n').filter(line=>line.startsWith(' let replay=null,namedResult=null;'));assert.equal(replayLine.length,1);
probe=once(probe,replayLine[0]," let historyResult=null;if(legacy?.complete)initialized=stage('native-history-node-and-list-read-only-verification',()=>{historyResult=historyWitness.finish({q,enrollment,legacy});return historyResult;});");
const receiptLine=probe.split('\n').filter(line=>line.startsWith(" const receipt={kind:'TWO-GENUINE-CARS-OFFLINE-NATIVE-NAMED-OBSERVER-REMOTE-WORLD-APPLICATION'"));assert.equal(receiptLine.length,1);
probe=once(probe,receiptLine[0]," const receipt={kind:'OFFLINE-ORDERED-WORLD-HISTORY-ENROLLMENT-UNIT',complete:initialized&&admission?.complete===true&&legacy?.complete===true&&historyResult?.complete===true,historyResult,reportAvailabilityReady,allocatorReady,legacy,initialized,pendingClient,enrollment:enrollment.state,admission,world:worldState,stages,clockCalls,trapped,observerRecording:observerRecorder.finalize(),requestedMovementFrames:0,nativeMovementFrames:0,typedMaximumGetterCalls:0,fullStartupQualified:false,knownUnresolvedPrerequisites:['CPP5349 global list sentinel','4722 default table and6000 manager backing','replay singleton755','event manager5582/4972 and queued message pool'],nativeOutputsAuthored:false};writeJson('remote-condition-receipt.json',receipt);if(!receipt.complete)process.exitCode=1;console.log(JSON.stringify({complete:receipt.complete,initialized,lastStage:stages.at(-1)?.name,admissionFailure:admission?.failure||null,reportAvailabilityReady,allocatorReady,legacyComplete:legacy?.complete||false,legacyUnavailable:legacy?.unavailable||null,legacyFailure:legacy?.failure||null,historyComplete:historyResult?.complete||false,nativeMovementFrames:0,typedMaximumGetterCalls:0,fullStartupQualified:false}));");
assert(!probe.includes('RemoteWorld.run('));assert(!probe.includes('namedObserver.finish('));assert.equal(probe.split(networkBlock).length,2);
assert(probe.indexOf(networkBlock)>probe.indexOf('initialized=SessionStart.construct('));assert(probe.indexOf(networkBlock)<probe.indexOf('initialized=World.constructWholeWorld('));
put('probe-current-native-ai.cjs',probe);
let bounded=read(path.join(parent,'run-bounded.cjs')).toString().replaceAll(parentName,name).replaceAll('namedObserverRemoteWorldApplicationUnitOnly:true','orderedWorldHistoryEnrollmentUnitOnly:true').replaceAll('BOUNDED-NATIVE-NAMED-OBSERVER-REMOTE-WORLD-APPLICATION','BOUNDED-NATIVE-ORDERED-WORLD-HISTORY-ENROLLMENT');
put('run-bounded.cjs',bounded);
const addendum={
  kind:'SOURCE-ONLY-NARROW-ORDERED-WORLD-HISTORY-UNIT',parent:parentName,parentFrozenManifest:freezePath,condition:name,
  scope:['Move the exact existing4454→10442→9490/17624 native LAN/request/pending-client block to before the existing wholeWorld construction, after existing CRT/session/runtime/platform prerequisites.','Preserve the exact original fixture/WASM, metadata, entry hooks, scene/road/roster inputs, native factories, names, native warmup schedule, serializer and10443 decoder.','Keep the original two setup22866 calls; omit legacy22873 getter and all World replay/final retained getters.','Read native historypool8978732/header64 at every diagnostic stage. Verify its genuine1690 publication, actual2243 node allocation, and native controller list links without writing those values.'],
  branchDifference:'1690 network branch adds23287([128,50,8020800,0])→8978732 and12460 reciprocal setter8803672.10121, both RideInfo+20636 writes, both7321 calls,12794/4499 and tail allocation are shared with the frozen offline branch.',
  inputsAuthoredOrChanged:{networkStartupOrder:true,typedGetterExcluded:true,requestedMovementFrames:0,fixtureOrHooks:false,clockValuesOrWarmup:false,packetBytesTimestamps:false,nativePoolFlagHeaderLinksOrNames:false},
  unresolved:['Missing5349 sentinel initialization and4722/6000 backing remain as disclosed prior errors.','Replay755/event-manager5582 and queued-message pool prerequisites remain absent.','A history-unit pass cannot qualify full startup, prior192-frame baseline, movement, detector/client report or online acceptance.'],
  nativeExecuted:false,rootExecutionApprovalPresent:false
};
put('combined-observer-source-addendum.json',addendum);
const closure={kind:'ORDERED-WORLD-HISTORY-SOURCE-CLOSURE',condition:name,inputs:Object.fromEntries(Object.entries(closureInputs).map(([file,hash])=>[BASE+file,hash])),sourceOnly:true,nativeExecuted:false,wasmCompiledOrInstantiated:false,memoryCreated:false,
  ordinaryProducer:{historyGlobal:8978732,wholeWrapper:21991,core:1690,predicate:'Genuine pending-client8808948 output ispositive before1690',factory:23287,arguments:[128,50,8020800,0],label:'ExtrapolatedStateSlotPool',freeListOwner:3178,legacyConsumer:[10443,17795,22840,7944,2243,7474]},
  reviewRecipe:['Verify every prepared file and source pin before creating a separate root-owned execution contract.','Confirm the exact existing network block occurs once beforeWorld and afterSessionStart.construct820/9037; original earlier initialization remains inrelativeorder.','Confirm same fixture/hook/metadata hashes as frozenV2; no new native hook or instruction edits.','Confirm all added witness code only reads native memory and writes diagnostic output files.','After one root-approved run, verify native pool8978732, original128B label/header/backing, nonzero returned history node, and list links; freeze all outputs immediately.','Preserve any failure and all unrelated low-memory bytes; no proper startup or movement qualification.'],
  safety:{runtimeHarnessOrProviderImported:false,webAssemblyApiCalled:false,frozenFilesEdited:false,nativeStateRepaired:false}};
put('ordered-history-source-closure.json',closure);
for(const file of [prepPath,priorExecutionPath,freezePath,BASE+'protected-observer-inputs-4c-v7.cjs',path.join(__dirname,'prepare-static.cjs'),path.join(__dirname,'history-pool-witness.cjs'),...Object.keys(closureInputs).map(p=>BASE+p)])pin(file);
// Import review/source pins as immutable inputs, not code imports.
for(const file of Object.keys(closureInputs)){const evidence=JSON.parse(read(BASE+file)),items=Array.isArray(evidence.pins)?evidence.pins:Object.entries(evidence.pins||{}).map(([key,value])=>typeof value==='string'?{file:key,sha256:value}:{file:key,...value});for(const item of items){const input=item.file||item.path;if(input&&item.sha256){assert.equal(sha(read(input)),item.sha256,input);pin(input);}}}
assert.equal(files['prebuilt-candidate-fixture.wasm'].sha256,prep.fixtureSha256);assert.equal(files['entry-hooks.json'].sha256,prep.files['entry-hooks.json'].sha256);assert.equal(files['prebuilt-candidate-fixture-metadata.json'].sha256,prep.files['prebuilt-candidate-fixture-metadata.json'].sha256);
const actuallyChanged=Object.keys(prep.files).filter(file=>files[file]?.sha256!==prep.files[file].sha256).sort();assert.deepEqual(actuallyChanged,[...changedFiles].sort());
put('prepared-files-manifest.json',{kind:'UNEXECUTED-ORDERED-HISTORY-PREPARED-FILES',condition:name,files:{...files},selfAndSourcePreparationExcluded:true,nativeExecuted:false});
const next={...prep,kind:'SOURCE-ONLY-ORDERED-WORLD-HISTORY-ENROLLMENT-UNIT',condition:name,files,sourcePins,requestedNativeFrames:0,preparedOnly:true,nativeExecuted:false,wasmCompiledOrInstantiated:false,memoryCreated:false,rootExecutionApprovalPresent:false,
  outputNames:prep.outputNames.filter(n=>!n.startsWith('remote-world-replay')).concat(['native-ordered-history-pool-proof.json']),
  entryPlan:addendum.scope,limits:addendum.unresolved.concat(['Exactly zero movement frames and zero typed maximum getters.','Known earlier low-memory mutations are preserved; passing this unit covers only history allocation/enrollment.','Root alone may execute once under a separate8second bounded contract after independent review.']),
  assemblyNote:'Fresh unexecuted sibling of frozen combinedV2. Exact original WASM fixture retained. Existing network startup is moved beforeWorld to activate the native extrapolated-state pool producer; read-only postconditions and additional historypool diagnostics are added. Stops after legacy receiver/enrollment and original observer setup.',
  changedFromParent:actuallyChanged,addedPreparedFiles:['history-pool-witness.cjs','ordered-history-source-closure.json','prepared-files-manifest.json']};
put('source-preparation.json',next);
console.log(JSON.stringify({condition:name,target,files:Object.keys(next.files).length-1,sourcePins:Object.keys(next.sourcePins).length-1,sourcePreparationSha256:sha(read(path.join(target,'source-preparation.json'))),fixtureSha256:prep.fixtureSha256,changed:actuallyChanged,nativeExecuted:false}));
