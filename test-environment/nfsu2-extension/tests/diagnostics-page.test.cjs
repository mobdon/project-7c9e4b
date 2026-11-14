'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),{createRequire}=require('module');
// Reuse the existing production-page fixture without registering its unrelated tests.
// Instrument only the test doubles: real diagnostics.js and page.js execute unchanged.
const coreFile=require.resolve('./core.test.cjs'),baseRequire=createRequire(coreFile);
let source=fs.readFileSync(coreFile,'utf8');
function replace(old,value){assert.equal(source.split(old).length-1,1,old);source=source.replace(old,value);}
replace('let interval,now=0,stored=saved,focused=true,shadow;', 'let interval,now=0,stored=saved,focused=true,shadow,diagnosticsStored=compatibility.log||null;const downloads=[];');
replace('    setAttribute(k,v){this.attrs[k]=v;}','    setAttribute(k,v){this.attrs[k]=v;}\n    click(){}\n    remove(){}');
replace('WebAssembly,Worker,URL,console,',"WebAssembly,Worker,Blob,URL:Object.assign(class extends URL {},{createObjectURL:blob=>(downloads.push(blob),'blob:local-test'),revokeObjectURL(){}}),console,");
replace("    __NFSU2_DRIVING_CORE__:require('../extension/core.js'),", "    __NFSU2_DIAGNOSTICS__:{create:options=>require('../extension/diagnostics.js').create({...options,clock:()=>1000+now})},\n    __NFSU2_DRIVING_CORE__:require('../extension/core.js'),");
replace("sessionStorage:compatibility.sessionStorage||{getItem:key=>sessions.get(key)??null,setItem:(k,v)=>{sessions.set(k,v);if(k==='nfsu2-driving-tools-v1')stored=v;},removeItem:k=>sessions.delete(k)},","sessionStorage:{getItem:k=>k==='nfsu2-driving-tools-diagnostics-v1'?diagnosticsStored:sessions.get(k)??null,setItem:(k,v)=>{if(k==='nfsu2-driving-tools-diagnostics-v1'){if(compatibility.noStorage)throw Error('storage blocked');diagnosticsStored=v;}else {sessions.set(k,v);if(k==='nfsu2-driving-tools-v1')stored=v;}},removeItem:k=>sessions.delete(k)},");
replace('    stop(){aiLog.stops++;}', '    read(offset){return aiLog.mailbox?.[offset]??0;}\n    stop(){aiLog.stops++;}');
replace('  return {...f,nodes,worker,status,physics,wheels,gameModule,',"  return {...f,nodes,worker,status,physics,wheels,gameModule,log:()=>JSON.parse(diagnosticsStored||'{}'),storedLog:()=>diagnosticsStored,downloads,fire:event=>context.dispatchEvent(event),");
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(source+'\nthis.makeDiagnosticFixture=pageFixture;',context,{filename:coreFile});
const fixture=context.makeDiagnosticFixture;
test('production page records effective boost/grip, mode, traps and manual JSON export',async()=>{
 const f=await fixture(null,true);f.change('boost',true);f.change('grip',true);f.change('ai',true);f.run(8);
 const states=f.log().events.filter(e=>e.event==='state');assert.ok(states.length);const state=states.at(-1).data;
 assert.equal(state.tools.boost,true);assert.equal(state.tools.grip,true);assert.equal(state.tools.ai,true);assert.equal(state.powerActive,true);assert.equal(state.gripActive,true);assert.equal(state.effectivePower,1.5);assert.equal(state.effectiveGrip,1.3);assert.equal(state.hud,2);assert.equal(state.raceType,0);
 f.worker.emit({t:'trap',tid:1,msg:'RuntimeError: unreachable SECRET',stack:'at SECRET (https://private.test/wasm?token=SECRET:wasm-function[21213]:0x1234)'});
 const trap=f.log().events.find(e=>e.event==='game-trap');assert.equal(trap.data.errorKind,'unreachable');assert.deepEqual(Array.from(trap.data.wasmFrames),['wasm-function[21213]:0x1234']);assert.equal(trap.data.sessionCurrent,true);assert.equal(trap.data.gripActive,true);assert.doesNotMatch(JSON.stringify(f.log()),/SECRET|private\.test/);
 f.click('diagnostic-export');assert.equal(f.downloads.length,1);const exported=JSON.parse(await f.downloads[0].text());assert.ok(exported.events.some(e=>e.event==='game-trap'));assert.match(f.nodes.note.textContent,/download requested/);
});
test('production page retains a prior trap across reload and Clear log removes it',async()=>{
 const f=await fixture(null,true);f.worker.emit({t:'trap',tid:0,msg:'unreachable'});const after=await fixture(null,true,false,{log:f.storedLog()});
 assert.ok(after.log().events.some(e=>e.event==='game-trap'));assert.equal(after.log().events.filter(e=>e.event==='page-start').length,2);
 after.click('diagnostic-clear');assert.deepEqual(Array.from(after.log().events,e=>e.event),['clear']);after.click('diagnostic-export');const exported=JSON.parse(await after.downloads[0].text());assert.equal(exported.events.some(e=>e.event==='game-trap'),false);
});
test('production page collects sanitized page/worker failures and checkpoints stay bounded',async()=>{
 const f=await fixture(null,true);f.run();f.fire({type:'error',message:'TypeError SECRET',error:new TypeError('SECRET')});f.fire({type:'unhandledrejection',reason:'out of memory SECRET'});
 for(const fn of f.worker.handlers.error||[])fn({message:'unreachable SECRET'});
 assert.ok(f.log().events.some(e=>e.event==='page-error'&&e.data.errorKind==='type-error'));assert.ok(f.log().events.some(e=>e.event==='promise-rejection'&&e.data.errorKind==='out-of-memory'));assert.ok(f.log().events.some(e=>e.event==='worker-error'));
 const n=f.log().events.filter(e=>e.event==='state').length;f.run(99);assert.equal(f.log().events.filter(e=>e.event==='state').length,n);f.run();assert.equal(f.log().events.filter(e=>e.event==='state').length,n+1);assert.doesNotMatch(f.storedLog(),/SECRET/);
});
test('storage failure still permits in-memory manual export and does not stop controls',async()=>{
 const f=await fixture(null,true,false,{noStorage:true});f.change('boost',true);f.run(8);assert.equal(f.read(0x2dc),0.75);f.click('diagnostic-export');
 const exported=JSON.parse(await f.downloads[0].text());assert.equal(exported.persistence,'memory-only');assert.ok(exported.events.some(e=>e.event==='state'));assert.match(f.nodes['diagnostic-state'].textContent,/memory only/);
});
test('logger checkpoints and export leave guest memory byte-for-byte unchanged with tools off',async()=>{
 const f=await fixture(null,true);const before=Buffer.from(f.memory.buffer);
 f.run(220);f.worker.emit({t:'log',fd:2,s:'SECRET raw game stdout'});f.click('diagnostic-export');
 assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.ok(f.log().events.filter(e=>e.event==='state').length>=3);assert.doesNotMatch(f.storedLog(),/SECRET|stdout/);assert.equal(f.downloads.length,1);
});

