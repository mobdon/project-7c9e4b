'use strict';
// Executes the actual production-patched contact wrapper and actual native
// online helper. Only ghost and dispatch dependencies are controlled stubs.
const {test,before}=require('node:test'),assert=require('node:assert/strict');
const {readPinned,bodies,leb,string,section}=require('../tools/latest-native-utils.cjs');
const AI=require('../extension/ai.js'),Cars=require('../extension/cars.js'),Walls=require('../extension/walls.js');
const profile=require('../extension/next-profile.js');
const A=AI.BASE,AM=AI.MAGIC,CB=Cars.BASE,WB=Walls.BASE;
const NATIVE_TARGET=20704,IMPORT_COUNT=22829;
let module_,onlineModule,slotModule;
before(async()=>{
 const bytes=readPinned('next'),native=bodies(bytes),patched=bodies(await AI.patchBytes(bytes));
 assert.equal(profile.wall.functionIndex,22508);assert.equal(profile.wall.helper,22797);
 assert.deepEqual(profile.wall.onlineAddresses,[705682588,705799472,705683756]);
 // Keep all original function-index operands: the exact patched body comes
 // directly from patchBytes, not a separately rebuilt authored-WAT fixture.
 const imports=[...leb(IMPORT_COUNT+1),...string('env'),...string('memory'),2,3,...leb(10800),...leb(65536)];
 for(let i=0;i<IMPORT_COUNT;i++){
  const spec=i===22797?['online',2]:i===22798?['slot_kind',5]:i===22826?['ghost',3]:i===22828?['dispatch',4]:[String(i),0];
  imports.push(...string(spec[1]?'env':'unused'),...string(spec[0]),0,...leb(spec[1]));
 }
 const exports=[...leb(2),...string('step'),0,...leb(IMPORT_COUNT),...string('original'),0,...leb(IMPORT_COUNT+1)];
 const code=[...leb(2)];for(const body of [patched.get(22508),native.get(22508)])code.push(...leb(body.length),...body);
 const types=[6,96,0,0,96,1,127,0,96,0,1,127,96,1,127,1,127,96,2,127,127,0,96,2,127,127,1,127];
 const fixture=Buffer.from([0,97,115,109,1,0,0,0,...section(1,types),...section(2,imports),...section(3,[2,1,1]),...section(7,exports),...section(10,code)]);
 assert.equal(WebAssembly.validate(fixture),true);module_=new WebAssembly.Module(fixture);
 const {wabt,functions}=await require('../tools/extract-next-functions.cjs')([22797,22798]);
 const m=wabt.parseWat('next-online-native.wat',`(module (import "env" "memory" (memory 10800 65536 shared)) ${functions.get(22797)} (export "run" (func $f22797)))`,{threads:true});
 m.resolveNames();m.validate({threads:true});onlineModule=new WebAssembly.Module(m.toBinary({}).buffer);
 const slot=wabt.parseWat('next-player-slot.wat',`(module (import "env" "memory" (memory 10800 65536 shared)) ${functions.get(22798)} (export "run" (func $f22798)))`,{threads:true});slot.resolveNames();slot.validate({threads:true});slotModule=new WebAssembly.Module(slot.toBinary({}).buffer);
});
function fixture(kind='wall',cars=true,walls=true){
 const memory=new WebAssembly.Memory({initial:10800,maximum:65536,shared:true}),d=new DataView(memory.buffer);
 const p=0xe00000,car=0xe01000,race=0xe04000,body=0xe05000,other=0xe06000,face=0xe07000,contact=0xe08000,pair=0xe09000,cpu=0xe0a000,stack=0xe0b000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),f=(a,v)=>d.setFloat32(a,v,true);
 put(A,AM);put(A+28,AM);put(A+4,2);put(0xd00000,p);put(0xd00030,1);put(0x8654a4,6);put(0x850078,1);put(0x890118,race);put(race,4);put(p+4,car);put(car+0x3c,body);put(body+0x130,car);
 if(kind==='car'){put(other+0x130,face);put(face+0x3c,other);}else{put(other,0x7a22a8);d.setUint8(other+0x11,kind==='prop'?1:3);put(other+0x60,face);put(face+0x10,other);f(face+0x70,kind==='floor'?0:1);f(face+0x78,kind==='floor'?1:0);}
 put(contact+0xc,body);put(contact+0x10,other);put(contact+0x14,pair);put(pair+0x238,body);put(pair+0x23c,other);put(0x802084,2);
 const c=new Cars.Controller(memory,true,profile.cars),w=new Walls.Controller(memory,true,profile.wall),state={ready:true,driving:true,network:false,car,race};
 c.update({enabled:cars,safe:true,state});w.update({enabled:walls,safe:true,state});
 let ghost=false,ghostCalls=0;const dispatch=[];
 const online=new WebAssembly.Instance(onlineModule,{env:{memory}}).exports.run;
 const slotKind=new WebAssembly.Instance(slotModule,{env:{memory}}).exports.run;
 const unused=new Proxy({}, {get:(_,name)=>()=>{throw Error('Unexpected native call '+String(name));}});
 const instance=new WebAssembly.Instance(module_,{unused,env:{memory,online,slot_kind:slotKind,ghost:value=>{assert.equal(value,contact);ghostCalls++;return +ghost;},dispatch:(value,target)=>dispatch.push({cpu:value,target})}});
 const prepare=()=>{put(cpu+4,contact);put(cpu+16,stack);put(stack,0x12345678);};
 const step=(original=false)=>{prepare();instance.exports[original?'original':'step'](cpu);};
 const swap=()=>{put(contact+12,other);put(contact+16,body);put(pair+0x238,other);put(pair+0x23c,body);};
 return {memory,d,put,get,f,p,car,race,body,other,face,contact,pair,cpu,stack,c,w,state,step,swap,online,slotKind,ghost:value=>{ghost=value;},ghostCalls:()=>ghostCalls,dispatch};
}
test('next exact production contact prefix keeps car/wall toggles independent and floor/props native',()=>{
 for(const kind of ['car','wall','floor','prop'])for(const cars of [false,true])for(const walls of [false,true])for(const swapped of [false,true]){
  const x=fixture(kind,cars,walls);if(swapped)x.swap();x.step();const skip=kind==='car'?cars:kind==='wall'?walls:false;
  assert.equal(x.ghostCalls(),+!skip,`${kind} cars=${cars} walls=${walls} swapped=${swapped}`);
  assert.deepEqual(x.dispatch,skip?[]:[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),+skip);
  assert.equal(x.get(x.cpu+16),x.stack+(skip?4:0));if(skip)assert.equal(x.get(x.cpu+32),0x12345678);
  assert.equal(x.c.status().hits,+(kind==='car'&&cars));assert.equal(x.w.status().hits,+(kind==='wall'&&walls));
 }
});
test('next disabled prefix preserves exact native dispatch and ghost-return memory effects',()=>{
 for(const kind of ['car','wall'])for(const ghost of [false,true]){
  const a=fixture(kind,false,false),b=fixture(kind,false,false);a.ghost(ghost);b.ghost(ghost);a.step(true);b.step();
  assert.deepEqual(b.dispatch,a.dispatch);assert.equal(b.ghostCalls(),a.ghostCalls());
  assert.deepEqual(Buffer.from(b.memory.buffer,0,0x1000000),Buffer.from(a.memory.buffer,0,0x1000000));
 }
});
test('next actual online helper and both page controllers agree on all native boolean combinations',()=>{
 for(const kind of ['car','wall'])for(let mask=0;mask<8;mask++){
  const x=fixture(kind);profile.wall.onlineAddresses.forEach((a,i)=>x.put(a,(mask>>i)&1));const online=mask===7;
  assert.equal(x.online(),+online);assert.equal(x.c.onlineRoam(),online);assert.equal(x.w.onlineRoam(),online);x.step();
  assert.equal(x.get(x.pair+0x240),+!online);assert.deepEqual(x.dispatch,online?[{cpu:x.cpu,target:NATIVE_TARGET}]:[]);
  if(online){assert.equal(x.get(CB+24),2);assert.equal(x.get(WB+24),2);}
 }
});
test('previous build online addresses cannot stand in for next native online globals',()=>{
 for(const kind of ['car','wall']){const x=fixture(kind);for(const a of [703669484,703786368,703670652,704405244,704522128,704406412])x.put(a,1);
  assert.equal(x.online(),0);assert.equal(x.c.onlineRoam(),false);assert.equal(x.w.onlineRoam(),false);x.step();assert.deepEqual(x.dispatch,[]);assert.equal(x.get(x.pair+0x240),1);
 }
});
test('next exact contact path still blocks every guest network flag despite AI opt-in',()=>{
 for(const kind of ['car','wall'])for(const [a,v]of [[0x850078,8],[0x850078,0x200],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
  const x=fixture(kind);x.put(A+84,1);x.put(a,v);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);assert.equal(x.get(a),v);
 }
});
test('next exact contact path refuses stale, torn, replaced and malformed collision state',()=>{
 const changes=[x=>x.put(A+48,180),x=>x.put(A+4,3),x=>x.put(0xd00030,2),x=>x.put(x.race,6),x=>x.put(x.p+4,0),x=>x.put(x.body+0x130,x.car+4),x=>x.put(x.pair+0x238,x.body+4),x=>x.put(0x802084,3),x=>x.put(x.car+0x3c,0)];
 for(const kind of ['car','wall'])for(const change of changes){const x=fixture(kind);change(x);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);}
});

