'use strict';
// Actual AA target consumers + actual production forward setter/helper. Only
// planner and behavior-cap providers are authored fixture boundaries.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
globalThis.__NFSU2_FORWARD_CLAMP__=require('../extension/forward-clamp.js');
const {world}=require('./fixtures/forward-native-world.cjs'),P=require('../../work-aa-profile/tools/native-proof.cjs'),Replace=require('../../work-catchup-wrapper/cache-fix.cjs').replace;
const D={record:0x410000,behavior:0x420000,action:0x430000,difficulty:0x440000,driverVt:0x450000,actionVt:0x460000,caps:0x470000},B=0xd0d100;
const Probe=require('../extension/route-probe.js');
const IDS=[13649,9733,5669,13333,8173,5983,5982,6652,824,13653,13646,13647,13962,13963,13970,13971,12864,18266,21769,3485,4574];
async function stubs(){const wabt=await require('../../build-deps/node_modules/wabt')(),make=async(pop,off)=>{const w=wabt.parseWat('controlled-cap-provider.wat',`(module (import "env" "memory" (memory 256 65536 shared)) (func (param $cpu i32) (local $sp i32) (local $top i32) (local.set $sp (i32.load offset=16 (local.get $cpu))) (local.set $top (i32.and (i32.sub (i32.load offset=136 (local.get $cpu)) (i32.const 1)) (i32.const 7))) (i32.store offset=136 (local.get $cpu) (local.get $top)) (f64.store offset=72 (i32.add (local.get $cpu) (i32.shl (local.get $top) (i32.const 3))) (f64.promote_f32 (f32.load (i32.const ${D.caps+off})))) (i32.store offset=32 (local.get $cpu) (i32.load (local.get $sp))) (i32.store offset=16 (local.get $cpu) (i32.add (local.get $sp) (i32.const ${4+pop})))))`,{threads:true});w.resolveNames();w.validate({threads:true});return[...P.parse(Buffer.from(w.toBinary({}).buffer)).bodies.values()][0];};return{3485:await make(12,0),4574:await make(4,4)};}
let stubBodies;
async function fixture(revision='aa2429fb'){stubBodies??=await stubs();const f=await world(revision,{progress:50,pace:1.95,nativeOptions:{includeIDs:IDS,transformBytes:b=>Replace(b,stubBodies)}});
 const retail=fs.readFileSync(path.resolve(__dirname,'../../research/tuner-fixtures-93cf/GLOBALB.BUN'));f.data.set(retail.subarray(0x750988,0x750988+2784),D.difficulty);
 for(const[p,n]of[[D.record,0x920],[D.behavior,0x210],[D.action,4],[D.difficulty,2784],[D.driverVt,0x80],[D.actionVt,0x50],[D.caps,8],[f.car,0x480]])f.commit(p,n);
 for(const[p,v]of[[0x81cb60,D.difficulty],[f.car+0x14,D.record],[f.driver,D.driverVt],[D.driverVt+0x78,0x402580],[f.driver+0xc,f.route],[f.driver+0x6f8,D.behavior],[f.driver+0x750,0xffffffff],[D.action,D.actionVt],[D.actionVt+0x4c,0x401820],[f.driver+0x700,400],[f.car+0x424,2],[f.car+0x1c,0],[D.behavior+0x204,0],[D.record+4,1]])f.u(p,v);
 for(const p of[0x8650b0,f.driver+0x754,f.driver+0x730,f.driver+0x734])f.u(p,0);
 f.u(f.driver,0x785370);f.u(0x785370+0x78,0x402580);f.commit(0x785370,0x80);
 f.view.setUint8(D.record+0x901,254);f.view.setUint8(D.behavior+0x1fc,1);f.view.setUint8(D.behavior+0x1fd,1);f.view.setUint8(f.controller+0x10,3);f.f32(f.driver+0x770,1);f.f32(f.car+0x468,1);f.f32(f.car+0x42c,40);
 for(const[address,slot]of[[0x402580,83],[0x4054a0,168],[0x401820,30]])f.u(f.profile.runtime.lookup+4*(address-0x401000),slot);
 const context=0x480000;f.commit(context,8);f.u(context,f.car);f.u(context+4,1);
 f.policy=(id,plannerCap=180,behaviorCap=1000)=>{f.f32(D.caps,plannerCap);f.f32(D.caps+4,behaviorCap);f.data.fill(0,f.cpu,f.cpu+344);f.u(f.cpu+4,D.action);f.u(f.cpu+16,f.stack);f.u(f.stack,0x12345678);f.u(f.stack+4,context);f.h(f.cpu+140,0x37f);f.native['f'+id](f.cpu);assert.equal(f.u(f.cpu+16),f.stack+8);assert.equal(f.u(f.cpu+32),0x12345678);return f.f32(f.controller+0x230);};
 return f;
}
test('stack-only native pace composes with the actual forward setter, preserving tighter, reverse and Stop targets',async()=>{
 for(const revision of['aa2429fb','15e5958f','943ee537']){const f=await fixture(revision);f.u(B+80,0);f.policy(13962);assert(f.u(B+80)>0,'Actual native consumer supplies the capture settlement acknowledgement');const state=f.capture();assert.equal(state.forwardState,'armed',revision);const cap=state.forwardRequestedTarget;assert(cap>0&&cap<180);const driver=Buffer.from(f.data.subarray(f.driver+0x770,f.driver+0x774)),car=Buffer.from(f.data.subarray(f.car+0x468,f.car+0x46c)),record=Buffer.from(f.data.subarray(D.record,D.record+0x920));
 for(const id of[13653,13962]){
  f.u(B+80,0);const target=f.policy(id);assert.equal(target,cap,'Actual6140 clamp wins after complete native policy pace');assert(f.u(B+80)>0,'Target consumer really applied selected pace');
  const lower=f.policy(id,1);assert(lower>0&&lower<cap,'Native lower target remains lower');
  assert(f.policy(id,180,-5)<0,'Native reverse request survives the positive-only final cap');
  assert.deepEqual(Buffer.from(f.data.subarray(f.driver+0x770,f.driver+0x774)),driver);assert.deepEqual(Buffer.from(f.data.subarray(f.car+0x468,f.car+0x46c)),car);assert.deepEqual(Buffer.from(f.data.subarray(D.record,D.record+0x920)),record);
 }
 assert.equal(f.session.stop().forwardState,'off');f.u(B+8,0);f.u(B+4,4);const before=f.u(B+80);assert(f.policy(13962)>cap,'Stop releases final cap and selected pace together');assert.equal(f.u(B+80),before,'OFF produces no new selected-pace acknowledgement');
 }
});
test('actual consumer acknowledgements settle finite native bases independently of selected pace',async()=>{
 for(const revision of['aa2429fb','15e5958f','943ee537'])for(const base of[0,-0,.9,1,1.37,4]){
  const f=await fixture(revision);f.f32(f.driver+0x770,base);f.u(B+80,0);const bits=f.u(f.driver+0x770),nativeRequest=f.policy(13962);assert(f.u(B+80)>0,'Actual selected-pace consumption acknowledged for '+String(base));assert.equal(f.u(f.driver+0x770),bits,'Native cache remains bit exact, including negative zero');
  const state=f.capture();assert.equal(state.forwardState,'armed');assert.equal(f.e.fwg_context(f.route),0,'Native helper accepts independently bounded base');const actual=f.policy(13962),expected=Math.min(nativeRequest,state.forwardRequestedTarget);assert(Math.abs(actual-expected)<1e-3,'Composed cap respects native requested target for base '+String(base));
  f.session.stop();
 }
});
test('armed native helper rejects invalid factors and unsettled acknowledgements without trusting page guards',async()=>{
 for(const revision of['aa2429fb','15e5958f','943ee537']){const f=await fixture(revision);f.u(B+80,0);f.policy(13962);const state=f.capture();assert.equal(state.forwardState,'armed');const cap=state.forwardRequestedTarget;
 for(const base of[-1,4.1,NaN,Infinity]){
  f.f32(f.driver+0x770,base);assert.notEqual(f.e.fwg_context(f.route),0,'Game-thread context rejects invalid native factor '+String(base));assert.equal(f.target(180),180,'Native final cap fails closed on invalid base');
  const observed=Probe.capture(f.memory,{verified:true,moduleHash:f.profile.moduleHash,expectedPace:1.95});assert.equal(observed.status,'unavailable');assert.equal(observed.reason,'pace-not-settled');
 }
 for(const base of[0,-0,.9,1,1.37,4]){
  f.f32(f.driver+0x770,base);assert.equal(f.e.fwg_context(f.route),0,'A legitimate base refresh keeps the geometry context usable');assert.equal(f.target(180),cap,'A valid native refresh retains the absolute lower-only lease');const update=f.session.update(f.options);assert(['armed','requested'].includes(update.forwardState),'Valid native changes cannot strand geometry');if(update.forwardState==='requested')assert.equal(f.capture({alreadyRequested:true}).forwardState,'armed','An ordinary resample completes after native base refresh');
 }
 for(const[name,change]of[['no acknowledgement',()=>f.u(B+80,0)],['requested mismatch',()=>f.u(B+60,200)],['applied mismatch',()=>f.u(B+76,200)]]){
  f.u(B+60,195);f.u(B+76,195);f.u(B+80,1);change();assert.notEqual(f.e.fwg_context(f.route),0,name+' rejected natively');assert.equal(f.target(180),180,name+' cannot retain final cap');const observed=Probe.capture(f.memory,{verified:true,moduleHash:f.profile.moduleHash,expectedPace:1.95});assert.equal(observed.status,'unavailable');assert.equal(observed.reason,'pace-not-settled');
 }
 f.session.stop();
 }
});
