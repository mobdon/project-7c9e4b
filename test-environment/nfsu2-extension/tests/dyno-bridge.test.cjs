const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {Controller,BASE:B,MAGIC}=require('../extension/dyno.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-bridge.wasm'));
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),v=new DataView(memory.buffer),calls=[];
 const D=0x839c40,ride=0xe00000,T=ride+0x384,rec=0xe04000,parts=ride+0x2f0,car=0xe05000,player=0xe06000,cpu=0xe07000,sp=0xe09000;
 const put=(p,x)=>v.setUint32(p,x,true),get=p=>v.getUint32(p,true),f32=(p,x)=>v.setFloat32(p,x,true),bytes=(p,n)=>Uint8Array.from(new Uint8Array(memory.buffer,p,n));
 for(let i=0;i<0x8f0;i++)v.setUint8(ride+i,(i*13)%256);
 f32(ride+560,1000);f32(ride+568,8000);put(T+8,parts);put(T+12,ride+0x40);new Uint8Array(memory.buffer,T+20,41).fill(100);
 put(D,rec);put(D+0x900,T);put(D+0x9fc,1);put(D+0xa0c,0);v.setUint8(D+0xb64,1);
 put(0xd00030,1);put(0xd00000,player);put(player+4,car);put(car+16,ride);
 put(0x8384c4,0xe10000);put(0xe10008,0xe11000);put(0xe110e4,0xe12000);put(0xe1200c,0xe13000);new Uint8Array(memory.buffer,0xe13000,32).set(Buffer.from('UI_PerformanceDyno_MAIN.fng\0'));
 put(cpu+16,sp);put(sp,0x581475);const stack=new WebAssembly.Global({value:'i32',mutable:true},0xf00000);
 let mask=3,bad=false,cancelApply=false;
 const fp=(c,x)=>{put(c+136,7);v.setFloat64(c+72+7*8,x,true);};
 const dispatch=(c,fn)=>{
  let s=get(c+16),thisP=get(c+4),a=[0,1,2,3,4].map(i=>get(s+4+i*4));calls.push({fn,thisP,a});assert.notEqual(c,cpu);
  if(fn===0x59b080)put(c,mask&(a[0]===23?1:2)?1:0);
  else if(fn===0x5b3e40)fp(c,v.getUint8(T+20+(a[0]===23?23:32)+a[1]));
  else if(fn===0x5b4670){const value=v.getFloat32(s+4,true),offset=(a[1]===23?23:32)+a[2];v.setUint8(T+20+offset,Math.round(value));f32(ride+0x250,1234);if(cancelApply)put(B+12,0);}
  else if(fn===0x5b56e0){const x=v.getUint8(T+43);fp(c,bad?NaN:300-(x-150)**2/100);f32(a[0],6500);}
  else if(fn===0x5b5810){fp(c,.4);f32(a[0],5000);}
  else if(fn===0x50fda0||fn===0x50fdd0){}
  else throw Error('Unexpected call '+fn.toString(16));
 };
 const inst=new WebAssembly.Instance(bridge,{env:{memory,stack,dispatch,gcall:()=>{throw Error('No AI calls expected');}}});
 const step=()=>inst.exports.step(cpu);step();const c=new Controller(memory,true);c.setEnabled(true);
 async function request(cmd,args={}){const promise=c.request(cmd,args);step();return promise;}
 return {memory,v,put,get,bytes,cpu,sp,ride,T,rec,parts,car,player,D,stack,c,request,step,calls,setMask:x=>mask=x,setBad:x=>bad=x,setCancelApply:x=>cancelApply=x};
}
test('snapshot + trial use native calls and restore complete ride/CPU/host stack before acknowledgement',async()=>{
 const f=fixture(),before=f.bytes(f.ride,0x8f0),cpu=f.bytes(f.cpu,344),s=await f.request(1);assert.equal(s.allowedOffsets.length,18);
 assert.deepEqual(f.bytes(f.ride,0x8f0),before);const candidate=s.setup.slice();candidate[23]=140;
 const r=await f.request(2,{lease:s.lease,expected:s.setup,candidate});assert.equal(r.setup[23],140);assert.equal(r.result.peakPowerKw,299);assert.equal(r.result.peakTorqueNm,400);
 assert.deepEqual(f.bytes(f.ride,0x8f0),before);assert.deepEqual(f.bytes(f.cpu,344),cpu);assert.equal(f.stack.value,0xf00000);assert.ok(!f.calls.some(x=>[0x50fae0,0x50fc20,0x50fdd0].includes(x.fn)));
});
test('apply requires exact measured setup, then restore compares expected live bytes',async()=>{
 const f=fixture(),s=await f.request(1),candidate=s.setup.slice();candidate[23]=150;
 const r=await f.request(2,{lease:s.lease,expected:s.setup,candidate});
 await f.request(3,{lease:s.lease,expected:s.setup,candidate,accepted:r.setup});assert.equal(f.v.getUint8(f.T+43),150);
 assert.deepEqual(f.calls.slice(-2).map(x=>x.fn),[0x50fda0,0x50fdd0]);
 await f.request(4,{lease:s.lease,expected:r.setup,candidate:s.setup});assert.equal(f.v.getUint8(f.T+43),100);
});
test('unexpected measured best is rolled back rather than applied',async()=>{
 const f=fixture(),s=await f.request(1),candidate=s.setup.slice(),wrong=s.setup.slice();candidate[23]=150;wrong[23]=151;
 await assert.rejects(f.request(3,{lease:s.lease,expected:s.setup,candidate,accepted:wrong}),/changed/);assert.equal(f.v.getUint8(f.T+43),100);assert.equal(f.calls.some(x=>x.fn===0x50fdd0),false);
});
test('screen, offline, identity, setup and parts guards reject without native mutation',async()=>{
 const variants=[f=>f.put(0x850078,8),f=>f.put(0x866a14,1),f=>f.put(0x8669f4,1),f=>f.v.setUint8(0x89cf69,1),f=>f.put(0xd00030,2),f=>f.v.setUint8(0xe13000,88),f=>f.put(f.D+0x9fc,2),f=>f.v.setUint8(f.parts+7,1),f=>f.v.setUint8(f.T+20,99),f=>f.put(f.T+12,0),f=>f.put(f.car+16,0),f=>f.put(f.D,0)];
 for(const change of variants){const f=fixture(),s=await f.request(1);change(f);const before=f.bytes(f.ride,0x8f0),n=f.calls.length;await assert.rejects(f.request(2,{lease:s.lease,expected:s.setup,candidate:s.setup}));assert.deepEqual(f.bytes(f.ride,0x8f0),before);assert.equal(f.calls.length,n);}
});
test('locked/non-curve fields are rejected, invalid scores roll back, cancel before commit rolls back',async()=>{
 for(const type of ['locked','scope','score','cancel']){const f=fixture(),s=await f.request(1),a=s.setup.slice();a[type==='scope'?9:23]=150;if(type==='locked')f.setMask(2);if(type==='score')f.setBad(true);if(type==='cancel')f.setCancelApply(true);const before=f.bytes(f.ride,0x8f0);await assert.rejects(f.request(type==='cancel'?3:2,{lease:s.lease,expected:s.setup,candidate:a,accepted:a}));assert.deepEqual(f.bytes(f.ride,0x8f0),before);}
});
test('odd requests are ignored, disarmed requests rejected, repeated sequence not executed twice',async()=>{
 const f=fixture();f.put(B,MAGIC);f.put(B+4,3);f.put(B+12,1);f.step();assert.equal(f.get(B+36),0);f.put(B+4,2);f.put(B+12,0);f.step();assert.equal(f.get(B+40),1);const n=f.calls.length;f.step();assert.equal(f.calls.length,n);
});
test('controller search + apply + restore run through real WASM bridge against synthetic physics',async()=>{
 const f=fixture(),timer=setInterval(f.step,1);try{
  const r=await f.c.find({goal:'peakPower'});assert.equal(r.baselineRestored,true);assert.equal(r.best[23],150);assert.equal(r.bestResult.peakPowerKw,300);assert.equal(f.v.getUint8(f.T+43),100);
  await f.c.apply();assert.equal(f.v.getUint8(f.T+43),150);await f.c.restore();assert.equal(f.v.getUint8(f.T+43),100);
 }finally{clearInterval(timer);}
});
module.exports={fixture};

