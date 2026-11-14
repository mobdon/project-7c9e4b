'use strict';
// Authored planning and controlled native query/publication boundaries only.
// The native .8 publisher and use-time fence require their independent proofs.
const {test,afterEach}=require('node:test'),assert=require('node:assert/strict');
const Pacing=require('../extension/forward-pacing.js'),Geometry=require('../extension/forward-geometry.js');
const {world}=require('./fixtures/forward-native-world.cjs');
const HASH='a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8',CAR=0x220000,B=0xd0d800,C=B+512;
const OPTIONS={pace:1.5,cornerFactor:.8,sharpMargin:15,brakingFactor:.75,reactionSeconds:.6,marginDistance:8};
const SPARSE=[[0,0,0],[100,100,0],[200,100,100]],INSERTED=[[0,0,0],[90,90,0],[100,100,0],[110,100,10],[200,100,100]];
const originalProtocol=globalThis.__NFSU2_PACED_CATCHUP__;
afterEach(()=>{if(originalProtocol===undefined)delete globalThis.__NFSU2_PACED_CATCHUP__;else globalThis.__NFSU2_PACED_CATCHUP__=originalProtocol;});
function rawGain(pace=1.5,{source=Math.fround(1.485),strength=1,commandGeneration=7,publication=17,car=CAR,ownerSequence=2,physicsKind=1}={}){
 const percent=Math.round(pace*100),p=Math.fround(percent/100),strengthCode=(strength-1)*4,powerFactor=Math.fround(Math.fround(source*p)*strength);
 const tireFactor=Math.fround(powerFactor*p);
 return{command:((commandGeneration<<16)|(strengthCode<<10)|0x300|percent)>>>0,percent,strength,strengthCode,sourceFactor:source,powerFactor,tireFactor,relativePowerGain:Math.fround(p*strength),relativeTireGain:Math.fround(Math.fround(p*strength)*p),car,ownerSequence,publisher:1,reason:1,publication,physicsKind,evidenceKind:physicsKind===1?'four-tires':'combined-grip',wheelHits:physicsKind===1?4:0,gripHits:physicsKind===1?0:1,combinedGripFactor:physicsKind===1?null:Math.fround(tireFactor*.975),outputsVerified:true};
}
function protocol(raw=rawGain()){
 const state={raw,calls:[],dropAt:Infinity};
 globalThis.__NFSU2_PACED_CATCHUP__={supports:hash=>hash===HASH,readGain(memory,input){state.calls.push(input);return state.calls.length>=state.dropAt?null:state.raw;}};
 return state;
}
function capture({pace=1.5,progress=95,tuples=SPARSE,gain=true}={}){
 const nativePolicy={available:true,source:'exact-native-grade-policy-v1',moduleHash:HASH,request:2,gravity:Math.fround(9.8),straightCap:60,grip:Math.fround(3.7),brakingDeceleration:12};nativePolicy.lateralAcceleration=nativePolicy.grip*nativePolicy.gravity;
 const c={status:'captured',moduleHash:HASH,source:'owned-native-forward-query-v1',sampling:'native-node-anchors-linear-v1',request:2,ownerSequence:2,identity:{car:CAR},pace,postConstructionVerified:true,forwardOrderVerified:true,nativeUnitScaleVerified:true,horizontalAxes:'xy',controlWord:0x37f,progress,end:tuples.at(-1)[0],physical:{speed:60,heading:[1,0]},nativePolicy,points:tuples.map(([distance,x,y])=>({distance,xyz:[x,y,0]}))};
 c.nativeGain=gain?Geometry.gainFromMemory({}, {moduleHash:HASH,request:2,ownerSequence:2,car:CAR,pace}):null;return c;
}
const plan=(c,options={})=>Pacing.planNative(c,c.nativePolicy,{...OPTIONS,pace:c.pace,...options});

test('verified relative P-squared times S tire gain raises apex by P sqrt(S), preserving geometric invariance',()=>{
 const base=plan(capture({pace:1,gain:false}));
 for(const pace of [1,1.1,1.25,1.5,2])for(const strength of [1,2,10]){
  protocol(rawGain(pace,{strength}));const c=capture({pace}),r=plan(c),dense=plan(capture({pace,tuples:INSERTED})),p=Math.fround(pace),ratio=p*Math.sqrt(strength);
  assert(r.available&&r.override);assert.equal(r.targetCap,Math.fround(base.constraints[0].curveSpeed*ratio));assert.equal(r.targetCap,dense.targetCap);assert.equal(r.constraints[0].curvature,dense.constraints[0].curvature);assert.equal(r.assumptions.paceGain,p);assert.equal(r.assumptions.strength,strength);assert.equal(r.assumptions.strengthCode,(strength-1)*4);assert.equal(r.assumptions.curveGain,ratio);assert.equal(r.assumptions.relativeTireGain,p*p*strength);assert.equal(r.assumptions.brakingDeceleration,9);assert.equal(r.assumptions.gainApplied,ratio>1);
 }
});

