'use strict';
// Pure source/PE/JSON byte parsing. Never imports a runtime, harness or provider.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),C=require('../../work-online-v0426/native-review/port-core.cjs');
const ROOT=path.resolve(__dirname,'../..'),rel=p=>path.relative(ROOT,p).replaceAll('\\','/'),read=p=>fs.readFileSync(path.join(ROOT,p)),json=p=>JSON.parse(read(p)),sha=p=>C.sha(read(p));
const priorPath='work-update-check-20261113/native-combined-null-owner-source-4c-v1/contract-v1.json',prior=json(priorPath);
assert.equal(sha(priorPath),'1ed4e4ce6e116b421a341f1bd2176cf1cd16af2f8a849cb97d4d064f99ce282b');
for(const [file,expected]of Object.entries(prior.pins))assert.equal(sha(file),expected,file);
const rawPath='work-update-check-20261113/live-build-4c35f9f5/game.wasm',candidatePath='work-update-check-20261113/4c-private-composed-v2/candidate-composed.wasm',raw=read(rawPath),candidate=read(candidatePath),p=C.I.inspect(raw,38),q=C.I.inspect(candidate,38);
assert.equal(C.sha(raw),'40a1813c7d7a64ab5af3259f680b165c291a50b68284ab502853a81379baf7a8');assert.equal(C.sha(candidate),'6d93db9aae9308f6b4b51686309de4bcfc4b9d2f698c47099de1083c9621ae23');
const pePath='research/current-native-image/SPEED2.EXE',pe=read(pePath);assert.equal(C.sha(pe),'f9dd86c054878ce6276beb07c1fd61874f7a1e4bf1f241b084c65b73e24168a7');
const u16=p=>pe.readUInt16LE(p),u32=p=>pe.readUInt32LE(p),coff=u32(60)+4,opt=coff+20,base=u32(opt+28),sections=[];
for(let i=0;i<u16(coff+2);i++){const at=opt+u16(coff+16)+40*i;sections.push({va:base+u32(at+12),raw:u32(at+20),bytes:u32(at+16)});}
const off=a=>{const s=sections.find(s=>a>=s.va&&a<s.va+s.bytes);assert(s);return s.raw+a-s.va;};
const word=a=>u32(off(a)),cstring=a=>{const start=off(a),end=pe.indexOf(0,start);assert(end>=start&&end-start<128);return pe.toString('ascii',start,end);};
const mapPath='work-update-check-20261113/raw-d396-4c-source-map-v1/comparison.json',map=json(mapPath).guestMap.rows,guest=id=>{const r=map.find(x=>x.next?.index===id);assert(r);return r.address;};
const frozenWorldPath='work-update-check-20261113/current-native-ordered-world-history-4c-v2/world-initializer-stages.cjs',worldText=read(frozenWorldPath).toString(),selected=JSON.parse(worldText.match(/cppOrder:(\[[^\]]+\])/)[1]);
const cppStart=8290304,cppEnd=8293588,tableRows=Array.from({length:(cppEnd-cppStart)/4},(_,slot)=>({slot,address:cppStart+slot*4,guest:word(cppStart+slot*4)}));
const selectedPlus=[...new Set([...selected,4722,5349])].map(id=>{const rows=tableRows.filter(r=>r.guest===guest(id));assert.equal(rows.length,1);return{id,guest:guest(id),...rows[0]};});
const proposedOrder=[...selectedPlus].sort((a,b)=>a.slot-b.slot).map(x=>x.id);
assert(proposedOrder.indexOf(4722)===proposedOrder.indexOf(16761)+1);assert(proposedOrder.indexOf(11290)===proposedOrder.indexOf(4722)+1);
assert(proposedOrder.indexOf(5349)===proposedOrder.indexOf(5035)+1);assert(proposedOrder.indexOf(5662)===proposedOrder.indexOf(5349)+1);
const relevant=[15176,18768,5268,2922,6000,4722,11290,9436,5349,1209,13399,3321,5214,3760,5867,8185,3446,6029,11472];
const bodies=relevant.map(index=>{const b=p.bodies.get(index);assert.deepEqual(b,q.bodies.get(index));return{index,bytes:b.length,sha256:C.sha(b),rawCandidateExact:true,directCalls:C.decode(b).flatMap(o=>o.operands.filter(x=>x.role==='call').map(x=>({at:o.at,function:x.value})))};});
const calls=index=>bodies.find(b=>b.index===index).directCalls;
assert(calls(2922).some(c=>c.function===6000&&c.at===1393));assert.equal(calls(5268).filter(c=>c.function===2922).length,2);assert.equal(calls(18768).filter(c=>c.function===5268).length,2);assert(calls(18768).some(c=>c.function===15176));
const hash=s=>{if(!s.length)return 0xffffffff;let n=s.charCodeAt(0)-33;for(let i=1;i<s.length;i++)n=(Math.imul(n,33)+s.charCodeAt(i))|0;return n>>>0;};
const specs=[
 [7897572,7897568,4463344,4212736],
 [7897556,7897548,4463424,4212736],
 [7897532,7897524,4463600,4212736],
 [7897508,7897500,4463744,4463872],
 [7897484,7897476,4463920,4212736],
 [7897460,7897448,4464272,4464448]
];
const defaultRows=specs.map(([genericAddress,nameAddress,constructor,destructor],i)=>{const address=8307192+i*20,generic=cstring(genericAddress),name=cstring(nameAddress);return{address,genericAddress,generic,nameAddress,name,initialPeWords:Array.from({length:5},(_,j)=>word(address+j*4)),expectedNativeWords:[hash(generic),hash(name),nameAddress,constructor,destructor]};});
assert.deepEqual(defaultRows[0].initialPeWords,[0,0,7897568,4463344,4212736]);assert(defaultRows.slice(1).every(r=>r.initialPeWords.every(v=>v===0)));
const diagnosticDir='work-update-check-20261113/current-native-combined-observer-4c-v2',journalPath=diagnosticDir+'/replay-context-diagnostics.jsonl',rawDiagnosticsPath=diagnosticDir+'/replay-context-diagnostics-raw.bin',journal=read(journalPath).toString().trim().split(/\r?\n/).map(JSON.parse),bytes=read(rawDiagnosticsPath),row=journal.find(r=>r.sequence===73);
assert.equal(C.sha(bytes.subarray(row.lowMemory.offset,row.lowMemory.offset+row.lowMemory.length)),row.lowMemory.sha256);
const lowStatusOffsets=[4,24,44,64,84,104];for(const a of lowStatusOffsets)assert.equal(bytes.readUInt32LE(row.lowMemory.offset+a),2);
const newFiles=fs.readdirSync(__dirname).filter(f=>fs.statSync(path.join(__dirname,f)).isFile()).map(f=>rel(path.join(__dirname,f)));
const sourcePaths=[priorPath,rawPath,candidatePath,pePath,mapPath,frozenWorldPath,journalPath,rawDiagnosticsPath,'work-online-v0426/native-review/port-core.cjs'];
const pins=Object.fromEntries([...sourcePaths,...newFiles].map(file=>[file,sha(file)]));
const result={
 kind:'SOURCE-ONLY-GENUINE-WORLD-PREREQUISITE-ORDER-DERIVATIVE',status:'SOURCE-CLOSED-MINIMAL-CALL-PROPOSAL; NO-CONDITION-PREPARED-OR-EXECUTED',reviewer:'/root/extension_review/legacy_api_review',pins,bodies,
 priorEvidence:{file:priorPath,sha256:sha(priorPath),allPriorPinsVerified:Object.keys(prior.pins).length,priorFrozenEvidenceUnchanged:true},
 ancestry:{
  sourceChain:[18768,5268,2922,6000],
  requiredPredecessor:'18768 calls15176 (ordinary CRT initialization) before5268.15176 first processes C initializer table8293592..8293615 with error-return handling, registers an ordinary cleanup via4853, then processes CPP table8290304..8293587 in ascending address order. Therefore genuine static4722/11290/5349 precede the ordinary6000 setup.',
  controlFlow:'Both duplicated5268→2922 callsites are mutually exclusive branches of15597; both duplicated18768→5268 callsites are mutually exclusive success/error-report branches around15176.2922 has one unconditional6000 tail call after its other initialization calls. Do not interpret duplicated static callsites as repeated construction.',
  callsites:{f18768:calls(18768).filter(x=>[15176,5268].includes(x.function)),f5268:calls(5268).filter(x=>x.function===2922),f2922:calls(2922).filter(x=>x.function===6000)},
  ordinary6000ReturnAddress:5762527,
  broadAncestorsMustNotBeCalled:'18768/15176/5268/2922 perform broad CRT/application startup. They supply ordering evidence only; calling them would repeat existing initialization and exceed this minimal proposal.'
 },
 originalCppTable:{start:cppStart,endExclusive:cppEnd,selectedEntries:selectedPlus.sort((a,b)=>a.slot-b.slot),existingSelectedOrder:selected,proposedSelectedOrder:proposedOrder,correction:'5349 is slot225, before existing5662 slot227. Existing6288 is slot231 at8291228, not the next table slot after5349.'},
 native4722:{
  role:'Static data initialization, not manager/array construction.',
  insertion:{after:16761,before:11290,cppSlot:93,tableAddress:8290676,guestAddress:7845616},
  abi:{stackArguments:[],retImmediate:0,totalEspDelta:4,EAX:'Actual final8185 hash of PowerSlide; preserve and record it. Do not assert0, receiver, or synthetic success.',expectedEaxFromStaticHash:hash('PowerSlide')},
  directDependency:8185,registersOnexit:false,allocates:false,invokesPointedConstructors:false,
  writes:'First20B row already has name/constructor/destructor in static PE data;4722 computes its generic and short-name hashes. The remaining five20B rows start all-zero in static PE;4722 writes their hashes and original name/constructor/destructor constants. No manager8554352 fields are written.',
  rows:defaultRows,
  rowCount:6,recordBytes:20,tableRange:[8307192,8307312],consumedHashAddresses:defaultRows.map(r=>r.address+4),
  correctionToPriorWindow:'The prior report inspected literal low memory only through100. Frozen sequence73 also has low104=2.9904 consumes six short-name hashes through8307296 inclusive, not five rows ending before8307296.',
  readOnlyPostCheck:'Compare120B of actual post-return native table with these source-derived expectedNativeWords; preserve actual bytes on mismatch. No cleanup-table movement is expected from4722.'
 },
 native11290:{
  role:'Existing resident manager constructor wrapper and sole original cleanup registration for this manager.',
  chain:[11290,9436],storage:[8554352,7384],cppSlot:135,tableAddress:8290844,
  constructorEffects:'9436 clears the manager prefix, including+16/+20/+24 array pointers and+28/+32/+36 used counts, plus other internal fields. It initializes resident state without allocating these arrays. Its range is disjoint from the default table at8307192.',
  cleanup:{function:3321,guestAddress:7871408,registeredBy:11290,additionalRegistrationBy6000:false},
  rule:'Retain the existing whole11290 exactly once. Never call9436 separately or repeat11290 after6000; that would discard the native owned array pointers.'
 },
 native5349:{
  role:'Whole original8B circular list-sentinel initializer wrapper.',
  insertion:{after:5035,before:5662,cppSlot:225,tableAddress:8291204,guestAddress:7850592},
  storage:[8575936,8],wholeChain:[5349,1209,13399],abi:{stackArguments:[],retImmediate:0,totalEspDelta:4},cleanupCallback:0x781e30,
  readOnlyChecks:'Assert fresh sentinel words are0 before the whole wrapper; after return require both actual links equal8575936 and one genuine onexit insertion with original callback0x781e30. Never call1209/13399 separately and never rerun5349 after1530 starts populating the list.',
  disjointFrom6288:'Existing6288 constructs the adjacent object at8575944; it does not own8575936/+4.'
 },
 native6000:{
  role:'Ordinary native one-time backing allocation for the already-constructed manager.',
  concreteInsertion:'Add a separate stage once after the complete existing CPP prefix/query-registry/suffix sequence and before wholeWorld21991→1690; before the existing pre-World query-manager/LAN/session/lifecycle block is a concrete available insertion point. Do not add6000 as a CPP wrapper and do not invoke its broad ancestors.',
  after:[4722,11290,5349],before:[21991,1690,9904],
  abi:{stackArguments:[],receiverFixedInternally:8554352,retImmediate:0,totalEspDelta:4,EAX:'Record actual EAX without assuming a documented result; pointer publications are the source-backed outputs.'},
  directDependencies:[5867,3760],entryConstructor:{function:5214,guest:4533152,destructorGuest:4533184,fields:'id0,status3,count0; next/prev point to entry+12'},
  arrays:[{publishOffset:16,entries:256,stride:20,requestedBytes:5124},{publishOffset:24,entries:3000,stride:20,requestedBytes:60004},{publishOffset:20,entries:100,stride:20,requestedBytes:2004}],
  ownership:'Each5867 result is a raw native CRT allocation.6000 writes entry count at raw[0], constructs from raw+4 with3760, and publishes raw+4. Unlike game allocator19280 pool pointers, these array allocations are from5867; validate rawPointer=arrayPointer-4 against actual live heap provenance and bounds.',
  failure:'Each allocation may independently fail and native6000 publishes0 for that array. Earlier successful arrays remain owned by the manager. There is no return-level success flag or rollback. Preserve actual failure and stop before9904; never synthesize pointers, entries, counters or status.',
  lifetime:'Existing11290 registers3321 once.3321 first calls broad11472, then destroys each nonnull array using the count at pointer-4,20B stride and original destructor4533184, and frees pointer-4 through6029.6000 neither frees old backing nor registers extra cleanup. It is unsafe to repeat6000 on existing backing; do not call cleanup routines as a diagnostic test.',
  preChecks:'Before whole6000 require actual manager+16/+20/+24 pointers and+28/+32/+36 counts all0 after existing11290; require stage not previously completed. If nonzero, preserve state and stop, rather than rerun a constructor.',
  postChecks:'Observe three distinct nonnull actual publications; each native count prefix must equal its capacity, raw extent must cover4+capacity*20, and every freshly constructed entry must have id0/status3/count0 and an8B self sentinel at entry+12. Used manager counts remain0 until9904. Observe onexit base/end unchanged across6000.',
  afterWorldExpected:'With all six default rows initialized and empty manager backing,9904 appends six actual default records with status2 to manager+20 and count+32=6. No literal low-memory2 pattern is expected from this path.',
  resourcesLoaded:false,constructorDuplicationAvoided:true
 },
 lowMemoryCorrectionEvidence:{sequence:73,span:row.lowMemory,offsets:lowStatusOffsets,values:lowStatusOffsets.map(a=>bytes.readUInt32LE(row.lowMemory.offset+a))},
 limits:[
  'No condition was created or run. Root alone reviews and runs any fresh condition.',
  'No frozen file or prior pinned report was edited. This fresh derivative refines the original table slots and six-row extent.',
  '11472 body bytes and calls decode exactly, but WABT static decompilation failed internally. Cleanup ancestry proves lifetime ownership; broad cleanup execution is not source-approved here.',
  'Replay/event singletons and other known startup omissions remain outside this minimal proposal. No complete-startup or client-report claim follows.'
 ],
 safety:{nativeExecuted:false,wasmCompiledValidatedOrInstantiated:false,memoryCreated:false,runtimeHarnessOrProviderImported:false,nativeStateAuthored:false,frozenFilesEdited:false}
};
const output=path.join(__dirname,'contract-v1.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file:rel(output),sha256:C.sha(fs.readFileSync(output)),pins:Object.keys(pins).length,bodies:bodies.length,originalCppSlots:result.originalCppTable.selectedEntries.filter(x=>[4722,11290,5349,5035,5662,6288].includes(x.id)),finalHash:result.native4722.abi.expectedEaxFromStaticHash,rows:defaultRows.length}));