function onlineFixture(driver=4){const x=fixture('car',false,false);x.state.network=true;x.put(x.face+0x24,driver);profile.wall.onlineAddresses.forEach(a=>x.put(a,1));x.c.update({enabled:false,allowNetwork:true,onlineTraffic:true,safe:true,state:x.state});return x;}
test('explicit online traffic mode filters native traffic in both body orders without enabling AI or walls',()=>{
 for(const driver of [1,3])for(const reversed of [false,true]){const x=onlineFixture();x.put(x.car+0x24,driver);if(reversed)x.swap();x.step();assert.deepEqual(x.dispatch,[]);assert.equal(x.get(x.pair+0x240),1);assert.equal(x.get(x.car+0x24),driver);assert.equal(x.get(A+8),0);assert.equal(x.w.status().hits,0);assert.equal(x.c.status().onlineTraffic,true);assert.equal(x.c.status().hits,1);assert.match(x.c.status().reason,/traffic contacts skipped/);}
});
test('online traffic does not pass through human, inert, AI-racer, parked or unknown drivers',()=>{
 for(const driver of [0,1,2,3,5,6,255,0xffffffff]){const x=onlineFixture(driver);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);assert.equal(x.c.status().hits,0);}
});
test('actual native slot lookup excludes every active player slot even when driver is mislabeled traffic',()=>{
 const base=705692928,stride=1568;for(let i=0;i<64;i++){const x=onlineFixture(),slot=base+stride*i;x.put(slot,3);x.put(slot+76,x.face);assert.notEqual(x.slotKind(x.face,0),-1);const before=Buffer.from(new Uint8Array(x.memory.buffer,base,100352));x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.c.status().hits,0);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,base,100352)),before);}
});
test('native player slot classification excludes hidden, friend and crew players without writing their data',()=>{
 for(const hidden of [0,1])for(const friend of [0,1])for(const crew of [0,1,5]){const x=onlineFixture(),slot=705692928;x.put(slot,3);x.put(slot+76,x.face);x.put(slot+932,hidden);x.put(slot+1556,friend);x.put(slot+1536,crew);x.step();assert.equal(x.get(x.pair+0x240),0);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);}
});
test('online traffic requires explicit true and verified next profile support',()=>{
 for(const flag of [false,0,1,'true',null]){const x=onlineFixture();x.c.update({allowNetwork:true,onlineTraffic:flag,safe:true,state:x.state});x.step();assert.equal(x.get(CB+8),0);assert.equal(x.get(CB+36),0);assert.equal(x.get(x.pair+0x240),0);}
 const x=onlineFixture(),unsupported=new Cars.Controller(x.memory,true,{onlineAddresses:profile.cars.onlineAddresses});unsupported.update({allowNetwork:true,onlineTraffic:true,safe:true,state:x.state});x.step();assert.equal(x.get(CB+36),0);assert.equal(x.get(x.pair+0x240),0);
});
test('offline, outrun and every race category reject online-traffic mode even if native online helper is true',()=>{
 for(const type of [1,2,3,4,5,6,7,8,9,10,255]){const x=onlineFixture();x.put(0x89e7b0,type);x.step();assert.equal(x.get(CB+24),3);assert.equal(x.get(x.pair+0x240),0);x.c.update({allowNetwork:true,onlineTraffic:true,safe:true,state:x.state});assert.equal(x.get(CB+8),0);}
 const x=onlineFixture();profile.wall.onlineAddresses.forEach(a=>x.put(a,0));x.step();assert.equal(x.get(CB+24),3);assert.equal(x.get(x.pair+0x240),0);
});
test('online traffic never overrides Online/LAN guest flags, local co-op or stale commands',()=>{
 for(const [a,v]of [[0x850078,8],[0x850078,0x200],[0x866a14,1],[0x8669f4,1],[0x89cf69,1],[0xd00030,2],[A+48,180],[A+4,3],[CB+4,3],[CB+36,2]]){const x=onlineFixture();x.put(a,v);x.put(A+84,1);x.step();assert.equal(x.get(x.pair+0x240),0);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);}
});
test('online traffic never enables wall filtering and leaves floors and props native',()=>{
 for(const kind of ['wall','floor','prop']){const x=fixture(kind,false,false);profile.wall.onlineAddresses.forEach(a=>x.put(a,1));x.c.update({allowNetwork:true,onlineTraffic:true,safe:true,state:x.state});x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);assert.equal(x.w.status().hits,0);}
});
test('switch off, unsafe state and going offline restore original collisions without changing native Ghost settings',()=>{
 const x=onlineFixture();x.step();assert.equal(x.c.status().hits,1);x.c.stop();x.put(x.pair+0x240,0);x.step();assert.equal(x.c.status().hits,0);assert.equal(x.get(CB+36),0);assert.equal(x.get(x.pair+0x240),0);
 for(const safe of [false,0,'true']){const y=onlineFixture();y.c.update({allowNetwork:true,onlineTraffic:true,safe,state:y.state});y.step();assert.equal(y.get(y.pair+0x240),0);}
 const y=onlineFixture();y.step();profile.wall.onlineAddresses.forEach(a=>y.put(a,0));y.c.update({allowNetwork:true,onlineTraffic:true,safe:true,state:y.state});y.put(y.pair+0x240,0);y.step();assert.equal(y.c.status().requested,false);assert.equal(y.get(y.pair+0x240),0);
});