test('verified simplified-physics grip reaches the planner without inventing four wheel publications',()=>{
 const base=plan(capture({pace:1,gain:false}));
 for(const pace of [1,1.25,2])for(const strength of [1,2,10]){
  const raw=rawGain(pace,{strength,physicsKind:3});protocol(raw);const c=capture({pace}),r=plan(c);
  assert.equal(c.nativeGain.physicsKind,3);assert.equal(c.nativeGain.evidenceKind,'combined-grip');
  assert.equal(c.nativeGain.wheelHits,0);assert.equal(c.nativeGain.gripHits,1);assert.equal(c.nativeGain.combinedGripFactor,raw.combinedGripFactor);
  assert.equal(r.targetCap,Math.fround(base.constraints[0].curveSpeed*Math.fround(pace)*Math.sqrt(strength)));
  for(const change of [g=>g.wheelHits=4,g=>g.gripHits=0,g=>g.physicsKind=1,g=>g.evidenceKind='four-tires',g=>g.combinedGripFactor=NaN,g=>g.combinedGripFactor=0]){
   const bad={...c.nativeGain};change(bad);assert.equal(plan({...c,nativeGain:bad}).assumptions.gainApplied,false);
  }
 }
});

test('approach envelope recomputes from the raised corner goal with unchanged braking instead of multiplying the old cap',()=>{
 for(const strength of [1,2,10]){
  protocol(rawGain(1.5,{strength}));const c=capture({progress:0}),r=plan(c),base=plan({...c,nativeGain:null}),ratio=Math.fround(1.5)*Math.sqrt(strength),curve=base.constraints[0].curveSpeed*ratio,a=9,d=92,tau=.6;
  const expected=Math.max(curve,Math.sqrt((a*tau)**2+curve**2+2*a*d)-a*tau);
  assert.equal(r.targetCap,Math.fround(expected));assert(r.targetCap<base.targetCap*ratio);assert.equal(r.assumptions.brakingDeceleration,base.assumptions.brakingDeceleration);assert.equal(r.assumptions.reactionSeconds,tau);assert.equal(r.assumptions.marginDistance,8);
 }
});

test('cap divided by P sqrt(S) conservatively bounds the base envelope across strengths, turns and approach distances',()=>{
 for(const pace of [1,1.1,1.25,1.5,2])for(const strength of [1,2,10])for(const degrees of [5,15,45,75,90,120,170])for(const distance of [0,5,16,40,100,300]){
  protocol(rawGain(pace,{strength}));const angle=degrees*Math.PI/180,tuples=[[0,0,0],[400,400,0],[500,400+100*Math.cos(angle),100*Math.sin(angle)]],c=capture({pace,progress:400-distance,tuples}),r=plan(c),base=plan({...c,nativeGain:null}),ratio=Math.fround(pace)*Math.sqrt(strength);
  assert(r.available&&base.override);assert(r.constraints[0].entrySpeed/ratio<=base.constraints[0].entrySpeed+1e-9);if(r.override)assert(r.targetCap/ratio<=base.targetCap+1e-5,'Float32 publication remains within rounding tolerance');else assert(r.constraints[0].entrySpeed>150,'Targets outside the bounded publisher retain native fallback');
 }
});

test('a missing, forged or differently bound gain receipt cannot raise the base policy target',()=>{
 protocol(rawGain(1.5,{strength:2}));const c=capture(),base=plan({...c,nativeGain:null}),mutations=[g=>g.request=4,g=>g.ownerSequence=4,g=>g.moduleHash='unknown',g=>g.car+=4,g=>g.percent=125,g=>g.pace=1.25,g=>g.strength=10,g=>g.strengthCode=36,g=>g.strengthCode=37,g=>g.relativePowerGain+=1,g=>g.relativeTireGain=3,g=>g.curveGain+=1,g=>g.outputsVerified=false,g=>g.wheelHits=3,g=>g.command^=1,g=>g.command^=1024,g=>g.publication=-1,g=>g.nativeFactor=NaN,g=>g.powerFactor+=1,g=>g.tireFactor+=1];
 for(const mutate of mutations){const nativeGain={...c.nativeGain};mutate(nativeGain);const r=plan({...c,nativeGain});assert.equal(r.targetCap,base.targetCap);assert.equal(r.assumptions.gainApplied,false);}
});

