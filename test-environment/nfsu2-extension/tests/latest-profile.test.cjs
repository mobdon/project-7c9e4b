'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {Controller,BASE:B,MAGIC,patchBytes}=require('../extension/ai.js');
const profile=require('../extension/latest-profile.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-latest-bridge.wasm'));
function fixture({occupied=false,occupiedAddress=null,actionId=null,invalidConfig=false,selectorFallback=false,physicsFail=false,badDriver=false}={}){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),calls=[];
 const p=0xe00000,car=0xe01000,race=0xe04000,rec=0xe05000,cpu=0xe08000,stack=0xe09000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true);
 put(cpu+16,stack);put(stack,0x581475);put(0x8654a4,6);put(0xd00000,p);put(0xd00030,1);put(p+4,car);put(p+556,2);put(p+560,2);put(rec+4,1);put(car+0x24,1);put(car+0x14,rec);put(car+0x28,1);d.setUint8(car+0x5c0,1);put(0x890118,race);put(race,4);d.setUint8(rec+0x901,4);
 if(occupied)put(B+48,0x12345678);if(occupiedAddress!==null)put(occupiedAddress,0x12345678);
 let fail=false;
 const inst=new WebAssembly.Instance(bridge,{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected unarmed dyno call');},gcall:(c,fn,thisP,n,args)=>{calls.push({c,fn,thisP,n,arg:n?get(args):null});if(fn===0x605c70){if(get(p+556)===4 && get(args)!==4){put(car+36,1);put(car+40,1);}put(p+556,get(args));}if((fn===0x5fae20 || (fn===0x605c70&&get(args)===4))&&!fail){put(car+0x24,3);put(car+0x28,3);const driver=0xe0a000,action=0xe0c000;put(car+44,driver);put(driver,badDriver?0:0x785370);put(driver+4,car);put(driver+1760,invalidConfig?0:0xe0d000);put(driver+1788,actionId===null?0:action);put(action,actionId===2?0x7847d0:actionId===3?0x784830:0x700000);put(action+20,actionId);}if(fn===0x42c060){const action=get(thisP+1788);put(action,selectorFallback?0x700000:0x7847d0);put(action+20,selectorFallback?1:2);}if(fn===0x5faf10){put(car+0x24,1);put(car+0x28,1);}if(fn===0x5f46a0&&!physicsFail)put(thisP+0x28,get(args));}}});
 const step=()=>inst.exports.step(cpu);step();
 const c=new Controller(memory,true,profile.capabilities),s={ready:true,driving:true,network:false,car,race};
 const on=()=>c.update({enabled:true,safe:true,state:s,mode:2,pace:1.5,cornerAssist:true,allowDragAI:true});
 return {memory,d,p,car,race,rec,cpu,stack,put,get,calls,c,s,step,on,fail:()=>fail=true};
}
test('latest native prefix acquires only local human driver, sets skill9 and returns control',()=>{
 const f=fixture();f.on();f.step();assert.equal(f.c.status().active,true);assert.equal(f.d.getUint8(f.rec+0x901),9);assert.equal(f.calls[0].fn,0x5fae20);f.c.stop();f.step();assert.equal(f.c.status().manual,true);assert.equal(f.d.getUint8(f.rec+0x901),4);assert.deepEqual(f.calls.map(x=>x.fn),[0x5fae20,0x5faf10,0x605c70]);
});
test('latest AI heartbeat expiration safely hands back',()=>{const f=fixture();f.on();f.step();for(let i=0;i<180;i++)f.step();assert.equal(f.c.status().manual,true);assert.equal(f.c.status().active,false);});
test('latest full profile publishes its verified options without modifying mailbox gaps',()=>{
 const f=fixture(),bytes=new Uint8Array(f.memory.buffer),ranges=[[B+104,B+128],[B+168,B+256],[B+320,B+512],[B+1024,B+1040]];
 for(const [start,end]of ranges)bytes.fill(0x5a,start,end);const before=ranges.map(([a,b])=>Buffer.from(bytes.subarray(a,b)));f.on();f.step();assert.equal(f.get(B+60),150);assert.equal(f.get(B+88),1);f.c.stop();f.step();ranges.forEach(([a,b],i)=>assert.deepEqual(Buffer.from(bytes.subarray(a,b)),before[i]));
});
test('initialization refuses an occupied wall, car, corner or dyno command region before any handshake',()=>{
 for(const address of [B+92,B+96,B+100,0xd0d184,0xd0d1c4,0xd0d204,0xd0d22c,0xd0d23c,0xd0d30c]){const f=fixture({occupiedAddress:address});const before=Buffer.from(f.memory.buffer);f.on();f.step();assert.equal(f.get(B+28),0);assert.equal(f.get(0xd0d320),0);assert.equal(f.calls.length,0);assert.deepEqual(Buffer.from(f.memory.buffer),before);}
});
test('latest AI refuses an occupied mailbox instead of overwriting it',()=>{const f=fixture({occupied:true});const before=Buffer.from(f.memory.buffer);f.on();f.step();assert.equal(f.get(B+28),0);assert.equal(f.calls.length,0);assert.deepEqual(Buffer.from(f.memory.buffer),before);});
test('latest AI still requires exact caller, driving state and solo/explicit network permission',()=>{
 for(const change of [f=>f.put(f.stack,0x5814e0),f=>f.put(0x8654a4,3),f=>f.put(f.race,3),f=>f.put(0xd00030,2),f=>f.put(0x850078,8),f=>f.put(0x866a14,1),f=>f.put(0x8669f4,1),f=>f.d.setUint8(0x89cf69,1)]){const f=fixture();f.on();change(f);f.step();assert.equal(f.calls.length,0);}
});
test('latest AI failure latches and never commandeers a foreign AI driver',()=>{
 const f=fixture();f.fail();f.on();f.step();for(let i=0;i<5;i++){f.on();f.step();}assert.equal(f.calls.length,1);assert.equal(f.d.getUint8(f.rec+0x901),4);
 const g=fixture();g.put(g.car+0x24,3);g.on();g.step();g.c.stop();g.step();assert.equal(g.calls.length,0);
});
function parse(bytes){let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0;};const sections=[],functions=[];while(p<bytes.length){const id=bytes[p++],len=u(),start=p,end=p+len;sections.push({id,bytes:bytes.subarray(start,end)});if(id===10){const n=u();for(let i=0;i<n;i++){const len=u();functions.push(bytes.subarray(p,p+len));p+=len;}}p=end;}return {sections,functions};}
test('latest exact module compiles, preserves every other function and section, rejects corruption',async()=>{
 const bytes=fs.readFileSync(__dirname+'/../research/compatibility-78e2bb69/game.wasm'),before=Buffer.from(bytes),out=await patchBytes(bytes);assert.equal(WebAssembly.validate(out),true);await WebAssembly.compile(out);assert.deepEqual(bytes,before);
 const a=parse(bytes),b=parse(out);assert.equal(a.functions.length,b.functions.length);const changed=[];for(let i=0;i<a.functions.length;i++)if(!Buffer.from(a.functions[i]).equals(Buffer.from(b.functions[i])))changed.push(i+37);assert.deepEqual(changed,[2459,3174,4497,4653,7395,8871,17404,19197,19277,21213,21263,22470]);
 assert.equal(a.sections.length,b.sections.length);for(let i=0;i<a.sections.length;i++){assert.equal(a.sections[i].id,b.sections[i].id);if(a.sections[i].id!==10)assert.deepEqual(Buffer.from(a.sections[i].bytes),Buffer.from(b.sections[i].bytes));}
 const bad=Buffer.from(bytes);bad[100]^=1;await assert.rejects(patchBytes(bad),/module changed/);assert.equal(bytes.length,profile.size);
});
test('loader marks only successfully patched exact modules and preserves original fallback',async()=>{
 const vm=require('node:vm'),raw=fs.readFileSync(__dirname+'/../research/compatibility-78e2bb69/game.wasm'),fallback={original:true},seen=[];
 const context={location:{origin:'https://nfsu2.xyz'},crypto:globalThis.crypto,Uint8Array,ArrayBuffer,DataView,Atomics,Int32Array,WeakMap,WeakSet,console,URL,WebAssembly:{compile:WebAssembly.compile,compileStreaming:async response=>{seen.push(response);return fallback;}}};
 context.globalThis=context;vm.runInNewContext(fs.readFileSync(__dirname+'/../extension/latest-profile.js','utf8'),context);vm.runInNewContext(fs.readFileSync(__dirname+'/../extension/ai.js','utf8'),context);context.__NFSU2_AI__.install();
 const response=b=>({url:'https://nfsu2.xyz/game.wasm?v=33uTC7KT_9-XXwc12T4Hl9',clone:()=>({arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)})});
 const module=await context.WebAssembly.compileStreaming(response(raw));assert.equal(context.__NFSU2_AI__.getModuleProfile(module).revision,'78e2bb69');assert.equal(context.__NFSU2_AI__.getModuleProfile(module).capabilities.dyno,true);
 const corrupt=Buffer.from(raw);corrupt[100]^=1;const originalResponse=response(corrupt);assert.equal(await context.WebAssembly.compileStreaming(originalResponse),fallback);assert.equal(seen[0],originalResponse);assert.equal(context.__NFSU2_AI__.getModuleProfile(fallback),null);
});

