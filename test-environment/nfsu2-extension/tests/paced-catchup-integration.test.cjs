'use strict';
// Actual native consumers and physics publication are used here. The fixture
// controls the planner/cap providers; this is not a full running game.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Controller,MAX_ACK_AGE_MS}=require('../extension/paced-catchup-controller.js');
const Product=require('../extension/paced-catchup.js');
const {PROFILES}=require('../native/paced-profile-config.cjs');
const {fixture,physics,B}=require('../native/paced-fixture.cjs');

test('actual native fixture and packaged controller protocol use the same reviewed product',()=>{
  assert.deepEqual(fs.readFileSync(path.join(__dirname,'../extension/paced-catchup.js')),
    fs.readFileSync(path.join(__dirname,'../native/paced-catchup.js')));
});

for(const profile of PROFILES){
  test(`actual ${profile.revision} publications drive controller gain, owner changes and Stop restoration`,async()=>{
    const f=await fixture(profile.revision),out=physics(f),M=Math.fround(1.485);
    f.f32(f.driver+0x770,M);f.f32(f.car+0x468,M);
    f.u(B+60,100);const nativeTarget=f.policy(13962);
    const c=new Controller(f.memory,{installed:true,verified:true,moduleHash:profile.native.hash,moduleIdentity:{},protocol:Product});
    let now=0,ownerSequence=2,strength=1;
    const poll=(extra={})=>c.update({enabled:true,safe:true,ordinaryRace:true,network:false,allowNetwork:false,
      aiState:{active:true,owned:true},ownerSequence,currentCar:f.car,percent:200,strength,selectedPace:2,
      featureOwnsPace:true,customPower:1,customGrip:1,now:now+=16,...extra});
    const publish=()=>f.publish(M);
    const establish=()=>{publish();poll();publish();return poll();};
    const assertPhysical=s=>{
      const E=Math.fround(Math.fround(M*2)*strength),T=Math.fround(E*2);
      assert.equal(s.active,true);assert.equal(s.sourceFactor,M);assert.equal(s.appliedStrength,strength);
      assert.equal(s.powerFactor,E);assert.equal(s.tireFactor,T);assert.equal(s.wheelHits,4);
      assert.equal(f.f32(out.power+8),E);assert.equal(f.f32(out.chassis+0x208),E);
      for(const p of out.wheels)assert.equal(f.f32(p+0x184),T);
      assert.equal(f.f32(f.driver+0x770),M);assert.equal(f.f32(f.car+0x468),M);
    };

    f.u(B+60,200);
    assert.equal(poll().active,false);assert.equal(f.policy(13962),nativeTarget,'Cold native target stays at neutral pace');
    publish();assert.equal(poll().active,false,'First real publication establishes freshness baseline');
    publish();assertPhysical(poll());
    assert(Math.abs(f.policy(13962)/nativeTarget-2)<1e-5);
    assert.equal(c.status(now+MAX_ACK_AGE_MS+1).active,false,'Reported evidence expires without another publication');

    strength=10;
    assert.equal(poll().active,false,'A changed strength cannot reuse prior physical outputs');
    assert.equal(f.policy(13962),nativeTarget,'Old strength cannot unlock current requested pace');
    assertPhysical(establish());
    f.f32(out.wheels[0]+0x184,1);
    assert.equal(poll().active,false,'One changed actual tire input withdraws gain');
    assert.equal(f.policy(13962),nativeTarget,'Native use-time guard also rejects the changed tire');
    assertPhysical(establish());

    const priorCommand=f.u(B+236);
    ownerSequence=4;f.u(B+4,ownerSequence);
    assert.equal(poll().active,false);assert.notEqual(f.u(B+236),priorCommand);
    assert.equal(f.policy(13962),nativeTarget,'Old physical publication cannot follow a new AI owner');
    assertPhysical(establish());
    assert.equal(Product.readAck(f.memory).ownerSequence,ownerSequence);

    let stopped=c.stop({now:now+=16,currentCar:f.car});
    assert.equal(stopped.active,false);assert.equal(stopped.resetPending,true);assert.equal(stopped.resetAcknowledged,false);
    assert.equal(f.u(B+236)&65535,100,'Stop requests Off/100/strength1');
    f.u(B+60,100);assert.equal(f.policy(13962),nativeTarget);
    // The last observed On publication is already a freshness baseline. An
    // advancing current Off publication can therefore acknowledge restoration.
    assert.equal(publish(),M);stopped=poll({enabled:false});assert.equal(stopped.resetAcknowledged,true);
    assert.equal(publish(),M);stopped=poll({enabled:false});assert.equal(stopped.resetAcknowledged,true);
    assert.equal(stopped.active,false);assert.equal(stopped.appliedPercent,100);assert.equal(stopped.appliedStrength,null);
    assert.equal(stopped.sourceFactor,null);assert.equal(stopped.powerFactor,null);assert.equal(stopped.tireFactor,null);
    for(const p of out.wheels)assert.equal(f.f32(p+0x184),M);
  });
}
