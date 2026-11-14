'use strict';
// Read-only diagnostics around actual exact-AA native query/policy/publication
// and setter fixtures. Native projection/construction is a controlled boundary;
// no live racing, physical braking capability or complete route is inferred.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {world}=require('./fixtures/forward-native-world.cjs');
const Driving=require('../extension/forward-driving.js');
const G=0xd0d800,C=G+512;
const close=(actual,expected,tolerance=1e-9)=>assert(Math.abs(actual-expected)<=tolerance,`${actual} ≈ ${expected}`);
const plain=x=>JSON.parse(JSON.stringify(x));

test('actual native90° plan exports limiting bend scalars and authentic planning assumptions',async()=>{
 const f=await world('aa2429fb',{pace:1.5,angle:90,progress:50}),result=f.capture(),capture=f.session.geometry.last;
 const before=Buffer.from(new Uint8Array(f.memory.buffer,G,4096)),e=f.session.diagnosticEvidence();assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,G,4096)),before,'Evidence getter leaves native request/plan/publication memory unchanged');
 assert.equal(result.forwardState,'armed');assert.equal(result.forwardNativeApplied,false);assert.equal(result.forwardLiveVerified,false);
 assert.equal(e.forwardPlanAvailable,true);assert.equal(e.forwardPlanOverride,true);assert.equal(e.forwardPlanReasonCode,Driving.planReasonCodes['measured-native-knot-bend']);
 assert.equal(e.forwardPlanKnots,3);assert.equal(e.forwardPlanConstraints,1);assert.equal(e.forwardLimitingDistance,50);assert.equal(e.forwardLimitingAngle,90);
 // The true90-degree vertex is measured with bounded16-unit arms. Its100-unit
 // straight binding legs do not establish a rounded100-unit corner radius.
 const curvature=Math.SQRT2/16,brake=12*.75,lateral=capture.nativePolicy.lateralAcceleration;
 const curve=Math.sqrt(lateral/curvature)*.8*.85;
 const entry=Math.max(curve,Math.sqrt((brake*.6)**2+curve**2+2*brake*(50-8))-brake*.6);
 close(e.forwardLimitingCurvature,curvature);close(e.forwardLimitingCurveTarget,curve);close(e.forwardLimitingEntryTarget,entry);
 assert.equal(e.forwardPlanTarget,Math.fround(entry));assert.equal(e.forwardPlanTarget,result.forwardRequestedTarget);
 assert.equal(e.forwardPlanGrip,Math.fround(3.7));assert.equal(e.forwardPlanLateral,lateral);assert.equal(e.forwardPlanBrake,brake);
 assert.equal(Object.isFrozen(e),true);assert.throws(()=>{e.forwardPlanTarget=0;},TypeError);
 assert.equal('forwardNativeApplied' in e,false);assert.equal('forwardLiveVerified' in e,false);assert.equal('points' in e,false);assert.equal('constraints' in e,false);
 f.session.stop();
});

test('straight native plan has explicit no-constraint reason and missing target remains absent',async()=>{
 const f=await world('aa2429fb',{pace:2,angle:0}),result=f.capture(),e=f.session.diagnosticEvidence();
 assert.equal(result.forwardState,'native-fallback');assert.equal(e.forwardPlanAvailable,true);assert.equal(e.forwardPlanOverride,false);assert.equal(e.forwardPlanReasonCode,Driving.planReasonCodes['no-observed-speed-limiting-bend']);
 assert.equal(e.forwardPlanConstraints,0);assert.equal(e.forwardPlanKnots,3);
 for(const key of['forwardPlanTarget','forwardLimitingDistance','forwardLimitingAngle','forwardLimitingCurvature','forwardLimitingCurveTarget','forwardLimitingEntryTarget'])assert.equal(key in e,false,key+' is absent, not a zero limit');
 assert.equal(f.u(C+12),0);assert.equal(f.target(180),180);assert.equal(result.forwardNativeApplied,false);f.session.stop();
});

test('limiting telemetry follows the lowest entry target, not the first or sharpest native knot',async()=>{
 const f=await world('aa2429fb',{nodeCount:5,progress:50}),points=[[0,0],[100,0],[200,10],[200,60],[300,60]];
 points.forEach(([x,y],i)=>{f.f32(f.group+140+56*i,x);f.f32(f.group+144+56*i,y);});
 const result=f.capture(),e=f.session.diagnosticEvidence(),lateral=f.session.geometry.last.nativePolicy.lateralAcceleration;
 assert.equal(result.forwardState,'armed');assert.equal(e.forwardPlanKnots,5);assert.equal(e.forwardPlanConstraints,3);
 // The5.71-degree first bend is genuinely gentler than the84.29-degree middle
 // bend. Their100-unit straight separation breaks priority accumulation. All
 // three actual vertices have at least16 units of observed leg on each side.
 // Braking distances50/150/200 sum min(XY chord, route step), not knot indices.
 const angle=Math.atan2(100,10)*180/Math.PI;
 const curvature=2*Math.sin(angle*Math.PI/360)/16;
 const curve=Math.sqrt(lateral/curvature)*.8*.85;
 const entry=Math.max(curve,Math.sqrt(5.4**2+curve**2+18*(150-8))-5.4);
 const firstCurvature=2*Math.sin(Math.atan2(10,100)/2)/16;
 const firstCurve=Math.sqrt(lateral/firstCurvature)*.8;
 const firstEntry=Math.max(firstCurve,Math.sqrt(5.4**2+firstCurve**2+18*(50-8))-5.4);
 const laterCurve=Math.sqrt(lateral/(Math.SQRT2/16))*.8*.85;
 const laterEntry=Math.max(laterCurve,Math.sqrt(5.4**2+laterCurve**2+18*(200-8))-5.4);
 assert.equal(e.forwardLimitingDistance,150);close(e.forwardLimitingAngle,angle);close(e.forwardLimitingCurvature,curvature);close(e.forwardLimitingCurveTarget,curve);close(e.forwardLimitingEntryTarget,entry);
 assert(firstCurve>curve&&curve>laterCurve);assert(entry<firstEntry&&entry<laterEntry);assert.equal(e.forwardPlanTarget,Math.fround(entry));f.session.stop();
});

