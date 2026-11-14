'use strict';
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const {BASE:A,CORNER_BASE:B}=require('../extension/ai.js');
const root=path.resolve(__dirname,'..'),baseline=path.join(root,'../combined-v032-integration'),contexts={};
const baselineFile=path.join(baseline,'extension/ai.js'),baselineContext={require:createRequire(baselineFile),module:{exports:{}},console,Buffer,WebAssembly};
vm.runInNewContext(fs.readFileSync(baselineFile,'utf8'),baselineContext,{filename:baselineFile});
const baselineAI=baselineContext.module.exports;
function harness(name,extra,profile='latest',old=false){
 const file=path.join(__dirname,name),baseRequire=createRequire(file),hooks=[];
 const requireHere=name=>name==='node:test'?{test(){},before:fn=>hooks.push(fn)}:old&&name==='../extension/ai.js'?baselineAI:baseRequire(name);
 requireHere.resolve=baseRequire.resolve;
 const c={require:requireHere,process:{env:{...process.env,NFS_PROFILE:profile}},console,Buffer,WebAssembly,__dirname:path.dirname(file)};
 vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.api={'+extra+'};',c,{filename:file});
 return {api:c.api,init:async()=>{for(const f of hooks)await f();}};
}
before(async()=>{
 for(const name of ['legacy','current','latest','next']){
  const c=harness('race-corner-native.test.cjs','road,fixture,original:()=>originalModule,patched:()=>patchedModule',name),old=harness('race-corner-native.test.cjs','road,fixture,original:()=>originalModule,patched:()=>patchedModule',name,true);
  await c.init();await old.init();contexts[name]={c:c.api,old:old.api};
 }
});
const expected=({pace=130,factor=80,margin=15,curvature=.001,cap=60,grip=1})=>{
 const p=pace/100,f=factor/100,k=Math.abs(Math.fround(curvature)),g=Math.fround(grip)*Math.fround(9.8),c=Math.fround(cap),curve=Math.sqrt(g/k);
 return c/Math.sqrt(1+k*(p*c)**2/(g*f*f))*(1-margin/100*Math.max(0,1-curve/c));
};
function continuous(c,opts={}){const f=c.road(c.patched(),{pace:130,...opts});f.put(B+4,3);if(opts.grip!==undefined)f.f(f.sp+4,opts.grip);if(opts.cap!==undefined)f.f(f.sp+12,opts.cap);return f;}
function sameExceptProbe(a,b){const actual=Buffer.from(b.memory.buffer),expect=Buffer.from(a.memory.buffer);actual.copy(expect,B+28,B+28,B+32);assert.deepEqual(actual,expect);}
for(const profile of ['legacy','current','latest','next']){
 test(profile+': continuous native command reaches gentle nonzero sampled bends skipped by old threshold',()=>{
  const {c}=contexts[profile];for(const curvature of [1e-8,-1e-8,.0001,-.0001,.0003,-.0003])for(const pace of [100,130,190,200]){
   const opts={curvature,pace,factor:95,margin:25},f=continuous(c,opts),old=c.road(c.patched(),opts);const oldRaw=old.run(),raw=f.run();assert.equal(old.get(B+16),0);assert.equal(oldRaw,60);assert.ok(raw<oldRaw);assert.equal(f.get(B+16),1);assert.ok(Math.abs(raw-expected(opts))<1e-10);assert.equal(f.get(B+52),pace);
  }
 });
 test(profile+': continuous output is finite, never raises native result and tightens monotonically',()=>{
  const {c}=contexts[profile];for(const pace of [100,130,190,200])for(const factor of [60,80,95])for(const grip of [.5,1,3]){
   let prior=Infinity;for(const curvature of [1e-8,1e-5,.0003,.001,.01,.1,1,10]){
    const opts={pace,factor,grip,curvature},f=continuous(c,opts),native=c.road(c.original(),opts);native.f(native.sp+4,grip);
    const normal=native.run(),raw=f.run();assert.ok(Number.isFinite(raw)&&raw>0&&raw<=normal&&raw<=prior);assert.ok(raw*pace/100<=60*pace/100,JSON.stringify({pace,factor,grip,curvature,raw,normal,sp:f.sp,cap:f.d.getFloat32(f.sp+12,true)}));assert.ok(raw*pace/100<=factor/100*Math.sqrt(Math.fround(grip)*Math.fround(9.8)/Math.fround(curvature)));assert.ok(Math.abs(raw-expected(opts))<1e-10);prior=raw;
   }
  }
 });
 test(profile+': exact straights and invalid/zero native caps retain native outputs and write boundaries',()=>{
  const {c}=contexts[profile];for(const curvature of [0,-0]){const f=continuous(c,{curvature}),native=c.road(c.original(),{pace:130,curvature});native.put(B+4,3);assert.equal(f.run(),native.run());assert.equal(f.get(B+16),0);sameExceptProbe(native,f);}
  for(const cap of [0,-1,Infinity,NaN]){const f=continuous(c,{cap}),native=c.road(c.original(),{pace:130});native.put(B+4,3);native.f(native.sp+12,cap);assert.equal(f.run(),native.run());assert.equal(f.get(B+16),0);sameExceptProbe(native,f);}
  const f=continuous(c),native=c.road(c.original(),{pace:130});native.put(B+4,3);native.run();f.run();const a=new Uint8Array(native.memory.buffer),b=new Uint8Array(f.memory.buffer),slot=f.cpu+72+(f.get(f.cpu+136)&7)*8;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])assert.ok(i>=slot&&i<slot+8||i>=B+12&&i<B+36||i>=B+40&&i<B+44||i>=B+52&&i<B+60,'unexpected write '+i.toString(16));
 });
 test(profile+': command3 ownership, permission, Street X and lifecycle denials remain native',()=>{
  const {c}=contexts[profile],changes=[f=>f.put(A+4,3),f=>f.put(A+48,180),f=>f.put(A+8,0),f=>f.put(A+36,0),f=>f.put(f.race,6),f=>f.put(f.driver+0x6e8,f.route+4),f=>f.put(f.sp,0x4228bc),f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>{f.put(0x850078,8);f.put(0x850088,10);f.put(A+84,1);},f=>f.put(0x850078,8),f=>f.d.setUint8(0x89e7d8,1),f=>f.d.setUint8(0x89e7d9,1),f=>f.put(0x890114,1),f=>f.put(0x89e7b0,7),f=>{f.put(A+60,99);f.put(B+48,99);},f=>{f.put(A+60,201);f.put(B+48,201);}];
  for(const change of changes){const f=continuous(c),native=c.road(c.original(),{pace:130});native.put(B+4,3);change(f);change(native);assert.equal(f.run(),native.run());assert.equal(f.get(B+16),0);sameExceptProbe(native,f);}
  const f=continuous(c);f.put(0x850078,8);f.put(A+84,1);assert.ok(f.run()<60);assert.equal(f.get(B+16),1);
 });
 test(profile+': legacy commands1 and2 including Street X remain byte-for-byte equivalent to v032',()=>{
  const {c,old}=contexts[profile];for(const command of [1,2])for(const curvature of [0,1e-6,.0003,.001,.01,-.01,.1])for(const street of [false,true]){
   const opts={pace:190,curvature},a=command===1?old.fixture(old.patched()):old.road(old.patched(),opts),b=command===1?c.fixture(c.patched()):c.road(c.patched(),opts);a.f(a.sp+8,curvature);b.f(b.sp+8,curvature);if(street){a.d.setUint8(0x89e7e3,1);b.d.setUint8(0x89e7e3,1);}assert.equal(b.run(),a.run());assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));
  }
 });
}
const controller=harness('race-corner-controller.test.cjs','road,fixture');
test('continuous command is literal modern opt-in and Street X retains prior command2',()=>{
 for(const adaptiveCorners of [false,0,1,'true',true]){const f=controller.api.road();f.request({pace:1.3,adaptiveCorners});f.step();assert.equal(f.c.status().cornerMode,adaptiveCorners===true?3:2);assert.equal(f.c.status().cornerPace,1.3);assert.equal(f.c.status().cornerBraking,.75);}
 for(const mark of [f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>{f.put(0x850078,8);f.put(0x850088,10);}]){const f=controller.api.road();mark(f);f.request({pace:1.3,allowNetwork:true,adaptiveCorners:true});f.step();assert.equal(f.c.status().cornerMode,2);assert.equal(f.c.status().cornerPace,1.3);}
});
test('switching old/new command reconstructs cached route only after native OFF acknowledgement',()=>{
 const f=controller.api.road();f.request({pace:1.3});f.step();assert.equal(f.c.status().cornerMode,2);
 for(const adaptiveCorners of [true,false,true]){assert.equal(f.request({pace:1.3,adaptiveCorners}).switching,true);assert.equal(f.get(A+8),0);const n=f.calls.length;for(let i=0;i<5;i++)f.request({pace:1.3,adaptiveCorners});assert.equal(f.calls.length,n);f.step();f.request({pace:1.3,adaptiveCorners});f.step();assert.equal(f.c.status().cornerMode,adaptiveCorners?3:2);assert.equal(f.c.status().active,true);}
 const n=f.calls.length;for(let i=0;i<100;i++){f.request({pace:1.3,adaptiveCorners:true});f.step();}assert.equal(f.calls.length,n);f.c.stop();f.step();assert.equal(f.c.status().active,false);
});
