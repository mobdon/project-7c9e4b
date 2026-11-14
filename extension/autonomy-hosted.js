/* Current-build read-only city/host observer. The public input API receives
 * JOIN (4) only; this module never sends Enter, NEW, LEAVE or a host action. */
(function(root){
'use strict';
const Road=root.__NFSU2_AUTONOMY_ROAD__||(typeof require==='function'?require('./autonomy-road.js'):null),Profiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
const HASH='c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391';
// Exact current native22748/22832/22840/22925 fields. In this build a lobby
// is72 bytes (including new class fields), not the older64-byte struct.
const C=Object.freeze({hash:HASH,mp:703604848,lobby:703604856,seen:703604960,nseen:703606112,stride:72,heard:64,spots:705356776,nspots:705365736,maxSpots:160,maxOffers:16});
const HOSTED_PROFILES=Object.freeze({[HASH]:C,'395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e':Object.freeze({"hash":"395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e","mp":705681664,"lobby":705681672,"seen":705681776,"nseen":705682928,"stride":72,"heard":64,"spots":707433608,"nspots":707442568,"maxSpots":160,"maxOffers":16}),'3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb':Object.freeze({"hash":"3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb","mp":706412192,"lobby":706412200,"seen":706412304,"nseen":706413456,"stride":72,"heard":64,"spots":708164136,"nspots":708173096,"maxSpots":160,"maxOffers":16}),'f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b':Object.freeze({"hash":"f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b","mp":705685408,"lobby":705685416,"seen":705685520,"nseen":705686672,"stride":72,"heard":64,"spots":707437352,"nspots":707446312,"maxSpots":160,"maxOffers":16}),'2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d':Object.freeze({"hash":"2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d","mp":705686368,"lobby":705686376,"seen":705686480,"nseen":705687632,"stride":72,"heard":64,"spots":707438312,"nspots":707447272,"maxSpots":160,"maxOffers":16})}),select=hash=>typeof hash==='string'&&Object.hasOwn(HOSTED_PROFILES,hash)?HOSTED_PROFILES[hash]:null;
const uint=n=>Number.isInteger(n)&&n>0&&n<=0xffffffff,kindNames={0:'Circuit',1:'Sprint',2:'Street X',4:'Drag',5:'Drift'};
function create(memory,{moduleHash,verified=false,clock=()=>performance.now(),session=()=>root.__nfsu2?.session}={}){
 const C=select(moduleHash),profile=verified===true&&C?Profiles?.select?.(moduleHash):null;let lastTick=null,tickAt=null,lastNow=null,lastSnapshot=null;const adverts=new Map();
 function observe(context={}){
  try{
   if(!profile)throw Error('exact-hosted-profile');const now=clock();if(!Number.isFinite(now)||now<0||lastNow!==null&&now<lastNow)throw Error('clock');lastNow=now;
   const r=Road.reader(memory,profile),hostReads=[];
   const host=(p,n)=>{if(!Number.isSafeInteger(p)||p<0x28000000||p+n>0x50000000||p+n>r.buffer.byteLength||n<1)throw Error('host-span');const b=Uint8Array.from(new Uint8Array(r.buffer,p,n));hostReads.push({p,b});return new DataView(b.buffer);};
   const state=host(C.mp,4).getUint32(0,true),lobby=host(C.lobby,72),tick=r.u(0x86518c),flow=r.u(0x8654a4),type=r.u(0x89e7b0);if(state>5)throw Error('lobby-state');
   if(lastTick!==null&&tick<lastTick)throw Error('game-clock-reset');if(tick!==lastTick){lastTick=tick;tickAt=now;}const nativeAdvancing=tickAt!==null&&now-tickAt<=250;
   const result={verified:true,fresh:true,nativeAdvancing,network:context.network===true,allowNetwork:context.allowNetwork===true,focused:context.focused===true,hidden:context.hidden===true,manualInput:context.manualInput===true,tunerBusy:context.tunerBusy===true,menu:context.menu===true,standaloneAI:context.standaloneAI===true,manual:context.manual===true,aiOwned:context.aiOwned===true,handbackPending:context.handbackPending===true,safe:context.safe===true,state,host:lobby.getUint32(4,true),lobby:lobby.getUint32(0,true),eventHash:0,world:null,catalog:[],offers:[],inRoam:false,raceActive:state===5&&context.raceActive===true&&type===1&&flow===6&&nativeAdvancing,raceResults:state===5&&context.raceResults===true,driverActive:context.driverActive===true,kind:context.kind,tick,self:0};
   // Current lobby's race pointer is validated through the same canonical table.
   const raceTable=r.u(0x8383e0),raceCount=r.u(0x8383e4);if(raceCount<1||raceCount>1024||raceTable%4)throw Error('race-table');const races=r.take(raceTable,raceCount*136),raceAt=p=>{const off=p-raceTable;if(off<0||off%136||off/136>=raceCount)throw Error('race-membership');return new DataView(races.buffer,races.byteOffset+off,136);};
   const currentRace=lobby.getUint32(8,true);if(state!==0){if(!uint(result.host)||!uint(result.lobby)||!currentRace)throw Error('lobby-identity');result.eventHash=raceAt(currentRace).getUint32(8,true);}
   if(state===0&&flow===6&&type===0){
    const physical=Road.readContext(r);Object.assign(result,physical,{inRoam:true});
    const stage=r.u(0x85ad40+0x7af8),guided=r.u(0x85ad40+0xc08),first=r.u(0x88f70c),end=r.u(0x88f710),meta=host(C.nspots,40),count=meta.getUint32(0,true);
    if(stage<1||stage>8)throw Error('career-stage');
    if(guided)throw Error('guided-event');
    if(count>C.maxSpots)throw Error('catalog-count');
    if(meta.getUint32(24,true)!==stage||meta.getUint32(12,true)!==first||meta.getUint32(16,true)!==end)throw Error('catalog-generation');
    if(first>=end||end-first>700000)throw Error('trigger-span');
    const triggers=new Map();let at=first;
    for(let n=0;at!==end;n++){if(n>=1024||at+68>end)throw Error('trigger-chain');const h=r.take(at,68),size=h.getInt16(66,true);if(h.getUint32(0,true)!==13||size<68||at+size>end)throw Error('trigger-record');r.span(at,size);triggers.set(at,h);at+=size;}
    const spots=host(C.spots,count*28||1),ids=new Set();
    for(let i=0;i<count;i++){
     const off=i*28,trig=spots.getUint32(off,true),rp=spots.getUint32(off+4,true),t=triggers.get(trig),rv=raceAt(rp),eventHash=rv.getUint32(8,true),markerHash=rv.getUint32(40,true),rawType=rv.getUint8(15),rowStage=rv.getUint8(55),heats=rv.getUint8(126),kind=spots.getUint8(off+24),why=spots.getUint8(off+25),box=[8,12,16,20].map(k=>spots.getFloat32(off+k,true));
     if(!t||ids.has(trig)||!eventHash||!markerHash||t.getUint32(48,true)!==markerHash||![0,1,2,4,5].includes(rawType)||rowStage<1||rowStage>stage||heats<1||heats>3||![1,2].includes(kind)||why>6||(kind===1)!==(why===0)||!box.every(Number.isFinite)||box[0]>box[2]||box[1]>box[3]||box.some((v,k)=>v!==t.getFloat32(32+k*4,true)))throw Error('catalog-row');
     const marker={x:t.getFloat32(4,true),y:t.getFloat32(8,true),z:t.getFloat32(20,true)},track=rv.getUint16(24,true),reverse=rv.getUint8(26)&1,laps=rv.getUint8(27);if(!Object.values(marker).every(Number.isFinite)||!track||track===4000)throw Error('destination');ids.add(trig);
     result.catalog.push({key:[eventHash,markerHash,trig].join(':'),eventHash,markerHash,triggerId:trig,racePointer:rp,track,reverse,laps,rawType,raceFlavor:rv.getUint8(52),stage:rowStage,kind,why,box,marker,label:`${rv.getUint8(52)===2?'URL':kindNames[rawType]} ${track}${reverse?' reverse':''}`,liveVerified:false});
    }
    result.world=[physical.identity,raceTable,first,end,stage].join(':');
    const nseen=host(C.nseen,4).getUint32(0,true);if(nseen>C.maxOffers)throw Error('offer-count');const seen=host(C.seen,nseen*72||1),liveKeys=new Set();
    for(let i=0;i<nseen;i++){
     const o=i*72,id=seen.getUint32(o,true),hostId=seen.getUint32(o+4,true),rp=seen.getUint32(o+8,true),players=seen.getUint8(o+20),maximum=seen.getUint8(o+21),open=seen.getUint8(o+22)===0,privateLobby=seen.getUint8(o+25)!==0,staged=!!(seen.getUint8(o+24)&1)||seen.getUint8(o+26)!==0,hstage=seen.getUint8(o+28),classRestricted=(seen.getUint8(o+33)&1)!==0,heard=seen.getBigInt64(o+C.heard,true),rv=rp?raceAt(rp):null,eventHash=rv?.getUint32(8,true),x=seen.getFloat32(o+12,true),y=seen.getFloat32(o+16,true);
     if(!uint(id)||!uint(hostId)||!eventHash||players<1||maximum<2||maximum>6||players>maximum||heard<=0n||![x,y].every(Number.isFinite))continue;
     const key=[hostId,id,eventHash].join(':'),prior=adverts.get(key);liveKeys.add(key);if(!prior)adverts.set(key,{heard,changedAt:null});else if(heard>prior.heard)adverts.set(key,{heard,changedAt:now});else if(heard<prior.heard)adverts.set(key,{heard,changedAt:null});
     const tracked=adverts.get(key),fresh=tracked.changedAt!==null&&now-tracked.changedAt<=3500&&nativeAdvancing,destinations=result.catalog.filter(d=>d.eventHash===eventHash&&d.racePointer===rp&&Math.hypot((d.box[0]+d.box[2])/2-x,(d.box[1]+d.box[3])/2-y)<5);
     // Private or new class-constrained offers require native predicates not
     // reconstructed here. Omit them instead of inventing eligibility.
     if(destinations.length===1&&open&&!privateLobby&&!classRestricted&&(!staged||stage<=(hstage||rv.getUint8(55))))result.offers.push({host:hostId,lobby:id,eventHash,destinationKey:destinations[0].key,players,maximum,open,eligible:true,fresh});
    }
    for(const key of adverts.keys())if(!liveKeys.has(key))adverts.delete(key);
   }
   r.finish();for(const{p,b}of hostReads){const live=new Uint8Array(r.buffer,p,b.length);if(b.some((v,i)=>v!==live[i]))throw Error('host-snapshot-changed');}if(memory.buffer!==r.buffer)throw Error('memory-changed');lastSnapshot=result;return result;
  }catch(e){lastSnapshot=null;return{verified:!!profile,fresh:false,reason:String(e.message||'hosted-read'),catalog:[],offers:[],state:null};}
 }
 function join(tuple,destination,context){
  const s=observe(context);if(!s.fresh||!s.safe||!s.inRoam||s.state!==0||s.manual!==true||s.kind!==1||s.aiOwned||s.handbackPending||s.speed>.5||!s.allowNetwork)return false;
  // Capacity and eligibility belong to this reread, not the selected advert.
  const d=s.catalog.find(d=>d.key===destination?.key);if(!d||!s.offers.some(o=>o.fresh===true&&o.open===true&&o.eligible===true&&Number.isInteger(o.players)&&Number.isInteger(o.maximum)&&o.players>=1&&o.players<o.maximum&&o.maximum>=2&&o.maximum<=6&&o.host===tuple.host&&o.lobby===tuple.lobby&&o.eventHash===tuple.eventHash&&o.destinationKey===d.key)||s.position.x<d.box[0]||s.position.x>d.box[2]||s.position.y<d.box[1]||s.position.y>d.box[3]||Math.abs(s.position.z-d.marker.z)>4)return false;
  const current=session();if(current?.proc?.memory!==memory||typeof current?.input?.lobby!=='function'||current.input.canQuit?.()!==true)return false;
  return current.input.lobby(4,tuple.host,tuple.lobby,tuple.eventHash)===true;
 }
 return Object.freeze({observe,join,get supported(){return!!profile;},get lastSnapshot(){return lastSnapshot;}});
}
const api=Object.freeze({create,C,select});if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_AUTONOMY_HOSTED__=api;
})(globalThis);
