'use strict';
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const {BASE:A,CORNER_BASE:B}=require('../extension/ai.js'),registry=require('../extension/forward-native-config.js');
const contexts=new Map();
function harness(name,extractor=null){
 const file=path.join(__dirname,name),baseRequire=createRequire(file),hooks=[];
 const req=name=>name==='node:test'?{test(){},before:fn=>hooks.push(fn)}:name==='../tools/extract-latest-functions.cjs'&&extractor?extractor:baseRequire(name);
 req.resolve=baseRequire.resolve;
 const c={require:req,console,Buffer,WebAssembly,__dirname:path.dirname(file),process};
 vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.api={fixture,original:()=>originalModule,patched:()=>patchedModule};',c,{filename:file});
 return {api:c.api,init:async()=>{for(const f of hooks)await f();}};
}
const profiles=[['legacy','corner-native.test.cjs'],['current','corner-current-native.test.cjs'],['latest','latest-corner-native.test.cjs'],['next','next-corner-native.test.cjs'],...Object.values(registry.profiles).map(p=>[p.revision,'latest-corner-native.test.cjs',p])];
before(async()=>{
 for(const [name,file,pin]of profiles){
  let extractor=null;
  if(pin){
   const file=path.join(__dirname,'../tools/extract-latest-functions.cjs');
   const modulePath=pin.revision==='3bdd9959'?'../research/game-3bdd9959.wasm':'../../research/compatibility-'+pin.revision+'/game.wasm';
   const source=fs.readFileSync(file,'utf8').replace('../../research/compatibility-78e2bb69/game.wasm',modulePath).replace('38170601',String(pin.originalBytes)).replace('df7b930bb293ffdf975f0735d93e0797d51bd137d0cbeabcaff87fc5a693c759',pin.moduleHash);
   const c={require:createRequire(file),module:{exports:{}},__dirname:path.dirname(file),Buffer,process};vm.runInNewContext(source,c,{filename:file});extractor=c.module.exports;
  }
  const c=harness(file,extractor);await c.init();contexts.set(name,c.api);
 }
});
function set(c,pace,curvature,module=c.patched()){
 const f=c.fixture(module);f.put(A+60,pace);f.put(B+48,Math.max(100,pace));f.f(f.sp+8,curvature);return f;
}
for(const [name]of profiles){
 test(name+': increased free-roam pace cannot amplify a sampled protected corner cap',()=>{
  const c=contexts.get(name);
  for(const k of [.003,.01,-.01,.1])for(const pace of [100,130,200,300]){
   const f=set(c,pace,k),base=set(c,100,k),normal=set(c,pace,k,c.original());
   const reference=base.run(),raw=f.run(),native=normal.run();
   assert.equal(f.get(B+16),1);assert.ok(raw<=native);assert.ok(Math.abs(raw*pace/100-reference)<1e-10);
   assert.equal(f.get(A+60),pace);assert.equal(f.get(B+48),pace);
  }
 });
 test(name+': boosted free-roam sampled bends are checked while exact straights and sub-native caps retain native policy',()=>{
  const c=contexts.get(name);
  for(const pace of [130,200,300]){
   const straight=set(c,pace,0),native=set(c,pace,0,c.original());assert.equal(straight.run(),native.run());assert.equal(straight.get(B+16),0);
  }
  const gentle=set(c,200,.001),before=set(c,100,.001);assert.equal(before.run(),60);assert.equal(before.get(B+16),0);assert.ok(gentle.run()<60);assert.equal(gentle.get(B+16),1);
  for(const pace of [75,80,99,100]){
   const f=set(c,pace,.01),baseline=set(c,100,.01);assert.equal(f.run(),baseline.run());assert.equal(f.get(B+48),100);
  }
 });
 test(name+': free-roam cached pace and lifecycle guards fall back to the exact native helper',()=>{
  const c=contexts.get(name),changes=[f=>f.put(B+48,150),f=>f.put(A+60,74),f=>{f.put(A+60,301);f.put(B+48,301);},f=>f.put(A+8,0),f=>f.put(A+4,3),f=>f.put(A+48,180),f=>f.put(A+36,0),f=>f.put(f.driver+0x6e8,f.route+4),f=>f.put(0x850078,8),f=>f.d.setUint8(0x89e7d8,1),f=>f.d.setUint8(0x89e7d9,1),f=>{f.put(0x89e7b0,1);f.d.setUint8(0x89e7e3,1);}];
  for(const change of changes){const f=set(c,200,.01),native=set(c,200,.01,c.original());change(f);change(native);assert.equal(f.run(),native.run());assert.equal(f.get(B+16),0);}
 });
}