test('an interrupted first wall publish cannot freeze active AI watchdog or handback',()=>{
 const f=fixture();f.on();f.step();assert.equal(f.c.status().active,true);f.put(0xd0d184,1);for(let i=0;i<180;i++)f.step();assert.equal(f.c.status().active,false);assert.equal(f.c.status().manual,true);assert.equal(f.d.getUint8(f.rec+0x901),4);
});
test('an occupied ancillary region after attachment cannot prevent explicit AI stop',()=>{
 for(const address of [B+92,B+96,B+100,0xd0d184,0xd0d1c4,0xd0d208,0xd0d348]){const f=fixture();f.on();f.step();f.put(address,0x12345678);f.c.stop();f.step();assert.equal(f.c.status().active,false);assert.equal(f.c.status().manual,true);}
});

test('foreign dyno ownership after attachment is preserved without blocking AI stop',()=>{
 const f=fixture();f.on();f.step();f.put(0xd0d320,0x12345678);const before=Buffer.from(new Uint8Array(f.memory.buffer,0xd0d300,512));f.c.stop();f.step();assert.equal(f.c.status().manual,true);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,0xd0d300,512)),before);
});
test('foreign corner ownership cannot be overwritten by an AI command publisher',()=>{
 const f=fixture();f.put(0xd0d200,0x12345678);const before=Buffer.from(new Uint8Array(f.memory.buffer,0xd0d200,36));f.on();f.step();assert.equal(f.c.status().active,true);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,0xd0d200,36)),before);f.c.stop();f.step();assert.equal(f.c.status().manual,true);
});
test('wall publisher rejects a foreign marker and an interrupted first publish',()=>{
 const Walls=require('../extension/walls.js');for(const [off,value]of [[0,0x12345678],[4,1]]){const f=fixture();f.put(0xd0d180+off,value);const before=Buffer.from(new Uint8Array(f.memory.buffer,0xd0d180,40)),c=new Walls.Controller(f.memory,true,profile.wall);c.publish(true,f.p,f.car,f.race);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,0xd0d180,40)),before);}
});

