'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Pacing=require('../extension/forward-pacing.js');
const {Controller,PIN}=require('../extension/forward-driving.js');
const policy={lateralAcceleration:4,brakingDeceleration:4,cornerFactor:.8,sharpMargin:15,reactionSeconds:.6,marginDistance:8,maxSpacing:20};
function capture(request=2,extra={}){return{status:'captured',moduleHash:PIN,request,ownerSequence:6,pace:1.3,
  source:'owned-native-forward-query-v1',sampling:'native-node-anchors-linear-v1',postConstructionVerified:true,
  forwardOrderVerified:true,horizontalAxes:'xy',controlWord:0x37f,nativeUnitScaleVerified:true,
  progress:0,end:80,physical:{speed:10},points:[{distance:0,xyz:[0,0,0]},{distance:40,xyz:[40,0,0]},{distance:80,xyz:[40,40,0]}],...extra};}
function fixture(options={}){
 const calls=[],pending=[],published=[];let next=2;
 const geometry={request({expectedPace}){calls.push(['request',expectedPace]);const request=next;next+=2;return{status:'waiting',request};},
  poll(){calls.push(['poll']);return pending.shift()||{status:'waiting'};},stop(){calls.push(['geometry-stop']);},invalidate(){calls.push(['geometry-invalidate']);}};
 const publisher={stop(){calls.push(['cap-stop']);},publish(value){calls.push(['publish',value.capture.request]);published.push(value);
  const plan=Pacing.plan(value.window,value.policy);return{status:'armed',request:value.capture.request,cap:plan.targetCap,maxAgeTicks:400};}};
 const c=new Controller({}, {installed:true,verified:true,moduleHash:PIN,moduleIdentity:{},geometry,publisher,...options});
 const input={enabled:true,safe:true,offline:true,ordinaryRace:true,aiState:{active:true,owned:true,ownerSequence:6},handbackPending:false,expectedPace:1.3,identity:'session1:car1:race1:track4715',policy};
 return{c,calls,pending,published,geometry,publisher,input};
}
test('owned ordinary offline AI alternates request with actual geometry planning and one publication',()=>{
 const f=fixture();assert.equal(f.c.update(f.input).forwardState,'requested');f.pending.push(capture());
 const result=f.c.update(f.input);assert.equal(result.forwardState,'armed');assert.equal(result.forwardCaptured,true);assert.equal(result.forwardPriorityTurns,1);
 assert.ok(result.forwardSamples>=3&&result.forwardSamples<=24);assert.equal(result.forwardHorizon,80);assert.ok(result.forwardRequestedTarget>0);assert.equal(result.forwardLeaseTicks,400);
 assert.equal(result.forwardNativeApplied,false);assert.equal(result.forwardLiveVerified,false);assert.equal(f.calls.filter(x=>x[0]==='request').length,1);
 assert.equal(f.published.length,1);assert.equal(f.c.update(f.input).forwardState,'requested');assert.equal(f.published.length,1);
 assert.deepEqual(f.calls.slice(-3).map(x=>x[0]),['cap-stop','geometry-stop','request']);
});
test('waiting captures neither overlap requests nor refresh or republish old caps',()=>{
 const f=fixture();f.c.update(f.input);for(let i=0;i<20;i++)assert.equal(f.c.update(f.input).forwardState,'waiting');
 assert.equal(f.calls.filter(x=>x[0]==='request').length,1);assert.equal(f.published.length,0);
});
test('native failure codes are bounded scalars and clear after Stop or a successful capture',()=>{
 for(const code of [10,1,0,11,-1,1.5,'10',NaN,Infinity]){
  const f=fixture();f.c.update(f.input);f.pending.push({status:'unavailable',code,reason:'private native source must not escape'});const s=f.c.update(f.input);assert.equal(s.forwardState,'unknown');assert.equal(s.forwardFailureCode,Number.isInteger(code)&&code>=1&&code<=10?code:undefined);assert(!JSON.stringify(s).includes('private'));assert.equal(f.c.stop().forwardFailureCode,undefined);
  f.c.update(f.input);f.pending.push(capture(4));assert.equal(f.c.update(f.input).forwardFailureCode,undefined);
 }
});
test('every protected context cancels cap before geometry while preserving the caller AI object',()=>{
 for(const changed of [{enabled:false},{safe:false},{offline:false},{ordinaryRace:false},{handbackPending:true},
  {aiState:{active:false,owned:true}},{aiState:{active:true,owned:false}},{aiState:{active:true,owned:true,switching:true}}]){
  const f=fixture();f.c.update(f.input);f.pending.push(capture());f.c.update(f.input);const ai=JSON.stringify(f.input.aiState);f.calls.length=0;
  const result=f.c.update({...f.input,...changed});assert.ok(['off','waiting'].includes(result.forwardState));assert.equal(result.forwardCaptured,false);
  assert.deepEqual(f.calls.map(x=>x[0]),['cap-stop','geometry-stop']);assert.equal(JSON.stringify(f.input.aiState),ai);
 }
});
test('uninstalled, unverified, wrong-module and missing-session wrappers never request capture',()=>{
 for(const options of [{installed:false},{verified:false},{moduleHash:'f'.repeat(64)},{moduleIdentity:null}]){
  const f=fixture(options);assert.equal(f.c.update(f.input).forwardState,'unknown');assert.ok(!f.calls.some(x=>x[0]==='request'));
 }
});
test('identity, pace and policy changes revoke the prior transaction before starting fresh',()=>{
 for(const changed of [{identity:'session2'},{expectedPace:1.4},{policy:{...policy,sharpMargin:20}}]){
  const f=fixture();f.c.update(f.input);f.calls.length=0;assert.equal(f.c.update({...f.input,...changed}).forwardState,'requested');
  assert.deepEqual(f.calls.map(x=>x[0]),['cap-stop','geometry-stop','request']);assert.equal(f.c.pendingRequest,4);
 }
});
test('new native owner generation discards a pending result and obtains a fresh receipt',()=>{
 const f=fixture();f.c.update(f.input);f.calls.length=0;
 assert.equal(f.c.update({...f.input,aiState:{active:true,owned:true,ownerSequence:8}}).forwardState,'requested');
 assert.deepEqual(f.calls.map(x=>x[0]),['cap-stop','geometry-stop','request']);
 f.pending.push(capture(4,{ownerSequence:6}));assert.equal(f.c.update({...f.input,aiState:{active:true,owned:true,ownerSequence:8}}).forwardState,'unknown');
 assert.equal(f.published.length,0);
});
test('stale request, wrong pace, unknown geometry and invalid route order never publish',()=>{
 for(const bad of [{status:'unavailable'},capture(4),capture(2,{pace:1.4}),capture(2,{ownerSequence:8}),
  capture(2,{postConstructionVerified:false}),capture(2,{nativeUnitScaleVerified:false}),capture(2,{points:[{distance:0,xyz:[0,0,0]}]})]){
  const f=fixture();f.c.update(f.input);f.pending.push(bad);assert.equal(f.c.update(f.input).forwardState,'unknown');assert.equal(f.published.length,0);
  assert.deepEqual(f.calls.slice(-2).map(x=>x[0]),['cap-stop','geometry-stop']);
 }
});
test('malformed policy, pace and identity cannot enter the native sampler',()=>{
 for(const changed of [{policy:null},{policy:{...policy,reactionSeconds:.09}},{policy:{...policy,lateralAcceleration:NaN}},
  {expectedPace:1.333},{expectedPace:Infinity},{identity:''},{identity:'x'.repeat(257)},{aiState:{active:true,owned:true,ownerSequence:7}}]){
  const f=fixture();assert.equal(f.c.update({...f.input,...changed}).forwardState,'unknown');assert.ok(!f.calls.some(x=>x[0]==='request'));
 }
});
test('exceptions in request, poll or publication revoke both commands without logging raw errors',()=>{
 for(const method of ['request','poll','publish']){
  const f=fixture();if(method!=='request')f.c.update(f.input);if(method==='publish')f.pending.push(capture());
  (method==='publish'?f.publisher:f.geometry)[method]=()=>{throw Error('private native data must not escape');};
  const result=f.c.update(f.input);assert.equal(result.forwardState,'unknown');assert.ok(!JSON.stringify(result).includes('private'));
  assert.deepEqual(f.calls.slice(-2).map(x=>x[0]),['cap-stop','geometry-stop']);
 }
});
test('native target and lease returned by publisher remain bounded and never imply applied status',()=>{
 for(const extra of [{cap:NaN},{cap:0},{cap:-0},{cap:-1},{cap:151},{maxAgeTicks:401},{request:4},{status:'applied'}]){
  const f=fixture();f.c.update(f.input);f.pending.push(capture());f.publisher.publish=()=>({status:'armed',request:2,cap:12,maxAgeTicks:400,...extra});
  const result=f.c.update(f.input);assert.equal(result.forwardState,'unknown');assert.equal(result.forwardNativeApplied,false);assert.equal(result.forwardLiveVerified,false);
 }
});
test('stop remains ordered if cap cancellation throws and invalidate permanently disarms',()=>{
 const f=fixture();f.c.update(f.input);f.publisher.stop=()=>{f.calls.push(['cap-stop']);throw Error('cancel unavailable');};f.calls.length=0;
 assert.equal(f.c.invalidate().forwardState,'off');assert.deepEqual(f.calls.map(x=>x[0]),['cap-stop','geometry-stop','geometry-invalidate']);
 assert.equal(f.c.update(f.input).forwardState,'unknown');assert.equal(f.calls.filter(x=>x[0]==='request').length,0);
});
test('browser script composes its loaded globals with the exact module and memory identity',()=>{
 const made=[],memory={},moduleIdentity={};
 class Geometry{constructor(m,options){made.push(['geometry',m,options]);}stop(){}request(){return{status:'waiting',request:2};}}
 class Publisher{constructor(g,options){made.push(['publisher',g,options]);}stop(){}}
 const context={__NFSU2_FORWARD_NATIVE_CONFIG__:require('../extension/forward-native-config.js'),__NFSU2_FORWARD_GEOMETRY__:{Controller:Geometry},__NFSU2_FORWARD_CLAMP__:{Publisher},__NFSU2_FORWARD_PACING__:Pacing};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/forward-driving.js'),'utf8'),context);
 const c=new context.__NFSU2_FORWARD_DRIVING__.Controller(memory,{installed:true,verified:true,moduleHash:PIN,moduleIdentity});
 assert.equal(made[0][1],memory);assert.equal(made[0][2].moduleHash,PIN);assert.equal(made[0][2].moduleIdentity,moduleIdentity);
 assert.equal(made[1][1],c.geometry);assert.equal(made[1][2].moduleIdentity,moduleIdentity);assert.equal(made[1][2].installed,true);
 assert.equal(c.update(fixture().input).forwardState,'requested');
});
