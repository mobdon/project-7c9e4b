'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Engine,A,automaticNosRefill}=require('../extension/core.js'),{create}=require('../extension/diagnostics.js');
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:300,shared:true}),e=new Engine(memory),d=new DataView(memory.buffer),player=0xe00000,car=0xe01000,race=0xe04000;
 const put=(a,v)=>d.setUint32(a,v,true);
 for(const[a,v]of [[A.FLOW,6],[A.MODE,1],[A.PLAYER,player],[player+4,car],[A.RACE,race],[race,4],[car+A.GEAR,3],[car+A.NOS_FULL,20000],[car+A.NOS_LEFT,500],[car+A.NOS_SINCE,90000],[A.TICKS,100000],[A.NETWORK_TICKS,140000]])put(a,v);
 d.setFloat32(car+A.RPM,6000,true);e.refresh();
 return {memory,e,d,put,player,car,race};
}
const cases=[
 ['offline',{},false],['online byte',{online:1},true],['online non-one byte',{online:255},true],['LAN client',{client:1},true],['LAN host',{host:2},true],
 ['mode bit 8 only',{mode:8},false],['mode bit 512 only',{mode:512},false],['negative client',{client:0xffffffff},false],['negative host',{host:0x80000000},false],
 ['negative client and positive host',{client:0xffffffff,host:1},true],['online and negative host',{online:1,host:0xffffffff},true]
];
for(const[name,flags,network]of cases)test('NOS clock follows exact native selector: '+name,()=>{
 const f=fixture();if(flags.mode!==undefined)f.put(A.MODE,flags.mode);if(flags.online!==undefined)f.d.setUint8(A.ONLINE,flags.online);if(flags.client!==undefined)f.put(A.CLIENT,flags.client);if(flags.host!==undefined)f.put(A.HOST,flags.host);
 const before=Buffer.from(new Uint8Array(f.memory.buffer));assert.equal(f.e.nosNetworkClock(),network);assert.equal(f.e.refill(f.e.state(),true),false);assert.equal(f.e.u32(f.car+A.NOS_SINCE),90000);assert.equal(f.e.u32(f.car+A.NOS_LEFT),500);
 assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before,'disabled refill must preserve all game memory');
});
for(const permission of [false,undefined,1,'true',true])test('disabled refill ignores network permission: '+permission,()=>{const f=fixture();f.d.setUint8(A.ONLINE,1);const before=Buffer.from(new Uint8Array(f.memory.buffer));assert.equal(f.e.refill(f.e.state(),permission),false);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);});
for(const since of [0,0x7fffffff])test('disabled refill preserves inactive/sentinel NOS '+since,()=>{const f=fixture();f.d.setUint8(A.ONLINE,1);f.put(f.car+A.NOS_SINCE,since);const before=Buffer.from(new Uint8Array(f.memory.buffer));assert.equal(f.e.refill(f.e.state(),true),false);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);});
for(const clock of [0,0x7fffffff])test('disabled refill preserves invalid clock '+clock,()=>{const f=fixture();f.d.setUint8(A.ONLINE,1);f.put(A.NETWORK_TICKS,clock);const before=Buffer.from(new Uint8Array(f.memory.buffer));assert.equal(f.e.refill(f.e.state(),true),false);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);});
test('disabled refill never reads state, clocks or memory and cannot be overridden',()=>{
 const f=fixture(),before=Buffer.from(new Uint8Array(f.memory.buffer));
 for(const method of ['refresh','state','live','u32','u8','nosNetworkClock'])f.e[method]=()=>{throw Error('Unexpected '+method+' read');};
 const stale=new Proxy({},{get(){throw Error('Unexpected stale state read');}});
 assert.equal(f.e.refill(stale,true,{available:true,enabled:true}),false);
 assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);
});
test('disabled refill is safe without an Engine receiver or attached memory',()=>{
 assert.equal(Engine.prototype.refill.call(null),false);
 assert.equal(new Engine(null).refill({ready:true},true),false);
});
test('automatic refill availability is permanently false and explicitly unavailable',()=>{
 assert.equal(automaticNosRefill.available,false);assert.equal(Object.isFrozen(automaticNosRefill),true);assert.match(automaticNosRefill.status,/Refill unavailable/);
 assert.throws(()=>{automaticNosRefill.available=true;},TypeError);assert.equal(automaticNosRefill.available,false);
});
test('read-only pre-refill NOS sample preserves exact clocks and resource evidence without pointers',()=>{
 const f=fixture();f.d.setUint8(A.ONLINE,1);const before=Buffer.from(new Uint8Array(f.memory.buffer)),s=f.e.nosDiagnostics(f.e.state(),true);
 assert.deepEqual(s,{nosTelemetry:true,nosClockNetwork:true,nosClockTicks:140000,nosSinceTicks:90000,nosTimestampActive:true,nosFullTicks:20000,nosRemainingTicks:500,nosElapsedTicks:50000});assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);
 const log=create();log.record('state',{...s,car:f.car,clockAddress:A.NETWORK_TICKS,raw:'SECRET'});assert.deepEqual(JSON.parse(log.exportText()).events.at(-1).data,s);
});
test('NOS sample is exact-profile gated and drops stale context',()=>{const f=fixture(),s=f.e.state();assert.deepEqual(f.e.nosDiagnostics(s),{});assert.deepEqual(f.e.nosDiagnostics(s,false),{});f.put(f.player+4,0);assert.deepEqual(f.e.nosDiagnostics(s,true),{});});
test('NOS sample rejects changing stamp and clock domain',()=>{
 for(const domain of [false,true]){const f=fixture(),read=f.e.u32.bind(f.e);let changed=false;f.e.u32=p=>{const v=read(p);if(p===f.car+A.NOS_LEFT&&!changed){changed=true;if(domain)f.d.setUint8(A.ONLINE,1);else f.put(f.car+A.NOS_SINCE,0);}return v;};assert.deepEqual(f.e.nosDiagnostics(f.e.state(),true),{});assert.equal(changed,true);}
});
test('NOS sample omits malformed resource, distinguishes sentinel, handles growth',()=>{const f=fixture();f.put(f.car+A.NOS_FULL,0x7fffffff);f.put(f.car+A.NOS_LEFT,10000000);f.put(f.car+A.NOS_SINCE,0x7fffffff);let s=f.e.nosDiagnostics(f.e.state(),true);assert.equal(s.nosTimestampActive,false);for(const k of ['nosElapsedTicks','nosFullTicks','nosRemainingTicks'])assert.equal(k in s,false);f.memory.grow(1);assert.equal(f.e.nosDiagnostics(f.e.state(),true).nosSinceTicks,0x7fffffff);});
test('moving NOS fields do not flood storage; sampled on/off changes remain prompt',()=>{
 let now=1000;const log=create({clock:()=>now});log.snapshot({nativeTelemetry:true,nosTelemetry:true,nosTimestampActive:true,nosClockTicks:1000,nosSinceTicks:900,nosRemainingTicks:20000,nosElapsedTicks:100});const n=log.status().events;
 for(let i=1;i<=10;i++){now+=100;log.snapshot({nativeTelemetry:true,nosTelemetry:true,nosTimestampActive:true,nosClockTicks:1000+i,nosSinceTicks:900+i,nosRemainingTicks:20000-i,nosElapsedTicks:100+i});}assert.equal(log.status().events,n);
 now+=250;log.snapshot({nativeTelemetry:true,nosTelemetry:true,nosTimestampActive:false,nosClockTicks:2000,nosSinceTicks:0});assert.equal(log.status().events,n+1);
});
test('NOS diagnostic schema rejects non-scalars, nonfinite and out-of-range data',()=>{const log=create();log.record('state',{nosTelemetry:'true',nosClockNetwork:1,nosTimestampActive:'yes',nosClockTicks:Infinity,nosSinceTicks:-1,nosElapsedTicks:4294967296,nosFullTicks:10000000,nosRemainingTicks:{secret:1}});assert.deepEqual(JSON.parse(log.exportText()).events.at(-1).data,{});});
