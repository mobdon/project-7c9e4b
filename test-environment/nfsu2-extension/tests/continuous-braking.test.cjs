'use strict';
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const {BASE:A,CORNER_BASE:B}=require('../extension/ai.js'),file=path.join(__dirname,'race-braking-native.test.cjs'),baseRequire=createRequire(file),hooks=[];
const ctx={require:Object.assign(name=>name==='node:test'?{test(){},before:fn=>hooks.push(fn)}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,__dirname};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.api={profiles,fixture};',ctx,{filename:file});before(async()=>{for(const f of hooks)await f();});
for(const profile of ['legacy','current','latest','next']){
 test(profile+': continuous adaptive command uses native backward propagation and retains long-straight ceiling',()=>{
  const {profiles,fixture}=ctx.api;for(const pace of [100,130,190,200])for(const braking of [50,75,100]){
   const p=pace/100,k=.001,c=60,g=Math.fround(9.8),f=.8,apex=c/Math.sqrt(1+k*(p*c)**2/(g*f*f)),x=fixture(profiles[profile].patched,{pace,braking,apex});x.put(B+4,3);
   const targets=x.run().map(v=>v*p);assert.ok(x.get(B+60)>0);for(let i=0;i<targets.length;i++){const expected=Math.min(c*p,Math.sqrt((apex*p)**2+24*(braking/100)*(30-i)*150));assert.ok(Math.abs(targets[i]-expected)<.001);}assert.ok(Math.abs(targets.at(-1)-apex*p)<1e-4);assert.equal(targets[0],c*p);
  }
 });
 test(profile+': actual planner invokes command3 corner and braking hooks with matched compensation',()=>{
  const {profiles,fixture}=ctx.api;for(const pace of [100,130,190,200]){
   const p=pace/100,x=fixture(profiles[profile].patched,{planner:true,plannerCorners:true,pace});x.put(B+4,3);const result=x.planner();assert.ok(result.hits>1);assert.equal(x.get(B+16),1);assert.equal(x.get(B+52),pace);assert.equal(x.get(B+56),75);
   // The original native curvature helper is evaluated with g1,k.02,C60,f.8,m0 in this fixture.
   const k=Math.fround(.02),g=Math.fround(9.8),want=60/Math.sqrt(1+k*(p*60)**2/(g*.8*.8));assert.ok(Math.abs(x.d.getFloat32(B+24,true)-want)<1e-5);
  }
 });
 test(profile+': command3 braking denies Street X, network withdrawal and invalid ceiling without native writes',()=>{
  const {profiles,fixture}=ctx.api;for(const change of [x=>x.d.setUint8(0x89e7e3,1),x=>x.put(0x89010c,1),x=>{x.put(0x850078,8);x.put(0x850088,10);x.put(A+84,1);},x=>x.put(0x850078,8),x=>{x.put(A+60,99);x.put(B+48,99);},x=>{x.put(A+60,201);x.put(B+48,201);}]){
   const a=fixture(profiles[profile].original,{pace:130}),b=fixture(profiles[profile].patched,{pace:130});for(const x of [a,b]){x.put(B+4,3);x.prepareGetter();change(x);}assert.equal(b.getter(),a.getter());assert.equal(b.get(B+60),0);assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));
  }
 });
}
test('sampled planner counter churn no longer replaces useful history every quarter second',()=>{
 let now=1000;const log=require('../extension/diagnostics.js').create({clock:()=>now});
 for(let i=0;i<100;i++){log.snapshot({nativeTelemetry:true,aiActive:true,cornerMode:3,cornerRequested:true,cornerHits:1+i,brakingHits:10+i,cornerProbeStage:7,cornerApplied:.8,adaptiveRaceState:'planner-observed'});now+=50;}
 const states=JSON.parse(log.exportText()).events.filter(e=>e.event==='state');assert.equal(states.length,3);assert.deepEqual(states.map(e=>e.data.cornerHits),[1,41,81]);
 now+=250;log.snapshot({nativeTelemetry:true,aiActive:false,cornerMode:0,cornerRequested:false,cornerHits:0,brakingHits:0,cornerProbeStage:0,adaptiveRaceState:'paused'});assert.equal(JSON.parse(log.exportText()).events.at(-1).data.aiActive,false);
});
