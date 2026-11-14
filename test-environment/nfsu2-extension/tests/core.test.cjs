const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Engine, A } = require('../extension/core.js');
function fixture() {
  const memory = new WebAssembly.Memory({ initial: 256, maximum: 300, shared: true });
  const e = new Engine(memory), d = new DataView(memory.buffer), player = 0xe00000, car = 0xe01000, race = 0xe04000;
  const put = (p,v) => d.setUint32(p,v,true);
  put(A.FLOW,6); put(A.MODE,1); put(A.PLAYER,player); put(player+4,car); put(player+0x10,0); put(A.RACE,race); put(race,4);
  d.setFloat32(car+A.RPM,6000,true); put(car+A.GEAR,3); put(car+A.NOS_FULL,40000); put(A.TICKS,200000);
  return { e, d, put, memory, player, car, race };
}
test('automatic refill stays disabled for an equipped live car without changing any memory', () => {
  const {e,put,car,memory} = fixture(); put(car+A.NOS_LEFT,100); put(car+A.NOS_SINCE,195000);
  const before=Buffer.from(new Uint8Array(memory.buffer));
  assert.equal(e.refill(e.state(),true),false); assert.equal(e.u32(car+A.NOS_LEFT),100); assert.equal(e.u32(car+A.NOS_SINCE),195000);
  assert.deepEqual(Buffer.from(new Uint8Array(memory.buffer)),before);
});
test('does not grant a missing nitrous kit', () => {
  const {e,put,car}=fixture(); put(car+A.NOS_FULL,0); put(car+A.NOS_LEFT,22); assert.equal(e.refill(e.state()),false); assert.equal(e.u32(car+A.NOS_LEFT),22);
});
test('does not activate nitrous while idle or change its sentinel',()=>{
  const {e,put,car}=fixture(); put(car+A.NOS_SINCE,0); e.refill(e.state()); assert.equal(e.u32(car+A.NOS_SINCE),0);
  put(car+A.NOS_SINCE,0x7fffffff); e.refill(e.state()); assert.equal(e.u32(car+A.NOS_SINCE),0x7fffffff);
});
test('blocks memory writes in LAN/Online sessions and pause',()=>{
  const {e,put,car,race}=fixture(); put(car+A.NOS_LEFT,123); put(A.MODE,0x200); assert.equal(e.refill(e.state()),false);
  put(A.MODE,1); put(race,6); assert.equal(e.refill(e.state()),false); assert.equal(e.u32(car+A.NOS_LEFT),123);
});
test('guards bad pointers, stale car references and non-finite RPM',()=>{
  const {e,put,d,car,player}=fixture(); const s=e.state(); put(player+4,0); assert.equal(e.refill(s),false); assert.equal(e.state().ready,false);
  put(player+4,car); d.setFloat32(car+A.RPM,NaN,true); assert.equal(e.state().ready,false);
});
test('refreshes views after memory grows',()=>{
  const {e,memory}=fixture(); assert.equal(e.state().ready,true); const before=e.view.buffer; memory.grow(1); assert.equal(e.state().ready,true); assert.notEqual(before,e.view.buffer);
});
test('reads nearby real car objects and crossing barrier lines without writing',()=>{
  const {e,d,put,car}=fixture(); const w=0xe08000, other=0xe09000, bars=0xe0c000;
  put(0x890080,w); put(w,car); put(car,other); put(other,w); d.setFloat32(car+0x90,1,true);
  d.setFloat32(other+0x60,40,true); d.setFloat32(other+0x64,2,true);
  put(0x88f298+0x498,1); put(0x88f298+0x49c,bars);
  [80,-10,80,10].forEach((v,i)=>d.setFloat32(bars+i*4,v,true)); d.setUint8(bars+0x10,1);
  const before=Buffer.from(Buffer.from(d.buffer)); const h=e.hazards(e.state());
  assert.equal(h.cars.length,1); assert.equal(h.cars[0].ahead,40); assert.equal(h.cars[0].side,2); assert.equal(h.barrierAhead,80); assert.equal(h.scannedCars,2);
  assert.deepEqual(Buffer.from(d.buffer),before);
});
test('bounds cyclic car lists',()=>{
  const {e,d,put,car}=fixture(); const w=0xe08000; put(0x890080,w); put(w,car); put(car,car); d.setFloat32(car+0x90,1,true);
  assert.equal(e.hazards(e.state()).scannedCars,1);
});
test('reads named status counters and rejects in-progress updates',()=>{
  const {e,d,put}=fixture(); const p=0xf00000; put(p,0x31545453); put(p+4,2); put(p+8,1);
  Buffer.from(d.buffer,p+16,16).write('drive'); d.setFloat64(p+32,2,true); assert.equal(e.status(p).drive,2);
  put(p+4,3); assert.equal(e.status(p),null);
});
function performanceFixture() {
  const f=fixture(), ride=0xe10000, pi=ride+0x10;
  f.put(f.car+0x10,ride); f.put(pi,2);
  const set=(o,v)=>f.d.setFloat32(pi+o,v,true);
  set(0x140,1.2); set(0x220,800); set(0x228,8000);
  for(let i=0;i<9;i++) set(0x230+i*4,0.2+i*0.01);
  set(0x2dc,0.5); set(0x2c0,150);
  return {...f,ride,pi,set,read:o=>f.d.getFloat32(pi+o,true)};
}
test('power scales engine and NOS once, can be adjusted without compounding, and restores',()=>{
  const {e,read}=performanceFixture(), s=e.state(), base=read(0x230);
  assert.equal(e.tunePerformance(s,2,true).ok,true); assert.equal(read(0x230),Math.fround(base*2)); assert.equal(read(0x2dc),1); assert.equal(read(0x2c0),0);
  e.tunePerformance(s,2,true); assert.equal(read(0x230),Math.fround(base*2));
  e.tunePerformance(s,1.5,false); assert.equal(read(0x230),Math.fround(base*1.5)); assert.equal(read(0x2c0),150);
  e.restorePerformance(s); assert.equal(read(0x230),base); assert.equal(read(0x2dc),0.5);
});
test('limiter-only control leaves torque unchanged',()=>{
  const {e,read}=performanceFixture(), s=e.state(), base=read(0x230);
  e.tunePerformance(s,1,true); assert.equal(read(0x230),base); assert.equal(read(0x2c0),0);
  e.tunePerformance(s,1,false); assert.equal(read(0x2c0),150);
});
test('invalid boost settings and network state do not apply power changes',()=>{
  const {e,read,put}=performanceFixture(), s=e.state(), base=read(0x230);
  for(const value of [0,4,NaN,Infinity]) assert.equal(e.tunePerformance(s,value,true).ok,false);
  put(A.MODE,8); assert.equal(e.tunePerformance(e.state(),2,true).ok,false); assert.equal(read(0x230),base); assert.equal(read(0x2c0),150);
});
test('external tuning changes stop boost and are never overwritten by restoration',()=>{
  const {e,set,read}=performanceFixture(), s=e.state();
  e.tunePerformance(s,2,true); set(0x230,0.7);
  const result=e.tunePerformance(s,2,true); assert.equal(result.changed,true); assert.equal(read(0x230),Math.fround(0.7)); assert.equal(read(0x2dc),0.5); assert.equal(read(0x2c0),150);
});
test('restoration never writes a freed or replaced car structure',()=>{
  const {e,put,read,player}=performanceFixture(), s=e.state(); e.tunePerformance(s,2,true); const boosted=read(0x230);
  put(A.FLOW,3); assert.equal(e.restorePerformance(s),false); assert.equal(read(0x230),boosted);
  put(A.FLOW,6); put(player+4,0); assert.equal(e.tunePerformance(s,2,true).ok,false);
});
function inputFixture() {
  const f=fixture(), ptr=0xf10000;
  f.put(ptr,0x4e494e50); f.put(ptr+4,2); f.put(ptr+3*4,1024); f.put(ptr+7*4,1);
  return {...f,ptr};
}
test('dedicated drift event is published atomically to the real input-ring format',()=>{
  const {e,d,put,ptr}=inputFixture(); put(ptr+4*4,1023); put(ptr+5*4,1023);
  assert.equal(e.driftTap(ptr),true);
  assert.deepEqual([...new Uint8Array(d.buffer,ptr+4416+1023*16,16)],[3,241,0,32,0,0,0,0,0,0,0,0,0,0,0,0]);
  assert.equal(d.getUint32(ptr+4*4,true),1024);
  assert.equal(e.driftTap(ptr),true); assert.equal(d.getUint8(ptr+4416),3);
});
test('drift input refuses full, unrecognized, inactive and typing mailboxes',()=>{
  const {e,d,put,ptr}=inputFixture(); put(ptr+4*4,1024); assert.equal(e.driftTap(ptr),false);
  put(ptr+4*4,0); put(ptr+27*4,1); assert.equal(e.driftTap(ptr),false);
  put(ptr+27*4,0); put(ptr+34*4,32); assert.equal(e.driftTap(ptr),false);
  put(ptr+34*4,0); put(ptr+4,999); assert.equal(e.driftTap(ptr),false);
  assert.equal(d.getUint32(ptr+4*4,true),0); assert.equal(e.driftTap(-1),false);
});
function gripFixture() {
  const f=fixture(), physics=0xe10000, wheels=[0xe11000,0xe12000,0xe13000,0xe14000];
  f.put(f.car+0x34,physics);
  wheels.forEach((w,i)=>{f.put(physics+0x38+i*4,w);f.d.setFloat32(w+0x188,1,true);});
  return {...f,physics,wheels,read:()=>wheels.map(w=>f.d.getFloat32(w+0x188,true))};
}
test('extra grip scales all four wheels without compounding and restores exactly',()=>{
  const {e,read}=gripFixture(),s=e.state();
  assert.equal(e.tuneGrip(s,1.3).ok,true); assert.deepEqual(read(),Array(4).fill(Math.fround(1.3)));
  e.tuneGrip(s,1.3); assert.deepEqual(read(),Array(4).fill(Math.fround(1.3)));
  e.tuneGrip(s,2); assert.deepEqual(read(),Array(4).fill(2));
  e.restoreGrip(s); assert.deepEqual(read(),Array(4).fill(1));
});
test('extra grip restores and pauses for drift handling and drift races',()=>{
  const {e,put,d,read}=gripFixture(),s=e.state(); e.tuneGrip(s,1.5);
  put(0x890104,1); assert.equal(e.tuneGrip(s,1.5).paused,true); assert.deepEqual(read(),[1,1,1,1]);
  put(0x890104,0); d.setUint8(0x89e7d9,1); assert.equal(e.tuneGrip(s,1.5).paused,true);
});
test('extra grip honors range/network/pause guards and 1x normal handling',()=>{
  const {e,put,read,race}=gripFixture(),s=e.state();
  for(const n of [0,0.9,2.1,NaN,Infinity]) assert.equal(e.tuneGrip(s,n).ok,false);
  e.tuneGrip(s,1.8); e.tuneGrip(s,1); assert.deepEqual(read(),[1,1,1,1]);
  put(A.MODE,8); assert.equal(e.tuneGrip(e.state(),1.5).ok,false);
  put(A.MODE,1); put(race,6); assert.equal(e.tuneGrip(e.state(),1.5).ok,false);
});
test('grip detects changed physics and preserves another writer\'s wheel adjustment',()=>{
  const {e,d,wheels,read}=gripFixture(),s=e.state(); e.tuneGrip(s,1.5);
  d.setFloat32(wheels[2]+0x188,0.8,true); assert.equal(e.tuneGrip(s,1.5).changed,true);
  assert.deepEqual(read(),[1,1,Math.fround(0.8),1]);
});
test('grip refuses aliasing wheel pointers and never restores freed scene memory',()=>{
  const {e,put,physics,wheels,read}=gripFixture(),s=e.state();e.tuneGrip(s,1.5);put(A.FLOW,3);
  assert.equal(e.restoreGrip(s),false);assert.deepEqual(read(),[1.5,1.5,1.5,1.5]);
  put(A.FLOW,6);put(physics+0x3c,wheels[0]);assert.equal(e.tuneGrip(s,1.5).ok,false);
});
test('power boost and extra grip maintain independent restoration',()=>{
  const f=performanceFixture(),physics=0xe18000,wheels=[0xe19000,0xe1a000,0xe1b000,0xe1c000];
  f.put(f.car+0x34,physics);wheels.forEach((w,i)=>{f.put(physics+0x38+i*4,w);f.d.setFloat32(w+0x188,1,true);});
  const s=f.e.state();f.e.tunePerformance(s,2,true);f.e.tuneGrip(s,1.4);f.e.restoreGrip(s);
  assert.equal(f.read(0x2dc),1);assert.equal(f.read(0x2c0),0);assert.equal(f.d.getFloat32(wheels[0]+0x188,true),1);
  f.e.restorePerformance(s);assert.equal(f.read(0x2dc),0.5);
});
const { StableGate } = require('../extension/core.js');
test('transition gate waits for three unchanged samples and resets on new data',()=>{
  const g=new StableGate();assert.equal(g.accept([1,2]),false);assert.equal(g.accept([1,2]),false);assert.equal(g.accept([1,2]),true);
  assert.equal(g.accept([3,2]),false);g.reset();assert.equal(g.accept([3,2]),false);
});
const fs=require('node:fs'),vm=require('node:vm');
async function pageFixture(saved=null, withAI=false, withDyno=false, compatibility={}) {
  const capabilities=compatibility.capabilities||{legacy:true,ai:true,pace:true,corner:true,walls:true,dyno:true,dragAI:true};
  const revision=compatibility.revision||'6f4f1e4e';
  const verifiedProfile=compatibility.verified===false?null:compatibility.profile||{revision:compatibility.profileRevision||revision,capabilities};
  const f=performanceFixture(),physics=0xe18000,wheels=[0xe19000,0xe1a000,0xe1b000,0xe1c000],status=0xf50000;
  f.put(f.car+0x24,1);
  f.put(f.car+0x34,physics);wheels.forEach((w,i)=>{f.put(physics+0x38+i*4,w);f.d.setFloat32(w+0x188,1,true);});
  f.put(status,0x31545453);f.put(status+4,2);f.put(status+8,2);
  Buffer.from(f.d.buffer,status+16,16).write('drive');f.d.setFloat64(status+32,2,true);
  Buffer.from(f.d.buffer,status+40,16).write('drift');f.d.setFloat64(status+56,0,true);
  const listeners={},nodes={},stylesheets=[];let interval,now=0,stored=saved,focused=true,shadow;
  const sessions=new Map(saved?[["nfsu2-driving-tools-v1",saved]]:[]);
  const profileStorage=compatibility.profileStorage||new Map();
  const storageAdapter=map=>({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)});
  class El {
    constructor(){this.handlers={};this.style={};this.checked=false;this.hidden=false;this.open=false;this.dataset={};this.attrs={};this.value='';}
    addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
    append(...children){(this.children??=[]).push(...children);}
    replaceChildren(...children){this.children=[...children];}
    setAttribute(k,v){this.attrs[k]=v;}
    attachShadow(){shadow=this;return this;}
    set innerHTML(html){this.html=html;for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]=new El();nodes['tools-panel'].hidden=true;nodes['dyno-goal'].value='peakPower';}
    querySelector(selector){const n=nodes[selector.slice(1)];if(!n)throw Error('Missing UI element '+selector);return n;}
  }
  class Worker {constructor(){this.handlers={};}postMessage(){}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}emit(data){for(const f of this.handlers.message||[])f({data});}}
  const doc={body:new El(),adoptedStyleSheets:[],hidden:false,fullscreenElement:null,hasFocus:()=>focused,querySelector:()=>null,createElement:()=>new El(),addEventListener:(k,f)=>(listeners['doc:'+k]??=[]).push(f)};
  const context={navigator:{locks:compatibility.profileLocks===false?null:compatibility.profileLocks||{request:(_name,fn)=>fn()}},document:doc,location:{origin:'https://nfsu2.xyz',href:'https://nfsu2.xyz/'},WebAssembly,Worker,URL,console,
    __NFSU2_DYNAMIC_PACING__:require('../extension/dynamic-pacing.js'),
    __NFSU2_CITY_PACING__:compatibility.cityPacing===undefined?require('../extension/city-pacing.js'):compatibility.cityPacing,
    __NFSU2_STREAM_HUD__:compatibility.streamHud===undefined?require('../extension/stream-hud.js'):compatibility.streamHud,
    __NFSU2_REAR_RADAR__:compatibility.rearRadar||null,
    __NFSU2_RACE_CAPTURE__:compatibility.capture||null,
    __NFSU2_FORWARD_DRIVING__:compatibility.forwardDriving||null,
    __NFSU2_NATIVE_RUBBERBAND__:compatibility.nativeRubberband||null,
    __NFSU2_RUBBERBAND_CONTROLLER__:compatibility.rubberbandController||null,
    __NFSU2_PACED_CATCHUP__:compatibility.pacedCatchup||null,
    __NFSU2_PACED_CATCHUP_CONTROLLER__:compatibility.pacedCatchupController||null,
    __NFSU2_RACE_HUB__:compatibility.raceHub||null,
    __NFSU2_RACE_STATS__:compatibility.raceStats||null,
    __NFSU2_RACE_TELEMETRY__:compatibility.raceTelemetry||null,
    __NFSU2_RACE_CATALOG__:compatibility.raceCatalog||null,
    __NFSU2_DIAGNOSTICS__:compatibility.diagnostics||null,
    __NFSU2_DRIVING_CORE__:require('../extension/core.js'),performance:{now:()=>now},
    CSSStyleSheet:class{replaceSync(css){this.css=css;stylesheets.push(this);}},
    sessionStorage:compatibility.sessionStorage||{getItem:key=>sessions.get(key)??null,setItem:(k,v)=>{sessions.set(k,v);if(k==='nfsu2-driving-tools-v1')stored=v;},removeItem:k=>sessions.delete(k)},
    localStorage:compatibility.localStorage||storageAdapter(profileStorage),
    __NFSU2_TOOL_PROFILES__:require('../extension/tool-profiles.js'),
    fetch:async()=>({ok:true,json:async()=>({rev:revision})}),
    setInterval:fn=>(interval=fn,1),clearInterval(){},setTimeout:()=>1,clearTimeout(){},
    KeyboardEvent:class{constructor(type,init){Object.assign(this,init);this.type=type;this.isTrusted=false;}},
    addEventListener:(k,fn)=>(listeners[k]??=[]).push(fn),
    dispatchEvent:e=>{for(const fn of listeners[e.type]||[])fn(e);}
  };
  const aiLog={cornerApplied:null,installed:0,stops:0,updates:[],controllers:[],keys:[],keyEvents:[],paceApplied:null,owned:false};
  if(withAI) context.__NFSU2_AI__={install(){aiLog.installed++;},isPatchedModule:()=>true,Controller:class {
    constructor(memory,patched){aiLog.controllers.push({memory,patched});}
    stop(){aiLog.stops++;}
    update(value){aiLog.updates.push(value);return {available:true,ready:true,owned:aiLog.owned,active:value.enabled&&value.safe||aiLog.owned,paceApplied:aiLog.paceApplied,cornerMode:aiLog.cornerMode,cornerPace:aiLog.cornerPace,cornerBraking:aiLog.cornerBraking,brakingHits:aiLog.brakingHits,cornerApplied:aiLog.cornerApplied,cornerRequested:aiLog.cornerRequested??value.cornerAssist,cornerHits:aiLog.cornerHits,...aiLog.cornerContext,cornerMemoryBlocked:!!aiLog.cornerMemoryBlocked,cornerDriftBlocked:!!aiLog.cornerDriftBlocked,status:value.enabled&&value.safe?'Native AI active':'Native AI paused'};}
  }};
  context.__NFSU2_AI__??={install(){}};context.__NFSU2_AI__.getModuleProfile=module=>compatibility.verifier?compatibility.verifier(module):verifiedProfile;
  const dynoLog={instance:null,cancels:0,finds:0,applies:0,restores:0};
  if(withDyno)context.__NFSU2_DYNO__={Controller:class{
    constructor(memory,patched,revision){this.revision=revision;dynoLog.instance=this;this.busy=false;this.enabled=false;this.outcome=null;this.applied=null;this.usable=true;this.kind=0;}
    available(){return true;}canUse(){return this.usable;}syncContext(){const changed=this.context?.kind!==this.kind;this.context={kind:this.kind??0};const result={...this.context,changed,invalidated:this.invalidated};this.invalidated=false;return result;}setEnabled(v){this.enabled=v;if(!v)this.cancel();}
    cancel(){dynoLog.cancels++;if(this.fail){const fail=this.fail;this.fail=null;this.busy=false;fail(Error('Tuning cancelled'));}}
    async find({goal,onProgress}){dynoLog.finds++;this.busy=true;onProgress({evaluations:2,budget:120});return new Promise((resolve,reject)=>{this.fail=reject;this.finish=()=>{this.fail=null;this.busy=false;this.outcome={goal,improved:true,baselineResult:{peakPowerKw:200,peakTorqueNm:300},bestResult:{peakPowerKw:220,peakTorqueNm:310},evaluations:40};resolve(this.outcome);};});}
    async apply(){dynoLog.applies++;this.applied=this.outcome;return {};}
    async restore(){dynoLog.restores++;this.applied=null;this.outcome=null;return {};}
  }};
  const wallLog={stops:0,updates:[],controllers:[]};
  if(withAI) context.__NFSU2_WALLS__={Controller:class {
    constructor(memory,patched,profile){wallLog.controllers.push({memory,patched,profile});}
    stop(){wallLog.stops++;}
    update(value){wallLog.updates.push(value);return {requested:value.enabled&&value.safe&&!value.state.network,hits:0,reason:value.state.network?'Paused online.':'Armed · waiting for a supported wall contact'};}
  }};
  const carLog={stops:0,updates:[],controllers:[]};
  if(withAI) context.__NFSU2_CARS__={Controller:class {
    constructor(memory,patched,profile){carLog.controllers.push({memory,patched,profile});}
    stop(){carLog.stops++;}
    update(value){carLog.updates.push(value);return {requested:value.enabled&&value.safe&&!value.state.network,hits:0,reason:value.state.network?'Paused online.':'Armed · waiting for a car contact',...carLog.result};}
  }};
  (listeners.keydown??=[]).push(e=>{if(!e.isTrusted)aiLog.keys.push(e.code);});
  for(const type of ['keydown','keyup'])(listeners[type]??=[]).push(e=>{if(!e.isTrusted)aiLog.keyEvents.push({type:e.type,code:e.code});});
  context.window=context;context.top=context;
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/page.js'),'utf8'),context);
  await new Promise(r=>setImmediate(r));
  const worker=new context.Worker('https://nfsu2.xyz/host/game-worker.js');
  const gameModule=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));
  worker.postMessage({mod:gameModule,memory:f.memory,slot:0});worker.emit({t:'register',kind:5,ptr:status});
  return {...f,nodes,worker,status,physics,wheels,gameModule,createWorker:()=>new context.Worker('https://nfsu2.xyz/host/game-worker.js'),aiLog,wallLog,carLog,dynoLog,html:()=>shadow.html,stylesheets:()=>stylesheets,adoptedStylesheets:()=>shadow.adoptedStyleSheets,
    uiFocus(node){shadow.activeElement=node;doc.activeElement=shadow;return shadow;},documentStylesheets:()=>doc.adoptedStyleSheets,fire:event=>context.dispatchEvent(event),
    gameDialog(open){doc.querySelector=selector=>selector==='dialog[open]'&&open?{}:null;},
    profileStorage,sessions,storageEvent(key){context.dispatchEvent({type:'storage',key});},pageEvent(type,persisted=false){context.dispatchEvent({type,persisted});},
    hidden(value){doc.hidden=value;for(const fn of listeners['doc:visibilitychange']||[])fn({});},
    run(n=1){for(let i=0;i<n;i++){now+=50;interval();}},
    change(id,value){const el=nodes[id];if(typeof value==='boolean')el.checked=value;else el.value=value;for(const fn of el.handlers.change||[])fn({target:el});for(const fn of shadow.handlers.change||[])fn({target:el});},
    input(id,value){const el=nodes[id];el.value=value;for(const fn of el.handlers.input||[])fn({target:el});},
    expand(id,value=true){const el=nodes[id];el.open=value;for(const fn of el.handlers.toggle||[])fn({target:el});},
    click(id){for(const fn of nodes[id].handlers.click||[])fn({target:nodes[id]});},
    press(code,inTools=false){context.dispatchEvent({type:'keydown',code,isTrusted:true,composedPath:()=>inTools?[shadow]:[],preventDefault(){}});},
    focus(on){focused=on;for(const fn of listeners[on?'focus':'blur']||[])fn({});},
    prefs(){return JSON.parse(stored||'{}');},stored:()=>stored,
    drive(n){f.d.setFloat64(status+32,n,true);}
  };
}
test('actual dropdown opens by click/F8 and Escape no longer clears enabled assists',async()=>{
  const f=await pageFixture();assert.equal(f.nodes['tools-panel'].hidden,true);
  f.click('min');assert.equal(f.nodes['tools-panel'].hidden,false);
  f.press('F8');assert.equal(f.nodes['tools-panel'].hidden,true);
  f.change('nos',true);f.change('drag',true);f.press('Escape');assert.equal(f.prefs().nos,true);assert.equal(f.prefs().drag,true);
  f.press('F9');assert.equal(f.prefs().nos,false);assert.equal(f.prefs().drag,false);
});
test('actual page keeps switches through pause/loading/new car and safely reapplies',async()=>{
  const f=await pageFixture();f.change('boost',true);f.change('grip',true);f.change('nos',true);f.run(3);
  assert.equal(f.read(0x2dc),0.75);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),Math.fround(1.3));
  f.put(f.race,6);f.drive(0);f.run();assert.equal(f.read(0x2dc),0.5);assert.equal(f.prefs().boost,true);assert.equal(f.prefs().grip,true);
  f.put(A.FLOW,4);f.run();assert.equal(f.prefs().nos,true);
  const newCar=0xe30000,newRide=0xe32000;
  new Uint8Array(f.memory.buffer).copyWithin(newCar,f.car,f.car+0x9e4);
  new Uint8Array(f.memory.buffer).copyWithin(newRide,f.ride,f.ride+0x584);
  f.put(newCar+0x10,newRide);f.put(f.player+4,newCar);f.put(A.FLOW,6);f.put(f.race,4);f.drive(2);
  f.run(2);assert.equal(f.d.getFloat32(newRide+0x10+0x2dc,true),0.5);
  f.run();assert.equal(f.d.getFloat32(newRide+0x10+0x2dc,true),0.75);assert.equal(f.read(0x2dc),0.5);
});
test('actual page pauses on lost focus without forgetting selections and resumes',async()=>{
  const f=await pageFixture();f.change('boost',true);f.run(3);assert.equal(f.read(0x2dc),0.75);
  f.focus(false);f.run(4);assert.equal(f.read(0x2dc),0.5);assert.equal(f.prefs().boost,true);
  f.focus(true);f.run(3);assert.equal(f.read(0x2dc),0.75);
});
test('actual page rebuild reapplication does not compound power or clear its switch',async()=>{
  const f=await pageFixture();f.change('boost',true);f.run(3);
  for(let i=0;i<9;i++)f.set(0x230+i*4,0.3+i*0.01);f.set(0x2dc,0.6);f.set(0x2c0,170);
  f.run();assert.equal(f.prefs().boost,true);assert.equal(f.read(0x2dc),Math.fround(0.6));
  f.run(3);assert.equal(f.read(0x2dc),Math.fround(Math.fround(0.6)*1.5));
  f.run(5);assert.equal(f.read(0x2dc),Math.fround(Math.fround(0.6)*1.5));
});
test('power and grip restart off but retain factors; other saved tools wait for valid state',async()=>{
  const saved=JSON.stringify({nos:true,boost:true,power:2,grip:true,gripFactor:1.4,drag:true,rpm:7100});
  const f=await pageFixture(saved);assert.equal(f.nodes.boost.checked,false);assert.equal(f.nodes.grip.checked,false);assert.equal(f.nodes.unlimit.checked,false);assert.equal(f.nodes.power.value,2);f.change('boost',true);
  f.put(A.MODE,8);f.run(5);assert.equal(f.read(0x2dc),0.5);
  f.put(A.MODE,1);f.run(3);assert.equal(f.read(0x2dc),1);
  f.worker.emit({t:'exit'});f.run(5);assert.equal(f.read(0x2dc),0.5);assert.equal(f.prefs().boost,true);
});

