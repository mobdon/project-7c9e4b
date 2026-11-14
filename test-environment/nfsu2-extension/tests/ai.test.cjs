const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {Controller,BASE:B,MAGIC,patchBytes}=require('../extension/ai.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-bridge.wasm'));
function fixture(probeModule=null){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),calls=[];
 const p=0xe00000,car=0xe01000,race=0xe04000,rec=0xe05000,cpu=0xe08000,stack=0xe09000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true);
 put(cpu+16,stack);put(stack,0x581475);put(0x8654a4,6);put(0xd00000,p);put(0xd00030,1);put(p+4,car);put(p+556,2);put(p+560,2);put(rec+4,1);put(car+0x24,1);put(car+0x14,rec);put(car+0x28,1);d.setUint8(car+0x5c0,1);put(0x890118,race);put(race,4);d.setUint8(rec+0x901,4);
 let fail=false,failPhysics=false,probe=()=>{};
 const inst=new WebAssembly.Instance(probeModule||bridge,{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected dyno call while unarmed');},probe:()=>probe(),gcall:(c,fn,thisP,n,args)=>{calls.push({c,fn,thisP,n,arg:n?get(args):null});if(fn===0x605c70){if(get(p+556)===4 && get(args)!==4){put(car+36,1);put(car+40,1);}put(p+556,get(args));}if((fn===0x5fae20 || (fn===0x605c70&&get(args)===4)) && !fail){put(car+0x24,3);put(car+0x28,3);put(car+44,0xe0a000);put(0xe0a000,0x785370);put(0xe0a004,car);}if(fn===0x5faf10){put(car+0x24,1);put(car+0x28,1);}if(fn===0x5f46a0 && !failPhysics)put(thisP+0x28,get(args));}}});
 const step=()=>inst.exports.step(cpu);step();
 const c=new Controller(memory,true),s={ready:true,driving:true,network:false,car,race};
 const on=(mode=1)=>c.update({enabled:true,safe:true,state:s,mode});
 return {memory,d,p,car,race,rec,cpu,stack,put,get,calls,c,s,step,on,fail:()=>fail=true,succeed:()=>fail=false,setProbe:fn=>probe=fn,failPhysics:()=>failPhysics=true};
}
test('native bridge uses real On, player-only level9 and confirmed driver state',()=>{
 const f=fixture();assert.equal(f.c.status().active,false);f.on();f.step();assert.equal(f.calls[0].fn,0x5fae20);assert.equal(f.calls[0].thisP,f.p);assert.equal(f.calls[0].n,0);assert.equal(f.d.getUint8(f.rec+0x901),9);assert.equal(f.c.status().active,true);assert.equal(f.c.status().level,9);
 f.on();f.step();assert.equal(f.calls.length,1,'does not recreate driver every tick');
});
test('OFF calls native Off plus SetInputMode2 and restores original skill',()=>{
 const f=fixture();f.on();f.step();f.c.stop();f.step();assert.deepEqual(f.calls.map(c=>c.fn),[0x5fae20,0x5faf10,0x605c70]);assert.equal(f.calls[2].arg,2);assert.equal(f.d.getUint8(f.rec+0x901),4);assert.equal(f.c.status().active,false);
});
test('the same native driver can be requested in solo free roam',()=>{
 const f=fixture();f.on(2);f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(B+8),2);
});
test('game-thread guards block network, split screen, menus, stale identities and invalid pointers',()=>{
 for(const setup of [f=>f.put(0x850078,8),f=>f.put(0x866a14,1),f=>f.put(0x8669f4,1),f=>f.d.setUint8(0x89cf69,1),f=>f.put(0xd00030,2),f=>f.put(f.race,6),f=>f.put(0x8654a4,3),f=>f.put(0xd00000,0),f=>f.put(f.p+4,0),f=>f.put(B+20,f.race+4)]){
  const f=fixture();f.on();setup(f);f.step();assert.equal(f.calls.length,0);
 }
});
test('bridge runs only at the documented main-loop return site',()=>{
 const f=fixture();f.on();f.put(f.stack,0x5814e0);f.step();assert.equal(f.calls.length,0);
});
test('failed native handoff is reported and not retried every frame',()=>{
 const f=fixture();f.fail();f.on();f.step();assert.equal(f.c.status().status,'failed');assert.equal(f.d.getUint8(f.rec+0x901),4);for(let i=0;i<10;i++){f.on();f.step();}assert.equal(f.calls.length,1);f.c.stop();f.step();f.on();f.step();assert.equal(f.calls.length,2);
});
test('page heartbeat failure returns control within 180 game frames',()=>{
 const f=fixture();f.on();f.step();for(let i=0;i<180;i++)f.step();assert.equal(f.c.status().active,false);assert.equal(f.calls.at(-1).fn,0x605c70);
});
test('interrupted request writer also expires instead of stranding AI',()=>{
 const f=fixture();f.on();f.step();f.put(B+4,f.get(B+4)|1);for(let i=0;i<180;i++)f.step();assert.equal(f.c.status().active,false);assert.equal(f.calls.at(-1).arg,2);
});
test('new car transition never writes or dispatches through the old car',()=>{
 const f=fixture();f.on();f.step();f.put(f.p+4,0xe10000);f.step();assert.equal(f.calls.length,1);assert.equal(f.get(B+36),0);assert.equal(f.d.getUint8(f.rec+0x901),9,'freed object is deliberately not restored');
});
test('existing native/cutscene AI is not commandeered or turned off',()=>{
 const f=fixture();f.put(f.car+0x24,3);f.on();f.step();f.c.stop();f.step();assert.equal(f.calls.length,0);assert.equal(f.get(f.car+0x24),3);
});
test('foreign skill changes and special skill sentinels are preserved',()=>{
 let f=fixture();f.on();f.step();f.d.setUint8(f.rec+0x901,7);f.c.stop();f.step();assert.equal(f.d.getUint8(f.rec+0x901),7);
 for(const value of [254,255]){f=fixture();f.d.setUint8(f.rec+0x901,value);f.on();f.step();assert.equal(f.d.getUint8(f.rec+0x901),value);f.c.stop();f.step();assert.equal(f.d.getUint8(f.rec+0x901),value);}
});
test('bad/unpatched bridge does not write memory',()=>{
 const f=fixture(),c=new Controller(f.memory,false),before=Buffer.from(Buffer.from(f.memory.buffer));c.update({enabled:true,safe:true,state:f.s,mode:1});assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.equal(c.status().available,false);
});
test('page wrapper rejects unavailable modes and unsafe state',()=>{
 for(const spec of [{enabled:false},{safe:false},{mode:0},{mode:3},{state:{ready:false}}]){const f=fixture();f.c.update({enabled:true,safe:true,state:f.s,mode:1,...spec});f.step();assert.equal(f.calls.length,0);}
});
test('patcher refuses unknown binary before changing it',async()=>{await assert.rejects(patchBytes(Uint8Array.from([0,97,115,109])),/size changed/);});
const wasmPath=__dirname+'/../research/game.wasm';
test('exact served game module is valid after the four-function patch',{skip:!fs.existsSync(wasmPath)},async()=>{
 const original=fs.readFileSync(wasmPath),after=await patchBytes(original);assert.equal(WebAssembly.validate(after),true);await WebAssembly.compile(after);assert.equal(original.length,37839055);const bad=Buffer.from(original);bad[100]^=1;await assert.rejects(patchBytes(bad),/module changed/);
});
test('native AI is explicitly unsupported in drag rather than fighting manual drag controls',()=>{
 const f=fixture();f.d.setUint8(0x89e7d8,1);f.on();f.step();assert.equal(f.calls.length,0);assert.equal(f.c.status().status,'unsupported');assert.equal(f.c.status().dragUnsupported,true);assert.match(f.c.status().reason,/Enable Automatic AI driver/);
 const g=fixture();g.s.drag=true;g.on();g.step();assert.equal(g.calls.length,0,'page guard refuses drag even before native guard sees it');
});
test('entering drag returns owned AI to manual input and restores skill before synthetic assist',()=>{
 const f=fixture();f.on();f.step();assert.equal(f.c.status().owned,true);f.d.setUint8(0x89e7d8,1);f.step();assert.equal(f.c.status().owned,false);assert.equal(f.c.status().manual,true);assert.equal(f.d.getUint8(f.rec+0x901),4);assert.deepEqual(f.calls.map(x=>x.fn),[0x5fae20,0x5faf10,0x605c70]);assert.equal(f.calls.at(-1).arg,2);
});

