'use strict';
const {test,afterEach}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
// Production page/diagnostics/engine/controller run unchanged. Only the native
// mailbox, AI telemetry and browser surfaces are controlled test doubles.
// Cache samples and synthetic receipts establish no live-game physics result.
const fixtureFile=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(fixtureFile);
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(fixtureFile,'utf8')+'\nthis.makeCalculatedFixture=fixture;',context,{filename:fixtureFile});
const {Controller}=require('../extension/paced-catchup-controller.js'),modern=require('../extension/modern-profile.js'),Profiles=require('../extension/tool-profiles.js');
const PROFILE={...modern,capabilities:{...modern.capabilities,nativePacedCatchup:true,nativeRubberband:true,nativeCornerTarget:true,nativeForwardGeometry:true,nativeForwardClamp:true,dyno:true,fullTuner:false}};
const fixtures=[];
afterEach(()=>{
 for(const f of fixtures.splice(0))for(const command of f.rubberbandLog.commands){
  if(command.enabled){const i=command.input;assert.equal(i.safe,true);assert.equal(i.ordinaryRace,true);assert.equal(i.aiState.active,true);assert.equal(i.aiState.owned,true);assert.equal(i.featureOwnsPace,true);assert.equal(i.selectedPace,command.percent/100);assert.equal(i.customPower,1);assert.equal(i.customGrip,1);assert.equal(command.stackingReady,true);if(i.network)assert.equal(i.allowNetwork,true);}
  else{assert.equal(command.percent,100);assert.equal(command.strength,1);assert.equal(command.stackingReady,false);}
 }
});
async function fixture(options={}){
  const native={command:0,ack:null,publication:0,guard:false,sourceFactor:Math.fround(1.485),physicsKind:1,stage:14,rejectCode:null},log={instances:[],updates:[],commands:[],throwUpdate:false},forward={updates:[],stops:0};
 const protocol={
  supports:hash=>hash===PROFILE.hash,select:hash=>hash===PROFILE.hash?{mailbox:{base:0xd0d100}}:null,claim:()=>true,
  command(memory,{enabled,percent,strength=1,stackingReady,forceGeneration}){
   const low=percent|(enabled?256:0)|(stackingReady?512:0)|(Math.round((strength-1)*4)<<10);
   if((native.command&65535)!==low||!(native.command>>>16)||forceGeneration)native.command=(((((native.command>>>16)%65535)+1)<<16)|low)>>>0;
   log.commands.push({enabled,percent,strength,stackingReady,command:native.command,input:log.updates.at(-1)?.input});return native.command;
  },
  readAck:()=>native.ack?.command===native.command?native.ack:null,
  readEvidence(){const ack=this.readAck();return{ack:native.rejectCode===null?ack:null,ackRejectCode:native.rejectCode??(ack?0:3),physicsKind:native.physicsKind,evidenceKind:native.physicsKind===3?'combined-grip':'four-tires',nativeStage:native.stage};}
 };
 const rubberbandController={Controller:class extends Controller{
  constructor(memory,settings){super(memory,{...settings,protocol});log.instances.push(this);}
  update(input){if(log.throwUpdate)throw Error('controlled observer failure');log.updates.push({controller:this,input});return super.update(input);}
 }};
 const forwardDriving={Controller:class{
  stop(){forward.stops++;return{forwardState:'off',forwardNativeApplied:false,forwardLiveVerified:false};}
  invalidate(){return this.stop();}
  update(input){forward.updates.push(input);return{forwardState:input.enabled?'observed':'off',forwardCaptured:false,forwardNativeApplied:false,forwardLiveVerified:false};}
 }};
 const profile=options.profile||PROFILE;
 const f=await context.makeCalculatedFixture(null,true,options.dyno===true,{...options,revision:profile.revision,profile,pacedCatchup:protocol,pacedCatchupController:rubberbandController,forwardDriving});
 f.aiLog.owned=true;f.aiLog.mailbox={4:6};f.aiLog.paceApplied=1;f.put(0x89e7f8,1);
 Object.assign(f,{rubberbandLog:log,native,forwardLog:forward});
 f.sampleFactors=(driver=1.485,car=1.485)=>{
  native.sourceFactor=Math.fround(car);f.aiLog.cornerContext={catchupTelemetryStatus:'sampled',catchupDriverVerified:true,catchupDriverFactor:Math.fround(driver),catchupCarFactor:native.sourceFactor};
  f.d.setFloat32(f.car+0x468,car,true);
 };
 f.sampleFactors();
  f.emitAck=(extra={})=>{native.publication=(native.publication+1)%32768;const enabled=!!(native.command&256),applied=enabled&&!native.guard,percent=applied?native.command&255:100,strength=applied?1+((native.command>>>10)&63)/4:1,p=Math.fround(percent/100),m=native.sourceFactor,e=Math.fround(Math.fround(m*p)*strength),t=Math.fround(e*p);native.ack={command:native.command,percent,strength,strengthCode:Math.round((strength-1)*4),ownerSequence:f.aiLog.mailbox[4],car:f.car,publisher:1,reason:applied?1:enabled?3:2,publication:native.publication,sourceFactor:m,powerFactor:e,tireFactor:t,scalarFactor:e,aeroDivisor:e,physicsKind:native.physicsKind,evidenceKind:native.physicsKind===3?'combined-grip':'four-tires',wheelHits:native.physicsKind===3?0:4,gripHits:native.physicsKind===3?1:0,combinedGripFactor:native.physicsKind===3?39.25:null,outputsVerified:true,...extra};f.aiLog.paceApplied=applied?percent/100:1;};
 f.confirm=()=>{f.emitAck();f.run();f.emitAck();f.run();};
 f.snapshot=()=>log.instances.at(-1)?.status();fixtures.push(f);
 if(log.instances.length){f.run();f.confirm();assert.equal(f.snapshot().state,'off');}
 return f;
}
function road(f){f.put(0x89e7b0,1);f.drive(1);f.put(f.race,4);}
function enable(f){road(f);f.change('rubberband-enable',true);f.run();}
function last(f){return f.rubberbandLog.updates.at(-1)?.input;}
function neutral(f){assert.equal(f.read(0x2dc),.5);for(const w of f.wheels)assert.equal(f.d.getFloat32(w+0x188,true),1);}
async function exported(f){f.click('diagnostic-export');return JSON.parse(await f.downloads.at(-1).text());}
async function data(f){return(await exported(f)).events.at(-1).data;}

