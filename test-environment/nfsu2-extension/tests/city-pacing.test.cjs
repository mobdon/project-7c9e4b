'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Controller}=require('../extension/city-pacing.js'),{Pacing}=require('../extension/dynamic-pacing.js');
const {Engine,A}=require('../extension/core.js'),AI=require('../extension/ai.js'),profile=require('../extension/modern-profile.js');
function fixture(){
 const words=new Map(),player=0xe00000,car=0xe01000,race=0xe04000,driver=0xe06000;
 for(const [p,v]of [[0xd00000,player],[player+4,car],[player+16,0],[car+0x24,3],[car+0x2c,driver],[driver,0x785370],[driver+4,car]])words.set(p,v);
 let scans=0,hazards={cars:[],barrierAhead:null},onScan=null;
 const state={ready:true,driving:true,network:true,car,race};
 const engine={state:()=>({...state}),ok:(p,n)=>Number.isSafeInteger(p)&&p>=0x10000&&p+n<=0x28000000,u32:p=>words.get(p)||0,u8:p=>(words.get(p)||0)&255,live:(s,network,driving)=>s===state&&state.ready&&state.driving&&network===true&&driving===true,pacingHazards(){scans++;onScan?.();return hazards;}};
 const input={enabled:true,verified:true,capabilities:{ai:true,pace:true},automaticAI:true,allowNetwork:true,safe:true,focused:true,hidden:false,menuOpen:false,tunerBusy:false,hud:2,raceType:0,drag:false,drift:false,streetX:false,engine,state,aiState:{available:true,ready:true,active:true,owned:true,switching:false},handbackPending:false,identity:'session1:local-car:online-roam',now:0,selectedPace:3,nativeSpeed:60};
 const c=new Controller({Pacing});
 return {c,input,words,state,player,car,race,driver,scans:()=>scans,hazards:value=>{hazards=value;},onScan:fn=>{onScan=fn;}};
}
test('eligible online free roam retains the user selected native pace without claiming route coverage',()=>{
 const f=fixture();let r;
 for(let now=0;now<=20000;now+=50){r=f.c.update({...f.input,now});assert.equal(r.active,true);assert.equal(r.pace,3);assert.equal(r.wholeRouteChecked,false);assert.equal(r.collisionGuarantee,false);}
 assert.equal(r.maxPace,3);assert.equal(r.state,'selected-native');assert.equal(r.speedUnits,'native-coordinate-units-per-native-second');assert.equal(f.input.selectedPace,3);
});
test('existing observed clearance reduces the ordinary pace and preserves same-owner dropout hold',()=>{
 const f=fixture();f.hazards({cars:[],barrierAhead:30});let r=f.c.update(f.input);assert.equal(r.pace,.75);assert.equal(r.state,'clearance-limited');assert.equal(r.clearanceDistance,30);
 f.hazards(null);r=f.c.update({...f.input,now:501});assert.equal(r.pace,.75);
 r=f.c.update({...f.input,now:551});assert.equal(r.pace,.77);assert.equal(r.maxPace,3);
});

test('a repeated city observation holds one bounded reduction instead of multiplying it each tick',()=>{
 const f=fixture();f.hazards({cars:[],barrierAhead:60});
 for(let now=0;now<=2000;now+=50){
  const r=f.c.update({...f.input,selectedPace:1,nativeSpeed:20,now});
  assert.equal(r.active,true);assert.equal(r.state,'clearance-limited');assert.equal(r.pace,.89);
  assert.equal(r.selectedPace,1);assert.equal(r.maxPace,1);
 }
 f.hazards({cars:[],barrierAhead:null});
 for(let now=2050;now<=4000;now+=50)f.c.update({...f.input,selectedPace:1,nativeSpeed:20,now});
 assert.equal(f.c.update({...f.input,selectedPace:1,nativeSpeed:20,now:4050}).pace,1);
});
test('every selected free-roam factor is an additional ceiling, never rewritten',()=>{
 for(const selectedPace of [.75,.9,1,1.3,2,3]){const f=fixture(),r=f.c.update({...f.input,selectedPace});assert.equal(r.pace,selectedPace);assert.equal(r.maxPace,selectedPace);assert.equal(r.selectedPace,selectedPace);}
});

