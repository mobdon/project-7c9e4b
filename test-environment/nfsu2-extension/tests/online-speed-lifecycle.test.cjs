'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'tests/diagnostics-page.test.cjs'),baseRequire=createRequire(file);
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.fixture=fixture;',context,{filename:file});
const fixture=context.fixture,latest=f=>f.log().events.filter(e=>e.event==='state').at(-1).data;
const copy=memory=>Buffer.from(new Uint8Array(memory.buffer));
test('independent: tools-off ticks and export leave a real copied guest memory snapshot unchanged',async()=>{
 const f=await fixture(null,true),before=copy(f.memory);f.run(220);f.click('diagnostic-export');assert.deepEqual(copy(f.memory),before);assert.equal(latest(f).powerStatus,'off');assert.equal(latest(f).paceConfirmed,false);
});
test('independent: hidden/HUD/network power pauses clear applied metadata and restore only owned power fields',async()=>{
 for(const pause of [f=>f.hidden(true),f=>f.drive(0),f=>f.put(0x850078,8)]){
  const f=await fixture(null,true);f.change('boost',true);f.run(8);assert.equal(latest(f).powerStatus,'applied');pause(f);f.run(8);assert.equal(latest(f).powerActive,false);assert.notEqual(latest(f).powerStatus,'applied');assert.equal('effectivePower' in latest(f),false);assert.equal(f.read(0x2dc),.5);
 }
});
test('independent: all finite pace acknowledgement bounds and enum values are enforced',()=>{
 const D=require(path.join(root,'extension/diagnostics.js')),log=D.create();
 for(const value of [-1,0,.749,3.001,Infinity,NaN,'1.5',null,{},[]]){log.record('state',{paceApplied:value,powerStatus:'bad value'});const s=JSON.parse(log.exportText()).events.at(-1).data;assert.equal('paceApplied' in s,false);assert.equal('powerStatus' in s,false);}
 for(const value of [.75,1,1.5,3]){log.record('state',{paceApplied:value});assert.equal(JSON.parse(log.exportText()).events.at(-1).data.paceApplied,value);}
});
test('regression: AI stop must clear pace acknowledgement even while native ownership is awaiting handback',async()=>{
 const f=await fixture(null,true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.5);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.run(8);assert.equal(latest(f).paceConfirmed,true);f.change('ai',false);f.run(8);assert.equal(f.aiLog.updates.at(-1).enabled,false);assert.equal(latest(f).paceConfirmed,false);assert.equal('paceApplied' in latest(f),false);
});
test('regression: withdrawn network permission must clear pace acknowledgement before native handback completes',async()=>{
 const f=await fixture(null,true);f.put(0x850078,8);f.change('online',true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.5);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.run(8);assert.equal(latest(f).paceConfirmed,true);f.change('online',false);f.run(8);assert.equal(f.aiLog.updates.at(-1).safe,false);assert.equal(latest(f).paceConfirmed,false);assert.equal('paceApplied' in latest(f),false);
});
test('regression: game exit must clear new power row after restoration, despite early return without an engine',async()=>{
 const f=await fixture(null,true);f.change('boost',true);f.run(8);assert.equal(latest(f).powerStatus,'applied');f.worker.emit({t:'exit'});f.run(8);assert.equal(f.read(0x2dc),.5);assert.doesNotMatch(f.nodes['power-state'].textContent,/Power fields set to/);
});
test('regression: tuner find must not keep prior applied power/pace evidence after suspending driving tools',async()=>{
 const f=await fixture(null,true,true);f.change('boost',true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.5);f.aiLog.paceApplied=1.5;f.run(8);assert.equal(latest(f).powerStatus,'applied');f.change('dyno-enable',true);f.click('dyno-find');await new Promise(resolve=>setImmediate(resolve));f.run(8);assert.equal(f.dynoLog.instance.busy,true);assert.equal(f.read(0x2dc),.5);assert.notEqual(latest(f).powerStatus,'applied');assert.equal(latest(f).paceConfirmed,false);assert.equal('paceApplied' in latest(f),false);assert.doesNotMatch(f.nodes['power-state'].textContent,/Power fields set to/);f.dynoLog.instance.finish();await new Promise(resolve=>setImmediate(resolve));f.run(8);assert.equal(latest(f).powerStatus,'applied');assert.equal(latest(f).paceConfirmed,true);
});

