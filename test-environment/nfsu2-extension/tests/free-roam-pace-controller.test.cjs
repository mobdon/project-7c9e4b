'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const {BASE:A,CORNER_BASE:B}=require('../extension/ai.js');
const {Controller:City}=require('../extension/city-pacing.js'),{Pacing}=require('../extension/dynamic-pacing.js');
function harness(profile){
 const file=path.join(__dirname,profile==='legacy'?'corner-controller.test.cjs':'race-corner-controller.test.cjs'),baseRequire=createRequire(file);
 const req=name=>name==='node:test'?{test(){}}:name==='fs'&&profile==='abf'?{...fs,readFileSync:(file,...args)=>fs.readFileSync(String(file).replace(/tests[\\/]ai-abf-bridge\.wasm$/, '../work-8abf-profile/tests/ai-abf-bridge.wasm'),...args)}:baseRequire(name);
 const c={require:req,console,Buffer,WebAssembly,__dirname,process:{env:{...process.env,NFS_PROFILE:profile}}};
 vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.api={fixture};',c,{filename:file});return c.api;
}
for(const profile of ['legacy','current','latest','next','abf']){
 test(profile+': free-roam boosts rebuild caps once and sub-native runtime changes keep the native lease',()=>{
  const f=harness(profile).fixture();f.request({pace:1});f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(B+4),1);assert.equal(f.get(B+48),100);assert.equal(f.c.status().cornerPace,1);
  const baselineTarget=f.c.requestTarget,initialCalls=f.calls.length;
  for(const pace of [.75,.8,.95,1,.75,1]){f.request({pace});f.step();assert.equal(f.c.status().active,true);assert.equal(f.c.handbackPending,false);assert.equal(f.c.requestTarget,baselineTarget);assert.equal(f.get(A+60),Math.round(pace*100));assert.equal(f.get(B+48),100);assert.equal(f.c.status().cornerPace,1);}
  assert.equal(f.calls.length,initialCalls);
  assert.equal(f.request({pace:2}).switching,true);assert.equal(f.get(A+8),0);assert.notEqual(f.c.requestTarget,baselineTarget);f.step();f.request({pace:2});f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(B+48),200);assert.equal(f.c.status().cornerPace,2);
  const rebuiltCalls=f.calls.length;for(let i=0;i<20;i++){f.request({pace:2});f.step();assert.equal(f.c.status().active,true);assert.equal(f.c.handbackPending,false);}assert.equal(f.calls.length,rebuiltCalls);
  f.c.stop();f.step();assert.equal(f.c.status().active,false);assert.equal(f.get(A+8),0);
 });
 test(profile+': city slowing retains the owned3x corner plan while runtime requests reduce and recover',()=>{
  const f=harness(profile).fixture(),saved={pace:3},driver=0xe06000;
  f.state.network=true;f.put(0x850078,8);f.put(f.car+0x2c,driver);f.put(driver,0x785370);f.put(driver+4,f.car);
  f.request({pace:saved.pace,allowNetwork:true});f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(B+4),1);assert.equal(f.get(B+48),300);assert.deepEqual([...f.calls],[0x5fae20]);
  const boostedTarget=f.c.requestTarget,city=new City({Pacing});let hazards={cars:[],barrierAhead:null};
  const engine={state:()=>f.state,live:(state,network,driving)=>state===f.state&&network===true&&driving===true&&f.state.ready&&f.state.driving,
   ok:(p,n)=>Number.isSafeInteger(p)&&p>=0x10000&&p+n<=f.d.byteLength,u32:f.get,u8:p=>f.d.getUint8(p),pacingHazards:()=>hazards};
  const update=now=>{
   const pacing=city.update({enabled:true,verified:true,capabilities:{ai:true,pace:true},automaticAI:true,allowNetwork:true,safe:true,focused:true,hidden:false,menuOpen:false,tunerBusy:false,hud:2,raceType:0,drag:false,drift:false,streetX:false,engine,state:f.state,aiState:f.c.status(),handbackPending:f.c.handbackPending,identity:'owned-high-to-city-'+profile,now,selectedPace:saved.pace,nativeSpeed:60});
   return {pacing,pace:pacing.pace,status:f.request({pace:saved.pace,cityPace:pacing.active?pacing.pace:null,allowNetwork:true})};
  };
  let r=update(0);f.step();assert.equal(r.pacing.active,true);assert.equal(r.pace,3);assert.equal(f.c.status().active,true);assert.equal(f.c.handbackPending,false);assert.equal(f.c.requestTarget,boostedTarget);
  hazards={cars:[],barrierAhead:30};r=update(50);f.step();assert.equal(r.pacing.state,'clearance-limited');assert.equal(r.pace,.75);assert.equal(f.get(A+60),75);
  hazards=null;const observed=new Set([r.pace]);
  for(let now=100;now<=8000;now+=50){
   r=update(now);f.step();observed.add(r.pace);assert.equal(r.pacing.active,true);assert(r.pace>=.75&&r.pace<=3);assert.equal(f.c.status().active,true);assert.equal(f.c.handbackPending,false);assert.equal(f.c.requestTarget,boostedTarget);assert.equal(f.get(A+8),2);assert.equal(f.get(A+60),Math.round(r.pace*100));assert.equal(f.get(B+4),1);assert.equal(f.get(B+48),300);assert.equal(f.c.status().cornerPace,3);assert.equal(saved.pace,3);assert.deepEqual([...f.calls],[0x5fae20]);
  }
  assert(observed.has(.75)&&observed.has(3)&&[...observed].some(p=>p>1&&p<3),'city reduction recovers through intermediate requests to the selected ceiling');
  assert.equal(f.get(0x850078),8);f.c.stop();f.step();assert.equal(f.c.status().active,false);assert.equal(f.get(A+8),0);
 });
}
