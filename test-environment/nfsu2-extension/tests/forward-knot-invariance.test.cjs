'use strict';
// Pure synthetic captures exercise the authored planner. No live game, tire
// force, native query execution or race result is established by these tests.
const {test}=require('node:test'),assert=require('node:assert/strict');
const Pacing=require('../extension/forward-pacing.js');
const HASH='a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8';
const OPTIONS={pace:2,cornerFactor:.8,sharpMargin:15,brakingFactor:.75,reactionSeconds:.6,marginDistance:8};
const SPARSE=[[0,0,0],[100,100,0],[200,100,100]];
const INSERTED=[[0,0,0],[90,90,0],[100,100,0],[110,100,10],[200,100,100]];
function capture(tuples=SPARSE,{progress=95,end=tuples.at(-1)[0],heading=[1,0]}={}){
 const nativePolicy={available:true,source:'exact-native-grade-policy-v1',moduleHash:HASH,request:2,gravity:Math.fround(9.8),straightCap:60,grip:Math.fround(3.7),brakingDeceleration:12};
 nativePolicy.lateralAcceleration=nativePolicy.grip*nativePolicy.gravity;
 return{status:'captured',moduleHash:HASH,source:'owned-native-forward-query-v1',sampling:'native-node-anchors-linear-v1',request:2,postConstructionVerified:true,forwardOrderVerified:true,nativeUnitScaleVerified:true,horizontalAxes:'xy',controlWord:0x37f,progress,end,physical:{speed:60,heading},nativePolicy,points:tuples.map(([distance,x,y,z=0])=>({distance,xyz:[x,y,z]}))};
}
function plan(c,options=OPTIONS){return Pacing.planNative(c,c.nativePolicy,options);}
function comparable(r){return{available:r.available,override:r.override,targetCap:r.targetCap,priorityTurns:r.priorityTurns,canonicalKnots:r.canonicalKnots,constraints:r.constraints.map(({index,...c})=>c)};}
function arc(radius=50,degrees=100,count=21){
 const angle=degrees*Math.PI/180;
 return Array.from({length:count},(_,i)=>{const a=angle*i/(count-1);return[radius*a,radius*Math.sin(a),radius*(1-Math.cos(a))];});
}
function insertMidpoints(tuples){
 const out=[];for(let i=0;i<tuples.length-1;i++){out.push(tuples[i]);out.push(tuples[i].map((v,k)=>(v+tuples[i+1][k])/2));}out.push(tuples.at(-1));return out;
}

test('inserting/removing straight anchors cannot change the same physical90-degree corner cap',()=>{
 const a=plan(capture()),b=plan(capture(INSERTED));
 assert(a.available&&a.override);assert.deepEqual(comparable(a),comparable(b));assert.equal(a.canonicalKnots,3);
 assert(Math.abs(a.constraints[0].curvature-Math.SQRT2/16)<1e-15);assert.deepEqual(a.constraints[0].turnArms,[16,16]);
 assert.equal(a.targetCap,Math.fround(Math.sqrt(capture().nativePolicy.lateralAcceleration/(Math.SQRT2/16))*.8*.85));
 assert.equal(a.assumptions.geometryModel,'canonical-bounded-knot-v1');assert.equal(a.liveVerified,false);
});

test('many redundant knots on either side preserve distance, angle, priority and target',()=>{
 const dense=[[0,0,0],[20,20,0],[40,40,0],[80,80,0],[99,99,0],[100,100,0],[101,100,1],[120,100,20],[150,100,50],[200,100,100]];
 for(const progress of [0,50,95,100,125]){
  const options={progress},a=plan(capture(SPARSE,options)),b=plan(capture(dense,options));assert.deepEqual(comparable(a),comparable(b));
 }
});

test('mirroring a physical route leaves its corner caps and priority unchanged',()=>{
 const mirror=INSERTED.map(([d,x,y])=>[d,x,-y]);assert.deepEqual(comparable(plan(capture(INSERTED))),comparable(plan(capture(mirror))));
});

test('a90-degree turn does not acquire a larger rounded radius from longer straight legs',()=>{
 const caps=[];
 for(const leg of [20,40,100,200]){
  const r=plan(capture([[0,0,0],[leg,leg,0],[2*leg,leg,leg]],{progress:leg-5}));assert(r.available&&r.override);caps.push(r.targetCap);assert(Math.abs(r.constraints[0].curvature-Math.SQRT2/16)<1e-15);
 }
 assert(caps.every(cap=>cap===caps[0]));
});