test('one-shot acquired action3 upgrade; NULL, opponent2 and temporary11 are never overwritten',()=>{
 for(const actionId of [null,2,3,11,6]){const f=fixture({actionId});f.d.setUint8(0x89e7d8,1);f.s.drag=true;f.on();f.step();const calls=f.calls.filter(x=>x.fn===0x42c060);assert.equal(calls.length,actionId===3?1:0);assert.equal(f.c.status().opponentDragSelected,actionId===2||actionId===3);assert.equal(f.get(f.rec+4),1);for(let i=0;i<3;i++){f.on();f.step();}assert.equal(f.calls.filter(x=>x.fn===0x42c060).length,calls.length);f.c.stop();f.step();assert.equal(f.c.status().manual,true);}
});
test('invalid config is not passed to native initialization and fallback is never reported as opponent selection',()=>{
 for(const opts of [{invalidConfig:true},{selectorFallback:true}]){const f=fixture({actionId:3,...opts});f.d.setUint8(0x89e7d8,1);f.s.drag=true;f.on();f.step();assert.equal(f.calls.filter(x=>x.fn===0x42c060).length,opts.invalidConfig?0:1);assert.equal(f.c.status().opponentDragSelected,false);assert.match(f.c.status().reason,/pending/);f.c.stop();f.step();assert.equal(f.c.status().manual,true);}
});

