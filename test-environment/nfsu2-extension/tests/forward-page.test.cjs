'use strict';
const test=require('node:test').test,assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
// Execute the existing diagnostics-page fixture; only its AI/DOM/controller
// doubles are mocked. Production page.js and diagnostics.js run unchanged.
const file=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(file);
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.fixture=fixture;',context,{filename:file});
const modern=require('../extension/modern-profile.js'),TP=require('../extension/tool-profiles.js');
const profile={...modern,capabilities:{...modern.capabilities,nativeForwardGeometry:true,nativeForwardClamp:true,dyno:true,fullTuner:false}};
const neutral=state=>({forwardState:state,forwardSamples:0,forwardHorizon:0,forwardPriorityTurns:0,forwardLeaseTicks:0,forwardCaptured:false,forwardNativeApplied:false,forwardLiveVerified:false});
async function fixture(options={}){
 const log={instances:[],updates:[],stops:[],invalidations:[],result:null};
 const forwardDriving={Controller:class{
  constructor(memory,settings){this.memory=memory;this.settings=settings;log.instances.push(this);}
  stop(){log.stops.push(this);return neutral('off');}
  invalidate(){log.invalidations.push(this);return neutral('off');}
  update(input){log.updates.push({controller:this,input});if(log.result)return log.result;
   const eligible=input.enabled&&input.safe&&input.offline&&input.ordinaryRace&&input.aiState?.active&&input.aiState?.owned&&!input.aiState?.switching&&!input.handbackPending;
   return eligible?input.applyTarget!==true?{...neutral('observed'),forwardCaptured:true,forwardSamples:24,forwardHorizon:120,forwardPriorityTurns:2}:{...neutral('armed'),forwardCaptured:true,forwardSamples:24,forwardHorizon:120,forwardPriorityTurns:2,forwardRequestedTarget:12.25,forwardLeaseTicks:400}:neutral(input.enabled?'waiting':'off');}
 }};
 const f=await context.fixture(null,true,options.dyno===true,{revision:profile.revision,profile:options.profile||profile,forwardDriving});
 f.aiLog.mailbox={4:6};return Object.assign(f,{forwardLog:log});
}
function road(f){f.put(0x89e7b0,1);f.drive(1);f.put(f.race,4);}
function arm(f){road(f);f.aiLog.owned=true;f.aiLog.paceApplied=1;f.change('race-only-ai',true);f.change('adaptive-race',true);f.run(8);}
const last=f=>f.forwardLog.updates.at(-1)?.input;
async function exported(f){f.click('diagnostic-export');return JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;}

test('page creates only installed current forward controller and keeps it off by default',async()=>{
 const f=await fixture();assert.equal(f.forwardLog.instances.length,1);const instance=f.forwardLog.instances[0];
 assert.equal(instance.memory,f.memory);assert.equal(instance.settings.moduleIdentity,f.gameModule);assert.equal(instance.settings.moduleHash,profile.hash);assert.equal(instance.settings.verified,true);assert.equal(instance.settings.installed,true);
 f.run(8);assert.equal(last(f).enabled,false);assert.equal(f.nodes['adaptive-race'].checked,false);assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);
 for(const caps of [{nativeForwardGeometry:false},{nativeForwardClamp:false}]){
  const old=await fixture({profile:{...profile,capabilities:{...profile.capabilities,...caps}}});old.run(2);assert.equal(old.forwardLog.instances.length,0);assert.equal(old.forwardLog.updates.length,0);
 }
});

test('eligible solo road race forwards current AI generation, effective pace and policy',async()=>{
 const f=await fixture();arm(f);const u=last(f),ai=f.aiLog.updates.at(-1);
 assert.equal(u.enabled,true);assert.equal(u.safe,true);assert.equal(u.offline,true);assert.equal(u.ordinaryRace,true);assert.equal(u.aiState.active,true);assert.equal(u.aiState.owned,true);assert.equal(u.aiState.ownerSequence,6);
 assert.equal(u.expectedPace,ai.adaptivePace??ai.pace);assert.equal(u.expectedPace,1.3);assert.equal(u.applyTarget,'native-policy');assert.equal(u.handbackPending,false);assert.match(u.identity,/^1:/);
 assert.equal(u.policy.mode,'native');assert.equal(u.policy.lateralAcceleration,undefined);assert.equal(u.policy.brakingDeceleration,undefined);assert.equal(u.policy.brakingFactor,.75);assert.equal(u.policy.cornerFactor,.8);assert.equal(u.policy.sharpMargin,15);
 f.input('race-braking',.6);f.input('race-corner-factor',.85);f.input('race-corner-margin',20);f.aiLog.mailbox[4]=8;f.run(2);
 assert.equal(last(f).aiState.ownerSequence,8);assert.equal(last(f).policy.brakingFactor,.6);assert.equal(last(f).policy.cornerFactor,.85);assert.equal(last(f).policy.sharpMargin,20);
});

