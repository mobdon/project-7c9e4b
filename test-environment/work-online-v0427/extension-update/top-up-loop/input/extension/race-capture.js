(function(root){
'use strict';
const Config=root.__NFSU2_RACE_CAPTURE_CONFIG__||(typeof require==='function'?require('./race-capture-config.js'):null);
const Geometry=root.__NFSU2_RACE_WINDOW_GEOMETRY__||(typeof require==='function'?require('./race-window-geometry.js'):null);
const PIN='128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6';
const B=0xd0d800,MAGIC=0x31504752,SIZE=2048,CBITS=695500640,MAX_SAMPLES=256;
const read=(b,p)=>{let n=0,s=0,x;do{if(p.i>=b.length||s>28)throw Error('Invalid module integer');x=b[p.i++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};
const leb=n=>{const a=[];do{let x=n&127;n>>>=7;a.push(x|(n?128:0));}while(n);return Uint8Array.from(a);};
const join=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
const header=b=>{const p={i:0},n=read(b,p),types=[];for(let i=0;i<n;i++){const count=read(b,p),type=b[p.i++];for(let k=0;k<count;k++)types.push(type);}return{end:p.i,types};};
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
async function patchModule(input,profile){
 if(profile?.hash!==PIN||!Config)throw Error('Race geometry capture is not verified for this build');
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input),p={i:8};
 while(p.i<bytes.length){const start=p.i,id=bytes[p.i++],size=read(bytes,p),begin=p.i,end=begin+size;if(end>bytes.length)throw Error('Invalid module section');
  if(id===10){const n=read(bytes,p),pieces=[bytes.subarray(begin,p.i)];let patched=0;
   for(let i=0;i<n;i++){const at=p.i,len=read(bytes,p),offset=p.i,stop=offset+len;if(stop>end)throw Error('Invalid function body');
    if(i===13186-37){const old=bytes.subarray(offset,stop),a=header(old),pre=Uint8Array.from(Config.pre),post=Uint8Array.from(Config.post),ph=header(pre),qh=header(post);
     if(len!==Config.originalLength||await digest(old)!==Config.originalHash||a.end!==Config.headerBytes||ph.types.length!==Config.totalLocals||qh.types.length!==Config.totalLocals)throw Error('Race geometry safe point changed');
     const parts=[pre.subarray(0,ph.end)];let cursor=a.end;
     for(const site of Config.callOffsets){const needle=Config.callBytes;if(needle.some((v,j)=>old[site+j]!==v))throw Error('Race geometry planner call changed');
      parts.push(old.subarray(cursor,site),pre.subarray(ph.end,pre.length-1),old.subarray(site,site+needle.length),post.subarray(qh.end,post.length-1));cursor=site+needle.length;
     }
     parts.push(old.subarray(cursor));const next=join(...parts);pieces.push(leb(next.length),next);patched++;
    }else pieces.push(bytes.subarray(at,stop));p.i=stop;
   }
   if(patched!==1||p.i!==end)throw Error('Race geometry safe point missing');const code=join(...pieces);return join(bytes.subarray(0,start),Uint8Array.of(10),leb(code.length),code,bytes.subarray(end));
  }p.i=end;
 }
 throw Error('Game code section missing');
}
const owners=new WeakMap();
const GLOBAL_SPANS=[[0x8654a4,4],[0xd00000,0x34],[0x89cf69,1],[0x89e7a0,0x3a],[0x850078,4],[0x8669f4,0x24],[0x890104,0x18],[0x86518c,4],[0x86346c,8],[0x883dac,4]];
const REQUEST_FIELDS=[[32,'player'],[36,'car'],[40,'driver'],[44,'route'],[48,'race'],[52,'track'],[56,'reverse'],[60,'tick'],[124,'clock'],[1408,'event'],[1412,'eventHash'],[1416,'starts'],[1420,'trackInfo'],[1424,'region'],[1428,'heat'],[1432,'heatCount'],[1436,'heatIndex'],[1472,'regionTail']];
const IDENTITY_FIELDS=[[64,'player'],[68,'car'],[72,'driver'],[76,'route'],[80,'race'],[84,'track'],[88,'reverse'],[1440,'event'],[1444,'eventHash'],[1448,'starts'],[1452,'trackInfo'],[1456,'region'],[1460,'heat'],[1464,'heatCount'],[1468,'heatIndex'],[1476,'regionTail']];
const reasons={1:'A required memory page was unavailable',2:'Native planner safe point was not confirmed',3:'Waiting for an offline single-player race',4:'Online/LAN is excluded',5:'Drag and drift are excluded',6:'Capture request expired',7:'Race layout changed',8:'Owned AI route changed',9:'Race is not driving',10:'Native route count was invalid',11:'Capture was cancelled'};
class Controller{
 constructor(memory,verified=false,moduleIdentity=null){this.memory=memory;this.moduleIdentity=moduleIdentity;this.claimed=false;this.verified=verified;this.enabled=false;this.pending=null;this.seq=0;this.samples=[];this.text='Off · read-only research';this.identity=null;this.stopped=false;this.last=0;}
 view(){return new DataView(this.memory.buffer);}
 words(){return new Int32Array(this.memory.buffer);}
 atom(off){return Atomics.load(this.words(),(B+off)/4)>>>0;}
 put(off,value){Atomics.store(this.words(),(B+off)/4,value|0);}
 owns(){const o=owners.get(this.memory);return this.claimed&&o?.controller===this&&o.module===this.moduleIdentity;}
 valid(p,n,allowMailbox=false){const v=this.view();if(!Number.isSafeInteger(p)||p<65536||!Number.isSafeInteger(n)||n<=0||(!allowMailbox&&p<B+SIZE&&p+n>B)||p+n>Math.min(v.byteLength,0x28000000)||v.byteLength<CBITS+32768)return false;for(let q=p&-16384;q<p+n;q+=16384){const pg=q>>>14;if(!((v.getUint8(CBITS+(pg>>>3))>>>(pg&7))&1))return false;}return true;}
 context(){
  if(!this.verified||this.memory.buffer.byteLength<CBITS+32768||!GLOBAL_SPANS.every(([p,n])=>this.valid(p,n)))return null;
  const v=this.view(),u=p=>v.getUint32(p,true);
  if(u(0x8654a4)!==6||u(0xd00030)!==1||u(0x89e7b0)!==1||(u(0x850078)&520)||u(0x866a14)||u(0x8669f4)||v.getUint8(0x89cf69)||v.getUint8(0x89e7d8)||v.getUint8(0x89e7d9)||u(0x890108)||u(0x890104)||u(0x890114))return null;
  const player=u(0xd00000);if(!this.valid(player,20)||u(player+16)!==0)return null;
  const car=u(player+4);if(!this.valid(car,48)||u(car+36)!==3)return null;
  const driver=u(car+44);if(!this.valid(driver,0x6ec)||u(driver+4)!==car)return null;
  const route=u(driver+0x6e8);if(route!==driver+0x370||!this.valid(route,0x354))return null;
  const race=u(0x890118);if(!this.valid(race,0x18)||u(race)!==4)return null;
  const track=u(0x89e7a0),reverse=u(0x89e7a4),event=u(0x863470),starts=u(0x86346c),trackInfo=u(0x883dac);if(track<1||track>65535||reverse>1||!this.valid(trackInfo,0x8c)||v.getUint16(trackInfo+0x8a,true)!==track)return null;
  const region=u(trackInfo+0x40),regionTail=u(trackInfo+0x44);let eventHash=0,heat=0,heatCount=0,heatIndex=0xffffffff;
  if(event){if(!this.valid(event,0x88)||!this.valid(0x85ef48,8))return null;eventHash=u(event+8);heat=u(0x85ef48);heatCount=u(0x85ef4c);
   const delta=heat-0x85bab8;if(!eventHash||heatCount<1||heatCount>4||heatCount!==v.getInt8(event+0x7e)||delta<0||delta%0xd24)return null;heatIndex=delta/0xd24;
   if(heatIndex>=heatCount||!this.valid(heat,12)||u(heat)!==track||u(heat+4)!==reverse)return null;
   const tuple=event+0x18+4*heatIndex;if(v.getInt16(tuple,true)!==track||(v.getUint8(tuple+2)&1)!==reverse||v.getInt8(tuple+3)!==v.getInt32(heat+8,true))return null;
  }
  return{player,car,driver,route,race,track,reverse,tick:u(0x86518c),clock:u(race+0x14),event,eventHash,starts,trackInfo,region,regionTail,heat,heatCount,heatIndex};
 }
 claim(){
  if(!this.verified||!this.moduleIdentity||!this.valid(B,SIZE,true))throw Error('Capture mailbox unavailable');
  const owner=owners.get(this.memory);if(owner&&(owner.controller!==this||owner.module!==this.moduleIdentity))throw Error('Game memory already has a capture owner. Reload before recording');
  const v=this.view();if(!this.claimed){for(let i=0;i<SIZE;i++)if(v.getUint8(B+i)!==0)throw Error('Capture mailbox already occupied');this.put(4,1);this.put(0,MAGIC);owners.set(this.memory,{controller:this,module:this.moduleIdentity});this.claimed=true;}
  if(this.atom(0)!==MAGIC||this.atom(4)!==1)throw Error('Capture mailbox version changed');
 }
 start(){this.claim();if(this.pending&&this.atom(16)===this.pending.seq)this.pending=null;if(this.pending)throw Error('Previous capture is not settled; reload before retrying');this.enabled=true;this.stopped=false;this.samples=[];this.identity=null;this.last=0;this.text='Armed · waiting for offline native race AI';}
 stop(reason='Off · read-only research'){
  this.enabled=false;this.stopped=true;if(this.verified&&this.owns()&&this.valid(B,SIZE,true)&&this.atom(0)===MAGIC&&this.atom(4)===1)this.put(12,0);this.text=reason;
 }
 invalidate(reason='Game session ended'){this.stop(reason);this.verified=false;}
 poll(now=performance.now()){
  if(!this.enabled)return;
  try{
   if(!this.verified||!this.owns()||!this.valid(B,SIZE,true)||this.atom(0)!==MAGIC||this.atom(4)!==1)throw Error('Capture mailbox ownership was lost');
   const context=this.context();
   if(this.pending){
    const q=this.pending;
    if(this.atom(16)===q.seq){
     this.put(12,0);const status=this.atom(20);this.pending=null;
     if(status)throw Error(reasons[status]||'Capture was rejected');
     const sample=this.readSample(q);if(!context||this.key(context)!==q.key||((context.clock-q.context.clock)>>>0)>10000)throw Error('Race changed before the sample was received');
     this.samples.push(sample);this.last=now;
     this.text=`${this.samples.length} native windows · ${this.stats().sampledRecords} sampled corner records · partial only`;
     if(this.samples.length>=MAX_SAMPLES)this.stop('Recording complete · 256 windows, partial route only');
    }else if(now-q.time>2500)throw Error('Native planner did not acknowledge. Recording stopped; reload before retrying');
    return;
   }
   if(!context){if(this.identity)this.stop('Recording stopped · race context changed');else this.text='Armed · needs offline race AI; no control settings changed';return;}
   const key=this.key(context);if(this.identity&&(key!==this.identity||((context.clock-this.lastClock)>>>0)>10000)){this.stop('Recording stopped · race layout or car changed');return;}
   if(now-this.last<100)return;this.identity=key;this.lastClock=context.clock;
   this.seq=((Math.max(this.seq,this.atom(16))+2)&0x7ffffffe)||2;const seq=this.seq;
   this.put(8,seq|1);for(const [o,k]of REQUEST_FIELDS)this.put(o,context[k]);
   this.put(12,1);this.pending={seq,key,time:now,context};this.put(8,seq);
  }catch(e){this.stop(String(e.message||'Capture unavailable'));}
 }
 key(c){return IDENTITY_FIELDS.map(([,k])=>c[k]).join(':');}
 readSample(q){
  if(this.atom(16)!==q.seq||this.atom(120)!==q.seq)throw Error('Incomplete capture publication');
  const copy=Uint8Array.from(new Uint8Array(this.memory.buffer,B,SIZE));if(this.atom(16)!==q.seq)throw Error('Capture publication changed');
  const v=new DataView(copy.buffer),u=o=>v.getUint32(o,true),f=o=>v.getFloat32(o,true),n=u(96),count=u(100),mask=u(112);
  if(n>40||count>5)throw Error('Invalid native sample count');
  for(const [o,k]of IDENTITY_FIELDS)if(u(o)!==q.context[k])throw Error('Captured event identity mismatch');
  const nodes=Array.from({length:n},(_,i)=>({index:u(128+i*16+12),distance:f(128+i*16+4),cap:f(128+i*16+8)}));
  const corners=Array.from({length:count},(_,i)=>{const p=768+i*128,sampleIndex=v.getInt8(p+116);
   if(!(mask&(1<<i)))return{index:i,sampleIndex,status:'unknown',reason:'native-tail-not-sampled'};
   const points=Array.from({length:5},(_,j)=>[f(p+8*j),f(p+8*j+4)]),distances=Array.from({length:5},(_,j)=>f(p+40+4*j));
   if(!points.flat().every(Number.isFinite)||!distances.every(Number.isFinite))return{index:i,sampleIndex,status:'unknown',reason:'non-finite-geometry'};
   if(!distances.every((v,j)=>j===0||v>distances[j-1]))return{index:i,sampleIndex,status:'unknown',reason:'native-distance-order-unverified'};
   return{index:i,sampleIndex,status:'sampled',points,distances,geometry:Geometry?.triple(points[1],points[2],points[3])||null,analysis:Geometry?.inspectPolyline({source:'native-race-route',orderVerified:true,coverage:'single-native-corner-record',points})||null};});
  if(!nodes.every(x=>Number.isFinite(x.distance)&&Number.isFinite(x.cap)))throw Error('Non-finite native route node');
  if(((u(104)-q.context.clock)>>>0)>8000)throw Error('Race clock changed during capture');
  const regionBytes=[...[0,8,16,24].map(shift=>(u(1456)>>>shift)&255),...[0,8,16,24].map(shift=>(u(1476)>>>shift)&255)],nul=regionBytes.indexOf(0),region=nul>0?String.fromCharCode(...regionBytes.slice(0,nul)):'';
  return{eventHash:u(1444)?u(1444).toString(16).padStart(8,'0'):null,careerHeat:u(1440)?u(1468)+1:null,careerHeatCount:u(1440)?u(1464):null,eventIdentityVerified:!!u(1440),heatIdentityVerified:!!u(1440),startCounter:u(1448),region:/^[A-Z0-9]{1,7}$/.test(region)?region:null,tick:u(92),raceClock:u(104),track:u(84),reverse:!!u(88),nodeCount:n,cornerCount:count,nodes,corners,coverage:'rolling-driver-window',wholeRaceChecked:false};
 }
 stats(){const records=this.samples.flatMap(s=>s.corners);return{recordedWindows:this.samples.length,sampledRecords:records.filter(r=>r.status==='sampled').length,unknownRecords:records.filter(r=>r.status!=='sampled').length,priorityRecords:records.filter(r=>r.analysis?.priorityCorners?.length).length,uniqueCornersVerified:false};}
 export(){return{summary:this.stats(),schema:'nfsu2-race-geometry-v1',moduleSha256:PIN,source:'owned-native-race-route',identityScope:'career-event-and-heat-when-present; quick-race-heat-unknown',thresholdDegrees:75,wholeRaceChecked:false,coverage:'partial-native-windows',samples:this.samples,
  limits:{maxSamples:MAX_SAMPLES,maxNodes:40,maxCorners:5},notice:'Research capture only. No controls changed. No complete race, verified spline ordering, altitude or between-sample coverage is claimed.'};}
}
const api={Controller,patchModule,BASE:B,MAGIC,SIZE,PIN};root.__NFSU2_RACE_CAPTURE__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