test('well-observed circular gradual bends retain radius sensitivity and smaller radii yield lower caps',()=>{
 const caps=[];
 for(const radius of [16,32,64,100]){
  const r=plan(capture(arc(radius),{progress:0}));assert(r.available&&r.override);assert.equal(r.priorityTurns,1);assert.equal(r.constraints.length,19);
  for(const c of r.constraints){assert(Math.abs(c.curvature-1/radius)<1e-12);assert(c.angleDegrees<6);assert(c.priority);}
  caps.push(r.targetCap);
 }
 for(let i=1;i<caps.length;i++)assert(caps[i]>caps[i-1]);
});

test('gradual bends below75 degrees still produce a finite corner constraint',()=>{
 const r=plan(capture(arc(80,60,13),{progress:0}));assert(r.available&&r.override);assert.equal(r.priorityTurns,0);assert(r.constraints.every(c=>!c.priority&&c.angleDegrees<6));
});

test('same-sign gradual heading changes accumulate75-degree priority independent of collinear insertions',()=>{
 const tuples=arc(50,100,11),dense=insertMidpoints(tuples),a=plan(capture(tuples,{progress:0})),b=plan(capture(dense,{progress:0}));
 assert.equal(a.priorityTurns,1);assert.equal(b.priorityTurns,1);assert.equal(a.canonicalKnots,11);assert.equal(b.canonicalKnots,11);
 assert.equal(a.targetCap,b.targetCap);assert.equal(a.constraints.length,b.constraints.length);
 for(let i=0;i<a.constraints.length;i++){assert(a.constraints[i].priority&&b.constraints[i].priority);assert(Math.abs(a.constraints[i].curvature-b.constraints[i].curvature)<1e-12);}
});

test('a long straight cannot merge two45-degree bends into a spurious priority run',()=>{
 const root=Math.SQRT1_2,tuples=[[0,0,0],[50,50,0],[150,50+100*root,100*root],[200,50+100*root,100*root+50]];
 const a=plan(capture(tuples,{progress:45})),b=plan(capture(insertMidpoints(tuples),{progress:45}));
 assert(a.available&&b.available);assert.equal(a.priorityTurns,0);assert.equal(b.priorityTurns,0);assert.equal(a.targetCap,b.targetCap);assert(a.constraints.every(c=>!c.priority));
});

test('opposite turn signs do not accumulate priority across an S bend',()=>{
 const q=Math.SQRT1_2,tuples=[[0,0,0],[40,40,0],[60,40+20*q,20*q],[100,80+20*q,20*q]];
 const a=plan(capture(tuples,{progress:35})),b=plan(capture(insertMidpoints(tuples),{progress:35}));assert(a.available&&b.available);assert.equal(a.priorityTurns,0);assert.equal(b.priorityTurns,0);assert.equal(a.targetCap,b.targetCap);
});

test('75 degrees receives the sharp-turn margin while74 degrees does not',()=>{
 for(const degrees of [74,75,90]){
  const angle=degrees*Math.PI/180,r=plan(capture([[0,0,0],[100,100,0],[200,100+100*Math.cos(angle),100*Math.sin(angle)]]));
  assert(r.available&&r.override);assert.equal(r.priorityTurns,degrees>=75?1:0);assert.equal(r.constraints[0].priority,degrees>=75);
 }
});

test('valid selected paces cannot multiply away a physical corner cap',()=>{
 const caps=[.75,1,1.5,2].map(pace=>plan(capture(),{...OPTIONS,pace}).targetCap);assert(caps.every(cap=>cap===caps[0]));
});

test('past-apex retention still requires the current heading to align with the real outgoing segment',()=>{
 for(const tuples of [SPARSE,INSERTED]){
  const held=plan(capture(tuples,{progress:125,heading:[1,0]}));assert(held.available&&held.override);assert.equal(held.constraints[0].distanceNative,0);
  const exited=plan(capture(tuples,{progress:125,heading:[0,1]}));assert(exited.available);assert.equal(exited.override,false);assert.equal(exited.constraints.length,0);
  const c=capture(tuples,{progress:125});delete c.physical.heading;assert.equal(plan(c).reason,'verified-exit-heading-required');
 }
});

test('fixed bend arms clip at observed short endpoints without extrapolation or nonfinite targets',()=>{
 const r=plan(capture([[0,0,0],[5,5,0],[25,5,20]],{progress:0}));assert(r.available&&r.override);assert.deepEqual(r.constraints[0].turnArms,[5,16]);assert(Number.isFinite(r.targetCap)&&r.targetCap>0);assert.equal(r.wholeRaceChecked,false);
});

