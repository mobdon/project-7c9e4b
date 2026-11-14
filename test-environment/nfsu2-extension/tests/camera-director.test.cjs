'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createCameraDirector}=require('../extension/core.js');
const active=(director,now,extra={})=>director.update({enabled:true,ready:true,now,identity:'car:race:session',...extra});
function tickUntil(director,from,to,extra={}){let result;for(let t=from+1000;t<to;t+=1000)result=active(director,t,extra);return active(director,to,extra);}

test('camera director starts off and only arms a future interval in an explicitly ready context',()=>{
 let draws=0;const d=createCameraDirector({random:()=>{draws++;return 0;}});
 for(const value of[undefined,{}, {enabled:true,ready:false,now:0,identity:'car'}, {enabled:1,ready:true,now:0,identity:'car'}])assert.deepEqual(d.update(value),{due:false,nextAt:null});
 assert.equal(draws,0);assert.deepEqual(active(d,0),{due:false,nextAt:45000});assert.equal(draws,1);
 assert.deepEqual(active(d,0),{due:false,nextAt:45000});assert.equal(draws,1);
});

test('camera timing stays within 45 to 120 seconds for random endpoints and invalid draws',()=>{
 for(const[draw,delay]of[[0,45000],[1,120000],[-1,45000],[2,120000],[0.5,82500],[NaN,82500],[Infinity,82500],[-Infinity,82500],['0',82500]]){
  const d=createCameraDirector({random:()=>draw});assert.deepEqual(active(d,123.5),{due:false,nextAt:123.5+delay});
 }
 const d=createCameraDirector({random:()=>{throw Error('unavailable');}});assert.equal(active(d,0).nextAt,82500);
 assert.throws(()=>createCameraDirector({random:4}),TypeError);
});

test('an observed active timer emits once at its deadline and immediately schedules a new interval',()=>{
 let draws=0;const d=createCameraDirector({random:()=>{draws++;return draws===1?0:1;}});
 active(d,0);assert.equal(tickUntil(d,0,44999).due,false);assert.deepEqual(active(d,45000),{due:true,nextAt:165000});
 assert.deepEqual(active(d,45000),{due:false,nextAt:165000});assert.equal(draws,2);
 assert.deepEqual(tickUntil(d,45000,165000),{due:true,nextAt:285000});assert.equal(draws,3);
});

test('off and not-ready states discard elapsed time and never send a resume catch-up pulse',()=>{
 for(const pause of[{enabled:false},{ready:false}]){
  const d=createCameraDirector({random:()=>0});active(d,0);tickUntil(d,0,44000);
  assert.deepEqual(active(d,45000,pause),{due:false,nextAt:null});
  assert.deepEqual(active(d,100000),{due:false,nextAt:145000});assert.equal(active(d,100001).due,false);
 }
});

test('a changed identity gets a fresh interval even if the old deadline was due',()=>{
 const d=createCameraDirector({random:()=>0});active(d,0);tickUntil(d,0,44000);
 assert.deepEqual(active(d,45000,{identity:'another-car:race:session'}),{due:false,nextAt:90000});
 assert.deepEqual(active(d,45001,{identity:'another-car:race:session'}),{due:false,nextAt:90000});
 assert.deepEqual(active(d,45002,{identity:'car:race:session'}),{due:false,nextAt:90002});
});

test('clock rollback and an unobserved gap over one second rearm without firing',()=>{
 const rollback=createCameraDirector({random:()=>0});active(rollback,10000);active(rollback,11000);
 assert.deepEqual(active(rollback,9000),{due:false,nextAt:54000});
 const stale=createCameraDirector({random:()=>0});active(stale,0);tickUntil(stale,0,44000);
 assert.deepEqual(active(stale,45001),{due:false,nextAt:90001});
 assert.deepEqual(active(stale,200000),{due:false,nextAt:245000});
 const boundary=createCameraDirector({random:()=>0});active(boundary,0);assert.equal(tickUntil(boundary,0,45000).due,true);
});

test('manual camera, Stop or explicit reset postpones from the next valid observation',()=>{
 const d=createCameraDirector({random:()=>0});active(d,0);tickUntil(d,0,44000);d.reset();
 assert.deepEqual(active(d,45000),{due:false,nextAt:90000});d.reset();d.reset();
 assert.deepEqual(active(d,45000),{due:false,nextAt:90000});
});

test('invalid clocks and missing identities clear arming; zero time and zero identity remain valid',()=>{
 for(const invalid of[{now:NaN},{now:Infinity},{now:-1},{now:Number.MAX_SAFE_INTEGER},{identity:null},{identity:undefined}]){
  const d=createCameraDirector({random:()=>0});active(d,0);assert.deepEqual(active(d,100,invalid),{due:false,nextAt:null});
  assert.deepEqual(active(d,1000),{due:false,nextAt:46000});
 }
 const d=createCameraDirector({random:()=>0});assert.deepEqual(active(d,0,{identity:0}),{due:false,nextAt:45000});
});

test('director does not use host timers, game memory or mutable returned state',()=>{
 const d=createCameraDirector({random:()=>0}),first=active(d,0);assert(Object.isFrozen(d));first.nextAt=1;first.due=true;
 assert.deepEqual(active(d,500),{due:false,nextAt:45000});
 assert.deepEqual(Object.keys(d).sort(),['reset','update']);
});
