'use strict';
// Real Engine.state and Cars.Controller integration. Native filtering remains
// covered separately by the unchanged production contact wrappers.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Engine}=require('../extension/core.js'),Cars=require('../extension/cars.js'),OldCars=require('../../work-paced-v03810/extension/cars.js');
const profile=require('../extension/family-profiles.js').profiles.find(p=>p.revision==='943ee537');
const B=Cars.BASE,A=0xd0d100,AM=0x3749414e;
function fixture(){
 const memory=new WebAssembly.Memory({initial:11000,maximum:65536,shared:true}),view=new DataView(memory.buffer),put=(p,v)=>view.setUint32(p,v>>>0,true),get=p=>view.getUint32(p,true),byte=(p,v)=>view.setUint8(p,v);
 const player=0xe00000,car=0xe01000,race=0xe04000;
 for(const[p,v]of [[0x8654a4,6],[0xd00000,player],[0xd00030,1],[player+4,car],[0x890118,race],[race,4],[0x850078,1],[car+0x434,3],[A,AM],[A+28,AM],[A+4,2]])put(p,v);
 view.setFloat32(car+0x440,6000,true);const engine=new Engine(memory,64,profile.hash),c=new Cars.Controller(memory,true,profile.cars);
 profile.cars.onlineAddresses.forEach((p,i)=>i===1?byte(p,1):put(p,1));
 const input={enabled:false,onlineTraffic:true,onlinePlayers:false,safe:true,allowNetwork:true};
 return {memory,view,put,get,byte,player,car,race,engine,c,input,update(extra={}){return c.update({...input,state:engine.state(),...extra});}};
}

test('actual current Engine.state online tuple reproduces10 veto and11 arms traffic without mislabeling free roam as a race',()=>{
 const f=fixture(),state=f.engine.state();assert.equal(state.ready,true);assert.equal(state.driving,true);assert.equal(state.network,true);
 const old=new OldCars.Controller(f.memory,true,profile.cars),rejected=old.update({...f.input,state});assert.equal(rejected.requested,false);assert.match(rejected.trafficReason,/Online\/LAN races/);assert.equal(f.get(B+8),0);
 const current=f.update();assert.equal(current.requested,true);assert.equal(current.onlineTraffic,true);assert.equal(current.onlinePlayers,false);assert.equal(current.onlineRaceCars,false);assert.equal(f.get(B+36),1);assert.equal(current.trafficHits,0);assert.match(current.trafficReason,/Armed.*traffic/);assert.doesNotMatch(current.trafficReason,/race/i);
});

test('online traffic and player switches remain independent when Engine reports the actual online session',()=>{
 for(const traffic of [false,true])for(const players of [false,true]){
  const f=fixture(),s=f.update({enabled:true,onlineTraffic:traffic,onlinePlayers:players});assert.equal(s.requested,traffic||players);assert.equal(s.onlineTraffic,traffic);assert.equal(s.onlinePlayers,players);assert.equal(s.onlineRaceCars,false);assert.equal(f.get(B+36),(+traffic)|(+players<<1));assert.match(s.soloReason,/separate traffic\/player/);
  if(players){assert.match(s.playersReason,/Armed.*player/);assert.doesNotMatch(s.playersReason,/active Online\/LAN race/);}
 }
});

test('online free-roam commands require literal network permission and withdrawal clears prior evidence immediately',()=>{
 for(const allowNetwork of [false,0,1,'true',null,undefined]){
  const f=fixture();f.update({onlinePlayers:true});f.put(B+28,7);f.put(B+32,9);const s=f.update({onlinePlayers:true,allowNetwork});assert.equal(s.requested,false);assert.equal(f.get(B+8),0);assert.equal(f.get(B+36),0);assert.equal(s.hits,0);assert.equal(f.get(B+28),0);assert.equal(f.get(B+32),0);assert.match(s.trafficReason,/Allow network tools/);assert.match(s.playersReason,/Allow network tools/);
 }
});

test('ordinary online free roam retains native conventional-network, Outrun, race and special-mode exclusions',()=>{
 const changes=[...[8,0x200,0x208].map(mode=>f=>f.put(0x850078,mode)),...[0x866a14,0x8669f4].map(p=>f=>f.put(p,1)),f=>f.byte(0x89cf69,1),...[1,2,3,4,5,6,7,8,9,10,255].map(type=>f=>f.put(0x89e7b0,type)),...[0x89e7d8,0x89e7d9,0x89e7e3].map(p=>f=>f.byte(p,1)),...[0x890104,0x890108,0x89010c,0x890114].map(p=>f=>f.put(p,1))];
 for(const change of changes){const f=fixture();f.update();change(f);const s=f.update();assert.equal(s.requested,false);assert.equal(f.get(B+8),0);assert.equal(s.trafficHits,0);}
});

test('unsafe driving, stale local identity and lost online tuple cannot retain a free-roam command',()=>{
 for(const change of [f=>f.put(f.race,3),f=>f.put(f.player+16,1),f=>f.put(0x8654a4,3),f=>profile.cars.onlineAddresses.forEach(p=>f.put(p,0))]){const f=fixture();f.update();change(f);assert.equal(f.update().requested,false);assert.equal(f.get(B+8),0);}
 for(const safe of [false,0,'true']){const f=fixture();f.update();assert.equal(f.update({safe}).requested,false);}
 const f=fixture(),state=f.engine.state();f.update();f.put(f.player+4,f.car+4);assert.equal(f.update({state}).requested,false);
});

test('Stop releases online categories and counters while solo and existing online race modes keep their separate contracts',()=>{
 const f=fixture();f.update({onlinePlayers:true});f.put(B+28,3);f.put(B+32,4);const stopped=f.c.stop();assert.equal(stopped.requested,false);assert.equal(f.get(B+8),0);assert.equal(f.get(B+36),0);assert.equal(stopped.hits,0);
 profile.cars.onlineAddresses.forEach(p=>f.put(p,0));assert.equal(f.engine.state().network,false);const solo=f.update({enabled:true,onlineTraffic:false});assert.equal(solo.requested,true);assert.equal(f.get(B+36),0);
 f.put(0x850078,8);f.put(0x89e7b0,1);const race=f.update({onlinePlayers:true});assert.equal(race.requested,true);assert.equal(race.onlineRaceCars,true);assert.equal(race.onlineTraffic,false);assert.equal(f.get(B+36),4);
 const denied=f.update({onlinePlayers:true,allowNetwork:false});assert.equal(denied.requested,false);assert.match(denied.playersReason,/Allow network tools/);
});
