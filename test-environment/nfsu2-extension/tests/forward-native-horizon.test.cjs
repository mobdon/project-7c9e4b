'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {world}=require('./fixtures/forward-native-world.cjs'),Pacing=require('../extension/forward-pacing.js'),Registry=require('../extension/forward-native-config.js');
test('512 native policy sees a later450-unit bend even when48-point local preview stops earlier',async()=>{
 const f=await world('8abf9be8',{nodeCount:40,nodeGap:25,cornerAt:450,progress:0,pace:2}),s=f.capture(),c=f.session.geometry.last,w=Pacing.windowFromCapture(c),p=Pacing.planNative(c,c.nativePolicy,{pace:2,cornerFactor:.8,sharpMargin:15,brakingFactor:.75,reactionSeconds:.6,marginDistance:8});
 assert.equal(s.forwardState,'armed');assert.equal(c.nodeCount,40);assert(c.points.length<=24);assert.equal(s.forwardHorizon,512);assert.equal(c.end-c.progress,512);assert.equal(w.samples.length,48);assert(w.samples.at(-1).distance<450);assert.equal(p.horizonDistance,512);assert(p.constraints.some(x=>x.distanceNative>184));assert.equal(f.target(180),s.forwardRequestedTarget);assert.equal(f.target(0),0);assert.equal(f.target(1),1);f.session.stop();
});
test('actual source ending200 remains200; exhausting24 raw anchors clips end to checked230 rather than cached390',async()=>{
 const f=await world('8abf9be8',{nodeCount:3,nodeGap:100,cornerAt:10000,progress:0,pace:2}),s=f.capture();assert.equal(s.forwardState,'native-fallback');assert.equal(s.forwardHorizon,200);assert.equal(f.target(180),180);f.session.stop();
 const g=await world('8abf9be8',{nodeCount:40,nodeGap:10,cornerAt:10000,progress:0,pace:2}),r=g.capture(),c=g.session.geometry.last;assert.equal(r.forwardState,'native-fallback');assert.equal(c.nodeCount,40);assert.equal(c.points.length,24);assert.equal(c.end,c.points.at(-1).distance);assert.equal(c.end,230);assert.equal(c.knownHorizon,230);assert.equal(g.target(180),180);g.session.stop();
});
test('older exact profiles retain184 capture and validator bounds without policy publication',async()=>{
 for(const revision of ['3bdd9959','d2fa4f4c','cd5b74d5']){
  const f=await world(revision,{nodeCount:40,nodeGap:25,cornerAt:450,progress:0,pace:2});f.options.applyTarget='native-policy';f.options.policy={mode:'native'};const s=f.capture(),c=f.session.geometry.last;assert.equal(s.forwardState,'observed');assert.equal(c.end-c.progress,184);assert.equal(f.profile.runtime.maxHorizon,184);assert.equal(f.target(180),180);assert.equal(Pacing.windowFromCapture({...c,end:512}).available,false);f.session.stop();
 }
});
test('longer checked route retains native use-time lease, grade and source-order guards',async()=>{
 for(const change of [f=>f.u(0x86518c,801),f=>f.view.setUint8(f.ride+0x14,1),f=>f.u(f.driver+4,f.car+4),f=>f.u(0xd0d100+84,0)]){
  const f=await world('8abf9be8',{nodeCount:40,nodeGap:25,cornerAt:450,progress:0,pace:2,network:[[0x850078,8]],permission:1});assert.equal(f.capture().forwardState,'armed');change(f);assert.equal(f.target(180),180);f.session.stop();
 }
 const f=await world('8abf9be8',{nodeCount:40,nodeGap:25,cornerAt:450,progress:0,pace:2});f.f32(f.nodeBase+20*128+84,0);assert.throws(()=>f.capture());assert.equal(f.target(180),180);f.session.stop();
});