function playerFixture({traffic=false,players=true,slot=0,driver=0}={}){
 const x=fixture('car',false,false);x.state.network=true;x.put(x.face+0x24,driver);profile.wall.onlineAddresses.forEach(a=>x.put(a,1));
 if(slot!==null){x.put(705692928+1568*slot,3);x.put(705692928+1568*slot+76,x.face);}
 x.c.update({allowNetwork:true,onlineTraffic:traffic,onlinePlayers:players,safe:true,state:x.state});return x;
}
test('player no-clip explicitly covers every native player slot while preserving car identity and driver mode',()=>{
 for(let i=0;i<64;i++){const x=playerFixture({slot:i,driver:i%5});if(i%2)x.swap();const before=Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x4000));x.step();assert.deepEqual(x.dispatch,[]);assert.equal(x.get(x.pair+0x240),1);assert.equal(x.c.status().onlinePlayers,true);assert.equal(x.c.status().onlineTraffic,false);assert.equal(x.c.status().playerHits,1);assert.equal(x.c.status().trafficHits,0);assert.equal(x.c.status().hits,1);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x4000)),before);}
});
test('traffic and player switches form independent category filters including deliberately mislabeled players',()=>{
 for(const traffic of [false,true])for(const players of [false,true])for(const actualPlayer of [false,true])for(const driver of [0,1,3,4]){
  const x=playerFixture({traffic,players,slot:actualPlayer?0:null,driver}),skip=actualPlayer?players:driver===4&&traffic;x.step();assert.deepEqual(x.dispatch,skip?[]:[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.c.status().playerHits,+(actualPlayer&&players));assert.equal(x.c.status().trafficHits,+(!actualPlayer&&driver===4&&traffic));
 }
});
test('player-only mode does not infer ownership from appearance or driver and rejects nonactive slots',()=>{
 for(const state of [0,1,2,4,5,255]){const x=playerFixture({driver:4});x.put(705692928,state);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.c.status().hits,0);}
 const x=playerFixture();x.put(705692928+76,x.face+4);x.step();assert.equal(x.c.status().hits,0);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);
});
test('hidden, friend and crew players use the same read-only native category and no slot settings change',()=>{
 for(const hidden of [0,1])for(const friend of [0,1])for(const crew of [0,1,5]){const x=playerFixture();x.put(705692928+932,hidden);x.put(705692928+1556,friend);x.put(705692928+1536,crew);const before=Buffer.from(new Uint8Array(x.memory.buffer,705692928,100352));x.step();assert.equal(x.c.status().playerHits,1);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,705692928,100352)),before);}
});
test('separate traffic/player hit counts reflect the contacted category when both modes are selected',()=>{
 const x=playerFixture({traffic:true,players:true});x.step();assert.equal(x.c.status().playerHits,1);assert.equal(x.c.status().trafficHits,0);
 x.put(705692928,0);x.put(x.face+0x24,4);x.put(x.pair+0x240,0);x.step();assert.equal(x.c.status().playerHits,1);assert.equal(x.c.status().trafficHits,1);assert.equal(x.c.status().hits,2);
 const status=x.c.update({allowNetwork:true,onlineTraffic:true,onlinePlayers:true,safe:true,state:x.state});assert.match(status.trafficReason,/1 traffic contacts/);assert.match(status.playersReason,/1 player-car contacts/);
});
test('new player opt-in requires literal true and the new exact profile, never just existing traffic capability',()=>{
 for(const flag of [false,0,1,'true',null]){const x=playerFixture();x.c.update({allowNetwork:true,onlinePlayers:flag,safe:true,state:x.state});x.step();assert.equal(x.get(CB+36),0);assert.equal(x.c.status().hits,0);}
 for(const cfg of [{...profile.cars,onlinePlayers:false},{...profile.cars,contactCounters:1},{onlineTraffic:true,onlineAddresses:profile.cars.onlineAddresses}]){const x=playerFixture(),c=new Cars.Controller(x.memory,true,cfg);c.update({allowNetwork:true,onlinePlayers:true,safe:true,state:x.state});x.step();assert.equal(x.get(CB+36),0);assert.equal(x.get(x.pair+0x240),0);}
});
test('player filtering retains every online/LAN, race, stale heartbeat, co-op and identity guard',()=>{
 const changes=[x=>x.put(0x850078,8),x=>x.put(0x850078,0x200),x=>x.put(0x866a14,1),x=>x.put(0x8669f4,1),x=>x.put(0x89cf69,1),x=>x.put(0xd00030,2),x=>x.put(A+48,180),x=>x.put(A+4,3),x=>x.put(CB+4,3),x=>x.put(CB+36,4),x=>x.put(CB+36,0xffffffff),x=>x.put(x.race,3),x=>x.put(0x8654a4,3),x=>x.put(x.p+4,x.car+4),x=>x.put(x.body+0x130,x.car+4),x=>x.put(x.face+0x3c,x.other+4),x=>x.put(x.pair+0x238,x.body+4),x=>profile.wall.onlineAddresses.forEach(a=>x.put(a,0))];
 for(const change of changes){const x=playerFixture();change(x);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);}
 for(const type of [1,2,3,4,5,6,7,8,9,10,255]){const x=playerFixture();x.put(0x89e7b0,type);x.step();assert.equal(x.get(x.pair+0x240),0);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);}
});
test('online player mode leaves walls, floors and props native even when they resemble player pointers',()=>{
 for(const kind of ['wall','floor','prop']){const x=fixture(kind,false,false);profile.wall.onlineAddresses.forEach(a=>x.put(a,1));x.put(705692928,3);x.put(705692928+76,x.face);x.c.update({allowNetwork:true,onlinePlayers:true,safe:true,state:x.state});x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);}
});
test('off, unsafe state and changing selected category restore original contact path and clear old counts',()=>{
 const x=playerFixture({traffic:true});x.step();x.c.update({allowNetwork:true,onlineTraffic:true,onlinePlayers:false,safe:true,state:x.state});assert.equal(x.c.status().playerHits,0);x.put(x.pair+0x240,0);x.step();assert.equal(x.get(x.pair+0x240),0);assert.equal(x.c.status().onlineTraffic,true);assert.equal(x.c.status().onlinePlayers,false);
 for(const safe of [false,0,'true']){const y=playerFixture();y.c.update({allowNetwork:true,onlinePlayers:true,safe,state:y.state});y.step();assert.equal(y.get(y.pair+0x240),0);}
 const y=playerFixture();y.step();y.c.stop();y.put(y.pair+0x240,0);y.step();assert.equal(y.c.status().hits,0);assert.equal(y.get(CB+36),0);assert.equal(y.get(y.pair+0x240),0);
});