test('native AI installs early, starts off despite saved choice, and supports race/free roam states',async()=>{
  const f=await pageFixture(JSON.stringify({ai:true}),true);
  assert.equal(f.aiLog.installed,1);assert.equal(f.aiLog.controllers[0].patched,true);
  assert.equal(f.nodes.ai.checked,false);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false);
  f.change('ai',true);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.equal(f.aiLog.updates.at(-1).mode,2);assert.equal(f.aiLog.updates.at(-1).safe,true);
  f.drive(1);f.run();assert.equal(f.aiLog.updates.at(-1).mode,1);assert.equal(f.aiLog.updates.at(-1).safe,true);
  assert.match(f.nodes['ai-state'].textContent,/active/);
});
test('native AI leaves NOS/power/grip switches independent and suppresses synthetic drag input',async()=>{
  const f=await pageFixture(null,true);f.change('nos',true);f.change('boost',true);f.change('grip',true);f.change('drag',true);f.change('ai',true);
  f.run(3);assert.equal(f.read(0x2dc),0.75);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),Math.fround(1.3));assert.equal(f.prefs().nos,true);
  f.put(f.race,3);f.run(20);assert.deepEqual(f.aiLog.keys,[]);assert.equal(f.prefs().drag,true);
  f.press('F7');assert.equal(f.prefs().ai,false);assert.equal(f.nodes.ai.checked,false);f.run(20);assert.deepEqual(f.aiLog.keys,[]);
});
test('native AI stops immediately on each physical driving key, F7, button and F9',async()=>{
  const f=await pageFixture(null,true);
  for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space','F7','F9']) {
    f.change('ai',true);f.run();const stops=f.aiLog.stops;f.press(key);
    assert.equal(f.nodes.ai.checked,false,key);assert.equal(f.prefs().ai,false,key);assert.ok(f.aiLog.stops>stops,key);
  }
  f.change('ai',true);f.click('take-control');assert.equal(f.prefs().ai,false);
});
test('native AI pauses on blur, hidden, loading and game exit while preserving same-page request',async()=>{
  const f=await pageFixture(null,true);f.change('ai',true);f.run();let stops=f.aiLog.stops;
  f.focus(false);assert.ok(f.aiLog.stops>stops);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);assert.equal(f.prefs().ai,true);
  f.focus(true);f.run();assert.equal(f.aiLog.updates.at(-1).safe,true);
  stops=f.aiLog.stops;f.hidden(true);assert.ok(f.aiLog.stops>stops);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);
  f.hidden(false);f.drive(0);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);assert.equal(f.prefs().ai,true);
  stops=f.aiLog.stops;f.worker.emit({t:'exit'});assert.ok(f.aiLog.stops>stops);assert.equal(f.prefs().ai,true);
});
test('missing native AI backend fails closed without breaking existing controls',async()=>{
  const f=await pageFixture();f.change('ai',true);f.change('boost',true);f.run(3);
  assert.match(f.nodes['ai-state'].textContent,/Reload with the native AI module/);assert.equal(f.read(0x2dc),0.75);
  f.click('take-control');assert.equal(f.prefs().ai,false);
});