test('same-object special modes and menus withhold the applicable forward gates',async()=>{
 const cases=[
  {name:'Street X',mark:f=>f.d.setUint8(0x89e7e3,1),ordinary:false,enabled:false,offline:true},
  {name:'Street X forced',mark:f=>f.put(0x89010c,1),ordinary:false,enabled:false,offline:true},
  {name:'Drag',mark:f=>f.d.setUint8(0x89e7d8,1),ordinary:false,enabled:false,offline:true},
  {name:'Drift',mark:f=>f.d.setUint8(0x89e7d9,1),ordinary:false,enabled:false,offline:true},
  {name:'Online opt-in',mark:f=>{f.put(0x850078,8);f.change('online',true);},ordinary:true,enabled:true,offline:false},
  {name:'menu',mark:f=>f.gameDialog(true),ordinary:true,enabled:false,offline:true,safe:false},
  {name:'free roam',mark:f=>{f.put(0x89e7b0,0);f.drive(2);},ordinary:false,enabled:false,offline:true},
  {name:'results',mark:f=>f.put(f.race,6),ordinary:true,enabled:false,offline:true,safe:false},
 ];
 for(const c of cases){const f=await fixture();arm(f);c.mark(f);f.run(8);const u=last(f);
  assert.equal(u.ordinaryRace,c.ordinary,c.name);assert.equal(u.enabled,c.enabled,c.name);assert.equal(u.offline,c.offline,c.name);if(c.safe!==undefined)assert.equal(u.safe,c.safe,c.name);
  assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/,c.name);
 }
});

test('missing native ownership and a switching driver remain explicit to the wrapper',async()=>{
 const f=await fixture();arm(f);f.aiLog.owned=false;f.run();assert.equal(last(f).aiState.owned,false);assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);
 f.aiLog.owned=true;f.aiLog.cornerContext={switching:true};f.run();assert.equal(last(f).aiState.switching,true);assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);
});

test('Stop, manual takeover, blur, hidden page and pagehide cancel immediately',async()=>{
 for(const action of [f=>f.press('F9'),f=>f.press('F7'),f=>f.press('ArrowLeft'),f=>f.focus(false),f=>f.hidden(true),f=>f.pageEvent('pagehide')]){
  const f=await fixture();arm(f);const before=f.forwardLog.stops.length;action(f);assert.ok(f.forwardLog.stops.length>before);
  assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);const d=await exported(f);assert.equal(d.forwardState,'off');assert.equal(d.forwardCaptured,false);assert.equal(d.forwardNativeApplied,false);assert.equal(d.forwardLiveVerified,false);
 }
});

test('tuner search suspends forward driving and skips page updates while busy',async()=>{
 const f=await fixture({dyno:true});arm(f);f.change('dyno-enable',true);const before=f.forwardLog.stops.length;f.click('dyno-find');assert.ok(f.forwardLog.stops.length>before);assert.equal(f.dynoLog.instance.busy,true);
 const count=f.forwardLog.updates.length;f.run(8);assert.equal(f.forwardLog.updates.length,count);assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);
 f.click('dyno-cancel');await new Promise(resolve=>setImmediate(resolve));
});

test('profile Load cancels forward requests and resets its session-only adaptive selection',async()=>{
 const f=await fixture();f.input('profile-name','Forward lifecycle');f.click('profile-save');const saved=JSON.parse(f.profileStorage.get(TP.KEY)).profiles[0];
 assert.equal('adaptiveRace' in saved.settings,false);arm(f);const before=f.forwardLog.stops.length;f.change('profile-select',saved.id);f.click('profile-load');
 assert.ok(f.forwardLog.stops.length>before);assert.equal(f.nodes['adaptive-race'].checked,false);assert.equal(f.nodes['race-only-ai'].checked,false);f.run();assert.equal(last(f).enabled,false);assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);
});