test('paired mode defaults selected at200 without starting manual AI and bounds its session pace slider',async()=>{
 const f=await fixture(),c=f.rubberbandLog.instances[0];assert.equal(c.memory,f.memory);assert.equal(c.moduleIdentity,f.gameModule);assert.equal(c.moduleHash,PROFILE.hash);assert.equal(c.installed,true);assert.equal(c.verified,true);
 assert.equal(f.nodes['rubberband-enable'].checked,true);assert.equal(f.nodes['rubberband-enable'].disabled,false);assert.equal(f.nodes['race-only-ai'].checked,false);assert.notEqual(f.prefs().ai,true);assert.equal(last(f).percent,200);assert.equal(last(f).enabled,true);assert.equal(f.snapshot().commandEnabled,false);assert.match(f.html(),/id="rubberband-percent"[^>]*max="200"[^>]*step="5"/);
 for(const [input,expected]of [[99,100],[201,200],[153,155],['',200],['bad',200]]){f.input('rubberband-percent',input);assert.equal(Number(f.nodes['rubberband-percent'].value),expected);assert.equal(f.snapshot().commandEnabled,false);}
 assert.match(f.html(),/id="rubberband-strength"[^>]*value="1"[^>]*max="10"[^>]*step="0\.25"/);
 for(const [input,expected]of [[.5,1],[11,10],[1.38,1.5],['',1],['bad',1]]){f.input('rubberband-strength',input);assert.equal(Number(f.nodes['rubberband-strength'].value),expected);assert.equal(f.snapshot().commandEnabled,false);}
 road(f);f.change('ai',true);f.run();assert.equal(f.aiLog.updates.at(-1).pace,2);assert.equal((await data(f)).pacedCatchupEligible,true);assert.equal(f.snapshot().commandEnabled,true);assert.equal(f.snapshot().active,false);
 const old=await fixture({profile:{...PROFILE,capabilities:{...PROFILE.capabilities,nativePacedCatchup:false}}});assert.equal(old.rubberbandLog.instances.length,0);assert.equal(old.nodes['rubberband-enable'].disabled,true);road(old);old.input('race-pace-factor',1.5);old.change('race-pace',true);old.change('ai',true);old.run();assert.equal(old.aiLog.updates.at(-1).pace,1.5);
});

