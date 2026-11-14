'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,Pacing}=require('./fixtures/forward-corner-world.cjs');
const evidence=[];
const record=(label,f,result)=>{const plan=f.plan();evidence.push({label,moduleHash:f.profile.moduleHash,state:result.forwardState,rawPoints:f.session.geometry.last.points.length,cornerRecords:f.session.geometry.last.cornerCount,ownerSequence:f.u(0xd0d100+4),horizon:plan.horizonDistance,priority:plan.priorityTurns,override:plan.override,targetCap:plan.targetCap,reason:plan.reason,native180:f.target(180)});};

test('actual native straight windows retain native targets without an endpoint stop or fixed ceiling',async()=>{
 for(const [scale,progress]of [[1,0],[1,100],[1,184],[.5,184],[.5001,184]]){
  const f=await fixture({kind:'straight',scale,progress});
  let result;for(let i=0;i<4;i++){const s=result=f.capture(),p=f.plan();assert.equal(s.forwardState,'native-fallback');assert.equal(p.override,false);assert.equal(p.targetCap,null);assert.equal(p.reason,'no-observed-corner-constraint');assert(p.samples.every(s=>s.entrySpeed===null&&s.curveSpeed===null));assert.equal(f.target(180),180);assert.equal(f.u(f.abi.base+512+12),0);assert.equal(f.u(0xd0d100+4),2);}
  record('straight-'+scale+'-'+progress,f,result);f.session.stop();
 }
});

test('measured sharp and gradual native corners retain positive evidence-based speed constraints',async()=>{
 for(const kind of ['dense','gradual']){
  const f=await fixture({kind}),s=f.capture(),p=f.plan();assert.equal(s.forwardState,'armed');assert.equal(p.override,true);assert(p.targetCap>0&&p.targetCap<180);assert.equal(f.target(180),p.targetCap);assert.equal(p.reason,'measured-corner-constraint');assert(p.priorityTurns>=1);assert.equal(f.session.geometry.last.cornerCount,0);record(kind,f,s);f.session.stop();
 }
});

test('insufficient observed reaction horizon with an actual bend falls back without inventing zero',async()=>{
 const f=await fixture({kind:'small-bend'}),s=f.capture(),p=f.plan();assert.equal(p.priorityTurns,1);assert.equal(p.horizonDistance,8);assert(p.samples.some(s=>s.curveSpeed>0));assert.equal(p.reason,'insufficient-observed-reaction-horizon');assert.equal(p.override,false);assert.equal(p.targetCap,null);assert.equal(s.forwardState,'native-fallback');assert.equal(f.target(180),180);record('short-real-bend',f,s);
});

test('continuation after a passed corner is native fallback and an excerpt endpoint is not a new obstacle',async()=>{
 const f=await fixture({kind:'corner',progress:150}),s=f.capture(),p=f.plan();assert.equal(s.forwardState,'native-fallback');assert.equal(p.priorityTurns,0);assert.equal(p.override,false);assert.equal(f.target(180),180);record('passed-corner',f,s);
 const g=await fixture({kind:'dense'});g.capture();const window=Pacing.windowFromCapture(g.session.geometry.last),short={...window,samples:window.samples.filter(s=>s.distance<=150)},a=Pacing.plan(short,g.options.policy),b=Pacing.plan(window,g.options.policy);
 assert.equal(a.override,true);assert.equal(b.override,true);assert.equal(a.targetCap,b.targetCap);assert.equal(a.priorityTurns,b.priorityTurns);g.session.stop();
});

test('native zero/negative/nonfinite targets remain native and Stop plus exact lease expiry are preserved',async()=>{
 const f=await fixture(),s=f.capture();assert.equal(s.forwardState,'armed');
 for(const value of [0,-0,-1,NaN,Infinity,-Infinity])assert(Object.is(f.target(value),Math.fround(value)));
 f.u(0x86518c,800);assert.equal(f.target(180),s.forwardRequestedTarget);f.u(0x86518c,801);assert.equal(f.target(180),180);f.session.stop();assert.equal(f.target(180),180);
});

test('publisher binds current speed and revokes old commands before rejecting altered observations',async()=>{
 const f=await fixture();assert.equal(f.capture().forwardState,'armed');const original=f.session.geometry.last;
 assert.throws(()=>f.session.publisher.publish({capture:{...original,physical:{...original.physical,speed:0}},policy:f.options.policy}),/acknowledged native points/);assert.equal(f.target(180),180);assert.equal(f.u(f.abi.base+512+12),0);f.session.stop();
});

test('direct publisher treats a valid no-override plan as native fallback rather than null or zero target',async()=>{
 const f=await fixture({kind:'straight'});assert.equal(f.capture().forwardState,'native-fallback');const result=f.session.publisher.publish({capture:f.session.geometry.last,policy:f.options.policy});assert.equal(result.status,'native-fallback');assert.equal(f.u(f.abi.base+512+12),0);assert.equal(f.target(180),180);f.session.stop();
});

test('capture-only mode immediately revokes a previous cap and keeps fresh geometry without publication',async()=>{
 const f=await fixture();assert.equal(f.capture().forwardState,'armed');assert(f.target(180)<180);let calls=0;f.session.publisher.publish=()=>{calls++;throw Error('Capture-only must never publish');};
 f.options.applyTarget=false;assert.equal(f.session.update(f.options).forwardState,'requested');assert.equal(f.u(f.abi.base+512+12),0);assert.equal(f.target(180),180);
 let s=f.complete();for(let i=0;i<4;i++){assert.equal(s.forwardState,'observed');assert.equal(s.forwardCaptured,true);assert.equal(s.forwardRequestedTarget,undefined);assert.equal(s.forwardLeaseTicks,0);assert.equal(s.forwardSamples,37);assert.equal(s.forwardPriorityTurns,1);assert.equal(f.target(180),180);if(i<3)s=f.capture();}
 assert.equal(calls,0);record('capture-only',f,s);f.session.stop();
});

test('all four exact profiles support read-only captures while default API still permits a positive corner override',async()=>{
 for(const revision of ['3bdd9959','d2fa4f4c','cd5b74d5','8abf9be8']){
  const f=await fixture({revision,applyTarget:false}),s=f.capture();assert.equal(s.forwardState,'observed');assert.equal(f.target(180),180);assert.equal(f.u(f.abi.base+512+12),0);f.session.stop();
 }
 const f=await fixture();assert.equal(f.capture().forwardState,'armed');assert(f.target(180)>0&&f.target(180)<180);f.session.stop();
});

test('missing physical speed cannot authorize an optional cap and explicit zero is not an invented hazard schema',async()=>{
 const f=await fixture();f.capture();const window=Pacing.windowFromCapture(f.session.geometry.last);for(const physicalSpeed of [undefined,null,NaN,Infinity,-1,500.01])assert.equal(Pacing.plan({...window,physicalSpeed},f.options.policy).available,false);
 const straight=await fixture({kind:'straight'});straight.capture();const p=Pacing.plan({...Pacing.windowFromCapture(straight.session.geometry.last),hazard:{stop:true,target:0}},straight.options.policy);assert.equal(p.override,false);assert.equal(p.targetCap,null);assert.equal(straight.target(0),0);f.session.stop();straight.session.stop();
});