test('city clearance reduces the selected ceiling once and recovers when the observed obstacle clears',()=>{
 const f=fixture();f.hazards({cars:[],barrierAhead:60});
 for(let now=0;now<=1000;now+=50)assert.equal(f.c.update({...f.input,nativeSpeed:20,now}).pace,2.68);
 f.hazards({cars:[],barrierAhead:null});let r;
 for(let now=1050;now<=2500;now+=50)r=f.c.update({...f.input,nativeSpeed:20,now});
 assert.equal(r.pace,3);assert.equal(r.state,'selected-native');assert.equal(r.maxPace,3);
});

test('current city frames separate selected pace, physical speed and a delayed clearance reduction',()=>{
 const f=fixture();f.hazards({cars:[],barrierAhead:null});
 let r=f.c.update({...f.input,selectedPace:2.05,nativeSpeed:33,now:0});
 assert.equal(r.pace,2.05);assert.equal(r.selectedPace,2.05);assert.equal(r.timingState,'initial');
 assert.equal(r.clearanceObserved,false);assert.equal(r.clearanceSource,null);assert.equal(r.clearanceTarget,null);
 r=f.c.update({...f.input,selectedPace:2.05,nativeSpeed:9,now:551});
 assert.equal(r.pace,2.05);assert.equal(r.timingState,'gap');assert.equal(r.sampleGapMs,551);
 f.hazards({cars:[],barrierAhead:30});r=f.c.update({...f.input,selectedPace:2.05,nativeSpeed:33,now:601});
 assert.equal(r.pace,.75);assert.equal(r.clearanceSource,'barrier');assert.equal(r.clearanceDistance,30);
 assert.equal(r.clearanceTarget,Math.sqrt(8*(30-8-33*.6)));
 f.hazards(null);r=f.c.update({...f.input,selectedPace:2.05,nativeSpeed:9,now:1152});
 assert.equal(r.pace,.75);assert.equal(r.timingState,'gap');assert.equal(r.sampleGapMs,551);
 assert.equal(r.clearanceObserved,false);assert.equal(r.clearanceSource,null);assert.equal(r.selectedPace,2.05);
});
test('disabled, unverified and unsupported capabilities perform no clearance scan',()=>{
 for(const extra of [{enabled:false},{verified:false},{capabilities:null},{capabilities:{ai:false,pace:true}},{capabilities:{ai:true,pace:false}}]){const f=fixture();assert.equal(f.c.update({...f.input,...extra}).active,false);assert.equal(f.scans(),0);}
});
test('online permission and literal mode guards exclude every race and special mode',()=>{
 for(const extra of [{allowNetwork:false},{allowNetwork:1},{hud:1,raceType:1},{hud:2,raceType:7},{hud:0},{raceType:1},{drag:true},{drift:true},{streetX:true},{drag:1},{drift:undefined,streetX:true}]){const f=fixture();assert.equal(f.c.update({...f.input,...extra}).active,false,JSON.stringify(extra));assert.equal(f.scans(),0);}
 const f=fixture();f.state.network=false;assert.equal(f.c.update(f.input).state,'not-online');assert.equal(f.scans(),0);
 assert.equal(f.c.update({...f.input,allowNetwork:false}).state,'network-permission');assert.equal(f.scans(),0);
});
test('manual, pause, focus, visibility, tuner and handback conditions perform no scan',()=>{
 for(const extra of [{automaticAI:false},{safe:false},{focused:false},{hidden:true},{menuOpen:true},{tunerBusy:true},{handbackPending:true},{aiState:null},{aiState:{available:true,ready:true,active:true,owned:false}},{aiState:{available:true,ready:true,active:true,owned:true,switching:true}}]){const f=fixture();assert.equal(f.c.update({...f.input,...extra}).active,false);assert.equal(f.scans(),0);}
 for(const key of ['ready','driving']){const f=fixture();f.state[key]=false;assert.equal(f.c.update(f.input).active,false);assert.equal(f.scans(),0);}
});
test('local player, human/AI driver, reciprocal car and low-window identity checks fail closed',()=>{
 const changes=f=>[[f.player+4,0xe02000],[f.player+16,1],[f.car+0x24,1],[f.car+0x2c,0x50000000],[f.driver,0x785374],[f.driver+4,0xe02000]];
 for(let i=0;i<6;i++){const f=fixture();f.words.set(...changes(f)[i]);assert.equal(f.c.update(f.input).state,'waiting-owner');assert.equal(f.scans(),0);}
});
test('ownership changing during clearance sampling discards the sample',()=>{
 const f=fixture();f.hazards({cars:[],barrierAhead:30});f.onScan(()=>f.words.set(f.driver+4,0xe02000));
 const r=f.c.update(f.input);assert.equal(r.active,false);assert.equal(r.pace,null);assert.equal(r.state,'waiting-owner');
});
test('shared native race or special-mode changes cannot pass a stale page context during a clearance scan',()=>{
 for(const [address,value]of [[0x89e7b0,1],[0x89e7b0,7],[0x89e7d8,1],[0x89e7d9,1],[0x89e7e3,1],[0x890104,1],[0x890108,1],[0x89010c,1],[0x890114,1],[0x850088,10]]){
  const f=fixture();f.onScan(()=>f.words.set(address,value));assert.equal(f.c.update(f.input).active,false,'changed native flag '+address.toString(16));
 }
 const f=fixture();f.onScan(()=>{f.state.network=false;});assert.equal(f.c.update(f.input).active,false);
});
test('invalid policy context and unavailable readers cannot create a pace request',()=>{
 for(const extra of [{selectedPace:NaN},{selectedPace:.74},{selectedPace:3.01},{identity:''},{identity:'x'.repeat(161)},{engine:null}]){const f=fixture();assert.equal(f.c.update({...f.input,...extra}).active,false);assert.equal(f.scans(),0);}
 const f=fixture();f.input.engine.pacingHazards=()=>{throw Error('changed guest state');};assert.equal(f.c.update(f.input).active,false);
});
test('Stop reset is private, clears the reduction and never touches observed game fields',()=>{
 const f=fixture(),before=[...f.words];f.hazards({cars:[],barrierAhead:30});f.c.update(f.input);assert.equal(f.c.reset().active,false);assert.deepEqual([...f.words],before);
 f.hazards(null);assert.equal(f.c.update({...f.input,now:100}).pace,3);
});
function realDriver(cornerAssist){
 const memory=new WebAssembly.Memory({initial:256,maximum:12000,shared:true}),d=new DataView(memory.buffer),engine=new Engine(memory),put=(p,v)=>d.setUint32(p,v,true);
 const player=0xe00000,car=0xe01000,race=0xe04000,driver=0xe06000,barriers=0xe0c000;
 for(const [p,v]of [[A.FLOW,6],[A.MODE,8],[A.PLAYER,player],[player+4,car],[player+16,0],[A.RACE,race],[race,4],[car+0x24,3],[car+0x2c,driver],[driver,0x785370],[driver+4,car],[car+A.GEAR,3],[AI.BASE+28,AI.MAGIC],[0x89e7b0,0],[0x88f730,1],[0x88f734,barriers]])put(p,v);
 d.setFloat32(car+A.RPM,6000,true);d.setFloat32(car+0x90,1,true);[30,-10,30,10].forEach((value,i)=>d.setFloat32(barriers+i*4,value,true));d.setUint8(barriers+16,1);
 const ai=new AI.Controller(memory,true,profile.capabilities,{moduleHash:profile.hash}),state=engine.state(),settings={enabled:true,safe:true,state,mode:2,pace:3,allowNetwork:true,cornerAssist,cornerFactor:.8,cornerMargin:15};
 // The user selected native pace is also retained during ownership acquisition.
 ai.update(settings);for(const[p,v]of [[AI.BASE+32,player],[AI.BASE+36,car],[AI.BASE+40,race],[AI.BASE+52,1]])put(p,v);
 return {memory,d,put,engine,ai,state,settings,driver};
}
test('real ordinary free-roam AI pace reductions preserve requestTarget and corner command without adaptive command3',()=>{
 for(const cornerAssist of [false,true]){
  const f=realDriver(cornerAssist),c=new Controller({Pacing}),target=f.ai.requestTarget,source=fixture().input;
  const base={...source,engine:f.engine,state:f.state,aiState:f.ai.status(),selectedPace:f.settings.pace};
  let r=c.update(base);assert.equal(r.active,true);assert.equal(r.pace,.75);
  for(const now of [0,50,100,601,651]){
   r=c.update({...base,now,aiState:f.ai.status()});f.ai.update({...f.settings,cityPace:r.pace});
   assert.equal(f.ai.requestTarget,target);assert.equal(f.ai.handbackPending,false);assert.equal(f.ai.read(8),2);assert.equal(f.ai.read(60),Math.round(r.pace*100));assert.equal(f.settings.pace,3);
   assert.equal(f.d.getUint32(AI.CORNER_BASE+4,true),cornerAssist?1:0);assert.notEqual(f.d.getUint32(AI.CORNER_BASE+4,true),3);
  }
 }
});
test('real ordinary online pace path publishes OFF when network permission is withdrawn',()=>{
 const f=realDriver(false),c=new Controller({Pacing}),r=c.update({...fixture().input,engine:f.engine,state:f.state,aiState:f.ai.status()});
 assert.equal(r.active,true);f.ai.update({...f.settings,cityPace:r.pace});assert.equal(f.ai.read(60),75);
 assert.equal(c.update({...fixture().input,engine:f.engine,state:f.state,aiState:f.ai.status(),allowNetwork:false}).active,false);
 f.ai.update({...f.settings,cityPace:r.pace,allowNetwork:false});assert.equal(f.ai.read(8),0);assert.equal(f.ai.handbackPending,true);
});