test('AI pace is opt-in, starts neutral, and never enables native AI by itself',async()=>{
  const f=await pageFixture(null,true);f.run();
  assert.equal(f.nodes['ai-pace'].checked,false);assert.equal(f.nodes['pace-factor'].value,1);assert.equal(f.aiLog.updates.at(-1).pace,1);
  f.input('pace-factor',1.3);f.run();assert.equal(f.aiLog.updates.at(-1).pace,1);assert.equal(f.nodes['pace-value'].textContent,'1.30×');
  f.change('ai-pace',true);f.run();assert.equal(f.aiLog.updates.at(-1).pace,1.3);assert.equal(f.aiLog.updates.at(-1).enabled,false);
  assert.match(f.nodes['ai-pace-state'].textContent,/waiting for AI/);
  f.change('ai',true);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.match(f.nodes['ai-pace-state'].textContent,/requested/);
  f.aiLog.paceApplied=1.3;f.run();assert.match(f.nodes['ai-pace-state'].textContent,/1\.30× confirmed/);
  f.change('ai-pace',false);f.run();assert.equal(f.aiLog.updates.at(-1).pace,1);assert.equal(f.aiLog.updates.at(-1).enabled,true);
});
test('adjustment bars clamp and snap values, update outputs live, and preserve safe defaults',async()=>{
  const f=await pageFixture(null,true);
  for(const [id,output,name,low,high,normal,text] of [
    ['race-pace-factor','race-pace-value','racePaceFactor',0.75,3,1,'1.00×'],
    ['corner-factor','corner-value','cornerFactor',0.6,0.95,0.8,'0.80×'],
    ['pace-factor','pace-value','paceFactor',0.75,3,1,'1.00×'],
    ['power','power-value','power',1,3,1.5,'1.5×'],
    ['grip-factor','grip-value','gripFactor',1,2,1.3,'1.3×'],
    ['rpm','rpm-value','rpm',3000,10000,6500,'6500']
  ]) {
    assert.match(f.html(),new RegExp('id="'+id+'"[^>]*type="range"'));
    f.input(id,-100);assert.equal(f.nodes[id].value,low);assert.equal(f.prefs()[name],low);
    f.input(id,20000);assert.equal(f.nodes[id].value,high);assert.equal(f.prefs()[name],high);
    f.input(id,'');assert.equal(f.nodes[id].value,normal);assert.equal(f.nodes[output].textContent,text);
    f.input(id,'invalid');assert.equal(f.prefs()[name],normal);
  }
  f.input('pace-factor',1.27);assert.equal(f.prefs().paceFactor,1.25);
  f.input('rpm',6742);assert.equal(f.prefs().rpm,6700);
});
test('saved pace settings restore safely without enabling AI and F9 clears the opt-in',async()=>{
  const f=await pageFixture(JSON.stringify({ai:true,aiPace:true,paceFactor:5}),true);
  assert.equal(f.nodes['ai-pace'].checked,false);assert.equal(f.nodes['pace-factor'].value,3);assert.equal(f.nodes.ai.checked,false);
  f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(f.aiLog.updates.at(-1).pace,1);f.change('ai-pace',true);
  f.change('ai',true);f.press('F7');f.run();assert.equal(f.prefs().aiPace,true);assert.equal(f.aiLog.updates.at(-1).enabled,false);
  f.change('ai',true);f.press('F9');f.run();assert.equal(f.prefs().aiPace,false);assert.equal(f.nodes['ai-pace'].checked,false);assert.equal(f.aiLog.updates.at(-1).pace,1);assert.equal(f.nodes['pace-factor'].value,3);
});
test('menu keyboard adjustments leave AI running while game keys and F7 still take control',async()=>{
  const f=await pageFixture(null,true);f.change('ai',true);f.change('ai-pace',true);
  for(const code of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space']) {f.press(code,true);assert.equal(f.prefs().ai,true,code);}
  f.press('F7',true);assert.equal(f.prefs().ai,false);
  f.change('ai',true);f.press('ArrowLeft');assert.equal(f.prefs().ai,false);
});

test('compact menu starts folded and keeps only one main group expanded',async()=>{
  const f=await pageFixture();
  const groups=['group-driver','group-power','group-handling','group-drag','group-dyno','group-diagnostics'];
  for(const id of groups)assert.equal(f.nodes[id].open,false);
  f.expand('group-driver');assert.equal(f.nodes['group-driver'].open,true);
  f.expand('group-power');assert.equal(f.nodes['group-driver'].open,false);assert.equal(f.nodes['group-power'].open,true);
  f.change('nos',true);f.click('min');f.press('Escape');assert.equal(f.prefs().nos,true);assert.equal(f.nodes['tools-panel'].hidden,true);
});
test('manual drag waits for a confirmed human driver and released native ownership',async()=>{
  const f=await pageFixture(null,true);f.change('drag',true);f.put(A.DRAG,1);
  f.aiLog.owned=true;f.put(f.car+0x24,3);f.run(20);
  assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.deepEqual(f.aiLog.keys,[]);
  f.aiLog.owned=false;f.run(20);assert.deepEqual(f.aiLog.keys,[]);
  f.put(f.car+0x24,1);f.aiLog.owned=true;f.run(20);assert.deepEqual(f.aiLog.keys,[]);
  f.aiLog.owned=false;f.run();assert.ok(f.aiLog.keys.includes('ArrowUp'));assert.match(f.nodes['drag-state'].textContent,/you steer/);
  f.press('ArrowLeft');f.run();assert.equal(f.prefs().ai,false);assert.equal(f.prefs().drag,true);assert.match(f.nodes['drag-state'].textContent,/active/);
  f.press('F7');f.run();assert.match(f.nodes['drag-state'].textContent,/Paused by manual takeover/);
});
test('drag countdown permits throttle but neither shifts nor NOS before GO',async()=>{
  const f=await pageFixture(null,true);f.put(A.DRAG,1);f.put(f.race,3);f.d.setFloat32(f.car+A.RPM,8000,true);
  f.change('drag',true);f.change('nos',true);f.run(20);
  assert.ok(f.aiLog.keys.includes('ArrowUp'));assert.ok(!f.aiLog.keys.includes('ShiftLeft'));assert.ok(!f.aiLog.keys.includes('AltLeft'));
  assert.match(f.nodes['drag-state'].textContent,/Countdown throttle/);
  f.aiLog.keys.length=0;f.put(f.race,4);f.run();assert.ok(f.aiLog.keys.includes('ShiftLeft'));assert.ok(!f.aiLog.keys.includes('AltLeft'));
});
test('drag legacy path works without native AI and pauses for network, focus and menus',async()=>{
  const f=await pageFixture();f.put(A.DRAG,1);f.change('drag',true);f.run();assert.ok(f.aiLog.keys.includes('ArrowUp'));
  f.aiLog.keys.length=0;f.put(A.MODE,8);f.run(20);assert.deepEqual(f.aiLog.keys,[]);
  f.put(A.MODE,1);f.focus(false);f.run(20);assert.deepEqual(f.aiLog.keys,[]);
  f.focus(true);f.put(f.race,6);f.run(20);assert.deepEqual(f.aiLog.keys,[]);
  f.put(f.race,4);f.hidden(true);f.run(20);assert.deepEqual(f.aiLog.keys,[]);
});

test('automatic refill stays disabled online with every permission and preserves all memory',()=>{
  for(const [address,value] of [[A.MODE,8],[A.MODE,0x200],[A.HOST,1],[A.CLIENT,1],[A.ONLINE,1]]) {
    const f=fixture();f.put(address,value);const s=f.e.state();assert.equal(s.network,true);
    const before=Buffer.from(new Uint8Array(f.memory.buffer));
    for(const allow of [false,undefined,1,'true',true]) assert.equal(f.e.refill(s,allow),false);
    assert.equal(f.d.getUint32(f.car+A.NOS_LEFT,true),0);assert.equal(f.e.u32(address),value);assert.equal(s.network,true);
    assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);
    f.put(f.race,6);assert.equal(f.e.refill(f.e.state(),true),false,'online permission does not override pause');
  }
});
test('online power and grip opt-in apply once and restore on opt-out',()=>{
  const f=performanceFixture();f.put(A.MODE,8);const s=f.e.state();
  assert.equal(f.e.tunePerformance(s,2,true,1).ok,false);assert.equal(f.read(0x2dc),0.5);
  assert.equal(f.e.tunePerformance(s,2,true,true).active,true);assert.equal(f.read(0x2dc),1);assert.equal(f.read(0x2c0),0);
  f.e.tunePerformance(s,2,true,true);assert.equal(f.read(0x2dc),1);f.e.tunePerformance(s,2,true,false);assert.equal(f.read(0x2dc),0.5);assert.equal(f.read(0x2c0),150);assert.equal(f.d.getUint32(A.MODE,true),8);
  const g=gripFixture();g.put(A.MODE,0x200);const t=g.e.state();assert.equal(g.e.tuneGrip(t,1.5,'true').ok,false);
  assert.equal(g.e.tuneGrip(t,1.5,true).active,true);assert.deepEqual(g.read(),[1.5,1.5,1.5,1.5]);g.e.tuneGrip(t,1.5,false);assert.deepEqual(g.read(),[1,1,1,1]);
  g.d.setUint8(0x89e7d9,1);assert.equal(g.e.tuneGrip(t,1.5,true).paused,true,'online opt-in does not override native drift grip');
});
test('online session switch resets after reload, shows risks and does not enable tools',async()=>{
  const f=await pageFixture(JSON.stringify({online:true,ai:true}),true);f.put(A.MODE,8);f.run();
  assert.equal(f.nodes.online.checked,false);assert.equal(f.nodes.ai.checked,false);assert.equal(f.aiLog.updates.at(-1).allowNetwork,false);assert.match(f.nodes.live.textContent,/Online\/LAN tools paused/);
  assert.match(f.html(),/trigger integrity checks, invalidate results or lead to a ban/);assert.match(f.html(),/does not bypass server restrictions/);
  f.expand('group-session');f.change('online',true);f.run();assert.equal(f.aiLog.updates.at(-1).allowNetwork,true);assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(f.read(0x2dc),0.5);assert.match(f.nodes['online-state'].textContent,/ON this page/);assert.equal(f.d.getUint32(A.MODE,true),8);
  const next=await pageFixture(f.stored(),true);assert.equal(next.nodes.online.checked,false);next.run();assert.equal(next.aiLog.updates.at(-1).allowNetwork,false);
});
test('online page opt-in allows selected tools, opt-out restores and keeps menu and choices',async()=>{
  const f=await pageFixture(null,true);f.put(A.MODE,8);f.drive(1);f.change('ai',true);f.change('nos',true);f.change('boost',true);f.change('unlimit',true);f.change('grip',true);f.run(5);
  assert.equal(f.aiLog.updates.at(-1).safe,false);assert.equal(f.read(0x2dc),0.5);assert.equal(f.d.getUint32(f.car+A.NOS_LEFT,true),0);
  f.press('F8');assert.equal(f.nodes['tools-panel'].hidden,false);f.change('online',true);f.run(3);
  assert.equal(f.aiLog.updates.at(-1).safe,true);assert.equal(f.aiLog.updates.at(-1).allowNetwork,true);assert.equal(f.read(0x2dc),0.75);assert.equal(f.read(0x2c0),0);assert.equal(f.d.getUint32(f.car+A.NOS_LEFT,true),0);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),Math.fround(1.3));assert.match(f.nodes.live.textContent,/Online\/LAN opt-in/);assert.match(f.nodes.enabled.textContent,/selected/);
  const stops=f.aiLog.stops;f.change('online',false);assert.ok(f.aiLog.stops>stops);assert.equal(f.read(0x2dc),0.5);assert.equal(f.read(0x2c0),150);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),1);
  f.put(f.car+A.NOS_LEFT,123);f.run(4);assert.equal(f.d.getUint32(f.car+A.NOS_LEFT,true),123);assert.equal(f.aiLog.updates.at(-1).safe,false);assert.equal(f.prefs().boost,true);assert.equal(f.nodes['tools-panel'].hidden,false);
  f.change('online',true);f.run(3);assert.equal(f.read(0x2dc),0.75);f.focus(false);f.run();assert.equal(f.read(0x2dc),0.5);assert.equal(f.aiLog.updates.at(-1).safe,false);
  f.focus(true);f.run(3);assert.equal(f.read(0x2dc),0.75);f.press('F7');f.run();assert.equal(f.prefs().ai,false);assert.equal(f.prefs().online,true);
  f.press('F9');f.run();assert.equal(f.prefs().online,false);assert.equal(f.nodes.online.checked,false);assert.equal(f.prefs().boost,false);assert.equal(f.read(0x2dc),0.5);assert.equal(f.aiLog.updates.at(-1).allowNetwork,false);
});
test('online drag assist uses opt-in and releases throttle on opt-out',async()=>{
  const f=await pageFixture(null,true);f.put(A.MODE,0x200);f.drive(1);f.put(A.DRAG,1);f.change('drag',true);f.run(20);assert.deepEqual(f.aiLog.keys,[]);
  f.change('online',true);f.run();assert.ok(f.aiLog.keys.includes('ArrowUp'));f.change('online',false);assert.ok(f.aiLog.keyEvents.some(e=>e.code==='ArrowUp'&&e.type==='keyup'));
  f.aiLog.keys.length=0;f.run(20);assert.deepEqual(f.aiLog.keys,[]);f.change('online',true);f.run();f.press('F7');f.aiLog.keys.length=0;f.run(20);assert.deepEqual(f.aiLog.keys,[]);assert.match(f.nodes['drag-state'].textContent,/Paused by manual takeover/);
});
test('online opt-in leaves native free-roam drift restriction in place',async()=>{
  const f=await pageFixture();f.put(A.MODE,8);f.change('online',true);f.change('drift',true);assert.match(f.nodes.note.textContent,/solo free roam/);
});


test('one AI switch selects drag automatically, starts off after reload and clears with F9',async()=>{
 const f=await pageFixture(JSON.stringify({dragAi:true,ai:true}),true);f.put(A.DRAG,1);f.run();
 assert.equal(f.aiLog.updates.at(-1).allowDragAI,false);assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(f.nodes['drag-ai'],undefined);
 assert.match(f.html(),/One switch reconstructs native AI for event changes/);assert.match(f.nodes['drag-ai-state'].textContent,/Enable Automatic driver/);
 f.change('ai',true);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.equal(f.aiLog.updates.at(-1).allowDragAI,true);
 f.press('F9');f.run();assert.equal(f.prefs().ai,false);assert.equal(f.nodes.ai.checked,false);assert.equal(f.aiLog.updates.at(-1).allowDragAI,false);
});
test('drag AI releases held assist keys before request and suppresses countdown input',async()=>{
 const f=await pageFixture(null,true);f.put(A.DRAG,1);f.change('drag',true);f.run();assert(f.aiLog.keys.includes('ArrowUp'));
 f.change('ai',true);f.aiLog.keys.length=0;f.run();assert(f.aiLog.keyEvents.some(x=>x.type==='keyup'&&x.code==='ArrowUp'));assert.deepEqual(f.aiLog.keys,[]);
 f.put(f.race,3);f.run(20);assert.deepEqual(f.aiLog.keys,[]);assert.match(f.nodes['drag-state'].textContent,/Paused while automatic drag AI/);
 f.put(f.race,4);f.run(20);assert.deepEqual(f.aiLog.keys,[]);
});
test('F7 and manual keys take over experimental drag AI without restarting synthetic assist',async()=>{
 for(const key of ['F7','ArrowLeft','ArrowUp','KeyW','Space']){
  const f=await pageFixture(null,true);f.put(A.DRAG,1);f.change('drag',true);f.change('ai',true);f.run();
  f.press(key);f.run();assert.equal(f.prefs().ai,false);assert(f.aiLog.stops>0);assert.deepEqual(f.aiLog.keys,[]);assert.match(f.nodes['drag-state'].textContent,/Paused by manual takeover/);
 }
});
test('drag AI withdrawal waits for native ownership handback before assist resumes',async()=>{
 const f=await pageFixture(null,true);f.put(A.DRAG,1);f.change('drag',true);f.change('ai',true);f.aiLog.owned=true;f.put(f.car+0x24,3);f.run();
 f.change('ai',false);f.run(20);assert.deepEqual(f.aiLog.keys,[]);f.put(f.car+0x24,1);f.run();assert.deepEqual(f.aiLog.keys,[]);
 f.aiLog.owned=false;f.run();assert(f.aiLog.keys.includes('ArrowUp'));
});
test('custom pace is visibly paused during experimental drag AI',async()=>{
 const f=await pageFixture(null,true);f.put(A.DRAG,1);f.change('ai',true);f.change('ai-pace',true);f.aiLog.paceApplied=1.5;f.run();assert.match(f.nodes['ai-pace-state'].textContent,/Paused in drag/);
});


