'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Native=require('../extension/dyno-native.js'),Meta=require('../extension/dyno-native-profile.js'),Evaluator=require('../extension/dyno-evaluator.js'),{fixture}=require('./dyno-evaluator.test.cjs'),relocate=require('./fixtures/static-tuner-ride.cjs');
const root=path.resolve(__dirname,'../..');
test('real native evaluation at static ride matches heap fixture, rolls back and cannot write neighboring image data',async()=>{
 const prepared=await Native.build(fs.readFileSync(root+'/research/compatibility-93af6ccb/game.wasm'),Meta),e=await Evaluator.create(prepared),original=await fixture();
 const heapLoaded=e.load(original.snapshot),heap=await e.evaluate(original.snapshot.setup),draft=Array.from(original.snapshot.setup);draft[0]=140;draft[16]=150;draft[23]=140;const heapDraft=await e.evaluate(draft);
 for(const index of [0,21]){
  const s=relocate(original,index),input=s.ranges.map(r=>r.data.slice());assert.equal(s.ranges[0].writable,false);assert.equal(s.ranges[1].writable,true);assert.equal(s.ranges[5].writable,true);assert.deepEqual(e.load(s),heapLoaded);assert.deepEqual((await e.evaluate(s.setup)).result,heap.result);assert.deepEqual((await e.evaluate(draft)).result,heapDraft.result);
  await assert.rejects(e.evaluate(draft,{budget:1}),/budget|BUDGET/i);assert.deepEqual((await e.evaluate(s.setup)).result,heap.result);assert.deepEqual(s.ranges.map(r=>r.data),input);
  const h=await Native.instantiate(prepared);h.hydrate(s);const before=new Uint8Array(h.memory.buffer,s.ride,0x8f0).slice();assert.throws(()=>h.call(10435,[0x3fb33333,0,0,0],{thisArg:s.tuned,fuel:10,rollback:true}),/NATIVE_BUDGET/);assert.deepEqual(new Uint8Array(h.memory.buffer,s.ride,0x8f0),before);
  // The broad image capture grants reads, not writes. An intact neighboring
  // native layout cannot be mutated by tricking the entry point's thisArg.
  const neighbor=index===0?s.ride+0x940:s.ride-0x940,n=new Uint8Array(h.memory.buffer,neighbor,0x8f0),nv=new DataView(h.memory.buffer);n.set(before);nv.setUint32(neighbor+0x38c,neighbor+0x2f0,true);nv.setUint32(neighbor+0x390,neighbor+0x40,true);nv.setUint32(neighbor+0x57c,neighbor+0x600,true);const guarded=n.slice();
  assert.throws(()=>h.call(10435,[0x3fb33333,0,0,0],{thisArg:neighbor+0x384,rollback:true}),/NATIVE_FORBIDDEN_WRITE/);assert.deepEqual(n,guarded);assert.deepEqual(new Uint8Array(h.memory.buffer,s.ride,0x8f0),before);
 }
});