test('selecting paired mode arms race-only AI and forwards verified gain separately from selected pace',async()=>{
 const f=await fixture();f.input('race-corner-factor',.85);f.input('race-corner-margin',20);f.input('race-braking',.6);f.input('race-pace-factor',2);f.change('race-pace',true);enable(f);
 const u=last(f),ai=f.aiLog.updates.at(-1),forward=f.forwardLog.updates.at(-1);
 assert.equal(f.nodes['race-only-ai'].checked,true);assert.equal(f.prefs().ai,false);assert.equal(u.enabled,true);assert.equal(u.percent,200);assert.equal(u.selectedPace,2);assert.equal(u.featureOwnsPace,true);assert.equal(ai.pace,2);assert.equal(ai.adaptivePace,2);assert.equal(ai.raceCornerAssist,true);assert.equal(ai.adaptiveCorners,true);assert.equal(ai.raceCornerFactor,.95);assert.equal(ai.raceCornerMargin,0);assert.equal(ai.raceBraking,1);
 assert.equal(forward.enabled,true);assert.equal(forward.applyTarget,'native-policy');assert.equal(forward.expectedPace,2);assert.equal(forward.gain.active,false);assert.deepEqual(JSON.parse(JSON.stringify(forward.policy)),{mode:'native',brakingFactor:1,cornerFactor:1,sharpMargin:0,reactionSeconds:.1,marginDistance:0});
  assert.equal(f.aiLog.paceApplied,1,'The controlled native acknowledgement remains neutral before physical publication');
  assert.match(f.nodes['race-pace-state'].textContent,/requested 2\.00× · awaiting physics/);assert.doesNotMatch(f.nodes['race-pace-state'].textContent,/\blive\b|physics confirmed/);
  let d=await data(f);assert.equal(d.requestedPace,2);assert.equal(d.paceApplied,1);assert.equal(d.rubberbandActive,false);assert.equal(d.pacedOutputsVerified,false);assert.equal('rubberbandAppliedPercent' in d,false);
  f.aiLog.paceApplied=2;f.run();assert.equal(f.snapshot().active,false);assert.match(f.nodes['race-pace-state'].textContent,/requested 2\.00× · awaiting physics/);assert.doesNotMatch(f.nodes['race-pace-state'].textContent,/physics confirmed/);
  d=await data(f);assert.equal(d.paceApplied,2);assert.equal(d.pacedOutputsVerified,false);
  f.confirm();assert.equal(f.forwardLog.updates.at(-1).gain.active,true);assert.equal(f.forwardLog.updates.at(-1).gain.tireFactor,Math.fround(Math.fround(f.native.sourceFactor*2)*2));assert.match(f.nodes['race-pace-state'].textContent,/requested 2\.00× · physics confirmed/);
 assert.equal(f.prefs().raceCornerFactor,.85);assert.equal(f.prefs().raceCornerMargin,20);assert.equal(f.prefs().raceBraking,.6);assert.equal(f.prefs().racePaceFactor,2);
  f.change('rubberband-enable',false);f.change('adaptive-race',true);f.run();const custom=f.forwardLog.updates.at(-1);assert.equal(custom.expectedPace,1.3);assert.equal(custom.policy.cornerFactor,.85);assert.equal(custom.policy.sharpMargin,20);assert.equal(custom.policy.brakingFactor,.6);assert.match(f.nodes['race-pace-state'].textContent,/requested 1\.30×/);assert.doesNotMatch(f.nodes['race-pace-state'].textContent,/\blive\b|awaiting physics|physics confirmed/);
});