test('straight captures remain uncapped and the observed end is never a stopping obstacle',()=>{
 const a=plan(capture([[0,0,0],[100,100,0],[200,200,0]])),b=plan(capture([[0,0,0],[10,10,0],[100,100,0],[190,190,0],[200,200,0]]));
 assert.deepEqual(comparable(a),comparable(b));assert.equal(a.available,true);assert.equal(a.override,false);assert.equal(a.targetCap,null);assert.equal(a.constraints.length,0);
});

test('every raw edge still undergoes grade/unit checks before collinear simplification',()=>{
 for(const mutate of [c=>c.points[1].xyz[2]=100,c=>c.points[1].distance=20,c=>c.points[1].xyz[0]=500]){
  const c=capture(INSERTED);mutate(c);assert.equal(plan(c).available,false);
 }
 const c=capture(INSERTED);c.points.forEach(p=>p.xyz[2]=p.distance*.2);assert.equal(plan(c).available,true);
});

test('duplicate, reversing, nonfinite, unordered or unbounded raw captures remain unknown',()=>{
 for(const mutate of [c=>c.points[1].xyz=c.points[0].xyz.slice(),c=>c.points[2].xyz=[0,0,0],c=>c.points[1].xyz[0]=NaN,c=>c.points[1].distance=c.points[0].distance,c=>c.end=1000,c=>c.points[1].xyz[0]=1000]){
  const c=capture();mutate(c);const r=plan(c);assert.equal(r.available,false);assert.equal(r.override,false);
 }
});

test('native ownership, receipt and table-policy gates remain mandatory',()=>{
 for(const mutate of [c=>c.source='ambient-query',c=>c.moduleHash='unknown',c=>c.forwardOrderVerified=false,c=>c.nativeUnitScaleVerified=false,c=>c.postConstructionVerified=false,c=>c.horizontalAxes='xz',c=>c.request=3,c=>c.nativePolicy.request=4,c=>c.nativePolicy.grip=3.6,c=>c.nativePolicy.lateralAcceleration=1,c=>c.nativePolicy.brakingDeceleration=11]){
  const c=capture();mutate(c);const r=plan(c);assert.equal(r.available,false);assert.equal(r.override,false);
 }
});

test('the native geometry change does not alter the existing sampled-window planner',()=>{
 const radius=50,samples=arc(radius,60,13).map(([distance,x,y])=>({distance,xyz:[x,y,0]})),window={source:'owned-native-forward-query-v1',orderVerified:true,nativeUnitScaleVerified:true,horizontalAxes:'xy',postConstructionVerified:true,pathKind:'selected-road-centerline',physicalSpeed:10,samples};
 const r=Pacing.plan(window,{lateralAcceleration:6,brakingDeceleration:4,cornerFactor:.8,sharpMargin:15});assert(r.available&&r.override);assert.equal(r.priorityTurns,0);
 for(const c of r.samples.slice(1,-1))assert(Math.abs(c.curveSpeed-Math.sqrt(6*radius)*.8)<1e-10);
});

test('controlled native publication uses the bounded10-degree model and still holds an unaligned past apex',async()=>{
 const {world}=require('./fixtures/forward-native-world.cjs');
 for(const revision of ['8abf9be8','93cfc6e9','aa2429fb']){
  // The former >120 assertion inferred a rounded radius from100-unit arms.
  // This observed polyline has a true10-degree vertex with bounded16-unit
  // arms; it does not establish a gentle real-world tire-path radius.
  const gradual=await world(revision,{pace:2,angle:10});
  gradual.options.policy={mode:'native',cornerFactor:.95,sharpMargin:0,brakingFactor:1,reactionSeconds:.1,marginDistance:0};
  const state=gradual.capture();assert.equal(state.forwardState,'armed');assert(state.forwardRequestedTarget>0&&state.forwardRequestedTarget<120);assert.equal(gradual.target(180),state.forwardRequestedTarget);assert.equal(gradual.target(1),1);gradual.session.stop();assert.equal(gradual.target(180),180);
  const past=await world(revision,{pace:2,progress:125,exitAligned:false}),held=past.capture();assert.equal(held.forwardState,'armed');assert(held.forwardRequestedTarget>0&&held.forwardRequestedTarget<60);assert.equal(past.target(180),held.forwardRequestedTarget);past.session.stop();assert.equal(past.target(180),180);
 }
});
