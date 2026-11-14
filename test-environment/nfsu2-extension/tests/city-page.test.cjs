'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const City=require('../extension/city-pacing.js'),profile=require('../extension/modern-profile.js'),Profiles=require('../extension/tool-profiles.js');
const coreFile=require.resolve('../tests/core.test.cjs'),baseRequire=createRequire(coreFile),pageFile=require.resolve('../extension/page.js');
const sourcePage=fs.readFileSync(pageFile,'utf8');
let source=fs.readFileSync(coreFile,'utf8');
const replace=(before,after)=>{assert.equal(source.split(before).length-1,1);source=source.replace(before,after);};
replace('    stop(){aiLog.stops++;}',"    status(){return {available:true,ready:true,active:aiLog.owned===true,owned:aiLog.owned===true,switching:false,...aiLog.cityState};}\n    stop(){aiLog.stops++;}");
replace('initial: 256, maximum: 300, shared: true','initial: 256, maximum: 12000, shared: true');
const customRequire=Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve});
const context={require:customRequire,console,Buffer,WebAssembly,URL,Blob,setImmediate};vm.runInNewContext(source+'\nthis.makeCityFixture=pageFixture;',context,{filename:coreFile});
async function actual(options={}){const f=await context.makeCityFixture(options.saved||null,true,options.withDyno===true,{revision:profile.revision,profile,cityPacing:City,...options});f.run();return f;}
function onlineOwner(f,{barrier=30}={}){
 const driver=0xe06000,bars=0xe0c000;f.put(0x850078,8);f.put(0x89e7b0,0);f.drive(2);f.change('online',true);f.change('ai',true);
 f.put(f.car+0x24,3);f.put(f.car+0x2c,driver);f.put(driver,0x785370);f.put(driver+4,f.car);f.aiLog.owned=true;
 f.d.setFloat32(f.car+0x90,1,true);f.d.setFloat32(f.car+0x430,60,true);
 f.put(0x88f730,barrier===null?0:1);f.put(0x88f734,bars);[barrier||0,-10,barrier||0,10].forEach((v,i)=>f.d.setFloat32(bars+i*4,v,true));f.d.setUint8(bars+16,1);
}
const last=f=>f.aiLog.updates.at(-1),enable=f=>f.change('city-pace',true);
test('session city control defaults off and adds no saved profile fields',async()=>{
 const f=await actual();assert.equal(f.nodes['city-pace'].checked,false);assert.equal(f.nodes['city-pace'].disabled,false);assert.equal(last(f).enabled,false);
 assert.equal('cityPacing' in f.prefs(),false);assert.equal('cityPacingEnabled' in f.prefs(),false);assert.match(f.html(),/No new steering, route following or collision guarantee/);assert.match(f.html(),/Manual leaves it dormant/);
 const scripts=JSON.parse(fs.readFileSync(path.join(path.dirname(pageFile),'manifest.json'),'utf8')).content_scripts[0].js;
 assert.equal(scripts[scripts.indexOf('dynamic-pacing.js')+1],'city-contact-preview.js');assert.equal(scripts[scripts.indexOf('city-contact-preview.js')+1],'city-pacing.js');assert.equal(scripts.includes('city-pacing.js'),true);assert.ok(scripts.indexOf('city-pacing.js')<scripts.indexOf('page.js'));
 assert.equal(fs.readFileSync(pageFile,'utf8'),sourcePage);
});
test('city control sends only the effective ordinary free-roam pace and retains every selected setting',async()=>{
 const f=await actual();onlineOwner(f);f.change('ai-pace',true);f.input('pace-factor',3);f.change('corner-assist',true);f.run(2);
 const prefs=JSON.stringify(f.prefs()),before=Buffer.from(f.memory.buffer);enable(f);f.run(8);
 assert.equal(last(f).mode,2);assert.equal(last(f).pace,3);assert.equal(last(f).cityPace,.75);assert.equal(last(f).adaptivePace,null);assert.equal(last(f).adaptiveCorners,false);assert.equal(last(f).raceCornerAssist,false);assert.equal(last(f).cornerAssist,true);
 assert.equal(JSON.stringify(f.prefs()),prefs);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.match(f.nodes['city-pace-state'].textContent,/Observed clearance.*0\.75× requested/);
 assert.match(f.nodes['hud-pace'].textContent,/City 0\.75× req/);assert.doesNotMatch(f.nodes['hud-pace'].textContent,/3\.00× req/);assert.match(f.nodes['ai-pace-state'].textContent,/0\.75× city request.*selected factor retained/);
});
test('clear or unknown observations retain the explicit city pace selection above1x',async()=>{
 const f=await actual();onlineOwner(f,{barrier:null});f.change('ai-pace',true);f.input('pace-factor',3);enable(f);f.run(250);
 assert.equal(last(f).pace,3);assert.equal(last(f).cityPace,3);assert.equal(f.prefs().paceFactor,3);assert.match(f.nodes['city-pace-state'].textContent,/Selected pace ceiling.*3\.00× requested/);assert.doesNotMatch(f.html(),/max 1×|Maximum 1×|at or below your selected free-roam factor and 1×/);
 f.input('pace-factor',.8);f.run(8);assert.equal(last(f).pace,.8);assert.equal(last(f).cityPace,.8);
});
test('city selection cannot enable AI or online permission and waits for real local driver ownership',async()=>{
 const f=await actual();enable(f);f.run(8);assert.equal(last(f).enabled,false);assert.equal(!!f.prefs().online,false);assert.equal(!!f.prefs().ai,false);
 onlineOwner(f);f.aiLog.owned=false;f.run(8);assert.equal(last(f).pace,1);assert.match(f.nodes['city-pace-state'].textContent,/Waiting for current local AI ownership/);
 f.aiLog.owned=true;f.put(f.car+0x24,1);f.run(8);assert.equal(last(f).pace,1);assert.match(f.nodes['city-pace-state'].textContent,/Waiting for current local AI ownership/);
});
test('city acquisition and reacquisition retain the explicit pace without a hidden1x cap',async()=>{
 const f=await actual();onlineOwner(f,{barrier:null});enable(f);f.change('ai-pace',true);f.input('pace-factor',3);
 for(const owned of [false,true,false,true]){
  f.aiLog.owned=owned;f.run(8);
  assert.equal(last(f).pace,3);assert.equal(last(f).cityPace,owned?3:null);assert.equal(f.prefs().paceFactor,3);
  if(!owned)assert.match(f.nodes['city-pace-state'].textContent,/ownership/);
 }
});

