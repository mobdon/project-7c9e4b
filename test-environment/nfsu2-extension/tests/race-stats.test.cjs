const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {create,KEY,VERSION,SPEED_UNITS,MAX_RUNS,MAX_BYTES,MAX_GAP_MS}=require('../extension/race-stats.js');

function fixture(saved){
  let at=0,writes=0;
  const values=new Map(saved===undefined?[]:[[KEY,saved]]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes++;values.set(key,value);},removeItem:key=>values.delete(key)};
  const stats=create({storage,clock:()=>at});
  const data={sessionGeneration:1,raceIdentity:'opaque-current-race',trackId:4715,raceType:1,carKey:'r34',inRace:true,driving:true,aiOwned:true,nativeSpeed:32};
  return {stats,storage,values,data,tick:(time,change={})=>{at=time;return stats.observe({...data,...change});},setTime:time=>{at=time;},writes:()=>writes};
}

test('starts only from an identified active race driving observation',()=>{
  const f=fixture();
  for(const change of [{inRace:false},{driving:false},{raceIdentity:''},{sessionGeneration:-1},{sessionGeneration:Infinity}])assert.equal(f.tick(0,change).observedRuns,0);
  const s=f.tick(10);
  assert.equal(s.observedRuns,1);assert.equal(s.active,true);assert.equal(s.aiDrivingSeconds,0);
  assert.equal(s.runs[0].startedAt,10);assert.equal(s.runs[0].endedAt,null);assert.equal(s.runs[0].samples,1);
});

test('counts only consecutive AI-owned driving samples within the bounded gap',()=>{
  const f=fixture();
  f.tick(0);f.tick(50);f.tick(100,{aiOwned:false});f.tick(150);f.tick(250);
  assert.equal(f.stats.snapshot().aiDrivingSeconds,.15);
  f.tick(250+MAX_GAP_MS);assert.equal(f.stats.snapshot().aiDrivingSeconds,1.15);
  f.tick(251+MAX_GAP_MS*2);assert.equal(f.stats.snapshot().aiDrivingSeconds,1.15);
  f.tick(301+MAX_GAP_MS*2);assert.equal(f.stats.snapshot().aiDrivingSeconds,1.2);
});

test('menu, mode exit and requested result flags never confirm completion or a win',()=>{
  const f=fixture();f.tick(0);f.tick(100);
  let s=f.tick(500,{inRace:false,driving:false,completed:true,won:true,wins:20,confirmedResultsAvailable:true});
  assert.equal(s.aiDrivingSeconds,.1);assert.equal(s.active,false);assert.equal(s.runs[0].endReason,'race-exit');
  assert.equal(s.confirmedResultsAvailable,false);assert.equal(s.wins,null);
  assert.equal('completed' in s.runs[0],false);assert.equal('won' in s.runs[0],false);
  s=f.tick(600);assert.equal(s.observedRuns,2);
  s=f.tick(700,{driving:false});assert.equal(s.runs[1].endReason,'driving-ended');
});

test('generation, track, type and opaque race changes isolate observed runs',()=>{
  for(const change of [{sessionGeneration:2},{trackId:4716},{raceType:2},{raceIdentity:'replacement'}]){
    const f=fixture();f.tick(0);f.tick(50);
    const s=f.tick(100,change);
    assert.equal(s.observedRuns,2);assert.equal(s.aiDrivingSeconds,.05);assert.equal(s.runs[0].endReason,'identity-change');
    assert.equal(s.runs[1].aiMilliseconds,0);
  }
});

test('car categories never retroactively assign unknown or other samples to R34',()=>{
  const f=fixture();f.tick(0,{carKey:'unknown'});f.tick(100,{carKey:'unknown'});
  let s=f.tick(200);assert.equal(s.observedRuns,2);assert.equal(s.r34.observedRuns,1);assert.equal(s.r34.aiDrivingSeconds,0);
  s=f.tick(250);assert.equal(s.r34.aiDrivingSeconds,.05);
  s=f.tick(300,{carKey:'other'});assert.equal(s.observedRuns,3);assert.equal(s.r34.aiDrivingSeconds,.05);
});

