'use strict';
const {test}=require('node:test'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const Native=require('../extension/dyno-native.js'),Meta=require('../extension/dyno-native-profile.js'),Evaluator=require('../extension/dyno-evaluator.js'),{fixture}=require('./dyno-evaluator.test.cjs');
const LO=0x50000000,HI=0x7ffe0000,root=path.resolve(__dirname,'../..');
let cached;const prepared=()=>cached||(cached=Native.build(fs.readFileSync(root+'/research/compatibility-93af6ccb/game.wasm'),Meta));
const clone=s=>({...s,setup:s.setup.slice(),partBytes:s.partBytes.slice(),ranges:s.ranges.map(r=>({...r,data:r.data.slice()}))});
function relocate(snapshot,selected=[2,3,4,5]){
 const s=clone(snapshot),moves=[];
 for(const i of selected){const r=s.ranges[i],old=r.address,address=LO+(i-2)*0x40000;moves.push({old,address,len:r.data.length});r.address=address;}
 const image=s.ranges[0],v=new DataView(image.data.buffer,image.data.byteOffset,image.data.byteLength),ride=s.ranges[1],rv=new DataView(ride.data.buffer,ride.data.byteOffset,ride.data.byteLength);
 const ptr=p=>{for(const m of moves)if(p>=m.old&&p<m.old+m.len)return m.address+p-m.old;return p;};
 for(const address of [0x8a1ccc,0x86b340,0x8383f8,...Array.from({length:68},(_,i)=>0x837b90+i*4)])v.setUint32(address-image.address,ptr(v.getUint32(address-image.address,true)),true);
 rv.setUint32(0x57c,ptr(rv.getUint32(0x57c,true)),true);return s;
}
test('private evaluator grows only for admitted high snapshots and refreshes its exposed view',async()=>{
 const {snapshot}=await fixture(),h=await Native.instantiate(await prepared());h.hydrate(snapshot);const oldView=h.view,oldLength=h.memory.buffer.byteLength,s=relocate(snapshot);h.hydrate(s);assert(h.memory.buffer.byteLength>oldLength);assert.equal(h.memory.buffer.byteLength,Math.ceil((s.ranges[5].address+s.ranges[5].data.length)/65536)*65536);assert.notEqual(h.view,oldView);assert.equal(h.view.buffer,h.memory.buffer);for(const r of s.ranges)assert.deepEqual(new Uint8Array(h.memory.buffer,r.address,r.data.length),r.data);h.hydrate(snapshot);assert.equal(h.view.getUint32(0x8a1ccc,true),snapshot.ranges[2].address);
});
test('private evaluator rejects runtime gap, overflow, excessive high ranges and partial mutations',async()=>{
 const h=await Native.instantiate(await prepared()),{snapshot}=await fixture();h.hydrate(snapshot);const before=new Uint8Array(h.memory.buffer,snapshot.ride,0x8f0).slice(),length=h.memory.buffer.byteLength;
 for(const [address,n]of [[0x28000000,4],[0x30000000,4],[LO-1,4],[HI-3,4],[0x80000000,4],[0xfffffff0,100832],[LO,100833]]){
  const s=clone(snapshot);s.ranges[1].data[0]^=1;s.ranges.push({address,data:new Uint8Array(n),writable:false});assert.throws(()=>h.hydrate(s),/Invalid native snapshot range/);assert.equal(h.memory.buffer.byteLength,length);assert.deepEqual(new Uint8Array(h.memory.buffer,snapshot.ride,0x8f0),before);
 }
});
test('exact native estimates and all unlocked settings match low and high stock/rules/catalog/curve',async()=>{
 const {snapshot}=await fixture(),s=relocate(snapshot),e=await Evaluator.create(await prepared()),low=e.load(snapshot),baseline=await e.evaluate(snapshot.setup),expected=[];
 for(const offset of low.allowedOffsets){const draft=Array.from(snapshot.setup);draft[offset]=140;expected.push(await e.evaluate(draft));}
 const high=e.load(s);assert.deepEqual(high,low);assert.deepEqual((await e.evaluate(s.setup)).result,baseline.result);
 for(let i=0;i<low.allowedOffsets.length;i++){const draft=Array.from(s.setup);draft[low.allowedOffsets[i]]=140;const actual=await e.evaluate(draft);assert.deepEqual(actual.result,expected[i].result,'field '+low.allowedOffsets[i]);assert.deepEqual(actual.setup,expected[i].setup);assert.equal(actual.fuel,expected[i].fuel);}
 assert.deepEqual((await e.evaluate(s.setup)).result,baseline.result);
 const draft=Array.from(s.setup);draft[0]=140;await assert.rejects(e.evaluate(draft,{budget:1}),/budget|BUDGET/i);assert.deepEqual((await e.evaluate(s.setup)).result,baseline.result);
 const c=new AbortController();c.abort();await assert.rejects(e.evaluate(draft,{signal:c.signal}),/cancel/i);assert.deepEqual((await e.evaluate(s.setup)).result,baseline.result);
});
test('single high stock at the window upper boundary is supported without admitting its guard area',async()=>{
 const {snapshot}=await fixture(),s=clone(snapshot),stock=s.ranges[2];stock.address=HI-stock.data.length;const image=s.ranges[0];new DataView(image.data.buffer,image.data.byteOffset,image.data.byteLength).setUint32(0x8a1ccc-image.address,stock.address,true);const h=await Native.instantiate(await prepared());h.hydrate(s);assert.equal(h.memory.buffer.byteLength,HI);assert.deepEqual(new Uint8Array(h.memory.buffer,stock.address,stock.data.length),stock.data);assert.throws(()=>h.hydrate({ranges:[{address:HI,data:new Uint8Array(1)}]}),/Invalid native snapshot range/);
});
