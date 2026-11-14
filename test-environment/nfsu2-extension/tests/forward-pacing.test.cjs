'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan}=require('../extension/forward-pacing.js');
const policy={lateralAcceleration:6,brakingDeceleration:4,cornerFactor:.8,sharpMargin:15};
function window(samples){return{source:'owned-native-forward-query-v1',orderVerified:true,nativeUnitScaleVerified:true,horizontalAxes:'xy',postConstructionVerified:true,pathKind:'selected-road-centerline',physicalSpeed:10,samples};}
function arc(radius=50,degrees=90,count=13){const total=degrees*Math.PI/180;return window(Array.from({length:count},(_,i)=>{const angle=total*i/(count-1);return{distance:radius*angle,xyz:[radius*Math.sin(angle),radius*(1-Math.cos(angle)),0]};}));}
function straight(count=24,step=10){return window(Array.from({length:count},(_,i)=>({distance:i*step,xyz:[i*step,0,0]})));}
test('gradual sampled circular bend uses its analytic radius, even without a sharp vertex',()=>{
 const r=plan(arc(100,60),policy);assert.equal(r.available,true);assert.equal(r.priorityTurns,0);
 for(const p of r.samples.slice(1,-1))assert(Math.abs(p.curveSpeed-Math.sqrt(6*100)*.8)<1e-8);
});
test('same-direction heading changes accumulate the 75-degree priority across gradual vertices',()=>{
 const r=plan(arc(50,100,21),policy);assert.equal(r.available,true);assert.equal(r.priorityTurns,1);
 assert(r.samples.slice(1,-1).every(p=>p.priority));
 assert(Math.abs(r.samples[5].curveSpeed-Math.sqrt(6*50)*.8*.85)<1e-8);
});
test('sufficiently sampled sharper arcs receive lower corner caps than wider arcs',()=>{
 const tight=plan(arc(25,100,21),policy),wide=plan(arc(100,100,21),policy);
 assert(tight.available&&wide.available);assert(tight.samples[5].curveSpeed<wide.samples[5].curveSpeed);
});
test('a straight excerpt has no optional target and its endpoint is not a stopping obstacle',()=>{
 const r=plan(straight(),policy);assert(r.available);assert.equal(r.priorityTurns,0);assert.equal(r.horizonDistance,230);
 assert.equal(r.override,false);assert.equal(r.targetCap,null);assert.equal(r.reason,'no-observed-corner-constraint');
 assert(r.samples.every(s=>s.entrySpeed===null));assert.equal(r.wholeRaceChecked,false);assert.equal(r.advisoryOnly,true);
});
test('backward envelope has enough distance to reach each next entry cap under the declared deceleration',()=>{
 const r=plan(arc(100,100,21),policy);assert(r.available);
 for(let i=0;i<r.samples.length-1;i++){const a=r.samples[i],b=r.samples[i+1];if(b.entrySpeed!==null)assert(a.entrySpeed**2<=b.entrySpeed**2+8*(b.brakingDistance-a.brakingDistance)+1e-9);}
});
test('mirrored/reversed-heading geometry keeps speed limits without treating an opposite bend as a straight',()=>{
 const a=arc(50,100,21),b=arc(50,100,21);b.samples.forEach(p=>p.xyz[1]*=-1);
 assert.deepEqual(plan(a,policy).samples,plan(b,policy).samples);
});
test('raw interpolation traffic, unverified direction/units/phase or wrong horizontal axes cannot authorize advice',()=>{
 for(const change of [{source:'natural-owned-native-node-query'},{orderVerified:false},{nativeUnitScaleVerified:false},{postConstructionVerified:false},{horizontalAxes:'xz'},{pathKind:'final-racing-line'}])assert.equal(plan({...straight(),...change},policy).available,false);
});
test('missing/gapped, duplicate, nonfinite, mismatched-distance or steep geometry is unknown',()=>{
 for(const mutate of [w=>w.samples.splice(2,4),w=>w.samples[3].xyz=[20,0,0],w=>w.samples[3].xyz[0]=NaN,w=>w.samples[3].distance=20,w=>w.samples[3].xyz[0]=1000,w=>w.samples[3].xyz[2]=100]){const w=straight();mutate(w);assert.equal(plan(w,policy).available,false);}
 for(const samples of [[],straight().samples.slice(0,2),Array.from({length:49},(_,i)=>({distance:i*2,xyz:[i*2,0,0]}))])assert.equal(plan(window(samples),policy).available,false);
});
test('invalid/unprovided physical parameters fail without changing input data',()=>{
 const w=arc(),before=structuredClone(w);
 for(const p of [{},{...policy,lateralAcceleration:0},{...policy,brakingDeceleration:Infinity},{...policy,cornerFactor:1},{...policy,sharpMargin:26}])assert.equal(plan(w,p).available,false);
 assert.deepEqual(w,before);
});