test('suspension immediately clears current power/pace export and UI without claiming native handback',async()=>{
 const f=await fixture(null,true);f.change('boost',true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.5);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.run(8);assert.equal(latest(f).powerStatus,'applied');
 f.hidden(true);f.click('diagnostic-export');const exported=JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;
 assert.equal(exported.powerStatus,'suspended');assert.equal(exported.powerActive,false);assert.equal(exported.paceConfirmed,false);assert.equal('paceApplied' in exported,false);assert.equal('effectivePower' in exported,false);assert.equal(exported.limiterRemoved,false);assert.equal(exported.aiOwned,true);assert.doesNotMatch(f.nodes['power-state'].textContent,/Power fields set to/);assert.doesNotMatch(f.nodes['ai-pace-state'].textContent,/confirmed/);
 f.hidden(false);f.run(8);assert.equal(latest(f).powerStatus,'applied');assert.equal(latest(f).paceConfirmed,true);
});
test('manual takeover and F9 clear pace export immediately before another timer tick',async()=>{
 for(const key of ['F7','F9']){
  const f=await fixture(null,true);f.change('boost',true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.5);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.run(8);f.press(key);f.click('diagnostic-export');const exported=JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;
  assert.equal(exported.paceConfirmed,false,key);assert.equal('paceApplied' in exported,false,key);assert.doesNotMatch(f.nodes['ai-pace-state'].textContent,/confirmed/,key);assert.equal(exported.aiOwned,true,key);
  if(key==='F9'){assert.equal(exported.powerStatus,'off');assert.equal(exported.powerActive,false);assert.match(f.nodes['power-state'].textContent,/^Off/);assert.equal(f.read(0x2dc),.5);}else{assert.equal(exported.powerStatus,'applied');assert.equal(f.read(0x2dc),.75);}
 }
});
test('AI checkbox stop clears immediate export without clearing independent power application',async()=>{
 const f=await fixture(null,true);f.change('boost',true);f.change('ai',true);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.run(8);f.change('ai',false);f.click('diagnostic-export');const exported=JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;
 assert.equal(exported.paceConfirmed,false);assert.equal('paceApplied' in exported,false);assert.equal(exported.powerStatus,'applied');assert.equal(exported.powerActive,true);assert.equal(f.read(0x2dc),.75);
});
test('switching and out-of-range observations do not confirm pace, then valid current evidence resumes',async()=>{
 const f=await fixture(null,true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.5);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.aiLog.cornerContext={switching:true};f.run(8);assert.equal(latest(f).paceConfirmed,false);assert.equal('paceApplied' in latest(f),false);assert.doesNotMatch(f.nodes['ai-pace-state'].textContent,/confirmed/);
 f.aiLog.cornerContext={};for(const value of [null,NaN,Infinity,.74,3.01]){f.aiLog.paceApplied=value;f.run(8);assert.equal(latest(f).paceConfirmed,false);assert.equal('paceApplied' in latest(f),false);}
 f.aiLog.paceApplied=1.5;f.run(8);assert.equal(latest(f).paceConfirmed,true);assert.equal(latest(f).paceApplied,1.5);assert.match(f.nodes['ai-pace-state'].textContent,/confirmed/);
});
test('new suspended and tuner-busy statuses remain bounded on export and persisted reload',()=>{
 const D=require(path.join(root,'extension/diagnostics.js')),stored=new Map();const storage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>{stored.set(key,value);}};const log=D.create({storage});
 for(const powerStatus of ['suspended','tuner-busy']){log.record('state',{powerStatus});assert.equal(JSON.parse(log.exportText()).events.at(-1).data.powerStatus,powerStatus);}
 const reload=D.create({storage});assert.deepEqual(JSON.parse(reload.exportText()).events.filter(e=>e.event==='state').map(e=>e.data.powerStatus),['suspended','tuner-busy']);
 reload.record('state',{powerStatus:'tuner-busy SECRET'});assert.equal('powerStatus' in JSON.parse(reload.exportText()).events.at(-1).data,false);assert.doesNotMatch(reload.exportText(),/SECRET/);
});

test('replacement boot clears prior application, ownership and generation before any timer tick',async()=>{
 for(const freshMemory of [false,true]){
  const f=await fixture(null,true);f.change('boost',true);f.change('ai',true);f.change('ai-pace',true);f.input('pace-factor',1.5);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.run(8);
  const previous=latest(f);assert.equal(previous.powerStatus,'applied');assert.equal(previous.paceConfirmed,true);assert.equal(previous.aiOwned,true);
  const memory=freshMemory?new WebAssembly.Memory({initial:256,maximum:65536,shared:true}):f.memory,before=freshMemory?copy(memory):null;
  const mod=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));f.worker.postMessage({mod,memory,slot:0});
  assert.equal(f.read(0x2dc),.5);if(before)assert.deepEqual(copy(memory),before);
  f.click('diagnostic-export');const state=JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;
  assert.equal(state.generation,previous.generation+1);assert.equal(state.ready,false);assert.equal(state.safe,false);assert.equal(state.powerStatus,'not-ready');assert.equal(state.powerActive,false);assert.equal(state.paceConfirmed,false);
  for(const field of ['paceApplied','effectivePower','aiOwned','aiActive','nativeHeartbeatAck','requestedPace','effectiveGrip','gripActive'])assert.equal(field in state,false,field);
  assert.match(f.nodes['power-state'].textContent,/Waiting for the current car/);assert.doesNotMatch(f.nodes['ai-pace-state'].textContent,/confirmed/);
 }
});
test('duplicate boot of the same module memory and worker retains current generation evidence',async()=>{
 const f=await fixture(null,true);f.change('boost',true);f.change('ai',true);f.aiLog.paceApplied=1.5;f.aiLog.owned=true;f.run(8);const previous=latest(f),before=copy(f.memory);
 f.worker.postMessage({mod:f.gameModule,memory:f.memory,slot:0});f.click('diagnostic-export');const state=JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;
 assert.equal(state.generation,previous.generation);assert.equal(state.powerStatus,'applied');assert.equal(state.paceConfirmed,true);assert.equal(state.aiOwned,true);assert.deepEqual(copy(f.memory),before);
});