test('native online opt-in permits local AI for all network flags without changing them',()=>{
 for(const [address,value] of [[0x850078,8],[0x850078,0x200],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
  const f=fixture();f.put(address,value);f.s.network=true;
  f.c.update({enabled:true,safe:true,state:f.s,mode:1,allowNetwork:true});f.step();
  assert.equal(f.c.status().active,true);assert.equal(f.get(address),value);assert.equal(f.get(B+84),1);assert.equal(f.s.network,true);
  f.c.update({enabled:true,safe:true,state:f.s,mode:1,allowNetwork:false});f.step();assert.equal(f.c.status().active,false);assert.equal(f.c.status().manual,true);assert.equal(f.d.getUint8(f.rec+0x901),4);assert.equal(f.get(B+84),0);
 }
});
test('online native opt-in requires exactly true or command flag one and retains other guards',()=>{
 for(const value of [false,undefined,1,'true']) {const f=fixture();f.put(0x850078,8);f.s.network=true;f.c.update({enabled:true,safe:true,state:f.s,mode:1,allowNetwork:value});f.step();assert.equal(f.calls.length,0);assert.equal(f.get(B+84),0);}
 for(const value of [0,2,0xffffffff]) {const f=fixture();f.on();f.put(0x850078,8);f.put(B+84,value);f.step();assert.equal(f.calls.length,0);}
 for(const setup of [f=>f.put(0xd00030,2),f=>f.put(f.race,6),f=>f.put(0x8654a4,3),f=>f.d.setUint8(0x89e7d8,1),f=>f.put(f.p+4,0)]){
  const f=fixture();f.put(0x850078,8);f.s.network=true;f.c.update({enabled:true,safe:true,state:f.s,mode:1,allowNetwork:true});setup(f);f.step();assert.equal(f.calls.length,0);
 }
});
test('online AI manual stop clears opt-in and stale heartbeat still hands back',()=>{
 for(const stop of [true,false]){const f=fixture();f.put(0x850078,8);f.s.network=true;f.c.update({enabled:true,safe:true,state:f.s,mode:1,allowNetwork:true});f.step();assert.equal(f.c.status().active,true);
  if(stop){f.c.stop();assert.equal(f.get(B+84),0);f.step();}else for(let i=0;i<180;i++)f.step();
  assert.equal(f.c.status().active,false);assert.equal(f.c.status().manual,true);assert.equal(f.calls.at(-1).fn,0x605c70);
 }
});

function requestDrag(f,extra={}){f.s.drag=true;f.d.setUint8(0x89e7d8,1);return f.c.update({enabled:true,safe:true,state:f.s,mode:1,allowDragAI:true,...extra});}
test('experimental drag handoff uses player On then car physics1 and confirms both',()=>{
 const f=fixture();requestDrag(f);f.step();
 assert.deepEqual(f.calls.map(x=>x.fn),[f.c.capabilities.nativeDragInputHandoff?0x605c70:0x5fae20,0x5f46a0]);assert.equal(f.calls[0].thisP,f.p);assert.equal(f.calls[1].thisP,f.car);assert.equal(f.calls[1].n,1);assert.equal(f.calls[1].arg,1);
 assert.equal(f.get(f.car+0x24),3);assert.equal(f.get(f.car+0x28),1);assert.equal(f.c.status().active,true);assert.equal(f.c.status().dragExperimental,true);assert.equal(f.c.status().paceApplied,null);
 for(let i=0;i<10;i++){requestDrag(f);f.step();}assert.equal(f.calls.length,2);
 f.c.stop();f.step();assert.deepEqual(f.calls.slice(f.c.capabilities.nativeDragInputHandoff?-1:-2).map(x=>x.fn),f.c.capabilities.nativeDragInputHandoff?[0x605c70]:[0x5faf10,0x605c70]);assert.equal(f.calls.at(-1).arg,2);assert.equal(f.get(f.car+0x24),1);assert.equal(f.get(f.car+0x28),1);assert.equal(f.d.getUint8(f.rec+0x901),4);assert.equal(f.get(B+88),0);
});
test('drag AI requires literal page permission and exact native command flag',()=>{
 for(const allowDragAI of [false,undefined,1,'true']){const f=fixture();requestDrag(f,{allowDragAI});f.step();assert.equal(f.calls.length,0);assert.equal(f.get(B+88),0);}
 for(const value of [0,2,0xffffffff]){const f=fixture();requestDrag(f);f.put(B+88,value);f.step();assert.equal(f.calls.length,0);}
});
test('drag AI is off with old protocol and waits for GO plus known full physics',()=>{
 for(const setup of [f=>f.put(f.race,3),f=>f.put(f.race,6),f=>f.put(f.car+0x28,3),f=>f.d.setUint8(f.car+0x5c0,0),f=>f.put(B,0x3549414e)]){const f=fixture();requestDrag(f);setup(f);f.step();assert.equal(f.calls.length,0);}
});
test('failed drag physics correction immediately returns manual control and restores skill',()=>{
 const f=fixture();f.failPhysics();requestDrag(f);f.step();assert.deepEqual(f.calls.map(x=>x.fn),f.c.capabilities.nativeDragInputHandoff?[0x605c70,0x5f46a0,0x605c70]:[0x5fae20,0x5f46a0,0x5faf10,0x605c70]);assert.equal(f.get(f.car+0x24),1);assert.equal(f.get(f.car+0x28),1);assert.equal(f.c.status().owned,false);assert.equal(f.c.status().active,false);assert.equal(f.c.status().status,'failed');assert.equal(f.d.getUint8(f.rec+0x901),4);
 for(let i=0;i<5;i++){requestDrag(f);f.step();}assert.equal(f.calls.length,f.c.capabilities.nativeDragInputHandoff?3:4,'failed correction is not retried each frame');
});
test('drag guards release AI on opt-out, pause, physics replacement and expired heartbeat',()=>{
 for(const stop of ['optout','pause','physics','heartbeat']){
  const f=fixture();requestDrag(f);f.step();assert(f.c.status().active);
  if(stop==='optout')requestDrag(f,{allowDragAI:false});if(stop==='pause')f.put(f.race,6);if(stop==='physics')f.put(f.car+0x28,3);
  for(let i=0;i<(stop==='heartbeat'?180:1);i++)f.step();assert.equal(f.c.status().active,false);assert.equal(f.c.status().owned,false);assert.equal(f.get(f.car+0x24),1);assert.equal(f.get(f.car+0x28),1);assert.equal(f.calls.at(-1).arg,2);
 }
});
test('drag does not commandeer a foreign AI and never restores a replaced car',()=>{
 let f=fixture();f.put(f.car+0x24,3);requestDrag(f);f.step();assert.equal(f.calls.length,0);
 f=fixture();requestDrag(f);f.step();f.put(f.p+4,0xe10000);f.step();assert.equal(f.calls.length,2);assert.equal(f.c.status().owned,false);
});
test('drag and online permissions are independent and retain all native guards',()=>{
 for(const allowNetwork of [false,true]){const f=fixture();f.put(0x850078,8);f.s.network=true;requestDrag(f,{allowNetwork});f.step();assert.equal(f.c.status().active,allowNetwork);assert.equal(f.get(0x850078),8);}
});
test('drag status does not claim level9 for preserved special skills',()=>{
 const f=fixture();f.d.setUint8(f.rec+0x901,255);requestDrag(f);f.step();assert.equal(f.c.status().level,255);assert.doesNotMatch(f.c.status().reason,/level 9/);f.c.stop();f.step();assert.equal(f.d.getUint8(f.rec+0x901),255);
});


test('bridge bounds every guest pointer against actual memory size',()=>{
 for(const setup of [
  (f,bad)=>f.put(0xd00000,bad),
  (f,bad)=>f.put(f.p+4,bad),
  (f,bad)=>f.put(0x890118,bad),
  (f,bad)=>f.put(f.car+0x14,bad)
 ]){
  const f=fixture();requestDrag(f);setup(f,f.memory.buffer.byteLength+0x1000);
  assert.doesNotThrow(()=>f.step());
  assert.equal(f.calls.length,0,'invalid identity or racer record blocks native acquisition entirely');
 }
 const f=fixture();requestDrag(f);f.step();f.put(B+64,f.memory.buffer.byteLength+0x1000);f.c.stop();assert.doesNotThrow(()=>f.step());assert.equal(f.c.status().active,false);assert.equal(f.calls.at(-1).fn,0x605c70);
});
test('bridge rejects objects too close to end of actual memory and still handles memory growth',()=>{
 const f=fixture();requestDrag(f);f.put(0xd00000,f.memory.buffer.byteLength-8);assert.doesNotThrow(()=>f.step());assert.equal(f.calls.length,0);
 const g=fixture();g.memory.grow(1);g.c.refresh();requestDrag(g);assert.doesNotThrow(()=>g.step());assert.equal(g.c.status().active,true);
});


test('automatic mode handoff cycles native -> drag -> native on reused pointers with confirmed native handback',()=>{
 const f=fixture();f.on();f.step();assert.equal(f.get(f.car+0x28),3);
 let result=requestDrag(f);assert.equal(result.switching,true);assert.equal(f.get(B+8),0);assert.equal(f.get(B+88),0);
 for(let i=0;i<3;i++){requestDrag(f);assert.equal(f.get(B+8),0);}assert.equal(f.calls.length,1,'page cannot reacquire before game loop accepts OFF');
 f.step();assert.equal(f.c.status().owned,false);assert.equal(f.c.status().manual,true);
 requestDrag(f);f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(f.car+0x28),1);
 f.s.drag=false;f.d.setUint8(0x89e7d8,0);result=f.on();assert.equal(result.switching,true);assert.equal(f.get(B+8),0);
 f.step();f.on();f.step();assert.equal(f.c.status().active,true);assert.equal(f.get(f.car+0x28),3);
 assert.deepEqual(f.calls.map(x=>x.fn),f.c.capabilities.nativeDragInputHandoff?[0x5fae20,0x5faf10,0x605c70,0x605c70,0x5f46a0,0x605c70,0x5fae20]:[0x5fae20,0x5faf10,0x605c70,0x5fae20,0x5f46a0,0x5faf10,0x605c70,0x5fae20]);
});
test('race/free-roam HUD mode changes rebuild AI even with identical identity pointers',()=>{
 const f=fixture();f.on(2);f.step();assert(f.c.status().active);f.on(1);assert.equal(f.get(B+8),0);f.step();f.on(1);f.step();
 assert.deepEqual(f.calls.map(x=>x.fn),[0x5fae20,0x5faf10,0x605c70,0x5fae20]);assert.equal(f.get(B+8),1);
 f.on(1);f.step();assert.equal(f.calls.length,4,'same mode does not rebuild every tick');
});
test('automatic swap requires both released ownership and confirmed manual driver',()=>{
 const f=fixture();f.on();f.step();requestDrag(f);f.step();f.put(f.car+0x24,3);
 requestDrag(f);f.step();assert.equal(f.get(B+8),0);assert.equal(f.calls.length,3,'foreign or unfinished AI cannot be acquired');
 f.put(f.car+0x24,1);requestDrag(f);f.step();assert(f.c.status().active);assert.equal(f.calls.length,5);
});
test('automatic swap remembers mode across stop and pause, but never reenables on its own',()=>{
 const f=fixture();f.on();f.step();f.c.stop();f.s.drag=true;f.d.setUint8(0x89e7d8,1);
 f.c.update({enabled:false,safe:true,state:f.s,mode:1,allowDragAI:false});f.step();assert.equal(f.get(B+8),0);assert(!f.c.status().active);
 f.c.update({enabled:true,safe:false,state:f.s,mode:1,allowDragAI:true});f.step();assert.equal(f.get(B+8),0);
 requestDrag(f);assert.equal(f.get(B+8),0);f.step();requestDrag(f);f.step();assert(f.c.status().active);
});
test('rapid mode changes cannot bypass OFF acknowledgement or strand native ownership',()=>{
 const f=fixture();f.on(2);f.step();requestDrag(f);f.s.drag=false;f.d.setUint8(0x89e7d8,0);f.on(2);
 assert.equal(f.get(B+8),0);assert.equal(f.calls.length,1);f.on(2);assert.equal(f.get(B+8),0);
 f.step();f.on(2);f.step();assert(f.c.status().active);assert.deepEqual(f.calls.map(x=>x.fn),[0x5fae20,0x5faf10,0x605c70,0x5fae20]);
});
test('swap does not grant network permission or override native drag physics eligibility',()=>{
 const f=fixture();f.on();f.step();requestDrag(f);f.step();f.put(f.car+0x28,3);requestDrag(f);f.step();assert.equal(f.c.status().active,false);assert.equal(f.calls.length,3);
 f.put(f.car+0x28,1);f.s.network=true;f.put(0x850078,8);requestDrag(f);f.step();assert.equal(f.get(B+84),0);assert.equal(f.c.status().active,false);
 f.s.network=false;f.put(0x850078,1);requestDrag(f);f.step();assert.equal(f.c.status().active,true);
});
test('swap waiting for native acknowledgement retains heartbeat fallback',()=>{
 const f=fixture();f.on();f.step();requestDrag(f);f.step();for(let i=0;i<180;i++)f.step();assert.equal(f.c.status().owned,false);assert.equal(f.c.status().manual,true);
});