test('read-only availability gates frontend, network and missing bridge without car writes',()=>{
 const f=fixture(),before=f.bytes(f.ride,0x8f0);assert.equal(f.c.canUse(),true);f.put(0x850078,8);assert.equal(f.c.canUse(),false);f.put(0x850078,0);f.v.setUint8(0xe13000,0);assert.equal(f.c.canUse(),false);assert.deepEqual(f.bytes(f.ride,0x8f0),before);
});
test('malformed game acknowledgement rejects instead of hanging or claiming success',async()=>{
 const f=fixture(),promise=f.c.request(1);f.step();f.v.setUint8(B+400,255);await assert.rejects(promise,/Invalid game acknowledgement/);assert.equal(f.c.failed,true);assert.equal(f.c.available(),false);
});
test('cancel before a queued evaluation executes causes no native call or setup change',async()=>{
 const f=fixture(),s=await f.request(1),abort=new AbortController(),before=f.bytes(f.ride,0x8f0),n=f.calls.length;
 const p=f.c.request(2,{lease:s.lease,expected:s.setup,candidate:s.setup,signal:abort.signal});abort.abort();f.step();await assert.rejects(p,/Cancelled/);assert.equal(f.calls.length,n);assert.deepEqual(f.bytes(f.ride,0x8f0),before);
});
test('bad RPM bounds fail before calling potentially unbounded native peak loops',async()=>{
 for(const [idle,max]of [[0,8000],[1000,1000],[1000,Infinity],[NaN,8000]]){const f=fixture();f.v.setFloat32(f.ride+560,idle,true);f.v.setFloat32(f.ride+568,max,true);await assert.rejects(f.request(1),/invalid result/);assert.equal(f.calls.length,0);}
});