test('normal player drift uses native physics1 for all exact predicate flags and preserves identity/skill bounds',()=>{
 for(const flag of [0x89e7d9,0x890104,0x890114]){const f=fixture();f.put(f.rec+4,1);if(flag===0x89e7d9)f.d.setUint8(flag,1);else f.put(flag,1);f.on();f.step();assert.equal(f.get(f.car+40),1);assert.equal(f.c.status().active,true);assert.equal(f.c.status().driftPhysicsRequired,true);assert.match(f.c.status().reason,/drift driver and physics 1 confirmed/);assert.equal(f.get(f.rec+4),1);assert.equal(f.d.getUint8(f.rec+0x900),0);assert.equal(f.d.getUint8(f.rec+0x901),9);assert.deepEqual(f.calls.map(x=>x.fn),[0x5fae20,0x5f46a0]);f.c.stop();f.step();assert.equal(f.c.status().manual,true);assert.equal(f.d.getUint8(f.rec+0x901),4);}
});
test('drift predicate obeys drag precedence and excludes marked/non-player records',()=>{
 for(const change of [f=>f.put(0x890108,1),f=>f.d.setUint8(f.rec+0x900,1),f=>f.put(f.rec+4,2),f=>f.put(f.rec+4,3)]){const f=fixture();f.put(f.rec+4,1);f.d.setUint8(0x89e7d9,1);change(f);f.on();f.step();assert.equal(f.calls.filter(x=>x.fn===0x5f46a0).length,0);assert.equal(f.get(f.car+40),3);assert.equal(f.c.status().driftPhysicsRequired,false);}
 const f=fixture();f.put(f.rec+4,1);f.d.setUint8(0x89e7d9,1);f.d.setUint8(0x89e7d8,1);f.s.drag=true;f.on();f.step();assert.equal(f.calls.filter(x=>x.fn===0x5f46a0).length,1);assert.equal(f.c.status().driftPhysicsRequired,false);assert.equal(f.get(f.car+40),1);
});
test('failed drift physics or invalid native driver rolls back through normal Off and restores skill',()=>{
 for(const opts of [{physicsFail:true},{badDriver:true}]){const f=fixture(opts);f.put(f.rec+4,1);f.d.setUint8(0x89e7d9,1);f.on();f.step();assert.equal(f.c.status().active,false);assert.equal(f.c.status().manual,true);assert.equal(f.c.status().status,'failed');assert.equal(f.d.getUint8(f.rec+0x901),4);assert.equal(f.get(f.rec+4),1);assert.equal(f.calls.filter(x=>x.fn===0x5faf10).length,1);assert.equal(f.calls.filter(x=>x.fn===0x5f46a0).length,opts.badDriver?0:1);}
});
test('drift requires full live physics, releases replaced physics, and obeys network permission withdrawal',()=>{
 const f=fixture();f.put(f.rec+4,1);f.d.setUint8(0x89e7d9,1);f.put(f.car+40,3);f.on();f.step();assert.equal(f.calls.length,0);f.put(f.car+40,1);f.on();f.step();assert.equal(f.c.status().active,true);f.put(f.car+40,3);assert.equal(f.c.status().active,false);f.step();assert.equal(f.c.status().manual,true);
 const g=fixture();g.put(g.rec+4,1);g.d.setUint8(0x89e7d9,1);g.put(0x850078,8);g.s.network=true;g.c.update({enabled:true,safe:true,state:g.s,mode:2,allowNetwork:true});g.step();assert.equal(g.c.status().active,true);g.c.update({enabled:true,safe:true,state:g.s,mode:2,allowNetwork:false});g.step();assert.equal(g.c.status().manual,true);
});
test('road to drift to drag to road performs full native handback and preserves CPU/stack',()=>{
 const f=fixture();f.put(f.rec+4,1);const cpu=Buffer.from(new Uint8Array(f.memory.buffer,f.cpu,256)),stack=Buffer.from(new Uint8Array(f.memory.buffer,f.stack,256));
 f.on();f.step();assert.equal(f.get(f.car+40),3);
 for(const mode of ['drift','drag','road']){
  f.d.setUint8(0x89e7d9,mode==='drift'?1:0);f.d.setUint8(0x89e7d8,mode==='drag'?1:0);f.s.drag=mode==='drag';
  assert.equal(f.on().switching,true);assert.equal(f.get(B+8),0);f.step();assert.equal(f.c.status().manual,true);assert.equal(f.c.status().owned,false);f.on();f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(f.car+40),mode==='road'?3:1);assert.equal(f.get(f.rec+4),1);
 }
 assert.equal(f.calls.filter(x=>x.fn===0x5fae20).length,3);assert.equal(f.calls.filter(x=>x.fn===0x5faf10).length,2);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,f.cpu,256)),cpu);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,f.stack,256)),stack);
});

 test('manual drag2 handback is recognized across mode flags without accepting foreign/scripted control',()=>{
  const f=fixture();f.put(f.car+36,2);f.put(f.p+556,3);f.put(f.p+560,3);
  for(const drag of [0,1]){f.d.setUint8(0x89e7d8,drag);assert.equal(f.c.status().manual,true);}
  for(const mutate of [()=>f.put(f.rec+4,2),()=>f.put(f.p+560,5),()=>f.put(f.p+556,4)]){
   f.put(f.rec+4,1);f.put(f.p+560,3);f.put(f.p+556,3);mutate();assert.equal(f.c.status().manual,false);
  }
 });
 test('native input ownership changes are not reported as active before the bridge hands back',()=>{
  const f=fixture();f.d.setUint8(0x89e7d8,1);f.s.drag=true;f.on();f.step();assert.equal(f.c.status().active,true);
  f.put(f.p+560,2);assert.equal(f.c.status().active,false);f.step();assert.equal(f.c.status().owned,false);assert.equal(f.d.getUint8(f.rec+0x901),4);
  for(let i=0;i<3;i++){f.on();f.step();assert.equal(f.c.status().active,false);}f.c.stop();f.step();f.on();f.step();assert.equal(f.c.status().active,true);
 });

 test('external native mode change reports an explicit retry instead of waiting for GO',()=>{
  const f=fixture();f.d.setUint8(0x89e7d8,1);f.s.drag=true;f.on();f.step();assert.equal(f.c.status().active,true);
  f.put(f.p+560,2);f.on();f.step();const s=f.c.status();assert.equal(s.active,false);assert.equal(s.controlModeRetry,true);assert.equal(s.status,'retry');assert.match(s.reason,/Turn Automatic AI off, then on/);
  for(let i=0;i<3;i++){f.on();f.step();assert.equal(f.c.status().controlModeRetry,true);}
  f.c.stop();f.step();assert.equal(f.c.status().controlModeRetry,false);f.on();f.step();assert.equal(f.c.status().active,true);
 });
 test('retry status requires this car, an active request, native code0 and no owner',()=>{
  const f=fixture();f.on();f.put(B+72,f.car);assert.equal(f.c.status().controlModeRetry,true);
  for(const [offset,value]of [[72,0],[72,f.car+16],[8,0],[8,3],[52,3],[36,f.car]]){const old=f.get(B+offset);f.put(B+offset,value);assert.equal(f.c.status().controlModeRetry,false);f.put(B+offset,old);}
  f.put(f.p+4,0);f.put(B+72,0);assert.equal(f.c.status().controlModeRetry,false);
 });