test('production logger exports bounded corner evidence separately from confirmed pace',async()=>{
 const f=await fixture(null,true);f.change('ai',true);f.change('corner-assist',true);f.change('ai-pace',true);f.input('pace-factor',3);f.aiLog.paceApplied=3;f.aiLog.cornerHits=0;f.run(8);
 let s=f.log().events.filter(e=>e.event==='state').at(-1).data;assert.equal(s.requestedPace,3);assert.equal(s.cornerRequested,true);assert.equal(s.cornerHits,0);assert.equal(s.cornerMemoryBlocked,false);assert.equal(s.cornerDriftBlocked,false);assert.equal('cornerApplied' in s,false);
 f.aiLog.cornerHits=7;f.aiLog.cornerApplied=.81;f.run(6);
 // Fast changing corner evidence belongs in the independent trace; it must
 // not force synchronous event-log writes between ordinary checkpoints.
 f.click('diagnostic-export');const trace=JSON.parse(await f.downloads.at(-1).text()).raceTrace,row=trace.rows.at(-1);
 assert.equal(row[trace.columns.indexOf('cornerHits')],7);assert.equal(row[trace.columns.indexOf('cornerApplied')],.81);
});

test('verified current profile logs bounded Drift telemetry without writes and clears it on mode exit',async()=>{
 const profile=require('../extension/next-profile.js'),f=await fixture(null,true,false,{revision:profile.revision,profile});
 const rec=0xe05000,driver=0xe06000,behavior=0xe07000;
 for(const [a,v]of [[f.car+0x14,rec],[rec+4,1],[f.car+0x24,3],[f.car+0x2c,driver],[driver,0x785370],[driver+4,f.car],[driver+8,behavior],[behavior,0x784f40],[behavior+0x220,f.car],[0x89e7a0,4301]])f.put(a,v);
 f.d.setUint8(0x89e7d9,1);f.d.setFloat32(f.car+0x430,22,true);f.d.setFloat32(behavior+0x22c,30,true);
 const before=Buffer.from(f.memory.buffer);f.run(8);let s=f.log().events.filter(e=>e.event==='state').at(-1).data;
 assert.equal(s.nativeDriftBehavior,true);assert.equal(s.trackId,4301);assert.equal(s.speedMps,22);assert.equal(s.driftTargetMps,30);assert.equal(s.aiGoalPending,true);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 f.click('diagnostic-export');const exported=JSON.parse(await f.downloads[0].text());assert.equal(exported.events.filter(e=>e.event==='state').at(-1).data.trackId,4301);
 f.d.setUint8(0x89e7d9,0);f.run(6);s=f.log().events.filter(e=>e.event==='state').at(-1).data;assert.equal(s.driftRace,false);assert.equal(s.trackId,4301);assert.equal(s.nativeDriftBehavior,true);assert.equal(s.speedMps,22);for(const key of ['driftTargetMps','driftScoreLinked','driftPendingPoints'])assert.equal(key in s,false);
});
test('unknown or older profiles never receive new Drift telemetry from metadata alone',async()=>{
 for(const options of [{revision:'93af6ccb',profile:require('../extension/next-profile.js'),verified:false},{revision:'2f0ddd3b',profile:require('../extension/current-profile.js')}]){
  const f=await fixture(null,true,false,options);f.d.setUint8(0x89e7d9,1);f.put(0x89e7a0,4301);const before=Buffer.from(f.memory.buffer);f.run(8);assert.deepEqual(Buffer.from(f.memory.buffer),before);
  for(const e of f.log().events.filter(e=>e.event==='state'))assert.equal('trackId' in e.data,false);
 }
});

