'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create,errorInfo,KEY,MAX_EVENTS,MAX_BYTES}=require('../extension/diagnostics.js');
function fixture(){let time=1000;const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};const logger=create({storage,clock:()=>time});return {logger,storage,values,advance:n=>time+=n,read:()=>JSON.parse(logger.exportText())};}
test('records only schema-approved tool and state values',()=>{
 const f=fixture();f.logger.record('state',{revision:'2f0ddd3b',safe:true,car:123456,player:'SECRET',url:'https://private/?token=SECRET',tools:{ai:true,power:1.5,password:'SECRET',token:'SECRET',rpm:6000},raceType:0,driverKind:3});
 const data=f.read().events.at(-1).data;assert.deepEqual(data,{safe:true,raceType:0,driverKind:3,revision:'2f0ddd3b',tools:{ai:true,power:1.5,rpm:6000}});assert.doesNotMatch(f.logger.exportText(),/SECRET|https:\/\/private/);
 assert.equal(f.logger.record('SECRET',{safe:true}),false);f.logger.record('state',{revision:'private-name',memoryMiB:Infinity,tools:{power:9000,ai:'SECRET'}});assert.deepEqual(f.read().events.at(-1).data,{tools:{}});
});
test('error messages, URLs, names and credentials never survive classification',()=>{
 const secret='SECRET@example.com token=TOPSECRET';
 const err={name:'RuntimeError',message:`memory access out of bounds ${secret}`,stack:`RuntimeError: ${secret}\n at evil (https://example.com/SECRET/game.wasm?token=TOPSECRET:wasm-function[21213]:0x1abc)\n at Alice (https://nfsu2.xyz/SECRET/page.js:45:3)\n at https://private.test/?secret=TOPSECRET\n at other.js:12:1`};
 assert.deepEqual(errorInfo(err),{errorKind:'memory-bounds',wasmFrames:['wasm-function[21213]:0x1abc'],jsFrames:['page.js:45:3']});
 const f=fixture();f.logger.record('game-trap',{error:err});assert.doesNotMatch(f.logger.exportText(),/TOPSECRET|SECRET|Alice|https:|other\.js/);assert.equal(f.read().events.at(-1).data.errorKind,'memory-bounds');
});
test('extracts important native trap classes without retaining raw message',()=>{
 for(const [text,kind] of [['unreachable','unreachable'],['null function or function signature mismatch','indirect-call'],['integer divide by zero','integer-divide'],['invalid conversion to integer','invalid-conversion'],['Maximum call stack size exceeded','stack-overflow'],['Out of memory','out-of-memory'],['TypeError: secret','type-error'],['ReferenceError: secret','reference-error'],['SyntaxError: secret','syntax-error'],['user payload SECRET','other']])assert.equal(errorInfo(text).errorKind,kind);
});
test('persists the previous trap through same-tab reload and revalidates untrusted storage',()=>{
 const f=fixture();f.logger.record('game-trap',{tid:0,error:'unreachable',stack:'wasm-function[21213]:0xabcd'});
 const second=create({storage:f.storage,clock:()=>2000});assert.equal(JSON.parse(second.exportText()).events.filter(e=>e.event==='game-trap').length,1);
 f.storage.setItem(KEY,JSON.stringify({schema:1,events:[{at:1,event:'state',data:{raw:'SECRET',revision:'SECRET',tools:{ai:true,token:'SECRET'}}},{at:2,event:'game-trap',data:{errorKind:'SECRET',wasmFrames:['SECRET','wasm-function[42]:0x123'],jsFrames:['https://SECRET/page.js:1:2']}}]}));
 const restored=JSON.parse(create({storage:f.storage}).exportText());assert.doesNotMatch(JSON.stringify(restored),/SECRET/);assert.deepEqual(restored.events[0].data,{tools:{ai:true}});assert.deepEqual(restored.events[1].data,{wasmFrames:['wasm-function[42]:0x123'],jsFrames:[]});
});
test('bounds retained records and bytes with large sanitized trap input',()=>{
 const f=fixture(),stack=Array.from({length:200},(_,i)=>`wasm-function[${i}]:0xabcdef`).join('\n');
 for(let i=0;i<500;i++)f.logger.record('game-trap',{error:'unreachable',stack,tools:{ai:true,grip:true,power:2}});
 assert.ok(f.logger.status().events<=MAX_EVENTS);assert.ok(f.values.get(KEY).length<=MAX_BYTES);assert.ok(f.logger.status().dropped>0);assert.ok(f.read().events.every(e=>(e.data.wasmFrames?.length||0)<=12));
});
test('blocked or full storage never interrupts logging',()=>{
 const logger=create({storage:{getItem(){throw Error('blocked')},setItem(){throw Error('quota')}}});
 assert.equal(logger.record('game-trap',{error:'unreachable'}),true);assert.equal(logger.status().persistence,'memory-only');assert.equal(JSON.parse(logger.exportText()).events.at(-1).event,'game-trap');
 const value={get message(){throw Error('bad getter')},get stack(){throw Error('bad getter')}};assert.doesNotThrow(()=>logger.record('page-error',{error:value}));assert.doesNotThrow(()=>logger.snapshot({get tools(){throw Error('bad getter')}}));
});
test('corrupt and oversized saved data are discarded safely',()=>{
 for(const raw of ['not-json','x'.repeat(MAX_BYTES+1),JSON.stringify({schema:2,events:[]})]){const logger=create({storage:{getItem:()=>raw,setItem(){}}});assert.equal(logger.status().events,1);}
});
test('snapshots are throttled, unchanged state sampled at five seconds, and clear removes old data',()=>{
 const f=fixture();f.logger.snapshot({safe:true});const n=f.logger.status().events;
 for(let i=0;i<100;i++)f.logger.snapshot({safe:!!(i%2)});assert.equal(f.logger.status().events,n);
 f.advance(250);f.logger.snapshot({safe:false});assert.equal(f.logger.status().events,n+1);
 f.advance(4999);f.logger.snapshot({safe:false});assert.equal(f.logger.status().events,n+1);f.advance(1);f.logger.snapshot({safe:false});assert.equal(f.logger.status().events,n+2);
 f.logger.clear();assert.deepEqual(f.read().events.map(e=>e.event),['clear']);assert.equal(f.read().dropped,0);assert.equal(JSON.parse(f.values.get(KEY)).events.length,1);
});
test('logger itself has no network, console capture or memory-write facilities',()=>{
 const fs=require('fs'),source=fs.readFileSync(require.resolve('../extension/diagnostics.js'),'utf8');
 assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|WebAssembly|Atomics|console)\s*[.(]/);assert.doesNotMatch(source,/localStorage|document\.cookie/);
});
test('repeated page errors are rate-limited to keep synchronous storage work bounded',()=>{
 const f=fixture();for(let i=0;i<1000;i++)f.logger.record('page-error',{error:'SECRET payload'});
 assert.equal(f.read().events.filter(e=>e.event==='page-error').length,8);assert.equal(f.logger.status().dropped,992);
 f.advance(1000);f.logger.record('page-error',{error:'new error'});assert.equal(f.read().events.filter(e=>e.event==='page-error').length,9);
});

