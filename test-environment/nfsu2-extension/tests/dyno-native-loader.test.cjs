'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {build,instantiate}=require('../extension/dyno-native.js'),profile=require('../extension/dyno-native-profile.js');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const bytes=fs.readFileSync(root+'/research/compatibility-93af6ccb/game.wasm');
 const prepared=await build(bytes,profile);console.log('compiled',prepared.byteLength);
 const h=await require(root+'/research/full-tuner-proof/performance-metrics/harness.cjs').createHarness();h.seedRetail(0);
 const a=h.addresses;h.put(a.RIDE+16,0);h.put(a.RIDE+16+0x55c,16);h.put(a.RIDE+16+0x56c,a.RIDE+0x600);
 const ranges=[[0x400000,0x900000,false],[a.RIDE,0x8f0,true],[a.STOCK,h.retailStock.length,false],[0x1200000,h.retailRules.length,false]];
 const snapshot={ranges:ranges.map(([address,length,writable])=>({address,writable,data:new Uint8Array(h.memory.buffer,address,length).slice()}))};
 const native=await instantiate(prepared);native.hydrate(snapshot);
 for(const [id,args,thisArg]of [[7775,[0],a.TUNE],[9171,[0,0,0],a.TUNE],[10435,[0x3fb33333,0,0,0],a.TUNE],[10592,[],a.TUNE],[10902,[0,1,1],a.RIDE+16],[19654,[],a.RIDE+16],[12627,[],a.RIDE+16]]){
  const actual=native.call(id,args,{thisArg,fuel:100000});const expected=h.call(id,args,{thisArg,fuel:100000,strictWrites:true});assert.equal(expected.error,null);
  assert.equal(actual.eax,expected.eax);assert.equal(actual.value,expected.value);assert.deepEqual(new Uint8Array(native.memory.buffer,a.RIDE,0x8f0),new Uint8Array(h.memory.buffer,a.RIDE,0x8f0));console.log('matches',id,actual.fuel);
 }
 const original=new Uint8Array(native.memory.buffer,a.RIDE,0x8f0).slice();assert.throws(()=>native.call(10435,[0x3fb33333,0,0,0],{thisArg:a.TUNE,fuel:10,rollback:true}),/NATIVE_BUDGET/);assert.deepEqual(new Uint8Array(native.memory.buffer,a.RIDE,0x8f0),original);
 console.log('private runtime extraction and bounded rollback passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