test('wall switch starts off after reload, stays independent and clears with F9',async()=>{
 const f=await pageFixture(JSON.stringify({walls:true}),true);f.run();assert.equal(f.nodes.walls.checked,false);assert.equal(f.wallLog.updates.at(-1).enabled,false);
 assert.equal(f.wallLog.controllers[0].patched,true);assert.match(f.html(),/Ground, slopes and movable props remain solid/);assert.match(f.html(),/Cars stay solid unless Car no-clip is also enabled/);
 f.change('walls',true);f.run();assert.equal(f.wallLog.updates.at(-1).enabled,true);assert.equal(f.wallLog.updates.at(-1).safe,true);assert.equal(f.aiLog.updates.at(-1).enabled,false);
 assert.match(f.nodes['walls-state'].textContent,/waiting/);f.press('F9');assert.equal(f.prefs().walls,false);assert.equal(f.nodes.walls.checked,false);assert.ok(f.wallLog.stops>0);
});
test('wall switch suspends on focus, visibility, menus, stop and game exit',async()=>{
 const f=await pageFixture(null,true);f.change('walls',true);f.run();let count=f.wallLog.stops;f.focus(false);assert.ok(f.wallLog.stops>count);f.run();assert.equal(f.wallLog.updates.at(-1).safe,false);assert.equal(f.prefs().walls,true);
 f.focus(true);f.hidden(true);f.run();assert.equal(f.wallLog.updates.at(-1).safe,false);f.hidden(false);f.drive(0);f.run();assert.equal(f.wallLog.updates.at(-1).safe,false);
 f.drive(2);f.run();assert.equal(f.wallLog.updates.at(-1).safe,true);count=f.wallLog.stops;f.change('walls',false);assert.ok(f.wallLog.stops>count);
 f.change('walls',true);count=f.wallLog.stops;f.worker.emit({t:'exit'});assert.ok(f.wallLog.stops>count);
});
test('wall page forwards native network state even with the unrelated online opt-in',async()=>{
 const f=await pageFixture(null,true);f.change('walls',true);f.change('online',true);f.put(A.MODE,8);f.run();assert.equal(f.wallLog.updates.at(-1).state.network,true);assert.equal(f.wallLog.updates.at(-1).allowNetwork,undefined);assert.match(f.nodes['walls-state'].textContent,/Paused online/);
});


test('automatic AI switches drag and native modes both ways while preserving every independent selection',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.35);
 for(const id of ['nos','boost','unlimit','grip','walls','drag','tester'])f.change(id,true);
 const saved=f.prefs();
 for(const drag of [false,true,false,true,false]){
  f.put(A.DRAG,drag?1:0);f.drive(drag?1:2);f.run();const last=f.aiLog.updates.at(-1);
  assert.equal(last.enabled,true);assert.equal(last.safe,true);assert.equal(last.allowDragAI,drag);assert.equal(last.pace,drag?1:1.35);
  assert.match(f.nodes['ai-state'].textContent,drag?/Auto · drag AI/:/Auto · native AI/);
  assert.deepEqual(f.prefs(),saved);assert.deepEqual(f.aiLog.keys,[]);
 }
});
test('automatic drag waits for GO and does not silently substitute synthetic keys when backend is unavailable',async()=>{
 for(const backend of [false,true]){
  const f=await pageFixture(null,backend);f.put(A.DRAG,1);f.put(f.race,3);f.drive(1);f.change('ai',true);f.change('drag',true);f.run(20);
  assert.deepEqual(f.aiLog.keys,[]);assert.match(f.nodes['drag-ai-state'].textContent,/waits for GO/);
  if(backend){assert.equal(f.aiLog.updates.at(-1).safe,false);assert.equal(f.aiLog.updates.at(-1).allowDragAI,true);}
  f.put(f.race,4);f.run();assert.deepEqual(f.aiLog.keys,[]);
  if(backend)assert.equal(f.aiLog.updates.at(-1).safe,true);else assert.match(f.nodes['ai-state'].textContent,/Reload with the native AI module/);
 }
});
test('manual takeover remains off through subsequent race-type transitions until deliberately reenabled',async()=>{
 for(const key of ['F7','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space']){
  const f=await pageFixture(null,true);f.change('ai',true);f.change('drag',true);f.put(A.DRAG,1);f.run();f.press(key);
  for(const drag of [false,true,false]){f.put(A.DRAG,drag?1:0);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(f.aiLog.updates.at(-1).allowDragAI,false);assert.deepEqual(f.aiLog.keys,[]);}
  f.change('ai',true);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,true);
 }
});
test('automatic drag cannot override online, focus, hidden or menu guards and resumes only selected settings',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.put(A.DRAG,1);f.put(A.MODE,8);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);
 f.change('online',true);f.run();assert.equal(f.aiLog.updates.at(-1).safe,true);assert.equal(f.aiLog.updates.at(-1).allowNetwork,true);
 f.focus(false);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);f.focus(true);f.hidden(true);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);
 f.hidden(false);f.drive(0);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);f.drive(1);f.put(f.race,6);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);
 f.put(f.race,4);f.run();assert.equal(f.aiLog.updates.at(-1).safe,true);assert.equal(f.nodes.ai.checked,true);
 f.press('F9');f.put(A.DRAG,0);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(f.aiLog.updates.at(-1).allowNetwork,false);
});


test('dyno UI starts off, gates requests, and pauses driving effects during search',async()=>{
 const f=await pageFixture(JSON.stringify({dyno:true}),true,true);f.run();assert.equal(f.nodes['dyno-enable'].checked,false);assert.equal(f.nodes['dyno-find'].disabled,true);
 f.change('boost',true);f.change('nos',true);f.change('ai',true);f.run(3);assert.equal(f.read(0x2dc),.75);
 f.change('dyno-enable',true);f.run();assert.equal(f.nodes['dyno-find'].disabled,false);f.change('dyno-goal','peakPower');f.click('dyno-find');
 assert.equal(f.dynoLog.finds,1);assert.equal(f.read(0x2dc),.5);assert.equal(f.prefs().boost,true);f.run(4);assert.equal(f.read(0x2dc),.5);assert.equal(f.nodes['dyno-find'].disabled,true);assert.equal(f.nodes['dyno-cancel'].disabled,false);
 f.dynoLog.instance.finish();await new Promise(r=>setImmediate(r));f.run();assert.match(f.nodes['dyno-state'].textContent,/200.0 → 220.0 kW/);assert.equal(f.nodes['dyno-apply'].disabled,false);assert.equal(f.dynoLog.applies,0);
 f.click('dyno-apply');await new Promise(r=>setImmediate(r));assert.equal(f.dynoLog.applies,1);assert.equal(f.nodes['dyno-restore'].disabled,false);assert.equal(f.nodes['dyno-find'].disabled,true);
 f.click('dyno-restore');await new Promise(r=>setImmediate(r));assert.equal(f.dynoLog.restores,1);assert.match(f.nodes['dyno-state'].textContent,/restored and confirmed/);
});
test('dyno search cancels on stop, panel close, blur, hide and opt-out; an applied tune is kept',async()=>{
 for(const action of [f=>f.click('dyno-cancel'),f=>f.press('F9'),f=>f.press('Escape'),f=>f.focus(false),f=>f.hidden(true),f=>f.change('dyno-enable',false)]){
  const f=await pageFixture(null,true,true);f.click('min');f.change('dyno-enable',true);f.change('dyno-goal','peakTorque');f.click('dyno-find');assert.equal(f.dynoLog.instance.busy,true);action(f);await new Promise(r=>setImmediate(r));assert.equal(f.dynoLog.instance.busy,false);assert.match(f.nodes['dyno-state'].textContent,/cancelled/);
 }
 const f=await pageFixture(null,true,true);f.dynoLog.instance.applied={};f.change('dyno-enable',true);f.press('F9');assert.equal(f.nodes['dyno-enable'].checked,false);assert.ok(f.dynoLog.instance.applied);assert.equal(f.dynoLog.restores,0);
});

test('free-roam and race pace profiles are independent and drag/dyno/unknown stay neutral',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.input('pace-factor',1.3);f.change('ai-pace',true);f.input('race-pace-factor',1.1);
 const check=(type,mode,drag,want)=>{f.put(0x89e7b0,type);f.drive(mode);f.put(A.DRAG,drag);f.run();assert.equal(f.aiLog.updates.at(-1).pace,want,`type${type}/HUD${mode}/drag${drag}`);};
 check(0,2,0,1.3);check(0,1,0,1);check(1,1,0,1);check(7,2,0,1);
 f.change('race-pace',true);check(1,1,0,1.1);check(7,2,0,1.1);check(0,2,0,1.3);
 for(const type of [0,1,7,8,99])check(type,2,1,1);
 check(8,2,0,1);check(99,2,0,1);
 f.change('ai-pace',false);check(0,2,0,1);check(1,1,0,1.1);
});
test('new corner and both pace opt-ins start off while saved factors survive',async()=>{
 const f=await pageFixture(JSON.stringify({cornerAssist:true,cornerFactor:.65,racePace:true,racePaceFactor:1.2,aiPace:true,paceFactor:1.25}),true);f.run();
 assert.equal(f.nodes['corner-assist'].checked,false);assert.equal(f.nodes['race-pace'].checked,false);assert.equal(f.nodes['corner-factor'].value,.65);assert.equal(f.nodes['race-pace-factor'].value,1.2);
 assert.equal(f.nodes['ai-pace'].checked,false);assert.equal(f.nodes['pace-factor'].value,1.25);assert.equal(f.aiLog.updates.at(-1).cornerAssist,false);assert.equal(f.aiLog.updates.at(-1).cornerFactor,.65);
 f.change('corner-assist',true);f.change('race-pace',true);f.change('ai',true);f.run();assert.equal(f.aiLog.updates.at(-1).cornerAssist,true);f.aiLog.cornerApplied=.65;f.run();assert.match(f.nodes['corner-state'].textContent,/.65× corner-speed cap confirmed/);
 f.press('F7');f.put(0x89e7b0,1);f.drive(1);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(f.prefs().cornerAssist,true);
 f.put(0x89e7b0,0);f.drive(2);f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false,'category changes do not undo manual takeover');
 f.press('F9');f.run();for(const id of ['corner-assist','race-pace','ai-pace'])assert.equal(f.nodes[id].checked,false);assert.equal(f.aiLog.updates.at(-1).cornerAssist,false);assert.equal(f.aiLog.updates.at(-1).pace,1);
});
test('dyno busy suspends every driving effect without clearing requested choices',async()=>{
 const f=await pageFixture(null,true,true);for(const id of ['ai','walls','nos','boost','unlimit','grip','drag','ai-pace','race-pace','corner-assist'])f.change(id,true);f.run(3);
 f.change('dyno-enable',true);f.click('dyno-find');const stops=f.wallLog.stops;const updates=f.aiLog.updates.length;f.run(5);
 assert.ok(f.wallLog.stops>stops);assert.equal(f.aiLog.updates.length,updates);assert.equal(f.read(0x2dc),.5);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),1);
 for(const name of ['ai','walls','nos','boost','unlimit','grip','drag','aiPace','racePace','cornerAssist'])assert.equal(f.prefs()[name],true);
 f.click('dyno-cancel');await new Promise(r=>setImmediate(r));assert.equal(f.dynoLog.instance.busy,false);
});


test('menu uses one shadow-scoped constructed stylesheet without inline styles or duplicated section initials',async()=>{
  const f=await pageFixture();
  assert.equal(f.stylesheets().length,1);
  assert.equal(f.adoptedStylesheets().length,1);
  assert.equal(f.adoptedStylesheets()[0],f.stylesheets()[0]);
  assert.match(f.stylesheets()[0].css,/\.launcher\{/);
  assert.match(f.stylesheets()[0].css,/\[hidden\]\{display:none!important\}/);
  assert.doesNotMatch(f.html(),/<style\b|\sstyle=/i);
  assert.equal([...f.html().matchAll(/class="section-icon" aria-hidden="true"><\/span>/g)].length,7);
  assert.doesNotMatch(f.html(),/class="section-icon"[^>]*>[A-Z]/);
});

test('metadata alone never enables memory writes without verified module identity',async()=>{
  const f=await pageFixture(null,true,true,{verified:false});f.change('nos',true);f.change('boost',true);f.change('grip',true);const before=Buffer.from(new Uint8Array(f.memory.buffer));f.run(5);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.match(f.nodes.live.textContent,/not verified/);assert.equal(f.dynoLog.instance,null);
});
test('a metadata/module revision mismatch remains disabled',async()=>{
  const f=await pageFixture(null,true,false,{revision:'2f0ddd3b',profileRevision:'6f4f1e4e'});f.change('boost',true);f.run(4);assert.equal(f.read(0x2dc),0.5);assert.match(f.nodes.live.textContent,/not verified/);
});
test('current verified profile enables legacy tools while blocking absent native capabilities',async()=>{
  const f=await pageFixture(null,true,true,{revision:'2f0ddd3b',capabilities:{legacy:true,ai:true,pace:false,corner:false,walls:false,dyno:false,dragAI:false}});f.change('boost',true);f.run(3);assert.equal(f.read(0x2dc),0.75);assert.equal(f.nodes.walls.disabled,true);assert.equal(f.nodes['dyno-enable'].disabled,true);assert.equal(f.nodes['corner-assist'].disabled,true);assert.equal(f.nodes['ai-pace'].disabled,true);assert.equal(f.dynoLog.instance,null);assert.equal(f.wallLog.controllers.length,0);assert.match(f.nodes['dyno-state'].textContent,/not.*verified/i);
});

test('a different unverified module cannot inherit trust by reusing verified memory',async()=>{
 let lookups=0;const f=await pageFixture(null,true,true,{verifier:()=>++lookups===1?{revision:'6f4f1e4e',capabilities:{legacy:true,ai:true,pace:true,corner:true,walls:true,dyno:true,dragAI:true}}:null});
 const replacement=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));f.worker.postMessage({mod:replacement,memory:f.memory,slot:0});f.worker.emit({t:'register',kind:5,ptr:f.status});
 assert.equal(lookups,2);f.change('boost',true);f.change('grip',true);f.change('nos',true);const before=Buffer.from(f.memory.buffer);f.run(5);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(f.read(0x2dc),0.5);assert.match(f.nodes.live.textContent,/not verified/);
});

test('replacing a verified module restores owned power and grip before retiring its ledger',async()=>{
 let lookups=0;const f=await pageFixture(null,true,false,{verifier:()=>++lookups===1?{revision:'6f4f1e4e',capabilities:{legacy:true,ai:true,pace:true,corner:true,walls:true,dyno:true,dragAI:true}}:null});
 f.change('boost',true);f.change('grip',true);f.run(3);assert.equal(f.read(0x2dc),0.75);assert.ok(f.d.getFloat32(f.wheels[0]+0x188,true)>1);
 f.worker.postMessage({mod:new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0])),memory:f.memory,slot:0});assert.equal(f.read(0x2dc),0.5);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),1);const before=Buffer.from(f.memory.buffer);f.run(5);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('late register and exit events from a retired worker cannot replace the current session',async()=>{
 const f=await pageFixture(null,true),newWorker=f.createWorker();newWorker.postMessage({mod:new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0])),memory:f.memory,slot:0});newWorker.emit({t:'register',kind:5,ptr:f.status});f.worker.emit({t:'register',kind:5,ptr:0xe00000});f.worker.emit({t:'exit'});f.change('boost',true);f.run(3);assert.equal(f.read(0x2dc),0.75);assert.match(f.nodes.live.textContent,/Game linked/);
});

test('a trap in any worker of the current game session restores tools and stops writes',async()=>{
 const f=await pageFixture(null,true),secondary=f.createWorker();secondary.postMessage({mod:f.gameModule,memory:f.memory,slot:1});f.change('boost',true);f.change('grip',true);f.run(3);assert.equal(f.read(0x2dc),0.75);secondary.emit({t:'trap',tid:7,msg:'native crash'});secondary.emit({t:'exit',code:134});assert.equal(f.read(0x2dc),0.5);assert.equal(f.d.getFloat32(f.wheels[0]+0x188,true),1);const before=Buffer.from(f.memory.buffer);f.run(3);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.match(f.nodes.live.textContent,/Waiting for game/);
});
test('a retired secondary worker cannot stop a replacement session even when memory is reused',async()=>{
 const f=await pageFixture(null,true),secondary=f.createWorker();secondary.postMessage({mod:f.gameModule,memory:f.memory,slot:1});const next=f.createWorker();next.postMessage({mod:f.gameModule,memory:f.memory,slot:0});next.emit({t:'register',kind:5,ptr:f.status});secondary.emit({t:'trap',tid:7});secondary.emit({t:'exit',code:134});f.change('boost',true);f.run(3);assert.equal(f.read(0x2dc),0.75);assert.match(f.nodes.live.textContent,/Game linked/);
});