test('race-only arming does not acquire driving in free roam',async()=>{
 const f=await fixture();f.change('rubberband-enable',true);f.run();assert.equal(f.nodes['race-only-ai'].checked,true);assert.equal(f.prefs().ai,false);assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(last(f).ordinaryRace,false);assert.equal((await data(f)).pacedCatchupEligible,false);
 road(f);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.equal(last(f).featureOwnsPace,true);assert.equal(f.aiLog.updates.at(-1).pace,2);assert.equal(f.snapshot().commandEnabled,true);
});

test('legacy power/governor/grip are physically restored for calculated mode and parked until observer restoration',async()=>{
 const f=await fixture();f.input('power',2);f.input('grip-factor',1.8);f.change('boost',true);f.change('unlimit',true);f.change('grip',true);f.run(5);assert.equal(f.read(0x2dc),1);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),Math.fround(1.8));
 enable(f);neutral(f);assert.equal(f.read(0x2c0),150);assert.equal(last(f).customPower,1);assert.equal(last(f).customGrip,1);assert.equal(last(f).customBoost,false);assert.equal(last(f).customUnlimit,false);
 assert.equal(f.prefs().boost,true);assert.equal(f.prefs().unlimit,true);assert.equal(f.prefs().grip,true);assert.equal(f.prefs().power,2);assert.equal(f.prefs().gripFactor,1.8);f.run(5);neutral(f);
 f.change('rubberband-enable',false);assert.equal(f.snapshot().state,'reset-pending');f.run(5);neutral(f);assert.match(f.nodes['rubberband-state'].textContent,/restoration pending/);f.confirm();f.run(5);assert.equal(f.snapshot().state,'off');assert.equal(f.read(0x2dc),1);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),Math.fround(1.8));
});

test('foreign power or grip changes remain untouched and veto neutral calculated eligibility',async()=>{
 for(const field of ['power','grip']){
  const f=await fixture();f.change('boost',true);f.change('grip',true);f.run(5);f.sampleFactors();
  if(field==='power')f.set(0x2dc,.9);else f.d.setFloat32(f.wheels[0]+0x188,1.7,true);
  enable(f);assert.notEqual(last(f)[field==='power'?'customPower':'customGrip'],1,field);assert.equal((await data(f)).pacedCatchupEligible,false,field);assert.match(f.nodes['rubberband-state'].textContent,/restoration/,field);f.run(4);
  if(field==='power')assert.equal(f.read(0x2dc),Math.fround(.9));else assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),Math.fround(1.7));
 }
});

test('Street X and every protected mode retain saved controls and cannot acquire calculated-mode ownership',async()=>{
 const cases=[['Street X',f=>f.d.setUint8(0x89e7e3,1)],['forced Street X',f=>f.put(0x89010c,1)],['Drag',f=>f.d.setUint8(0x89e7d8,1)],['forced Drag',f=>f.put(0x890108,1)],['Drift',f=>f.d.setUint8(0x89e7d9,1)],['forced Drift',f=>f.put(0x890104,1)],['Drift variant',f=>f.put(0x890114,1)],['Outrun',f=>f.put(0x89e7b0,7)],['free roam',f=>{f.put(0x89e7b0,0);f.drive(2);}]];
 for(const [name,mark] of cases){const f=await fixture();f.input('race-corner-factor',.85);f.input('race-corner-margin',20);f.input('race-braking',.6);road(f);mark(f);f.change('rubberband-enable',true);f.run();assert.equal(last(f).ordinaryRace,false,name);assert.equal(last(f).featureOwnsPace,false,name);assert.equal((await data(f)).pacedCatchupEligible,false,name);assert.equal(f.aiLog.updates.at(-1).raceCornerFactor,.85,name);assert.equal(f.aiLog.updates.at(-1).raceCornerMargin,20,name);assert.equal(f.aiLog.updates.at(-1).raceBraking,.6,name);}
});