test('latency and margin reduce the approach speed to a corner before the checked horizon',()=>{
 const points=straight(24).samples;
 // A 90-degree bend followed by a long straight: the horizon alone would
 // permit entering too quickly. All samples remain within the 20m budget.
 for(let i=5;i<points.length;i++)points[i].xyz=[40,(i-4)*10,0];
 const w=window(points),instant=plan(w,{...policy,reactionSeconds:0,marginDistance:0}),delayed=plan(w,{...policy,reactionSeconds:.8,marginDistance:10});
 assert(instant.available&&delayed.available);
 assert(delayed.samples[0].entrySpeed<instant.samples[0].entrySpeed);
 const target=delayed.samples[4],entry=delayed.samples[0].entrySpeed;
 assert(entry**2+2*4*.8*entry<=target.curveSpeed**2+8*(target.brakingDistance-10)+1e-8);
 assert.equal(delayed.pathKind,'selected-road-centerline');
});

test('a measured all-straight window stays advisory and cannot claim a final racing line',()=>{
 const r=plan(straight(),policy);assert(r.available);assert.equal(r.advisoryOnly,true);
 assert.equal(r.pathKind,'selected-road-centerline');assert.match(r.notice,/not the final racing line/);
});

test('an admitted half-scale route parameter cannot double the physical braking horizon',()=>{
 const w=straight(24,8);w.samples.forEach(p=>p.xyz[0]*=.5);const before=structuredClone(w);
 const r=plan(w,policy);assert(r.available);assert.equal(r.routeHorizonDistance,184);assert.equal(r.pathHorizonDistance,92);
 assert.equal(r.horizonDistance,92);assert.equal(r.brakingHorizonDistance,92);
 assert.equal(r.override,false);assert.equal(r.targetCap,null);assert.equal(r.samples[0].entrySpeed,null);assert.equal(r.samples.at(-1).entrySpeed,null);
 assert.equal(r.samples.at(-1).distance,184);assert.equal(r.samples.at(-1).routeDistance,184);assert.equal(r.samples.at(-1).pathDistance,92);
 assert.deepEqual(w,before);
});

test('longer XY chords retain a conservative route bound without overstating the measured path',()=>{
 const w=straight(19,10);w.samples.forEach((p,i)=>p.xyz[0]=i*11);const r=plan(w,policy);assert(r.available);
 assert.equal(r.routeHorizonDistance,180);assert.equal(r.pathHorizonDistance,198);assert.equal(r.horizonDistance,180);assert(r.horizonDistance<=184);
 for(let i=1;i<r.samples.length;i++){
  const a=r.samples[i-1],b=r.samples[i];assert.equal(b.brakingDistance-a.brakingDistance,10);
  assert(b.brakingDistance<=b.pathDistance);assert(b.brakingDistance<=b.routeDistance);
 }
});

test('each local braking segment uses its shorter distance rather than netting opposite scale errors',()=>{
 const w=window([0,5,16,21].map((x,i)=>({distance:i*10,xyz:[x,0,0]}))),r=plan(w,policy);assert(r.available);
 assert.equal(r.routeHorizonDistance,30);assert.equal(r.pathHorizonDistance,21);assert.equal(r.horizonDistance,20);
 assert.deepEqual(r.samples.map(p=>p.brakingDistance),[0,5,15,20]);
});

test('gradual bend caps and braking remain invariant when only its admitted route parameter is stretched',()=>{
 const original=arc(40,100,21),stretched=structuredClone(original);stretched.samples.forEach(p=>p.distance*=1.8);
 const a=plan(original,policy),b=plan(stretched,policy);assert(a.available&&b.available);assert.equal(a.priorityTurns,1);assert.equal(b.priorityTurns,1);
 assert(b.pathHorizonDistance<b.routeHorizonDistance);assert.equal(b.pathHorizonDistance,a.pathHorizonDistance);
 for(let i=0;i<a.samples.length;i++){
  assert.equal(a.samples[i].curveSpeed,b.samples[i].curveSpeed);assert.equal(a.samples[i].entrySpeed,b.samples[i].entrySpeed);
  assert.equal(a.samples[i].brakingDistance,b.samples[i].brakingDistance);
 }
});

test('permitted slope does not add vertical length to the horizontal braking budget',()=>{
 const flat=straight(20,8),sloped=structuredClone(flat);sloped.samples.forEach(p=>p.xyz[2]=p.xyz[0]*.25);
 const a=plan(flat,policy),b=plan(sloped,policy);assert(a.available&&b.available);
 assert.equal(a.pathHorizonDistance,b.pathHorizonDistance);assert.equal(a.horizonDistance,b.horizonDistance);
 assert.deepEqual(a.samples,b.samples);
});