test('page forwards independent road-race controls and native braking evidence to local diagnostics',async()=>{
 const f=await fixture(null,true);f.put(0x89e7b0,1);f.drive(1);f.change('ai',true);f.change('race-corner-assist',true);f.input('race-braking',.6);
 Object.assign(f.aiLog,{cornerMode:2,cornerPace:3,cornerBraking:.6,brakingHits:12,cornerRequested:true,cornerApplied:.8});f.run(8);
 const s=f.log().events.filter(e=>e.event==='state').at(-1).data;
 assert.equal(s.tools.raceCornerAssist,true);assert.equal(s.tools.raceBraking,.6);assert.equal(s.cornerMode,2);assert.equal(s.cornerPace,3);assert.equal(s.cornerBraking,.6);assert.equal(s.brakingHits,12);
});
test('production page reports native command and saved-skill mailbox scalars',async()=>{
 const profile=require('../extension/next-profile.js'),f=await fixture(null,true,false,{revision:profile.revision,profile});
 f.aiLog.mailbox={8:1,44:123,48:7,52:1,64:1,68:4};f.run(8);
 let s=f.log().events.filter(e=>e.event==='state').at(-1).data;
 assert.equal(s.aiRequestedMode,1);assert.equal(s.nativeHeartbeatAck,123);assert.equal(s.aiStaleTicks,7);assert.equal(s.aiNativeStatus,1);assert.equal(s.aiSkillSaved,true);assert.equal(s.savedNativeSkill,4);
 f.aiLog.mailbox={8:0,44:124,48:0,52:0,64:0,68:9};f.run(6);
 s=f.log().events.filter(e=>e.event==='state').at(-1).data;assert.equal(s.aiSkillSaved,false);assert.equal('savedNativeSkill' in s,false);assert.equal(s.aiRequestedMode,0);
});