test('online paired eligibility requires literal consent and withdrawal removes On without changing network flags',async()=>{
 const f=await fixture();road(f);f.sampleFactors();f.put(0x850078,8);f.change('rubberband-enable',true);f.run();assert.equal(last(f).network,true);assert.equal(last(f).allowNetwork,false);assert.equal((await data(f)).pacedCatchupEligible,false);
 f.change('online',true);f.run();assert.equal(last(f).ordinaryRace,true);assert.equal(last(f).allowNetwork,true);assert.equal(f.snapshot().commandEnabled,true);f.confirm();assert.equal((await data(f)).pacedCatchupEligible,true);assert.match(f.nodes['rubberband-state'].textContent,/Pace 2\.00×/);
 f.change('boost',true);f.change('grip',true);f.change('online',false);f.run();assert.equal((await data(f)).pacedCatchupEligible,false);neutral(f);assert.equal(f.d.getUint32(0x850078,true),8);
});

test('native source caches stay distinct from verified paired output claims and Catch Up On is never forced',async()=>{
 const f=await fixture();enable(f);f.confirm();const nativeBefore=f.d.getFloat32(f.car+0x468,true),m=f.native.sourceFactor,e=Math.fround(m*2),t=Math.fround(e*2),d=await data(f);
 assert.equal(f.snapshot().state,'applied');assert.equal(f.snapshot().active,true);assert.equal(f.snapshot().sourceFactor,m);assert.equal(f.snapshot().powerFactor,e);assert.equal(f.snapshot().tireFactor,t);assert.equal(d.rubberbandAppliedPercent,200);assert.equal(d.rubberbandActive,true);assert.equal(d.pacedSourceFactor,1.485);assert.equal(d.pacedPowerFactor,2.97);assert.equal(d.pacedTireFactor,5.94);assert.equal(d.catchupDriverFactor,1.485);assert.equal(d.catchupCarFactor,1.485);assert.equal(d.nativeCatchupOn,true);assert.match(f.nodes['rubberband-state'].textContent,/Pace 2\.00× · strength 1\.00× · four-tire input 5\.940/);assert.match(f.nodes['rubberband-state'].title,/handling inputs.*no measured engine-power, grip or speed claim/);assert.equal(f.d.getFloat32(f.car+0x468,true),nativeBefore);
 f.put(0x89e7f8,0);f.native.guard=true;f.confirm();assert.equal(f.snapshot().state,'guarded-native');assert.equal(f.snapshot().active,false);assert.equal(f.snapshot().tireFactor,null);assert.match(f.nodes['rubberband-state'].textContent,/Game Catch Up is off/);assert.equal((await data(f)).nativeCatchupOn,false);assert.equal(f.d.getUint32(0x89e7f8,true),0);assert.equal(f.d.getFloat32(f.car+0x468,true),nativeBefore);
});

test('race exit drops calculated ownership and leaves native factors untouched',async()=>{
 const f=await fixture();f.change('boost',true);f.change('grip',true);f.run(4);f.sampleFactors();enable(f);neutral(f);const nativeBefore=f.d.getFloat32(f.car+0x468,true);f.put(0x89e7b0,0);f.drive(2);f.run();assert.equal(last(f).featureOwnsPace,false);assert.equal((await data(f)).pacedCatchupEligible,false);assert.equal(f.d.getFloat32(f.car+0x468,true),nativeBefore);
});

