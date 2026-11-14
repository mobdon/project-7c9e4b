'use strict';
// Fixed numeric telemetry and the exact native byte-sized direction ABI.
// Uses this project's actual extension and current pinned native fixtures.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Driving=require('../extension/forward-driving.js'),Diagnostics=require('../extension/diagnostics.js'),Geometry=require('../extension/forward-geometry.js'),Probe=require('../extension/route-probe.js'),Pacing=require('../extension/forward-pacing.js');
const {world}=require('./fixtures/forward-native-world.cjs');

{
 const policy={lateralAcceleration:4,brakingDeceleration:4,cornerFactor:.8,sharpMargin:15,reactionSeconds:.6,marginDistance:8,maxSpacing:20};
 const capture=(extra={})=>({status:'captured',moduleHash:Driving.PIN,request:2,ownerSequence:6,pace:1.3,source:'owned-native-forward-query-v1',sampling:'native-node-anchors-linear-v1',postConstructionVerified:true,forwardOrderVerified:true,horizontalAxes:'xy',controlWord:0x37f,nativeUnitScaleVerified:true,progress:0,end:80,physical:{speed:10},points:[{distance:0,xyz:[0,0,0]},{distance:40,xyz:[40,0,0]},{distance:80,xyz:[40,40,0]}],...extra});
 function fixture(options={}){
  const calls=[],pending=[];let next=2;
  const geometry={request(){calls.push('request');return{status:'waiting',request:next+=2};},poll(){calls.push('poll');return pending.shift()||{status:'waiting'};},stop(){calls.push('geometry-stop');},invalidate(){calls.push('invalidate');}};
  const publisher={stop(){calls.push('cap-stop');},publish({capture,window,policy}){calls.push('publish');return{status:'armed',request:capture.request,cap:Pacing.plan(window,policy).targetCap,maxAgeTicks:400};}};
  const c=new Driving.Controller({}, {installed:true,verified:true,moduleHash:Driving.PIN,moduleIdentity:{},geometry,publisher,...options});
  const input={enabled:true,safe:true,offline:true,ordinaryRace:true,aiState:{active:true,owned:true,ownerSequence:6},expectedPace:1.3,identity:'session:car:race:track',policy};
  return{c,input,geometry,publisher,pending,calls};
 }
 test('forward preflight installation, policy, identity, pace and sequence denials expose fixed stages and Stop clears',()=>{
  for(const[opts,input,code]of [[{installed:false},{},11],[{verified:false},{},12],[{moduleIdentity:null},{},13],[{}, {policy:null},16],[{},{identity:''},17],[{},{expectedPace:1.333},18],[{},{aiState:{active:true,owned:true,ownerSequence:7}},19]]){
   const f=fixture(opts),result=f.c.update({...f.input,...input});assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,code);assert.equal(result.forwardFailureCode,undefined);assert.equal(f.c.stop().forwardGuardCode,undefined);assert.equal(f.c.update({...f.input,enabled:false}).forwardGuardCode,undefined);assert(!f.calls.includes('request'));
  }
  const f=fixture();f.c.pacing=null;assert.equal(f.c.update(f.input).forwardGuardCode,15);const g=fixture();g.c.geometry=null;assert.equal(g.c.update(g.input).forwardGuardCode,14);
 });
 test('forward request, poll, capture, planner and publisher failures remain distinct without raw error data',()=>{
  for(const[stage,code]of [['request',44],['poll',43],['publish',42]]){
   const f=fixture();if(stage!=='request'){f.c.update(f.input);f.pending.push(capture({request:4}));}
   (stage==='publish'?f.publisher:f.geometry)[stage]=()=>{throw Error('private pointer0x12345678 and source text');};const result=f.c.update(f.input);assert.equal(result.forwardGuardCode,code);assert(!JSON.stringify(result).includes('private'));assert(!JSON.stringify(result).includes('12345678'));assert.equal(result.forwardNativeApplied,false);
  }
  for(const[bad,code]of [[{status:'unavailable'},37],[capture(),39],[capture({request:4,postConstructionVerified:false}),40]]){const f=fixture();f.c.update(f.input);f.pending.push(bad);assert.equal(f.c.update(f.input).forwardGuardCode,code);}
  const f=fixture();f.c.update(f.input);f.pending.push(capture({request:4}));f.publisher.publish=()=>({status:'armed',request:4,cap:0,maxAgeTicks:400});assert.equal(f.c.update(f.input).forwardGuardCode,41);
  const r=fixture();r.geometry.request=()=>({status:'waiting',request:3});assert.equal(r.c.update(r.input).forwardGuardCode,38);
 });
 test('native rejection numbers stay separate and untrusted forward telemetry cannot invent guard codes',()=>{
  for(const code of[1,10,11,NaN,'5']){
   const f=fixture();f.c.update(f.input);f.pending.push({status:'unavailable',code,forwardGuardCode:30,reason:'never persist'});const r=f.c.update(f.input);assert.equal(r.forwardGuardCode,30);assert.equal(r.forwardFailureCode,Number.isInteger(code)&&code>=1&&code<=10?code:undefined);assert(!JSON.stringify(r).includes('persist'));
  }
  for(const code of[0,1,10,27,36,46,99,144,104.5,'104',NaN,Infinity,0xd0d800]){const f=fixture();f.geometry.request=()=>{const e=Error('raw');e.forwardGuardCode=code;throw e;};assert.equal(f.c.update(f.input).forwardGuardCode,44);}
 });
 test('fixed forward telemetry preserves protected-context cancellation order and successful cap behavior',()=>{
  for(const[changed,state]of [[{},'requested'],[{enabled:false},'off'],[{safe:false},'waiting'],[{ordinaryRace:false},'waiting'],[{policy:null},'unknown'],[{expectedPace:1.333},'unknown'],[{aiState:{active:true,owned:true,ownerSequence:7}},'unknown']]){
   const f=fixture(),result=f.c.update({...f.input,...changed});assert.equal(result.forwardState,state);assert.equal(result.forwardNativeApplied,false);assert.deepEqual(f.calls.slice(0,2),['cap-stop','geometry-stop']);assert.equal(f.calls.includes('request'),state==='requested');
  }
  const f=fixture();f.c.update(f.input);f.pending.push(capture({request:4}));const result=f.c.update(f.input);assert.equal(result.forwardState,'armed');assert(result.forwardRequestedTarget>0);assert.equal(result.forwardGuardCode,undefined);assert.equal(result.forwardNativeApplied,false);f.c.stop();assert.deepEqual(f.calls.slice(-2),['cap-stop','geometry-stop']);
 });
 test('diagnostics accepts only known integer forward guards, records changes, and scrubs persisted values',()=>{
  let at=0;const saved={},storage={getItem:()=>saved.value,setItem:(k,v)=>saved.value=v},logger=Diagnostics.create({storage,clock:()=>at});
  for(const forwardGuardCode of[11,20,23,28,30,35,40,45,100,104,142,143]){logger.record('state',{forwardGuardCode,forwardFailureCode:5,reason:'raw pointer',privateValue:0x12345678});const e=JSON.parse(logger.exportText()).events.at(-1).data;assert.equal(e.forwardGuardCode,forwardGuardCode);assert.equal(e.forwardFailureCode,5);assert(!JSON.stringify(e).includes('raw'));assert(!Object.hasOwn(e,'privateValue'));}
  for(const forwardGuardCode of[0,10,27,36,46,99,144,104.5,'104',NaN,Infinity]){logger.record('state',{forwardGuardCode});assert(!Object.hasOwn(JSON.parse(logger.exportText()).events.at(-1).data,'forwardGuardCode'));}
  const before=logger.status().events;logger.snapshot({forwardState:'unknown',forwardGuardCode:104});at+=250;logger.snapshot({forwardState:'unknown',forwardGuardCode:130});assert.equal(logger.status().events,before+2);
  const restored=Diagnostics.create({storage,clock:()=>at});assert.equal(JSON.parse(restored.exportText()).events.findLast(e=>e.event==='state').data.forwardGuardCode,130);
 });
 test('route probe fixed denial map is exhaustive and rejects coerced or unbounded inputs',()=>{
  assert.equal(Object.keys(Probe.guardCodes).length,44);assert.equal(Probe.guardCodes['uncommitted-page'],104);assert.equal(Probe.guardCodes['node-distance-order'],130);assert.equal(Probe.guardCodes['reader-error'],100);
  assert.deepEqual([...new Set(Object.values(Probe.guardCodes))].sort((a,b)=>a-b),Array.from({length:44},(_,i)=>100+i));
  const source=fs.readFileSync(require.resolve('../extension/route-probe.js'),'utf8');for(const match of source.matchAll(/fail\('([^']+)'\)/g))assert(Object.hasOwn(Probe.guardCodes,match[1]),'Unmapped fixed denial: '+match[1]);
  for(const[options,code]of [[{verified:false},110],[{verified:true,moduleHash:Driving.PIN,expectedPace:NaN},111],[{verified:true,moduleHash:Driving.PIN,expectedPace:1.3},101]])assert.equal(Probe.capture({},options).forwardGuardCode,code);
 });
 test('real forward mailbox admission reports unavailable, occupied, other owner and changed identity',()=>{
  const hash=Driving.PIN,abi=Geometry.abiForHash(hash),memory=new WebAssembly.Memory({initial:Math.ceil((abi.bitmap+32768)/65536),maximum:65536,shared:true}),view=new DataView(memory.buffer),identity={};
  const make=options=>new Geometry.Controller(memory,{verified:true,installed:true,moduleHash:hash,moduleIdentity:identity,...options});
  assert.throws(()=>make().claim(),e=>e.forwardGuardCode===20);
  for(let p=abi.base&-16384;p<abi.base+abi.size;p+=16384){const pg=p>>>14,b=abi.bitmap+(pg>>>3);view.setUint8(b,view.getUint8(b)|(1<<(pg&7)));}
  view.setUint8(abi.base+100,7);assert.throws(()=>make().claim(),e=>e.forwardGuardCode===23);view.setUint8(abi.base+100,0);
  const owner=make();owner.claim();assert.throws(()=>make({moduleIdentity:{}}).claim(),e=>e.forwardGuardCode===22);view.setUint32(abi.base,0,true);assert.throws(()=>owner.claim(),e=>e.forwardGuardCode===24);
 });
}