test('swap cannot mistake heartbeat observation for completed OFF while failed-acquisition latch remains',()=>{
 const instrumented=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-swap-probe.wasm'));
 const f=fixture(instrumented);f.fail();f.on();f.step();assert.equal(f.c.status().status,'failed');assert.equal(f.get(B+72),f.car);f.succeed();
 requestDrag(f);assert.equal(f.get(B+8),0);
 let observed=false;f.setProbe(()=>{
  f.setProbe(()=>{});observed=true;assert.equal(f.get(B+44),f.get(B+24));assert.equal(f.get(B+72),f.car);
  requestDrag(f);assert.equal(f.get(B+8),0,'failed latch blocks ON even though OFF heartbeat was observed');assert.equal(f.c.handbackPending,true);
 });
 f.step();assert(observed);assert.equal(f.get(B+72),0);
 for(let i=0;i<4;i++){requestDrag(f);f.step();}
 assert.equal(f.c.status().active,true);assert.equal(f.get(f.car+0x28),1);assert.equal(f.c.handbackPending,false);
 assert.deepEqual(f.calls.map(x=>x.fn),[0x5fae20,f.c.capabilities.nativeDragInputHandoff?0x605c70:0x5fae20,0x5f46a0]);
});


test('native race subtype and track changes rebuild on reused identity without inventing opponent identity',()=>{
 for(const [address,byte] of [[0x89e7a0,false],[0x89e7b4,false],[0x89e7d9,true],[0x89e7e1,true],[0x89e7e3,true],[0x890104,false],[0x890108,false],[0x89010c,false],[0x890114,false]]) {
  const f=fixture();f.put(f.rec+4,1);f.put(0x89e7b0,1);f.on();f.step();
  if(byte)f.d.setUint8(address,1);else f.put(address,1);
  assert.equal(f.on().switching,true,'event flag '+address.toString(16));
  f.on();assert.equal(f.get(B+8),0,'wait for native handback');
  f.step();f.on();f.step();assert.equal(f.c.status().active,true);
  const expected=[0x5fae20,0x5faf10,0x605c70,0x5fae20];
  if(f.c.capabilities.nativeDriftPhysics&&[0x89e7d9,0x890104,0x890114].includes(address))expected.push(0x5f46a0);
  assert.deepEqual(f.calls.map(x=>x.fn),expected);
  assert.equal(f.get(f.rec+4),1,'player remains player, not opponent');
  assert.equal(f.c.status().level,9);f.on();f.step();assert.equal(f.calls.length,expected.length,'stable subtype does not rebuild each tick');
 }
});
test('rapid native subtype changes still need one completed handback before acquisition',()=>{
 const f=fixture();f.on();f.step();f.d.setUint8(0x89e7d9,1);f.on();
 f.d.setUint8(0x89e7d9,0);f.d.setUint8(0x89e7e3,1);f.on();f.on();
 assert.equal(f.get(B+8),0);assert.equal(f.calls.length,1);
 f.step();f.on();f.step();assert.equal(f.c.status().active,true);
 assert.deepEqual(f.calls.map(x=>x.fn),[0x5fae20,0x5faf10,0x605c70,0x5fae20]);
});