test('online permission withdrawal immediately stops native requests and leaves city dormant',async()=>{
 const f=await actual();onlineOwner(f);enable(f);f.run(8);assert.equal(last(f).cityPace,.75);f.change('online',false);f.run();
 assert.equal(last(f).enabled,true);assert.equal(last(f).safe,false);assert.equal(last(f).allowNetwork,false);assert.equal(last(f).cityPace,null);assert.equal(f.nodes['city-pace'].checked,true);assert.match(f.nodes['city-pace-state'].textContent,/Allow network tools/);
});

test('city status distinguishes missing consent from an absent online free-roam session',async()=>{
 const f=await actual();enable(f);assert.equal(f.nodes['city-pace-state'].textContent,'Allow network tools is off');
 assert.equal(!!f.prefs().online,false);assert.equal(!!f.prefs().ai,false);f.run();assert.equal(f.nodes['city-pace-state'].textContent,'Allow network tools is off');
 f.change('online',true);f.run();assert.equal(f.nodes['city-pace-state'].textContent,'Waiting for an online free-roam session');
 f.change('online',false);f.run();assert.equal(f.nodes['city-pace-state'].textContent,'Allow network tools is off');
});

test('page passes its exact verified hash so port-only online flags admit city pacing only after consent',async()=>{
 const f=await actual();onlineOwner(f);f.put(0x850078,1);f.change('online',false);
 const cells=require('../extension/forward-native-config.js').select(profile.hash).runtime.onlineAddresses;
 f.memory.grow(Math.ceil((Math.max(...cells)+4)/65536)-256);const ports=new DataView(f.memory.buffer);
 ports.setUint32(cells[0],1,true);ports.setUint8(cells[1],1);ports.setUint32(cells[2],1,true);
 enable(f);f.run();assert.equal(last(f).state.network,true);assert.equal(last(f).safe,false);assert.equal(last(f).allowNetwork,false);assert.equal(f.nodes['city-pace-state'].textContent,'Allow network tools is off');
 f.change('online',true);f.run(8);assert.equal(last(f).state.network,true);assert.equal(last(f).allowNetwork,true);assert.equal(last(f).cityPace,.75);assert.match(f.nodes['city-pace-state'].textContent,/Observed clearance/);
 f.change('online',false);f.run();assert.equal(last(f).safe,false);assert.equal(f.nodes['city-pace'].checked,true);assert.equal(f.nodes['city-pace-state'].textContent,'Allow network tools is off');
 assert.deepEqual([ports.getUint32(cells[0],true),ports.getUint8(cells[1]),ports.getUint32(cells[2],true)],[1,1,1]);
});
test('race, Street X, Drag, Drift, Outrun and solo contexts retain their existing pace paths',async()=>{
 const cases=[['race',f=>{f.put(0x89e7b0,1);f.drive(1);}],['Street X',f=>{f.d.setUint8(0x89e7e3,1);}],['Drag',f=>{f.d.setUint8(0x89e7d8,1);}],['forced Drag',f=>f.put(0x890108,1)],['Drift',f=>f.d.setUint8(0x89e7d9,1)],['forced Drift',f=>f.put(0x890104,1)],['Drift variant',f=>f.put(0x890114,1)],['Outrun',f=>{f.put(0x89e7b0,7);f.drive(1);}],['solo',f=>f.put(0x850078,1)]];
 for(const [label,setup]of cases){const f=await actual();onlineOwner(f);f.change('ai-pace',true);f.input('pace-factor',1.5);f.change('race-pace',true);f.input('race-pace-factor',1.8);enable(f);setup(f);f.run(8);assert.equal(f.nodes['city-pace'].checked,true,label);assert.doesNotMatch(f.nodes['city-pace-state'].textContent,/slowing pace request/,label);assert.notEqual(last(f).pace,.75,label);assert.equal(last(f).cityPace,null,label);assert.equal(f.prefs().racePaceFactor,1.8,label);assert.equal(f.prefs().paceFactor,1.5,label);}
});
test('focus, hidden, dialog and tuner pauses cannot retain an active city request',async()=>{
 for(const pause of [f=>f.focus(false),f=>f.hidden(true),f=>f.gameDialog(true)]){
  const f=await actual();onlineOwner(f);enable(f);f.run(8);pause(f);f.run();assert.equal(last(f).safe,false);assert.notEqual(last(f).pace,.75);assert.equal(f.nodes['city-pace'].checked,true);
 }
 const old=require('../extension/next-profile.js'),f=await actual({withDyno:true,profile:old,revision:old.revision});onlineOwner(f);enable(f);f.run(8);const n=f.aiLog.updates.length;f.dynoLog.instance.busy=true;f.run();assert.equal(f.aiLog.updates.length,n);assert.equal(f.nodes['city-pace'].checked,true);
});
test('F7 keeps city selected but dormant; F9 and Stop clear it without deleting profiles',async()=>{
 const f=await actual();onlineOwner(f);enable(f);f.run(8);f.press('F7');f.run();assert.equal(f.nodes['city-pace'].checked,true);assert.equal(f.prefs().ai,false);assert.match(f.nodes['city-pace-state'].textContent,/waiting for Automatic driver/);
 for(const stop of [f=>f.press('F9'),f=>f.click('quick-stop')]){f.change('ai',true);enable(f);f.run(4);stop(f);assert.equal(f.nodes['city-pace'].checked,false);assert.equal(f.prefs().ai,false);assert.equal(f.prefs().online,false);}
});
test('profiles keep their exact old schema; profile Load and reload clear the session-only city choice',async()=>{
 const f=await actual();onlineOwner(f);enable(f);f.run(4);f.input('profile-name','Existing settings only');f.click('profile-save');await new Promise(r=>setImmediate(r));
 const saved=JSON.parse(f.profileStorage.get(Profiles.KEY)),entry=saved.profiles[0];assert.ok(entry);assert.equal(Object.keys(entry.settings).some(key=>/city/i.test(key)),false);
 f.change('profile-select',entry.id);f.click('profile-load');await new Promise(r=>setImmediate(r));assert.equal(f.nodes['city-pace'].checked,false);assert.equal(JSON.parse(f.profileStorage.get(Profiles.KEY)).profiles[0].id,entry.id);
 const again=await actual({saved:f.stored(),profileStorage:f.profileStorage});assert.equal(again.nodes['city-pace'].checked,false);assert.equal(again.nodes.ai.checked,false);
});
test('missing city backend leaves all existing controls usable',async()=>{
 const f=await actual({cityPacing:null});assert.equal(f.nodes['city-pace'].disabled,true);f.change('ai',true);f.run();assert.equal(last(f).enabled,true);f.press('F7');assert.equal(f.prefs().ai,false);
});