test('full current profile wires all capabilities, dyno revision and current wall addresses',async()=>{
 const profile=require('../extension/current-profile.js'),f=await pageFixture(null,true,true,{revision:'2f0ddd3b',profile});f.run();for(const id of ['walls','cars','dyno-enable','ai-pace','race-pace','corner-assist'])assert.equal(f.nodes[id].disabled,false,id);assert.equal(f.dynoLog.instance.revision,'2f0ddd3b');assert.deepEqual(f.wallLog.controllers[0].profile.onlineAddresses,[704405244,704522128,704406412]);assert.equal(f.aiLog.controllers[0].patched,true);
});

test('current car no-clip is an independent explicit opt-in, never restored on reload',async()=>{
 const profile=require('../extension/current-profile.js'),f=await pageFixture(JSON.stringify({cars:true,walls:true}),true,false,{revision:'2f0ddd3b',profile});
 f.run();assert.equal(f.nodes.cars.checked,false);assert.equal(f.carLog.updates.at(-1).enabled,false);assert.equal(f.carLog.controllers[0].profile.magic,0x3143414e);
 f.change('cars',true);f.run();assert.equal(f.carLog.updates.at(-1).enabled,true);assert.equal(f.carLog.updates.at(-1).safe,true);assert.equal(f.wallLog.updates.at(-1).enabled,false);assert.equal(f.aiLog.updates.at(-1).enabled,false);
 const independent=f.carLog.stops;f.change('walls',true);f.change('walls',false);assert.equal(f.carLog.stops,independent,'wall toggle does not stop the car toggle');
 const count=f.carLog.stops;f.change('cars',false);assert(f.carLog.stops>count);f.change('cars',true);f.press('F9');assert.equal(f.nodes.cars.checked,false);assert.equal(f.prefs().cars,false);
});
test('current car no-clip pauses on focus, dyno activity and any current worker fatal event',async()=>{
 const profile=require('../extension/current-profile.js'),f=await pageFixture(null,true,true,{revision:'2f0ddd3b',profile});f.change('cars',true);f.run();let count=f.carLog.stops;f.focus(false);assert(f.carLog.stops>count);f.run();assert.equal(f.carLog.updates.at(-1).safe,false);
 f.focus(true);f.run();assert.equal(f.carLog.updates.at(-1).safe,true);count=f.carLog.stops;f.dynoLog.instance.busy=true;f.run();assert(f.carLog.stops>count);f.dynoLog.instance.busy=false;
 const secondary=f.createWorker();secondary.postMessage({mod:f.gameModule,memory:f.memory,slot:1});count=f.carLog.stops;secondary.emit({t:'trap'});assert(f.carLog.stops>count);
});
test('solo car no-clip stays blocked online despite race permission being forwarded',async()=>{
 const profile=require('../extension/current-profile.js'),f=await pageFixture(null,true,false,{revision:'2f0ddd3b',profile});f.change('cars',true);f.change('online',true);f.put(A.MODE,8);f.run();assert.equal(f.carLog.updates.at(-1).allowNetwork,true);assert.equal(f.carLog.updates.at(-1).state.network,true);assert.match(f.nodes['cars-state'].textContent,/Paused online/);
 const old=await pageFixture(null,true);old.run();assert.equal(old.carLog.controllers.length,0);assert.equal(old.nodes.cars.disabled,true);
});

test('combined power and grip stress does not compound through 5000 adjustments and exact restores',()=>{
 const f=performanceFixture(),physics=0xe18000,wheels=[0xe19000,0xe1a000,0xe1b000,0xe1c000];f.put(f.car+0x34,physics);
 wheels.forEach((w,i)=>{f.put(physics+0x38+i*4,w);f.d.setFloat32(w+0x188,1,true);});
 const base=f.read(0x230);
 for(let i=0;i<5000;i++){
  const s=f.e.state(),power=1+(i%21)/10,grip=1+(i%11)/10;
  f.e.tunePerformance(s,power,i%2===0);f.e.tuneGrip(s,grip);
  assert.equal(f.read(0x230),Math.fround(base*power));assert.equal(f.read(0x2dc),Math.fround(.5*power));assert.equal(f.read(0x2c0),i%2===0?0:150);
  wheels.forEach(w=>assert.equal(f.d.getFloat32(w+0x188,true),Math.fround(grip)));
  if(i%7===0){f.e.restorePerformance(s);f.e.restoreGrip(s);assert.equal(f.read(0x230),base);assert.equal(f.read(0x2dc),.5);wheels.forEach(w=>assert.equal(f.d.getFloat32(w+0x188,true),1));}
 }
 f.e.restorePerformance(f.e.state());f.e.restoreGrip(f.e.state());assert.equal(f.read(0x230),base);assert.equal(f.read(0x2c0),150);
});
test('page power/grip survive 100 pause/resume cycles without carrying multipliers into baseline',async()=>{
 const f=await pageFixture(null,true);f.change('boost',true);f.input('power',3);f.change('grip',true);f.input('grip-factor',2);
 for(let i=0;i<100;i++){
  f.run(3);assert.equal(f.read(0x2dc),1.5);f.wheels.forEach(w=>assert.equal(f.d.getFloat32(w+0x188,true),2));
  f.focus(false);f.run();assert.equal(f.read(0x2dc),.5);f.wheels.forEach(w=>assert.equal(f.d.getFloat32(w+0x188,true),1));
  f.focus(true);
 }
 f.press('F9');assert.equal(f.read(0x2dc),.5);f.wheels.forEach(w=>assert.equal(f.d.getFloat32(w+0x188,true),1));
});

function interleaveBeforeCompare(e,action){const real=e.compareFloat.bind(e);let ran=false;e.compareFloat=(...args)=>{if(!ran){ran=true;action();}return real(...args);};return ()=>ran;}
test('apply and restore refuse a retired grip/ride identity immediately before a field operation',()=>{
 for(const type of ['power','grip'])for(const restoring of [false,true]){
  const f=type==='power'?performanceFixture():gripFixture(),s=f.e.state();
  const apply=()=>type==='power'?f.e.tunePerformance(s,1.5,true):f.e.tuneGrip(s,1.3);
  const restore=()=>type==='power'?f.e.restorePerformance(s):f.e.restoreGrip(s);
  if(restoring)apply();
  const retired=type==='power'?[...Array.from({length:9},(_,i)=>f.pi+0x230+i*4),f.pi+0x2dc,f.pi+0x2c0]:f.wheels.map(w=>w+0x188);
  const ran=interleaveBeforeCompare(f.e,()=>{f.put(f.car+(type==='power'?0x10:0x34),0xe80000);retired.forEach(p=>f.d.setFloat32(p,99,true));});
  restoring?restore():apply();assert(ran(),'interleaving was executed');retired.forEach(p=>assert.equal(f.d.getFloat32(p,true),99));
 }
});
test('compare-and-swap preserves another writer after the final ownership check',()=>{
 for(const restoring of [false,true]){
  const f=gripFixture(),s=f.e.state();if(restoring)f.e.tuneGrip(s,1.3);
  const real=f.e.compareFloat.bind(f.e);let ran=false;
  f.e.compareFloat=(p,expected,value,guard)=>real(p,expected,value,()=>{const result=guard();if(!ran){ran=true;f.d.setFloat32(p,.8,true);}return result;});
  restoring?f.e.restoreGrip(s):f.e.tuneGrip(s,1.3);assert(ran);assert.equal(f.read()[0],Math.fround(.8));assert.deepEqual(f.read().slice(1),[1,1,1]);
 }
});
test('partial adjustment rolls back only successful owned fields when another field changes',()=>{
 const f=performanceFixture(),s=f.e.state(),real=f.e.compareFloat.bind(f.e);let count=0,ran=false;
 f.e.compareFloat=(p,expected,value,guard)=>{if(++count===4){ran=true;f.d.setFloat32(p,.77,true);}return real(p,expected,value,guard);};
 assert.equal(f.e.tunePerformance(s,2,true).changed,true);assert(ran);assert.equal(f.read(0x230),Math.fround(.2));assert.equal(f.read(0x23c),Math.fround(.77));assert.equal(f.read(0x2dc),.5);assert.equal(f.e.performancePatch,null);
});
test('fresh pause/network state blocks NOS, power and grip despite an earlier driving snapshot',()=>{
 for(const type of ['power','grip','nos'])for(const pause of [false,true]){
  const f=type==='power'?performanceFixture():type==='grip'?gripFixture():fixture(),s=f.e.state();
  if(pause)f.put(f.race,6);else f.put(A.MODE,8);
  const before=Buffer.from(f.memory.buffer);const result=type==='power'?f.e.tunePerformance(s,1.5,true):type==='grip'?f.e.tuneGrip(s,1.3):f.e.refill(s);
  assert.equal(type==='nos'?result:result.ok,false);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 }
});
test('out-of-domain power results are rejected before any write or oscillation',()=>{
 const f=performanceFixture(),s=f.e.state();f.set(0x230,7);const before=Buffer.from(f.memory.buffer);
 for(let i=0;i<10;i++){const r=f.e.tunePerformance(s,3,true);assert.equal(r.ok,false);assert.match(r.reason,/range/);assert.equal(f.e.performancePatch,null);}
 assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('unchanged power and grip factors avoid repeat atomic stores',()=>{
 const f=performanceFixture(),g=gripFixture(),s=f.e.state(),t=g.e.state();f.e.tunePerformance(s,2,true);g.e.tuneGrip(t,1.5);
 const original=Atomics.compareExchange;let count=0;Atomics.compareExchange=(...args)=>{count++;return original(...args);};
 try{for(let i=0;i<50;i++){f.e.tunePerformance(s,2,true);g.e.tuneGrip(t,1.5);}}finally{Atomics.compareExchange=original;}
 assert.equal(count,0);
});


test('3x pace controls stay separate for free roam and races, neutral for drag',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('ai-pace',true);f.change('race-pace',true);f.input('pace-factor',3);f.input('race-pace-factor',2.5);f.run();assert.equal(f.aiLog.updates.at(-1).pace,3);
 f.put(0x89e7b0,1);f.drive(1);f.run();assert.equal(f.aiLog.updates.at(-1).pace,2.5);f.put(A.DRAG,1);f.run();assert.equal(f.aiLog.updates.at(-1).pace,1);assert.equal(f.aiLog.updates.at(-1).allowDragAI,true);
 f.press('F7');f.run();assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.match(f.html(),/2–3× pace is especially unstable/);
});


test('dyno UI refreshes current mode before gating buttons and labels it without stale success text',async()=>{
 const f=await pageFixture(null,true,true);f.change('dyno-enable',true);f.run();
 assert.match(f.nodes['dyno-mode'].textContent,/slot 1 of 5/);
 const dyno=f.dynoLog.instance;dyno.applied={};f.run();assert.equal(f.nodes['dyno-find'].disabled,true);
 dyno.kind=1;dyno.syncContext=function(){const changed=this.context?.kind!==this.kind;if(changed){this.applied=null;this.outcome=null;}this.context={kind:this.kind};return {...this.context,changed};};
 f.run();assert.equal(f.nodes['dyno-find'].disabled,false);assert.equal(f.nodes['dyno-restore'].disabled,true);assert.match(f.nodes['dyno-mode'].textContent,/slot 2 of 5/);assert.match(f.nodes['dyno-state'].textContent,/Ready for the selected mode/);
 dyno.usable=false;f.run();assert.equal(f.nodes['dyno-find'].disabled,true);assert.match(f.nodes['dyno-mode'].textContent,/Choose a race mode/);
});


test('sharp-turn margin is adjustable, passed to controller, saved and reset to baseline at zero',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('corner-assist',true);f.run();
 assert.equal(f.aiLog.updates.at(-1).cornerMargin,15);assert.equal(f.nodes['corner-margin-value'].textContent,'15%');
 f.input('corner-margin',25);f.run();assert.equal(f.aiLog.updates.at(-1).cornerMargin,25);assert.equal(f.prefs().cornerMargin,25);
 assert.equal(f.nodes['corner-margin'].attrs['aria-valuetext'],'25 percent');
 f.input('corner-margin',0);f.run();assert.equal(f.aiLog.updates.at(-1).cornerMargin,0);
 const reloaded=await pageFixture(JSON.stringify({...f.prefs(),cornerMargin:25,cornerAssist:true}),true);reloaded.run();
 assert.equal(reloaded.nodes['corner-margin'].value,25);assert.equal(reloaded.aiLog.updates.at(-1).cornerAssist,false);
});

const trafficCompatibility=()=>({revision:'78e2bb69',profile:require('../extension/latest-profile.js')});
test('online traffic checkbox is separate, capability-gated and never restored from storage',async()=>{
 const f=await pageFixture(JSON.stringify({traffic:true,cars:true,online:true}),true,false,trafficCompatibility());f.run();
 assert.equal(f.nodes.traffic.disabled,false);assert.equal(f.nodes.traffic.checked,false);assert.equal(f.carLog.updates.at(-1).onlineTraffic,false);assert.equal(f.carLog.updates.at(-1).enabled,false);assert.equal(f.nodes.online.checked,false);
 f.change('cars',true);f.run();assert.equal(f.carLog.updates.at(-1).enabled,true);assert.equal(f.carLog.updates.at(-1).onlineTraffic,false);
 f.change('traffic',true);f.run();assert.equal(f.carLog.updates.at(-1).onlineTraffic,true);assert.equal(f.prefs().traffic,true);assert.equal(f.nodes.online.checked,false);
 const restored=await pageFixture(f.stored(),true,false,trafficCompatibility());restored.run();assert.equal(restored.nodes.traffic.checked,false);assert.equal(restored.carLog.updates.at(-1).onlineTraffic,false);
 for(const profile of [require('../extension/current-profile.js'),{revision:'unknown',capabilities:{cars:true}}]){
  const old=await pageFixture(null,true,false,{revision:profile.revision,profile});old.run();assert.equal(old.nodes.traffic.disabled,true);old.change('traffic',true);old.run();assert.equal(old.nodes.traffic.checked,false);assert.equal(old.carLog.updates.at(-1).onlineTraffic,false);
 }
});
test('online traffic UI distinguishes armed and confirmed traffic from paused solo collisions',async()=>{
 const f=await pageFixture(null,true,false,trafficCompatibility());f.run();f.change('cars',true);f.change('traffic',true);
 f.carLog.result={onlineTraffic:true,requested:true,soloReason:'Paused online · use Online traffic no-clip',trafficReason:'Armed · online traffic only · player cars unchanged'};f.run();
 assert.match(f.nodes['cars-state'].textContent,/Paused online/);assert.match(f.nodes['traffic-state'].textContent,/Armed · online traffic only/);
 f.carLog.result.trafficReason='3 traffic contacts skipped · player cars unchanged';f.run();assert.match(f.nodes['traffic-state'].textContent,/3 traffic contacts/);assert.equal(f.nodes['traffic-state'].title,f.nodes['traffic-state'].textContent);
 f.carLog.result.trafficReason='Waiting for online free roam. Races and outruns keep normal collisions.';f.run();assert.match(f.nodes['traffic-state'].textContent,/Races and outruns/);
 f.change('traffic',false);f.run();assert.match(f.nodes['traffic-state'].textContent,/OFF · traffic only/);assert.equal(f.carLog.updates.at(-1).enabled,true);
});
test('online traffic stops on blur, hidden tab, dyno work and F9, with only F9 clearing selection',async()=>{
 const f=await pageFixture(null,true,true,trafficCompatibility());f.run();f.change('traffic',true);f.run();
 let stops=f.carLog.stops;f.focus(false);assert.ok(f.carLog.stops>stops);f.run();assert.equal(f.carLog.updates.at(-1).safe,false);assert.equal(f.carLog.updates.at(-1).onlineTraffic,true);f.focus(true);
 stops=f.carLog.stops;f.hidden(true);assert.ok(f.carLog.stops>stops);f.run();assert.equal(f.carLog.updates.at(-1).safe,false);f.hidden(false);
 stops=f.carLog.stops;f.dynoLog.instance.busy=true;f.run();assert.ok(f.carLog.stops>stops);f.dynoLog.instance.busy=false;f.run();assert.equal(f.carLog.updates.at(-1).onlineTraffic,true);
 stops=f.carLog.stops;f.press('F9');assert.ok(f.carLog.stops>stops);assert.equal(f.nodes.traffic.checked,false);assert.equal(f.prefs().traffic,false);f.run();assert.equal(f.carLog.updates.at(-1).onlineTraffic,false);
});