test('coverage aggregates only recorded track and race categories',()=>{
  const f=fixture();f.tick(0);f.tick(100,{nativeSpeed:40});f.tick(150,{inRace:false});
  f.tick(200,{trackId:4003,raceType:'drag',carKey:'other'});f.tick(300,{trackId:4003,raceType:'drag',carKey:'other',nativeSpeed:45});
  const s=f.stats.snapshot();
  assert.equal(s.observedRuns,2);assert.equal(s.aiDrivingSeconds,.2);assert.equal(s.peakNativeSpeed,45);
  assert.deepEqual(s.byType,[{raceType:1,observedRuns:1,aiDrivingSeconds:.1,peakNativeSpeed:40},{raceType:'drag',observedRuns:1,aiDrivingSeconds:.1,peakNativeSpeed:45}]);
  assert.deepEqual(s.byTrack,[{trackId:4715,observedRuns:1,aiDrivingSeconds:.1,peakNativeSpeed:40},{trackId:4003,observedRuns:1,aiDrivingSeconds:.1,peakNativeSpeed:45}]);
  assert.deepEqual(s.r34,{observedRuns:1,aiDrivingSeconds:.1,peakNativeSpeed:40});
});

test('only valid sampled existing speed scalars can increase the peak',()=>{
  const f=fixture();f.tick(0,{nativeSpeed:undefined});
  for(const value of [NaN,Infinity,-1,501,'100',{valueOf:()=>500}])f.tick(50,{nativeSpeed:value});
  assert.equal(f.stats.snapshot().peakNativeSpeed,null);
  f.tick(100,{nativeSpeed:12.34567});assert.equal(f.stats.snapshot().peakNativeSpeed,12.346);
  f.tick(150,{nativeSpeed:0});assert.equal(f.stats.snapshot().peakNativeSpeed,12.346);
});
test('new statistics use explicit native units and reject misleading SI field inputs',()=>{
  const f=fixture();let s=f.tick(0,{nativeSpeed:undefined,speedMps:250,peakSpeedMps:300,speedUnits:'meters-per-second'});
  assert.equal(s.peakNativeSpeed,null);assert.equal(s.speedUnits,'native-coordinate-units-per-native-second');
  s=f.tick(100,{nativeSpeed:25});assert.equal(s.peakNativeSpeed,25);assert.equal(s.r34.peakNativeSpeed,25);
  assert.equal('peakSpeedMps' in s,false);assert.equal('speedMps' in s,false);
  f.tick(150,{inRace:false});const saved=JSON.parse(f.values.get(KEY));assert.equal(saved.speedUnits,SPEED_UNITS);assert.equal(saved.runs[0].peakNativeSpeed,25);assert.doesNotMatch(JSON.stringify(saved),/speedMps|peakSpeedMps|meters-per-second/);
});
test('stored statistics with missing or incompatible speed-unit metadata are not reinterpreted',()=>{
  const f=fixture();f.tick(0);f.tick(100,{inRace:false});const saved=JSON.parse(f.values.get(KEY));
  for(const unit of [undefined,'meters-per-second','native-coordinate-units-per-second']){
    const incompatible={...saved,speedUnits:unit};assert.equal(fixture(JSON.stringify(incompatible)).stats.snapshot().observedRuns,0);
  }
});

test('invalid categorical values remain unknown without retaining arbitrary text',()=>{
  const f=fixture();
  const s=f.tick(0,{trackId:0xe00000,raceType:'player secret name',carKey:'Nissan Skyline R34',chat:'private text'});
  assert.equal(s.runs[0].trackId,null);assert.equal(s.runs[0].raceType,'unknown');assert.equal(s.runs[0].carKey,'unknown');
  const saved=f.values.get(KEY);
  for(const secret of ['player secret name','Nissan Skyline R34','private text','opaque-current-race','14680064'])assert.equal(saved.includes(secret),false);
});