test('combined logger retains bounded sharp-turn margin without accepting extra data',()=>{
 const f=fixture();f.logger.record('state',{tools:{cornerAssist:true,cornerMargin:25,raw:'SECRET'}});assert.deepEqual(f.read().events.at(-1).data.tools,{cornerAssist:true,cornerMargin:25});
 for(const value of [-1,26,Infinity,NaN,'25']){f.logger.record('state',{tools:{cornerMargin:value}});assert.deepEqual(f.read().events.at(-1).data.tools,{});}
});

test('logger separately records online traffic selection and native requested mode',()=>{
 const f=fixture();f.logger.record('state',{onlineTrafficRequested:true,carRequested:true,carHits:7,tools:{traffic:true,cars:false,online:false}});
 assert.deepEqual(f.read().events.at(-1).data,{carRequested:true,onlineTrafficRequested:true,carHits:7,tools:{cars:false,traffic:true,online:false}});
 f.logger.record('state',{onlineTrafficRequested:'true',tools:{traffic:1}});assert.deepEqual(f.read().events.at(-1).data,{tools:{}});
});

test('corner diagnostic fields reject nonboolean, out-of-range and free-text values',()=>{
 const f=fixture();f.logger.record('state',{cornerRequested:'true',cornerMemoryBlocked:1,cornerDriftBlocked:'SECRET',cornerHits:-1,cornerApplied:1.1});assert.deepEqual(f.read().events.at(-1).data,{});
 f.logger.record('state',{cornerRequested:true,cornerMemoryBlocked:false,cornerDriftBlocked:true,cornerHits:4294967295,cornerApplied:.45});assert.deepEqual(f.read().events.at(-1).data,{cornerRequested:true,cornerMemoryBlocked:false,cornerDriftBlocked:true,cornerHits:4294967295,cornerApplied:.45});
});

