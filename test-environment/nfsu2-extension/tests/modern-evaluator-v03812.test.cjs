'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const Fixture=require('../native/fixture-v03812.cjs'),Meta=require('../native/dyno-native-profile-943-modern-control.js'),Evaluator=require('../extension/dyno-evaluator.js');
const clone=s=>({...s,setup:s.setup.slice(),partBytes:s.partBytes.slice(),ranges:s.ranges.filter(r=>r.data.length!==4).map(r=>({...r,data:r.data.slice()}))});
test('943 private evaluator uses mapped native entries, bounded scratch, readback and repeatable Skyline estimates',async()=>{
 const f=await Fixture.create(Meta),s=clone(f.snapshot),before=structuredClone(s),e=await Evaluator.create(f.prepared),loaded=e.load(s);
 assert(loaded.allowedOffsets.length>=40);const baseline=await e.evaluate(s.setup);assert(baseline.result.peakPowerKw>0);
 for(const offset of[0,9,16,19,21,23,31,32,40]){
  const requested=Array.from(s.setup);requested[offset]=140;const result=await e.evaluate(requested);assert(result.result.peakPowerKw>0);assert.equal(result.setup.length,41);assert(result.calls.every(c=>Object.values(Meta.entries).includes(c.id)));
 }
 assert.deepEqual((await e.evaluate(s.setup)).result,baseline.result);assert.deepEqual(s,before);
});
test('943 private evaluator safely evaluates a stock table in the exact second guest window',async()=>{
 const f=await Fixture.create(Meta),s=clone(f.snapshot),stock=s.ranges.find(r=>r.address===0x1000000),newAddress=0x50000000;
 stock.address=newAddress;new DataView(s.ranges[0].data.buffer,s.ranges[0].data.byteOffset,s.ranges[0].data.byteLength).setUint32(0x8a1ccc-s.ranges[0].address,newAddress,true);
 const before=structuredClone(s),e=await Evaluator.create(f.prepared);e.load(s);const result=await e.evaluate(s.setup);assert(result.result.peakPowerKw>0);assert.deepEqual(s,before);
});
test('943 evaluator cancellation and exhausted budget restore the snapshot for the following trial',async()=>{
 const f=await Fixture.create(Meta),s=clone(f.snapshot),e=await Evaluator.create(f.prepared);e.load(s);const base=await e.evaluate(s.setup),draft=Array.from(s.setup);draft[23]=140;
 const signal=AbortSignal.abort();await assert.rejects(e.evaluate(draft,{signal}),/cancel/i);await assert.rejects(e.evaluate(draft,{budget:1}),/budget/i);assert.deepEqual((await e.evaluate(s.setup)).result,base.result);
});
