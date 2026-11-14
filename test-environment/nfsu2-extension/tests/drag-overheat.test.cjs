'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {readPinned,bodies}=require('../tools/latest-native-utils.cjs'),AI=require('../extension/ai.js');
const config=require('../tools/drag-overheat.json'),M=0x3749414e,B=0xd0d100;
const mod=new WebAssembly.Module(fs.readFileSync(require.resolve('./drag-overheat-prefix.wasm')));
function locals(b){let p=0;const u=()=>{let n=0,s=0,x;do{x=b[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0};const ts=[];for(let n=u();n--;){const count=u(),t=b[p++];for(let i=0;i<count;i++)ts.push(t);}return {end:p,types:ts};}
function fixture(pages=256,cpu=0xe00000){
 const memory=new WebAssembly.Memory({initial:pages,maximum:65536,shared:true}),d=new DataView(memory.buffer),put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),flt=(a,v)=>d.setFloat32(a,v,true),player=0xe02000,car=0xe04000,race=0xe06000,record=0xe08000,physics=0xe0a000,motor=0xe0c000;
 const run=new WebAssembly.Instance(mod,{env:{memory}}).exports.run,f={memory,d,put,get,flt,cpu,player,car,race,record,physics,motor,run:()=>run(cpu)};
 if(!pages)return f;
 for(const [a,v]of [[B,M],[B+28,M],[B+4,2],[B+100,1],[B+12,player],[B+16,car],[B+20,race],[0xd00000,player],[0xd00030,1],[0x8654a4,6],[0x890118,race],[race,4],[player+4,car],[car+20,record],[record+4,1],[car+40,1],[car+52,physics],[physics+72,motor],[cpu+4,motor]])put(a,v);
 d.setUint8(0x89e7d8,1);flt(motor+140,.8);return f;
}
for(const version of ['latest','next'])test(version+' overheat prefix preserves every original native instruction/local',()=>{
 const profile=require('../extension/'+version+'-profile.js'),old=bodies(readPinned(version)).get(config.index),out=Buffer.from(AI.patchDragOverheatBody(old,profile.dragOverheat)),a=locals(old),b=locals(out);
 assert.equal(profile.capabilities.nativeDragOverheat,true);assert.deepEqual(b.types.slice(0,a.types.length),a.types);assert.equal(b.types.length-a.types.length,8);assert.deepEqual(out.subarray(b.end+config.prefix.length),old.subarray(a.end));
 assert.throws(()=>AI.patchDragOverheatBody(old.subarray(1),config),/layout changed/);const bad=Buffer.from(old);bad[2]=126;assert.throws(()=>AI.patchDragOverheatBody(bad,config),/layout changed/);
});
test('legacy profiles do not receive overheat writes',()=>{assert.equal(require('../extension/current-profile.js').capabilities.nativeDragOverheat,undefined);});
test('only the active owned player engine heat field changes',()=>{
 const f=fixture(),before=Buffer.from(new Uint8Array(f.memory.buffer));f.run();assert.equal(f.d.getFloat32(f.motor+140,true),-1);before.writeFloatLE(-1,f.motor+140);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 for(const kind of [1,2,3]){f.put(f.car+36,kind);f.flt(f.motor+140,.9);f.run();assert.equal(f.d.getFloat32(f.motor+140,true),-1,'manual and AI both supported');}
});
const rejects=[['OFF',f=>f.put(B+100,0)],['invalid flag',f=>f.put(B+100,2)],['command magic',f=>f.put(B,0)],['bridge marker',f=>f.put(B+28,0)],['odd epoch',f=>f.put(B+4,3)],['stale heartbeat',f=>f.put(B+48,180)],['menu',f=>f.put(0x8654a4,3)],['multiple players',f=>f.put(0xd00030,2)],['not drag',f=>f.d.setUint8(0x89e7d8,0)],['forced drag only',f=>{f.d.setUint8(0x89e7d8,0);f.put(0x890108,1);}],['paused player',f=>f.put(f.player+16,1)],['wrong player',f=>f.put(B+12,0)],['wrong car',f=>f.put(B+16,0)],['wrong race',f=>f.put(B+20,0)],['countdown',f=>f.put(f.race,3)],['finished',f=>f.put(f.race,6)],['not full physics',f=>f.put(f.car+40,3)],['opponent record',f=>f.put(f.record+4,2)],['scripted record',f=>f.d.setUint8(f.record+2304,1)],['opponent engine',f=>f.put(f.cpu+4,f.motor+1000)],['network flag',f=>f.put(0x850078,8)],['host',f=>f.put(0x866a14,1)],['client',f=>f.put(0x8669f4,1)],['online',f=>f.d.setUint8(0x89cf69,1)],['already blown',f=>f.flt(f.motor+140,2)],['invalid heat',f=>f.flt(f.motor+140,NaN)]];
for(const [name,change]of rejects)test('overheat rejects '+name+' without writes',()=>{const f=fixture();change(f);f.put(B+84,['network flag','host','client','online'].includes(name)?0:1);const before=Buffer.from(new Uint8Array(f.memory.buffer));f.run();assert.deepEqual(Buffer.from(f.memory.buffer),before);});
test('guard rejects pointer and short-memory cases without traps/writes',()=>{
 fixture(0).run();
 for(const where of [0xd00000,0x890118,'car','record','physics','motor','cpu'])for(const value of [0,65535,0xe02001,0x1000000,0xffffffff]){
  const f=fixture();if(where==='cpu'){const run=new WebAssembly.Instance(mod,{env:{memory:f.memory}}).exports.run;const before=Buffer.from(new Uint8Array(f.memory.buffer));run(value);assert.deepEqual(Buffer.from(f.memory.buffer),before);continue;}
  f.put(typeof where==='number'?where:({car:f.player+4,record:f.car+20,physics:f.car+52,motor:f.physics+72})[where],value);const before=Buffer.from(new Uint8Array(f.memory.buffer));f.run();assert.deepEqual(Buffer.from(f.memory.buffer),before);
 }
});
test('controller publishes independent flag with same epoch and clears on all unsafe transitions',()=>{
 const f=fixture(),capabilities=require('../extension/next-profile.js').capabilities,c=new AI.Controller(f.memory,true,capabilities),state={ready:true,car:f.car,race:f.race,driving:true,drag:true,network:false};
 c.update({enabled:false,safe:true,state,mode:1,dragNoBlowout:true});assert.equal(f.get(B+100),1);assert.equal(f.get(B+8),0);assert.equal(f.get(B+4)%2,0);assert.equal(f.get(B+16),f.car);
 for(const overrides of [{safe:false},{state:{...state,drag:false}},{state:{...state,network:true}},{state:{...state,network:true},allowNetwork:"true"},{state:{...state,driving:false}},{state:null},{dragNoBlowout:false}]){c.update({enabled:false,safe:true,state,mode:1,dragNoBlowout:true,...overrides});assert.equal(f.get(B+100),0);}
 c.update({safe:true,state,dragNoBlowout:true});assert.equal(f.get(B+100),1);c.stop();assert.equal(f.get(B+100),0);
});


test('runtime CPU may be above guest heap; full CPU state bounds still fail closed',()=>{
 const f=fixture(11000,0x28010000),cpuBefore=Uint8Array.from(new Uint8Array(f.memory.buffer,f.cpu,344));f.run();assert.equal(f.d.getFloat32(f.motor+140,true),-1);assert.deepEqual(new Uint8Array(f.memory.buffer,f.cpu,344),cpuBefore);
 const run=new WebAssembly.Instance(mod,{env:{memory:f.memory}}).exports.run;
 for(const bad of [f.memory.buffer.byteLength-340,f.memory.buffer.byteLength-4,0xfffffffc,0x28010001]){f.flt(f.motor+140,.8);if(bad+8<=f.memory.buffer.byteLength&&bad%4===0)f.put(bad+4,f.motor);run(bad);assert.ok(Math.abs(f.d.getFloat32(f.motor+140,true)-.8)<1e-6);}
 const higher=0x2a010000;f.put(higher+4,f.motor);run(higher);assert.equal(f.d.getFloat32(f.motor+140,true),-1);
});


test('online heat protection requires literal opt-in and never relaxes current-engine ownership',()=>{
 for(const [address,value] of [[0x850078,8],[0x850078,512],[0x850078,520],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]])for(const permission of [0,1,2,0xffffffff]){
  const f=fixture();f.put(address,value);f.put(B+84,permission);f.run();assert.equal(f.d.getFloat32(f.motor+140,true),permission===1?-1:Math.fround(.8));
 }
 for(const [,change]of rejects.filter(([name])=>!['network flag','host','client','online'].includes(name))){const f=fixture();f.put(0x850078,8);f.put(B+84,1);change(f);const before=Buffer.from(new Uint8Array(f.memory.buffer));f.run();assert.deepEqual(Buffer.from(f.memory.buffer),before);}
 const f=fixture(),c=new AI.Controller(f.memory,true,require('../extension/next-profile.js').capabilities),state={ready:true,car:f.car,race:f.race,driving:true,drag:true,network:true};
 c.update({enabled:false,safe:true,state,mode:1,dragNoBlowout:true,allowNetwork:true});assert.equal(f.get(B+100),1);assert.equal(f.get(B+84),1);assert.equal(f.get(B+8),0);c.update({safe:true,state,dragNoBlowout:true,allowNetwork:false});assert.equal(f.get(B+100),0);assert.equal(f.get(B+84),0);
});