test('the native receipt reader rejects malformed strength metadata and noncanonical physical arithmetic',()=>{
 const mutations=[g=>g.ownerSequence=4,g=>g.strength=1.1,g=>g.strengthCode=37,g=>g.strength=10,g=>g.command^=1024,g=>g.powerFactor+=1,g=>g.tireFactor+=1,g=>g.relativePowerGain+=1,g=>g.relativeTireGain+=1,g=>g.outputsVerified=false];
 for(const mutate of mutations){const raw=rawGain(1.5,{strength:2});mutate(raw);protocol(raw);assert.equal(capture().nativeGain,null);}
});

test('native source M and publication count do not multiply the grade planning reference again',()=>{
 for(const strength of [1,2,10]){const state=protocol(rawGain(1.5,{strength}));const first=plan(capture());state.raw=rawGain(1.5,{source:Math.fround(1.2),strength,publication:18});const second=plan(capture());assert.equal(first.targetCap,second.targetCap);assert.equal(first.assumptions.lateralAcceleration,second.assumptions.lateralAcceleration);assert.equal(first.assumptions.paceGain,1.5);assert.equal(first.assumptions.strength,strength);}
});

test('actual query capture and strict publisher bind P and S and publish strength-coded native fence flags',async()=>{
 for(const strength of [1,2,10]){
  const state=protocol(rawGain(1.5,{strength})),f=await world('aa2429fb',{pace:1.5}),s=f.capture(),c=f.session.geometry.last;
  assert.equal(s.forwardState,'armed');assert(Object.isFrozen(c.nativeGain));assert.equal(c.nativeGain.request,c.request);assert.equal(c.nativeGain.ownerSequence,c.ownerSequence);assert.equal(c.nativeGain.car,c.identity.car);assert.equal(f.u(C+96),63|(((strength-1)*4)<<6));assert.equal(f.u(C+112),150);
  assert(state.calls.length>=2);for(const input of state.calls){assert.equal(input.moduleHash,HASH);assert.equal(input.currentCar,f.car);assert.equal(input.pace,1.5);assert.equal(input.ownerSequence,c.ownerSequence);}
  const curve=Math.sqrt(c.nativePolicy.lateralAcceleration/(Math.SQRT2/16))*.8*.85*1.5*Math.sqrt(strength),expected=Math.max(curve,Math.sqrt(5.4**2+curve**2+18*42)-5.4);assert.equal(f.f32(C+88),Math.fround(expected));f.session.stop();assert.equal(f.u(C+12),0);
 }
});

test('physical gain withdrawal between capture and publication denies the raised command',async()=>{
 const state=protocol();state.dropAt=2;const f=await world('aa2429fb',{pace:1.5}),s=f.capture();assert.equal(state.calls.length,2);assert.equal(f.session.diagnosticEvidence().forwardPlanAvailable,true);assert.equal(s.forwardState,'unknown');assert.equal(s.forwardGuardCode,42);assert.equal(f.u(C+12),0);assert.equal(s.forwardRequestedTarget,undefined);f.session.stop();
});

test('a gain arriving after an unboosted capture cannot upgrade that publication retroactively',async()=>{
 const state=protocol(),raw=state.raw;globalThis.__NFSU2_PACED_CATCHUP__.readGain=(memory,input)=>{state.calls.push(input);return state.calls.length===1?null:raw;};
 const f=await world('aa2429fb',{pace:1.5}),s=f.capture();assert.equal(s.forwardState,'armed');assert.equal(f.session.geometry.last.nativeGain,null);assert.equal(f.u(C+96),31);assert.equal(state.calls.length,1);assert.equal(s.forwardRequestedTarget,plan(f.session.geometry.last).targetCap);f.session.stop();
});

test('readiness and gain-command changes revoke a transaction while publication advances alone do not churn it',async()=>{
 const state=protocol(),f=await world('aa2429fb',{pace:1.5});assert.equal(f.capture().forwardState,'armed');
 const gain={...state.raw,active:true,outputsVerified:true,wheelHits:4,appliedPercent:150,appliedStrength:1,command:state.raw.command,publication:17};
 assert.equal(f.session.update({...f.options,gain}).forwardState,'requested');const request=f.u(B+8);assert.equal(f.u(C+12),0);
 assert.equal(f.session.update({...f.options,gain:{...gain,publication:18}}).forwardState,'waiting');assert.equal(f.u(B+8),request);
 assert.equal(f.session.update({...f.options,gain:{...gain,active:false}}).forwardState,'requested');assert.notEqual(f.u(B+8),request);f.session.stop();
});

