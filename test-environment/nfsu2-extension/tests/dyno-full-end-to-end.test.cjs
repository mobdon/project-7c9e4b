'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const root=path.resolve(__dirname,'../..');
const Native=require('../extension/dyno-native.js'),Meta=require('../extension/dyno-native-profile.js'),Full=require('../extension/dyno-full.js');
const {fixture}=require('./dyno-evaluator.test.cjs');
(async()=>{
 const f=await fixture(),h=f.h,snapshot=process.env.TUNER_STATIC_RIDE==='1'?require('./fixtures/static-tuner-ride.cjs')(f):f.snapshot,memory=h.memory;memory.grow(16384-memory.buffer.byteLength/65536);
 const v=new DataView(memory.buffer),put=(p,x)=>v.setUint32(p,x,true),fill=(p,n,x)=>new Uint8Array(memory.buffer,p,n).fill(x),copy=(p,n)=>new Uint8Array(memory.buffer,p,n).slice();
 const B=0xd0d300,D=0x839c40,rec=0x1400000,player=0x1410000,car=0x1420000,cpu=0x2a010000,sp=0x1430000,t=snapshot.tuned,ride=snapshot.ride;
 fill(B,512,0);put(B+32,0x384e5944);put(D,rec);put(D+0x900,t);put(D+0x9fc,1);put(D+0xa0c,0);v.setUint8(D+0xb64,1);fill(D+0x904,205,100);fill(rec+0x360,205,100);fill(D+0x904+41,41,90);
 put(0xd00030,1);put(0xd00000,player);put(player+4,car);put(car+16,ride);put(car+20,ride-16);put(0x850078,0);put(0x866a14,0);put(0x8669f4,0);v.setUint8(0x89cf69,0);
 put(0x8384c4,0x1440000);put(0x1440008,0x1450000);put(0x14500e4,0x1460000);put(0x146000c,0x1470000);new Uint8Array(memory.buffer,0x1470000,32).set(Buffer.from('UI_PerformanceDyno_MAIN.fng\0'));
 put(cpu+16,sp);put(sp,0x581475);
 const frameModule=new WebAssembly.Module(fs.readFileSync(__dirname+'/full-tuner-bridge.wasm')),frame=new WebAssembly.Instance(frameModule,{env:{memory}}),prepared=await Native.build(fs.readFileSync(root+'/research/compatibility-93af6ccb/game.wasm'),Meta),c=new Full.Controller(memory,true,'93af6ccb',{prepared:Promise.resolve(prepared),module:frameModule});
 c.setEnabled(true);assert(c.canUse());const before={ride:copy(ride,0x8f0),visits:copy(D+0x904,205),record:copy(rec+0x360,205)};const timer=setInterval(()=>frame.exports.step(cpu),2);
 try{
  const editor=await c.loadSetup();assert.equal(editor.allowedOffsets.length,40);assert.deepEqual(copy(ride,0x8f0),before.ride);
  for(const [offset,value]of [[0,140],[9,140],[16,150],[19,140],[21,130],[23,140]])c.setDraft(offset,value);
  const outcome=await c.preview();assert(outcome.changed);assert.deepEqual(copy(ride,0x8f0),before.ride);assert.deepEqual(copy(rec+0x360,205),before.record);
  const staged=await c.apply();assert(staged.staged);assert.deepEqual(copy(t+20,41),outcome.best);assert.deepEqual(copy(D+0x904+41,41),outcome.best);assert.deepEqual(copy(rec+0x360,205),before.record);
  const expectedRide=before.ride.slice();expectedRide.set(outcome.best,0x398);assert.deepEqual(copy(ride,0x8f0),expectedRide);
  await c.restore();assert.deepEqual(copy(ride,0x8f0),before.ride);assert.deepEqual(copy(D+0x904,205),before.visits);assert.deepEqual(copy(rec+0x360,205),before.record);
  await c.loadSetup();for(const [offset,value]of [[0,140],[16,150],[21,130]])c.setDraft(offset,value);
  const searched=await c.find({goal:'acceleration100'});assert(searched.evaluations<=48);assert.deepEqual(searched.baseline,snapshot.setup);
  for(const offset of [0,16,17,21])assert.equal(searched.best[offset],searched.seed[offset]);
  assert.deepEqual(copy(ride,0x8f0),before.ride);assert.deepEqual(copy(D+0x904,205),before.visits);assert.deepEqual(copy(rec+0x360,205),before.record);
  await c.apply();assert.deepEqual(copy(t+20,41),searched.best);assert.deepEqual(copy(D+0x904+41,41),searched.best);assert.deepEqual(copy(rec+0x360,205),before.record);
  await c.restore();assert.deepEqual(copy(ride,0x8f0),before.ride);assert.deepEqual(copy(D+0x904,205),before.visits);assert.deepEqual(copy(rec+0x360,205),before.record);
  console.log(JSON.stringify({actualNativeSearch:true,manualSeedPreserved:true,goal:searched.goal,trials:searched.evaluations,baselineMetrics:searched.baselineResult,bestMetrics:searched.bestResult,recordUnchanged:true},null,2));
  console.log(JSON.stringify({actualNativePreview:true,actualFrameStageAndRestore:true,mode:1,allowed:40,metrics:outcome.bestResult,changed:outcome.changes.length,recordUnchanged:true,separateVisitRestored:true},null,2));
 }finally{clearInterval(timer);c.cancel();}
})().catch(e=>{console.error(e);process.exitCode=1;});
