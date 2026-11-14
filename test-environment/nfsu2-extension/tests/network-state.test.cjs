'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Engine,A}=require('../extension/core.js'),Profiles=require('../extension/forward-native-config.js');
const {Controller}=require('../extension/city-pacing.js'),{Pacing}=require('../extension/dynamic-pacing.js');
const profiles=Object.values(Profiles.profiles),maxAddress=Math.max(...profiles.flatMap(p=>p.runtime.onlineAddresses))+4;
const pages=Math.ceil(maxAddress/65536),memory=new WebAssembly.Memory({initial:pages,maximum:pages,shared:true});
const player=0xe00000,car=0xe01000,race=0xe04000,driver=0xe06000,bars=0xe0c000;
function setup(moduleHash=profiles.at(-1).moduleHash,mem=memory){
 const d=new DataView(mem.buffer),put=(p,v)=>d.setUint32(p,v,true);
 for(const p of new Set(profiles.flatMap(x=>x.runtime.onlineAddresses)))if(p+4<=d.byteLength)put(p,0);
 for(const[p,v]of [[A.FLOW,6],[A.MODE,1],[A.HOST,0],[A.CLIENT,0],[A.PLAYER,player],[player+4,car],[player+16,0],[A.RACE,race],[race,4],[car+A.GEAR,3],[car+A.NOS_FULL,40000],[car+A.NOS_LEFT,123],[car+0x24,3],[car+0x2c,driver],[driver,0x785370],[driver+4,car],[0x89e7b0,0],[0x88f730,1],[0x88f734,bars]])put(p,v);
 d.setUint8(A.ONLINE,0);d.setFloat32(car+A.RPM,6000,true);d.setFloat32(car+0x90,1,true);
 [30,-10,30,10].forEach((v,i)=>d.setFloat32(bars+i*4,v,true));d.setUint8(bars+16,1);
 const e=new Engine(mem,48,moduleHash),cells=Profiles.select(moduleHash)?.runtime.onlineAddresses;
 const tuple=(values=[0x80000000,2,0x80000000])=>values.forEach((v,i)=>i===1?d.setUint8(cells[i],v):put(cells[i],v));
 return{e,d,put,cells,tuple};
}

test('every registered exact port tuple classifies online without weakening guest object bounds or writing flags',()=>{
 for(const profile of profiles){
  const f=setup(profile.moduleHash);assert.equal(f.e.state().network,false,profile.revision);f.tuple();
  const before=f.cells.map((p,i)=>i===1?f.d.getUint8(p):f.d.getUint32(p,true));
  assert.equal(f.e.state().network,true,profile.revision);assert.equal(f.e.live(f.e.state(),false,true),false);
  assert.equal(f.e.refill(f.e.state(),false),false);assert.equal(f.e.u32(car+A.NOS_LEFT),123);
  for(const p of f.cells){assert.equal(f.e.ok(p,4),false);assert.equal(f.e.u32(p),0);}
  assert.deepEqual(f.cells.map((p,i)=>i===1?f.d.getUint8(p):f.d.getUint32(p,true)),before);
  assert.equal(f.e.nosNetworkClock(),false,'Port classification must not invent a different NOS clock');
 }
});

test('native u32/u8/u32 AND semantics reject incomplete tuples and adjacent byte noise',()=>{
 const f=setup();
 for(const missing of [0,1,2]){const values=[1,255,1];values[missing]=0;f.tuple(values);assert.equal(f.e.state().network,false,String(missing));}
 f.tuple([1,0,1]);f.d.setUint8(f.cells[1]+1,1);assert.equal(f.e.state().network,false);
 f.tuple([1,255,1]);assert.equal(f.e.state().network,true);
});

test('unknown hashes and unavailable port windows retain conventional network checks without out-of-bounds reads',()=>{
 const known=setup();known.tuple();
 const unknown=new Engine(memory,48,'unknown');assert.equal(unknown.state().network,false);
 const small=new WebAssembly.Memory({initial:256,maximum:256,shared:true}),f=setup(profiles.at(-1).moduleHash,small);
 assert.equal(f.e.state().network,false);f.put(A.MODE,8);assert.equal(f.e.state().network,true);
 f.put(A.MODE,1);f.put(A.HOST,0xffffffff);assert.equal(f.e.state().network,true);assert.equal(f.e.nosNetworkClock(),false);
});

test('port-only online free roam requires independent literal consent before scanning or reducing pace',()=>{
 const f=setup();f.tuple();const c=new Controller({Pacing}),state=f.e.state();
 const input={enabled:true,verified:true,capabilities:{ai:true,pace:true},automaticAI:true,allowNetwork:false,safe:true,focused:true,hidden:false,menuOpen:false,tunerBusy:false,hud:2,raceType:0,drag:false,drift:false,streetX:false,engine:f.e,state,aiState:{available:true,ready:true,active:true,owned:true},identity:'exact-port-owner',now:0,selectedPace:2,nativeSpeed:60};
 const count=f.e.pacingHazards.bind(f.e);let scans=0;f.e.pacingHazards=(...args)=>{scans++;return count(...args);};
 assert.equal(c.update(input).state,'network-permission');assert.equal(scans,0);
 const active=c.update({...input,allowNetwork:true});assert.equal(active.active,true);assert.equal(active.pace,.75);assert.equal(scans,1);
 f.tuple([1,0,1]);assert.equal(c.update({...input,allowNetwork:true,state:f.e.state()}).state,'not-online');assert.equal(scans,1);
});