test('a strength change between capture and publication rejects the old gain even at the same P',async()=>{
 const state=protocol(rawGain(1.5,{strength:2})),f=await world('aa2429fb',{pace:1.5});
 const original=globalThis.__NFSU2_PACED_CATCHUP__.readGain;globalThis.__NFSU2_PACED_CATCHUP__.readGain=(memory,input)=>{if(state.calls.length)state.raw=rawGain(1.5,{strength:10});return original(memory,input);};
 const s=f.capture();assert.equal(s.forwardState,'unknown');assert.equal(s.forwardGuardCode,42);assert.equal(f.u(C+12),0);f.session.stop();
});

test('strength command transitions revoke a transaction while forged UI strength does not authorize gain',async()=>{
 const state=protocol(),f=await world('aa2429fb',{pace:1.5});assert.equal(f.capture().forwardState,'armed');
 const gain={...state.raw,active:true,outputsVerified:true,wheelHits:4,appliedPercent:150,appliedStrength:1,command:state.raw.command};
 assert.equal(f.session.update({...f.options,gain}).forwardState,'requested');const first=f.u(B+8);
 state.raw=rawGain(1.5,{strength:10});const boosted={...gain,appliedStrength:10,command:state.raw.command};assert.equal(f.session.update({...f.options,gain:boosted}).forwardState,'requested');assert.notEqual(f.u(B+8),first);const second=f.u(B+8);
 assert.equal(f.session.update({...f.options,gain:{...boosted,appliedStrength:2}}).forwardState,'requested');assert.notEqual(f.u(B+8),second);assert.equal(f.u(C+12),0);f.session.stop();
});

test('actual native physical publication feeds the real gain API and planning receipt across P and S',async()=>{
 const Product=require('../native/paced-catchup.js'),{fixture,physics,B:AI}=require('../native/paced-fixture.cjs');globalThis.__NFSU2_PACED_CATCHUP__=Product;
 for(const revision of ['aa2429fb','15e5958f','943ee537']){
  const f=await fixture(revision),out=physics(f),moduleHash=f.profile.moduleHash,M=Math.fround(1.485);
  for(const pace of [1,1.25,2])for(const strength of [1,2,10]){
   const percent=Math.round(pace*100),p=Math.fround(pace),E=Math.fround(Math.fround(M*p)*strength),T=Math.fround(E*p);
   f.f32(f.driver+0x770,M);f.f32(f.car+0x468,M);f.u(AI+60,percent);f.u(AI+76,percent);f.u(AI+80,1);Product.command(f.memory,{enabled:true,percent,strength,stackingReady:true,forceGeneration:true});assert.equal(f.publish(M),E);
   const gain=Geometry.gainFromMemory(f.memory,{moduleHash,request:2,ownerSequence:2,car:f.car,pace});assert(gain,revision+JSON.stringify({pace,strength}));assert.equal(gain.powerFactor,E);assert.equal(gain.tireFactor,T);assert.equal(gain.strengthCode,(strength-1)*4);assert.equal(gain.relativeTireGain,p*p*strength);assert.equal(gain.curveGain,p*Math.sqrt(strength));
   const c=capture({pace,gain:false});c.moduleHash=moduleHash;c.nativePolicy.moduleHash=moduleHash;c.nativeGain=gain;const r=plan(c),base=plan({...c,nativeGain:null});assert.equal(r.targetCap,Math.fround(base.constraints[0].curveSpeed*p*Math.sqrt(strength)));assert.equal(r.assumptions.lateralAcceleration,base.assumptions.lateralAcceleration);
   f.f32(out.wheels[0]+0x184,1);assert.equal(Geometry.gainFromMemory(f.memory,{moduleHash,request:2,ownerSequence:2,car:f.car,pace}),null);f.publish(M);
   assert.equal(Geometry.gainFromMemory(f.memory,{moduleHash,request:2,ownerSequence:4,car:f.car,pace}),null);assert.equal(Geometry.gainFromMemory(f.memory,{moduleHash:'unknown',request:2,ownerSequence:2,car:f.car,pace}),null);
   f.u(AI+4,4);assert.equal(Geometry.gainFromMemory(f.memory,{moduleHash,request:2,ownerSequence:4,car:f.car,pace}),null,'A new AI owner cannot inherit the old physical publication at the same P and S');f.u(AI+4,2);
  }
  Product.command(f.memory,{enabled:false});assert.equal(Geometry.gainFromMemory(f.memory,{moduleHash,request:2,ownerSequence:2,car:f.car,pace:2}),null);f.session.stop();
 }
});
