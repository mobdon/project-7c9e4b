'use strict';
// File/JSON/raw-byte parsing only. Never imports or executes game/runtime/harness code.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../../work-online-v0426/native-review/port-core.cjs');
const ROOT=path.resolve(__dirname,'../..'),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const read=p=>fs.readFileSync(path.join(ROOT,p)),json=p=>JSON.parse(read(p)),sha=p=>C.sha(read(p));
const rawPath='work-update-check-20261113/live-build-4c35f9f5/game.wasm',candidatePath='work-update-check-20261113/4c-private-composed-v2/candidate-composed.wasm';
const raw=read(rawPath),candidate=read(candidatePath),p=C.I.inspect(raw,38),q=C.I.inspect(candidate,38);
assert.equal(C.sha(raw),'40a1813c7d7a64ab5af3259f680b165c291a50b68284ab502853a81379baf7a8');
assert.equal(C.sha(candidate),'6d93db9aae9308f6b4b51686309de4bcfc4b9d2f698c47099de1083c9621ae23');
const frozen='work-update-check-20261113/current-native-combined-observer-4c-v2',manifestPath='work-update-check-20261113/native-combined-observer-output-4c-v2/frozen-output-manifest.json',manifest=json(manifestPath);
assert.equal(manifest.condition,frozen);assert.equal(manifest.fileCount,138);
for(const [file,expected]of Object.entries(manifest.pins))assert.equal(sha(frozen+'/'+file),expected,file);
const journalPath=frozen+'/replay-context-diagnostics.jsonl',rawDiagnosticsPath=frozen+'/replay-context-diagnostics-raw.bin',receiptPath=frozen+'/replay-context-diagnostics-receipt.json';
const receipt=json(receiptPath),journal=read(journalPath).toString().trim().split(/\r?\n/).map(JSON.parse),diagnosticBytes=read(rawDiagnosticsPath);
assert.equal(C.sha(diagnosticBytes),receipt.raw.sha256);assert.equal(sha(journalPath),receipt.journal.sha256);assert.equal(journal.length,166);
let verifiedSpans=0;
for(const row of journal){
  const spans=[row.lowMemory,...Object.values(row.globals).map(g=>g.raw),row.cpu.raw,row.cpu.stack];
  for(const span of spans){assert(span&&Number.isInteger(span.offset)&&Number.isInteger(span.length));assert.equal(C.sha(diagnosticBytes.subarray(span.offset,span.offset+span.length)),span.sha256);verifiedSpans++;}
  for(const g of Object.values(row.globals))assert.equal(g.value,0);
}
const selected=[72,73].map(sequence=>{
  const r=journal.find(x=>x.sequence===sequence);assert(r);
  return {sequence,label:r.label,globals:Object.fromEntries(Object.entries(r.globals).map(([key,g])=>[key,g.value])),lowMemoryRaw:r.lowMemory,words:Object.fromEntries(Array.from({length:26},(_,i)=>[i*4,diagnosticBytes.readUInt32LE(r.lowMemory.offset+i*4)]))};
});
assert(Object.values(selected[0].words).every(x=>x===0));
for(const [key,value]of Object.entries(selected[1].words))assert.equal(value,Number(key)===0?268749792:[4,24,44,64,84].includes(Number(key))?2:0);
const poolPath=frozen+'/native-pool-allocations.jsonl',poolRows=read(poolPath).toString().trim().split(/\r?\n/).map(JSON.parse),poolEvidence=poolRows.find(x=>x.event===1032);
assert.equal(poolEvidence.result,268749792);assert.equal(poolEvidence.returnAddress,6159712);assert.equal(poolEvidence.pool,268749744);
const cppPath=frozen+'/native-World-static-CPP-proof.json',cpp=json(cppPath),managerProof=cpp.completed.find(x=>x.initializer===11290);
assert.equal(managerProof.headerHex,'00'.repeat(96));
for(const id of [4722,5349,6000])assert(!cpp.selectedRelativeOrder.includes(id));
const listProofs=cpp.completed.filter(x=>[6757,6914].includes(x.initializer));assert.equal(listProofs.length,2);
for(const proof of listProofs)for(const h of proof.heads){assert.equal(h.next,h.address);assert.equal(h.previous,h.address);}
const extractionFiles=fs.readdirSync(__dirname).filter(f=>/^extraction-.*\.json$/.test(f));
const ids=[...new Set(extractionFiles.flatMap(f=>JSON.parse(fs.readFileSync(path.join(__dirname,f))).rows.map(r=>r.index)))].sort((a,b)=>a-b);
const bodies=ids.map(index=>{const body=p.bodies.get(index);assert.deepEqual(body,q.bodies.get(index));return{index,bytes:body.length,sha256:C.sha(body),rawCandidateExact:true,directCalls:C.decode(body).flatMap(o=>o.operands.filter(x=>x.role==='call').map(x=>({at:o.at,function:x.value})))}});
const mapPath='work-update-check-20261113/raw-d396-4c-source-map-v1/comparison.json',map=json(mapPath).guestMap.rows;
const guestMapping=map.filter(r=>[4722,5349,6000,5214,11290,3321,9904,1530,13829,3760,5867].includes(r.next?.index));
const vectorConstants=index=>C.decode(p.bodies.get(index)).filter(o=>o.opcode===253&&o.operands.some(x=>x.role==='subopcode'&&x.value===12)).map(o=>({at:o.at,hex:o.hex,words:Array.from({length:4},(_,i)=>Buffer.from(o.hex,'hex').readUInt32LE(2+i*4))}));
const sharedPath='work-update-check-20261113/native-combined-allocator-failure-source-4c-v1/contract-v2.json',shared=json(sharedPath);
assert.equal(sha(sharedPath),'5c32caa199b4543cc67fcf6c257be5084b16b69c6c3961ac4cee3ece5804d278');
for(const pin of shared.pins)assert.equal(sha(pin.file),pin.sha256,pin.file);
const peContext=JSON.parse(fs.readFileSync(path.join(__dirname,'pe-context.json')));
assert.equal(peContext.peSha256,'f9dd86c054878ce6276beb07c1fd61874f7a1e4bf1f241b084c65b73e24168a7');
const inputPaths=[rawPath,candidatePath,'research/current-native-image/SPEED2.EXE','work-online-v0426/native-review/port-core.cjs',mapPath,manifestPath,journalPath,rawDiagnosticsPath,receiptPath,poolPath,cppPath,frozen+'/constructor-events.jsonl',frozen+'/world-initializer-stages.cjs','work-update-check-20261113/native-combined-observer-output-4c-v2/root-diagnostic-summary.json',sharedPath];
const pins=Object.fromEntries([...inputPaths,...fs.readdirSync(__dirname).filter(f=>fs.statSync(path.join(__dirname,f)).isFile()).map(f=>rel(path.join(__dirname,f)))].map(f=>[f,sha(f)]));
const result={
 kind:'SOURCE-ONLY-FIRST-LOW-MEMORY-WORLD-CORRUPTION-AND-GENUINE-PREREQUISITES',
 status:'FIRST-LOW-TRANSITION-SOURCE-CLOSED; FRESH-CONDITION-NOT-PREPARED-OR-EXECUTED',
 reviewer:'/root/extension_review/legacy_api_review',
 bodies,pins,
 observed:{frozenManifest:manifestPath,verifiedFrozenFiles:138,snapshots:journal.length,verifiedRawSpans:verifiedSpans,rawBytes:diagnosticBytes.length,allFourSingletonsZeroInEverySnapshot:true,firstTransition:selected,poolEvidence,managerProof,listProofs},
 firstLow0:{
  chain:[21991,1690,1530,2243,13829],nativeWorldReceiver:268913632,nativeNode:268749792,
  source:'1530 allocates the actual 24B node from pool268749744 through2243 and passes it to13829.13829 reads tail from8575940, writes node to tail[0], sets8575940=node, node.next=8575936 and node.prev=tail. An omitted sentinel initializer leaves tail0, so tail[0] is literal address0.',
  inference:'The native journal allocation result exactly equals the first observed low0 value. Stage snapshots bound this to wholeWorld, but do not independently expose the internal store instruction timing.',
  missingGenuineProducer:{initializer:5349,guestAddress:7850592,storage:[8575936,8],wholeChain:[5349,1209,13399],effect:'Original circular sentinel constructor sets both8575936 and8575940 to8575936; original wrapper registers cleanup0x781e30 via4853.',abi:{stackArguments:[],retImmediate:0,totalEspDelta:4},existingAdjacent6288Storage:[8575944,56],adjacent6288DoesNotCoverSentinel:true,originalCppTableAddress:8291204}
 },
 firstLowStatusWords:{
  chain:[21991,1690,9904],receiver:8554352,arrayPointerAddress:8554372,countAddress:8554384,
  source:'9904 appends fixed default rows to manager+20 using count at+32. The unguarded value2 store is body+2917 at array+count*20+4. With pointer0/count0 and the default table also uninitialized, the native loop produces value2 at4,24,44,64,84.13829 subsequently overwrites the record ID at0 with the actual pool node.',
  currentCpp11290:'Whole11290→9436 initializes resident7384B manager but leaves the first96B zero. It does not produce the three array allocations.',
  missingBackingProducer:{function:6000,guestAddress:4533952,entrySource:'0x452ec0 mov ecx,0x828770; jmp0x452c30',ordinaryCaller:{function:2922,wasmCallBodyOffset:1393,callReturnAddress:5762527},abi:{stackArguments:[],receiverFixedInternally:8554352,retImmediate:0,totalEspDelta:4},directDependencies:[3760,5867],allocations:[{bytes:5124,entries:256,stride:20,publishOffset:16},{bytes:60004,entries:3000,stride:20,publishOffset:24},{bytes:2004,entries:100,stride:20,publishOffset:20}],entryConstructor:{function:5214,guestAddress:4533152,effects:'id0,status3,count0; circular sentinel at entry+12/+16'},allocationFailure:'Native failure branches publish0; do not replace a failure with host-authored backing.',resourcesLoaded:false,repeatCall:'Original startup producer is one-shot; do not invoke repeatedly or leak/replace owned arrays.'},
  missingTableProducer:{initializer:4722,guestAddress:7845616,originalCppTableAddress:8290676,ordinarySource:'Original CRT initializer hashes resident strings with8185 and writes the original default hashes/names/function callbacks at8307192..8307311.',rangeUsedBy9904:[8307196,8307296],stackArguments:[],retImmediate:0,totalEspDelta:4,registersCleanup:false,returnValue:'Final original hash in EAX; no eax0 assertion is valid.',resourcesLoaded:false},
  vectorConstants:vectorConstants(6000)
 },
 minimalWholeCallProposal:{
  purpose:'Restore omitted native prerequisites in a fresh separately reviewed condition only. This is source evidence, not authorization or an execution-ready fixture.',
  originalCppRelativeOrder:[4722,11290,5349],
  existing11290MustRemain:'Retain its genuine native initialization and cleanup registration.',
  new4722:'Add whole original4722 in original CPP order before11290. It is a data initializer with no onexit registration; preserve its actual EAX.',
  new5349:'Add whole original5349 at its original CPP relative location, after valid CRT/onexit prerequisites; observe actual registration, never author sentinel links.',
  new6000:'Invoke whole original6000 once after11290 and beforeWorld1690→9904, with genuine native heap/array-constructor support already available. Observe actual arrays/header counts and allocation failure, never author owned state.',
  excludes:'No instruction here initializes replay/event singletons, fixes later null controller members, or establishes a runnable complete startup.'
 },
 sharedWorldBranchReview:{
  scopeCorrection:'10121, the render+20636 stores,7321,12794 and4499 exist in the offline1690 branch already exercised byV2 as well as the network branch. They are not newly reached solely by moving the LAN/session/lifecycle block. Newly enabled network-specific work is parent-reviewed23287→8978732 plus12460.',
  f10121:{directDependencies:[899,3686,18829,23287],lists:[{initializer:6757,head:8828328},{initializer:6914,head:8828096}],emptyListMeaning:'3686 returns ECX sentinel; frozen genuine list heads equal their sentinels, so both object loops naturally skip in this condition. Preserve native producers and re-observe any fresh condition.',ownedPools:[{stride:100,count:256,label:8005452,flags:0,publish:8827760},{stride:1296,count:32,label:8005432,flags:0,publish:8827764}],sharedNativePoolSource:sharedPath,otherWrites:[8826232,8827776,8826768],vectorConstants:vectorConstants(10121)},
  f12794:{effect:'Whole native flag9051256=1.',directDependencies:[]},
  f4499:{effect:'If8928872 is null, whole native5867 allocates1624B,4032 constructs it,4499 publishes actual result. Existing nonnull singleton is returned.',f4032:'Constructs203 eight-byte elements through3760, then scans original resident table8392416..8396671 and optional original strings. Original jump table6162152..6162179 must remain mapped; no external asset loading in this body.',vectorConstants:vectorConstants(4032),resourcesLoaded:false},
  runnableClaim:false
 },
 guestMapping,peEvidence:{file:rel(path.join(__dirname,'pe-context.json')),cppAbsoluteReferences:peContext.absoluteAddressReferences},
 limits:[
  'No native/game code, WebAssembly APIs, memory instance, runtime, harness or provider was invoked by this analysis.',
  'Earlier active-replay interpretations do not apply to this condition: replay8802488,checksum8802512,eventManager8978648,eventPool8978652 are zero in all166 snapshots.',
  'Source attribution is supported by exact bodies and frozen raw transitions; internal store timing is not an additional recorded execution trace.',
  'This report does not repair later null singletons/controllers or demonstrate online/client-report clearance. Fresh execution remains root-only after complete source review.'
 ],
 safety:{nativeExecuted:false,wasmCompiledValidatedOrInstantiated:false,memoryCreated:false,runtimeHarnessOrProviderImported:false,frozenFilesEdited:false,nativeStateAuthored:false}
};
const output=path.join(__dirname,'contract-v1.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file:rel(output),sha256:C.sha(fs.readFileSync(output)),pins:Object.keys(pins).length,bodies:bodies.length,rawSpans:verifiedSpans,status:result.status}));
