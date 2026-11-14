'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {windowFromCapture,plan}=require('../extension/forward-pacing.js');
const pin='ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c';
function capture(points,progress=0,end=points.at(-1).distance){return{status:'captured',moduleHash:pin,request:2,source:'owned-native-forward-query-v1',sampling:'native-node-anchors-linear-v1',postConstructionVerified:true,forwardOrderVerified:true,horizontalAxes:'xy',controlWord:0x37f,nativeUnitScaleVerified:true,physical:{speed:10},progress,end,points};}
const line=()=>[0,30,60,90].map(distance=>({distance,xyz:[distance,0,0]}));

test('nonzero projection uses native anchor interpolation then zero-based forward distances',()=>{
 const r=windowFromCapture(capture(line(),25,80));assert(r.available);assert.equal(r.samples[0].distance,0);assert.deepEqual(r.samples[0].xyz,[25,0,0]);
 assert.equal(r.samples.at(-1).distance,55);assert.deepEqual(r.samples.at(-1).xyz,[80,0,0]);
 assert(r.samples.some(p=>p.distance===5));assert(r.samples.some(p=>p.distance===35));
 for(let i=1;i<r.samples.length;i++)assert(r.samples[i].distance-r.samples[i-1].distance<=8);
});

test('resampling retains every native corner boundary before its budget runs out',()=>{
 const points=[{distance:0,xyz:[0,0,0]},{distance:20,xyz:[20,0,0]},{distance:40,xyz:[40,0,0]},{distance:60,xyz:[40,20,0]},{distance:80,xyz:[40,40,0]}];
 const r=windowFromCapture(capture(points,5,80));assert(r.available);assert(r.samples.some(p=>p.distance===35&&p.xyz[0]===40&&p.xyz[1]===0));
 const advice=plan(r,{lateralAcceleration:6,brakingDeceleration:4});assert(advice.available);assert.equal(advice.priorityTurns,1);
 assert.equal(r.resolutionVerified,false);assert.equal(r.wholeRaceChecked,false);
});

test('budget truncation reports only the samples actually constructed',()=>{
 const r=windowFromCapture(capture([0,80,160].map(distance=>({distance,xyz:[distance,0,0]}))),{maxSamples:5});
 assert(r.available);assert.equal(r.samples.length,5);assert.equal(r.samples.at(-1).distance,32);
 const advice=plan(r,{lateralAcceleration:6,brakingDeceleration:4});assert(advice.available);assert.equal(advice.horizonDistance,32);
});

test('geometry normalization cannot invent missing unit proof or permit extrapolation',()=>{
 const c=capture(line(),25,80),r=windowFromCapture({...c,nativeUnitScaleVerified:false});assert(r.available);assert.equal(r.nativeUnitScaleVerified,false);
 assert.equal(plan(r,{lateralAcceleration:6,brakingDeceleration:4}).available,false);
 for(const change of [{progress:-1},{end:91},{end:25},{end:500},{controlWord:0x7f},{postConstructionVerified:false},{forwardOrderVerified:false},{sampling:'arbitrary-node-query'},{moduleHash:'0'.repeat(64)}])assert.equal(windowFromCapture({...c,...change}).available,false);
});

test('malformed raw anchors and invalid resampling budgets fail without modifying the capture',()=>{
 const c=capture(line()),before=structuredClone(c);
 for(const mutate of [x=>x.points[1].distance=0,x=>x.points[1].xyz[0]=NaN,x=>x.points[1].distance=30.00000001,x=>x.points.length=1]){const bad=structuredClone(c);mutate(bad);assert.equal(windowFromCapture(bad).available,false);}
 for(const options of [{spacing:0},{spacing:21},{maxSamples:2},{maxSamples:49}])assert.equal(windowFromCapture(c,options).available,false);
 assert.deepEqual(c,before);
});

test('two contiguous native anchors support a bounded tail without inventing a knot or extrapolating',()=>{
 const c=capture([{distance:100,xyz:[20,0,0]},{distance:140,xyz:[40,0,0]}],108,140),before=structuredClone(c);
 const w=windowFromCapture(c),r=plan(w,{lateralAcceleration:6,brakingDeceleration:4});assert(w.available&&r.available);
 assert.equal(w.samples.length,5);assert.deepEqual(w.samples[0],{distance:0,xyz:[24,0,0]});assert.deepEqual(w.samples.at(-1),{distance:32,xyz:[40,0,0]});
 assert.equal(r.routeHorizonDistance,32);assert.equal(r.pathHorizonDistance,16);assert.equal(r.horizonDistance,16);
 for(const change of [{progress:99},{end:141},{progress:125}])assert.equal(windowFromCapture({...c,...change}).available,false);
 assert.deepEqual(c,before);
});

test('native knot identity and route coordinates survive the shorter physical braking conversion',()=>{
 const c=capture([{distance:0,xyz:[0,0,0]},{distance:40,xyz:[20,0,0]},{distance:80,xyz:[40,0,0]},{distance:120,xyz:[40,20,0]},{distance:160,xyz:[40,40,0]}],10,160);
 const w=windowFromCapture(c),before=structuredClone(w),r=plan(w,{lateralAcceleration:6,brakingDeceleration:4});assert(w.available&&r.available);assert.equal(r.priorityTurns,1);
 const knot=r.samples.find(p=>p.routeDistance===70);assert(knot);assert.equal(knot.distance,70);assert.equal(knot.pathDistance,35);assert.equal(knot.brakingDistance,35);
 assert.equal(r.routeHorizonDistance,150);assert.equal(r.pathHorizonDistance,75);assert.equal(r.horizonDistance,75);
 assert.deepEqual(w,before);assert(w.samples.some(p=>p.distance===70&&p.xyz[0]===40&&p.xyz[1]===0));
});

test('the native float32 sixteen-unit tail boundary remains bounded after JavaScript subtraction',()=>{
 const progress=Math.fround(1e-7),c=capture([{distance:0,xyz:[0,0,0]},{distance:16,xyz:[16,0,0]}],progress,16);
 assert(c.end-c.progress<16);assert.equal(Math.fround(c.end-c.progress),16);
 const w=windowFromCapture(c),r=plan(w,{lateralAcceleration:6,brakingDeceleration:4});assert(w.available&&r.available);
 assert.equal(w.samples.length,3);assert.equal(w.samples.at(-1).xyz[0],16);assert(r.horizonDistance<=16-progress);
});
