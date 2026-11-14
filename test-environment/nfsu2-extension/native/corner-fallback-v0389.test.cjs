'use strict';
// Executes the exact native corner body, target consumer and arithmetic callees
// in controlled resident fixtures. This does not simulate live racing.
const {test}=require('node:test'),assert=require('node:assert/strict');
const Product=require('./paced-catchup.js'),{fixture,B,physics}=require('./paced-fixture.cjs');
const profiles=require('./paced-profile-config.cjs').PROFILES,C=0xd0d200;
function corner(f,{pace=200,percent=95,q=1,margin=0}={}){
 f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+12,f.car);f.u(f.cpu+24,f.route);f.u(f.cpu+16,f.stack);f.u(f.stack,0x4228bb);
 f.f32(f.stack+4,1);f.f32(f.stack+8,9.8*q/1600);f.f32(f.stack+12,40);f.f32(0x7a51b8,9.8);f.f32(0x7d7d3c,0);f.h(f.cpu+140,0x37f);
 f.u(C+8,percent);f.u(C+36,margin);f.u(C+44,100);f.u(C+48,pace);f.native.f4653(f.cpu);
 assert.equal(f.u(f.cpu+16),f.stack+4);assert.equal(f.u(f.cpu+32),0x4228bb);
 return f.view.getFloat64(f.cpu+72+(f.u(f.cpu+136)&7)*8,true);
}
test('paired enabled keeps a native corner envelope when the actual physical class denies gain, while target pace stays1',async()=>{
 for(const profile of profiles){const f=await fixture(profile.revision);physics(f);const physical=0x650000;f.commit(physical,0x60);f.u(f.car+0x34,physical);
  for(const [kind,vt]of [[3,0x7a2538],[1,0x7a25e0]]){
   f.u(f.car+0x28,kind);f.u(physical,vt);f.u(physical+(kind===3?0x34:0x5c),f.car);f.f32(f.car+0x468,1);f.f32(f.driver+0x770,1);
   Product.command(f.memory,{enabled:false,forceGeneration:true});f.u(B+60,100);const nativeTarget=f.policy(13962);
   for(const pace of[100,125,200])for(const q of[.01,1,9])for(const margin of[0,25]){
    f.u(B+60,100);Product.command(f.memory,{enabled:false,forceGeneration:true});const baseline=corner(f,{pace:100,q,margin});
    f.u(B+60,pace);Product.command(f.memory,{enabled:true,percent:pace,strength:10,ownerSequence:2,stackingReady:true,forceGeneration:true});
    assert.equal(f.policy(13962),nativeTarget,'Denied paired gain must retain actual native target');assert.equal(f.u(B+76),100);
    const result=corner(f,{pace,q,margin});assert.equal(result,baseline,profile.revision+JSON.stringify({kind,pace,q,margin}));assert(result>0&&result<=40);
    assert.equal(f.u(f.car+0x28),kind);assert.equal(f.u(physical),vt);assert.equal(f.f32(f.car+0x468),1);assert.equal(f.f32(f.driver+0x770),1);
    Product.command(f.memory,{enabled:false,forceGeneration:true});const unpaired=corner(f,{pace,q,margin});
    const curvature=Math.abs(f.f32(f.stack+8)),curve=Math.sqrt(f.f32(0x7a51b8)/curvature),expected=Math.min(40,curve*.95/(pace/100))*(1-margin/100*Math.max(0,1-curve/40));
    assert(Math.abs(unpaired-expected)<1e-10,'Unpaired adaptive pace compensation is unchanged');
   }
  }
 }
});
