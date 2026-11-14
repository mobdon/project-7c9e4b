'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const file=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(file),ctx={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.fixture=fixture;',ctx,{filename:file});
const profile=require('../extension/next-profile.js'),TP=require('../extension/tool-profiles.js');
const fixture=(extra={},dyno=false,saved=null)=>ctx.fixture(saved,true,dyno,{revision:profile.revision,profile,...extra});
const copy=f=>Buffer.from(new Uint8Array(f.memory.buffer)),last=f=>f.aiLog.updates.at(-1),state=f=>f.log().events.filter(e=>e.event==='state').at(-1).data;
const race=(f,{hud=1,type=1,phase=4,drag=false}={})=>{f.drive(hud);f.put(0x89e7b0,type);f.put(f.race,phase);f.d.setUint8(0x89e7d8,drag?1:0);};
const arm=f=>f.change('race-only-ai',true),tick=f=>f.run(8),release=(f,code)=>f.fire({type:'keyup',code,isTrusted:true});
test('race-only is off by default, keeps existing profiles/schema intact and never enables AI by itself',async()=>{
 const f=await fixture();race(f);const before=copy(f);tick(f);assert.equal(last(f).enabled,false);assert.equal(f.nodes['race-only-ai'].checked,false);assert.equal(state(f).tools.raceOnlyAI,false);assert.deepEqual(copy(f),before);assert.equal('raceOnlyAI' in f.prefs(),false);
});
test('race-only acquires on active race and releases in roam/results while staying armed between races',async()=>{
 const f=await fixture();race(f,{hud:2,type:0});arm(f);tick(f);assert.equal(last(f).enabled,false);assert.equal(f.nodes['race-only-ai'].checked,true);assert.equal(f.nodes.ai.checked,false);
 race(f);tick(f);assert.equal(last(f).enabled,true);assert.equal(last(f).mode,1);assert.equal(state(f).raceOnlyRequested,true);assert.match(f.nodes['race-only-state'].textContent,/active/);
 for(const config of [{phase:6},{hud:2,type:0},{type:7},{phase:3}]){race(f,config);tick(f);assert.equal(last(f).enabled,false);assert.equal(state(f).raceOnlyRequested,false);assert.equal(f.nodes['race-only-ai'].checked,true);race(f);tick(f);assert.equal(last(f).enabled,true);}
});
test('race-only eligibility is exact across race type, HUD and phase combinations',async()=>{
 const f=await fixture();arm(f);for(const type of [0,1,2,7,255])for(const hud of [0,1,2,3])for(const phase of [0,3,4,5,6]){race(f,{type,hud,phase});f.run();assert.equal(last(f).enabled,type===1&&hud===1&&phase===4,JSON.stringify({type,hud,phase}));}
});
test('race-only preserves Street X and native Drag/Drift requests without substituting road settings',async()=>{
 const modes=[()=>{},f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>f.d.setUint8(0x89e7d8,1),f=>f.d.setUint8(0x89e7d9,1),f=>f.put(0x890104,1),f=>f.put(0x890114,1)];
 for(const mode of modes){const outcomes=[];for(const only of [false,true]){const f=await fixture();race(f);mode(f);f.change('race-pace',true);f.input('race-pace-factor',1.5);f.change('race-corner-assist',true);f.input('race-corner-factor',.85);f.input('race-braking',.75);only?arm(f):f.change('ai',true);tick(f);outcomes.push(JSON.parse(JSON.stringify(last(f))));}assert.deepEqual(outcomes[1],outcomes[0]);}
});
test('race-only online permission gates every network signal and withdrawal keeps arm but releases request',async()=>{
 for(const signal of [f=>f.put(0x850078,8),f=>f.put(0x866a14,1),f=>f.put(0x8669f4,1),f=>f.d.setUint8(0x89cf69,1)]){const f=await fixture();race(f);signal(f);arm(f);tick(f);assert.equal(last(f).enabled,false);f.change('online',true);tick(f);assert.equal(last(f).enabled,true);assert.equal(last(f).allowNetwork,true);f.change('online',false);tick(f);assert.equal(last(f).enabled,false);assert.equal(f.nodes['race-only-ai'].checked,true);assert.equal(state(f).paceConfirmed,false);}
});
test('race-only fails closed for unsupported/unready or missing AI/Drag capability',async()=>{
 for(const extra of [{verified:false},{profile:{...profile,capabilities:{...profile.capabilities,ai:false}}},{profile:{...profile,capabilities:{...profile.capabilities,dragAI:false}}}]){const f=await fixture(extra);race(f,{drag:true});arm(f);tick(f);assert.equal(last(f).enabled,false);}
 const f=await fixture();race(f);arm(f);f.put(f.player+4,0);tick(f);assert.equal(last(f).enabled,false);
});
test('visibility, focus, dialog and tuner pauses suppress race-only request but do not forget arming',async()=>{
 for(const [pause,resume] of [[f=>f.hidden(true),f=>f.hidden(false)],[f=>f.focus(false),f=>f.focus(true)],[f=>f.gameDialog(true),f=>f.gameDialog(false)]]){const f=await fixture();race(f);arm(f);tick(f);assert.equal(last(f).enabled,true);pause(f);tick(f);assert.equal(last(f).enabled,false);assert.equal(f.nodes['race-only-ai'].checked,true);resume(f);tick(f);assert.equal(last(f).enabled,true);}
 const f=await fixture({},true);race(f);arm(f);tick(f);f.change('dyno-enable',true);f.click('dyno-find');await new Promise(r=>setImmediate(r));const n=f.aiLog.updates.length;tick(f);assert.equal(f.aiLog.updates.length,n);assert.equal(state(f).raceOnlyRequested,false);assert.equal(f.nodes['race-only-ai'].checked,true);f.dynoLog.instance.finish();await new Promise(r=>setImmediate(r));tick(f);assert.equal(last(f).enabled,true);
});
test('F7 F9 and Stop always disarm race-only while waiting or active',async()=>{
 for(const mode of [{hud:2,type:0},{phase:3},{}])for(const action of [f=>f.press('F7'),f=>f.press('F9'),f=>f.click('stop')]){const f=await fixture();race(f,mode);arm(f);tick(f);action(f);assert.equal(f.nodes['race-only-ai'].checked,false);race(f);tick(f);assert.equal(last(f).enabled,false);assert.equal(f.nodes.ai.checked,false);}
});
test('race driving keys disarm in countdown/active race, but free-roam and outrun manual driving preserve arm',async()=>{
 for(const code of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space'])for(const phase of [3,4]){const f=await fixture();race(f,{phase});arm(f);f.press(code);assert.equal(f.nodes['race-only-ai'].checked,false,code);release(f,code);race(f);tick(f);assert.equal(last(f).enabled,false);}
 for(const type of [0,7]){const f=await fixture();race(f,{type,hud:2});arm(f);f.press('ArrowLeft');assert.equal(f.nodes['race-only-ai'].checked,true);release(f,'ArrowLeft');race(f);tick(f);assert.equal(last(f).enabled,true);}
});
test('held free-roam driving input prevents race acquisition until release without changing manual AI mode',async()=>{
 const f=await fixture();race(f,{type:0,hud:2});arm(f);f.press('ArrowUp');race(f);tick(f);assert.equal(last(f).enabled,false);assert.equal(state(f).raceOnlyInputClear,false);assert.equal(f.nodes['race-only-ai'].checked,true);release(f,'ArrowUp');tick(f);assert.equal(last(f).enabled,true);
});
test('UI range keys do not disarm race-only, but F7 from UI does',async()=>{
 const f=await fixture();race(f);arm(f);for(const key of ['ArrowLeft','ArrowRight','Space']){f.press(key,true);assert.equal(f.nodes['race-only-ai'].checked,true);tick(f);assert.equal(last(f).enabled,true);}f.press('F7',true);assert.equal(f.nodes['race-only-ai'].checked,false);
});
test('selecting either AI mode disables the other and race-only off does not re-enable all-modes AI',async()=>{
 const f=await fixture();race(f,{type:0,hud:2});f.change('ai',true);tick(f);assert.equal(last(f).enabled,true);arm(f);tick(f);assert.equal(last(f).enabled,false);assert.equal(f.nodes.ai.checked,false);f.change('ai',true);tick(f);assert.equal(last(f).enabled,true);assert.equal(f.nodes['race-only-ai'].checked,false);arm(f);race(f);tick(f);f.change('race-only-ai',false);tick(f);assert.equal(last(f).enabled,false);assert.equal(f.nodes.ai.checked,false);
});
test('race-only HUD and exported pace confirmation use effective request rather than all-modes checkbox',async()=>{
 const f=await fixture();race(f);f.change('race-pace',true);f.input('race-pace-factor',1.5);f.aiLog.paceApplied=1.5;arm(f);tick(f);assert.equal(f.nodes.ai.checked,false);assert.equal(state(f).paceConfirmed,true);assert.match(f.nodes['hud-driver'].textContent,/AI active/);assert.match(f.nodes['hud-pace'].textContent,/ack/);f.aiLog.owned=true;race(f,{type:0,hud:2});tick(f);assert.equal(state(f).paceConfirmed,false);assert.equal('paceApplied' in state(f),false);assert.doesNotMatch(f.nodes['hud-driver'].textContent,/AI active/);assert.doesNotMatch(f.nodes['hud-pace'].textContent,/ack/);
});
test('race-only survives game reload within page only as arming, never exports old request on replacement',async()=>{
 const f=await fixture();race(f);arm(f);tick(f);f.worker.postMessage({mod:new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0])),memory:f.memory,slot:0});f.click('diagnostic-export');const d=JSON.parse(await f.downloads.at(-1).text()).events.at(-1).data;assert.equal(d.raceOnlyRequested,false);assert.equal('aiOwned' in d,false);assert.equal(f.nodes['race-only-ai'].checked,true);race(f,{type:0,hud:2});tick(f);assert.equal(last(f).enabled,false);
 const reload=await fixture({},false,f.stored());race(reload);tick(reload);assert.equal(reload.nodes['race-only-ai'].checked,false);assert.equal(last(reload).enabled,false);
});
test('named profile saves remain old schema and profile load explicitly clears race-only arming',async()=>{
 const f=await fixture();race(f);arm(f);f.input('profile-name','Race choices');f.click('profile-save');const saved=JSON.parse(f.profileStorage.get(TP.KEY)),p=saved.profiles[0];assert.equal('raceOnlyAI' in p.settings,false);assert.equal(p.settings.ai,false);const store=TP.create({getItem:k=>f.profileStorage.get(k)??null,setItem:(k,v)=>f.profileStorage.set(k,v),removeItem:k=>f.profileStorage.delete(k)});assert.equal(store.snapshot().available,true);
 f.change('profile-select',p.id);f.click('profile-load');tick(f);assert.equal(f.nodes['race-only-ai'].checked,false);assert.equal(last(f).enabled,false);assert.equal(f.profileStorage.get(TP.KEY),JSON.stringify(saved));
});
test('race-only observations reject non-boolean or unknown exported data',()=>{
 const log=require('../extension/diagnostics.js').create();log.record('state',{raceOnlyEligible:'true',raceOnlyRequested:1,raceOnlyInputClear:{},tools:{raceOnlyAI:'true'}});const d=JSON.parse(log.exportText()).events.at(-1).data;for(const k of ['raceOnlyEligible','raceOnlyRequested','raceOnlyInputClear'])assert.equal(k in d,false);assert.equal('raceOnlyAI' in d.tools,false);
});

test('race-only active row clears immediately on stop/trap/exit/tuner suspension without losing arm',async()=>{
 for(const pause of [f=>f.worker.emit({t:'exit'}),f=>f.worker.emit({t:'trap'}),f=>f.hidden(true),f=>f.focus(false)]){const f=await fixture();race(f);arm(f);tick(f);assert.match(f.nodes['race-only-state'].textContent,/Native race AI active/);pause(f);assert.doesNotMatch(f.nodes['race-only-state'].textContent,/Native race AI active/);tick(f);assert.doesNotMatch(f.nodes['race-only-state'].textContent,/Native race AI active/);assert.equal(f.nodes['race-only-ai'].checked,true);}
 const f=await fixture({},true);race(f);arm(f);tick(f);f.change('dyno-enable',true);f.click('dyno-find');await new Promise(r=>setImmediate(r));tick(f);assert.doesNotMatch(f.nodes['race-only-state'].textContent,/Native race AI active/);assert.equal(f.nodes['race-only-ai'].checked,true);f.dynoLog.instance.finish();await new Promise(r=>setImmediate(r));
});