test('worker replacement invalidates old forward owner before constructing its replacement',async()=>{
 const f=await fixture();arm(f);const old=f.forwardLog.instances[0],nextWorker=f.createWorker(),mod=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));
 nextWorker.postMessage({mod,memory:f.memory,slot:0});nextWorker.emit({t:'register',kind:5,ptr:f.status});assert.equal(f.forwardLog.invalidations[0],old);assert.equal(f.forwardLog.instances.length,2);
 const next=f.forwardLog.instances[1];assert.equal(next.settings.moduleIdentity,mod);assert.equal(next.memory,f.memory);assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);
 f.run(2);assert.equal(f.forwardLog.updates.at(-1).controller,next);assert.match(last(f).identity,/^2:/);
 const count=f.forwardLog.invalidations.length;f.worker.emit({t:'exit'});assert.equal(f.forwardLog.invalidations.length,count);
 nextWorker.emit({t:'trap'});assert.equal(f.forwardLog.invalidations.at(-1),next);assert.doesNotMatch(f.nodes['forward-race-state'].textContent,/target requested/);
});

test('UI and diagnostics describe read-only preview without publishing an assumed speed target',async()=>{
 const f=await fixture();arm(f);assert.match(f.nodes['forward-race-state'].textContent,/Read-only road preview/);assert.match(f.nodes['forward-race-state'].title,/not a native application acknowledgement/);
 const d=await exported(f);assert.equal(d.forwardState,'observed');assert.equal(d.forwardSamples,24);assert.equal(d.forwardHorizon,120);assert.equal(d.forwardPriorityTurns,2);assert.equal(d.forwardRequestedTarget,undefined);assert.equal(d.forwardLeaseTicks,0);assert.equal(d.forwardCaptured,true);assert.equal(d.forwardNativeApplied,false);assert.equal(d.forwardLiveVerified,false);
 assert.doesNotMatch(JSON.stringify(d),/ownerSequence|moduleIdentity/);
});

test('settings cancellation clears the exported request before another game tick',async()=>{
 for(const change of [f=>f.input('race-braking',.6),f=>f.change('online',true)]){
  const f=await fixture();arm(f);assert.match(f.nodes['forward-race-state'].textContent,/Read-only road preview/);
  const before=f.forwardLog.stops.length;change(f);assert.ok(f.forwardLog.stops.length>before);
  const d=await exported(f);assert.equal(d.forwardState,'off');assert.equal(d.forwardCaptured,false);
  for(const key of ['forwardSamples','forwardHorizon','forwardPriorityTurns','forwardRequestedTarget','forwardLeaseTicks'])assert.equal(key in d,false,key);
 }
});

test('diagnostics reject out-of-range forward values and never export raw mock details',async()=>{
 const f=await fixture();arm(f);f.forwardLog.result={forwardState:'SECRET route message',forwardSamples:49,forwardHorizon:Infinity,forwardPriorityTurns:-1,forwardRequestedTarget:151,forwardLeaseTicks:401,forwardCaptured:true,forwardNativeApplied:true,forwardLiveVerified:true,raw:'SECRET position and car data'};
 f.run();const d=await exported(f);for(const key of ['forwardState','forwardSamples','forwardHorizon','forwardPriorityTurns','forwardRequestedTarget','forwardLeaseTicks','forwardNativeApplied','forwardLiveVerified','raw'])assert.equal(key in d,false,key);
 assert.equal(d.forwardCaptured,true);assert.doesNotMatch(f.storedLog(),/SECRET|ownerSequence|moduleIdentity/);assert.ok(f.storedLog().length<=65536);
});

test('bounded native failure codes survive export and clear immediately on Stop',async()=>{
 const f=await fixture();arm(f);f.forwardLog.result={...neutral('unknown'),forwardFailureCode:10};f.run();
 assert.equal((await exported(f)).forwardFailureCode,10);
 f.press('F9');assert.equal((await exported(f)).forwardFailureCode,undefined);
 const d=require('../extension/diagnostics.js').create();
 for(const forwardFailureCode of [0,11,1.5,'10',NaN,Infinity]){d.record('state',{forwardFailureCode});assert.equal(JSON.parse(d.exportText()).events.at(-1).data.forwardFailureCode,undefined);}
});