test('online race contact scope is exported as a bounded boolean, not peer identity',async()=>{
 const profile=require('../extension/next-profile.js'),f=await fixture(null,true,false,{revision:profile.revision,profile});f.put(0x850078,8);f.put(0x89e7b0,1);f.change('online',true);f.change('players',true);f.carLog.result={onlinePlayers:true,onlineRaceCars:true,playerHits:3,trafficHits:0};f.run(8);
 const s=f.log().events.filter(e=>e.event==='state').at(-1).data;assert.equal(s.onlineRaceCarsRequested,true);assert.equal(s.playerHits,3);assert.equal(s.trafficHits,0);assert.equal(s.network,true);
});
test('page exports bounded Drag engine heat and explicit blowout toggle without addresses',async()=>{
 const profile=require('../extension/next-profile.js'),f=await fixture(null,true,false,{revision:profile.revision,profile}),motor=0xe22000,params=0xe24000;
 f.d.setUint8(0x89e7d8,1);f.put(f.car+40,1);f.put(f.physics+72,motor);f.put(motor+24,params);f.d.setFloat32(motor+140,-1,true);f.d.setFloat32(params+4,8000,true);f.change('drag-no-blowout',true);f.run(8);
 const state=f.log().events.filter(e=>e.event==='state').at(-1).data;assert.equal(state.tools.dragNoBlowout,true);assert.equal(state.dragEngineHeat,-1);assert.equal(state.dragHeatDisabled,true);assert.equal(state.dragEngineBlown,false);assert.equal(state.dragEngineLimitRpm,8000);assert.equal('motor' in state,false);assert.equal('physics' in state,false);
});

test('page displays snapshot rejection and exports guard evidence without retaining raw error text',async()=>{
 const f=await fixture(null,true,true),controller=f.dynoLog.instance;
 controller.find=async()=>{throw Object.assign(Error('Tuner snapshot stopped [S32]: performance-curve sample count (0). No setup changes were made. SECRET'),{dynoStatus:8,dynoGuard:32,dynoObserved:0});};
 f.change('dyno-enable',true);f.click('dyno-find');await new Promise(resolve=>setImmediate(resolve));
 assert.match(f.nodes['dyno-state'].textContent,/S32/);assert.equal(f.nodes['dyno-apply'].disabled,true);
 const error=f.log().events.find(e=>e.event==='dyno-error');assert.ok(error);assert.equal(error.data.dynoStatus,8);assert.equal(error.data.dynoGuard,32);assert.equal(error.data.dynoObserved,0);assert.doesNotMatch(f.storedLog(),/SECRET|sample count/);
 f.click('diagnostic-export');const exported=JSON.parse(await f.downloads[0].text());assert.equal(exported.events.find(e=>e.event==='dyno-error').data.dynoGuard,32);
});

test('verified page samples the native online NOS clock without automatic refill or memory writes',async()=>{
 const profile=require('../extension/next-profile.js'),f=await fixture(null,true,false,{revision:profile.revision,profile});
 f.put(0x86518c,100000);f.put(0x8651ac,140000);f.d.setUint8(0x89cf69,1);f.put(f.car+0x454,20000);f.put(f.car+0x45c,500);f.put(f.car+0x460,100000);
 f.change('online',true);f.change('nos',true);const before=Buffer.from(new Uint8Array(f.memory.buffer));f.run(6);
 const states=f.log().events.filter(e=>e.event==='state').map(e=>e.data),first=states.find(s=>s.nosTelemetry&&s.nosSinceTicks===100000);
 assert.ok(first);assert.equal(first.nosClockNetwork,true);assert.equal(first.nosClockTicks,140000);assert.equal(first.nosRemainingTicks,500);assert.equal(first.nosElapsedTicks,40000);
 assert.equal(f.d.getUint32(f.car+0x460,true),100000);assert.equal(f.d.getUint32(f.car+0x45c,true),500);assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer)),before);
 assert.equal(f.nodes.nos.checked,false);assert.equal(f.nodes.nos.disabled,true);assert.match(f.nodes['nos-state'].textContent,/Refill unavailable/);
 for(const event of f.log().events)if(event.data.tools)assert.equal(event.data.tools.nos,false);
 assert.equal(f.prefs().ai,false);assert.equal(f.prefs().drag,false);assert.equal(f.prefs().nos,true);assert.equal(f.prefs().online,true);
});
test('unknown and older profile pages do not log new NOS state from metadata alone',async()=>{
 for(const options of [{revision:'93af6ccb',profile:require('../extension/next-profile.js'),verified:false},{revision:'2f0ddd3b',profile:require('../extension/current-profile.js')}]){
  const f=await fixture(null,true,false,options);f.run(8);for(const e of f.log().events.filter(e=>e.event==='state'))assert.equal('nosTelemetry' in e.data,false);
 }
});
