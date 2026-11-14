'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const Hub=require('../extension/race-hub.js'),Stats=require('../extension/race-stats.js'),Profiles=require('../extension/tool-profiles.js'),profile=require('../extension/modern-profile.js');
// Run the production page, hub and statistics using the existing diagnostic-page
// DOM/worker fixture. Only car identity/catalogue are supplied as bounded doubles.
const file=require.resolve('./diagnostics-page.test.cjs'),baseRequire=createRequire(file),ctx={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nthis.makeFixture=fixture;',ctx,{filename:file});
const makeFixture=ctx.makeFixture;
async function actual(options={}){
  let instance,clock=1000;const tags={carKey:'r34'},telemetryCalls=[],catalogCalls=[];
  const raceTelemetry={readCar:(...args)=>{telemetryCalls.push(args);return {carKey:tags.carKey,stockName:'PRIVATE_STOCK_NAME',stockHash:0xe00000,playerName:'PRIVATE_PLAYER',car:0xe01000};}};
  const raceCatalog={LAYOUTS:[{trackId:4715,reverse:false,raceType:'url'},{trackId:4715,reverse:true,raceType:'url'}],classify:(trackId,flags)=>{catalogCalls.push({trackId,flags});return flags.outrun?'outrun':flags.drag?'drag':flags.drift?'drift':flags.streetX?'street-x':'url';}};
  const raceStats={create:settings=>(instance=Stats.create({...settings,clock:()=>clock+=50}))};
  const selectedProfile=options.withDyno?require('../extension/next-profile.js'):profile;
  const f=await makeFixture(null,true,options.withDyno===true,{revision:selectedProfile.revision,profile:selectedProfile,raceHub:Hub,raceStats,raceTelemetry,raceCatalog,...options});
  return {...f,stats:()=>instance.snapshot(),statsInstance:()=>instance,tags,telemetryCalls,catalogCalls};
}
function race(f){f.put(0x89e7b0,1);f.put(0x89e7a0,4715);f.drive(1);f.d.setFloat32(f.car+0x430,25,true);}
function owned(f){f.change('ai',true);f.aiLog.owned=true;}
function exportStats(f){f.click('race-hub-export');return f.downloads.at(-1).text().then(JSON.parse);}
test('hub open/close changes presentation only and keeps AI settings and guest memory intact',async()=>{
  const f=await actual();f.run(8);const before=Buffer.from(f.memory.buffer),prefs=JSON.stringify(f.prefs()),stops=f.aiLog.stops,updates=f.aiLog.updates.length;
  assert.match(f.html(),/id="race-hub"[^>]+hidden/);assert.equal(f.nodes['race-hub-open'].disabled,false);
  f.click('race-hub-open');assert.equal(f.nodes['race-hub'].hidden,false);assert.equal(f.nodes['race-hub-open'].attrs['aria-expanded'],'true');assert.equal(f.nodes['info-hud'].hidden,true);
  f.click('race-hub-close');assert.equal(f.nodes['race-hub'].hidden,true);assert.equal(f.nodes['race-hub-open'].attrs['aria-expanded'],'false');assert.equal(f.nodes['info-hud'].hidden,false);
  assert.equal(JSON.stringify(f.prefs()),prefs);assert.equal(!!f.prefs().ai,false);assert.equal(f.aiLog.stops,stops);assert.equal(f.aiLog.updates.length,updates);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('hub observes active supported races automatically while closed, then renders observation labels',async()=>{
  const f=await actual();race(f);owned(f);f.run(8);
  const stats=f.stats();assert.equal(stats.observedRuns,1);assert.equal(stats.r34.observedRuns,1);assert.ok(stats.aiDrivingSeconds>0);assert.equal(stats.peakNativeSpeed,25);assert.equal(stats.byType[0].raceType,'url');assert.equal(stats.byTrack[0].trackId,4715);
  assert.equal(stats.wins,null);assert.equal(stats.confirmedResultsAvailable,false);
  assert.equal(f.telemetryCalls.at(-1)[2].verified,true);assert.equal(f.telemetryCalls.at(-1)[2].moduleHash,profile.hash);
  f.click('race-hub-open');assert.equal(f.nodes['hub-runs'].textContent,'1');assert.equal(f.nodes['hub-peak'].textContent,'25');assert.equal(f.nodes['hub-run-0-peak'].textContent,'25');assert.equal(f.nodes['hub-mode-url'].textContent,'1');assert.equal(f.nodes['hub-run-0-track'].textContent,'Airport Circuit Track 5');assert.equal(f.nodes['hub-run-0-mode'].textContent,'URL');assert.match(f.html(),/Observed, not finishes/);assert.match(f.html(),/Peak native units\/s/);
});
test('unknown track IDs retain segments without increasing seen-track coverage',async()=>{
  const f=await actual();race(f);f.put(0x89e7a0,0xffffffff);f.run(8);f.click('race-hub-open');
  assert.equal(f.stats().observedRuns,1);assert.equal(f.stats().runs[0].trackId,null);assert.equal(f.nodes['hub-runs'].textContent,'1');assert.equal(f.nodes['hub-tracks'].textContent,'0');assert.equal(f.nodes['hub-run-0-track'].textContent,'Unknown location');
});
test('real catalogue classifies forced and variant modes from validated telemetry, including conflicts',async()=>{
  const raceCatalog=require('../extension/race-catalog.js');
  for(const [label,flags,expected]of [['forced-drag',[[0x890108,1]],'drag'],['forced-drift',[[0x890104,1]],'drift'],['drift-variant',[[0x890114,1]],'drift'],['conflicting-forced-modes',[[0x890108,1],[0x890104,1]],'unknown']]){
    const f=await actual({raceCatalog});race(f);for(const [address,value]of flags)f.put(address,value);f.run(8);
    assert.equal(f.stats().observedRuns,1,label);assert.equal(f.stats().runs[0].raceType,expected,label);f.click('race-hub-open');assert.equal(f.nodes['hub-mode-'+expected].textContent,'1',label);
  }
});
test('unsupported builds, free roam, pre-GO and unfocused driving create no race segments',async()=>{
  for(const [label,setup,options]of [
    ['unsupported',f=>race(f),{verified:false}],['free-roam',f=>{f.put(0x89e7b0,0);f.drive(2);},{}],['pre-GO',f=>{race(f);f.drive(0);},{}],['unfocused',f=>{race(f);f.focus(false);},{}]
  ]){
    const f=await actual(options);setup(f);owned(f);f.run(8);assert.equal(f.stats().observedRuns,0,label);assert.equal(f.stats().aiDrivingSeconds,0,label);
  }
});
test('a manual race is an observed segment but time requires current AI ownership',async()=>{
  const f=await actual();race(f);f.run(8);assert.equal(f.stats().observedRuns,1);assert.equal(f.stats().aiDrivingSeconds,0);
  f.change('ai',true);f.run(8);assert.equal(f.stats().aiDrivingSeconds,0);
  f.aiLog.owned=true;f.run(8);assert.ok(f.stats().aiDrivingSeconds>0);
});
test('network opt-out and an AI switch do not receive AI driving-time credit',async()=>{
  const f=await actual();race(f);owned(f);f.put(0x850078,8);f.run(8);assert.equal(f.stats().observedRuns,0);
  f.change('online',true);f.run(8);assert.equal(f.stats().observedRuns,1);assert.ok(f.stats().aiDrivingSeconds>0);
  const before=f.stats().aiDrivingSeconds;f.aiLog.cornerContext={switching:true};f.run(8);assert.equal(f.stats().aiDrivingSeconds,before);
  f.aiLog.cornerContext={switching:false};f.run(8);assert.ok(f.stats().aiDrivingSeconds>before);
});
test('pause, blur, hidden tab and tuner busy end observation without crediting the stopped interval',async()=>{
  const cases=[['pause',f=>{f.drive(0);f.run();}],['blur',f=>f.focus(false)],['hidden',f=>f.hidden(true)],['tuner',f=>{f.dynoLog.instance.busy=true;f.run();}]];
  for(const [label,pause]of cases){
    const f=await actual({withDyno:label==='tuner'});race(f);owned(f);f.run(8);const before=f.stats();pause(f);const paused=f.stats();
    assert.equal(paused.active,false,label);assert.equal(paused.aiDrivingSeconds,before.aiDrivingSeconds,label);f.run(8);assert.equal(f.stats().aiDrivingSeconds,before.aiDrivingSeconds,label);assert.equal(f.stats().wins,null,label);
  }
});
test('game exit, trap and replacement session immediately retire prior observations',async()=>{
  for(const [label,end]of [
    ['exit',f=>f.worker.emit({t:'exit'})],['trap',f=>f.worker.emit({t:'trap',msg:'unreachable'})],['new-session',f=>f.worker.postMessage({mod:new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0])),memory:f.memory,slot:0})]
  ]){
    const f=await actual();race(f);owned(f);f.run(8);const before=f.stats();end(f);assert.equal(f.stats().active,false,label);assert.equal(f.stats().aiDrivingSeconds,before.aiDrivingSeconds,label);assert.equal(f.stats().wins,null,label);
  }
});
test('clear statistics preserves saved profiles, selected tools and guest memory',async()=>{
  const profileStorage=new Map(),storage={getItem:key=>profileStorage.get(key)??null,setItem:(key,value)=>profileStorage.set(key,value),removeItem:key=>profileStorage.delete(key)};
  const settings={...Object.fromEntries(Profiles.FLAGS.map(key=>[key,false])),...Object.fromEntries(Object.entries(Profiles.NUMBERS).map(([key,[low]])=>[key,low])),drift:null,dynoGoal:'peakPower',nos:true,dragNoBlowout:true};
  Profiles.create(storage).save({name:'Keep my profile',settings});
  const f=await actual({profileStorage});race(f);owned(f);f.change('nos',true);f.run(8);f.click('race-hub-open');
  const saved=profileStorage.get(Profiles.KEY),prefs=JSON.stringify(f.prefs()),before=Buffer.from(f.memory.buffer),stops=f.aiLog.stops;
  f.click('race-hub-clear');assert.equal(f.stats().observedRuns,0);assert.equal(profileStorage.get(Profiles.KEY),saved);assert.equal(JSON.stringify(f.prefs()),prefs);assert.equal(f.aiLog.stops,stops);assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.match(f.nodes['hub-notice'].textContent,/statistics cleared/);
});
test('stats export is local bounded JSON and excludes runtime addresses, names and result claims',async()=>{
  const f=await actual();race(f);owned(f);f.run(8);f.click('race-hub-open');const before=Buffer.from(f.memory.buffer),prefs=JSON.stringify(f.prefs()),exported=await exportStats(f);
  assert.equal(exported.format,'NFSU2 Driving Tools observed race statistics');assert.equal(exported.observedRuns,1);assert.equal(exported.wins,null);assert.equal(exported.confirmedResultsAvailable,false);assert.equal(exported.speedUnits,'native-coordinate-units-per-native-second');assert.equal(exported.peakNativeSpeed,25);assert.ok(exported.runs.length<=200);assert.ok(JSON.stringify(exported).length*2<Stats.MAX_BYTES);
  assert.doesNotMatch(JSON.stringify(exported),/PRIVATE_|14680064|14684160|raceIdentity|sessionGeneration|stockName|stockHash|playerName|"car"|speedMps|peakSpeedMps/);
  assert.equal(f.downloads.length,1);assert.match(f.nodes['hub-notice'].textContent,/download requested/);assert.equal(JSON.stringify(f.prefs()),prefs);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('export stays bounded when local history has reached both retention limits',async()=>{
  const f=await actual();
  for(let i=0;i<Stats.MAX_RUNS+25;i++){
    f.statsInstance().observe({sessionGeneration:1,raceIdentity:'PRIVATE_RUNTIME_'+i,trackId:4000+i,raceType:i%2?'drag':'url',carKey:'r34',inRace:true,driving:true,aiOwned:true,nativeSpeed:25});
    f.statsInstance().observe({inRace:false,driving:false});
  }
  const exported=await exportStats(f),raw=await f.downloads.at(-1).text();
  assert.ok(exported.observedRuns>0);assert.ok(exported.observedRuns<=Stats.MAX_RUNS);assert.ok(raw.length*2<=Stats.MAX_BYTES*4,'pretty JSON and aggregate coverage are bounded separately from compact stored records');assert.doesNotMatch(raw,/PRIVATE_RUNTIME_|raceIdentity|sessionGeneration/);
});
test('unavailable browser storage keeps the hub usable in memory without changing controls',async()=>{
  const localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
  const f=await actual({localStorage});race(f);owned(f);f.run(8);f.click('race-hub-open');
  assert.equal(f.stats().storageAvailable,false);assert.equal(f.stats().observedRuns,1);assert.match(f.nodes['hub-storage'].textContent,/in memory.*unavailable/);assert.equal(f.prefs().ai,true);
  const exported=await exportStats(f);assert.equal(exported.observedRuns,1);f.click('race-hub-clear');assert.equal(f.stats().observedRuns,0);assert.equal(f.prefs().ai,true);
});
test('F7, F9 and the hub stop remain active while the hub is open',async()=>{
  for(const [label,stop]of [['F7',f=>f.press('F7',true)],['F9',f=>f.press('F9',true)],['Hub Stop',f=>f.click('race-hub-stop')]]){
    const f=await actual();race(f);owned(f);f.change('nos',true);f.change('online',true);f.run(8);f.click('race-hub-open');const stops=f.aiLog.stops;
    stop(f);assert.equal(f.prefs().ai,false,label);assert.equal(f.nodes.ai.checked,false,label);assert.ok(f.aiLog.stops>stops,label);assert.equal(f.stats().active,false,label);
    if(label!=='F7'){assert.equal(f.prefs().nos,false,label);assert.equal(f.prefs().online,false,label);}else assert.equal(f.prefs().nos,true,label);
  }
});
test('close and Escape restore the existing HUD preference without changing menu selections',async()=>{
  const f=await actual();f.run(8);f.click('race-hub-open');f.press('Escape');assert.equal(f.nodes['race-hub'].hidden,true);assert.equal(f.nodes['info-hud'].hidden,false);
  f.change('info-hud-enable',false);f.click('race-hub-open');f.click('race-hub-close');assert.equal(f.nodes['info-hud'].hidden,true);assert.equal(f.sessions.get('nfsu2-driving-tools-info-hud-v1'),'0');
  f.change('info-hud-enable',true);f.press('F8');assert.equal(f.nodes['tools-panel'].hidden,false);f.click('race-hub-open');f.click('race-hub-close');assert.equal(f.nodes['info-hud'].hidden,true);assert.equal(f.nodes['tools-panel'].hidden,false);
});
test('missing optional hub modules leave existing controls and HUD functional',async()=>{
  const f=await makeFixture(null,true,false,{revision:profile.revision,profile});f.run(8);
  assert.equal(f.nodes['race-hub-open'].disabled,true);f.change('ai',true);f.run();assert.equal(f.prefs().ai,true);f.press('F7');assert.equal(f.prefs().ai,false);assert.equal(f.nodes['info-hud'].hidden,false);
});