test('real city runtime reductions retain the selected corner ceiling and never reconstruct the native driver',()=>{
 for(const cornerAssist of [false,true]){
  const f=realDriver(cornerAssist),target=f.ai.requestTarget;
  for(const cityPace of [3,2,1.5,.9,.75,1,2.5,3]){
   f.ai.update({...f.settings,cityPace});
   assert.equal(f.ai.read(8),2);assert.equal(f.ai.read(60),Math.round(cityPace*100));
   assert.equal(f.ai.requestTarget,target);assert.equal(f.ai.handbackPending,false);
   if(cornerAssist)assert.equal(f.d.getUint32(AI.CORNER_BASE+48,true),300);
  }
  f.ai.update(f.settings);assert.equal(f.ai.read(60),300);
 }
});

test('invalid city requests and protected native modes retain their existing baseline behavior',()=>{
 for(const cityPace of [0,.74,3.01,4,NaN,Infinity,'0.75']){
  const f=realDriver(true);f.ai.update({...f.settings,cityPace});assert.equal(f.ai.read(60),300);assert.equal(f.ai.handbackPending,false);
 }
 for(const mark of [f=>f.put(0x89e7b0,1),f=>f.put(0x89e7b0,7),f=>f.d.setUint8(0x89e7d8,1),f=>f.d.setUint8(0x89e7d9,1),f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x890104,1),f=>f.put(0x890108,1),f=>f.put(0x89010c,1),f=>f.put(0x890114,1),f=>f.put(0x850088,10),f=>{f.state.network=false;f.put(A.MODE,1);}]){
  const f=realDriver(true),baseline=realDriver(true);mark(f);mark(baseline);
  baseline.ai.update(baseline.settings);f.ai.update({...f.settings,cityPace:.75});
  for(const off of [8,60,84])assert.equal(f.ai.read(off),baseline.ai.read(off));
  assert.equal(f.ai.handbackPending,baseline.ai.handbackPending);
 }
});

test('real city runtime requests recognize exact-build port-only online evidence and revoke it when that evidence disappears',()=>{
 const f=realDriver(true),cells=require('../extension/forward-native-config.js').select(profile.hash).runtime.onlineAddresses;
 f.memory.grow(Math.ceil((Math.max(...cells)+4)/65536)-256);const ports=new DataView(f.memory.buffer);
 f.put(A.MODE,1);ports.setUint32(cells[0],1,true);ports.setUint8(cells[1],1);ports.setUint32(cells[2],1,true);
 f.ai.update({...f.settings,cityPace:.8});assert.equal(f.ai.read(8),2);assert.equal(f.ai.read(60),80);assert.equal(f.ai.handbackPending,false);
 ports.setUint8(cells[1],0);f.ai.update({...f.settings,cityPace:.8});assert.equal(f.ai.read(60),300);
 assert.equal(ports.getUint32(cells[0],true),1);assert.equal(ports.getUint32(cells[2],true),1);
});