function forwardFixture(){
 const f=fixture(),profile=require('../extension/modern-profile.js'),config=require('../extension/forward-native-config.js').select(profile.hash);
 const pages=Math.ceil((Math.max(...config.runtime.onlineAddresses)+8)/65536);f.memory.grow(pages-f.memory.buffer.byteLength/65536);
 f.c=new Controller(f.memory,true,{...profile.capabilities,nativeForwardGeometry:true},{moduleHash:profile.hash});
 f.put(0x89e7b0,1);
 f.forward={enabled:true,safe:true,state:f.s,mode:1,pace:2,adaptivePace:1,raceCornerAssist:true,adaptiveCorners:true};
 f.updateForward=extra=>f.c.update({...f.forward,...extra});return f;
}

test('installed offline forward sampler keeps an identical command generation while heartbeats retain native ownership',()=>{
 const f=forwardFixture();f.updateForward();f.step();const sequence=f.get(B+4),heartbeat=f.get(B+24);
 for(let i=0;i<400;i++){f.updateForward();assert.equal(f.get(B+4),sequence);f.step();}
 assert(f.get(B+24)>heartbeat);assert.equal(f.c.status().active,true);assert.equal(f.calls.length,1);
 // Without page heartbeats, the existing native watchdog still hands back.
 for(let i=0;i<180;i++)f.step();assert.equal(f.c.status().active,false);assert.equal(f.calls.at(-1).arg,2);
});