test('Stop disables calculated selection, preserves numeric settings/profiles, and awaits the actual Off receipt',async()=>{
 const f=await fixture();f.input('power',2);f.input('grip-factor',1.8);f.input('profile-name','Calculated preservation');f.click('profile-save');const saved=f.profileStorage.get(Profiles.KEY);f.sampleFactors();enable(f);f.press('F9');
 assert.equal(f.nodes['rubberband-enable'].checked,false);assert.equal(f.nodes['race-only-ai'].checked,false);assert.equal(f.prefs().power,2);assert.equal(f.prefs().gripFactor,1.8);assert.equal(f.profileStorage.get(Profiles.KEY),saved);assert.equal(f.snapshot().state,'reset-pending');let d=await data(f);assert.equal(d.pacedCatchupEligible,false);assert.equal(d.rubberbandActive,false);assert.equal(d.rubberbandResetPending,true);f.run(4);f.confirm();d=await data(f);assert.equal(d.rubberbandState,'off');assert.equal(d.rubberbandResetAcknowledged,true);assert.equal(f.d.getFloat32(f.car+0x468,true),Math.fround(1.485));
});

test('profile Load disables calculated mode and holds restored legacy preferences until the observer Off receipt',async()=>{
 const f=await fixture();f.input('power',2);f.input('grip-factor',1.8);f.change('boost',true);f.change('grip',true);f.input('profile-name','Saved physics');f.click('profile-save');const saved=JSON.parse(f.profileStorage.get(Profiles.KEY)).profiles[0];assert.equal('rubberband' in saved.settings,false);assert.equal('rubberbandPercent' in saved.settings,false);enable(f);f.change('profile-select',saved.id);f.click('profile-load');
 assert.equal(f.nodes['rubberband-enable'].checked,false);assert.equal(f.nodes['race-only-ai'].checked,false);assert.equal(f.prefs().boost,true);assert.equal(f.prefs().grip,true);assert.equal(f.prefs().power,2);assert.equal(f.prefs().gripFactor,1.8);assert.equal(f.snapshot().resetPending,true);f.run(4);neutral(f);f.confirm();f.run(5);assert.equal(f.read(0x2dc),1);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),Math.fround(1.8));
});

test('manual takeover immediately disables calculated selection and clears eligibility',async()=>{
 for(const action of [f=>f.press('F7'),f=>f.press('ArrowLeft'),f=>f.click('take-control')]){const f=await fixture();f.sampleFactors();enable(f);action(f);assert.equal(f.nodes['rubberband-enable'].checked,false);const d=await data(f);assert.equal(d.pacedCatchupEligible,false);assert.equal(d.rubberbandActive,false);assert.equal(d.rubberbandResetPending,true);}
});

test('diagnostics and forwarded gain discard physical claims on expiration or invalid wheel publication',async()=>{
 const f=await fixture();enable(f);f.confirm();let out=await exported(f),d=out.events.at(-1).data;assert.equal(d.tools.rubberband,true);assert.equal(d.tools.rubberbandPercent,200);assert.equal(d.pacedCatchupEligible,true);assert.equal(d.nativeCatchupOn,true);assert.equal(d.rubberbandState,'applied');assert.equal(d.rubberbandActive,true);assert.equal(d.rubberbandAppliedPercent,200);assert.equal(d.pacedOutputsVerified,true);
 const trace=out.raceTrace,row=trace.rows.at(-1);for(const key of ['pacedCatchupEligible','pacedSourceFactor','pacedPowerFactor','pacedTireFactor','pacedWheelHits','pacedOutputsVerified','rubberbandAppliedPercent'])assert(trace.columns.includes(key),key);assert.equal(row[trace.columns.indexOf('pacedTireFactor')],5.94);assert.equal(row[trace.columns.indexOf('rubberbandAppliedPercent')],200);
 f.run(22);d=await data(f);assert.equal(d.rubberbandState,'waiting');assert.equal(d.rubberbandActive,false);assert.equal('rubberbandAppliedPercent' in d,false);assert.equal('pacedTireFactor' in d,false);assert.equal(d.pacedOutputsVerified,false);assert.equal(f.forwardLog.updates.at(-1).gain.active,false);assert.doesNotMatch(f.nodes['rubberband-state'].textContent,/tire input 5\.940/);assert.match(f.nodes['race-pace-state'].textContent,/awaiting physics/);assert.doesNotMatch(f.nodes['race-pace-state'].textContent,/physics confirmed/);
 f.confirm();f.emitAck({wheelHits:3});f.run();d=await data(f);assert.equal(d.rubberbandActive,false);assert.equal(d.pacedOutputsVerified,false);assert.equal('pacedTireFactor' in d,false);assert.match(f.nodes['race-pace-state'].textContent,/awaiting physics/);assert.doesNotMatch(f.nodes['race-pace-state'].textContent,/physics confirmed/);
});

