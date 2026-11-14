'use strict';
// Actual production Controller and registry. Native receipts are explicit test
// doubles here; native sampler/setter execution is covered in forward tests.
const {test}=require('node:test'),assert=require('node:assert/strict');
const AI=require('../extension/ai.js'),Registry=require('../extension/forward-native-config.js');
const profiles=['modern','d2fa','cd5','abf'].map(name=>require('../extension/'+name+'-profile.js'));
const B=AI.BASE,C=AI.CORNER_BASE,LOW=[[0x850078,4],[0x866a14,4],[0x8669f4,4],[0x89cf69,1],[0x850088,4]];
function fixture(profile,{moduleHash=profile.hash,short=false,tiny=false,installed=true}={}){
 const config=Registry.select(profile.hash);assert.ok(config?.runtime?.onlineAddresses);
 const pages=tiny?1:short?256:Math.ceil((Math.max(...config.runtime.onlineAddresses)+8)/65536);
 const memory=new WebAssembly.Memory({initial:pages,maximum:65536,shared:true}),d=new DataView(memory.buffer);
 const put=(p,v,bytes=4)=>bytes===1?d.setUint8(p,v):d.setUint32(p,v,true),get=p=>d.getUint32(p,true);
 const caps={...profile.capabilities,nativeForwardGeometry:installed,nativeForwardClamp:installed};
 const c=new AI.Controller(memory,true,caps,{moduleHash});
 const player=0xe00000,car=0xe01000,race=0xe04000,driver=0xe06000;
 const state={ready:true,driving:true,network:false,car,race};
 const options={enabled:true,safe:true,state,mode:1,pace:1.4,adaptivePace:1,raceCornerAssist:true,adaptiveCorners:true,allowNetwork:true};
 if(!tiny){
  for(const[p,v]of [[B+28,AI.MAGIC],[0x8654a4,6],[0xd00000,player],[player+4,car],[0x890118,race],[race,4],[car+0x24,3],[car+0x2c,driver],[driver,0x785370],[driver+4,car],[0x89e7b0,1]])put(p,v);
 }
 function ack({manual=false}={}){
  const p=get(0xd00000),v=get(p+4);put(B+32,manual?0:p);put(B+36,manual?0:v);put(B+40,manual?0:state.race);put(B+52,manual?0:1);put(B+72,0);put(B+44,get(B+24));put(v+0x24,manual?1:3);
 }
 const update=extra=>c.update({...options,...extra});
 const clearContext=()=>{for(const[p,width]of LOW)put(p,0,width);for(const[i,p]of config.runtime.onlineAddresses.entries())put(p,0,i===1?1:4);state.network=false;};
 const sequence=()=>get(B+4),heartbeat=()=>get(B+24);
 return{profile,config,memory,d,put,get,c,player,car,race,driver,state,options,ack,update,clearContext,sequence,heartbeat};
}
function stable(f,extra={}){
 const before=f.sequence(),hb=f.heartbeat();f.update(extra);assert.equal(f.sequence(),before,'unchanged command keeps its generation');assert.equal(f.heartbeat(),hb+1,'native watchdog receives a fresh heartbeat');
}
for(const profile of profiles){
 test(profile.revision+': exact runtime metadata binds stable offline and permitted online heartbeat contexts',()=>{
  const f=fixture(profile);assert.equal(f.c.forwardRuntime,f.config.runtime);f.update();f.ack();assert.equal(f.get(C+4),3);assert.equal(f.c.status().active,true);stable(f);
  const native=f.config.runtime.onlineAddresses;
  const cases=[
   ['network8',[[0x850078,8,4]],true],['network512',[[0x850078,512,4]],true],
   ['host',[[0x866a14,1,4]],true],['client',[[0x8669f4,1,4]],true],['online byte',[[0x89cf69,1,1]],true],
   ['native online',native.map((p,i)=>[p,1,i===1?1:4]),true],
   ['partial native0',[[native[0],1,4],[native[2],1,4]],false],
   ['partial native1',[[native[1],1,1],[native[2],1,4]],false],
   ['partial native2',[[native[0],1,4],[native[1],1,1]],false],
  ];
  for(const[label,fields,network]of cases){
   f.clearContext();for(const[p,value,width]of fields)f.put(p,value,width);f.state.network=network;
   const prior=f.sequence();f.update();assert.ok(f.sequence()>prior,label+' must create a fresh context generation');assert.equal(f.get(B+8),1,label);assert.equal(f.get(B+84),1,label);stable(f);
   for(const[p,value,width]of fields)assert.equal(width===1?f.d.getUint8(p):f.get(p),value,label+' native context is read-only');
  }
 });
 test(profile.revision+': every source tuple change invalidates the generation once while identical context remains stable',()=>{
  const f=fixture(profile);f.put(0x850078,8);f.state.network=true;f.update();f.ack();stable(f);
  const changes=[[0x850078,512,4],[0x866a14,1,4],[0x8669f4,1,4],[0x89cf69,1,1],[0x850088,7,4],...f.config.runtime.onlineAddresses.map((p,i)=>[p,1,i===1?1:4])];
  for(const[p,value,width]of changes){const previous=f.sequence();f.put(p,value,width);f.update();assert.ok(f.sequence()>previous,'context field '+p.toString(16));assert.equal(f.get(B+8),1);stable(f);}
  const previous=f.sequence();f.update({adaptivePace:.9});assert.ok(f.sequence()>previous);assert.equal(f.get(B+60),90);assert.equal(f.c.handbackPending,false);stable(f,{adaptivePace:.9});
 });
 test(profile.revision+': OFF cannot be hidden by same-event restart and native receipt is required before a new ON',()=>{
  const f=fixture(profile);f.update();f.ack();stable(f);let sequence=f.sequence();f.c.stop();assert.ok(f.sequence()>sequence);assert.equal(f.get(B+8),0);assert.equal(f.c.handbackPending,true);assert.equal(f.c.forwardNetworkKey,null);
  sequence=f.sequence();f.update();assert.ok(f.sequence()>sequence);assert.equal(f.get(B+8),0);assert.equal(f.c.handbackPending,true);
  f.ack({manual:true});sequence=f.sequence();f.update();assert.ok(f.sequence()>sequence);assert.equal(f.get(B+8),1);assert.equal(f.c.handbackPending,false);f.ack();stable(f);
 });
 test(profile.revision+': online permission withdrawal publishes OFF and literal opt-in cannot bypass native handback',()=>{
  const f=fixture(profile);f.state.network=true;f.put(0x850078,8);f.update();f.ack();stable(f);const before=f.sequence();f.update({allowNetwork:false});assert.ok(f.sequence()>before);assert.equal(f.get(B+8),0);assert.equal(f.get(B+84),0);assert.equal(f.c.handbackPending,true);
  for(const allowNetwork of [1,'true',undefined,false]){f.update({allowNetwork});assert.equal(f.get(B+8),0);assert.equal(f.get(B+84),0);}
  f.update();assert.equal(f.get(B+8),0,'unseen OFF survives restored permission');f.ack({manual:true});f.update();assert.equal(f.get(B+8),1);f.ack();stable(f);
 });
 test(profile.revision+': player/car/race replacement publishes OFF before reacquisition even if the native context tuple is unchanged',()=>{
  const f=fixture(profile);f.update();f.ack();const previous=f.sequence(),player=0xe10000,car=0xe12000,race=0xe15000;
  f.put(0xd00000,player);f.put(player+4,car);f.put(car+0x24,1);f.put(0x890118,race);f.put(race,4);f.state.car=car;f.state.race=race;
  f.update();assert.ok(f.sequence()>previous);assert.equal(f.get(B+8),0);assert.equal(f.c.handbackPending,true);f.update();assert.equal(f.get(B+8),0);
  f.ack({manual:true});f.update();assert.equal(f.get(B+8),1);assert.equal(f.get(B+12),player);assert.equal(f.get(B+16),car);assert.equal(f.get(B+20),race);f.ack();stable(f);
 });
 test(profile.revision+': exact hash alone cannot retain generations when the native runtime window is absent or sampler capability is false',()=>{
  for(const spec of [{short:true},{installed:false},{moduleHash:null},{moduleHash:'0'.repeat(64)},{moduleHash:profile.hash.toUpperCase()}]){
   const f=fixture(profile,spec);f.update();f.ack();const before=f.sequence();assert.doesNotThrow(()=>f.update());assert.ok(f.sequence()>before,JSON.stringify(spec));assert.equal(f.get(B+8),1);
   if(spec.short)assert.equal(f.c.forwardContext(true),null);if(spec.moduleHash!==undefined)assert.equal(f.c.forwardRuntime,null);
  }
  const f=fixture(profile,{tiny:true}),before=Buffer.from(f.memory.buffer);assert.doesNotThrow(()=>f.update());assert.equal(f.c.status().ready,false);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 });
 test(profile.revision+': heartbeat shortcut never conceals torn or changed command fields',()=>{
  const f=fixture(profile);f.update();f.ack();stable(f);
  const corruptions=[()=>f.put(B+4,f.sequence()|1),()=>f.put(B,0),()=>f.put(B+8,2),()=>f.put(B+12,f.player+4),()=>f.put(B+16,f.car+4),()=>f.put(B+20,f.race+4),()=>f.put(B+60,99),()=>f.put(B+84,0),()=>f.put(B+88,1),()=>f.put(B+100,1),()=>f.put(C+4,2),()=>f.put(C+8,70),()=>f.put(C+36,20),()=>f.put(C+44,50),()=>f.put(C+48,120),()=>f.put(C+12,f.car+4)];
  for(const corrupt of corruptions){corrupt();const before=f.sequence();f.update();assert.ok(f.sequence()>before);assert.equal(f.sequence()&1,0);assert.equal(f.get(B+8),1);stable(f);}
  f.put(C,0x12345678);f.put(C+4,3);const before=f.sequence();f.update();assert.ok(f.sequence()>before);assert.equal(f.get(C),0x12345678,'foreign corner mailbox remains untouched');
 });
}
