'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fixture,B}=require('./calculated-pair-fixture.cjs'),RB=require('./native-rubberband.js');
test('native calculated setup admits unity policy and keeps actual target, physical publication and final corner cap aligned',async()=>{
 const modules=[];
 for(const revision of['aa2429fb','15e5958f','943ee537']){
  const f=await fixture(revision),M=Math.fround(1.485),out={chassis:0x510000,aux:0x520000,power:0x530000,carrier:0x540000,wheels:[0x550000,0x560000,0x570000,0x580000]};
  for(const[p,n]of[[f.car,0xa00],[f.controller,0x240],[0x7a25b0,0x80],[out.chassis,0x20c],[out.aux,0x94],[out.power,16],[out.carrier,0x1c],...out.wheels.map(p=>[p,0x18c])])f.commit(p,n);
  f.commit(f.cpu,344);
  for(const[p,v]of[[f.car+0x28,1],[f.controller,0x7a25b0],[0x7a25b0+56,0x4054a0],[f.controller+0x5c,f.car],[f.controller+0x20,out.chassis],[f.controller+0x48,out.aux],[f.controller+0x50,out.power],[f.car+0x3c,out.carrier],[0x89e7f8,1],[672502872,0],[0x7fc0a0,1]])f.u(p,v);
  out.wheels.forEach((p,i)=>{f.u(f.controller+0x38+i*4,p);f.f32(p+0x188,1.125);});f.f32(f.car+0x4dc,.1);
  f.u(B+60,100);f.u(B+76,100);f.u(B+80,0);f.f32(f.driver+0x770,1);const ordinary=f.policy(13962);
  // This is an explicit finite native-factor fixture boundary, not a claim
  // that this fixture runs the complete gap/rank/reference sampling system.
  f.f32(f.driver+0x770,M);f.f32(f.car+0x468,M);const nativePaced=f.policy(13962);assert(nativePaced>ordinary);assert(Math.abs(nativePaced/ordinary-M)<1e-5);assert.equal(f.u(B+60),100,'No authored selected pace increase');
  RB.command(f.memory,{enabled:false,percent:100,stackingReady:false});
  const publish=()=>{f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+4,f.controller);f.u(f.cpu+16,f.stack);f.u(f.stack,0x5a4c38);f.f32(f.stack+4,M);f.h(f.cpu+140,0x37f);f.native.f3553(f.cpu);return f.f32(out.power+8);};
  assert.equal(publish(),M);assert.equal(RB.readAck(f.memory).reason,2);assert.equal(RB.readAck(f.memory).percent,100);for(const p of out.wheels)assert.equal(f.f32(p+0x184),M);
  f.options.policy={mode:'native',cornerFactor:1,sharpMargin:0,brakingFactor:1,reactionSeconds:.1,marginDistance:0};f.options.expectedPace=1;
  const state=f.capture();assert.equal(state.forwardState,'armed',JSON.stringify(state));const cap=state.forwardRequestedTarget;assert(cap>0&&cap<nativePaced);
  for(const id of[13653,13962]){assert.equal(f.policy(id),cap);assert(f.policy(id,1)<cap);assert(f.policy(id,180,-5)<0);}
  f.session.stop();assert(f.policy(13962)>cap);assert.equal(f.f32(f.driver+0x770),M);assert.equal(f.f32(f.car+0x468),M);assert.equal(publish(),M,'Stop observer preserves legitimate native publication above1');
  modules.push({revision,nativeFactorFixtureBoundary:M,authoredPacePercent:100,authoredSubstitutionEnabled:false,unityForwardPolicyAccepted:true,actualConsumerIDs:[13653,13962],actualPublisherID:3553,actualFinalSetterID:6140,finalCap:cap,stopReleasesCapAndPreservesNativeFactor:true,liveVerified:false});
 }
 const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const receipt=path.join(__dirname,'calculated-pair-tests.json'),proof={passed:true,kind:'final postcorner actual native consumer publisher and unity forward policy fixture',checkedAt:new Date().toISOString(),testSha256:sha(__filename),fixtureSha256:sha(path.join(__dirname,'calculated-pair-fixture.cjs')),cornerTargetProductSha256:sha(path.join(__dirname,'native-corner-target.js')),modules,liveVerified:false,limitation:'The finite M1.485 factor is a controlled fixture boundary; complete live gap/rank/reference calculation and gameplay are not proved.'},oldProof=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt,'utf8')):null;
 if(!oldProof||JSON.stringify({...oldProof,checkedAt:null})!==JSON.stringify({...proof,checkedAt:null}))fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');
});