test('forward heartbeat path never hides changed pace, permissions, OFF or a corner-profile handback',()=>{
 const f=forwardFixture();f.updateForward();f.step();let sequence=f.get(B+4);
 f.updateForward({adaptivePace:.9});assert(f.get(B+4)>sequence);assert.equal(f.get(B+60),90);sequence=f.get(B+4);
 f.updateForward({adaptivePace:.9});assert.equal(f.get(B+4),sequence);
 f.updateForward({adaptivePace:.9,allowNetwork:true});assert(f.get(B+4)>sequence);assert.equal(f.get(B+84),1);sequence=f.get(B+4);
 f.c.stop();assert(f.get(B+4)>sequence);assert.equal(f.get(B+8),0);assert.equal(f.c.handbackPending,true);
 f.step();assert.equal(f.c.status().active,false);assert.equal(f.calls.at(-1).arg,2);
 const g=forwardFixture();g.updateForward();g.step();sequence=g.get(B+4);g.updateForward({raceCornerFactor:.7});
 assert(g.get(B+4)>sequence);assert.equal(g.get(B+8),0);assert.equal(g.c.handbackPending,true);
});

test('existing profiles and nonadaptive commands retain their full sequence publications',()=>{
 const f=fixture();f.on();const sequence=f.get(B+4);f.on();assert(f.get(B+4)>sequence);
 const g=forwardFixture();g.updateForward({adaptiveCorners:false});const second=g.get(B+4);
 g.updateForward({adaptiveCorners:false});assert(g.get(B+4)>second);
});

test('unchanged permitted online context retains heartbeat-only publication after a fresh context generation',()=>{
 const f=forwardFixture();f.updateForward({allowNetwork:true});f.step();const seq=f.get(B+4);f.updateForward({allowNetwork:true});assert.equal(f.get(B+4),seq);
 for(const[at,value,byte]of [[0x850078,8,false],[0x850078,512,false],[0x866a14,1,false],[0x8669f4,1,false],[0x89cf69,1,true]]){
  const g=forwardFixture();g.updateForward({allowNetwork:true});g.step();if(byte)g.d.setUint8(at,value);else g.put(at,value);
  let before=g.get(B+4);g.updateForward({allowNetwork:true});assert(g.get(B+4)>before);before=g.get(B+4);g.updateForward({allowNetwork:true});assert.equal(g.get(B+4),before);
 }
});