test('blur, hidden page, pagehide and tuner work clear calculated eligibility and cannot certify an Off request',async()=>{
 for(const [name,action] of [['blur',f=>f.focus(false)],['hidden',f=>f.hidden(true)],['pagehide',f=>f.pageEvent('pagehide')],['tuner',f=>{f.change('dyno-enable',true);f.click('dyno-find');}]]){
  const f=await fixture({dyno:true});f.sampleFactors();enable(f);action(f);if(name!=='pagehide')f.run();const d=await data(f);assert.equal(d.pacedCatchupEligible,false,name);assert.equal(d.rubberbandActive,false,name);assert.doesNotMatch(f.nodes['rubberband-state'].textContent,/Native pace/,name);if(f.dynoLog.instance.busy){f.click('dyno-cancel');await new Promise(resolve=>setImmediate(resolve));}
 }
});

test('worker replacement discards native sample eligibility and cannot inherit an observer receipt',async()=>{
 const f=await fixture();f.sampleFactors();enable(f);const previous=f.rubberbandLog.instances[0],worker=f.createWorker(),mod=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));worker.postMessage({mod,memory:f.memory,slot:0});worker.emit({t:'register',kind:5,ptr:f.status});assert(f.rubberbandLog.updates.some(u=>u.controller===previous&&u.input.enabled===false));assert.equal(previous.status().active,false);assert.equal(f.native.command&256,0);assert.equal(f.rubberbandLog.instances.length,2);const current=f.rubberbandLog.instances[1];assert.equal(current.moduleIdentity,mod);assert.equal(current.status().state,'waiting');assert.equal(current.status().resetAcknowledged,false);const d=await data(f);assert.equal(d.pacedCatchupEligible,false);assert.equal(d.rubberbandActive,false);assert.equal(d.rubberbandResetAcknowledged,false);
});

test('an observer exception cannot leave stale calculated eligibility or claim an authored application',async()=>{
 const f=await fixture();f.sampleFactors();enable(f);f.rubberbandLog.throwUpdate=true;f.run();const d=await data(f);assert.equal(d.pacedCatchupEligible,false);assert.equal(d.rubberbandActive,false);assert.equal(d.rubberbandResetPending,true);assert.doesNotMatch(f.nodes['rubberband-state'].textContent,/Native pace/);
});