test('corner UI distinguishes no-hit request from observed guards and independent 3x pace',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('corner-assist',true);f.change('ai-pace',true);f.input('corner-factor',.95);f.input('pace-factor',3);f.aiLog.paceApplied=3;f.aiLog.cornerHits=0;f.run();
 assert.match(f.nodes['ai-pace-state'].textContent,/3.00× confirmed/);assert.match(f.nodes['corner-state'].textContent,/Armed · no native corner reduction recorded/);
 f.aiLog.cornerMemoryBlocked=true;f.run();assert.match(f.nodes['corner-state'].textContent,/Blocked · corner command memory is occupied/);
 f.aiLog.cornerMemoryBlocked=false;f.aiLog.cornerDriftBlocked=true;f.run();assert.match(f.nodes['corner-state'].textContent,/Paused · drift mode/);
 f.aiLog.cornerDriftBlocked=false;f.aiLog.cornerRequested=false;f.run();assert.match(f.nodes['corner-state'].textContent,/Not armed/);
 f.aiLog.cornerRequested=true;f.aiLog.cornerApplied=.95;f.run();assert.match(f.nodes['corner-state'].textContent,/0.95× corner-speed cap confirmed/);
});

test('online player no-clip is a separate exact-capability opt-in that never restores from storage',async()=>{
 const f=await pageFixture(JSON.stringify({players:true,traffic:true,cars:true,online:true}),true,false,trafficCompatibility());f.run();
 assert.equal(f.nodes.players.disabled,false);assert.equal(f.nodes.players.checked,false);assert.equal(f.carLog.updates.at(-1).onlinePlayers,false);assert.equal(f.nodes.traffic.checked,false);assert.equal(f.nodes.online.checked,false);
 f.change('players',true);f.run();assert.equal(f.carLog.updates.at(-1).onlinePlayers,true);assert.equal(f.carLog.updates.at(-1).onlineTraffic,false);assert.equal(f.carLog.updates.at(-1).enabled,false);assert.equal(f.prefs().players,true);assert.equal(f.nodes.online.checked,false);
 f.change('traffic',true);f.run();assert.equal(f.carLog.updates.at(-1).onlinePlayers,true);assert.equal(f.carLog.updates.at(-1).onlineTraffic,true);
 f.change('players',false);f.run();assert.equal(f.carLog.updates.at(-1).onlinePlayers,false);assert.equal(f.carLog.updates.at(-1).onlineTraffic,true);
 const reloaded=await pageFixture(JSON.stringify({...f.prefs(),players:1}),true,false,trafficCompatibility());reloaded.run();assert.equal(reloaded.nodes.players.checked,false);assert.equal(reloaded.carLog.updates.at(-1).onlinePlayers,false);
 for(const profile of [require('../extension/current-profile.js'),{...require('../extension/latest-profile.js'),capabilities:{...require('../extension/latest-profile.js').capabilities,onlinePlayers:false}}]){const old=await pageFixture(null,true,false,{revision:profile.revision,profile});old.run();assert.equal(old.nodes.players.disabled,true);old.change('players',true);old.run();assert.equal(old.nodes.players.checked,false);assert.equal(old.carLog.updates.at(-1).onlinePlayers,false);}
});
test('player and traffic rows show their own armed and observed contact status independently',async()=>{
 const f=await pageFixture(null,true,false,trafficCompatibility());f.run();f.change('players',true);f.change('traffic',true);f.carLog.result={onlinePlayers:true,onlineTraffic:true,requested:true,playersReason:'Armed · online player cars only',trafficReason:'2 traffic contacts skipped',playerHits:0,trafficHits:2,hits:2};f.run();
 assert.match(f.nodes['players-state'].textContent,/Armed · online player cars only/);assert.match(f.nodes['traffic-state'].textContent,/2 traffic contacts/);
 f.carLog.result.playersReason='1 player-car contacts skipped';f.run();assert.match(f.nodes['players-state'].textContent,/1 player-car contacts/);assert.equal(f.nodes['players-state'].title,f.nodes['players-state'].textContent);assert.match(f.nodes['traffic-state'].textContent,/2 traffic contacts/);
 f.carLog.result.playersReason='Waiting for online free roam. Races and outruns keep normal collisions.';f.run();assert.match(f.nodes['players-state'].textContent,/Races and outruns/);
 f.change('players',false);f.run();assert.match(f.nodes['players-state'].textContent,/OFF · players \/ online race cars/);
});
test('player selection pauses on focus, hidden tab and dyno activity; F9 clears both online collision choices',async()=>{
 const f=await pageFixture(null,true,true,trafficCompatibility());f.run();f.change('players',true);f.change('traffic',true);f.run();
 let stops=f.carLog.stops;f.focus(false);assert.ok(f.carLog.stops>stops);f.run();assert.equal(f.carLog.updates.at(-1).safe,false);assert.equal(f.carLog.updates.at(-1).onlinePlayers,true);f.focus(true);
 stops=f.carLog.stops;f.hidden(true);assert.ok(f.carLog.stops>stops);f.run();assert.equal(f.carLog.updates.at(-1).safe,false);f.hidden(false);
 stops=f.carLog.stops;f.dynoLog.instance.busy=true;f.run();assert.ok(f.carLog.stops>stops);f.dynoLog.instance.busy=false;f.run();assert.equal(f.carLog.updates.at(-1).onlinePlayers,true);
 stops=f.carLog.stops;f.press('F9');assert.ok(f.carLog.stops>stops);assert.equal(f.nodes.players.checked,false);assert.equal(f.nodes.traffic.checked,false);assert.equal(f.prefs().players,false);f.run();assert.equal(f.carLog.updates.at(-1).onlinePlayers,false);assert.equal(f.carLog.updates.at(-1).onlineTraffic,false);
});

// Capacity is selected from the verified module profile, never live metadata alone.
test('corner status distinguishes missing native plan from missing confirmation without memory writes',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('corner-assist',true);f.aiLog.cornerMode=1;f.aiLog.cornerHits=0;
 const before=Buffer.from(f.memory.buffer);
 const cases=[
  [{cornerRouteOwned:true,cornerRouteNodes:12,cornerPlannerCorners:0,cornerProbeStage:0,cornerGuardMask:0},/native plan currently has no corner entries/],
  [{cornerRouteOwned:true,cornerRouteNodes:12,cornerPlannerCorners:2,cornerProbeStage:0,cornerGuardMask:0},/no native corner reduction recorded/],
  [{cornerProbeStage:3,cornerGuardMask:128},/native corner checks not yet complete/],
  [{cornerProbeStage:5,cornerGuardMask:0},/planner reached; no speed reduction recorded/],
  [{cornerProbeStage:6,cornerGuardMask:0},/limiting curve seen; reduction not confirmed/]
 ];
 for(const [context,expected] of cases){f.aiLog.cornerContext=context;f.run();const node=f.nodes['corner-state'];assert.match(node.textContent,expected);assert.doesNotMatch(node.textContent,/cap confirmed/);assert.match(node.title,/snapshots, not a proven cause/);assert.equal(f.prefs().cornerAssist,true);}
 assert.deepEqual(Buffer.from(f.memory.buffer),before);
 f.aiLog.cornerContext={cornerRouteNodes:12,cornerPlannerCorners:2,cornerProbeStage:3,cornerGuardMask:128};f.run();assert.match(f.nodes['corner-state'].title,/Sampled unmet checks: private route/);assert.match(f.nodes['corner-state'].title,/Native route points: 12; corner entries: 2/);
 f.aiLog.cornerHits=1;f.run();assert.match(f.nodes['corner-state'].textContent,/current settings confirmation/);
 f.aiLog.cornerApplied=.73;f.run();assert.match(f.nodes['corner-state'].textContent,/0.73× corner-speed cap confirmed/);
});
test('corner scope and pending evidence remain independent between free roam and road races',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('corner-assist',true);f.change('race-corner-assist',true);f.aiLog.cornerMode=2;f.aiLog.cornerRequested=true;f.aiLog.cornerContext={cornerProbeStage:5,cornerGuardMask:0};
 f.put(0x89e7b0,1);f.drive(1);f.run();assert.match(f.nodes['corner-state'].textContent,/Waiting for free roam/);assert.doesNotMatch(f.nodes['corner-state'].title,/Furthest native check/);assert.match(f.nodes['race-corner-state'].textContent,/planner reached; no speed reduction recorded/);assert.match(f.nodes['race-corner-state'].title,/Furthest native check: 5\/7/);
 f.aiLog.cornerApplied=.7;f.run();assert.match(f.nodes['race-corner-state'].textContent,/0.70× road-race corner cap observed/);
 f.put(A.DRAG,1);f.run();assert.match(f.nodes['race-corner-state'].textContent,/excludes outrun, drag and drift/);
 assert.match(f.html(),/Free-roam corner assist/);assert.match(f.html(),/use the separate Road-race hairpin assist there/);
});
test('corner details reject malformed or absent diagnostic samples without inventing a cause',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('corner-assist',true);f.aiLog.cornerMode=1;f.aiLog.cornerContext={cornerRouteNodes:999,cornerPlannerCorners:-1,cornerProbeStage:99,cornerGuardMask:-1};f.run();
 assert.match(f.nodes['corner-state'].textContent,/no native corner reduction recorded/);assert.match(f.nodes['corner-state'].title,/route points: unknown; corner entries: unknown/);assert.match(f.nodes['corner-state'].title,/native check: unknown\/7/);assert.match(f.nodes['corner-state'].title,/unmet checks: unknown/);
});
test('online road corner and braking settings match solo only after explicit opt-in, without changing collision scopes',async()=>{
 const profile=require('../extension/next-profile.js'),f=await pageFixture(null,true,false,{revision:profile.revision,profile});f.drive(1);f.put(0x89e7b0,1);f.put(0x89e7e3,1);f.change('ai',true);f.change('race-pace',true);f.input('race-pace-factor',1.35);f.change('race-corner-assist',true);f.input('race-corner-factor',.85);f.input('race-corner-margin',20);f.input('race-braking',.7);f.change('walls',true);f.change('cars',true);f.run();
 const fields=x=>[x.raceCornerAssist,x.raceCornerFactor,x.raceCornerMargin,x.raceBraking,x.pace];const solo=fields(f.aiLog.updates.at(-1));assert.equal(solo[0],true);
 for(const [address,value] of [[A.MODE,8],[A.MODE,512],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
  f.put(address,value);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);assert.match(f.nodes['race-corner-state'].textContent,/Paused online/);
  f.change('online',true);f.run();assert.deepEqual(fields(f.aiLog.updates.at(-1)),solo);assert.equal(f.aiLog.updates.at(-1).safe,true);assert.equal(f.aiLog.updates.at(-1).state.network,true);assert.match(f.nodes['walls-state'].textContent,/Paused online/);assert.match(f.nodes['cars-state'].textContent,/Paused online/);assert.equal(f.d.getUint32(address,true),value);
  f.change('online',false);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);assert.equal(f.aiLog.updates.at(-1).safe,false);f.put(address,0);
 }
 assert.equal(f.d.getUint32(0x89e7e3,true),1);f.put(A.MODE,8);f.change('online',true);f.run();f.press('F9');f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);assert.equal(f.aiLog.updates.at(-1).allowNetwork,false);assert.equal(f.nodes['race-corner-assist'].checked,false);
 const after=await pageFixture(f.stored(),true);after.run();assert.equal(after.nodes.online.checked,false);assert.equal(after.nodes['race-corner-assist'].checked,false);
});
test('page reads64-slot status only for verified93 profile and keeps unknown metadata gated',async()=>{
 const profile=require('../extension/next-profile.js');
 for(const verified of [true,false]){
  const f=await pageFixture(null,true,false,{revision:'93af6ccb',profile,verified});
  f.put(f.status+8,64);
  for(let i=2;i<64;i++){Buffer.from(f.d.buffer,f.status+16+i*24,16).write('slot'+i);f.d.setFloat64(f.status+32+i*24,i,true);}
  f.change('boost',true);f.run(5);
  assert.equal(f.read(0x2dc),verified?0.75:0.5);
  if(!verified)assert.equal(f.aiLog.controllers.at(-1).patched,false);
 }
});

test('road-race corner controls default and reload off, retain bounded settings, and reset independently',async()=>{
 const f=await pageFixture(JSON.stringify({raceCornerAssist:true,raceCornerFactor:9,raceCornerMargin:99,raceBraking:-1}),true);f.run();
 assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);assert.equal(f.nodes['race-corner-assist'].checked,false);
 assert.equal(f.nodes['race-corner-factor'].value,.95);assert.equal(f.nodes['race-corner-margin'].value,25);assert.equal(f.nodes['race-braking'].value,.5);
 f.change('race-corner-assist',true);f.change('corner-assist',true);f.input('race-corner-factor',.7);f.input('race-corner-margin',20);f.input('race-braking',.65);f.run();
 assert.equal(f.aiLog.updates.at(-1).cornerAssist,true);assert.equal(f.aiLog.updates.at(-1).cornerFactor,.8);assert.equal(f.aiLog.updates.at(-1).raceCornerFactor,.7);assert.equal(f.aiLog.updates.at(-1).raceCornerMargin,20);assert.equal(f.aiLog.updates.at(-1).raceBraking,.65);
 f.press('F9');f.run();assert.equal(f.prefs().raceCornerAssist,false);assert.equal(f.nodes['race-corner-assist'].checked,false);assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);
 const fresh=await pageFixture(null,true);fresh.run();for(const [k,v]of Object.entries({raceCornerFactor:.8,raceCornerMargin:15,raceBraking:.75}))assert.equal(fresh.aiLog.updates.at(-1)[k],v);
});
test('road-race hairpin opt-in is type1 HUD1 only and never lowers selected straight pace',async()=>{
 const f=await pageFixture(null,true);f.change('ai',true);f.change('race-corner-assist',true);f.change('race-pace',true);f.input('race-pace-factor',3);
 f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);
 f.put(0x89e7b0,1);f.drive(1);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,true);assert.equal(f.aiLog.updates.at(-1).pace,3);
 for(const addr of [0x89e7d8,0x89e7d9,0x890108,0x890104,0x890114]){f.d.setUint8(addr,1);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false,addr.toString(16));f.d.setUint8(addr,0);}
 for(const type of [0,2,3,7]){f.put(0x89e7b0,type);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);}
 f.put(0x89e7b0,1);for(const hud of [0,2,3]){f.drive(hud);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);}
 f.drive(1);f.put(A.MODE,8);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,false);assert.match(f.nodes['race-corner-state'].textContent,/Paused online/);f.change('online',true);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,true);assert.equal(f.aiLog.updates.at(-1).pace,3);f.put(A.MODE,0);f.run();assert.equal(f.aiLog.updates.at(-1).raceCornerAssist,true);
 f.drive(1);f.aiLog.cornerMode=1;f.aiLog.cornerApplied=.7;f.run();assert.doesNotMatch(f.nodes['race-corner-state'].textContent,/observed/);
 f.aiLog.cornerMode=2;f.aiLog.cornerRequested=true;f.aiLog.cornerApplied=null;f.run();assert.match(f.nodes['race-corner-state'].textContent,/no native corner reduction recorded/);
 f.aiLog.cornerApplied=.7;f.aiLog.brakingHits=4;f.run();assert.match(f.nodes['race-corner-state'].textContent,/0.70× road-race corner cap observed · braking hits 4/);assert.equal(f.aiLog.updates.at(-1).pace,3);
});

// The page still requires a separate selection and preserves all stop paths.
test('online race no-clip forwards network permission without enabling other tools',async()=>{
 const profile=require('../extension/next-profile.js'),f=await pageFixture(null,true,false,{revision:profile.revision,profile});f.put(A.MODE,8);f.put(0x89e7b0,1);f.drive(1);f.change('players',true);f.run();
 assert.equal(f.carLog.updates.at(-1).onlinePlayers,true);assert.equal(f.carLog.updates.at(-1).allowNetwork,false);assert.equal(f.carLog.updates.at(-1).safe,false);
 f.change('online',true);f.carLog.result={onlinePlayers:true,onlineRaceCars:true,requested:true,playersReason:'Armed · online race cars · local contacts only'};f.run();
 assert.equal(f.carLog.updates.at(-1).allowNetwork,true);assert.equal(f.carLog.updates.at(-1).safe,true);assert.equal(f.carLog.updates.at(-1).enabled,false);assert.equal(f.carLog.updates.at(-1).onlineTraffic,false);assert.equal(f.wallLog.updates.at(-1).enabled,false);assert.equal(f.aiLog.updates.at(-1).enabled,false);
 assert.match(f.nodes['players-state'].textContent,/online race cars · local contacts only/);assert.match(f.html(),/Race mode checks both cars against the active race roster/);
 f.press('F9');f.run();assert.equal(f.carLog.updates.at(-1).onlinePlayers,false);assert.equal(f.carLog.updates.at(-1).allowNetwork,false);
});

