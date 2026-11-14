'use strict';
// Host-only observations. No native call, guest write, repair or input change.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const STATES=new WeakMap(),IDS=new Set([6140,14278,19432,17403]);
const sourceScope=Object.freeze({kind:'minimum-stationary-branch-readonly-witness',driverBytes:0x790,translatedCpuBytes:344,sourceProof:'native-ai-control-provenance-d396-v1/witness-source-review-v2.json',sourceProofSha256:'e0d3f528ea192d0a84cb209de7304f7f7be189a949e2649b87f84ec086367d41',peAbiSha256:'f7d880360e5fc0c3cb962f6fcc01e082ffcc2ab51b7d15f08841bfd11dadedde',whole6520Claimed:false,storePcOrDirectWasmHelperResultClaimed:false,outputsAuthored:false});
function observe({q,f,marker,activeStage,event,cpu}){
 if(!IDS.has(marker.id))return null;
 assert.equal(cpu,q.A.cpu,'Use the known outer CPU, never a mutable parameter local');
 let state=STATES.get(f.memory);if(!state){state={nextCallId:0,stacks:new Map()};STATES.set(f.memory,state);}
 const valid=(p,n)=>Number.isSafeInteger(p)&&Number.isSafeInteger(n)&&p>=0x10000&&n>=0&&Number.isSafeInteger(p+n)&&p+n<=Math.min(f.memory.buffer.byteLength,0x28000000);
 const raw=(p,n)=>valid(p,n)?{address:p,bytes:n,available:true,hex:Buffer.from(f.bytes(p,n)).toString('hex')}:{address:p,bytes:n,available:false,reason:'Outside bounded guest memory; no substitute value supplied'};
 const word=p=>valid(p,4)?{address:p,available:true,bits:f.get(p),signed:f.view.getInt32(p,true)}:{address:p,available:false,reason:'Unavailable word'};
 const floating=p=>{const value=word(p);if(!value.available)return value;const number=f.view.getFloat32(p,true);return{...value,value:Number.isFinite(number)?number:null,classification:Number.isNaN(number)?'NaN':number===Infinity?'positive-infinity':number===-Infinity?'negative-infinity':Object.is(number,-0)?'negative-zero':'finite'};};
 const byte=(p,signed=false)=>valid(p,1)?{address:p,available:true,value:signed?f.view.getInt8(p):f.view.getUint8(p)}:{address:p,available:false,reason:'Unavailable byte'};
 const behavior=p=>({pointer:p,header:raw(p,32),staged:{roadTarget:floating(p+0x230),auxiliary1:floating(p+0x234),auxiliary2:floating(p+0x238),enabled:byte(p+0x23c)},final:{steering:valid(p+0x1e0,2)?{address:p+0x1e0,widthBytes:2,signed:f.view.getInt16(p+0x1e0,true),bits:f.view.getUint16(p+0x1e0,true)}:{address:p+0x1e0,available:false},gear:word(p+0x1e4),separateGearField:word(p+0x1e8),throttle:floating(p+0x20c),handbrake:floating(p+0x210),brake:floating(p+0x214)}});
 const refs=q.liveReferences(),esp=f.get(cpu+16),eip=f.get(cpu+32),ecx=f.get(cpu+4),stack=state.stacks.get(marker.id)||[];state.stacks.set(marker.id,stack);
 let entry=null,returnObservation=null;
 if(marker.phase==='before'){
  const argCount=marker.id===6140?4:marker.id===14278?1:0,args=Array.from({length:argCount},(_,i)=>word(esp+4+4*i));
  entry={callId:state.nextCallId++,entryEvent:event,entryEsp:esp,entryEip:eip,entryEcx:ecx,returnAddress:word(esp),arguments:args,actualDriverAtEntry:refs.driver,actualBehaviorAtEntry:refs.behavior};
  if(marker.id===6140)entry.fourthArgumentLowByte=args[3]?.available?args[3].bits&255:null;
  if(marker.id===6140)entry.argumentRoles=['native staged road-target float bits','native staged auxiliary float bits','native staged auxiliary float bits','full native word; control-enable consumes only its low byte'];
  if(marker.id===14278)entry.progressContext={receiver:ecx,driverArgument:args[0],receiverEqualsArgumentPlus54:args[0]?.available?ecx===args[0].bits+0x54:null,argumentEqualsActualLiveDriver:args[0]?.available?args[0].bits===refs.driver:null};
  stack.push(entry);
 }else{
  entry=stack.at(-1)||null;
  if(marker.phase==='after'){
   if(entry)stack.pop();
   const expectedAdvance=marker.id===6140?20:marker.id===14278?8:null,returnMatches=entry?.returnAddress?.available?eip===entry.returnAddress.bits:null;
   returnObservation={pairedEntryAvailable:!!entry,entryCallId:entry?.callId??null,entryEvent:entry?.entryEvent??null,originalGuestReturnAddress:entry?.returnAddress??null,actualEip:eip,returnAddressMatches:returnMatches,entryEsp:entry?.entryEsp??null,actualEsp:esp,expectedNativeEspAdvance:expectedAdvance,actualEspAdvance:entry?esp-entry.entryEsp:null,expectedEspMatches:entry&&expectedAdvance!==null?esp===entry.entryEsp+expectedAdvance:null,nativeReturnObserved:returnMatches===true&&(expectedAdvance===null?esp>entry.entryEsp:esp===entry.entryEsp+expectedAdvance)};
   if(marker.id===14278)returnObservation.progressLowByteEax=returnObservation.nativeReturnObserved?{bits:f.get(cpu)&255,meaning:'Actual translated native AL result after RET4; no direct Wasm helper result inferred'}:{available:false,reason:'Complete native return not witnessed'};
  }else if(marker.phase==='tail'){
   if(entry)stack.pop();returnObservation={pairedEntryAvailable:!!entry,entryCallId:entry?.callId??null,tailTransferObserved:true,nativeReturnObserved:false,meaning:'Observation before original tail transfer; no routine completion claimed'};
  }
 }
 const driver=refs.driver,actualAiDriver=refs.nativeAiDriverVerified===true&&valid(driver,0x790),driverSnapshot={pointer:driver,source:'Actual current car+0x2c via q.liveReferences; verified kind3/vtable/backlink required for1936-byte AI object',nativeAiDriverVerified:refs.nativeAiDriverVerified===true,fullBytes:actualAiDriver?raw(driver,0x790):{address:driver,bytes:0x790,available:false,reason:'Actual live AI-driver identity/extent not verified'}};
 if(actualAiDriver){
  const offsets=[0x6e0,0x6e4,0x6e8,0x6f0,0x6f4,0x6f8,0x6fc,0x710,0x71c,0x734,0x754,0x75c,0x760,0x770,0x77c,0x780],fields=Object.fromEntries(offsets.map(offset=>['0x'+offset.toString(16),word(driver+offset)]));driverSnapshot.tailFields=fields;driverSnapshot.stopLatch=byte(driver+0x710);
  const work=f.get(driver+0x6e4),index=byte(work+0x308,true),selectedAddress=index.available&&Number.isSafeInteger(work+index.value*0x30+0x18)?work+index.value*0x30+0x18:null;
  driverSnapshot.progressWork={pointer:work,pointerFieldAddress:driver+0x6e4,bytes:raw(work,0x310),signedIndex:index,selectedMetricAddress:selectedAddress,selectedMetric:selectedAddress===null?{available:false,reason:'No readable native signed index'}:floating(selectedAddress),indexWasNotClampedOrReplaced:true};
  const route=f.get(driver+0x6e8),count=word(route+4),terminalCell=count.available&&Number.isSafeInteger(route+4+4*count.bits)?route+4+4*count.bits:null,terminalPointer=terminalCell===null?{available:false,reason:'No readable native count'}:word(terminalCell),node=terminalPointer.available?terminalPointer.bits:null;
  driverSnapshot.privateRoute={pointer:route,pointerFieldAddress:driver+0x6e8,descriptorBoundToActualDriver:route===driver+0x370,descriptor:raw(route,8),count,terminalPointerCellAddress:terminalCell,terminalPointer,node:node===null?{available:false,reason:'No readable actual terminal pointer'}:raw(node,0x68),terminalMetric:node===null?{available:false,reason:'No actual terminal pointer'}:floating(node+0x54),nodeBacklink:node===null?{available:false,reason:'No actual terminal pointer'}:word(node+0x64),nodeListEnumerated:false,countOrPointerNotClampedOrReplaced:true};
 }
 const entryReceiver=entry?.entryEcx??null,selectedBehavior=marker.id===6140&&entryReceiver!==null?entryReceiver:refs.behavior;
 const row={kind:'minimum-native-stationary-branch-witness',sourceScope,event,activeStage,function:marker.id,phase:marker.phase,cpuSnapshotSource:'Known outer q.A.cpu',cpu:{address:cpu,esp,eip,ecx,eax:f.get(cpu)},entry,returnObservation,references:refs,driver:driverSnapshot,entryReceiverStillActualDriver:entryReceiver===null?null:entryReceiver===refs.driver,behavior:behavior(selectedBehavior),behaviorPointerSource:marker.id===6140?'Saved native6140 entry ECX; never current mutable ECX':'Actual live car behavior via q.liveReferences',actualLiveBehavior:selectedBehavior!==refs.behavior?behavior(refs.behavior):null,globals:[8506248,8506260,8506220,8802700,9037744,9037784,8978696,9037752].map(word),race:{pointer:refs.race,header:raw(refs.race,128)},complete6140Scope:marker.id===6140?'Complete composed6140 includes real helper24928 after native staged stores; no interior-store or direct helper-return observation is claimed':null,guestWritesPerformed:false,nativeCallsAdded:false,inputOrClockChanged:false};
 fs.appendFileSync(path.join(__dirname,'minimum-branch-witness.jsonl'),JSON.stringify(row)+'\n');return row;
}
module.exports={sourceScope,observe};