test('separate strength10 keeps pace2 and native source intact, requires fresh gain and resets native strength on Stop',async()=>{
 const f=await fixture();enable(f);f.confirm();const old=f.native.command,m=f.native.sourceFactor;
 f.input('rubberband-strength',10);f.run();assert.equal(last(f).percent,200);assert.equal(last(f).strength,10);assert.equal(last(f).selectedPace,2);assert.notEqual(f.native.command,old);assert.equal((f.native.command>>>10)&63,36);assert.equal(f.snapshot().active,false);assert.equal(f.forwardLog.updates.at(-1).gain.active,false);
 f.confirm();assert.equal(f.snapshot().active,true);assert.equal(f.snapshot().appliedStrength,10);assert.equal(f.snapshot().sourceFactor,m);assert.equal(f.snapshot().powerFactor,Math.fround(Math.fround(m*2)*10));assert.equal(f.snapshot().tireFactor,Math.fround(Math.fround(Math.fround(m*2)*10)*2));assert.equal(f.snapshot().relativePowerGain,20);assert.equal(f.snapshot().relativeTireGain,40);assert.equal(f.d.getFloat32(f.car+0x468,true),m);assert.match(f.nodes['rubberband-state'].textContent,/Pace 2\.00× · strength 10\.00× · four-tire input 59\.400/);
 const d=await data(f);assert.equal(d.tools.rubberbandPercent,200);assert.equal(d.tools.rubberbandStrength,10);assert.equal(d.pacedAppliedStrength,10);assert.equal(d.pacedPowerGain,20);assert.equal(d.pacedTireGain,40);
 f.input('profile-name','Paired strength');f.click('profile-save');const saved=JSON.parse(f.profileStorage.get(Profiles.KEY)).profiles[0];assert.equal('rubberbandStrength' in saved.settings,false);assert.equal('rubberbandPercent' in saved.settings,false);
 f.press('F9');assert.equal(f.snapshot().commandEnabled,false);assert.equal(f.native.command&255,100);assert.equal((f.native.command>>>10)&63,0);assert.equal(f.snapshot().appliedStrength,null);assert.equal(f.rubberbandLog.commands.at(-1).strength,1);assert.equal(Number(f.nodes['rubberband-strength'].value),10);
 const reloaded=await fixture();assert.equal(last(reloaded).strength,1);assert.equal(last(reloaded).percent,200);assert.notEqual(reloaded.prefs().ai,true);
});

test('a new AI owner sequence clears page gain until fresh matching physical publication arrives',async()=>{
 const f=await fixture();enable(f);f.confirm();assert.equal(last(f).ownerSequence,6);const old=f.native.command;
 f.aiLog.mailbox[4]=8;f.run();assert.equal(last(f).ownerSequence,8);assert.notEqual(f.native.command,old);assert.equal(f.snapshot().active,false);assert.equal(f.forwardLog.updates.at(-1).gain.active,false);assert.equal((await data(f)).pacedOutputsVerified,false);
 f.emitAck({ownerSequence:6});f.run();assert.equal(f.snapshot().active,false);f.confirm();assert.equal(f.snapshot().active,true);assert.equal((await data(f)).pacedOutputsVerified,true);
 f.press('F7');const off=f.native.command;f.aiLog.mailbox[4]=10;f.run();assert.equal(f.native.command,off);f.confirm();assert.equal(f.snapshot().resetAcknowledged,true);assert.equal(f.snapshot().commandEnabled,false);
});

test('page status and local diagnostics distinguish four-tire proof, combined-grip proof and rejected evidence',async()=>{
 const f=await fixture();enable(f);f.confirm();let d=await data(f);
 assert.equal(d.pacedPhysicsKind,1);assert.equal(d.pacedEvidenceKind,'four-tires');assert.equal(d.pacedAckRejectCode,0);assert.equal(d.pacedNativeStage,14);assert.match(f.nodes['rubberband-state'].textContent,/four-tire input/);assert.equal('pacedCombinedGripFactor' in d,false);
 f.native.physicsKind=3;f.native.stage=24;f.confirm();d=await data(f);
 assert.equal(f.snapshot().active,true);assert.equal(d.pacedPhysicsKind,3);assert.equal(d.pacedEvidenceKind,'combined-grip');assert.equal(d.pacedCombinedGripFactor,39.25);assert.equal(d.pacedWheelHits,0);assert.equal(d.pacedNativeStage,24);assert.equal(d.pacedOutputsVerified,true);assert.match(f.nodes['rubberband-state'].textContent,/combined-grip input 39\.250/);assert.doesNotMatch(f.nodes['rubberband-state'].textContent,/four-tire|engine power/);
 f.native.rejectCode=8;f.run();d=await data(f);
 assert.equal(d.pacedAckRejectCode,8);assert.equal(d.pacedPhysicsKind,3);assert.equal(d.pacedOutputsVerified,false);assert.equal('pacedCombinedGripFactor' in d,false);assert.match(f.nodes['race-pace-state'].textContent,/requested 2\.00× · awaiting physics/);assert.doesNotMatch(f.nodes['rubberband-state'].textContent,/input 39\.250/);
});