test('Drag blowout toggle persists, stays independent of AI, and F9 clears it',async()=>{
 const profile=require('../extension/next-profile.js'),options={profile,revision:profile.revision},f=await pageFixture(null,true,false,options);f.d.setUint8(A.DRAG,1);f.drive(1);f.run();
 assert.equal(f.nodes['drag-no-blowout'].disabled,false);assert.equal(f.nodes['drag-no-blowout'].checked,false);f.change('ai',true);const before=f.aiLog.stops;f.change('drag-no-blowout',true);f.run();
 assert.equal(f.prefs().dragNoBlowout,true);assert.equal(f.aiLog.updates.at(-1).dragNoBlowout,true);assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.equal(f.aiLog.stops,before);
 f.change('drag-no-blowout',false);f.run();assert.equal(f.aiLog.updates.at(-1).dragNoBlowout,false);assert.equal(f.aiLog.updates.at(-1).enabled,true);assert.equal(f.aiLog.stops,before);
 const saved=await pageFixture(JSON.stringify({dragNoBlowout:true}),true,false,options);saved.run();assert.equal(saved.nodes['drag-no-blowout'].checked,true);saved.press('F9');assert.equal(saved.prefs().dragNoBlowout,false);assert.equal(saved.nodes['drag-no-blowout'].checked,false);
});
test('Drag blowout toggle is unavailable on unknown and legacy game profiles',async()=>{
 for(const options of [{},{profile:require('../extension/current-profile.js'),revision:'2f0ddd3b'},{verified:false}]){
  const f=await pageFixture(null,true,false,options);f.run();assert.equal(f.nodes['drag-no-blowout'].disabled,true);f.change('drag-no-blowout',true);assert.equal(f.prefs().dragNoBlowout,false);
 }
});
test('Drag engine diagnostics are bounded read-only exact-profile samples',()=>{
 const f=fixture(),physics=0xe08000,motor=0xe0a000,params=0xe0c000;f.d.setUint8(A.DRAG,1);f.put(f.car+40,1);f.put(f.car+52,physics);f.put(physics+72,motor);f.put(motor+24,params);f.d.setFloat32(motor+140,-1,true);f.d.setFloat32(params+4,8000,true);
 const before=Buffer.from(f.memory.buffer);assert.deepEqual(f.e.dragEngineDiagnostics(f.e.state(),true),{dragEngineHeat:-1,dragHeatDisabled:true,dragEngineBlown:false,dragEngineLimitRpm:8000});assert.deepEqual(Buffer.from(f.memory.buffer),before);
 assert.deepEqual(f.e.dragEngineDiagnostics(f.e.state(),false),{});f.d.setUint8(A.DRAG,0);assert.deepEqual(f.e.dragEngineDiagnostics(f.e.state(),true),{});f.d.setUint8(A.DRAG,1);f.put(physics+72,0xffffffff);assert.deepEqual(f.e.dragEngineDiagnostics(f.e.state(),true),{});
});


test('online Drag heat UI requires network opt-in without changing driving or NOS choices',async()=>{
 const profile=require('../extension/next-profile.js'),f=await pageFixture(null,true,false,{profile,revision:profile.revision});f.d.setUint8(A.DRAG,1);f.drive(1);f.put(A.MODE,8);f.change('drag-no-blowout',true);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);assert.match(f.nodes['drag-no-blowout-state'].textContent,/enable Allow network tools/);
 f.change('online',true);f.run();const request=f.aiLog.updates.at(-1);assert.equal(request.dragNoBlowout,true);assert.equal(request.allowNetwork,true);assert.equal(request.safe,true);assert.equal(request.enabled,false);assert.equal(f.prefs().nos,false);assert.match(f.nodes['drag-no-blowout-state'].textContent,/current player engine only/);
 f.change('online',false);f.run();assert.equal(f.aiLog.updates.at(-1).safe,false);f.press('F9');f.run();assert.equal(f.aiLog.updates.at(-1).dragNoBlowout,false);assert.equal(f.prefs().online,false);
});

// Named tool profiles use the real page and the same guarded game-memory harness.
const Profiles=require('../extension/tool-profiles.js');
const profileRecord=f=>JSON.parse(f.profileStorage.get(Profiles.KEY));
function saveToolProfile(f,name='My driving',consent=false){f.input('profile-name',name);f.change('profile-network',consent);f.click('profile-save');return profileRecord(f).profiles.at(-1);}
function chooseToolProfile(f,profile){f.change('profile-select',profile.id);}
const fullProfileCaps={legacy:true,ai:true,pace:true,corner:true,walls:true,cars:true,dyno:true,dragAI:true,onlineTraffic:true,onlinePlayers:true,nativeDragOverheat:true};

test('stale NOS preferences and saved profiles never dispatch refill, count as active, or write memory',async t=>{
 const original=Engine.prototype.refill;let calls=0;
 Engine.prototype.refill=()=>{calls++;throw Error('Page must never dispatch automatic refill');};
 t.after(()=>{Engine.prototype.refill=original;});
 const events=[],diagnostics={create:()=>({record(event,data){events.push({event,data});},snapshot(data){events.push({event:'snapshot',data});},status(){return {events:events.length};}})};
 const f=await pageFixture(JSON.stringify({nos:true}),false,false,{diagnostics});
 const checkUi=page=>{assert.equal(page.nodes.nos.checked,false);assert.equal(page.nodes.nos.disabled,true);assert.match(page.nodes['nos-state'].textContent,/Refill unavailable/);assert.doesNotMatch(page.nodes.live.textContent||'',/NOS refilling/i);assert.ok(!page.aiLog.keys.includes('AltLeft'));};
 assert.equal(f.prefs().nos,true);checkUi(f);
 let before=Buffer.from(new Uint8Array(f.memory.buffer));f.run(6);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);checkUi(f);assert.equal(f.nodes.enabled.textContent,'Ready');
 f.put(A.MODE,8);f.change('online',true);before=Buffer.from(new Uint8Array(f.memory.buffer));f.run(6);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);checkUi(f);assert.equal(f.nodes.enabled.textContent,'Ready');
 const p=saveToolProfile(f,'Dormant NOS',true);assert.equal(p.settings.nos,true);assert.equal(p.settings.online,true);
 let stored=f.profileStorage.get(Profiles.KEY);f.change('nos',false);before=Buffer.from(new Uint8Array(f.memory.buffer));f.click('profile-load');f.run(6);
 assert.equal(f.prefs().nos,true);assert.equal(f.profileStorage.get(Profiles.KEY),stored);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);checkUi(f);assert.equal(f.nodes.enabled.textContent,'Ready');
 f.change('profile-auto',true);stored=f.profileStorage.get(Profiles.KEY);
 const restarted=await pageFixture(null,false,false,{profileStorage:f.profileStorage,diagnostics});
 assert.equal(restarted.prefs().nos,true);assert.equal(restarted.nodes.online.checked,true);assert.equal(restarted.profileStorage.get(Profiles.KEY),stored);checkUi(restarted);
 restarted.put(A.MODE,8);before=Buffer.from(new Uint8Array(restarted.memory.buffer));restarted.run(6);assert.deepEqual(Buffer.from(new Uint8Array(restarted.memory.buffer)),before);checkUi(restarted);assert.equal(restarted.nodes.enabled.textContent,'Ready');
 assert.equal(calls,0);assert.ok(events.some(({data})=>data.tools));
 for(const {data}of events)if(data.tools)assert.equal(data.tools.nos,false,'diagnostics must describe effective NOS state');
});
test('named tool profiles survive a browser restart but never autoload by default',async()=>{
 const first=await pageFixture(null,true,true,{capabilities:fullProfileCaps});
 for(const id of ['ai','nos','drag','drag-no-blowout','boost','grip','walls','cars','traffic','players','online','tester','dyno-enable'])first.change(id,true);
 first.input('power','2.1');first.input('rpm','7400');first.change('dyno-goal','peakTorque');
 const p=saveToolProfile(first,'Everything');assert.equal(p.settings.dynoEnabled,true);assert.equal(p.settings.dynoGoal,'peakTorque');assert.equal(p.settings.dragNoBlowout,true);assert.equal(p.networkConsent,false);assert.equal(profileRecord(first).auto,null);
 const restarted=await pageFixture(null,true,true,{profileStorage:first.profileStorage,capabilities:fullProfileCaps});
 for(const id of ['ai','nos','drag','boost','grip','walls','cars','online','dyno-enable'])assert.equal(restarted.nodes[id].checked,false,id);
 chooseToolProfile(restarted,p);restarted.click('profile-load');
 for(const id of ['ai','drag','drag-no-blowout','boost','grip','walls','cars','tester','dyno-enable'])assert.equal(restarted.nodes[id].checked,true,id);
 assert.equal(restarted.nodes.nos.checked,false);assert.equal(restarted.nodes.nos.disabled,true);assert.equal(p.settings.nos,true);assert.equal(restarted.prefs().nos,true);
 for(const id of ['online','traffic','players'])assert.equal(restarted.nodes[id].checked,false,id);
 assert.equal(restarted.nodes.power.value,2.1);assert.equal(restarted.nodes.rpm.value,7400);assert.equal(restarted.nodes['dyno-goal'].value,'peakTorque');
 assert.equal(restarted.dynoLog.finds,0);assert.equal(restarted.dynoLog.applies,0);assert.equal(restarted.dynoLog.restores,0);
 assert.doesNotMatch(JSON.stringify(p),/"car"|baseline|draft|applied|diagnostic|memory|pointer/);
});
test('manual profile loading never borrows network permission from current controls or unsaved checkbox',async()=>{
 const f=await pageFixture(null,true,false,{capabilities:fullProfileCaps});
 for(const id of ['online','traffic','players','ai'])f.change(id,true);
 const p=saveToolProfile(f,'No saved consent');f.change('profile-network',true);f.click('profile-load');
 for(const id of ['online','traffic','players'])assert.equal(f.nodes[id].checked,false,id);
 assert.equal(f.nodes.ai.checked,true);assert.equal(profileRecord(f).profiles[0].networkConsent,false);
 for(const id of ['online','traffic','players'])f.change(id,true);
 f.change('profile-network',true);f.click('profile-update');
 f.press('F9');f.click('profile-load');for(const id of ['online','traffic','players'])assert.equal(f.nodes[id].checked,true,id);
 assert.equal(profileRecord(f).profiles[0].id,p.id);
});
test('startup opt-in restores saved controls with independent saved network consent and keeps dynamic guards',async()=>{
 const f=await pageFixture(null,true,false,{capabilities:fullProfileCaps});
 for(const id of ['ai','online','traffic','players','boost','drag-no-blowout'])f.change(id,true);
 const p=saveToolProfile(f,'Online choice',true);f.change('profile-auto',true);
 assert.equal(profileRecord(f).auto.id,p.id);
 const r=await pageFixture(null,true,false,{profileStorage:f.profileStorage,capabilities:fullProfileCaps});
 assert.equal(r.nodes.online.checked,true);assert.equal(r.nodes.boost.checked,true);r.put(A.MODE,8);r.run(3);assert.equal(r.read(0x2dc),0.75);
 const unknown=await pageFixture(null,true,false,{profileStorage:f.profileStorage,verified:false,capabilities:fullProfileCaps});
 unknown.run(5);assert.equal(unknown.read(0x2dc),0.5);assert.equal(unknown.aiLog.updates.at(-1).safe,false);assert.equal(unknown.nodes['drag-no-blowout'].disabled,true);
 const wrong=await pageFixture(null,true,false,{profileStorage:f.profileStorage,profileRevision:'dfd77238',capabilities:fullProfileCaps});wrong.run(5);assert.equal(wrong.read(0x2dc),0.5);assert.equal(wrong.aiLog.updates.at(-1).safe,false);
});
test('F9 persists a Stop barrier without deleting profiles; manual Load and explicit startup resume are separate',async()=>{
 const f=await pageFixture(null,true,false,{capabilities:fullProfileCaps});for(const id of ['ai','nos','drag','drag-no-blowout','online','boost'])f.change(id,true);
 const p=saveToolProfile(f,'Resume me',true);f.change('profile-auto',true);const oldRecord=f.profileStorage.get(Profiles.KEY);
 f.press('F9');assert.equal(profileRecord(f).profiles.length,1);assert.equal(f.nodes['profile-auto'].checked,false);assert.match(f.nodes['profile-state'].textContent,/paused|Stop/);
 // A stale tab may replace the shared record but cannot replace the independent Stop barrier.
 f.profileStorage.set(Profiles.KEY,oldRecord);
 const r=await pageFixture(JSON.stringify({nos:true,drag:true,dragNoBlowout:true}),true,false,{profileStorage:f.profileStorage,capabilities:fullProfileCaps});
 for(const id of ['ai','nos','drag','drag-no-blowout','online','boost'])assert.equal(r.nodes[id].checked,false,id);
 chooseToolProfile(r,p);r.click('profile-load');assert.equal(r.nodes.ai.checked,true);assert.equal(r.nodes['profile-auto'].checked,false);
 const stillPaused=await pageFixture(null,true,false,{profileStorage:f.profileStorage});assert.equal(stillPaused.nodes.ai.checked,false);
 r.change('profile-auto',true);const resumed=await pageFixture(null,true,false,{profileStorage:f.profileStorage});assert.equal(resumed.nodes.ai.checked,true);
});
test('F7 handback and repeated profile load release input and preserve original patch restoration',async()=>{
 const f=await pageFixture(null,true);f.change('boost',true);f.change('grip',true);f.change('drag',true);const p=saveToolProfile(f,'Manual drag');
 f.put(A.DRAG,1);f.put(f.race,4);f.run(3);assert.equal(f.read(0x2dc),0.75);assert.ok(f.aiLog.keyEvents.some(e=>e.type==='keydown'&&e.code==='ArrowUp'));
 const stops=f.aiLog.stops;f.click('profile-load');assert.equal(f.read(0x2dc),0.5);assert.ok(f.aiLog.stops>stops);assert.equal(f.aiLog.keyEvents.at(-1).type,'keyup');
 f.run(3);assert.equal(f.read(0x2dc),0.75);f.click('profile-load');assert.equal(f.read(0x2dc),0.5);f.run(3);assert.equal(f.read(0x2dc),0.75);
 f.press('F7');f.run(4);assert.match(f.nodes['drag-state'].textContent,/manual|takeover/);f.click('profile-load');f.run();assert.match(f.nodes['drag-state'].textContent,/active/);assert.equal(profileRecord(f).profiles[0].id,p.id);
});
test('profile update renames and revokes automatic loading; delete leaves current controls and unrelated profiles intact',async()=>{
 const f=await pageFixture();f.change('nos',true);const a=saveToolProfile(f,'First');saveToolProfile(f,'Second');chooseToolProfile(f,a);f.change('profile-auto',true);
 f.input('profile-name','Renamed');f.change('nos',false);f.click('profile-update');assert.equal(profileRecord(f).profiles[0].name,'Renamed');assert.equal(profileRecord(f).auto,null);
 f.change('nos',true);f.click('profile-delete');assert.equal(f.nodes.nos.checked,false);assert.equal(f.nodes.nos.disabled,true);assert.equal(f.prefs().nos,true);assert.deepEqual(profileRecord(f).profiles.map(p=>p.name),['Second']);assert.equal(f.nodes['profile-load'].disabled,true);
});
test('profile load refuses pending drift and cancels busy tuner without restoring or staging any game preset',async()=>{
 const f=await pageFixture(null,true,true);f.change('nos',true);saveToolProfile(f,'Saved');f.change('nos',false);
 // Set up a genuine asynchronous native drift request in the input ring.
 const ptr=0xf10000;f.put(ptr,0x4e494e50);f.put(ptr+4,2);f.put(ptr+3*4,1024);f.put(ptr+7*4,1);f.worker.emit({t:'register',kind:3,ptr});
 f.change('drift',true);assert.equal(f.d.getUint32(ptr+4*4,true),1);f.click('profile-load');assert.equal(f.nodes.nos.checked,false);assert.match(f.nodes['profile-state'].textContent,/drift request/);assert.equal(f.d.getUint32(ptr+4*4,true),1);
 f.run(61);f.click('profile-load');assert.equal(f.nodes.nos.checked,false);assert.equal(f.nodes.nos.disabled,true);assert.equal(f.prefs().nos,true);
 f.change('nos',false);f.change('dyno-enable',true);f.nodes['dyno-goal'].value='peakPower';f.click('dyno-find');assert.equal(f.dynoLog.instance.busy,true);
 const cancels=f.dynoLog.cancels;f.click('profile-load');assert.ok(f.dynoLog.cancels>cancels);assert.equal(f.nodes.nos.checked,false);assert.match(f.nodes['profile-state'].textContent,/pending game request/);assert.equal(f.dynoLog.applies,0);assert.equal(f.dynoLog.restores,0);
 await new Promise(r=>setImmediate(r));f.dynoLog.instance.pending=Promise.resolve();f.click('profile-load');assert.equal(f.nodes.nos.checked,false);f.dynoLog.instance.pending=null;f.click('profile-load');assert.equal(f.nodes.nos.checked,false);assert.equal(f.nodes.nos.disabled,true);assert.equal(f.prefs().nos,true);
});
test('profile drift choices wait for solo free roam and F9 prevents profile-requested delayed drift input',async()=>{
 const f=await pageFixture();f.drive(1);f.change('drift',true);saveToolProfile(f,'Drift later');f.change('drift',false);f.click('profile-load');
 const ptr=0xf10000;f.put(ptr,0x4e494e50);f.put(ptr+4,2);f.put(ptr+3*4,1024);f.put(ptr+7*4,1);f.worker.emit({t:'register',kind:3,ptr});
 f.put(A.MODE,8);f.drive(2);f.run();assert.equal(f.d.getUint32(ptr+4*4,true),0);f.press('F9');f.put(A.MODE,1);f.run(5);assert.equal(f.d.getUint32(ptr+4*4,true),0);
 f.click('profile-load');f.run();assert.equal(f.d.getUint32(ptr+4*4,true),1);f.press('F9');f.click('profile-load');assert.equal(f.d.getUint32(ptr+4*4,true),1);assert.match(f.nodes['profile-state'].textContent,/drift request/);
});
test('cross-tab Stop/edit events never activate settings and clear stale selection and active consent',async()=>{
 const shared=new Map(),a=await pageFixture(null,true,false,{profileStorage:shared}),b=await pageFixture(null,true,false,{profileStorage:shared});
 a.change('ai',true);a.change('online',true);const p=saveToolProfile(a,'Shared',true);a.change('profile-auto',true);
 b.storageEvent(Profiles.KEY);assert.equal(b.nodes.ai.checked,false);chooseToolProfile(b,p);b.click('profile-load');assert.equal(b.nodes.online.checked,true);
 a.press('F9');b.storageEvent(Profiles.STOP_KEY);assert.equal(b.nodes.ai.checked,false);assert.equal(b.nodes.online.checked,false);assert.equal(b.nodes['profile-load'].disabled,true);
 chooseToolProfile(b,p);b.click('profile-load');assert.equal(b.nodes.ai.checked,true);
 a.change('profile-network',false);a.click('profile-update');b.storageEvent(Profiles.KEY);assert.equal(b.nodes.online.checked,false);assert.equal(b.nodes.ai.checked,false);
 b.change('ai',true);b.storageEvent(Profiles.KEY+'-probe');assert.equal(b.nodes.ai.checked,true);
 b.storageEvent(null);assert.equal(b.nodes.ai.checked,false);
});
test('stale selected profile mutations fail without overwriting newer saved choices',async()=>{
 const shared=new Map(),a=await pageFixture(null,false,false,{profileStorage:shared});const p=saveToolProfile(a,'Shared');
 const b=await pageFixture(null,false,false,{profileStorage:shared});chooseToolProfile(b,p);b.change('nos',true);b.click('profile-update');
 for(const action of ['update','load','delete']){a.click('profile-'+action);assert.match(a.nodes['profile-state'].textContent,/changed|Select|Select.*first/i);assert.equal(profileRecord(a).profiles[0].settings.nos,true);}
});
test('profile names are literal DOM text and name/count/schema/numeric validation is bounded',async()=>{
 const f=await pageFixture();const hostile='<img src=x onerror=alert(1)>';saveToolProfile(f,hostile);const option=f.nodes['profile-select'].children.at(-1);assert.equal(option.textContent,hostile);assert.equal(option.html,undefined);
 for(const invalid of ['', ' ', 'x'.repeat(49),'__proto__','constructor','prototype','bad\nname']){f.input('profile-name',invalid);f.click('profile-save');assert.equal(profileRecord(f).profiles.length,1);}
 const store=Profiles.create({getItem:k=>f.profileStorage.get(k)??null,setItem:(k,v)=>f.profileStorage.set(k,v),removeItem:k=>f.profileStorage.delete(k)}),settings=profileRecord(f).profiles[0].settings;
 for(const [key,[min,max]]of Object.entries(Profiles.NUMBERS))for(const value of [min-1,max+1,NaN,Infinity,'1'])assert.throws(()=>store.save({name:'Invalid',settings:{...settings,[key]:value}}));
 for(const key of Profiles.FLAGS)assert.throws(()=>Profiles.settings({...settings,[key]:1}));
 for(const key of ['__proto__','prototype','constructor']){const bad=JSON.parse(JSON.stringify(settings));Object.defineProperty(bad,key,{value:true,enumerable:true});assert.throws(()=>Profiles.settings(bad));}
 for(let i=1;i<16;i++)store.save({name:'Profile '+i,settings});assert.throws(()=>store.save({name:'Overflow',settings}),/16/);assert.ok(f.profileStorage.get(Profiles.KEY).length*2<=Profiles.MAX_BYTES);
});
test('corrupt, oversized or unavailable storage fails closed without overwriting stored profiles or native effects',async()=>{
 for(const raw of ['broken','x'.repeat(Profiles.MAX_BYTES),JSON.stringify({schema:2,profiles:[],auto:null}),'{"schema":1,"profiles":[],"auto":null,"__proto__":{}}']){
  const shared=new Map([[Profiles.KEY,raw]]),f=await pageFixture(null,true,false,{profileStorage:shared});assert.equal(f.nodes['profile-save'].disabled,true);assert.equal(shared.get(Profiles.KEY),raw);assert.equal(f.nodes.ai.checked,false);f.run(3);assert.equal(f.read(0x2dc),0.5);
 }
 const bad={getItem(){throw Error('Storage denied');},setItem(){throw Error('Storage denied');},removeItem(){throw Error('Storage denied');}},f=await pageFixture(null,false,false,{localStorage:bad});assert.equal(f.nodes['profile-save'].disabled,true);f.change('nos',true);assert.equal(f.nodes.nos.checked,false);assert.equal(f.nodes.nos.disabled,true);assert.equal(f.prefs().nos,true);f.press('F9');assert.equal(f.nodes.nos.checked,false);assert.match(f.nodes['profile-state'].textContent,/storage|Stop|denied/i);
});
test('F9 session latch blocks old autoload after transient persistent-storage failure recovers',async()=>{
 const shared=new Map(),sessions=new Map();let failing=false;
 const storage={getItem:k=>shared.get(k)??null,setItem(k,v){if(failing)throw Error('Quota');shared.set(k,v);},removeItem(k){if(failing)throw Error('Quota');shared.delete(k);}};
 const session={getItem:k=>sessions.get(k)??null,setItem:(k,v)=>sessions.set(k,v),removeItem:k=>sessions.delete(k)};
 const f=await pageFixture(null,true,false,{profileStorage:shared,localStorage:storage,sessionStorage:session});f.change('ai',true);saveToolProfile(f,'Remember');f.change('profile-auto',true);failing=true;f.press('F9');assert.match(f.nodes['profile-state'].textContent,/could not be saved/);
 failing=false;const r=await pageFixture(null,true,false,{profileStorage:shared,localStorage:storage,sessionStorage:session});assert.equal(r.nodes.ai.checked,false);chooseToolProfile(r,profileRecord(f).profiles[0]);r.change('profile-auto',true);const resumed=await pageFixture(null,true,false,{profileStorage:shared,localStorage:storage,sessionStorage:session});assert.equal(resumed.nodes.ai.checked,true);
});
test('BFCache restoration stays stopped and restarts the tick loop without automatically loading old choices',async()=>{
 const f=await pageFixture(null,true);f.change('boost',true);f.change('online',true);saveToolProfile(f,'Cached',true);f.change('profile-auto',true);f.click('profile-load');f.run(3);assert.equal(f.read(0x2dc),0.75);
 f.pageEvent('pagehide');assert.equal(f.read(0x2dc),0.5);f.pageEvent('pageshow',true);assert.equal(f.nodes.boost.checked,false);assert.equal(f.nodes.online.checked,false);f.change('boost',true);f.run(3);assert.equal(f.read(0x2dc),0.75);
});