test('numeric opaque runtime identity and generation stay ephemeral',()=>{
  const f=fixture();f.tick(0,{sessionGeneration:900123,raceIdentity:14680064});
  const saved=f.values.get(KEY);
  assert.equal(saved.includes('14680064'),false);assert.equal(saved.includes('900123'),false);
  assert.equal(saved.includes('raceIdentity'),false);assert.equal(saved.includes('sessionGeneration'),false);
});

test('storage writes are throttled between starts and ends',()=>{
  const f=fixture();f.tick(0);
  for(let at=50;at<1000;at+=50)f.tick(at);
  assert.equal(f.writes(),1);
  f.tick(1000);assert.equal(f.writes(),2);
  f.tick(1050,{inRace:false});assert.equal(f.writes(),3);
  f.tick(1100);assert.equal(f.writes(),4);
});

test('a reloaded active observation becomes interrupted history without a result',()=>{
  const f=fixture();f.tick(0);f.tick(1000);
  const restored=create({storage:f.storage,clock:()=>2000});
  let s=restored.snapshot();
  assert.equal(s.active,false);assert.equal(s.observedRuns,1);assert.equal(s.runs[0].endedAt,1000);assert.equal(s.runs[0].endReason,'observation-interrupted');
  assert.equal(s.wins,null);assert.equal(s.confirmedResultsAvailable,false);
  s=restored.observe(f.data);assert.equal(s.observedRuns,2);assert.equal(s.runs[1].aiMilliseconds,0);
});

test('persisted records are revalidated and unknown fields cannot promote result claims',()=>{
  const f=fixture();f.tick(0);f.tick(1000,{nativeSpeed:40});f.tick(1050,{inRace:false});
  const saved=JSON.parse(f.values.get(KEY));
  saved.confirmedResultsAvailable=true;saved.wins=999;saved.runs[0].chat='do not retain';saved.runs[0].won=true;
  saved.runs.push({...saved.runs[0],id:2,aiMilliseconds:-1},{...saved.runs[0],id:3,peakNativeSpeed:Infinity},{...saved.runs[0],id:4,raceType:'private name'},{...saved.runs[0],id:5,endedAt:0},{...saved.runs[0],id:6,aiMilliseconds:5000});
  // JSON encodes Infinity as null, which is an allowed unavailable peak.
  saved.runs[2].peakNativeSpeed=600;
  const restored=fixture(JSON.stringify(saved));
  const s=restored.stats.snapshot();assert.equal(s.observedRuns,1);assert.equal(s.wins,null);assert.equal(s.confirmedResultsAvailable,false);
  assert.equal(JSON.stringify(s).includes('do not retain'),false);assert.equal('won' in s.runs[0],false);
});

test('duplicate persisted IDs are bounded and cannot duplicate a run',()=>{
  const f=fixture();f.tick(0);f.tick(50,{inRace:false});
  const saved=JSON.parse(f.values.get(KEY));saved.runs.push({...saved.runs[0]});
  assert.equal(fixture(JSON.stringify(saved)).stats.snapshot().observedRuns,1);
});

test('corrupt, oversized and unsupported storage data is safely ignored',()=>{
  for(const raw of ['{broken',JSON.stringify({version:99,runs:[]}),JSON.stringify({version:VERSION,runs:{}}),' '.repeat(MAX_BYTES),JSON.stringify({version:VERSION,runs:[null,{},1]})]){
    const f=fixture(raw);assert.equal(f.stats.snapshot().observedRuns,0);assert.doesNotThrow(()=>f.tick(0));assert.equal(f.stats.snapshot().observedRuns,1);
  }
});

test('storage exceptions leave in-memory statistics usable',()=>{
  const storage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('blocked');}};
  let at=0;const stats=create({storage,clock:()=>at});
  const data=fixture().data;stats.observe(data);at=100;stats.observe(data);
  assert.equal(stats.snapshot().observedRuns,1);assert.equal(stats.snapshot().aiDrivingSeconds,.1);assert.equal(stats.snapshot().storageAvailable,false);
  assert.equal(stats.clear().observedRuns,0);assert.equal(stats.snapshot().storageAvailable,false);
});

