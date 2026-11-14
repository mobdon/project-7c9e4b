'use strict';
// Definitions only. The root must review/pin this source before invoking initialize.
// Observers read actual CPU/memory. No guest store, synthetic native return or readiness repair.
const assert=require('node:assert/strict');
const STATES=new WeakMap();
const API=new Map([
 [15175,{name:'WSAStartup',target:0x71a1664d,iat:0x7833c8,nargs:2}],
 [15644,{name:'socket',target:0x71a13b91,iat:0x7833d4,nargs:3}],
 [18144,{name:'WSAIoctl',target:0x71a14489,iat:0x783414,nargs:9}],
 [15800,{name:'closesocket',target:0x71a19639,iat:0x7833d8,nargs:1}]
]);
const requiredNativeMarkers=Object.freeze([9490,11574,7510,15175,9853,15644,18144,15800,10166,11731,17624,21833]);
const IDS=new Set(requiredNativeMarkers);
const sourceScope=Object.freeze({kind:'definitions-only-normal-native-pending-client-startup',wholeEntries:[9490,17624],guestEntries:['0x585640','0x58f410'],arguments:[],ecx:0,nativeRetBytes:0,nativeEspAdvanceIncludingReturn:4,fullSessionOrReadyClaimed:false,remoteCarConstructedHere:false,platformScope:'Declared deterministic offline OS socket/address contract at actual21833 boundary, preserving original native game wrappers and21832 dispatcher.',contract:'work-update-check-20261113/native-lan-lower-init-contract-4c-v1/contract.json',largerSessionSequenceInvoked:false,forcedReadinessOrLifecycleWrites:false});
function stateOf(f){let s=STATES.get(f.memory);if(!s){s={nextCallId:1,stacks:new Map(),native:[],pendingApis:[],apis:[],events:[]};STATES.set(f.memory,s);}return s;}
function readers(f){
 const valid=(p,n)=>Number.isSafeInteger(p)&&Number.isSafeInteger(n)&&p>=0x10000&&n>=0&&p+n<=Math.min(f.memory.buffer.byteLength,0x28000000);
 const word=p=>valid(p,4)?{address:p,available:true,bits:f.get(p),signed:f.view.getInt32(p,true)}:{address:p,available:false};
 const raw=(p,n)=>valid(p,n)?{address:p,available:true,bytes:n,hex:Buffer.from(f.bytes(p,n)).toString('hex')}:{address:p,available:false,bytes:n};
 const byte=p=>valid(p,1)?{address:p,available:true,value:f.view.getUint8(p)}:{address:p,available:false};
 const snapshot=()=>({open:word(9141204),nativeSocketVersion:word(9141400),localAddress:word(8808304),client:word(8808948),clientAddress:word(8808940),host:word(8808980),online:byte(9031529)});
 return{valid,word,raw,byte,snapshot};
}
function cpuNow(f,cpu){return{address:cpu,eax:f.get(cpu),ecx:f.get(cpu+4),esp:f.get(cpu+16),eip:f.get(cpu+32)};}
function observeDispatchReturn({q,f,event,cpu,activeStage}){
 assert.equal(cpu,q.A.cpu,'Read the known enclosing translated CPU');
 const s=stateOf(f),r=readers(f),now=cpuNow(f,cpu);
 const index=s.pendingApis.findLastIndex(e=>e.returnAddress.available&&e.returnAddress.bits===now.eip&&e.entryEsp+4+4*e.api.nargs===now.esp);
 if(index<0)return null;
 const entry=s.pendingApis.splice(index,1)[0],args=entry.arguments.map(a=>a.available?a.bits:null);
 const outputs={};
 if(entry.api.name==='WSAStartup'){
  outputs.wsadata=r.raw(args[1],400);
  if(outputs.wsadata.available){outputs.version=f.view.getUint16(args[1],true);outputs.highestVersion=f.view.getUint16(args[1]+2,true);}
 }
 if(entry.api.name==='WSAIoctl'){
  outputs.bytesReturned=r.word(args[6]);outputs.sockaddr=r.raw(args[4],16);
  if(outputs.sockaddr.available){outputs.family=f.view.getUint16(args[4],true);outputs.port=f.view.getUint16(args[4]+2,true);const b=f.bytes(args[4],16);outputs.ipv4Host=((b[4]*0x1000000)+(b[5]<<16)+(b[6]<<8)+b[7])>>>0;}
 }
 const row={kind:'actual-native-IAT-platform-return',event,activeStage,entry,actual:now,actualStdcallReturn:true,actualEspAdvance:now.esp-entry.entryEsp,resultBits:now.eax,resultSigned:now.eax|0,outputs,guestWritesPerformedByObserver:false,nativeReturnSynthesized:false};
 s.apis.push(row);s.events.push(row);return row;
}
function observe({q,f,marker,activeStage,event,cpu}){
 if(!IDS.has(marker.id))return null;
 assert.equal(cpu,q.A.cpu,'Use known outer CPU, not a mutable native local');
 const s=stateOf(f),r=readers(f),now=cpuNow(f,cpu),api=API.get(marker.id);
 if(api){
  if(marker.phase==='before'){
   const entry={callId:s.nextCallId++,event,activeStage,function:marker.id,api,entryEsp:now.esp,entryEcx:now.ecx,returnAddress:r.word(now.esp),arguments:Array.from({length:api.nargs},(_,i)=>r.word(now.esp+4+4*i)),iatActual:r.word(api.iat),source:'Actual original lifted IAT wrapper entry'};
   assert(entry.arguments.every(a=>a.available),'Actual platform arguments must be readable');assert(entry.iatActual.available);assert.equal(entry.iatActual.bits,api.target,'Retain pinned bound-PE IAT target');
   s.pendingApis.push(entry);const row={kind:'native-IAT-platform-entry',entry,cpu:now,guestWritesPerformed:false};s.events.push(row);return row;
  }
  // A tail marker precedes dispatch. It is not a completed platform call.
  if(marker.phase==='after')return observeDispatchReturn({q,f,event,cpu,activeStage});
  return{kind:'native-IAT-tail-observation',event,activeStage,function:marker.id,phase:marker.phase,cpu:now,actualStdcallReturn:false};
 }
 if(marker.id===21833){if(marker.phase==='after')return observeDispatchReturn({q,f,event,cpu,activeStage});return null;}
 const stack=s.stacks.get(marker.id)||[];s.stacks.set(marker.id,stack);
 if(marker.phase==='before'){
  const nargs=marker.id===11731||marker.id===9853?4:0;
  const entry={callId:s.nextCallId++,event,activeStage,function:marker.id,entryEsp:now.esp,entryEcx:now.ecx,returnAddress:r.word(now.esp),arguments:Array.from({length:nargs},(_,i)=>r.word(now.esp+4+4*i)),before:r.snapshot()};stack.push(entry);
  const row={kind:'native-startup-entry',entry,cpu:now,guestWritesPerformed:false};s.events.push(row);return row;
 }
 const entry=stack.at(-1)||null;
 if(marker.phase!=='after')return{kind:'native-startup-tail-observation',event,activeStage,function:marker.id,phase:marker.phase,entry,cpu:now,nativeReturnObserved:false};
 if(entry)stack.pop();
 const complete=!!entry&&entry.returnAddress.available&&now.eip===entry.returnAddress.bits&&now.esp===entry.entryEsp+4;
 const row={kind:'native-startup-return',event,activeStage,function:marker.id,entry,cpu:now,nativeReturnObserved:complete,actualEspAdvance:entry?now.esp-entry.entryEsp:null,after:r.snapshot(),guestWritesPerformed:false,nativeReturnSynthesized:false};s.native.push(row);s.events.push(row);return row;
}
function getProof(f){const s=stateOf(f);return{sourceScope,nativeReturns:s.native,platformReturns:s.apis,pendingPlatformEntries:s.pendingApis,events:s.events};}
function initialize(ctx){
 const{q,stage,abi,writeJson,expectedLocalIpv4Host}=ctx,f=q.f,s=stateOf(f),r=readers(f);
 assert(Number.isInteger(expectedLocalIpv4Host)&&expectedLocalIpv4Host>0&&expectedLocalIpv4Host<=0xffffffff,'Declare the offline platform IPv4 host-order input');
 const state={completed:false,preflight:null,startup:null,pendingClient:null};
 const entriesBefore=s.native.length,apisBefore=s.apis.length;
 const actualNative=id=>s.native.slice(entriesBefore).filter(e=>e.function===id&&e.nativeReturnObserved).at(-1);
 const validatePlatforms=rows=>{
  const starts=rows.filter(e=>e.entry.api.name==='WSAStartup');assert(starts.length>=1,'Actual IAT WSAStartup return required');
  for(const e of starts){assert.equal(e.resultBits,0,'Actual platform startup success');assert(e.outputs.wsadata.available);assert.equal(e.outputs.version,e.entry.arguments[0].bits&0xffff,'Platform returns the native requested version');}
  const sockets=rows.filter(e=>e.entry.api.name==='socket');assert(sockets.length>=1,'Native address discovery must open a socket');for(const e of sockets){assert.notEqual(e.resultBits,0xffffffff,'Actual platform socket');assert.deepEqual(e.entry.arguments.map(a=>a.bits),[2,2,0],'Original native address discovery opens AF_INET UDP');}
  const routes=rows.filter(e=>e.entry.api.name==='WSAIoctl'&&e.entry.arguments[1].bits===0xc8000014);assert(routes.length>=1,'Actual native routing query required');
  for(const e of routes){assert.equal(e.resultBits,0);assert.equal(e.outputs.family,2);assert.equal(e.outputs.port,0);assert.equal(e.outputs.ipv4Host,expectedLocalIpv4Host);assert(e.outputs.bytesReturned.available);assert.equal(e.outputs.bytesReturned.bits,16);}
  const closes=rows.filter(e=>e.entry.api.name==='closesocket');for(const opened of sockets)assert(closes.some(e=>e.entry.arguments[0].bits===opened.resultBits&&e.resultBits===0),'Native address-probe socket must close through actual platform boundary');
  return{starts,sockets,routes,closes};
 };
 let completed=stage('native-offline-network-startup-preflight',()=>{
  const before=r.snapshot();assert.equal(before.open.bits,0,'Use a fresh unopened native networking root');assert.equal(before.client.bits,0);assert.equal(before.host.bits,0);assert.equal(before.online.value,0);
  const iat=[...API].map(([id,a])=>({id,...a,actual:r.word(a.iat)}));for(const a of iat){assert(a.actual.available);assert.equal(a.actual.bits,a.target);}
  state.preflight={before,iat,expectedLocalIpv4Host,callerOwnsOfflinePlatformInputs:true,readyOrLifecycleOutputsWritten:false};writeJson('native-pending-client-preflight.json',state.preflight);return state.preflight;
 });
 if(completed)completed=stage('native-whole9490-network-startup-and-address-discovery',()=>{
  const before=r.snapshot(),result=q.rawCall(9490,0);abi(4);const after=r.snapshot(),native=actualNative(9490);assert(native,'Observe complete original9490 return');assert.equal(native.cpu.eax&255,1);assert.equal(after.open.bits,1);assert.equal(after.localAddress.bits,expectedLocalIpv4Host);assert.equal(after.client.bits,before.client.bits);assert.equal(after.online.value,before.online.value);
  const platform=validatePlatforms(s.apis.slice(apisBefore));assert(actualNative(11574));assert(actualNative(7510));assert(actualNative(9853));
  state.startup={wholeNativeReturned:true,entry:9490,guest:'0x585640',...result,before,after,native,platform,nativeCalleeEspAdvance:4,callerReclaimsBytes:0,platformOutputsReadFromActualBoundary:true,fullSessionClaimed:false};writeJson('native-network-startup-proof.json',state.startup);return state.startup;
 });
 if(completed)completed=stage('native-whole17624-pending-client-initializer',()=>{
  const before=r.snapshot(),firstApi=s.apis.length,result=q.rawCall(17624,0);abi(4);const after=r.snapshot(),native=actualNative(17624);assert(native,'Observe complete original17624 return');assert.equal(after.open.bits,1);assert.equal(after.client.bits,1);assert.equal(after.clientAddress.bits,expectedLocalIpv4Host);assert.equal(after.host.bits,before.host.bits);assert.equal(after.online.value,before.online.value);
  const newApis=s.apis.slice(firstApi);const routes=newApis.filter(e=>e.entry.api.name==='WSAIoctl'&&e.entry.arguments[1].bits===0xc8000014);assert(routes.length>=1,'17624 must obtain native local address through11731/10166, not a supplied native helper result');for(const e of routes){assert.equal(e.resultBits,0);assert.equal(e.outputs.ipv4Host,expectedLocalIpv4Host);assert.equal(e.outputs.bytesReturned.bits,16);}
  assert(actualNative(11731));assert(actualNative(10166));validatePlatforms(s.apis.slice(apisBefore));assert.equal(s.pendingApis.length,0,'Every witnessed platform entry must have an actual stdcall return');
  state.pendingClient={wholeNativeReturned:true,entry:17624,guest:'0x58f410',...result,before,after,native,newPlatformReturns:newApis,nativeCalleeEspAdvance:4,callerReclaimsBytes:0,pendingClientStateProducedByOriginal:true,sessionReady:false,onlineSessionClaimed:false,gameCarOrControllerCreated:false};writeJson('native-pending-client-proof.json',state.pendingClient);return state.pendingClient;
 });
 state.completed=completed===true;
 writeJson('native-pending-client-startup-witness.json',{...getProof(f),state});
 return{completed,state};
}
module.exports={sourceScope,requiredNativeMarkers,observe,observeDispatchReturn,getProof,initialize};