test('new native requests, waiting polls, context failures and Stop cannot repeat stale plan evidence',async()=>{
 const f=await world('aa2429fb');assert.equal(f.capture().forwardState,'armed');assert.equal(f.session.diagnosticEvidence().forwardPlanAvailable,true);
 assert.equal(f.session.update(f.options).forwardState,'requested');assert.deepEqual(plain(f.session.diagnosticEvidence()),{});assert.equal(f.u(C+12),0);
 assert.equal(f.session.update(f.options).forwardState,'waiting');assert.deepEqual(plain(f.session.diagnosticEvidence()),{});
 assert.equal(f.session.stop().forwardState,'off');assert.deepEqual(plain(f.session.diagnosticEvidence()),{});
 assert.equal(f.capture().forwardState,'armed');assert.equal(f.session.diagnosticEvidence().forwardPlanAvailable,true);
 assert.equal(f.session.update({...f.options,safe:false}).forwardState,'waiting');assert.deepEqual(plain(f.session.diagnosticEvidence()),{});
 assert.equal(f.target(180),180);f.session.stop();
});

test('real publisher receipt rejection preserves current computed plan and exception guard without applying cap',async()=>{
 const f=await world('aa2429fb'),publish=f.session.publisher.publish.bind(f.session.publisher);
 f.session.publisher.publish=input=>{f.f32(G+620,2);return publish(input);};
 const result=f.capture(),e=f.session.diagnosticEvidence();
 assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,42);assert.equal(result.forwardNativeApplied,false);assert.equal(result.forwardLiveVerified,false);
 assert.equal(e.forwardPlanAvailable,true);assert.equal(e.forwardPlanOverride,true);assert.equal(e.forwardPlanReasonCode,Driving.planReasonCodes['measured-native-knot-bend']);assert(e.forwardPlanTarget>0);
 assert.equal(f.u(C+12),0);assert.equal(f.target(180),180);assert.equal(result.forwardRequestedTarget,undefined);
 assert.equal(f.session.stop().forwardState,'off');assert.deepEqual(plain(f.session.diagnosticEvidence()),{});
});

test('invalid publisher report revokes actual publication while keeping evaluated plan reason and guard41',async()=>{
 const f=await world('aa2429fb'),publish=f.session.publisher.publish.bind(f.session.publisher);let published=false;
 f.session.publisher.publish=input=>{const result=publish(input);published=result.status==='armed';return{...result,cap:0};};
 const result=f.capture(),e=f.session.diagnosticEvidence();assert.equal(published,true,'Real production publisher executed');
 assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,41);assert.equal(e.forwardPlanReasonCode,Driving.planReasonCodes['measured-native-knot-bend']);assert.equal(e.forwardPlanOverride,true);
 assert.equal(f.u(C+12),0);assert.equal(f.target(180),180);assert.equal(result.forwardNativeApplied,false);assert.equal(result.forwardLiveVerified,false);f.session.stop();
});

test('capture rejection before planning reports current guard and has no prior numeric plan fields',async()=>{
 const f=await world('aa2429fb');assert.equal(f.capture().forwardState,'armed');f.session.stop();
 f.session.geometry.poll=()=>({status:'unavailable',forwardGuardCode:117});assert.equal(f.session.update(f.options).forwardState,'requested');const result=f.session.update(f.options);
 assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,117);assert.deepEqual(plain(f.session.diagnosticEvidence()),{});assert.equal(f.target(180),180);f.session.stop();
});

test('repeated diagnostic reads preserve actual.7 publication bytes and native setter behavior',async()=>{
 for(const options of[{pace:2,angle:0},{pace:1.3,angle:15},{pace:2,angle:75},{pace:1.5,angle:90},{pace:1.3,angle:90,progress:125,exitAligned:false},{pace:1.3,angle:90,progress:125,exitAligned:true}]){
  const observed=await world('aa2429fb',options),control=await world('aa2429fb',options);
  const controlResult=control.capture(),observedResult=observed.capture(),command=Buffer.from(new Uint8Array(observed.memory.buffer,C,128));
  // Comparing old.4 targets would conceal the intentional bounded-arm geometry
  // correction. Identical current captures isolate observation as the variable.
  for(let i=0;i<5;i++)assert.equal(Object.isFrozen(observed.session.diagnosticEvidence()),true);
  assert.deepEqual(plain(observedResult),plain(controlResult),JSON.stringify(options));
  assert.deepEqual(Buffer.from(new Uint8Array(observed.memory.buffer,C,128)),command,'Evidence leaves published command unchanged');
  assert.deepEqual(command,Buffer.from(new Uint8Array(control.memory.buffer,C,128)),'Actual published command bytes '+JSON.stringify(options));
  for(const target of[180,1,0,-1])assert.equal(observed.target(target),control.target(target),'Actual native setter '+JSON.stringify({...options,target}));
  observed.session.stop();control.session.stop();assert.equal(observed.target(180),control.target(180));
 }
});