test('missing storage and a hostile observation getter do not throw',()=>{
  const stats=create({clock:()=>0});
  const data=new Proxy({}, {get(){throw Error('hostile');}});
  assert.doesNotThrow(()=>stats.observe(data));assert.equal(stats.snapshot().observedRuns,0);assert.equal(stats.snapshot().storageAvailable,false);
});

test('backwards and invalid clocks do not double-credit or invent elapsed time',()=>{
  const f=fixture();f.tick(100);f.tick(200);f.tick(150);f.tick(250);f.tick(300);
  assert.equal(f.stats.snapshot().aiDrivingSeconds,.15);assert.equal(f.stats.snapshot().observedRuns,1);
  f.tick(NaN);f.tick(400);f.tick(450);
  assert.equal(f.stats.snapshot().aiDrivingSeconds,.2);assert.equal(f.stats.snapshot().observedRuns,1);
});

test('throwing clocks leave observations safe',()=>{
  const stats=create({clock:()=>{throw Error('clock unavailable');}});
  assert.doesNotThrow(()=>stats.observe(fixture().data));assert.equal(stats.snapshot().observedRuns,0);
});

test('snapshots are detached from internal history and coverage',()=>{
  const f=fixture();let s=f.tick(0);s.runs[0].aiMilliseconds=900;s.byTrack[0].observedRuns=999;s.r34.observedRuns=500;s.runs.push({});
  s=f.stats.snapshot();assert.equal(s.observedRuns,1);assert.equal(s.aiDrivingSeconds,0);assert.equal(s.byTrack[0].observedRuns,1);assert.equal(s.r34.observedRuns,1);
});

test('run count and UTF-16 serialized storage stay inside both independent limits',()=>{
  const f=fixture();
  for(let i=0;i<MAX_RUNS*2;i++){f.tick(i*100+1,{raceIdentity:'race-'+i,trackId:1000+i});f.tick(i*100+51,{inRace:false});}
  const s=f.stats.snapshot(),raw=f.values.get(KEY),saved=JSON.parse(raw);
  assert.ok(s.observedRuns<=MAX_RUNS);assert.ok(s.observedRuns>0);assert.equal(saved.runs.length,s.observedRuns);assert.ok(raw.length*2<=MAX_BYTES);
  assert.equal(s.runs.at(-1).trackId,1399);assert.equal(s.maxRuns,MAX_RUNS);assert.equal(s.maxStoredBytes,MAX_BYTES);
  assert.deepEqual(fixture(raw).stats.snapshot().runs,s.runs);
});

test('clear removes only the versioned statistics key and starts a fresh identity',()=>{
  const f=fixture();f.values.set('saved-profile','keep');f.tick(0);f.tick(100);
  const s=f.stats.clear();assert.equal(s.observedRuns,0);assert.equal(s.active,false);assert.equal(s.wins,null);assert.equal(f.values.has(KEY),false);assert.equal(f.values.get('saved-profile'),'keep');
  assert.equal(f.tick(150).runs[0].id,1);assert.equal(f.stats.snapshot().aiDrivingSeconds,0);
});

test('clear supports a minimal get/set storage implementation',()=>{
  const f=fixture();const stats=create({storage:{getItem:f.storage.getItem,setItem:f.storage.setItem},clock:()=>0});
  stats.observe(f.data);stats.clear();assert.deepEqual(JSON.parse(f.values.get(KEY)),{version:VERSION,speedUnits:SPEED_UNITS,runs:[]});
});

test('browser loading exposes only the local create API and bounded constants',()=>{
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../extension/race-stats.js'),'utf8'),context);
  assert.equal(typeof context.__NFSU2_RACE_STATS__.create,'function');assert.equal(context.__NFSU2_RACE_STATS__.KEY,KEY);
  const stats=context.__NFSU2_RACE_STATS__.create();assert.deepEqual(Object.keys(stats).sort(),['clear','observe','snapshot']);assert.equal(stats.snapshot().confirmedResultsAvailable,false);
});