function raceFixture({mode=8,allowNetwork=true,cars=true,swapped=false}={}) {
 const x=fixture('car',false,false);x.put(0x850078,mode);x.put(0x89e7b0,1);x.put(A+84,+allowNetwork);
 x.state.network=true; x.put(x.race+0x24,2);
 for(const [i,car] of [x.car,x.face].entries()) {
  const record=x.race+0x30+0x1f0*i;
  x.put(record,car);x.put(x.race+0xbd0+4*i,record);x.put(car+0x1c,record);
 }
 x.c.update({onlinePlayers:cars,allowNetwork,safe:true,state:x.state});
 if(swapped)x.swap();return x;
}
test('online race mode filters both local/roster-car orders in Online and LAN without a free-roam slot',()=>{
 for(const mode of [8,0x200])for(const swapped of [false,true]) {
  const x=raceFixture({mode,swapped});const before=Buffer.from(x.memory.buffer.slice(x.race,x.race+0xc00));
  assert.equal(x.slotKind(x.face,0),-1);assert.equal(x.online(),0);x.step();
  assert.deepEqual(x.dispatch,[]);assert.equal(x.get(x.pair+0x240),1);assert.equal(x.c.status().onlineRaceCars,true);assert.equal(x.c.status().playerHits,1);assert.equal(x.c.status().trafficHits,0);
  assert.deepEqual(Buffer.from(x.memory.buffer,x.race,0xc00),before);
  assert.equal(x.get(x.cpu+16),x.stack+4);assert.equal(x.get(x.cpu+32),0x12345678);
 }
});
test('race filtering accepts arbitrary roster order and all six native inline records',()=>{
 for(let me=0;me<6;me++)for(let them=0;them<6;them++)if(me!==them){
  const x=raceFixture();x.put(x.race+0x24,6);
  for(let i=0;i<6;i++){const record=x.race+0x30+0x1f0*i;x.put(record,i===me?x.car:i===them?x.face:0xe10000+i*0x1000);x.put(x.race+0xbd0+4*(5-i),record);}
  x.put(x.car+0x1c,x.race+0x30+0x1f0*me);x.put(x.face+0x1c,x.race+0x30+0x1f0*them);x.step();assert.deepEqual(x.dispatch,[]);assert.equal(x.c.status().playerHits,1);
 }
});
test('race mode requires both exact roster memberships, reciprocal records, bounded count and valid inline pointers',()=>{
 const changes=[x=>x.put(x.race+0x24,0),x=>x.put(x.race+0x24,1),x=>x.put(x.race+0x24,7),x=>x.put(x.race+0x24,0xffffffff),x=>x.put(x.race+0x30,0),x=>x.put(x.race+0x220,x.car),x=>x.put(x.car+0x1c,0),x=>x.put(x.face+0x1c,x.race+0x30),x=>x.put(x.race+0xbd0,0),x=>x.put(x.race+0xbd0,x.race+0x31),x=>x.put(x.race+0xbd4,x.race+0xbd0),x=>x.put(x.race+0xbd4,x.race+0x30),x=>{x.put(x.race+0x24,3);x.put(x.race+0xbd8,x.race+0x220);}];
 for(const change of changes){const x=raceFixture();change(x);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);assert.equal(x.c.status().hits,0);}
});
test('race mode never uses a free-roam slot, traffic driver or appearance in place of roster identity',()=>{
 for(const driver of [0,1,2,3,4,5]){const x=raceFixture();x.put(x.face+0x24,driver);x.put(x.race+0x220,0);x.put(705692928,3);x.put(705692928+76,x.face);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.c.status().hits,0);}
});
test('race filtering retains permission, network-mode, race-phase, heartbeat, identity and contact guards',()=>{
 const changes=[x=>x.put(A+84,0),x=>x.put(A+84,2),x=>x.put(0x850078,1),x=>x.put(0x850078,0x208),x=>x.put(0x89e7b0,0),x=>x.put(0x89e7b0,7),x=>x.put(0x89e7b0,255),x=>x.put(x.race,3),x=>x.put(x.race,6),x=>x.put(0xd00030,2),x=>x.put(A+48,180),x=>x.put(A+4,3),x=>x.put(CB+4,3),x=>x.put(CB+36,5),x=>x.put(0x8654a4,3),x=>x.put(x.p+4,x.car+4),x=>x.put(x.body+0x130,x.car+4),x=>x.put(x.face+0x3c,x.other+4),x=>x.put(x.pair+0x238,x.body+4),x=>x.put(0x802084,3)];
 for(const change of changes){const x=raceFixture();change(x);x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.get(x.pair+0x240),0);}
});
test('race selection needs its own exact capability and literal network permission; selection alone is not armed',()=>{
 for(const allowNetwork of [false,0,1,'true',null]){const x=raceFixture();x.c.update({onlinePlayers:true,allowNetwork,safe:true,state:x.state});x.step();assert.equal(x.c.status().requested,false);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);}
 const x=raceFixture(),old=new Cars.Controller(x.memory,true,{...profile.cars,onlineRaceCars:false});old.update({onlinePlayers:true,allowNetwork:true,safe:true,state:x.state});x.step();assert.equal(old.status().requested,false);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);
});
test('race stop, focus loss, opt-out and traffic-only selection return to the original wrapper',()=>{
 for(const opts of [{onlinePlayers:false,allowNetwork:true,safe:true},{onlinePlayers:true,allowNetwork:false,safe:true},{onlinePlayers:true,allowNetwork:true,safe:false},{onlineTraffic:true,allowNetwork:true,safe:true}]){
  const x=raceFixture();x.step();assert.equal(x.c.status().playerHits,1);x.put(x.pair+0x240,0);x.dispatch.length=0;x.c.update({...opts,state:x.state});x.step();assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:NATIVE_TARGET}]);assert.equal(x.c.status().hits,0);assert.equal(x.get(x.pair+0x240),0);
 }
});
test('free-roam to race to free-roam changes mode and resets evidence without mixing traffic and race counters',()=>{
 const x=playerFixture({traffic:true});x.step();assert.equal(x.c.status().playerHits,1);
 x.put(0x850078,8);x.put(0x89e7b0,1);x.put(A+84,1);x.state.network=true;x.put(x.race+0x24,2);
 [x.car,x.face].forEach((car,i)=>{const r=x.race+0x30+0x1f0*i;x.put(r,car);x.put(x.race+0xbd0+4*i,r);x.put(car+0x1c,r);});
 x.c.update({onlineTraffic:true,onlinePlayers:true,allowNetwork:true,safe:true,state:x.state});assert.equal(x.get(CB+36),4);assert.equal(x.c.status().hits,0);x.step();assert.equal(x.c.status().playerHits,1);assert.equal(x.c.status().onlineTraffic,false);
 x.put(0x850078,1);x.put(0x89e7b0,0);x.state.network=true;x.c.update({onlineTraffic:true,onlinePlayers:true,allowNetwork:true,safe:true,state:x.state});assert.equal(x.get(CB+36),3);assert.equal(x.c.status().hits,0);assert.equal(x.c.status().onlineRaceCars,false);
});