test('browser profile write locks serialize concurrent saves without dropping either profile',async()=>{
 const shared=new Map(),queue=[],locks={request:(name,callback)=>new Promise((resolve,reject)=>queue.push({name,run:()=>{try{resolve(callback());}catch(e){reject(e);}}}))};
 const a=await pageFixture(null,false,false,{profileStorage:shared,profileLocks:locks}),b=await pageFixture(null,false,false,{profileStorage:shared,profileLocks:locks});
 a.change('nos',true);a.input('profile-name','Tab A');a.click('profile-save');b.input('profile-name','Tab B');b.click('profile-save');
 assert.equal(queue.length,2);assert.equal(queue[0].name,queue[1].name);assert.equal(a.nodes['profile-save'].disabled,true);assert.equal(a.nodes['profile-select'].disabled,true);assert.equal(a.nodes['profile-network'].disabled,true);
 // Even synthetic mutations while disabled cannot change the captured action.
 a.input('profile-name','Wrong late name');a.change('nos',false);queue.shift().run();await new Promise(r=>setImmediate(r));queue.shift().run();await new Promise(r=>setImmediate(r));
 assert.deepEqual(profileRecord(a).profiles.map(p=>p.name),['Tab A','Tab B']);assert.equal(profileRecord(a).profiles[0].settings.nos,true);
 assert.equal(a.nodes['profile-save'].disabled,false);assert.equal(b.nodes['profile-save'].disabled,false);
});
test('queued auto/update/delete requests keep their original target and F9 invalidates pending requests',async()=>{
 const queue=[],locks={request:(_name,callback)=>new Promise(resolve=>queue.push(()=>resolve(callback())))};
 const f=await pageFixture(null,false,false,{profileLocks:locks});f.input('profile-name','First');f.click('profile-save');queue.shift()();await new Promise(r=>setImmediate(r));const first=profileRecord(f).profiles[0];
 f.input('profile-name','Second');f.click('profile-save');queue.shift()();await new Promise(r=>setImmediate(r));const second=profileRecord(f).profiles[1];
 chooseToolProfile(f,first);f.click('profile-delete');chooseToolProfile(f,second);queue.shift()();await new Promise(r=>setImmediate(r));assert.deepEqual(profileRecord(f).profiles.map(p=>p.id),[second.id]);
 chooseToolProfile(f,second);f.change('profile-auto',true);f.press('F9');queue.shift()();await new Promise(r=>setImmediate(r));assert.equal(profileRecord(f).auto,null);assert.equal(f.nodes['profile-save'].disabled,false);
 chooseToolProfile(f,second);f.input('profile-name','Do not rename');f.click('profile-update');f.press('F9');queue.shift()();await new Promise(r=>setImmediate(r));assert.equal(profileRecord(f).profiles[0].name,'Second');
});
test('queued startup authorization cannot undo another tab Stop even before its storage event arrives',async()=>{
 const shared=new Map(),a=await pageFixture(null,false,false,{profileStorage:shared});const p=saveToolProfile(a,'Shared');
 const queue=[],b=await pageFixture(null,false,false,{profileStorage:shared,profileLocks:{request:(_n,cb)=>new Promise(resolve=>queue.push(()=>resolve(cb())))}});
 chooseToolProfile(b,p);b.change('profile-auto',true);a.press('F9');queue.shift()();await new Promise(r=>setImmediate(r));assert.equal(profileRecord(a).auto,null);assert.match(b.nodes['profile-state'].textContent,/changed while waiting/);
});
test('missing or denied browser locks refuse edits safely while loading saved profiles remains possible',async()=>{
 const shared=new Map(),a=await pageFixture(null,false,false,{profileStorage:shared});a.change('nos',true);const p=saveToolProfile(a,'Existing');
 const b=await pageFixture(null,false,false,{profileStorage:shared,profileLocks:false});assert.equal(b.nodes['profile-save'].disabled,true);chooseToolProfile(b,p);assert.equal(b.nodes['profile-load'].disabled,false);b.click('profile-load');assert.equal(b.nodes.nos.checked,false);assert.equal(b.nodes.nos.disabled,true);assert.equal(b.prefs().nos,true);b.input('profile-name','Blocked');b.click('profile-save');assert.equal(profileRecord(a).profiles.length,1);
 const c=await pageFixture(null,false,false,{profileStorage:shared,profileLocks:{request:()=>Promise.reject(Error('denied'))}});c.input('profile-name','Also blocked');c.click('profile-save');await new Promise(r=>setImmediate(r));assert.equal(profileRecord(a).profiles.length,1);assert.match(c.nodes['profile-state'].textContent,/Could not lock/);
});
test('unreadable profile storage cannot resurrect stale legacy driving choices after an unseen global Stop',async()=>{
 const bad={getItem(){throw Error('Temporarily denied');},setItem(){throw Error('Temporarily denied');},removeItem(){throw Error('Temporarily denied');}};
 const f=await pageFixture(JSON.stringify({nos:true,drag:true,dragNoBlowout:true,tester:true,drift:true}),false,false,{localStorage:bad});
 for(const id of ['nos','drag','drag-no-blowout'])assert.equal(f.nodes[id].checked,false,id);assert.equal(f.nodes.tester.checked,true);assert.equal(f.nodes.drift.checked,true);
});

test('reviewed Drift modes retain native pace while saved road/free-roam factors remain intact',async()=>{
 const profile=require('../extension/next-profile.js');
 for(const flag of [0x89e7d9,0x890104,0x890114])for(const mode of ['race','roam']){
  const f=await pageFixture(null,true,false,{profile,revision:profile.revision});f.put(0x89e7b0,mode==='race'?1:0);f.drive(mode==='race'?1:2);f.change('ai',true);f.change('race-pace',true);f.input('race-pace-factor',3);f.change('ai-pace',true);f.input('pace-factor',2);f.run();assert.equal(f.aiLog.updates.at(-1).pace,mode==='race'?3:2);
  f.put(flag,1);f.run();assert.equal(f.aiLog.updates.at(-1).pace,1);assert.match(f.nodes[mode==='race'?'race-pace-state':'ai-pace-state'].textContent,/Paused in Drift/);assert.equal(f.prefs().racePaceFactor,3);assert.equal(f.prefs().paceFactor,2);assert.equal(f.prefs().ai,true);
  f.put(flag,0);f.run();assert.equal(f.aiLog.updates.at(-1).pace,mode==='race'?3:2);
 }
});
test('flag114 grip pause restores original values and preserves native Drag precedence',()=>{
 const f=gripFixture(),s=f.e.state();f.e.tuneGrip(s,2);f.put(0x890114,1);assert.equal(f.e.tuneGrip(s,2).paused,true);assert.deepEqual(f.read(),[1,1,1,1]);
 f.put(0x890114,0);assert.equal(f.e.tuneGrip(s,2).active,true);f.put(0x890114,1);f.put(0x890108,1);assert.equal(f.e.tuneGrip(s,2).active,true);f.put(0x890108,0);f.d.setUint8(0x89e7d8,1);assert.equal(f.e.tuneGrip(s,2).active,true);
});
test('flag114 entering during a grip write is rejected without overwriting new native state',()=>{
 const f=gripFixture(),s=f.e.state(),compare=f.e.compareFloat.bind(f.e);let once=true;
 f.e.compareFloat=(p,a,b,guard)=>{if(once){once=false;f.put(0x890114,1);}return compare(p,a,b,guard);};assert.equal(f.e.tuneGrip(s,2).ok,false);assert.deepEqual(f.read(),[1,1,1,1]);
});