test('an unverified module never writes even when dyno is cancelled or disabled',()=>{
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),bytes=new Uint8Array(memory.buffer);bytes.fill(0x5a,0xd0d300,0xd0d500);const before=Buffer.from(bytes),Controller=require('../extension/dyno.js').Controller,c=new Controller(memory,false);c.cancel();c.setEnabled(false);assert.deepEqual(Buffer.from(memory.buffer),before);
});

test('a verified controller does not cancel through an unowned native mailbox',()=>{
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),bytes=new Uint8Array(memory.buffer);bytes.fill(0x5a,0xd0d300,0xd0d500);const before=Buffer.from(bytes),c=new Controller(memory,true,'2f0ddd3b');c.cancel();c.setEnabled(false);assert.deepEqual(Buffer.from(memory.buffer),before);
});

test('lost dyno ownership rejects a pending acknowledgement as uncertain without foreign writes',async()=>{
 const f=fixture(),promise=f.c.request(1);f.put(B+32,0x12345678);f.put(B+36,f.c.seq);f.put(B+40,0);new Uint8Array(f.memory.buffer,B+400,41).fill(100);const before=Buffer.from(f.memory.buffer);await assert.rejects(promise,/ownership.*uncertain/i);assert.equal(f.c.failed,true);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});

test('applied tunes do not block searching another race mode and each mode keeps its own guarded restore',async()=>{
 const f=fixture(),timer=setInterval(f.step,1),circuitBaseline=new Uint8Array(41).fill(100),dragBaseline=new Uint8Array(41).fill(100);
 circuitBaseline[23]=80;dragBaseline[23]=120;
 try{
  f.put(f.D+0x9fc,0);new Uint8Array(f.memory.buffer,f.T+20,41).set(circuitBaseline);
  await f.c.find();await f.c.apply();
  const circuit=f.bytes(f.T+20,41),firstApplied=f.c.applied;
  assert.equal(circuit[23],150);
  // Model native Mode Select loading that mode's stored setup into the same ride.
  f.put(f.D+0x9fc,1);new Uint8Array(f.memory.buffer,f.T+20,41).set(dragBaseline);
  const before=f.bytes(f.ride,0x8f0),calls=f.calls.length;
  const changed=f.c.syncContext();assert.equal(changed.kind,1);assert.equal(changed.changed,true);
  assert.equal(f.c.applied,null);assert.equal(f.c.outcome,null);assert.deepEqual(f.bytes(f.ride,0x8f0),before);assert.equal(f.calls.length,calls);
  await f.c.find();await f.c.apply();const drag=f.c.applied;assert.notEqual(drag,firstApplied);
  f.put(f.D+0x9fc,0);new Uint8Array(f.memory.buffer,f.T+20,41).set(circuit);
  f.c.syncContext();assert.equal(f.c.applied,firstApplied);await f.c.restore();assert.deepEqual(f.bytes(f.T+20,41),circuitBaseline);
  f.put(f.D+0x9fc,1);new Uint8Array(f.memory.buffer,f.T+20,41).set(drag.current);
  f.c.syncContext();assert.equal(f.c.applied,drag);await f.c.restore();assert.deepEqual(f.bytes(f.T+20,41),dragBaseline);
 }finally{clearInterval(timer);}
});

