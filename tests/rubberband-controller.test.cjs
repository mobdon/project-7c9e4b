'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Controller,MAX_ACK_AGE_MS,MAX_PERCENT}=require('../extension/rubberband-controller.js');
const HASH='a'.repeat(64),CAR=0x20000;
function fixture(){
  const states=new WeakMap(),calls=[];
  const state=memory=>{if(!states.has(memory))states.set(memory,{command:0,ack:null,publication:0,foreign:false,error:null});return states.get(memory);};
  const protocol={
    supports:hash=>hash===HASH,select:hash=>hash===HASH?{mailbox:{base:0xd0d100}}:null,
    claim(memory){const s=state(memory);if(s.error==='claim')throw Error();return !s.foreign;},
    command(memory,{enabled,percent,stackingReady,forceGeneration}){
      const s=state(memory);if(s.error==='command')throw Error();
      const low=percent|(enabled?256:0)|(stackingReady?512:0);
      if((s.command&65535)!==low||!(s.command>>>16)||forceGeneration)s.command=(((((s.command>>>16)%65535)+1)<<16)|low)>>>0;
      calls.push({memory,enabled,percent,stackingReady,forceGeneration,command:s.command});return s.command;
    },
    readAck(memory){const s=state(memory);if(s.error==='read')throw Error();return s.ack?.command===s.command?s.ack:null;}
  };
  const memory=new WebAssembly.Memory({initial:1,maximum:4,shared:true}),moduleIdentity={};
  const c=new Controller(memory,{installed:true,verified:true,moduleHash:HASH,moduleIdentity,protocol});
  const f={memory,moduleIdentity,c,protocol,state,calls,now:0};
  f.poll=(extra={})=>{f.now+=16;return c.update({enabled:true,safe:true,ordinaryRace:true,allowNetwork:false,network:false,
    aiState:{active:true,owned:true},currentCar:CAR,percent:125,selectedPace:1.25,featureOwnsPace:true,
    customPower:1,customGrip:1,now:f.now,...extra});};
  f.emit=(extra={},memory=f.memory)=>{const s=state(memory),enabled=!!(s.command&256);s.publication=(s.publication+1)%32768;
    s.ack={command:s.command,percent:enabled?s.command&255:100,car:CAR,publisher:1,reason:enabled?1:2,publication:s.publication,...extra};return s.ack;};
  f.apply=()=>{f.poll();f.emit();f.poll();f.emit();return f.poll();};
  return f;
}
test('a historical matching receipt establishes a baseline, not live application',()=>{
  const f=fixture();f.poll();f.emit();assert.equal(f.poll().active,false);
  const active=f.emit();let s=f.poll();assert.equal(s.active,true);assert.equal(s.appliedPercent,125);assert.equal(s.publication,active.publication);
  const frozen=s;assert(Object.isFrozen(frozen));
  s=f.poll({now:f.now+MAX_ACK_AGE_MS});assert.equal(s.active,true);
  s=f.poll({now:f.now+MAX_ACK_AGE_MS+1});assert.equal(s.active,false);assert.equal(s.appliedPercent,null);
});
test('unchanged acknowledgements expire and a long polling gap cannot redate old evidence',()=>{
  const f=fixture();assert(f.apply().active);
  for(let i=0;i<70;i++)f.poll();assert.equal(f.c.status().active,false);assert.equal(f.c.status().reason,'ack-expired');
  const command=f.state(f.memory).command;f.emit();const s=f.poll({now:f.now+MAX_ACK_AGE_MS+20});
  assert.equal(s.active,false);assert.notEqual(f.state(f.memory).command,command);
});
test('status can independently expire evidence in the caller clock domain',()=>{
  const f=fixture();assert(f.apply().active);assert.equal(f.c.status(f.now+MAX_ACK_AGE_MS+1).active,false);
  assert.equal(f.c.status(NaN).active,false);assert.equal(f.c.status(f.now-1).active,false);
});
test('stop forces one Off generation, never reports reset from the request, and polls while disabled',()=>{
  const f=fixture();assert(f.apply().active);const active=f.state(f.memory).command;
  let s=f.c.stop({now:++f.now});const off=f.state(f.memory).command;
  assert.notEqual(off,active);assert.equal(off&255,100);assert.equal(off&256,0);
  assert.equal(s.state,'reset-pending');assert.equal(s.resetAcknowledged,false);assert.equal(s.appliedPercent,null);
  f.c.stop({now:++f.now});assert.equal(f.state(f.memory).command,off);
  s=f.poll({enabled:true});assert.equal(s.commandEnabled,false,'stop latch blocks a still-checked switch');assert.equal(s.resetPending,true);
  f.emit();s=f.poll({enabled:false});assert.equal(s.state,'off');assert.equal(s.resetAcknowledged,true);assert.equal(s.appliedPercent,100);
  s=f.poll({enabled:true});assert.equal(s.commandEnabled,true,'an actual Off/On cycle releases stop');assert.equal(s.active,false);
});
test('Off remains pending across no publication, wrong car and stale receipts',()=>{
  const f=fixture();f.apply();f.c.stop({now:++f.now});const command=f.state(f.memory).command;
  for(let i=0;i<4;i++)assert.equal(f.poll({enabled:false}).resetAcknowledged,false);
  f.emit({car:CAR+4});assert.equal(f.poll({enabled:false}).resetAcknowledged,false);
  f.emit();assert.equal(f.poll({enabled:false}).resetAcknowledged,true);
  for(let i=0;i<70;i++)f.poll({enabled:false});assert.equal(f.c.status().state,'reset-pending');
  assert.equal(f.state(f.memory).command,command,'disabled polling does not churn commands');
});
test('manual and pause gates send Off without demanding AI ownership to acknowledge reset',()=>{
  for(const blocked of [{safe:false},{ordinaryRace:false},{aiState:{active:false,owned:false}}]){
    const f=fixture();f.apply();let s=f.poll(blocked);assert.equal(s.state,'reset-pending');assert.equal(s.commandEnabled,false);
    f.emit();s=f.poll(blocked);assert.equal(s.resetAcknowledged,true);assert.equal(s.active,false);
  }
});
test('literal network permission and ordinary owned AI are required',()=>{
  for(const extra of [{ordinaryRace:false},{safe:1},{network:'false'},{network:true,allowNetwork:false},{network:true,allowNetwork:1},
    {aiState:null},{aiState:{active:true,owned:1}},{aiState:{active:false,owned:true}}]){
    const f=fixture(),s=f.poll(extra);assert.equal(s.commandEnabled,false);assert.equal(f.calls.at(-1).enabled,false);
  }
  const f=fixture();assert.equal(f.poll({network:true,allowNetwork:true}).commandEnabled,true);
});
test('no custom power, grip, unlimited boost or unowned pace can stack',()=>{
  for(const extra of [{customPower:1.01},{customPower:true},{customGrip:2},{customGrip:undefined},{customBoost:true},{customUnlimit:true},
    {boost:true},{unlimit:true},{grip:true},{customBoost:1},{selectedPace:1.2501},{selectedPace:'1.25'},{featureOwnsPace:1},{featureOwnsPace:false}]){
    const f=fixture(),s=f.poll(extra);assert.equal(s.commandEnabled,false);assert.equal(s.reason,'stacking-not-neutral');assert.equal(f.calls.at(-1).stackingReady,false);
  }
  const f=fixture();assert.equal(f.poll({customBoost:false,customUnlimit:false,boost:false,unlimit:false,grip:false}).commandEnabled,true);
});
test('percent, selected pace and strict request types fail closed',()=>{
  for(const percent of [99,151,100.1,NaN,Infinity,'125',null]){
    const f=fixture(),s=f.poll({percent});assert.equal(s.commandEnabled,false);assert.equal(s.reason,'invalid-percent');
  }
  for(const enabled of [1,'true',null]){const f=fixture();assert.equal(f.poll({enabled}).commandEnabled,false);}
  const f=fixture();for(const input of [null,[],1,'true'])assert.doesNotThrow(()=>{const s=f.c.update(input);assert.equal(s.active,false);assert.equal(s.commandEnabled,false);});
});
test('changing memory never writes the previous memory and requires new evidence',()=>{
  const f=fixture();assert(f.apply().active);const previous=f.state(f.memory).command,count=f.calls.length;
  const other=new WebAssembly.Memory({initial:1,maximum:4,shared:true});let s=f.poll({memory:other});
  assert.equal(s.active,false);assert.equal(f.state(f.memory).command,previous);assert(f.calls.slice(count).every(c=>c.memory===other));
  f.emit({},other);s=f.poll({memory:other});assert.equal(s.active,false);f.emit({},other);assert(f.poll({memory:other}).active);
});
test('shared memory growth invalidates old receipt views and advances command generation',()=>{
  const f=fixture();assert(f.apply().active);const old=f.state(f.memory).command,oldBuffer=f.memory.buffer;
  f.memory.grow(1);assert.notEqual(f.memory.buffer,oldBuffer);const s=f.poll();assert.equal(s.active,false);assert.notEqual(f.state(f.memory).command,old);
});
test('current-car and module identity changes cannot inherit application status',()=>{
  for(const extra of [{currentCar:CAR+4},{moduleIdentity:{}},{moduleHash:'b'.repeat(64)},{verified:false},{installed:false}]){
    const f=fixture();f.apply();const old=f.state(f.memory).command,s=f.poll(extra);assert.equal(s.active,false);assert.equal(s.appliedPercent,null);
    if(extra.moduleHash||extra.verified===false||extra.installed===false)assert.equal(f.state(f.memory).command,old,'unverified module receives no write');
  }
});
test('missing identities, unsupported protocols and nonshared memory do not write',()=>{
  for(const extra of [{moduleIdentity:null},{moduleIdentity:''},{moduleHash:'unknown'},{memory:{buffer:new ArrayBuffer(65536)}},{protocol:{}}]){
    const f=fixture(),s=f.poll(extra);assert.equal(s.active,false);assert.equal(f.calls.length,0);
  }
});
test('foreign mailbox and exceptions never reuse prior active status',()=>{
  const foreign=fixture();foreign.state(foreign.memory).foreign=true;const s=foreign.poll();assert.equal(s.reason,'foreign-mailbox');assert.equal(foreign.calls.length,0);
  for(const error of ['claim','command','read']){const f=fixture();f.apply();f.state(f.memory).error=error;const status=f.poll();assert.equal(status.active,false);assert.equal(status.state,'protocol-error');assert.equal(status.resetAcknowledged,false);}
  for(const name of ['supports','select']){const f=fixture();f.protocol[name]=()=>{throw Error();};assert.equal(f.poll().state,'protocol-error');}
});
test('invalid and backwards clocks send Off and cannot refresh receipts',()=>{
  for(const now of [NaN,Infinity,-1,'123',Number.MAX_SAFE_INTEGER+1,0]){
    const f=fixture();f.apply();const s=f.poll({now});assert.equal(s.active,false);assert.equal(s.commandEnabled,false);assert.equal(s.reason,'invalid-time');
  }
  const f=fixture();f.apply();f.poll({now:NaN});f.emit();assert.equal(f.poll().active,false,'new clock epoch requires a new On command');
});
test('publication wrap advances normally; rollback and ambiguous jumps lose freshness',()=>{
  const f=fixture();f.poll();f.state(f.memory).publication=32766;f.emit();f.poll();f.emit();assert(f.poll().active,'32767 to0 is a forward publication');
  f.emit({publication:32767});assert.equal(f.poll().active,false,'backward publication is a new baseline');
  f.emit({publication:16383});assert.equal(f.poll().active,false,'half-cycle ambiguity is not advancement');
});
test('generation wrap and old same-command acknowledgement cannot bootstrap active',()=>{
  const f=fixture();const s=f.state(f.memory);s.command=((65535<<16)|893)>>>0;
  s.ack={command:((1<<16)|893)>>>0,percent:125,car:CAR,publisher:1,reason:1,publication:77};s.publication=77;
  let status=f.poll();assert.equal(s.command>>>16,1);assert.equal(status.active,false);assert.equal(status.publication,77);
  f.emit();status=f.poll();assert.equal(status.active,true);
});
test('coherent guarded-native100 is distinct from Off acknowledgement',()=>{
  const f=fixture();f.poll();f.emit({reason:3,percent:100});f.poll();f.emit({reason:3,percent:100});const s=f.poll();
  assert.equal(s.state,'guarded-native');assert.equal(s.active,false);assert.equal(s.appliedPercent,100);assert.equal(s.resetAcknowledged,false);
});
test('malformed or mismatched acknowledgements invalidate live evidence',()=>{
  for(const extra of [{car:CAR+4},{publisher:2},{publication:NaN},{publication:32768},{reason:4},{percent:124},{reason:3,percent:125},{command:0}]){
    const f=fixture();f.apply();f.emit(extra);const s=f.poll();assert.equal(s.active,false);assert.equal(s.appliedPercent,null);assert.equal(s.resetAcknowledged,false);
  }
});
test('a missing receipt and later unchanged historical return require another native publication',()=>{
  const f=fixture();f.apply();const ack=f.state(f.memory).ack;f.state(f.memory).ack=null;assert.equal(f.poll().active,false);
  f.state(f.memory).ack=ack;assert.equal(f.poll().active,false);f.emit();assert(f.poll().active);
});
test('the bounded150 ceiling requires exact paired pace and fresh actual publication',()=>{
  assert.equal(MAX_PERCENT,150);const f=fixture();
  assert.equal(f.poll({percent:150,selectedPace:1.5}).commandEnabled,true);
  f.emit();assert.equal(f.poll({percent:150,selectedPace:1.5}).active,false);
  f.emit();let s=f.poll({percent:150,selectedPace:1.5});assert.equal(s.active,true);assert.equal(s.appliedPercent,150);
  s=f.poll({percent:150,selectedPace:1.49});assert.equal(s.commandEnabled,false);assert.equal(s.reason,'stacking-not-neutral');assert.equal(s.resetAcknowledged,false);
});
