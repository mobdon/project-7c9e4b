(function(root){
'use strict';
// Bounded read-only metadata reader. No native calls, memory writes, logging, hooks,
// timers, downloads, arming state, or control/pacing authorization.
const Profiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
const PIN='ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c';
const REVISION='3bdd9959',BITMAP=0x29779ac0,CEILING=0x28000000,PAGE=16384;
const AI=0xd0d100,MAGIC=0x3749414e,MAX_NODES=40,MAX_VTABLES=2,SLOTS=16,MAX_READ=65536;
const VTABLES=new Set([0x784a48,0x784aa0]);
const CODE_MIN=0x401000,CODE_MAX=0x782af0;
// TrackInfo is guest BUN metadata (GLOBALB chunk0x34201, native5d3eb0 /
//5d3e40 /57f240), including when the guest heap uses guest_span.h's window.
// These exact g_gwin_lo/hi bindings are already verified by the native policy
// profiles. Other route spans retain the native sampler's low-guest bounds.
const WINDOW_LOW=0x50000000,WINDOW_HIGH=0x7ffe0000;
const windowProfiles=Object.freeze({
 '14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd':695778944,
 'e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03':695784176,
 'a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8':695785168,
 'f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9':695785168,
 'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391':695785040,
 '395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e':697845680,
 '3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb':697847360,
 'f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b':697848352,
 '2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d':697849328
});
const readPhaseCodes=Object.freeze(Object.fromEntries(['memory','commit-bitmap','owned-command','race-context','network-context','network-host','race-exclusions','player-pointer','player','car','race-pointer','race','driver','route-pointer','private-route','pace-cache','route-count','node-list','track-identity','track-info-pointer','track-info','event-context','career-event','career-heat','route-node','node-vtable','road-group-pointer','road-group','road-record','game-tick','window-control'].map((name,i)=>[name,i+1])));
const readSubreasonCodes=Object.freeze(Object.fromEntries(['invalid-span','below-guest-minimum','runtime-gap','window-unavailable','span-end','linear-memory-end','uncommitted-page','unaligned-pointer','read-budget','memory-buffer-changed','commit-state-changed','snapshot-changed','host-span','window-state-changed','shared-memory-required','bitmap-unavailable'].map((name,i)=>[name,i+1])));
const phaseValues=new Set(Object.values(readPhaseCodes)),subreasonValues=new Set(Object.values(readSubreasonCodes));
function readEvidence(source){try{const phase=source?.forwardReadPhaseCode,subreason=source?.forwardReadSubreasonCode;return Number.isInteger(phase)&&phaseValues.has(phase)&&Number.isInteger(subreason)&&subreasonValues.has(subreason)?{forwardReadPhaseCode:phase,forwardReadSubreasonCode:subreason}:{};}catch{return{};}}
// Fixed denial identifiers only. Never derive telemetry from error text,
// pointers, object names, route positions or caller-provided numbers.
const guardReasons=Object.freeze(['reader-error','shared-game-memory-required','current-commit-bitmap-unavailable','guest-range','uncommitted-page','unaligned-pointer','read-budget','memory-buffer-changed','commit-state-changed','snapshot-changed','exact-current-module-required','expected-pace-required','focused-page-required','active-owned-road-ai-required','solo-road-race-required','online-host-context-unavailable','invalid-network-permission','online-permission-required','special-race-excluded','driving-owner-context-required','ai-owner-mismatch','native-driver-mismatch','private-main-route-required','pace-not-settled','native-route-capacity','track-identity-mismatch','region-identity-mismatch','career-heat-identity','career-heat-layout-mismatch','duplicate-route-node','node-distance-order','unsupported-node-vtable','vtable-budget','query-evaluator-slot-invalid','road-index-range','canonical-road-group','canonical-road-owner','non-finite-road-reference','non-finite-physical-position','non-finite-velocity','non-finite-heading','native-direction-invalid','online-context-changed']);
const guardCodes=Object.freeze({...Object.fromEntries(guardReasons.map((reason,i)=>[reason,100+i])),'node-owner-mismatch':143});
class Unavailable extends Error{constructor(reason,phase,subreason){super(reason);this.name='RouteProbeUnavailable';this.reason=reason;this.forwardReadPhaseCode=readPhaseCodes[phase];this.forwardReadSubreasonCode=readSubreasonCodes[subreason];}}
const unavailable=(reason,evidence)=>({status:'unavailable',reason,forwardGuardCode:guardCodes[reason]??100,...readEvidence(evidence),wholeRaceChecked:false});
const fail=(reason,phase,subreason)=>{throw new Unavailable(reason,phase,subreason);};
function reader(memory,profile){
 const bitmap=profile.runtime.bitmap;
 const buffer=memory?.buffer;
 if(!buffer||Object.prototype.toString.call(buffer)!=='[object SharedArrayBuffer]')fail('shared-game-memory-required','memory','shared-memory-required');
 const view=new DataView(buffer),words=new Int32Array(buffer),reads=[],pages=new Map();let bytes=0,windowUsed=false,windowState=null;
 if(buffer.byteLength<bitmap+32768)fail('current-commit-bitmap-unavailable','commit-bitmap','bitmap-unavailable');
 function windowAllowed(phase){
  const address=windowProfiles[profile.moduleHash];
  if(phase!=='track-info'||profile.capabilities.nativePolicy!==true||profile.runtime.nativePolicy?.version!==1||profile.runtime.nativePolicy.gwin!==address||!Number.isInteger(address)||address+8>buffer.byteLength)return false;
  if(buffer.byteLength<WINDOW_HIGH)fail('guest-range',phase,'linear-memory-end');
  const lo=Atomics.load(words,address/4)>>>0,hi=Atomics.load(words,address/4+1)>>>0;
  if(lo!==WINDOW_LOW||hi!==WINDOW_HIGH)return false;
  if(!windowState)windowState={address,lo,hi};
  if(windowState.lo!==lo||windowState.hi!==hi)fail('snapshot-changed','window-control','window-state-changed');
  windowUsed=true;return true;
 }
 function range(p,n,phase){
  if(!Number.isSafeInteger(p)||!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(p+n))fail('guest-range',phase,'invalid-span');
  if(p<65536)fail('guest-range',phase,'below-guest-minimum');
  if(p<CEILING){if(p+n>CEILING)fail('guest-range',phase,'span-end');}
  else if(p<WINDOW_LOW)fail('guest-range',phase,'runtime-gap');
  else{if(p+n>WINDOW_HIGH)fail('guest-range',phase,'span-end');if(!windowAllowed(phase))fail('guest-range',phase,'window-unavailable');}
  if(p+n>buffer.byteLength)fail('guest-range',phase,'linear-memory-end');
  for(let q=Math.floor(p/PAGE)*PAGE;q<p+n;q+=PAGE){const pg=q/PAGE;if(!((view.getUint8(bitmap+(pg>>>3))>>>(pg&7))&1))fail('uncommitted-page',phase,'uncommitted-page');if(!pages.has(pg))pages.set(pg,phase);}
 }
 function take(p,n,phase){range(p,n,phase);if((bytes+=n)>MAX_READ)fail('read-budget',phase,'read-budget');const copy=Uint8Array.from(new Uint8Array(buffer,p,n));reads.push({p,copy,phase});return new DataView(copy.buffer);}
 function ptr(p,n=4,phase){if(p%4)fail('unaligned-pointer',phase,'unaligned-pointer');range(p,n,phase);return p;}
 const u32=(p,phase)=>take(p,4,phase).getUint32(0,true),u8=(p,phase)=>take(p,1,phase).getUint8(0),f32=(p,phase)=>take(p,4,phase).getFloat32(0,true);
 return{buffer,view,take,ptr,u32,u8,f32,
  finish(){if(memory.buffer!==buffer)fail('memory-buffer-changed','memory','memory-buffer-changed');
   if(windowUsed&&((Atomics.load(words,windowState.address/4)>>>0)!==windowState.lo||(Atomics.load(words,windowState.address/4+1)>>>0)!==windowState.hi))fail('snapshot-changed','window-control','window-state-changed');
   for(const[pg,phase]of pages)if(!((view.getUint8(bitmap+(pg>>>3))>>>(pg&7))&1))fail('commit-state-changed',phase,'commit-state-changed');
   for(const{p,copy,phase}of reads){const live=new Uint8Array(buffer,p,copy.length);for(let i=0;i<copy.length;i++)if(live[i]!==copy[i])fail('snapshot-changed',phase,'snapshot-changed');}
   return{method:'equal-double-read',nativeSafePoint:false,abaExcluded:false,readBytes:bytes+(windowUsed?8:0),checkedPages:pages.size};
  }};
}
const finite=(values,reason)=>{if(!values.every(Number.isFinite))fail(reason);return values;};
function capture(memory,{verified=false,moduleHash,expectedPace,allowNetwork=false}={}){
 try{
  // The caller supplies the existing loader's exact verified profile, bound to
  // this memory/session. These arguments do not perform binary verification.
  const profile=Profiles?.select?.(moduleHash);if(verified!==true||!profile)fail('exact-current-module-required');
  if(!Number.isFinite(expectedPace)||expectedPace<.75||expectedPace>3||Math.abs(expectedPace*100-Math.round(expectedPace*100))>1e-5)fail('expected-pace-required');
  if(root.document&&(root.document.visibilityState!=='visible'||!root.document.hasFocus()))fail('focused-page-required');
  const r=reader(memory,profile),u=r.u32,b=r.u8,[onlineOnAddress,netOkAddress,inRoamAddress]=profile.runtime.onlineAddresses;
  const command=r.take(AI,104,'owned-command'),a=o=>command.getUint32(o,true),sequence=a(4);
  if(a(0)!==MAGIC||a(28)!==MAGIC||!sequence||(sequence&1)||a(8)!==1||a(52)!==1)fail('active-owned-road-ai-required');
  if(u(0x8654a4,'race-context')!==6||u(0xd00030,'race-context')!==1||u(0x89e7b0,'race-context')!==1)fail('solo-road-race-required');
  const hostRead=(p,n=4)=>{if(p+n>r.buffer.byteLength)fail('online-host-context-unavailable','network-host','host-span');const data=Uint8Array.from(new Uint8Array(r.buffer,p,n));hostReads.push({p,n,data});return n===1?data[0]:new DataView(data.buffer).getUint32(0,true);};
  const hostReads=[],network={permission:a(84),mode:u(0x850078,'network-context'),host:u(0x866a14,'network-context'),client:u(0x8669f4,'network-context'),online:b(0x89cf69,'network-context'),category:u(0x850088,'network-context'),nativeOnlineOn:hostRead(onlineOnAddress),nativeNetOk:hostRead(netOkAddress,1),nativeInRoam:hostRead(inRoamAddress)};
  if(network.permission>1)fail('invalid-network-permission');
  const isNetwork=!!((network.mode&520)||network.host||network.client||network.online||(network.nativeOnlineOn&&network.nativeNetOk&&network.nativeInRoam));
  if(isNetwork&&(allowNetwork!==true||network.permission!==1))fail('online-permission-required');if(isNetwork&&network.category===10)fail('special-race-excluded');
  if(b(0x89e7d8,'race-exclusions')||b(0x89e7d9,'race-exclusions')||b(0x89e7e3,'race-exclusions')||u(0x890104,'race-exclusions')||u(0x890108,'race-exclusions')||u(0x89010c,'race-exclusions')||u(0x890114,'race-exclusions'))fail('special-race-excluded');
  const player=r.ptr(u(0xd00000,'player-pointer'),20,'player'),pv=r.take(player,20,'player'),car=r.ptr(pv.getUint32(4,true),0x9c,'car'),cv=r.take(car,0x9c,'car'),race=r.ptr(u(0x890118,'race-pointer'),24,'race'),rv=r.take(race,24,'race');
  if(pv.getUint32(16,true)!==0||cv.getUint32(0x24,true)!==3||rv.getUint32(0,true)!==4)fail('driving-owner-context-required');
  if(a(12)!==player||a(16)!==car||a(20)!==race||a(32)!==player||a(36)!==car||a(40)!==race)fail('ai-owner-mismatch');
  const driver=r.ptr(cv.getUint32(0x2c,true),20,'driver'),dv=r.take(driver,20,'driver');
  if(dv.getUint32(0,true)!==0x785370||dv.getUint32(4,true)!==car)fail('native-driver-mismatch');
  const route=u(driver+0x6e8,'route-pointer');
  if(route!==driver+0x370)fail('private-main-route-required');
  r.ptr(route,0xd4,'private-route');
  const requested=a(60)/100,applied=a(76)/100,native=r.f32(driver+0x770,'pace-cache');
  // AA target consumers leave the game's cache native. The selected factor
  // must still have a settled acknowledgement, while the independent native
  // base must satisfy the same finite0..4 contract as those consumers.
  const nativePaceSettled=profile.capabilities.nativePaceTargetConsumers===true?native>=0&&native<=4:Math.abs(native-Math.fround(expectedPace))<=1e-6;
  if(!a(80)||requested!==expectedPace||applied!==expectedPace||!Number.isFinite(native)||!nativePaceSettled)fail('pace-not-settled');
  const count=u(route+4,'route-count'),cornerCount=u(route+0xd0,'route-count');
  if(count<1||count>MAX_NODES||cornerCount>5)fail('native-route-capacity');
  const nodePointers=r.take(route+8,count*4,'node-list'),seenNodes=new Set(),vtables=[],byVtable=new Map(),nodes=[];
  const track=u(0x89e7a0,'track-identity'),reverse=u(0x89e7a4,'track-identity'),trackInfo=r.ptr(u(0x883dac,'track-info-pointer'),0x8c,'track-info'),ti=r.take(trackInfo,0x8c,'track-info');
  if(track<1||track>65535||reverse>1||ti.getUint16(0x8a,true)!==track)fail('track-identity-mismatch');
  const regionBytes=Array.from({length:8},(_,i)=>ti.getUint8(0x40+i)),nul=regionBytes.indexOf(0),region=String.fromCharCode(...regionBytes.slice(0,nul<0?8:nul));
  if(!/^L4R[A-Z]$/.test(region))fail('region-identity-mismatch');
  const starts=u(0x86346c,'event-context'),event=u(0x863470,'event-context');let eventIdentity={kind:'quick-or-noncareer',pointer:0,hash:null,starts,heat:null};
  if(event){
   const ev=r.take(r.ptr(event,0x88,'career-event'),0x88,'career-event'),hash=ev.getUint32(8,true),eventCount=ev.getInt8(0x7e),heatCount=u(0x85ef4c,'event-context'),heat=u(0x85ef48,'event-context'),delta=heat-0x85bab8;
   if(!hash||eventCount<1||eventCount>4||heatCount!==eventCount||delta<0||delta%0xd24||delta/0xd24>=heatCount)fail('career-heat-identity');
   const index=delta/0xd24,hv=r.take(r.ptr(heat,12,'career-heat'),12,'career-heat'),tuple=0x18+4*index;
   if(hv.getInt32(0,true)!==track||hv.getInt32(4,true)!==reverse||ev.getInt16(tuple,true)!==track||(ev.getUint8(tuple+2)&1)!==reverse||hv.getInt32(8,true)!==ev.getInt8(tuple+3))fail('career-heat-layout-mismatch');
   eventIdentity={kind:'career',pointer:event,hash:hash.toString(16).padStart(8,'0'),starts,heat:{pointer:heat,index,count:heatCount,laps:hv.getInt32(8,true)}};
  }
  let previous=-Infinity;
  for(let index=0;index<count;index++){
   const pointer=r.ptr(nodePointers.getUint32(index*4,true),120,'route-node');
   if(seenNodes.has(pointer))fail('duplicate-route-node');seenNodes.add(pointer);
   const nv=r.take(pointer,120,'route-node'),vtable=nv.getUint32(0,true),distance=nv.getFloat32(0x54,true),nativeOffset=nv.getFloat32(0x58,true);
   if(nv.getUint32(0x64,true)!==route)fail('node-owner-mismatch');
   if(!Number.isFinite(distance)||!Number.isFinite(nativeOffset)||distance<=previous)fail('node-distance-order');previous=distance;
   if(!VTABLES.has(vtable))fail('unsupported-node-vtable');
   if(!byVtable.has(vtable)){
    if(vtables.length>=MAX_VTABLES)fail('vtable-budget');
    const table=r.take(r.ptr(vtable,SLOTS*4,'node-vtable'),SLOTS*4,'node-vtable'),slots=Array.from({length:SLOTS},(_,slot)=>{const address=table.getUint32(slot*4,true);return{offset:slot*4,address,kind:address>=CODE_MIN&&address<=CODE_MAX?'native-code-address':address===0?'null':'unclassified-address'};});
    if(slots[14].kind!=='native-code-address')fail('query-evaluator-slot-invalid');
    const entry={pointer:vtable,slots};byVtable.set(vtable,vtables.length);vtables.push(entry);
   }
   const group=nv.getInt16(0x5c,true),nodeIndex=nv.getInt16(0x5e,true);
   if(group<0||group>=1500||nodeIndex<0)fail('road-index-range');
   const groupPointer=r.ptr(u(0x88a334+group*4,'road-group-pointer'),140,'road-group'),header=r.take(groupPointer,140,'road-group'),roadCount=header.getInt16(0x34,true);
   if(header.getInt16(10,true)!==group||roadCount<1||roadCount>4096||nodeIndex>=roadCount)fail('canonical-road-group');
   const road=r.ptr(groupPointer+140+nodeIndex*56,56,'road-record'),roadView=r.take(road,56,'road-record');
   if((roadView.getUint32(12,true)&2047)!==group)fail('canonical-road-owner');
   const reference=finite([roadView.getFloat32(0,true),roadView.getFloat32(4,true),roadView.getInt16(0x12,true)/8],'non-finite-road-reference');
   nodes.push({index,pointer,vtable,vtableIndex:byVtable.get(vtable),distance,nativeOffset,
    road:{pointer:road,group,index:nodeIndex,groupPointer,count:roadCount,reference,tangent:[roadView.getInt16(0x18,true)/32767,roadView.getInt16(0x1a,true)/32767]}});
  }
  const xyz=finite([0x60,0x64,0x68].map(o=>cv.getFloat32(o,true)),'non-finite-physical-position'),velocity=finite([0x70,0x74,0x78].map(o=>cv.getFloat32(o,true)),'non-finite-velocity'),heading=finite([0x90,0x94,0x98].map(o=>cv.getFloat32(o,true)),'non-finite-heading');
  const tick=u(0x86518c,'game-tick'),clock=rv.getUint32(0x14,true),direction=dv.getUint8(0x10);
  if(direction>1)fail('native-direction-invalid');
  const consistency=r.finish();consistency.readBytes+=hostReads.reduce((n,h)=>n+h.n,0);consistency.checkedHostSpans=hostReads.length;if(consistency.readBytes>MAX_READ)fail('read-budget','network-host','read-budget');for(const h of hostReads){const live=new Uint8Array(r.buffer,h.p,h.n);if(h.data.some((x,i)=>x!==live[i]))fail('online-context-changed','network-host','snapshot-changed');}if(memory.buffer!==r.buffer)fail('memory-buffer-changed','memory','memory-buffer-changed');
  return{status:'captured',schema:'nfsu2-owned-route-vtable-v1',revision:profile.revision,moduleHash:profile.moduleHash,
   identity:{sequence,player,car,driver,route,race,track,reverse:!!reverse,region,tick,raceClock:clock,event:eventIdentity,network},
   pace:{expected:expectedPace,requested,applied,native,baselinePace:expectedPace===1},
   physical:{xyz,velocity,heading,plannedRoadPointer:dv.getUint32(12,true),nativeDirection:direction,progressVerified:false},
   nodeCount:count,cornerCount,nodes,vtables,consistency,
   capabilities:{metadataOnly:true,nativeCalls:false,memoryWrites:false,finalRacingLineVerified:false,forwardOrderVerified:false,horizonVerified:false,authorizesPacing:false},wholeRaceChecked:false};
 }catch(e){if(e instanceof Unavailable)return unavailable(e.reason,e);return unavailable('reader-error');}
}
const api=Object.freeze({capture,PIN,REVISION,BITMAP,CEILING,MAX_NODES,MAX_VTABLES,SLOTS,AI,MAGIC,guardCodes,readPhaseCodes,readSubreasonCodes,readEvidence});
if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_ROUTE_PROBE__=api;
})(globalThis);
