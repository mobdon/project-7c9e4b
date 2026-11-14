'use strict';
const {test,before}=require('node:test'),assert=require('node:assert/strict');
const Native=require('./city-contact-native-fixture.cjs'),Preview=require('../extension/city-contact-preview.js');
const {Controller}=require('../extension/city-pacing.js'),{Pacing}=require('../extension/dynamic-pacing.js');
before(Native.prepare);
function fixture(options){
  const x=Native.fixture(options),bitmap=695752272;
  const commit=(p,n=4,on=true)=>{for(let page=Math.floor(p/16384);page<=Math.floor((p+n-1)/16384);page++){
    const at=bitmap+(page>>>3),bit=1<<(page&7);x.byte(at,on?x.d.getUint8(at)|bit:x.d.getUint8(at)&~bit);
  }};
  for(const[p,n]of [[0x802000,0x4000],[0x850000,0x10000],[0x864000,0x4000],[0x890000,0x10000],[0x89c000,0x8000],[0xd00000,0x4000],[x.p,0xe000]])commit(p,n);
  const hazards={cars:[{ahead:12,side:0,car:x.face,body:x.other}],barrierAhead:null};
  const input={engine:x.engine,state:x.engine.state(),controller:x.c,verified:true,moduleHash:Native.baseProfile.hash,hazards};
  return {...x,commit,hazards,input,filter:extra=>Preview.filter({...input,...extra})};
}
test('preview agrees with real native contact result for every traffic/player/NPC switch combination',()=>{
  for(const rivals of [false,true])for(const traffic of [false,true])for(const players of [false,true])for(const kind of ['npc','traffic','player']){
    const x=fixture({rivals,traffic,players});
    if(kind==='traffic')x.put(x.face+0x24,4);
    if(kind==='player'){x.put(Native.SLOT,3);x.put(Native.SLOT+76,x.face);}
    const r=x.filter();x.step();
    assert.equal(r.excludedCars,Number(x.get(x.pair+0x240)!==0),JSON.stringify({rivals,traffic,players,kind}));
    assert.equal(r.hazards.cars.length,1-r.excludedCars);
  }
});
test('all64 native slot matches outrank traffic and NPC appearance, with player permission required',()=>{
  for(let i=0;i<64;i++){
    const x=fixture({traffic:true,rivals:true,players:false});x.put(x.face+0x24,4);x.put(Native.SLOT+i*1568,3);x.put(Native.SLOT+i*1568+76,x.face);
    assert.notEqual(x.slotKind(x.face,0),-1);assert.equal(x.filter().excludedCars,0);
    x.update({onlinePlayers:true});assert.equal(x.filter().excludedCars,1);
  }
});
test('no-clip preview leaves barrier observations and unknown vehicles in the pacing envelope',()=>{
  const x=fixture({traffic:true});x.put(x.face+0x24,4);x.hazards.barrierAhead=19;
  x.hazards.cars.push({ahead:10,side:0});const r=x.filter();assert.equal(r.available,true);assert.equal(r.excludedCars,1);assert.equal(r.hazards.barrierAhead,19);assert.deepEqual(r.hazards.cars,[{ahead:10,side:0}]);
});
test('unverified builds, missing bodies, stopped commands and uncommitted targets preserve original hazards',()=>{
  for(const extra of [{verified:false},{moduleHash:'0'.repeat(64)},{controller:null}]){const x=fixture();const r=x.filter(extra);assert.equal(r.excludedCars,0);assert.equal(r.hazards,x.hazards);}
  for(const mutate of [x=>x.c.stop(),x=>x.put(Native.B+4,3),x=>x.put(Native.A+4,3),x=>x.put(Native.A+48,180),x=>x.put(Native.A+84,0),x=>x.put(x.face+0x3c,x.other+4),x=>x.put(x.other+0x130,x.face+4),x=>x.byte(x.other+17,1),x=>x.commit(x.face,0x9e4,false)]){
    const x=fixture();mutate(x);const r=x.filter();assert.equal(r.excludedCars,0);assert.equal(r.hazards.cars.length,1);
  }
});
test('each native context exclusion denies preview, including races, Outrun and all special modes',()=>{
  for(const mutate of [x=>x.put(0x89e7b0,1),x=>x.put(0x89e7b0,7),x=>x.put(0x850078,8),x=>x.put(0x866a14,1),x=>x.put(0x8669f4,1),x=>x.byte(0x89cf69,1),x=>x.put(0x8654a4,3),x=>x.put(0xd00030,0),x=>x.put(0x802084,0),x=>x.put(x.race,2),x=>x.put(x.p+16,1),x=>x.put(x.p+4,x.face),x=>x.put(Native.B+20,x.race+4),...Native.baseProfile.cars.onlineAddresses.map((a,i)=>x=>i===1?x.byte(a,0):x.put(a,0)),...[0x89e7d8,0x89e7d9,0x89e7e3].map(a=>x=>x.byte(a,1)),...[0x890104,0x890108,0x89010c,0x890114].map(a=>x=>x.put(a,1))]){
    const x=fixture();mutate(x);assert.equal(x.filter().excludedCars,0);
  }
});
test('NPC proof requires its static record, native driver and unique current AI membership',()=>{
  for(const mutate of [x=>x.put(x.face+0x24,1),x=>x.put(x.face+0x14,0xe10000),x=>x.put(x.face+0x14,0x890161),x=>x.put(0x890164,1),x=>x.put(x.world+0x10,23),x=>x.put(x.world+0x14,2),x=>x.put(x.world+0x18,3),x=>x.put(x.world+0x20,x.face+4),x=>{x.put(x.world+0x14,0);x.put(x.world+0x1c,x.face);}]){
    const x=fixture();mutate(x);assert.equal(x.filter().excludedCars,0);
  }
});
test('source changes at final recheck preserve all hazards and no preview operation writes memory',()=>{
  for(const mutate of [x=>x.put(Native.B+8,0),x=>x.put(Native.SLOT,3),x=>x.put(x.other+0x130,x.face+4),x=>x.commit(x.face,0x9e4,false),x=>x.memory.grow(1)]){
    const x=fixture(),live=x.engine.live.bind(x.engine);let calls=0;x.engine.live=(...args)=>{if(++calls===2)mutate(x);return live(...args);};
    assert.equal(x.filter().excludedCars,0);
  }
  const x=fixture(),low=Buffer.from(new Uint8Array(x.memory.buffer,0,0x1000000)),ports=Buffer.from(new Uint8Array(x.memory.buffer,695000000,11000000));
  assert.equal(x.filter().excludedCars,1);assert.deepEqual(Buffer.from(x.memory.buffer,0,0x1000000),low);assert.deepEqual(Buffer.from(x.memory.buffer,695000000,11000000),ports);
});
test('real city pacer retains selected pace for a current ghost but slows for the same solid car or a wall',()=>{
  const x=fixture({rivals:true,traffic:false,players:false});
  x.engine.pacingHazards=()=>x.hazards;
  const driver=0xe10000;x.put(x.car+0x24,3);x.put(x.car+0x2c,driver);x.put(driver,0x785370);x.put(driver+4,x.car);
  const input={enabled:true,verified:true,capabilities:{ai:true,pace:true},automaticAI:true,allowNetwork:true,safe:true,focused:true,hidden:false,menuOpen:false,tunerBusy:false,hud:2,raceType:0,drag:false,drift:false,streetX:false,engine:x.engine,state:x.engine.state(),aiState:{available:true,ready:true,active:true,owned:true,switching:false},identity:'real-city',now:0,selectedPace:1.85,nativeSpeed:30,carController:x.c,moduleHash:Native.baseProfile.hash};
  const pacer=new Controller({Pacing,contactPreview:Preview.filter});let r=pacer.update(input);assert.equal(r.pace,1.85);assert.equal(r.excludedCars,1);
  x.c.stop();r=pacer.update({...input,now:50});assert.equal(r.pace,.75);assert.equal(r.excludedCars,0);assert.equal(r.clearanceSource,'vehicle');
  x.update();x.hazards.barrierAhead=15;r=pacer.update({...input,now:100});assert.equal(r.pace,.75);assert.equal(r.excludedCars,1);assert.equal(r.clearanceSource,'barrier');
});
