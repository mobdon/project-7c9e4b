'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {Controller,BASE:B,MAGIC}=require('../extension/walls.js');
const {Controller:AI,BASE:A,MAGIC:AM}=require('../extension/ai.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-bridge.wasm'));
const hook=new WebAssembly.Module(fs.readFileSync(__dirname+'/walls.wasm'));
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer);
 const p=0xe00000,car=0xe01000,race=0xe04000,body=0xe05000,wall=0xe06000,face=0xe07000,contact=0xe08000,pair=0xe09000,cpu=0xe0a000,stack=0xe0b000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),f=(a,v)=>d.setFloat32(a,v,true),byte=(a,v)=>d.setUint8(a,v);
 put(0xd00000,p);put(0xd00030,1);put(0x8654a4,6);put(0x850078,1);put(0x890118,race);put(race,4);put(p+4,car);put(car+0x3c,body);put(car+0x24,1);put(body+0x130,car);
 put(wall,0x7a22a8);byte(wall+0x11,3);put(wall+0x60,face);put(face+0x10,wall);f(face+0x70,1);f(face+0x74,0);f(face+0x78,0);
 put(contact+0xc,body);put(contact+0x10,wall);put(contact+0x14,pair);put(pair+0x238,body);put(pair+0x23c,wall);put(0x802084,2);
 put(cpu+16,stack);put(stack,0x581475);
 let natives=0,online=0;
 const game=new WebAssembly.Instance(bridge,{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected dyno call while unarmed');},gcall:()=>{throw Error('Wall switch must not change the driver');}}});
 const native=new WebAssembly.Instance(hook,{env:{memory,roam_online:()=>online,original:()=>{natives++;}}});
 game.exports.step(cpu);const ai=new AI(memory,true),c=new Controller(memory,true),state={ready:true,driving:true,network:false,car,race};
 const frame=()=>{put(cpu+16,stack);put(stack,0x581475);game.exports.step(cpu);};
 const on=()=>{ai.update({enabled:false,safe:true,state,mode:1});frame();c.update({enabled:true,safe:true,state});};
 const step=()=>{put(cpu+4,contact);put(cpu+16,stack);put(stack,0x12345678);native.exports.step(cpu);};
 const swap=()=>{put(contact+0xc,wall);put(contact+0x10,body);put(pair+0x238,wall);put(pair+0x23c,body);};
 return {memory,d,p,car,race,body,wall,face,contact,pair,cpu,stack,put,get,f,byte,c,ai,state,frame,on,step,swap,natives:()=>natives,online:v=>{online=v;}};
}
test('wall-only setting works with manual and AI drivers without enabling AI',()=>{
 for(const driver of [1,3])for(const swap of [false,true]){
  const x=fixture();x.put(x.car+0x24,driver);x.on();if(swap)x.swap();x.step();
  assert.equal(x.natives(),0);assert.equal(x.get(x.pair+0x240),1);assert.equal(x.get(x.cpu+32),0x12345678);assert.equal(x.get(x.cpu+16),x.stack+4);
  assert.equal(x.get(x.car+0x24),driver);assert.equal(x.get(A+8),0);assert.equal(x.c.status().hits,1);
 }
});
test('ground, ceilings and slopes retain the original contact path',()=>{
 for(const z of [0.1,-0.1,0.2,-0.5,0.7071,0.9,1,-1]){
  const x=fixture();x.f(x.face+0x70,Math.sqrt(1-z*z));x.f(x.face+0x78,z);x.on();x.step();assert.equal(x.natives(),1,`z ${z}`);assert.equal(x.get(x.pair+0x240),0);assert.equal(x.c.status().hits,0);
 }
});
test('near-vertical static sides match the native wall threshold',()=>{
 for(const z of [0,-0,0.099,-0.099]){const x=fixture();x.f(x.face+0x70,Math.sqrt(1-z*z));x.f(x.face+0x78,z);x.on();x.step();assert.equal(x.natives(),0);}
});
test('other cars and movable props keep their original collisions',()=>{
 for(const type of [0,1,2,4,255]){const x=fixture();x.byte(x.wall+0x11,type);x.on();x.step();assert.equal(x.natives(),1);}
 const x=fixture();x.on();x.put(x.contact+0xc,0xe10000);x.step();assert.equal(x.natives(),1,'another car against a wall is untouched');
});
test('wall hook refuses malformed pointers, faces and pair identities',()=>{
 const cases=[x=>x.put(x.car+0x3c,0),x=>x.put(x.body+0x130,x.car+4),x=>x.byte(x.body+0x11,1),x=>x.put(x.wall,0x7a2208),x=>x.byte(x.wall+0x12,1),x=>x.put(x.wall+0x60,0),x=>x.put(x.face+0x10,x.wall+4),x=>x.put(x.contact+0x14,0),x=>x.put(x.pair+0x238,x.body+4),x=>x.put(x.pair+0x23c,x.wall+4),x=>x.put(0x802084,3)];
 for(const setup of cases){const x=fixture();x.on();setup(x);x.step();assert.equal(x.natives(),1);assert.equal(x.get(x.pair+0x240),0);}
 for(const normal of [[0,0,0],[2,0,0],[NaN,0,0],[Infinity,0,0],[1,NaN,0],[1,0,NaN],[1,0,Infinity]]){
  const x=fixture();x.on();normal.forEach((v,i)=>x.f(x.face+0x70+4*i,v));x.step();assert.equal(x.natives(),1);
 }
});
test('every native network condition blocks walls regardless of AI online permission',()=>{
 for(const [a,v] of [[0x850078,8],[0x850078,0x200],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
  const x=fixture();x.on();x.put(a,v);x.put(A+84,1);x.step();assert.equal(x.natives(),1);assert.equal(x.get(a),v);assert.equal(x.get(B+24),2);
 }
 const x=fixture();x.on();x.online(1);x.step();assert.equal(x.natives(),1);assert.equal(x.get(B+24),2);
});
test('pause, co-op, stale heartbeat, torn commands and car/race changes fail closed',()=>{
 const cases=[x=>x.put(x.race,6),x=>x.put(0x8654a4,3),x=>x.put(0xd00030,2),x=>x.put(x.p+0x10,1),x=>x.put(A+48,180),x=>x.put(A+4,1),x=>x.put(B+4,1),x=>x.put(B+8,2),x=>x.put(B,0),x=>x.put(A,0),x=>x.put(A+28,0),x=>x.put(B+12,x.p+4),x=>x.put(B+16,x.car+4),x=>x.put(B+20,x.race+4),x=>x.put(x.p+4,x.car+4)];
 for(const setup of cases){const x=fixture();x.on();setup(x);x.step();assert.equal(x.natives(),1);}
});
test('switch off and heartbeat expiry restore the untouched native path',()=>{
 const x=fixture();x.on();x.step();assert.equal(x.c.status().hits,1);x.c.stop();x.step();assert.equal(x.natives(),1);assert.equal(x.get(B+8),0);assert.equal(x.c.status().hits,0);
 const y=fixture();y.on();for(let i=0;i<180;i++)y.frame();y.step();assert.equal(y.natives(),1);assert.equal(y.get(A+48),180);
});
test('off path preserves all caller registers, geometry and collision memory',()=>{
 const x=fixture();x.on();x.c.stop();const before=Buffer.from(Buffer.from(x.memory.buffer,x.body,0x5000));x.step();assert.equal(x.natives(),1);assert.deepEqual(Buffer.from(x.memory.buffer,x.body,0x5000),before);
 assert.equal(x.get(x.cpu+16),x.stack);assert.equal(x.get(x.cpu+4),x.contact);
});
test('repeated passes do not accumulate body or map changes',()=>{
 const x=fixture();x.on();const before=Buffer.from(Buffer.from(x.memory.buffer,x.body,0x4000));for(let i=0;i<12;i++){x.put(x.pair+0x240,0);x.step();}
 assert.equal(x.c.status().hits,12);assert.deepEqual(Buffer.from(x.memory.buffer,x.body,0x4000),before);assert.equal(x.get(x.pair+0x240),1);
});
test('page controller needs explicit true, safe solo driving and matching car',()=>{
 for(const arg of [{enabled:1},{enabled:'true'},{safe:false},{state:{ready:false}},{state:{ready:true,driving:false}},{state:{ready:true,driving:true,network:true,car:0xe01000,race:0xe04000}}]){
  const x=fixture();x.on();x.c.update({enabled:true,safe:true,state:x.state,...arg});x.step();assert.equal(x.natives(),1);
 }
 const x=fixture();const c=new Controller(x.memory,false);assert.equal(c.publish(true),false);assert.equal(x.get(B),0);
});
test('controller refreshes memory views after growth',()=>{const x=fixture();x.on();x.memory.grow(1);assert.equal(x.c.update({enabled:true,safe:true,state:x.state}).requested,true);x.step();assert.equal(x.c.status().hits,1);});