test('all five native tuning slots have independent candidate state with no mode-switch memory writes',async()=>{
 const f=fixture(),saved=[];
 for(let mode=0;mode<5;mode++){
  f.put(f.D+0x9fc,mode);const before=Buffer.from(f.memory.buffer);f.c.syncContext();assert.equal(f.c.outcome,null);assert.deepEqual(Buffer.from(f.memory.buffer),before);
  const acquired=await f.request(1),outcome={lease:acquired.lease,baseline:acquired.setup,improved:true};
  f.c.outcome=outcome;f.c.lease=acquired.lease;saved.push(outcome);
 }
 for(let mode=0;mode<5;mode++){
  f.put(f.D+0x9fc,mode);const before=Buffer.from(f.memory.buffer);f.c.syncContext();assert.equal(f.c.outcome,saved[mode]);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 }
});

test('returning to an externally changed mode drops stale restoration without modifying the tune or parts',async()=>{
 for(const change of ['setup','parts','parts-pointer']){
  const f=fixture();f.c.syncContext();const acquired=await f.request(1);
  f.c.applied={lease:acquired.lease,baseline:acquired.setup,current:acquired.setup};
  f.put(f.D+0x9fc,2);f.c.syncContext();f.put(f.D+0x9fc,1);
  if(change==='setup')f.v.setUint8(f.T+43,120);
  if(change==='parts')f.v.setUint8(f.parts+7,f.v.getUint8(f.parts+7)^1);
  if(change==='parts-pointer')f.put(f.T+8,0);
  const before=Buffer.from(f.memory.buffer),calls=f.calls.length;
  assert.equal(f.c.syncContext().invalidated,true);assert.equal(f.c.applied,null);assert.equal(f.c.outcome,null);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(f.calls.length,calls);
 }
});

test('mode changes between button render and click cannot apply or restore the previous mode',async()=>{
 for(const action of ['apply','restore']){
  const f=fixture();f.c.syncContext();const acquired=await f.request(1),owned={lease:acquired.lease,baseline:acquired.setup,current:acquired.setup,best:acquired.setup,bestRequest:acquired.setup};
  f.c.outcome=owned;if(action==='restore')f.c.applied=owned;
  f.put(f.D+0x9fc,2);const before=Buffer.from(f.memory.buffer),calls=f.calls.length;
  await assert.rejects(f.c[action](),/selected car and mode/);
  assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(f.calls.length,calls);
 }
});