test('online player diagnostics retain only explicit flags and separate bounded contact counts',()=>{
 const f=fixture();f.logger.record('state',{onlinePlayersRequested:true,onlineTrafficRequested:true,trafficHits:2,playerHits:1,carHits:3,playerName:'not stored',tools:{players:true,traffic:false}});
 const data=f.read().events.at(-1).data;assert.equal(data.onlinePlayersRequested,true);assert.equal(data.playerHits,1);assert.equal(data.trafficHits,2);assert.equal(data.carHits,3);assert.deepEqual(data.tools,{traffic:false,players:true});assert.equal('playerName' in data,false);
 f.logger.record('state',{onlinePlayersRequested:'true',trafficHits:-1,playerHits:Infinity,tools:{players:1}});assert.deepEqual(f.read().events.at(-1).data,{tools:{}});
});

test('road-race diagnostics retain bounded independent controls and native evidence',()=>{
 const f=fixture();f.logger.record('state',{cornerMode:2,cornerPace:3,cornerBraking:.75,brakingHits:42,tools:{raceCornerAssist:true,raceCornerFactor:.8,raceCornerMargin:15,raceBraking:.75}});
 assert.deepEqual(f.read().events.at(-1).data,{cornerMode:2,cornerPace:3,cornerBraking:.75,brakingHits:42,tools:{raceCornerAssist:true,raceCornerFactor:.8,raceCornerMargin:15,raceBraking:.75}});
 f.logger.record('state',{cornerMode:'race',cornerPace:4,cornerBraking:0,brakingHits:-1,tools:{raceCornerAssist:'true',raceCornerFactor:1,raceCornerMargin:26,raceBraking:0}});assert.deepEqual(f.read().events.at(-1).data,{tools:{}});
});

test('usable sampled-corner evidence retains only its bounded numeric count',()=>{
 const f=fixture();for(const cornerPlannerUsable of [0,1,5]){f.logger.record('state',{cornerPlannerUsable,cornerRecordPointer:0xe00000});assert.deepEqual(f.read().events.at(-1).data,{cornerPlannerUsable});}
 for(const cornerPlannerUsable of [-1,6,Infinity,NaN,'1',null]){f.logger.record('state',{cornerPlannerUsable});assert.deepEqual(f.read().events.at(-1).data,{});}
});

test('tuner rejection diagnostics accept only known enums and relevant integer counts',()=>{
 const log=create();
 log.record('dyno-error',{dynoStatus:8,dynoGuard:32,dynoObserved:0,error:Object.assign(Error('SECRET 0xdeadbeef'),{stack:'at f (dyno-full.js:101:2)'})});
 let e=JSON.parse(log.exportText()).events.at(-1).data;assert.equal(e.dynoStatus,8);assert.equal(e.dynoGuard,32);assert.equal(e.dynoObserved,0);assert.deepEqual(e.jsFrames,['dyno-full.js:101:2']);
 log.record('dyno-error',{dynoStatus:8,dynoGuard:50,dynoObserved:23});e=JSON.parse(log.exportText()).events.at(-1).data;assert.equal(e.dynoObserved,23);
 for(const bad of [{dynoStatus:8,dynoGuard:32,dynoObserved:1.5},{dynoStatus:8,dynoGuard:32,dynoObserved:-1},{dynoStatus:8,dynoGuard:32,dynoObserved:4294967296},{dynoStatus:8,dynoGuard:45,dynoObserved:3735928559},{dynoStatus:8,dynoGuard:50,dynoObserved:99},{dynoStatus:8,dynoGuard:32.5,dynoObserved:4},{dynoStatus:1,dynoGuard:32,dynoObserved:4},{dynoStatus:'8',dynoGuard:'32',dynoObserved:'4'}]){
  const fresh=create();fresh.record('dyno-error',bad);const d=JSON.parse(fresh.exportText()).events.at(-1).data;assert.equal('dynoObserved'in d,false);if(bad.dynoStatus!==8||bad.dynoGuard===32.5)assert.equal('dynoGuard'in d,false);
 }
 assert.doesNotMatch(log.exportText(),/SECRET|deadbeef/);
});
