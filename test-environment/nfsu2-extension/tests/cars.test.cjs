'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {Controller,BASE:B,MAGIC}=require('../extension/cars.js');
const {Controller:AI,BASE:A,MAGIC:AM}=require('../extension/ai.js');
const profile=require('../extension/current-profile.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-current-bridge.wasm'));
const hook=new WebAssembly.Module(fs.readFileSync(__dirname+'/cars.wasm'));
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer);
 const p=0xe00000,car=0xe01000,race=0xe04000,body=0xe05000,otherbody=0xe06000,othercar=0xe07000,contact=0xe08000,pair=0xe09000,cpu=0xe0a000,stack=0xe0b000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),byte=(a,v)=>d.setUint8(a,v);
 put(0xd00000,p);put(0xd00030,1);put(0x8654a4,6);put(0x850078,1);put(0x890118,race);put(race,4);put(p+4,car);put(car+0x3c,body);put(car+0x24,1);put(body+0x130,car);
 put(otherbody+0x130,othercar);put(othercar+0x3c,otherbody);put(othercar+0x24,4);
 put(contact+0xc,body);put(contact+0x10,otherbody);put(contact+0x14,pair);put(pair+0x238,body);put(pair+0x23c,otherbody);put(0x802084,2);
 put(cpu+16,stack);put(stack,0x581475);
 let natives=0,online=0;
 const game=new WebAssembly.Instance(bridge,{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected dyno call while unarmed');},gcall:()=>{throw Error('Car no-clip must not change the driver');}}});
 const native=new WebAssembly.Instance(hook,{env:{memory,roam_online:()=>online,original:()=>{natives++;}}});
 game.exports.step(cpu);const ai=new AI(memory,true,profile.capabilities),c=new Controller(memory,true),state={ready:true,driving:true,network:false,car,race};
 const frame=()=>{put(cpu+16,stack);put(stack,0x581475);game.exports.step(cpu);};
 const on=()=>{ai.update({enabled:false,safe:true,state,mode:1});frame();c.update({enabled:true,safe:true,state});};
 const step=()=>{put(cpu+4,contact);put(cpu+16,stack);put(stack,0x12345678);native.exports.step(cpu);};
 const swap=()=>{put(contact+0xc,otherbody);put(contact+0x10,body);put(pair+0x238,otherbody);put(pair+0x23c,body);};
 return {memory,d,p,car,race,body,otherbody,othercar,contact,pair,cpu,stack,put,get,byte,c,ai,state,frame,on,step,swap,natives:()=>natives,online:v=>{online=v;}};
}
test('car no-clip handles traffic, racers and parked cars for manual and AI local drivers in both orders',()=>{
 for(const driver of [1,3])for(const otherDriver of [0,1,3,4])for(const reverse of [false,true]){
  const x=fixture();x.put(x.car+0x24,driver);x.put(x.othercar+0x24,otherDriver);x.on();if(reverse)x.swap();x.step();
  assert.equal(x.natives(),0);assert.equal(x.get(x.pair+0x240),1);assert.equal(x.get(x.cpu+32),0x12345678);assert.equal(x.get(x.cpu+16),x.stack+4);
  assert.equal(x.get(x.car+0x24),driver);assert.equal(x.get(x.othercar+0x24),otherDriver);assert.equal(x.get(A+8),0);assert.equal(x.c.status().hits,1);
 }
});
test('car-only filter preserves walls, floors, ceilings, ramps and movable props',()=>{
 for(const type of [1,2,3,4,255]){const x=fixture();x.byte(x.otherbody+0x11,type);x.on();const before=Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x4000));x.step();assert.equal(x.natives(),1,`body type ${type}`);assert.equal(x.get(x.pair+0x240),0);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x4000)),before);}
});
test('car hook refuses self contact, other pairs and invalid reciprocal body identities',()=>{
 const cases=[x=>x.put(x.car+0x3c,0),x=>x.put(x.body+0x130,x.car+4),x=>x.byte(x.body+0x11,1),x=>x.put(x.otherbody+0x130,0),x=>x.put(x.othercar+0x3c,x.body),x=>x.put(x.otherbody+0x130,x.car),x=>x.put(x.contact+0xc,x.otherbody),x=>x.put(x.contact+0x14,0),x=>x.put(x.pair+0x238,x.body+4),x=>x.put(x.pair+0x23c,x.otherbody+4),x=>x.put(0x802084,3)];
 for(const setup of cases){const x=fixture();x.on();setup(x);x.step();assert.equal(x.natives(),1);assert.equal(x.get(x.pair+0x240),0);}
});
test('car hook rejects low, boundary and unsigned-wrapped pointers without traps or geometry writes',()=>{
 for(const value of [0,1,65535,0x1000000-4096,0x1000000-1,0x27fff000,0xffffffff])for(const target of ['body','otherbody','othercar','contact','pair','stack']){
  const x=fixture();x.on();if(target==='body')x.put(x.car+0x3c,value);if(target==='otherbody')x.put(x.contact+0x10,value);if(target==='othercar')x.put(x.otherbody+0x130,value);if(target==='pair')x.put(x.contact+0x14,value);
  const before=Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x5000));
  if(target==='contact'||target==='stack'){x.put(x.cpu+4,target==='contact'?value:x.contact);x.put(x.cpu+16,target==='stack'?value:x.stack);const n=new WebAssembly.Instance(hook,{env:{memory:x.memory,roam_online:()=>0,original:()=>{}}});assert.doesNotThrow(()=>n.exports.step(x.cpu));}else{x.step();assert.equal(x.natives(),1);}
  assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x5000)),before);
 }
});
test('all network modes block cars even with the separate AI online opt-in',()=>{
 for(const [a,v] of [[0x850078,8],[0x850078,0x200],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){const x=fixture();x.on();x.put(a,v);x.put(A+84,1);x.step();assert.equal(x.natives(),1);assert.equal(x.get(a),v);assert.equal(x.get(B+24),2);}
 const x=fixture();x.on();x.online(1);x.step();assert.equal(x.natives(),1);assert.equal(x.get(B+24),2);
});
test('pause, co-op, torn command, stale heartbeat and changed player/race fail closed',()=>{
 const cases=[x=>x.put(x.race,6),x=>x.put(0x8654a4,3),x=>x.put(0xd00030,2),x=>x.put(x.p+0x10,1),x=>x.put(A+48,180),x=>x.put(A+4,1),x=>x.put(B+4,1),x=>x.put(B+8,2),x=>x.put(B,0),x=>x.put(A,0),x=>x.put(A+28,0),x=>x.put(B+12,x.p+4),x=>x.put(B+16,x.car+4),x=>x.put(B+20,x.race+4),x=>x.put(x.p+4,x.car+4)];
 for(const setup of cases){const x=fixture();x.on();setup(x);x.step();assert.equal(x.natives(),1);}
});
test('off and heartbeat expiry restore original contacts without changing body flags',()=>{
 const x=fixture();x.on();x.step();assert.equal(x.c.status().hits,1);x.c.stop();const before=Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x5000));x.step();assert.equal(x.natives(),1);assert.equal(x.get(B+8),0);assert.equal(x.c.status().hits,0);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x5000)),before);assert.equal(x.get(x.cpu+16),x.stack);
 const y=fixture();y.on();for(let i=0;i<180;i++)y.frame();y.step();assert.equal(y.natives(),1);assert.equal(y.get(A+48),180);
});
test('repeated skipped car contacts never modify either car/body or unrelated mailbox',()=>{
 const x=fixture();x.on();const before=Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x4000));const walls=Buffer.from(new Uint8Array(x.memory.buffer,0xd0d180,40));for(let i=0;i<12;i++){x.put(x.pair+0x240,0);x.step();}
 assert.equal(x.c.status().hits,12);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x4000)),before);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,0xd0d180,40)),walls);
});
test('page controller requires explicit true, safe state and recognized module',()=>{
 for(const arg of [{enabled:1},{enabled:'true'},{safe:false},{state:{ready:false}},{state:{ready:true,driving:false}},{state:{ready:true,driving:true,network:true,car:0xe01000,race:0xe04000}}]){const x=fixture();x.on();x.c.update({enabled:true,safe:true,state:x.state,...arg});x.step();assert.equal(x.natives(),1);}
 const x=fixture();const c=new Controller(x.memory,false);assert.equal(c.publish(true),false);assert.equal(x.get(B),0);
});
test('controller preserves occupied foreign mailbox and refreshes views after memory growth',()=>{
 for(const [off,value]of Array.from({length:10},(_,i)=>[i*4,i===1?1:0x12345678])){const x=fixture();x.put(B+off,value);const before=Buffer.from(new Uint8Array(x.memory.buffer,B,40));assert.equal(x.c.publish(true,x.p,x.car,x.race),false);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,B,40)),before);}
 const x=fixture();x.on();x.memory.grow(1);assert.equal(x.c.update({enabled:true,safe:true,state:x.state}).requested,true);x.step();assert.equal(x.c.status().hits,1);
});
test('changing car/race identity resets old contact confirmations',()=>{const x=fixture();x.on();x.step();assert.equal(x.c.status().hits,1);x.put(0x890118,x.race+0x1000);x.put(x.race+0x1000,4);x.c.update({enabled:true,safe:true,state:{...x.state,race:x.race+0x1000}});assert.equal(x.c.status().hits,0);});

