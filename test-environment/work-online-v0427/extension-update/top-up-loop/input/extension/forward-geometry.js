(function(root){
'use strict';
// Page code requests a game-thread read transaction;
// it never invokes native functions or changes AI pace/controls itself.
const ABI=Object.freeze({base:0xd0d800,size:2048,magic:0x31475746,version:1,maxPoints:24,pointOffset:128,pointStride:16,reservedOffset:512,reservedBytes:256,stackLow:768,stack:960,output:992,cpu:1024,cpuBytes:344,cache:1368,metadata:2008,maxRequestTicks:4000,bitmap:0x29779ac0,ceiling:0x28000000,revision:'3bdd9959',hash:'ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c'});
const Profiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
const abiForHash=hash=>{const p=Profiles?.select?.(hash);return p?Object.freeze({...ABI,...p.runtime,hash:p.moduleHash,revision:p.revision}):null;};
const owners=new WeakMap();
const Probe=root.__NFSU2_ROUTE_PROBE__||(typeof require==='function'?require('./route-probe.js'):null);
const REQUEST=Object.freeze([[28,'ownerSequence'],[32,'player'],[36,'car'],[40,'driver'],[44,'route'],[48,'race'],[52,'track'],[56,'reverse'],[60,'tick'],[64,'event'],[68,'eventHash'],[72,'starts'],[76,'heat'],[80,'heatIndex'],[84,'heatCount'],[88,'pace'],[92,'raceClock']]);
const reasons=Object.freeze({1:'Game context changed',2:'Route or progress is unavailable',3:'Insufficient supported forward horizon',4:'A required source span is unavailable',5:'Native evaluator/vtable lookup did not match',6:'Native query scratch contract failed',7:'Capture was cancelled',8:'Route identity changed during sampling',9:'Native numeric constants or control word did not match',10:'Native car grade or policy data is unavailable'});
const guardCodes=Object.freeze({mailboxUnavailable:20,unverified:21,otherOwner:22,mailboxOccupied:23,mailboxIdentity:24,probeMissing:25,previousPending:26,ackTimeout:28,pollOwnership:29,nativeRejected:30,publication:31,points:32,identity:33,freshness:34,policyReceipt:35});
const knownGuard=code=>Number.isInteger(code)&&(Object.values(guardCodes).includes(code)||Object.values(Probe?.guardCodes||{}).includes(code));
const guardedError=(message,code,readSource)=>Object.assign(Error(message),{forwardGuardCode:knownGuard(code)?code:undefined,...(Probe?.readEvidence?.(readSource)||{})});
function numericEvidence(view,abi){
 const spec=Profiles?.select?.(abi?.hash)?.runtime?.numericReceipt;
 if(!spec||spec.version!==1||view.getUint32(spec.markerOffset,true)!==spec.marker)return {};
 const word=view.getUint32(spec.controlWordOffset,true),mask=view.getUint32(spec.failureMaskOffset,true);
 return word<=65535&&mask<=15?{forwardNumericControlWord:word,forwardNumericFailureMask:mask}:{};
}
function policyFromView(view,abi,request){
 const profile=Profiles?.select?.(abi?.hash),p=profile?.runtime?.nativePolicy;
 if(profile?.capabilities.nativePolicy!==true||!['14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd','e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03','a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8','f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9','c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391','395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e','3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb','f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b','2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'].includes(abi.hash)||p?.version!==1||p.magic!==0x31505746||p.magicOffset!==612||p.requestOffset!==616||p.gripOffset!==620||p.decelOffset!==628)return null;
 if(view.getUint32(abi.base+p.magicOffset,true)!==p.magic||view.getUint32(abi.base+p.requestOffset,true)!==request)return null;
 const grip=view.getFloat32(abi.base+p.gripOffset,true),deceleration=view.getFloat32(abi.base+p.decelOffset,true),gravity=Math.fround(9.8);
 if(![[3.7,12],[3.4,10.6],[3.1,9.3],[2.8,8],[3,10],[3,9],[3,8],[2,6]].some(([g,a])=>grip===Math.fround(g)&&deceleration===Math.fround(a)))return null;
 return Object.freeze({available:true,source:'exact-native-grade-policy-v1',moduleHash:abi.hash,request,grip,gravity,lateralAcceleration:grip*gravity,brakingDeceleration:deceleration,straightCap:60,readOnly:true,liveVerified:false});
}
// Read the independently guarded, current native handling publication. A page
// status object is not authority to raise a physical target. Native use-time
// guards additionally recheck the current physics path through the cap lease.
function gainFromMemory(memory,{moduleHash,request,ownerSequence,car,pace}={}){
 try{
  if(!['a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8','f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9','c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391','395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e','3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb','f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b','2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'].includes(moduleHash)||!Number.isInteger(request)||request<=0||(request&1)||!Number.isInteger(ownerSequence)||ownerSequence<=0||(ownerSequence&1)||!Number.isInteger(car)||car<0x10000||car>=0x28000000||(car&3)||!Number.isFinite(pace)||pace<1||pace>2||Math.abs(pace*100-Math.round(pace*100))>1e-5)return null;
  let protocol=root.__NFSU2_PACED_CATCHUP__;
  if(!protocol&&typeof require==='function')try{protocol=require('./paced-catchup.js');}catch{}
  if(protocol?.supports?.(moduleHash)!==true||typeof protocol.readGain!=='function')return null;
  const raw=protocol.readGain(memory,{currentCar:car,pace,ownerSequence,moduleHash}),percent=Math.round(pace*100),p=Math.fround(percent/100),source=raw?.sourceFactor??raw?.nativeFactor,q=raw?.strengthCode,s=raw?.strength;
  const Pacing=root.__NFSU2_FORWARD_PACING__||(typeof require==='function'?require('./forward-pacing.js'):null);
  if(Pacing?.physicsEvidenceValid?.(raw)!==true)return null;
  if(!raw||raw.reason!==1||raw.publisher!==1||raw.ownerSequence!==ownerSequence||raw.car!==car||raw.percent!==percent||(raw.outputsVerified!==true&&raw.exactOutputsVerified!==true)||!Number.isInteger(raw.command)||raw.command<=0||raw.command>0xffffffff||!(raw.command>>>16)||(raw.command&255)!==percent||(raw.command&0x300)!==0x300||!Number.isInteger(q)||q<0||q>36||((raw.command>>>10)&63)!==q||s!==1+q/4||!Number.isInteger(raw.publication)||raw.publication<0||raw.publication>32767||!Number.isFinite(source)||source<=0)return null;
  const power=Math.fround(Math.fround(source*p)*s),tire=Math.fround(power*p);
  if(!Number.isFinite(power)||power<=0||!Number.isFinite(tire)||tire<=0||raw.powerFactor!==power||raw.tireFactor!==tire||raw.relativePowerGain!==Math.fround(p*s)||raw.relativeTireGain!==Math.fround(Math.fround(p*s)*p))return null;
  return Object.freeze({available:true,source:'owned-paced-handling-publication-v2',moduleHash,request,ownerSequence,car,command:raw.command,publication:raw.publication,percent,pace:p,strength:s,strengthCode:q,relativePowerGain:p*s,relativeTireGain:p*p*s,curveGain:p*Math.sqrt(s),nativeFactor:source,powerFactor:power,tireFactor:tire,outputsVerified:true,physicsKind:raw.physicsKind,evidenceKind:raw.evidenceKind,wheelHits:raw.wheelHits,gripHits:raw.gripHits,combinedGripFactor:raw.combinedGripFactor??null});
 }catch{return null;}
}
class Controller{
 constructor(memory,{verified=false,moduleHash,installed=false,moduleIdentity=null}={}){this.memory=memory;this.abi=abiForHash(moduleHash)||ABI;this.verified=verified===true&&!!abiForHash(moduleHash);this.installed=installed===true;this.moduleIdentity=moduleIdentity;this.claimed=false;this.pending=null;this.sequence=0;this.last=null;}
 view(){return new DataView(this.memory.buffer);}
 words(){return new Int32Array(this.memory.buffer);}
 atom(off){return Atomics.load(this.words(),(this.abi.base+off)/4)>>>0;}
 put(off,x){Atomics.store(this.words(),(this.abi.base+off)/4,x|0);}
 validMailbox(){const buffer=this.memory?.buffer;if(Object.prototype.toString.call(buffer)!=='[object SharedArrayBuffer]'||buffer.byteLength<this.abi.bitmap+32768)return false;const v=new DataView(buffer);if(this.abi.base+this.abi.size>Math.min(this.abi.ceiling,v.byteLength))return false;for(let p=this.abi.base&-16384;p<this.abi.base+this.abi.size;p+=16384){const pg=p>>>14;if(!((v.getUint8(this.abi.bitmap+(pg>>>3))>>>(pg&7))&1))return false;}return true;}
 owns(){const owner=owners.get(this.memory);return this.claimed&&owner?.controller===this&&owner.module===this.moduleIdentity&&owner.hash===this.abi.hash;}
 claim(){if(!this.verified||!this.installed||!this.moduleIdentity)throw guardedError('Verified native sampler is unavailable',21);if(!this.validMailbox())throw guardedError('Verified native sampler is unavailable',20);const owner=owners.get(this.memory);if(owner&&(owner.controller!==this||owner.module!==this.moduleIdentity))throw guardedError('A different forward sampler owns this memory',22);
  if(!this.claimed){const v=this.view();for(let i=0;i<this.abi.size;i++)if(v.getUint8(this.abi.base+i)!==0)throw guardedError('Geometry mailbox is occupied; reload before using this candidate',23);this.put(4,this.abi.version);this.put(0,this.abi.magic);owners.set(this.memory,{controller:this,module:this.moduleIdentity,hash:this.abi.hash});this.claimed=true;}
  if(this.atom(0)!==this.abi.magic||this.atom(4)!==this.abi.version)throw guardedError('Geometry mailbox identity changed',24);}
 request({expectedPace,allowNetwork=false}={}){
  this.claim();if(!Probe)throw guardedError('Read-only route context is unavailable',25);
  if(this.pending){const result=this.poll();if(result.status==='waiting')throw guardedError('Previous geometry request is still pending',26);}
  const observed=Probe.capture(this.memory,{verified:this.verified,moduleHash:this.abi.hash,expectedPace,allowNetwork:allowNetwork===true});if(observed.status!=='captured')throw guardedError('Geometry context unavailable: '+observed.reason,observed.forwardGuardCode,observed);
  const i=observed.identity,e=i.event,c={ownerSequence:i.sequence,player:i.player,car:i.car,driver:i.driver,route:i.route,race:i.race,track:i.track,reverse:Number(i.reverse),tick:i.tick,event:e.pointer,eventHash:e.hash?parseInt(e.hash,16):0,starts:e.starts,heat:e.heat?.pointer||0,heatIndex:e.heat?.index??0xffffffff,heatCount:e.heat?.count||0,pace:Math.round(expectedPace*100),raceClock:i.raceClock};
  this.sequence=((Math.max(this.sequence,this.atom(16))+2)&0x7ffffffe)||2;const seq=this.sequence;
  this.put(8,seq|1);this.put(640,0);const numeric=Profiles?.select?.(this.abi.hash)?.runtime?.numericReceipt;if(numeric)for(const off of [numeric.controlWordOffset,numeric.markerOffset,numeric.failureMaskOffset])this.put(off,0);for(const[o,k]of REQUEST)this.put(o,c[k]);this.put(12,1);this.pending={seq,context:c,expectedPace,time:Date.now(),identity:i,allowNetwork:allowNetwork===true};this.last=null;this.put(8,seq);return{status:'waiting',request:seq};
 }
 stop(){if(this.verified&&this.owns()&&this.validMailbox()&&this.atom(0)===this.abi.magic){this.put(12,0);this.put(640,0);}this.pending=null;this.last=null;return{status:'cancelled'};}
 invalidate(){this.stop();this.verified=false;}
 poll(){const q=this.pending;if(!q)return this.last||{status:'idle'};
  if(!this.verified||!this.owns()||!this.validMailbox()||this.atom(0)!==this.abi.magic||this.atom(4)!==this.abi.version){this.stop();return{status:'unavailable',reason:'Geometry mailbox ownership changed',forwardGuardCode:29};}
  if(this.atom(16)!==q.seq){if(Date.now()-q.time>2500){this.stop();return{status:'unavailable',reason:'Native post-construction sampler did not acknowledge',forwardGuardCode:28};}return{status:'waiting',request:q.seq};}
  const copy=Uint8Array.from(new Uint8Array(this.memory.buffer,this.abi.base,this.abi.size)),v=new DataView(copy.buffer),u=o=>v.getUint32(o,true),f=o=>v.getFloat32(o,true);
  if(this.atom(16)!==q.seq||u(120)!==q.seq||u(8)!==q.seq||this.atom(124)!==0)return{status:'waiting',request:q.seq};
  this.pending=null;this.put(12,0);
  const numeric=numericEvidence(v,this.abi),numericSpec=Profiles?.select?.(this.abi.hash)?.runtime?.numericReceipt;
  if(u(20)){this.last={status:'unavailable',reason:reasons[u(20)]||'Native geometry request was rejected',code:u(20),forwardGuardCode:30,...numeric};return this.last;}
  if(numericSpec&&(!numericSpec.controlWords.includes(numeric.forwardNumericControlWord)||numeric.forwardNumericFailureMask!==0)){this.last={status:'unavailable',reason:'Native numeric receipt was invalid',code:9,forwardGuardCode:30,...numeric};return this.last;}
  if(REQUEST.some(([o,k])=>u(o)!==(q.context[k]>>>0))||u(24)<2||u(24)>this.abi.maxPoints||u(112)<3||u(112)>40){this.last={status:'unavailable',reason:'Native geometry publication was inconsistent',forwardGuardCode:31};return this.last;}
  const points=Array.from({length:u(24)},(_,i)=>{const p=this.abi.pointOffset+i*this.abi.pointStride;return{distance:f(p),xyz:[f(p+4),f(p+8),f(p+12)]};});
  if(!points.every((p,i)=>Number.isFinite(p.distance)&&p.xyz.every(Number.isFinite)&&(i===0||(p.distance>points[i-1].distance&&Math.hypot(p.xyz[0]-points[i-1].xyz[0],p.xyz[1]-points[i-1].xyz[1])>1e-4)))){this.last={status:'unavailable',reason:'Native geometry points were invalid or horizontally degenerate',forwardGuardCode:32};return this.last;}
  const now=Probe.capture(this.memory,{verified:this.verified,moduleHash:this.abi.hash,expectedPace:q.expectedPace,allowNetwork:q.allowNetwork});
  const sameEvent=now.status==='captured'&&['pointer','hash','starts'].every(k=>now.identity.event[k]===q.identity.event[k])&&['pointer','index','count'].every(k=>now.identity.event.heat?.[k]===q.identity.event.heat?.[k]);
  if(now.status!=='captured'||JSON.stringify(now.identity.network)!==JSON.stringify(q.identity.network)||['sequence','player','car','driver','route','race','track','reverse','region'].some(k=>now.identity[k]!==q.identity[k])||!sameEvent){this.last={status:'unavailable',reason:'Game identity changed before the snapshot was read',forwardGuardCode:knownGuard(now.forwardGuardCode)?now.forwardGuardCode:33,...(Probe?.readEvidence?.(now)||{})};return this.last;}
  const progress=f(96),end=f(100),spacing=f(104),knownHorizon=f(108),nativeTick=u(this.abi.metadata),nativeClock=u(this.abi.metadata+4),speed=f(this.abi.metadata+8),xyz=[0,4,8].map(o=>f(this.abi.metadata+12+o)),heading=[0,4,8].map(o=>f(this.abi.metadata+24+o));
  if(![progress,end,spacing,knownHorizon,speed,...xyz,...heading].every(Number.isFinite)||spacing<=0||spacing>8.001||knownHorizon<16||end<=progress||end-progress>(this.abi.maxHorizon||184)+.01||points[0].distance>progress||points.at(-1).distance<end||Math.abs(points.at(-1).distance-progress-knownHorizon)>.15||((now.identity.tick-nativeTick)>>>0)>this.abi.maxRequestTicks||now.identity.raceClock<nativeClock||u(this.abi.metadata+36)!==q.identity.sequence){this.last={status:'unavailable',reason:'Native geometry bounds or freshness were invalid',forwardGuardCode:34};return this.last;}
  const postConstructionVerified=u(640)===(q.seq|1);
  const nativePolicy=policyFromView(v,{...this.abi,base:0},q.seq);
  if(Profiles.select(this.abi.hash)?.capabilities.nativePolicy===true&&!nativePolicy){this.last={status:'unavailable',reason:'Native policy receipt was invalid',forwardGuardCode:35};return this.last;}
  const nativeGain=gainFromMemory(this.memory,{moduleHash:this.abi.hash,request:q.seq,ownerSequence:u(28),car:q.identity.car,pace:q.expectedPace});
  this.last={status:'captured',schema:'nfsu2-forward-geometry-v1',moduleHash:this.abi.hash,request:q.seq,identity:{...q.identity,tick:nativeTick,raceClock:nativeClock},ownerSequence:u(28),pace:q.expectedPace,points,nodeCount:u(112),cornerCount:u(116),progress,end,spacing,knownHorizon,physical:{xyz,heading,speed},nativePolicy,nativeGain,source:'owned-native-forward-query-v1',sampling:'native-node-anchors-linear-v1',horizontalAxes:'xy',controlWord:numeric.forwardNumericControlWord??0x37f,...numeric,pathKind:'selected-road-centerline',allowNetwork:q.allowNetwork,postConstructionVerified,forwardOrderVerified:postConstructionVerified,nativeUnitScaleVerified:true,metricScaleVerified:false,wholeRaceChecked:false,controlsChanged:false,liveVerified:false};return this.last;
 }
}
const api={ABI,abiForHash,REQUEST,Controller,reasons,policyFromView,gainFromMemory,guardCodes};if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_FORWARD_GEOMETRY__=api;
})(globalThis);
