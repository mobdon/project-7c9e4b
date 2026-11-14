'use strict';
// Local, hash-pinned 93af6ccb native-function execution. The controlled fixtures
// below prove wrapper/ABI behavior, not live route coverage or safe cornering.
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const {BASE:A,CORNER_BASE:B}=require('../extension/ai.js');
function harness(name,extra,transform=s=>s){
 const file=path.join(__dirname,name),baseRequire=createRequire(file),hooks=[];
 const requireHere=name=>name==='node:test'?{test(){},before:fn=>hooks.push(fn)}:baseRequire(name);requireHere.resolve=baseRequire.resolve;
 const ctx={require:requireHere,process:{env:{...process.env,NFS_PROFILE:'next'}},console,Buffer,WebAssembly,__dirname};
 vm.runInNewContext(transform(fs.readFileSync(file,'utf8'))+'\nthis.api={'+extra+'};',ctx,{filename:file});
 return {api:ctx.api,init:async()=>{for(const f of hooks)await f();}};
}
const corner=harness('race-corner-native.test.cjs','road,original:()=>originalModule,patched:()=>patchedModule');
const braking=harness('race-braking-native.test.cjs','fixture,profiles,setRecordIndex:value=>globalThis.__recordIndex=value',s=>s.replace("['legacy','current','latest','next']","['next']").replace('d.setInt8(route+328,14)','d.setInt8(route+328,globalThis.__recordIndex??14)'));
before(async()=>{await corner.init();await braking.init();});
function cornerFixture(patched=true,{live=100,planning=200,command=3}={}){
 const f=corner.api.road(patched?corner.api.patched():corner.api.original(),{pace:planning});f.put(B+4,command);f.put(A+60,live);return f;
}
function brakingFixture(patched=true,{live=100,planning=200,command=3,...options}={}){
 const profile=braking.api.profiles.next,f=braking.api.fixture(patched?profile.patched:profile.original,{pace:planning,...options});f.put(B+4,command);f.put(A+60,live);return f;
}
function equalExceptCornerProbe(native,patched){
 const expected=Buffer.from(native.memory.buffer),actual=Buffer.from(patched.memory.buffer);actual.copy(expected,B+28,B+28,B+32);assert.deepEqual(actual,expected);
}
test('93af: live .75x–2x retains the 2x planned corner cap with conservative effective targets',()=>{
 const ceiling=cornerFixture(true,{live:200}),planned=ceiling.run();assert.equal(ceiling.get(B+16),1);
 for(const live of [75,100,125,150,199,200]){
  const f=cornerFixture(true,{live}),raw=f.run();assert.equal(raw,planned);assert.equal(f.get(B+16),1);assert.equal(f.get(B+52),200);
  assert.ok(raw*live/100<=planned*2);assert.equal(f.get(A+60),live);
 }
});
test('93af: live reductions retain backward braking and both production planner hook calls',()=>{
 const ceiling=brakingFixture(true,{live:200});ceiling.prepareGetter();const planned=ceiling.getter();assert.equal(ceiling.get(B+60),1);
 for(const live of [75,100,125,150,199,200]){
  const f=brakingFixture(true,{live});f.prepareGetter();assert.equal(f.getter(),planned);assert.equal(f.get(B+60),1);
  const planner=brakingFixture(true,{live,planner:true,plannerCorners:true}),result=planner.planner();
  assert.ok(result.hits>1);assert.equal(planner.get(B+16),1);assert.equal(planner.get(B+52),200);
  assert.equal(result.returnAddress,0x123456);assert.equal(result.stack,planner.sp+8);
 }
});

test('93af: native signed -1 reaches helper while the final route-node record bypasses it',()=>{
 try{
  for(const index of [-1,0,26,27]){
   braking.api.setRecordIndex(index);const f=brakingFixture(true,{count:28,planner:true,plannerCorners:true});f.planner();
   assert.equal(f.get(B+16),index<=26?1:0,'native helper hits for signed record index '+index);
  }
 }finally{braking.api.setRecordIndex(undefined);}
});
test('93af: runtime factors below .75x or above the planning ceiling retain native output',()=>{
 for(const live of [0,74,201,300,0xffffffff]){
  const native=cornerFixture(false,{live}),patched=cornerFixture(true,{live});assert.equal(patched.run(),native.run());assert.equal(patched.get(B+16),0);equalExceptCornerProbe(native,patched);
  const original=brakingFixture(false,{live}),modified=brakingFixture(true,{live});original.prepareGetter();modified.prepareGetter();assert.equal(modified.getter(),original.getter());assert.equal(modified.get(B+60),0);assert.deepEqual(Buffer.from(modified.memory.buffer),Buffer.from(original.memory.buffer));
 }
});
test('93af: planning ceiling remains bounded to 1x–2x independently of runtime factor',()=>{
 for(const planning of [0,75,99,201,300,0xffffffff]){
  const native=cornerFixture(false,{planning,live:75}),patched=cornerFixture(true,{planning,live:75});assert.equal(patched.run(),native.run());assert.equal(patched.get(B+16),0);equalExceptCornerProbe(native,patched);
  const original=brakingFixture(false,{planning,live:75}),modified=brakingFixture(true,{planning,live:75});original.prepareGetter();modified.prepareGetter();assert.equal(modified.getter(),original.getter());assert.equal(modified.get(B+60),0);assert.deepEqual(Buffer.from(modified.memory.buffer),Buffer.from(original.memory.buffer));
 }
});
test('93af: legacy command2 still requires exact pace equality',()=>{
 for(const live of [75,100,199,201,300]){
  const native=cornerFixture(false,{live,command:2}),patched=cornerFixture(true,{live,command:2});assert.equal(patched.run(),native.run());assert.equal(patched.get(B+16),0);equalExceptCornerProbe(native,patched);
  const original=brakingFixture(false,{live,command:2}),modified=brakingFixture(true,{live,command:2});original.prepareGetter();modified.prepareGetter();assert.equal(modified.getter(),original.getter());assert.equal(modified.get(B+60),0);assert.deepEqual(Buffer.from(modified.memory.buffer),Buffer.from(original.memory.buffer));
 }
});
test('93af: Street X, ownership, permission, epoch and watchdog denials remain native with live reduction',()=>{
 const changes=[f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>{f.put(0x850078,8);f.put(0x850088,10);f.put(A+84,1);},f=>f.put(0x850078,8),f=>f.put(A+36,0),f=>f.put(A+4,3),f=>f.put(A+48,180),f=>f.put(f.race,6),f=>f.put(f.driver+0x6e8,f.route+4)];
 for(const change of changes){
  const native=cornerFixture(false),patched=cornerFixture();change(native);change(patched);assert.equal(patched.run(),native.run());assert.equal(patched.get(B+16),0);equalExceptCornerProbe(native,patched);
  const original=brakingFixture(false),modified=brakingFixture();original.prepareGetter();modified.prepareGetter();change(original);change(modified);assert.equal(modified.getter(),original.getter());assert.equal(modified.get(B+60),0);assert.deepEqual(Buffer.from(modified.memory.buffer),Buffer.from(original.memory.buffer));
 }
});
