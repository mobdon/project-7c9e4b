(function(root){
'use strict';
// Subordinate publication inside the geometry owner's claim.
const ABI=Object.freeze({base:0xd0d800+512,size:128,magic:0x314c4346,version:1,
  geometryBase:0xd0d800,geometryMagic:0x31475746,maxAgeTicks:400,ticksPerSecond:4000,flags:31,
  moduleHash:'ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c'});
const Profiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
const owners=new WeakMap();
const Probe=typeof require==='function'?require('./route-probe.js'):root.__NFSU2_ROUTE_PROBE__;
const Pacing=typeof require==='function'?require('./forward-pacing.js'):root.__NFSU2_FORWARD_PACING__;
const Geometry=typeof require==='function'?require('./forward-geometry.js'):root.__NFSU2_FORWARD_GEOMETRY__;
const fields=Object.freeze({magic:0,version:4,sequence:8,enabled:12,request:16,
  ownerSequence:20,tick:24,raceClock:28,player:32,car:36,driver:40,controller:44,
  route:48,race:52,track:56,reverse:60,event:64,eventHash:68,starts:72,heat:76,
  heatIndex:80,heatCount:84,cap:88,maxAgeTicks:92,evidenceFlags:96,pace:112,tail:120,endMagic:124});
const pairs=Object.freeze([[32,32],[36,36],[40,40],[48,44],[52,48],[56,52],
  [60,56],[64,64],[68,68],[72,72],[76,76],[80,80],[84,84],[112,88]]);
class Publisher{
 constructor(geometry,{installed=false,moduleIdentity=null}={}){
  this.geometry=geometry;this.memory=geometry?.memory;this.abi=Object.freeze({...ABI,moduleHash:geometry?.abi?.hash||ABI.moduleHash});this.installed=installed===true;
  this.moduleIdentity=moduleIdentity;this.sequence=0;this.claimed=false;
 }
 ready(){return this.installed&&!!Profiles?.select?.(this.abi.moduleHash)&&this.geometry?.verified===true&&this.geometry?.installed===true&&
  this.geometry.moduleIdentity===this.moduleIdentity&&this.moduleIdentity&&this.geometry.owns()&&this.geometry.validMailbox();}
 atom(off){return Atomics.load(new Int32Array(this.memory.buffer),(this.abi.base+off)/4)>>>0;}
 put(off,value){Atomics.store(new Int32Array(this.memory.buffer),(this.abi.base+off)/4,value|0);}
 stop(){if(this.claimed&&this.geometry?.owns()&&this.geometry.memory===this.memory&&
   this.geometry.moduleIdentity===this.moduleIdentity&&this.geometry.validMailbox()&&
   this.atom(0)===this.abi.magic&&this.atom(4)===this.abi.version)this.put(12,0);return{status:'cancelled'};}
 claim(){
  if(!this.ready())throw Error('Verified geometry owner/native clamp is unavailable');
  const owner=owners.get(this.geometry);if(owner&&owner!==this)throw Error('A different cap publisher owns this geometry claim');
  const v=new DataView(this.memory.buffer);
  const policyEnabled=Profiles?.select?.(this.abi.moduleHash)?.capabilities.nativePolicy===true;
  if(!this.claimed){if(policyEnabled&&!Geometry?.policyFromView(v,this.geometry.abi,v.getUint32(this.abi.geometryBase+16,true)))throw Error('Native policy receipt is unavailable');
   for(let i=0;i<this.abi.size;i++)if(!(policyEnabled&&((i>=100&&i<112)||(i>=116&&i<120)))&&v.getUint8(this.abi.base+i)!==0)throw Error('Cap command area is occupied');
   this.put(4,this.abi.version);this.put(124,this.abi.magic);this.put(0,this.abi.magic);owners.set(this.geometry,this);this.claimed=true;}
  if(this.atom(0)!==this.abi.magic||this.atom(4)!==this.abi.version||this.atom(124)!==this.abi.magic)throw Error('Cap command identity changed');
 }
 leaseReceipt(expected){
  // This receipt reports a previously validated native cache. It authorizes
  // no write and never extends capture age; the native setter independently
  // revalidates every use of its private immutable snapshot.
  if(!this.ready()||!expected||!Number.isInteger(expected.sequence)||!expected.sequence||(expected.sequence&1)||!Number.isInteger(expected.request)||!expected.request||(expected.request&1)||!Number.isInteger(expected.tick)||expected.tick<0||expected.tick>0xffffffff)return{status:'invalid'};
  const words=new Int32Array(this.memory.buffer),at=p=>Atomics.load(words,p/4)>>>0;
  const r=0xd0d170,b=0xd0d100,now=at(0x86518c),age=(now-expected.tick)>>>0;
  if(this.atom(0)!==this.abi.magic||this.atom(4)!==this.abi.version||this.atom(12)!==1||this.atom(8)!==expected.sequence||this.atom(120)!==expected.sequence||this.atom(16)!==expected.request||this.atom(24)!==expected.tick||this.atom(92)!==400||at(b+4)!==this.atom(20)||at(b+8)!==1||at(b+52)!==1)return{status:'invalid'};
  if(age>400)return{status:'expired',ageTicks:age};
  const first=at(r+4),magic=at(r),request=at(r+8),tick=at(r+12),last=at(r+4);
  if(first!==last||first!==expected.sequence||magic!==0x314c5346||request!==expected.request||tick!==expected.tick)return{status:'waiting',ageTicks:age};
  if(this.atom(12)!==1||this.atom(8)!==expected.sequence||this.atom(16)!==expected.request||this.atom(24)!==expected.tick||at(b+4)!==this.atom(20))return{status:'invalid'};
  return{status:'acknowledged',sequence:first,request,tick,ageTicks:age};
 }

 publish({capture,window,policy}={}){
  this.stop();this.claim();this.put(12,0);
  const canonical=Pacing?.windowFromCapture(capture);
  if(capture?.moduleHash!==this.abi.moduleHash||canonical?.available!==true||canonical.nativeUnitScaleVerified!==true||
    (window&&(window.moduleHash!==canonical.moduleHash||window.source!==canonical.source||window.request!==canonical.request||window.orderVerified!==true||
      window.nativeUnitScaleVerified!==true||window.horizontalAxes!=='xy'||window.postConstructionVerified!==true||
      window.pathKind!==canonical.pathKind||window.sampling!==canonical.sampling||window.controlWord!==canonical.controlWord)))throw Error('Verified native-unit forward plan is required');
  const current=Probe?.capture(this.memory,{verified:true,moduleHash:this.abi.moduleHash,expectedPace:capture.pace,allowNetwork:capture.allowNetwork===true});
  if(current?.status!=='captured'||JSON.stringify(current.identity.network)!==JSON.stringify(capture.identity?.network))throw Error('Network context changed before publication');
  const v=new DataView(this.memory.buffer),g=o=>v.getUint32(this.abi.geometryBase+o,true),request=capture.request;
  if(!Number.isInteger(request)||!request||(request&1)||g(0)!==this.abi.geometryMagic||g(4)!==1||
    g(8)!==request||g(16)!==request||g(120)!==request||g(124)||g(20)||
    g(28)!==capture.ownerSequence||g(2044)!==capture.ownerSequence||
    g(2008)!==capture.identity?.tick||g(2012)!==capture.identity?.raceClock||g(640)!==(request|1))throw Error('Geometry response changed before cap publication');
  if(capture.progress!==v.getFloat32(this.abi.geometryBase+96,true)||capture.end!==v.getFloat32(this.abi.geometryBase+100,true)||
    capture.physical?.speed!==v.getFloat32(this.abi.geometryBase+2016,true)||
    capture.points.length!==g(24)||g(24)<2||g(24)>24||
    capture.points.some((point,i)=>{const at=this.abi.geometryBase+128+16*i;
      return point.distance!==v.getFloat32(at,true)||point.xyz.some((x,j)=>x!==v.getFloat32(at+4+4*j,true));})||
    (window&&(!Array.isArray(window.samples)||window.samples.length!==canonical.samples.length||
      window.samples.some((point,i)=>{const expected=canonical.samples[i];
        return point.distance!==expected.distance||!Array.isArray(point.xyz)||point.xyz.length!==3||
          point.xyz.some((x,j)=>x!==expected.xyz[j]);}))))throw Error('Plan window does not match the acknowledged native points');
  const policyEnabled=Profiles?.select?.(this.abi.moduleHash)?.capabilities.nativePolicy===true;
  const nativePolicy=policyEnabled?Geometry?.policyFromView(v,this.geometry.abi,request):null;
  if(policyEnabled&&(!nativePolicy||JSON.stringify(capture.nativePolicy)!==JSON.stringify(nativePolicy)))throw Error('Native policy receipt changed before publication');
  if(!policyEnabled&&policy?.mode==='native')throw Error('Native policy is unavailable for this build');
  let nativeGain=null;
  if(capture.nativeGain){
    if(!Pacing?.nativeGainValid?.(capture,capture.nativeGain,capture.pace))throw Error('Native tire gain receipt is invalid');
    nativeGain=Geometry?.gainFromMemory?.(this.memory,{moduleHash:this.abi.moduleHash,request,ownerSequence:capture.ownerSequence,car:capture.identity?.car,pace:capture.pace});
    if(!nativeGain||['moduleHash','request','ownerSequence','car','command','percent','pace','strength','strengthCode','relativePowerGain','relativeTireGain','curveGain','physicsKind','evidenceKind','wheelHits','gripHits','combinedGripFactor'].some(key=>nativeGain[key]!==capture.nativeGain[key]))throw Error('Native tire gain changed before publication');
  }
  const plan=policyEnabled?Pacing?.planNative({...capture,nativePolicy,nativeGain},nativePolicy,{...policy,pace:capture.pace}):Pacing?.plan(canonical,policy);
  if(plan?.available===true&&plan.override===false)return{status:'native-fallback',request,reason:plan.reason};
  const cap=plan?.targetCap;
  if(plan?.available!==true||plan.override!==true||!Number.isFinite(cap)||cap<=0||cap>150||
    plan.assumptions?.reactionSeconds<this.abi.maxAgeTicks/this.abi.ticksPerSecond)throw Error('Bounded physical target cap with lease reaction reserve is required');
  const driver=g(40),controller=v.getUint32(driver+8,true);
  this.sequence=((Math.max(this.sequence,this.atom(8))+2)&0x7ffffffe)||2;const seq=this.sequence;
  this.put(8,seq|1);this.put(16,request);this.put(20,g(28));this.put(24,g(2008));this.put(28,g(2012));
  const evidenceFlags=this.abi.flags|(plan.assumptions?.gainApplied===true?32|(plan.assumptions.strengthCode<<6):0);
  for(const[c,b]of pairs)this.put(c,g(b));this.put(44,controller);this.put(92,this.abi.maxAgeTicks);this.put(96,evidenceFlags);
  v.setFloat32(this.abi.base+88,cap,true);this.put(120,seq);this.put(12,1);this.put(8,seq);
  return{status:'armed',sequence:seq,cap,request,maxAgeTicks:this.abi.maxAgeTicks,evidenceFlags,gainApplied:plan.assumptions?.gainApplied===true};
 }
}
const api={ABI,fields,pairs,Publisher};if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_FORWARD_CLAMP__=api;
})(globalThis);
