'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{createRequire}=require('module'),AI=require('../extension/ai.js');
function fixtureFactory(version){
 const p=require.resolve('./pace.test.cjs'),req=createRequire(p),context={require:Object.assign(n=>n==='node:test'?{test(){}}:req(n),{resolve:req.resolve}),__dirname:path.dirname(p),Buffer,WebAssembly,console};
 let s=fs.readFileSync(p,'utf8').replaceAll("__dirname+'/ai-bridge.wasm'",`__dirname+'/ai-${version}-bridge.wasm'`).replaceAll("__dirname+'/ai-pace.wasm'",`__dirname+'/ai-${version}-pace.wasm'`).replaceAll('new Controller(memory,true)',`new Controller(memory,true,require('../extension/${version}-profile.js').capabilities)`);
 vm.runInNewContext(s+'\nthis.makePace=fixture;',context,{filename:p});return context.makePace;
}
for(const version of ['latest','next']){
 const fixture=fixtureFactory(version),cap=require('../extension/'+version+'-profile.js').capabilities;
 test(version+' native pace guard preserves original/catchup calls but refuses stale custom Drift multiplication',()=>{
  for(const flag of [0x89e7d9,0x890104,0x890114])for(const factor of [.75,1.25,3]){
   const f=fixture();f.on(factor);f.put(flag,1);f.step();assert.equal(f.float(f.driver+0x770),1);assert.deepEqual(Array.from(f.calls.slice(-2),v=>Array.isArray(v)?Array.from(v):v),['original',['catchup',f.driver]]);assert.equal(f.get(AI.BASE+80),0);assert.equal(f.c.status().paceApplied,null);
   f.put(flag,0);f.step();assert.equal(f.float(f.driver+0x770),factor);assert.equal(f.c.status().paceApplied,factor);
  }
 });
 test(version+' controller normalizes Drift pace and retains road/Drag mode semantics',()=>{
  for(const flag of [0x89e7d9,0x890104,0x890114]){
   const f=fixture();f.on(3);f.put(flag,1);f.c.publish(2,f.p,f.car,f.race,3);assert.equal(f.get(AI.BASE+60),100);f.put(0x890108,1);f.c.publish(2,f.p,f.car,f.race,3);assert.equal(f.get(AI.BASE+60),300);f.put(0x890108,0);f.d.setUint8(0x89e7d8,1);f.c.publish(2,f.p,f.car,f.race,3);assert.equal(f.get(AI.BASE+60),300);
  }
 });
 test(version+' Drift native factors remain untouched online and at non-default finite values',()=>{
  for(const value of [0,-0,.7,1,1.4,3]){const f=fixture({native:value});f.on(3);f.put(0x89e7d9,1);f.put(0x850078,8);f.put(AI.BASE+84,1);f.step();assert.ok(Object.is(f.float(f.driver+0x770),Math.fround(value)));assert.equal(f.get(0x850078),8);}
 });
}