{
 async function fixture(){const f=await world('93cfc6e9',{pace:1.8});f.session=new Driving.Controller(f.memory,{installed:true,verified:true,moduleHash:f.profile.moduleHash,moduleIdentity:{}});return f;}
 const options=f=>({verified:true,moduleHash:f.profile.moduleHash,expectedPace:1.8});
 test('exact93cf route probe distinguishes committed page, node order/type/ownership and pace denials',async()=>{
  const f=await fixture();assert.equal(Probe.capture(f.memory,options(f)).status,'captured');
  const at=f.abi.bitmap+(f.nodeBase>>>14>>>3),oldByte=f.view.getUint8(at);f.view.setUint8(at,oldByte&~(1<<((f.nodeBase>>>14)&7)));assert.equal(Probe.capture(f.memory,options(f)).forwardGuardCode,104);f.view.setUint8(at,oldByte);
  for(const[p,n,value,code]of [[f.nodeBase+128+84,4,0,130],[f.nodeBase,4,0x785370,131],[f.nodeBase+100,4,0,143],[f.group+10,2,1,135],[f.group+140+12,4,1,136],[0xd0d100+60,4,175,123],[f.trackInfo+0x8a,2,4014,125]]){
   const old=n===2?f.view.getUint16(p,true):f.u(p);if(n===2)f.h(p,value);else f.u(p,value);const result=Probe.capture(f.memory,options(f));assert.equal(result.status,'unavailable');assert.equal(result.forwardGuardCode,code);if(n===2)f.h(p,old);else f.u(p,old);
  }
 });
 test('exact93cf successful capture publishes the native cap without a failure code and Stop clears it',async()=>{
  const f=await fixture(),result=f.capture();assert.equal(result.forwardState,'armed');assert.equal(result.forwardGuardCode,undefined);assert.equal(result.forwardFailureCode,undefined);assert(f.target(180)<180);assert.equal(f.session.stop().forwardGuardCode,undefined);assert.equal(f.target(180),180);
 });
 test('exact93cf native rejection10 remains separate from forward guard stage30',async()=>{
  const f=await fixture();f.view.setUint8(f.ride+0x14,255);const result=f.capture({expectedNativeCode:10});assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,30);assert.equal(result.forwardFailureCode,10);assert.equal(f.target(180),180);assert.equal(f.session.stop().forwardGuardCode,undefined);
 });
 test('exact93cf publication, points, identity, freshness and native policy receipt failures stay bounded',async()=>{
  for(const[mutate,code]of [[f=>f.u(f.abi.base+24,1),31],[f=>f.f32(f.abi.base+132,NaN),32],[f=>f.u(0x86346c,f.u(0x86346c)+1),33],[f=>f.u(f.abi.base+2008,(f.u(0x86518c)-5000)>>>0),34],[f=>f.f32(f.abi.base+620,1.1),35],[f=>f.f32(f.nodeBase+128+84,0),130]]){
   const f=await fixture(),result=f.capture({beforePoll:mutate});assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,code);assert.equal(result.forwardFailureCode,undefined);assert.equal(f.target(180),180);assert.equal(f.session.stop().forwardGuardCode,undefined);
  }
 });
 test('exact93cf missing native acknowledgement and ownership change report timeout28 and owner29',async()=>{
  for(const[mutate,code]of [[f=>f.session.geometry.pending.time=Date.now()-3000,28],[f=>f.u(f.abi.base,0),29]]){
   const f=await fixture();assert.equal(f.session.update(f.options).forwardState,'requested');mutate(f);const result=f.session.update(f.options);assert.equal(result.forwardState,'unknown');assert.equal(result.forwardGuardCode,code);assert.equal(f.target(180),180);assert.equal(f.session.stop().forwardGuardCode,undefined);
  }
 });
 test('exact native byte direction0/1 ignores adjacent data while actual invalid bytes2/255 still reject',async()=>{
  const f=await fixture();for(const direction of[0,1]){
   for(const[off,value]of [[0x10,direction],[0x11,0xa5],[0x12,0x5a],[0x13,0x37]])f.view.setUint8(f.driver+off,value);
   assert(f.view.getUint32(f.driver+0x10,true)>1);const before=Buffer.from(f.data.subarray(0,0x1000000)),result=Probe.capture(f.memory,options(f));assert.equal(result.status,'captured');assert.equal(result.physical.nativeDirection,direction);assert.deepEqual(Buffer.from(f.data.subarray(0,0x1000000)),before);
  }
  for(const direction of[2,255]){f.view.setUint8(f.driver+0x10,direction);const result=Probe.capture(f.memory,options(f));assert.equal(result.status,'unavailable');assert.equal(result.reason,'native-direction-invalid');assert.equal(result.forwardGuardCode,141);}
  f.view.setUint8(f.driver+0x10,1);const native=f.capture();assert.equal(native.forwardState,'armed');assert.equal(native.forwardGuardCode,undefined);assert(f.target(180)<180);f.session.stop();
 });
}