test('a command change during the online guard is rejected before collision or CPU writes',()=>{
 for(const region of [A,B]){const x=fixture();x.on();const native=new WebAssembly.Instance(hook,{env:{memory:x.memory,roam_online:()=>{x.put(region+4,x.get(region+4)+2);return 0;},original:()=>{}}});x.put(x.cpu+4,x.contact);x.put(x.cpu+16,x.stack);x.put(x.stack,0x12345678);const before=Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x7000));native.exports.step(x.cpu);assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,x.body,0x7000)),before);assert.equal(x.get(B+28),0);}
});

test('ownership loss never reports stale car activation or overwrites foreign memory',()=>{
 for(const value of [0,0x12345678]){const x=fixture();x.on();x.step();assert.equal(x.c.status().hits,1);x.put(B,value);const before=Buffer.from(new Uint8Array(x.memory.buffer,B,40));const status=x.c.status();assert.equal(status.requested,false);assert.equal(status.hits,0);assert.match(status.reason,/unavailable/);x.c.update({enabled:true,safe:true,state:x.state});assert.deepEqual(Buffer.from(new Uint8Array(x.memory.buffer,B,40)),before);x.step();assert.equal(x.natives(),1);}
 const x=fixture();x.on();x.step();x.put(B+4,x.get(B+4)|1);assert.equal(x.c.status().requested,false);assert.equal(x.c.status().hits,0);assert.match(x.c.status().reason,/complete command/);
});
