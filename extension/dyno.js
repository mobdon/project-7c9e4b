(function(root){
'use strict';
const Core=root.__NFSU2_DYNO_CORE__||(typeof require==='function'?require('./dyno-core.js'):null);
const BASE=0xd0d300,MAGIC=0x384e5944;
const errors={1:'Cancelled before applying a tune',2:'Open the solo Performance Tuning main screen with one local player',3:'Car, mode, installed parts or tuning changed. Find a new tune first',4:'Unsupported tuning request',5:'ECU or turbo tuning is locked',6:'Native dyno calculation returned an invalid result'};
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
class Controller {
 constructor(memory,patched,revision=Core.REVISION){this.memory=memory;this.patched=patched;this.revision=revision;this.enabled=false;this.pending=null;this.lease=null;this.outcome=null;this.applied=null;this.seq=0;this.busy=false;this.abortController=null;this.failed=false;this.context=null;this.contexts=new Map();this.searchContext=null;}
 view(){return new DataView(this.memory.buffer);}
 words(){return new Int32Array(this.memory.buffer);}
 u32(n){return this.view().getUint32(BASE+n,true);}
 set(n,v){this.view().setUint32(BASE+n,v,true);}
 bytes(n,v){new Uint8Array(this.memory.buffer,BASE+n,v.length).set(v);}
 available(){return this.patched&&!this.failed&&this.memory.buffer.byteLength>BASE+512&&this.u32(32)===MAGIC&&[0,MAGIC].includes(this.u32(0));}
 canUse(){
  if(!this.available())return false;
  try{
   const v=this.view(),u=p=>v.getUint32(p,true),valid=p=>p>=0x10000&&p+4096<Math.min(v.byteLength,0x28000000);
   if(u(0xd00030)!==1||(u(0x850078)&520)||u(0x866a14)||u(0x8669f4)||v.getUint8(0x89cf69))return false;
   if(!Core.inspect(this.memory,this.revision).available)return false;
   let p=u(0x8384c4);if(!valid(p))return false;p=u(p+8);if(!valid(p))return false;p=u(p+228);if(!valid(p))return false;p=u(p+12);if(!valid(p))return false;
   const expected='UI_PerformanceDyno_MAIN.fng\0';return Array.from(expected).every((x,i)=>v.getUint8(p+i)===x.charCodeAt(0));
  }catch{return false;}
 }
 // Keep search/restore ownership separate for each native car and tuning mode.
 // This only changes UI state. Native command guards still authorize every write.
 syncContext(){
  if(this.busy||!this.canUse())return null;
  const current=Core.inspect(this.memory,this.revision);if(!current.available)return null;
  const key=`${current.record}:${current.tuned}:${current.kind}`,changed=this.context?.key!==key;
  if(changed){
   if(this.context?.record===current.record&&this.context?.tuned===current.tuned)this.contexts.set(this.context.key,{outcome:this.outcome,applied:this.applied,lease:this.lease});
   else this.contexts.clear(); // Never revive a lease across replacement car/ride objects.
   const saved=this.contexts.get(key);
   this.outcome=saved?.outcome||null;this.applied=saved?.applied||null;this.lease=saved?.lease||null;
   this.context={key,record:current.record,tuned:current.tuned,kind:current.kind};
  }
  const owned=this.applied||this.outcome;let invalidated=false;
  if(owned){
   const lease=owned.lease,expected=this.applied?owned.current:owned.baseline,v=this.view();
   const parts=lease?.parts,valid=parts>=0x10000&&parts+64<=Math.min(v.byteLength,0x28000000);
   if(!lease||['record','tuned','kind'].some(k=>lease[k]!==current[k])||!eq(current.setup,expected)||!valid||v.getUint32(current.tuned+8,true)!==parts||!eq(new Uint8Array(v.buffer,parts,64),lease.partBytes)){
    // Manual edits/part changes invalidate restoration, never overwrite them.
    this.outcome=null;this.applied=null;this.lease=null;this.contexts.delete(key);invalidated=true;
   }
  }
  return {...this.context,changed,invalidated};
 }
 setEnabled(value){this.enabled=!!value;if(!this.enabled)this.cancel();}
 cancel(){this.abortController?.abort();if(this.patched&&this.memory.buffer.byteLength>BASE+512&&this.u32(32)===MAGIC&&[0,MAGIC].includes(this.u32(0)))Atomics.store(this.words(),(BASE+12)>>2,0);}
 async request(cmd,{lease,expected,candidate,accepted,signal}={}){
  if(!this.enabled||!this.available())throw Error('Enable experimental dyno tuning and reload the supported game first');
  if(this.pending)throw Error('A game-thread request is still pending');
  if(signal?.aborted)throw Object.assign(Error('Tuning cancelled'),{name:'AbortError'});
  const validate=v=>Core.setupCopy(v);
  if(cmd!==1){if(!lease)throw Error('Missing tuning baseline');validate(expected);if(candidate)validate(candidate);if(accepted)validate(accepted);}
  this.seq=((Math.max(this.seq,this.u32(36))+2)&0x7ffffffe)||2;
  const seq=this.seq;
  // Odd sequence hides an incomplete payload. Only game-thread acknowledgements
  // authorize UI success. The page never changes car setup bytes.
  Atomics.store(this.words(),(BASE+4)>>2,seq|1);
  this.set(0,MAGIC);this.set(8,cmd);
  if(lease){this.set(16,lease.record);this.set(20,lease.tuned);this.set(24,lease.kind);this.set(28,lease.parts);this.bytes(272,lease.partBytes);}
  if(expected)this.bytes(128,expected);if(candidate)this.bytes(176,candidate);if(accepted)this.bytes(224,accepted);
  Atomics.store(this.words(),(BASE+12)>>2,1);
  const cancel=()=>{if(this.available())Atomics.store(this.words(),(BASE+12)>>2,0);};
  signal?.addEventListener('abort',cancel,{once:true});
  const waiting=new Promise((resolve,reject)=>{
   const started=Date.now();const poll=()=>{try{
    if(!this.available()){signal?.removeEventListener('abort',cancel);this.failed=true;reject(Error('Dyno command ownership was lost. The outcome is uncertain; reload before retrying.'));return;}
    if(Atomics.load(this.words(),(BASE+36)>>2)===seq){
     signal?.removeEventListener('abort',cancel);
     const status=this.u32(40);if(status){reject(Error(errors[status]||'Game-thread request rejected'));return;}
     const view=this.view(),setup=Core.setupCopy(new Uint8Array(view.buffer,BASE+400,41));
     const record=this.u32(44),tuned=this.u32(48),kind=this.u32(52),parts=this.u32(56),mask=this.u32(60);
     resolve({setup,result:{peakPowerKw:view.getFloat32(BASE+72,true),peakTorqueNm:view.getFloat32(BASE+76,true),powerRpm:view.getFloat32(BASE+80,true),torqueRpm:view.getFloat32(BASE+84,true)},lease:{record,tuned,kind,parts,partBytes:Uint8Array.from(new Uint8Array(view.buffer,BASE+448,64))},allowedOffsets:Array.from({length:18},(_,i)=>i+23).filter(i=>mask&(i<32?1:2))});return;
    }
    if(Date.now()-started>5000){cancel();this.failed=true;signal?.removeEventListener('abort',cancel);reject(Error('Game did not acknowledge the request. Reload before retrying; an Apply/Restore result may be uncertain.'));return;}
    setTimeout(poll,16);
   }catch(error){cancel();this.failed=true;signal?.removeEventListener('abort',cancel);reject(Error('Invalid game acknowledgement. Reload before retrying: '+error.message));}};setTimeout(poll,0);
  });
  this.pending=waiting;
  Atomics.store(this.words(),(BASE+4)>>2,seq);
  try{return await waiting;}finally{this.pending=null;}
 }
 async acquire({signal}={}){
  const x=await this.request(1,{signal}),expected=this.searchContext;
  // A game-thread snapshot can acknowledge a different mode after Mode Select.
  // Reject it before any trial and never file its lease under the requested mode.
  if(expected&&['record','tuned','kind'].some(k=>x.lease[k]!==expected[k]))throw Error('Car or race mode changed while starting the search. Find a new tune for the selected mode.');
  this.lease={...x.lease,baseline:x.setup};return {...x,lease:this.lease};
 }
 async evaluate({lease,setup,signal}){if(lease!==this.lease)throw Error('Expired tuning baseline');return this.request(2,{lease,expected:lease.baseline,candidate:setup,signal});}
 async release({lease}){if(this.pending)try{await this.pending;}catch{};if(this.failed)return {restored:false,reason:'game acknowledgement timed out'};return {restored:true};}
 async find({goal='peakPower',onProgress=()=>{}}={}){
  if(this.busy)throw Error('Tuner is already busy');if(!['peakPower','peakTorque'].includes(goal))throw Error('Unsupported tuning goal');
  const context=this.syncContext();if(!context)throw Error(errors[2]);
  if(this.applied)throw Error('Restore the previous tune before searching again');
  this.busy=true;this.outcome=null;this.abortController=new AbortController();this.searchContext={record:context.record,tuned:context.tuned,kind:context.kind};
  try{
   // Discover native eligibility first; Search reacquires and verifies it again.
   const pre=await this.acquire({signal:this.abortController.signal});
   if(!pre.allowedOffsets.length)throw Error('Install an ECU or turbo upgrade that unlocks tuning first');
   const search=new Core.Search(this);
   const outcome=await search.run({goal,offsets:pre.allowedOffsets,budget:120,steps:[40,20,10],signal:this.abortController.signal,onProgress});
   this.outcome={...outcome,lease:this.lease};return this.outcome;
  }finally{this.searchContext=null;this.abortController=null;this.busy=false;this.cancel();}
 }
 async apply(){
  if(!this.busy)this.syncContext();
  if(this.busy||!this.outcome||this.applied)throw Error('Find a tune for the selected car and mode first');this.busy=true;
  try{const o=this.outcome,r=await this.request(3,{lease:o.lease,expected:o.baseline,candidate:o.bestRequest,accepted:o.best});if(!eq(r.setup,o.best))throw Error('Applied setup was not confirmed');this.applied={...o,current:r.setup};return r;}finally{this.busy=false;this.cancel();}
 }
 async restore(){
  if(!this.busy)this.syncContext();
  if(this.busy||!this.applied)throw Error('No unchanged applied tune to restore for the selected car and mode');this.busy=true;
  try{const o=this.applied,r=await this.request(4,{lease:o.lease,expected:o.current,candidate:o.baseline});if(!eq(r.setup,o.baseline))throw Error('Restored setup was not confirmed');this.applied=null;this.outcome=null;return r;}finally{this.busy=false;this.cancel();}
 }
}
const api={Controller,BASE,MAGIC};root.__NFSU2_DYNO__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