test('leaving the main screen or disabling the tuner does not erase the current mode restore record',async()=>{
 const f=fixture();f.c.syncContext();const acquired=await f.request(1),applied={lease:acquired.lease,baseline:acquired.setup,current:acquired.setup};f.c.applied=applied;
 f.v.setUint8(0xe13000,0);assert.equal(f.c.syncContext(),null);assert.equal(f.c.applied,applied);
 new Uint8Array(f.memory.buffer,0xe13000,32).set(Buffer.from('UI_PerformanceDyno_MAIN.fng\0'));f.c.setEnabled(false);f.c.syncContext();assert.equal(f.c.applied,applied);
});

test('replacement car identity discards every previous mode lease rather than reviving old pointers',async()=>{
 const f=fixture();f.c.syncContext();const acquired=await f.request(1);f.c.applied={lease:acquired.lease,baseline:acquired.setup,current:acquired.setup};
 f.put(f.D+0x9fc,2);f.c.syncContext();assert.equal(f.c.contexts.size,1);
 f.put(f.D,f.rec+0x1000);f.c.syncContext();assert.equal(f.c.applied,null);assert.equal(f.c.contexts.size,0);
 f.put(f.D,f.rec);f.put(f.D+0x9fc,1);f.c.syncContext();assert.equal(f.c.applied,null);
});

test('changing mode before either asynchronous acquire rejects before trials and never caches a foreign lease',async()=>{
 for(const atAcquire of [1,2]){
  const f=fixture(),request=f.c.request.bind(f.c);let acquires=0,evaluations=0;
  f.c.request=function(cmd,args){
   const promise=request(cmd,args);
   if(cmd===1&&++acquires===atAcquire)f.put(f.D+0x9fc,2);
   if(cmd===2)evaluations++;
   f.step();return promise;
  };
  const original=f.bytes(f.ride,0x8f0);
  await assert.rejects(f.c.find(),/race mode changed while starting/);
  assert.equal(acquires,atAcquire);assert.equal(evaluations,0);assert.equal(f.c.outcome,null);assert.equal(f.c.searchContext,null);assert.equal(f.c.busy,false);
  assert.deepEqual(f.bytes(f.ride,0x8f0),original);
  assert.ok(!f.calls.some(x=>[0x5b4670,0x50fda0,0x50fdd0].includes(x.fn)));
  f.c.syncContext();assert.equal(f.c.context.kind,2);assert.equal(f.c.outcome,null);assert.equal(f.c.applied,null);
  f.put(f.D+0x9fc,1);f.c.syncContext();assert.equal(f.c.outcome,null);assert.equal(f.c.applied,null);assert.notEqual(f.c.lease?.kind,2);
 }
});

test('changing car record during asynchronous acquire cannot become a result for the original car',async()=>{
 const f=fixture(),request=f.c.request.bind(f.c);let evaluations=0;
 f.c.request=function(cmd,args){const promise=request(cmd,args);if(cmd===1)f.put(f.D,f.rec+0x1000);if(cmd===2)evaluations++;f.step();return promise;};
 const before=f.bytes(f.ride,0x8f0);await assert.rejects(f.c.find(),/Car or race mode changed/);
 assert.equal(evaluations,0);assert.equal(f.c.outcome,null);assert.equal(f.c.lease,null);assert.deepEqual(f.bytes(f.ride,0x8f0),before);
 f.c.syncContext();assert.equal(f.c.context.record,f.rec+0x1000);assert.equal(f.c.contexts.size,0);
});

test('cache activation refuses a result whose acknowledged lease belongs to a different car or mode',async()=>{
 for(const field of ['record','tuned','kind']){
  const f=fixture();f.c.syncContext();const acquired=await f.request(1),key=f.c.context.key;
  f.put(f.D+0x9fc,2);f.c.syncContext();
  const lease={...acquired.lease,[field]:acquired.lease[field]+1};
  f.c.contexts.set(key,{outcome:{lease,baseline:acquired.setup},applied:{lease,current:acquired.setup},lease});
  f.put(f.D+0x9fc,1);const before=Buffer.from(f.memory.buffer);
  assert.equal(f.c.syncContext().invalidated,true);assert.equal(f.c.outcome,null);assert.equal(f.c.applied,null);assert.equal(f.c.lease,null);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 }
});
