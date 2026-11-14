'use strict';
// Private, default-off six-word mailbox. No game or extension integration.
const assert=require('node:assert/strict');
const BASE=0xd0d100,MAGIC=0x36414252,CLAIMING=0x36434252;
const O=Object.freeze({magic:232,command:236,ack:240,percent:244,car:248,status:252});
const REASON=Object.freeze({applied:1,off:2,guardedNative:3});
function words(memory){assert(memory.buffer instanceof SharedArrayBuffer);assert(memory.buffer.byteLength>=BASE+256);return new Uint32Array(memory.buffer,BASE,64);}
function claim(memory){const w=words(memory),at=O.magic/4;if(Atomics.load(w,at)===MAGIC)return true;for(const off of Object.values(O))if(Atomics.load(w,off/4)!==0)return false;if(Atomics.compareExchange(w,at,0,CLAIMING)!==0)return false;for(const off of Object.values(O)){if(off===O.magic)continue;if(Atomics.load(w,off/4)!==0){Atomics.compareExchange(w,at,CLAIMING,0);return false;}}return Atomics.compareExchange(w,at,CLAIMING,MAGIC)===CLAIMING;}
function decode(command){return{generation:command>>>16,percent:command&255,enabled:!!(command&256),stackingReady:!!(command&512)};}
function command(memory,{enabled=false,percent=100,stackingReady=false,forceGeneration=false}={}){
 assert.equal(typeof enabled,'boolean');assert.equal(typeof stackingReady,'boolean');assert.equal(typeof forceGeneration,'boolean');assert(Number.isInteger(percent)&&percent>=100&&percent<=150);if(!enabled)percent=100;
 assert(claim(memory),'Foreign physics mailbox occupancy');const w=words(memory),old=Atomics.load(w,O.command/4),low=percent|(enabled?256:0)|(stackingReady?512:0);if((old&65535)===low&&(old>>>16)&&!forceGeneration)return old;
 const generation=((old>>>16)%65535)+1,next=((generation<<16)|low)>>>0;Atomics.store(w,O.command/4,next);return next;
}
// Coherent historical snapshot only. A client must separately require a recent
// advancing publication counter and compare car with its current native graph.
function readAck(memory){const w=words(memory),first=Atomics.load(w,O.status/4),ack1=Atomics.load(w,O.ack/4),percent=Atomics.load(w,O.percent/4),car=Atomics.load(w,O.car/4),ack2=Atomics.load(w,O.ack/4),last=Atomics.load(w,O.status/4),current=Atomics.load(w,O.command/4),request=decode(current),publisher=last&255,reason=(last>>>8)&255;if(Atomics.load(w,O.magic/4)!==MAGIC||first!==last||((last>>>16)&1)||ack1!==ack2||ack2!==current||!request.generation||(current&0xfc00)||request.percent<100||request.percent>150||(!request.enabled&&request.percent!==100)||publisher!==1||![1,2,3].includes(reason)||percent<100||percent>150||car<65536||car>=0x28000000||(car&3))return null;if(reason===REASON.applied&&(!request.enabled||!request.stackingReady||percent!==request.percent))return null;if(reason!==REASON.applied&&percent!==100)return null;if((reason===REASON.off)!==!request.enabled)return null;return{command:ack2,percent,car,publisher,reason,publication:(last>>>16)>>>1};}
module.exports={BASE,MAGIC,CLAIMING,O,REASON,words,claim,command,decode,readAck};
