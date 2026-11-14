'use strict';
// Current943 native target consumption with controlled upstream cap providers.
// Physical speed samples do not simulate a collision or prove a city route.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('../native/paced-fixture.cjs'),AI=require('../extension/ai.js');
const {Engine}=require('../extension/core.js'),{Controller:City}=require('../extension/city-pacing.js'),{Pacing}=require('../extension/dynamic-pacing.js');
const profile=require('../extension/family-profiles.js').profiles.find(p=>p.revision==='943ee537');
test('current943 selected/runtime/native pace stay205 with zero corners, lower physical speed and a501ms frame gap',async()=>{
 const f=await fixture('943ee537'),B=AI.BASE,corner=AI.CORNER_BASE;
 f.u(0x89e7b0,0);f.u(0x850078,1);f.u(f.car+0x434,3);f.f32(f.car+0x440,6000);f.u(f.car+0x30,f.controller);
 profile.cars.onlineAddresses.forEach((p,i)=>i===1?f.view.setUint8(p,1):f.u(p,1));
 const engine=new Engine(f.memory,64,profile.hash),state=engine.state();assert.equal(state.ready,true);assert.equal(state.driving,true);assert.equal(state.network,true);
 const ai=new AI.Controller(f.memory,true,profile.capabilities,{moduleHash:profile.hash}),city=new City({Pacing});
 const settings={enabled:true,safe:true,state,mode:2,pace:2.05,allowNetwork:true,cornerAssist:true,cornerFactor:.8,cornerMargin:0};
 ai.update(settings);assert.equal(ai.status().active,true);const identity=ai.requestTarget;
 const input={enabled:true,verified:true,capabilities:profile.capabilities,automaticAI:true,allowNetwork:true,safe:true,focused:true,hidden:false,menuOpen:false,tunerBusy:false,hud:2,raceType:0,drag:false,drift:false,streetX:false,engine,state,identity:'current943-city-frame',selectedPace:2.05};
 f.u(B+60,100);const nativeTarget=f.policy(13962,16);assert.equal(f.u(B+76),100);
 for(const [now,speed,upstream]of [[0,33,16],[50,9,16],[551,9,4.4]]){
  f.f32(f.car+0x430,speed);
  const r=city.update({...input,now,nativeSpeed:speed,aiState:ai.status(),handbackPending:ai.handbackPending});
  assert.equal(r.active,true);assert.equal(r.pace,2.05);assert.equal(r.selectedPace,2.05);assert.equal(r.clearanceObserved,false);
  ai.update({...settings,cityPace:r.pace});const hits=f.u(B+80),target=f.policy(13962,upstream),observed=ai.status();
  assert(f.u(B+80)>hits,'The actual native target consumer acknowledged this frame');
  assert.equal(f.u(B+60),205);assert.equal(f.u(B+76),205);assert.equal(observed.nativePaceApplied,2.05);
  assert.equal(f.u(corner+48),205);assert.equal(observed.cornerPlannerCorners,0);assert.equal(ai.requestTarget,identity);assert.equal(ai.handbackPending,false);
  assert(Math.abs(target-nativeTarget*2.05*upstream/16)<1e-4,'A lower upstream native target remains lower with unchanged pace');
  if(now===551){assert.equal(r.timingState,'gap');assert.equal(r.sampleGapMs,501);assert(target<10);}
 }
 ai.stop();assert.equal(f.u(B+8),0);
});
