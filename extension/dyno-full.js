(function(root){
'use strict';
const Core=typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-core.js'):root.__NFSU2_DYNO_CORE__;
const BASE=0xd0d300,MAGIC=0x384e5944,BUFFER_MAGIC=0x3154464e,CAPACITY=0x1000000;
const Evaluator=typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-evaluator.js'):root.__NFSU2_DYNO_EVALUATOR__;
const allocations=new WeakMap();
const readinessLabels=Object.freeze({
 ready:'Ready for the selected tuning preset.',
 unsupported:'Preset tuning is unavailable on this game build.',
 failed:'A tuner request lost acknowledgement. Reload the game before retrying.',
 'mailbox-memory':'Waiting for the game tuning mailbox.',
 'mailbox-signature':'Tuning mailbox is unavailable. Reload the game before retrying.',
 'local-players':'Preset tuning requires exactly one local player.',
 'network-mode':'Preset tuning requires a solo game session.',
 'session-state':'Leave multiplayer and return to solo Performance Tuning.',
 'revision-unsupported':'Preset tuning is unavailable on this game revision.',
 'dyno-memory':'Waiting for the game tuning data.',
 'tuning-context':'Open the solo Performance Tuning main screen and select a race preset.',
 'setup-invalid':'The selected tuning setup is not supported.',
 'snapshot-changed':'Tuning data changed while reading. Wait for the screen to settle.',
 'native-policy':'Waiting for the current native tuning policy to initialize.',
 'native-policy-initialization':'Load settings to initialize the game’s native tuning policy for this solo preset.',
 'screen-pointer':'Waiting for the Performance Tuning screen data.',
 'screen-main':'Return to the solo Performance Tuning main screen.',
 'memory-unavailable':'Tuning data is unavailable. Reload the game before retrying.'
});
const readinessStates=Object.freeze(Object.fromEntries(Object.entries(readinessLabels).map(([code,message])=>[code,Object.freeze({ready:code==='ready',code,message})])));
const inspectReasons=Object.freeze({'Unsupported game revision':'revision-unsupported','Dyno memory unavailable':'dyno-memory','Open Performance Tuning / Dyno':'tuning-context','Unrecognized tuning setup':'setup-invalid','Dyno changed while reading':'snapshot-changed'});
const errors={1:'Cancelled before applying a tune',2:'Open the solo Performance Tuning main screen with one local player',3:'Car, mode, installed parts or tuning changed. Find a new tune first',4:'Unsupported tuning request',5:'A selected tuning setting is locked',6:'Native dyno calculation returned an invalid result',8:'Full tuner snapshot layout is unsupported; no setup changes were made'};
// Fixed native guard IDs only. Never interpolate addresses or arbitrary game text.
const snapshotGuards=Object.freeze({
 1:'snapshot buffer bounds or alignment',2:'snapshot buffer signature',3:'snapshot protocol version',4:'snapshot buffer capacity',5:'snapshot buffer ownership',
 10:'tuning screen pointer',11:'preset record pointer',12:'active setup pointer',13:'local player pointer',14:'local car pointer',15:'car data pointer',
 20:'car data is not in a supported active ride',21:'car data overlaps preset records',22:'car data overlaps runtime state',23:'car data overlaps the car object',24:'car data overlaps the player object',
 30:'tuning rule count',31:'parts catalog count',32:'performance-curve sample count',
 40:'game image bounds',41:'car data bounds',42:'stock car data bounds',43:'tuning rule bounds',44:'parts catalog bounds',45:'performance-curve data bounds',
 50:'overlapping snapshot sources',60:'performance curve overlaps installed parts',70:'parts catalog child count',71:'parts lookup outside the captured catalog',72:'parts lookup alignment',73:'parts lookup references a missing child',74:'parts lookup selector mismatch',75:'native tuning policy is not initialized'
});
function rejection(status,guard,observed){
 const known=Object.hasOwn(snapshotGuards,guard),code=known?guard:0;
 let message=errors[status]||'Tuning request rejected';
 if(status===8&&known){
  const count=[30,31,32,70].includes(code)?` (${observed})`:'';
  message=`Tuner snapshot stopped [S${code}]: ${snapshotGuards[code]}${count}. No setup changes were made. ${code<=5?'Reload the game before retrying.':'Export crash log after this error.'}`;
 }
 const error=Error(message);error.dynoStatus=status;
 if(status===8){error.dynoGuard=code;if(known&&[30,31,32,50,70].includes(code))error.dynoObserved=observed;}
 return error;
}
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
class Controller {
 constructor(memory,patched,revision=Core.REVISION,{prepared,module}={}){this.prepared=prepared;this.module=module;this.pb=0;this.evaluator=null;this.full=true;this.memory=memory;this.patched=patched;this.revision=revision;this.enabled=false;this.pending=null;this.lease=null;this.outcome=null;this.applied=null;this.seq=0;this.busy=false;this.abortController=null;this.failed=false;this.context=null;this.contexts=new Map();this.searchContext=null;this.editor=null;}
 view(){return new DataView(this.memory.buffer);}
 words(){return new Int32Array(this.memory.buffer);}
 u32(n){return this.view().getUint32(BASE+n,true);}
 set(n,v){this.view().setUint32(BASE+n,v,true);}
 bytes(n,v){new Uint8Array(this.memory.buffer,BASE+n,v.length).set(v);}
 available(){return this.patched&&!this.failed&&this.memory.buffer.byteLength>BASE+512&&this.u32(32)===MAGIC&&[0,MAGIC].includes(this.u32(0));}
 readiness(){return this.inspectReadiness(false);}
 captureReadiness(){return this.inspectReadiness(true);}
 inspectReadiness(capture){
  try{
   if(!this.available())return readinessStates[!this.patched?'unsupported':this.failed?'failed':this.memory.buffer.byteLength<=BASE+512?'mailbox-memory':'mailbox-signature'];
   const v=this.view(),u=p=>v.getUint32(p,true),valid=p=>p>=0x10000&&p+4096<Math.min(v.byteLength,0x28000000);
   if(u(0xd00030)!==1)return readinessStates['local-players'];
   if(u(0x850078)&520)return readinessStates['network-mode'];
   if(this.revision==='bdc9cbc2'){if(u(704975480)!==0)return readinessStates['network-mode'];if(u(673810672)>1)return readinessStates['native-policy'];}
   if(this.revision==='b1efa173'){if(u(705706016)!==0)return readinessStates['network-mode'];if(u(673812320)>1)return readinessStates['native-policy'];}
   let initializePolicy=false;
   if(this.revision==='ed8d3359'){if(u(704979224)!==0)return readinessStates['network-mode'];if(u(673813312)>1)return readinessStates['native-policy'];}
   if(this.revision==='102c8d92'){if(u(704980184)!==0)return readinessStates['network-mode'];const policy=u(673813984);if(policy>1){if(capture&&(policy|0)<0)initializePolicy=true;else return readinessStates['native-policy'];}}
   if(u(0x866a14)||u(0x8669f4)||v.getUint8(0x89cf69))return readinessStates['session-state'];
   const inspected=Core.inspect(this.memory,this.revision);if(!inspected.available)return readinessStates[inspectReasons[inspected.reason]||'tuning-context'];
   let p=u(0x8384c4);if(!valid(p))return readinessStates['screen-pointer'];p=u(p+8);if(!valid(p))return readinessStates['screen-pointer'];p=u(p+228);if(!valid(p))return readinessStates['screen-pointer'];p=u(p+12);if(!valid(p))return readinessStates['screen-pointer'];
   const expected='UI_PerformanceDyno_MAIN.fng\0';return readinessStates[Array.from(expected).every((x,i)=>v.getUint8(p+i)===x.charCodeAt(0))?initializePolicy?'native-policy-initialization':'ready':'screen-main'];
  }catch{return readinessStates['memory-unavailable'];}
 }
 canUse(){return this.readiness().ready;}
 canCapture(){const state=this.captureReadiness();return state.ready||state.code==='native-policy-initialization';}
 captureContext(){
  if(this.busy||!this.canCapture()||this.applied)return null;
  if(this.canUse())return this.syncContext();
  // An unresolved native policy never revives an earlier private draft/lease.
  // The native capture must establish a fresh policy lease before editing.
  const current=Core.inspect(this.memory,this.revision);if(!current.available)return null;
  this.contexts.clear();this.context=null;this.outcome=null;this.lease=null;this.editor=null;
  return {key:`${current.record}:${current.tuned}:${current.kind}`,record:current.record,tuned:current.tuned,kind:current.kind,changed:true,initializingPolicy:true};
 }
 // Keep search/restore ownership separate for each native car and tuning mode.
 // This only changes UI state. Native command guards still authorize every write.
 syncContext(){
  if(this.busy||!this.canUse())return null;
  const current=Core.inspect(this.memory,this.revision);if(!current.available)return null;
  const key=`${current.record}:${current.tuned}:${current.kind}`,changed=this.context?.key!==key;
  if(changed){
   if(this.context?.record===current.record&&this.context?.tuned===current.tuned)this.contexts.set(this.context.key,{outcome:this.outcome,applied:this.applied,lease:this.lease,editor:this.editor});
   else this.contexts.clear(); // Never revive a lease across replacement car/ride objects.
   const saved=this.contexts.get(key);
   this.outcome=saved?.outcome||null;this.applied=saved?.applied||null;this.lease=saved?.lease||null;this.editor=saved?.editor||null;
   this.context={key,record:current.record,tuned:current.tuned,kind:current.kind};
  }
  const owned=this.applied||this.outcome||this.editor;let invalidated=false;
  if(owned){
   const lease=owned.lease,expected=this.applied?owned.current:owned.baseline,v=this.view();
   const parts=lease?.parts,valid=parts>=0x10000&&parts+148<=Math.min(v.byteLength,0x28000000);
   if(!lease||['record','tuned','kind'].some(k=>lease[k]!==current[k])||!eq(current.setup,expected)||!valid||v.getUint32(current.tuned+8,true)!==parts||!eq(new Uint8Array(v.buffer,parts,148),lease.partBytes)||this.revision==='bdc9cbc2'&&(!lease.nativePolicy||lease.nativePolicy.magic!==826495054||![0,1].includes(lease.nativePolicy.cache)||lease.nativePolicy.online!==0||v.getUint32(673810672,true)!==lease.nativePolicy.cache||v.getUint32(704975480,true)!==lease.nativePolicy.online)||this.revision==='b1efa173'&&(!lease.nativePolicy||lease.nativePolicy.magic!==826495054||![0,1].includes(lease.nativePolicy.cache)||lease.nativePolicy.online!==0||v.getUint32(673812320,true)!==lease.nativePolicy.cache||v.getUint32(705706016,true)!==lease.nativePolicy.online)||this.revision==='ed8d3359'&&(!lease.nativePolicy||lease.nativePolicy.magic!==826495054||![0,1].includes(lease.nativePolicy.cache)||lease.nativePolicy.online!==0||v.getUint32(673813312,true)!==lease.nativePolicy.cache||v.getUint32(704979224,true)!==lease.nativePolicy.online)||this.revision==='102c8d92'&&(!lease.nativePolicy||lease.nativePolicy.magic!==826495054||![0,1].includes(lease.nativePolicy.cache)||lease.nativePolicy.online!==0||v.getUint32(673813984,true)!==lease.nativePolicy.cache||v.getUint32(704980184,true)!==lease.nativePolicy.online)){
    // Manual edits/part changes invalidate restoration, never overwrite them.
    this.outcome=null;this.applied=null;this.lease=null;this.editor=null;this.contexts.delete(key);invalidated=true;
   }
  }
  return {...this.context,changed,invalidated};
 }
 setEnabled(value){this.enabled=!!value;if(!this.enabled)this.cancel();}
 cancel(){this.abortController?.abort();if(this.patched&&this.memory.buffer.byteLength>BASE+512&&this.u32(32)===MAGIC&&[0,MAGIC].includes(this.u32(0)))Atomics.store(this.words(),(BASE+12)>>2,0);}
 allocate(){
  if(this.pb)return this.pb;
  const known=allocations.get(this.memory);
  if(known){if(known.module!==this.module)throw Error('Game memory was reused by another module. Reload before tuning.');this.pb=known.pb;return this.pb;}
  if(this.u32(100)!==0)throw Error('Full tuner buffer already has another owner. Reload before tuning.');
  const pages=this.memory.grow(256),pb=pages*65536;
  if(pb<0x40000000||pb+CAPACITY>this.memory.buffer.byteLength)throw Error('Could not allocate an isolated tuner mailbox');
  this.pb=pb;allocations.set(this.memory,{module:this.module,pb});const v=this.view();v.setUint32(pb,BUFFER_MAGIC,true);v.setUint32(pb+4,1,true);v.setUint32(pb+8,CAPACITY,true);return pb;
 }
 async request(cmd,{lease,expected,expectedVisit,candidate,candidateVisit,signal}={}){
  if(!this.enabled||!this.available())throw Error('Enable full tuning and reload the supported game first');
  if(this.pending)throw Error('A game-thread request is still pending');
  if(signal?.aborted)throw Object.assign(Error('Tuning cancelled'),{name:'AbortError'});
  if(![16,17,18,19].includes(cmd))throw Error('Unsupported full-tuner command');
  const pb=this.allocate(),v=this.view(),put=(o,n)=>v.setUint32(pb+o,n,true),copy=(o,b)=>new Uint8Array(this.memory.buffer,pb+o,b.length).set(b);
  if(cmd===17||cmd===18){
   if(!lease||lease.partBytes?.length!==148||lease.recordBytes?.length!==205)throw Error('Missing full tuning lease');
   for(const x of [expected,expectedVisit,candidate,candidateVisit])Core.setupCopy(x);
  }
  if(this.revision==='bdc9cbc2'&&lease){const p=lease.nativePolicy;if(p?.magic!==826495054||p.moduleHash!=='395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e'||![0,1].includes(p.cache)||p.online!==0)throw Error('Missing captured native tuning policy');}
  if(this.revision==='b1efa173'&&lease){const p=lease.nativePolicy;if(p?.magic!==826495054||p.moduleHash!=='3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb'||![0,1].includes(p.cache)||p.online!==0)throw Error('Missing captured native tuning policy');}
  if(this.revision==='ed8d3359'&&lease){const p=lease.nativePolicy;if(p?.magic!==826495054||p.moduleHash!=='f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b'||![0,1].includes(p.cache)||p.online!==0)throw Error('Missing captured native tuning policy');}
  if(this.revision==='102c8d92'&&lease){const p=lease.nativePolicy;if(p?.magic!==826495054||p.moduleHash!=='2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'||![0,1].includes(p.cache)||p.online!==0)throw Error('Missing captured native tuning policy');}
  this.seq=((Math.max(this.seq,this.u32(36))+2)&0x7ffffffe)||2;const seq=this.seq;
  Atomics.store(this.words(),(BASE+4)>>2,seq|1);this.set(0,MAGIC);this.set(8,cmd);this.set(96,pb);this.set(104,0);this.set(108,0);
  if(lease){for(const [o,key]of [[16,'record'],[20,'tuned'],[24,'kind'],[28,'parts'],[32,'ride']])put(o,lease[key]);copy(352,lease.partBytes);copy(624,lease.recordBytes);if(this.revision==='bdc9cbc2'){const p=lease.nativePolicy;put(124,p.magic);put(224,p.cache);put(228,p.online);}if(this.revision==='b1efa173'){const p=lease.nativePolicy;put(124,p.magic);put(224,p.cache);put(228,p.online);}if(this.revision==='ed8d3359'){const p=lease.nativePolicy;put(124,p.magic);put(224,p.cache);put(228,p.online);}if(this.revision==='102c8d92'){const p=lease.nativePolicy;put(124,p.magic);put(224,p.cache);put(228,p.online);}}
  if(expected)copy(256,expected);if(expectedVisit)copy(304,expectedVisit);if(candidate)copy(512,candidate);if(candidateVisit)copy(560,candidateVisit);
  Atomics.store(this.words(),(BASE+12)>>2,1);
  const cancel=()=>{if(this.available())Atomics.store(this.words(),(BASE+12)>>2,0);};signal?.addEventListener('abort',cancel,{once:true});
  const waiting=new Promise((resolve,reject)=>{
   const started=Date.now();const poll=()=>{try{
    if(!this.available())throw Error('Tuner ownership was lost. Reload before retrying.');
    if(Atomics.load(this.words(),(BASE+36)>>2)===seq){
     signal?.removeEventListener('abort',cancel);const status=this.u32(40);if(status){reject(rejection(status,this.u32(104),this.u32(108)));return;}
     const rv=this.view(),u=o=>rv.getUint32(pb+o,true),b=(o,n)=>Uint8Array.from(new Uint8Array(this.memory.buffer,pb+o,n));
     const setup=Core.setupCopy(b(256,41)),resultLease={record:u(16),tuned:u(20),kind:u(24),parts:u(28),ride:u(32),partBytes:b(352,148),visitBytes:Core.setupCopy(b(304,41)),recordBytes:b(624,205)};
     let snapshot=null;
     if(this.revision==='bdc9cbc2'){if(u(124)!==826495054||u(224)>1||u(228)!==0)throw Error('Invalid captured native tuning policy');resultLease.nativePolicy={magic:u(124),cache:u(224),online:u(228),moduleHash:'395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e'};}
     if(this.revision==='b1efa173'){if(u(124)!==826495054||u(224)>1||u(228)!==0)throw Error('Invalid captured native tuning policy');resultLease.nativePolicy={magic:u(124),cache:u(224),online:u(228),moduleHash:'3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb'};}
     if(this.revision==='ed8d3359'){if(u(124)!==826495054||u(224)>1||u(228)!==0)throw Error('Invalid captured native tuning policy');resultLease.nativePolicy={magic:u(124),cache:u(224),online:u(228),moduleHash:'f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b'};}
     if(this.revision==='102c8d92'){if(u(124)!==826495054||u(224)>1||u(228)!==0)throw Error('Invalid captured native tuning policy');resultLease.nativePolicy={magic:u(124),cache:u(224),online:u(228),moduleHash:'2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'};}
     if(cmd===16){
      if(u(120)!==6||u(72)>CAPACITY)throw Error('Invalid full tuner capture');const ranges=[];
      for(let i=0;i<6;i++){const p=128+i*16,address=u(p),offset=u(p+4),length=u(p+8);if(length===0)continue;if(offset<4096||offset+length>u(72))throw Error('Invalid capture range');ranges.push({address,data:b(offset,length),writable:i===1||i===5});}
      snapshot={...resultLease,setup,carType:u(36),ranges};
     }
     resolve({setup,lease:resultLease,snapshot,saveReady:u(68)===1,saveState:'not-confirmed',staged:cmd===17||cmd===18});return;
    }
    if(Date.now()-started>8000){cancel();this.failed=true;throw Error('Game did not acknowledge tuning. An outcome may be uncertain; reload before retrying.');}
    setTimeout(poll,16);
   }catch(error){signal?.removeEventListener('abort',cancel);cancel();this.failed=true;reject(error);}};setTimeout(poll,0);
  });
  this.pending=waiting;Atomics.store(this.words(),(BASE+4)>>2,seq);
  try{return await waiting;}finally{this.pending=null;}
 }
 async acquire({signal}={}){
  if(!this.prepared)throw Error('Full tuner evaluator was not prepared. Reload the supported game.');
  if(!this.evaluator)this.evaluator=await Evaluator.create(await this.prepared);
  const x=await this.request(16,{signal}),expected=this.searchContext;
  if(expected&&['record','tuned','kind'].some(k=>x.lease[k]!==expected[k]))throw Error('Car or race mode changed. Load the selected mode again.');
  const permissions=this.evaluator.load(x.snapshot);this.lease={...x.lease,baseline:x.setup,snapshot:x.snapshot};
  const measured=await this.evaluator.evaluate(x.setup,{signal});
  return {...x,...permissions,result:measured.result,lease:this.lease};
 }
 async evaluate({lease,setup,signal}){
  if(lease!==this.lease)throw Error('Expired tuning baseline');
  this.evaluator.load(lease.snapshot);return this.evaluator.evaluate(setup,{signal});
 }
 async release({lease}){if(this.pending)try{await this.pending;}catch{};if(this.failed)return {restored:false,reason:'game acknowledgement timed out'};return {restored:true};}
 async find({goal='peakPower',onProgress=()=>{}}={}){
  if(this.busy)throw Error('Tuner is already busy');if(!['peakPower','peakTorque','acceleration60','acceleration100','topSpeed'].includes(goal))throw Error('Unsupported tuning goal');
  const context=this.syncContext();if(!context)throw Error(errors[2]);
  if(context.invalidated)throw Error('Car, installed parts or tuning changed. Load the selected mode again.');
  if(this.applied)throw Error('Restore the previous tune before searching again');
  const editor=this.editor;
  this.busy=true;this.outcome=null;this.abortController=new AbortController();this.searchContext={record:context.record,tuned:context.tuned,kind:context.kind};
  try{
   const signal=this.abortController.signal,pre=await this.acquire({signal});
   // A draft belongs to its exact original live baseline, not merely this mode.
   // Fresh frame capture must also preserve the selected visit and stored presets.
   if(editor){
    const old=editor.lease,fresh=pre.lease;
    if(!old||['record','tuned','kind','parts','ride'].some(k=>old[k]!==fresh[k])||!eq(editor.baseline,pre.setup)||!eq(old.partBytes,fresh.partBytes)||!eq(old.recordBytes,fresh.recordBytes)||!eq(old.visitBytes,fresh.visitBytes))throw Error('Draft baseline changed. Load the selected mode again.');
   }
   const curveOffsets=pre.allowedOffsets.filter(n=>n>=23||(['acceleration60','acceleration100','topSpeed'].includes(goal)&&n>=9&&n<=15));
   if(!curveOffsets.length)throw Error('No tuning fields for this goal are unlocked by the installed parts');
   const requested=Core.setupCopy(editor?editor.draft:pre.setup),allowed=new Set(pre.allowedOffsets);
   for(let i=0;i<41;i++)if(requested[i]!==pre.setup[i]&&!allowed.has(i))throw Error('This draft setting is now locked');
   // Accept native coupling in private memory before selecting automatic fields.
   // Search's own scope check keeps every other accepted manual field fixed.
   const seed=editor?await this.evaluate({lease:pre.lease,setup:requested,signal}):{setup:pre.setup,result:pre.result};
   const seedSetup=Core.setupCopy(seed.setup);
   const adapter={acquire:async()=>({...pre,setup:Core.setupCopy(seedSetup),result:{...seed.result}}),evaluate:args=>this.evaluate(args),release:args=>this.release(args)};
   const search=new Core.Search(adapter);
   const outcome=await search.run({goal,offsets:curveOffsets,budget:48,steps:[40,20,10],signal,onProgress});
   const baseline=Core.setupCopy(pre.setup),baselineResult={...pre.result},changes=Core.setupDiff(baseline,outcome.best,outcome.bestRequest);
   this.outcome={...outcome,type:'search',lease:pre.lease,baseline,baselineResult,seed:seedSetup,seedRequest:requested,seedResult:{...seed.result},improvedFromSeed:outcome.improved,improved:Core.score(outcome.bestResult,goal)>Core.score(baselineResult,goal)+1e-5,changes,changed:changes.some(change=>change.before!==change.after)};
   return this.outcome;
  }finally{this.searchContext=null;this.abortController=null;this.busy=false;this.cancel();}
 }
 // Manual drafts and every native trial stay in private memory. Live setup
 // writes occur only through the bounded selected-preset Stage/Restore protocol.
 async loadSetup(){
  if(this.busy)throw Error('Tuner is already busy');
  if(this.applied)throw Error('Restore the previous tune before loading an editable setup');
  const context=this.captureContext();if(!context)throw Error(errors[2]);
  this.busy=true;this.outcome=null;this.editor=null;this.abortController=new AbortController();
  this.searchContext={record:context.record,tuned:context.tuned,kind:context.kind};
  try{
   const loaded=await this.acquire({signal:this.abortController.signal});
   if(this.abortController.signal.aborted)throw Object.assign(Error('Tuning cancelled'),{name:'AbortError'});
   if(context.initializingPolicy){
    if(!this.canUse()||['record','tuned','kind'].some(key=>loaded.lease[key]!==context[key]))throw Error('Native tuning policy or selected preset changed during capture');
    this.context={key:context.key,record:context.record,tuned:context.tuned,kind:context.kind};
   }
   this.editor={lease:this.lease,baseline:Core.setupCopy(loaded.setup),draft:Core.setupCopy(loaded.setup),allowedOffsets:[...loaded.allowedOffsets],unlockedOffsets:[...loaded.unlockedOffsets],baselineResult:{...loaded.result}};
   return this.editor;
  }finally{this.searchContext=null;this.abortController=null;this.busy=false;this.cancel();}
 }
 setDraft(offset,value){
  if(this.busy)throw Error('Tuner is already busy');
  if(!this.enabled||!this.syncContext()||!this.editor||this.applied)throw Error('Load settings for the selected car and mode first');
  if(!this.editor.allowedOffsets.includes(offset))throw Error('This setting is locked');
  if(!Number.isInteger(value)||value<0||value>200)throw Error('Invalid tuning value');
  this.editor.draft[offset]=value;this.outcome=null;
 }
 resetDraft(){
  if(this.busy||!this.enabled||!this.syncContext()||!this.editor||this.applied)throw Error('Load settings for the selected car and mode first');
  this.editor.draft=Core.setupCopy(this.editor.baseline);this.outcome=null;
 }
 async preview(){
  if(this.busy)throw Error('Tuner is already busy');
  if(!this.syncContext()||!this.editor||this.applied)throw Error('Load settings for the selected car and mode first');
  const editor=this.editor,requested=Core.setupCopy(editor.draft),allowed=new Set(editor.allowedOffsets);
  for(let i=0;i<41;i++)if(requested[i]!==editor.baseline[i]&&!allowed.has(i))throw Error('This setting is locked');
  this.busy=true;this.outcome=null;this.abortController=new AbortController();let result;
  try{
   this.lease=editor.lease;result=await this.evaluate({lease:editor.lease,setup:requested,signal:this.abortController.signal});
   if(this.abortController.signal.aborted)throw Object.assign(Error('Tuning cancelled'),{name:'AbortError'});
   const changes=Core.setupDiff(editor.baseline,result.setup,requested);
   this.outcome={type:'manual',lease:editor.lease,baseline:Core.setupCopy(editor.baseline),baselineResult:{...editor.baselineResult},best:Core.setupCopy(result.setup),bestRequest:requested,bestResult:{...result.result},changes,changed:changes.some(change=>change.before!==change.after),improved:false,baselineRestored:true,globallyOptimal:false};
   return this.outcome;
  }finally{this.abortController=null;this.busy=false;this.cancel();}
 }
 async apply(){
  if(!this.busy)this.syncContext();
  if(this.busy||!this.outcome||this.applied)throw Error('Preview a tune for the selected car and mode first');this.busy=true;
  try{const o=this.outcome,r=await this.request(17,{lease:o.lease,expected:o.baseline,expectedVisit:o.lease.visitBytes,candidate:o.best,candidateVisit:o.best});if(!eq(r.setup,o.best)||!eq(r.lease.visitBytes,o.best))throw Error('Staged setup was not confirmed');this.applied={...o,current:r.setup,stagedLease:r.lease};return r;}finally{this.busy=false;this.cancel();}
 }
 async restore(){
  if(!this.busy)this.syncContext();
  if(this.busy||!this.applied)throw Error('No unchanged staged tune to restore for the selected car and mode');this.busy=true;
  try{
   const o=this.applied,lease={...o.stagedLease};
   // A normal native Save Profile may have committed this selected value.
   // Accept that exact known record transition, but never an unrelated edit.
   const current=Uint8Array.from(new Uint8Array(this.memory.buffer,lease.record+0x360,205)),start=lease.kind*41;
   if(!eq(current,lease.recordBytes)){
    const known=Uint8Array.from(lease.recordBytes);known.set(o.current,start);
    if(!eq(current,known))throw Error('Stored presets changed. Reload before restoring.');
    lease.recordBytes=current;
   }
   const r=await this.request(18,{lease,expected:o.current,expectedVisit:o.current,candidate:o.baseline,candidateVisit:o.lease.visitBytes});
   if(!eq(r.setup,o.baseline)||!eq(r.lease.visitBytes,o.lease.visitBytes))throw Error('Restored setup was not confirmed');
   this.applied=null;this.outcome=null;this.editor=null;return r;
  }finally{this.busy=false;this.cancel();}
 }

}
const api={Controller,BASE,MAGIC,readinessLabels};root.__NFSU2_DYNO_FULL__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
