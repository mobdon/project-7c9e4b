'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const D=require('../extension/diagnostics.js');
const file=path.join(__dirname,'diagnostics-page.test.cjs'),baseRequire=createRequire(file);
let source=fs.readFileSync(file,'utf8');
const old='"sessionStorage:{getItem:k=>';
assert.equal(source.split(old).length,2);
// The production page/logger run unchanged. Let the existing fixture share a
// real storage adapter across a page reload instead of keeping a private Map.
source=source.replace(old,'"sessionStorage:compatibility.sessionStorage||{getItem:k=>');
const context={require:Object.assign(name=>name==='node:test'?{test(){}}:baseRequire(name),{resolve:baseRequire.resolve}),console,Buffer,WebAssembly,Blob,URL,setImmediate};
vm.runInNewContext(source+'\nthis.fixture=fixture;',context,{filename:file});
const AA=require('../extension/aa-profile.js');
const race=()=>({ready:true,driving:true,hud:1,raceType:1,trackId:4014,streetXRace:false,dragRace:false,driftRace:false,traceStatus:'captured',nativeRoadTarget:17,nativeBrake:.25,tools:{ai:true,racePace:true,racePaceFactor:1.5}});
const unpack=(trace,row)=>Object.fromEntries(trace.columns.map((key,i)=>[key,row[i]]));
function fixture(initial){
 let at=1000;const values=new Map(initial),writes=[];
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,String(value));writes.push({key,value});}};
 const logger=D.create({storage,clock:()=>at});
 return{logger,values,writes,storage,advance:n=>at+=n,export:()=>JSON.parse(logger.exportText())};
}
async function page(storage){return context.fixture(null,true,false,{revision:AA.revision,profile:AA,sessionStorage:storage});}
async function exported(f){f.click('diagnostic-export');return JSON.parse(await f.downloads.at(-1).text());}

test('actual production race rows survive 500 city rows and a shared-storage page reload',async()=>{
 const f=fixture(),p=await page(f.storage);
 p.put(0x89e7b0,1);p.put(0x89e7a0,4014);p.drive(1);p.put(p.race,4);p.change('ai',true);p.run(45);
 const raceCheckpoint=JSON.parse(f.values.get(D.LAST_RACE_TRACE_KEY));
 assert.equal(raceCheckpoint.rows.length,9);
 for(const row of raceCheckpoint.rows){const sample=unpack(raceCheckpoint,row);assert.equal(sample.ready,true);assert.equal(sample.hud,1);assert.equal(sample.raceType,1);assert.equal(sample.trackId,4014);}
 const lastRaceWrites=f.writes.filter(write=>write.key===D.LAST_RACE_TRACE_KEY).length;
 p.put(0x89e7b0,0);p.drive(2);p.run(2500);
 assert.equal(f.writes.filter(write=>write.key===D.LAST_RACE_TRACE_KEY).length,lastRaceWrites);
 const city=await exported(p);assert(city.raceTrace.rows.length>0&&city.raceTrace.rows.length<=480);assert(city.raceTrace.dropped>0);assert.equal(city.raceTrace.rows.length+city.raceTrace.dropped,509);
 assert(city.raceTrace.rows.every(row=>unpack(city.raceTrace,row).raceType===0));
 assert.deepEqual(city.lastRaceTrace.rows,raceCheckpoint.rows);
 assert.equal(city.lastRaceTrace.historical,true);assert.equal(city.lastRaceTrace.coverage.spanMs,2000);
 assert.match(city.lastRaceTrace.notice,/not a complete route, current ownership or proof of a race result/);
 const reloaded=await page(f.storage),after=await exported(reloaded);
 assert.equal(after.lastRaceTrace.restoredFromSameTab,true);assert.deepEqual(after.lastRaceTrace.rows,raceCheckpoint.rows);
 assert(after.raceTrace.rows.every(row=>unpack(after.raceTrace,row).raceType===0));
});

test('only accepted sanitized ready HUD1 road-race rows enter the retained window',()=>{
 const f=fixture();
 for(const patch of [{},{hud:2},{raceType:0},{raceType:2},{ready:false},{hud:'1'},{raceType:NaN},{hud:1,raceType:1,ready:true,dragRace:true},{hud:1,raceType:1,ready:true,streetXRace:true},{hud:1,raceType:1,ready:true,driftRace:true}]){
  f.logger.trace({...race(),...patch,raw:'SECRET',playerName:'SECRET',url:'https://private.test/SECRET',tools:{...race().tools,password:'SECRET'}});f.advance(250);
 }
 const data=f.export(),retained=data.lastRaceTrace;
 assert.equal(retained.rows.length,4);assert.deepEqual(retained.rows.map(row=>unpack(retained,row).dragRace),[false,true,false,false]);
 assert.equal(unpack(retained,retained.rows[2]).streetXRace,true);assert.equal(unpack(retained,retained.rows[3]).driftRace,true);
 assert.doesNotMatch(JSON.stringify(data),/SECRET|private\.test|playerName/);
 const before=retained.rows.length;assert.equal(f.logger.trace(race()),true);assert.equal(f.logger.trace(race()),false);assert.equal(f.export().lastRaceTrace.rows.length,before+1);
});

test('retained race storage has independent row/byte budgets and two-second checkpoints',()=>{
 const f=fixture();
 for(let i=0;i<280;i++){assert.equal(f.logger.trace({...race(),nativeRoadTarget:i}),true);f.advance(250);}
 const writes=f.writes.filter(write=>write.key===D.LAST_RACE_TRACE_KEY);
 assert.equal(writes.length,35);assert(writes.every(write=>Buffer.byteLength(write.value,'utf8')<=D.MAX_LAST_RACE_TRACE_BYTES));
 const data=f.export();assert(data.lastRaceTrace.rows.length>0&&data.lastRaceTrace.rows.length<=240);assert.equal(data.lastRaceTrace.rows.length+data.lastRaceTrace.dropped,280);assert(data.lastRaceTrace.dropped>0);assert.equal(data.raceTrace.rows.length,280);assert.equal(data.raceTrace.dropped,0);
 assert.equal(data.limits.maxTraceSamples,480);assert.equal(data.limits.maxTraceBytes,524288);assert.equal(data.limits.maxLastRaceTraceSamples,240);assert.equal(data.limits.maxLastRaceTraceBytes,262144);
 for(let i=0;i<500;i++){f.logger.trace({...race(),hud:2,raceType:0});f.advance(250);}
 assert.equal(f.writes.filter(write=>write.key===D.LAST_RACE_TRACE_KEY).length,36);
 assert.equal(f.export().lastRaceTrace.rows.length,data.lastRaceTrace.rows.length);assert(f.export().raceTrace.rows.length<=480);
});

test('Stop and manual takeover preserve history; Clear persists an empty window through reload',async()=>{
 const f=fixture(),p=await page(f.storage);p.put(0x89e7b0,1);p.drive(1);p.put(p.race,4);p.change('ai',true);p.run(45);
 p.press('F7');p.drive(0);p.run(10);const manual=await exported(p);assert(manual.lastRaceTrace.rows.length>=9);
 p.press('F9');p.run(10);const stopped=await exported(p);assert.deepEqual(stopped.lastRaceTrace.rows,manual.lastRaceTrace.rows);
 p.click('diagnostic-clear');const cleared=await exported(p);assert.equal(cleared.lastRaceTrace.rows.length,0);assert.equal(cleared.lastRaceTrace.dropped,0);assert.equal(cleared.raceTrace.rows.length,0);
 assert.equal(JSON.parse(f.values.get(D.LAST_RACE_TRACE_KEY)).rows.length,0);
 const reloaded=await page(f.storage);assert.equal((await exported(reloaded)).lastRaceTrace.rows.length,0);
});

test('pre-feature normal trace migrates only validated race rows; an explicit empty key stays empty',()=>{
 const f=fixture();f.logger.trace(race());f.advance(250);f.logger.trace({...race(),raceType:0,hud:2});f.export();
 const normal=f.values.get(D.TRACE_KEY),legacy=fixture([[D.TRACE_KEY,normal]]).export();
 assert.equal(legacy.lastRaceTrace.rows.length,1);assert.equal(legacy.lastRaceTrace.restoredFromSameTab,true);assert.equal(unpack(legacy.lastRaceTrace,legacy.lastRaceTrace.rows[0]).trackId,4014);
 const empty=JSON.stringify({format:'nfsu2-last-race-trace-v1',schema:1,columns:D.TRACE_COLUMNS,dropped:0,rows:[]});
 assert.equal(fixture([[D.TRACE_KEY,normal],[D.LAST_RACE_TRACE_KEY,empty]]).export().lastRaceTrace.rows.length,0);
});

test('frozen delivered .11 production rows migrate through 500 city rows and a reload',()=>{
 const frozen=require('./fixtures/last-race-trace-v03811-for-v03812.json');assert.equal(frozen.liveGame,false);
 const f=fixture([[D.TRACE_KEY,JSON.stringify(frozen.raceTrace)]]),initial=f.export();
 assert.equal(initial.lastRaceTrace.restoredFromSameTab,true);assert.equal(initial.lastRaceTrace.rows.length,9);
 const columns=frozen.raceTrace.columns;
 for(let i=0;i<9;i++){const old=unpack(frozen.raceTrace,frozen.raceTrace.rows[i]),row=unpack(initial.lastRaceTrace,initial.lastRaceTrace.rows[i]);for(const key of columns)assert.equal(row[key],old[key]);assert.equal(row.version,'0.38.11');}
 for(let i=0;i<500;i++){f.logger.trace({...race(),hud:2,raceType:0});f.advance(250);}
 const city=f.export();assert(city.raceTrace.rows.every(row=>unpack(city.raceTrace,row).raceType===0));assert.deepEqual(city.lastRaceTrace.rows,initial.lastRaceTrace.rows);
 const restored=fixture(f.values).export();assert.equal(restored.lastRaceTrace.restoredFromSameTab,true);assert.deepEqual(restored.lastRaceTrace.rows,initial.lastRaceTrace.rows);
});

test('known pre-context columns migrate by name and unknown columns cannot authorize restore',()=>{
 const f=fixture();f.logger.trace(race());f.export();const packed=JSON.parse(f.values.get(D.LAST_RACE_TRACE_KEY));
 const end=packed.columns.indexOf('forwardReadPhaseCode'),older={...packed,columns:packed.columns.slice(0,end),rows:packed.rows.map(row=>row.slice(0,end))};
 const restored=fixture([[D.LAST_RACE_TRACE_KEY,JSON.stringify(older)]]).export().lastRaceTrace;
 assert.equal(restored.rows.length,1);assert.equal(unpack(restored,restored.rows[0]).trackId,4014);assert.equal(unpack(restored,restored.rows[0]).forwardReadPhaseCode,null);
 const unknown={...older,columns:[...older.columns.slice(0,-1),'SECRET']};
 const rejected=fixture([[D.LAST_RACE_TRACE_KEY,JSON.stringify(unknown)]]).export().lastRaceTrace;assert.equal(rejected.rows.length,0);assert.equal(rejected.restoredFromSameTab,false);
});

test('same-origin retained rows are strictly revalidated and arbitrary payloads are discarded',()=>{
 const f=fixture();f.logger.trace(race());f.export();const packed=JSON.parse(f.values.get(D.LAST_RACE_TRACE_KEY)),valid=packed.rows[0];
 const poisoned=valid.slice();poisoned[packed.columns.indexOf('nativeRoadTarget')]='SECRET';poisoned[packed.columns.indexOf('tools.power')]=9999;poisoned[packed.columns.indexOf('forwardNativeApplied')]=true;
 const badHud=valid.slice();badHud[packed.columns.indexOf('hud')]='1';
 const badReady=valid.slice();badReady[packed.columns.indexOf('ready')]='true';
 const badType=valid.slice();badType[packed.columns.indexOf('raceType')]=0;
 packed.rows=[poisoned,badHud,badReady,badType,[...valid,'SECRET'],[Infinity,...valid.slice(1)],[-1,...valid.slice(1)]];packed.raw='SECRET';packed.dropped=-1;
 const restored=fixture([[D.LAST_RACE_TRACE_KEY,JSON.stringify(packed)]]).export().lastRaceTrace;
 assert.equal(restored.rows.length,1);assert.equal(restored.dropped,0);const row=unpack(restored,restored.rows[0]);assert.equal(row.nativeRoadTarget,null);assert.equal(row['tools.power'],null);assert.equal(row.forwardNativeApplied,null);assert.doesNotMatch(JSON.stringify(restored),/SECRET/);
 for(const raw of ['{bad JSON','x'.repeat(D.MAX_LAST_RACE_TRACE_BYTES+1),JSON.stringify({...packed,schema:2}),JSON.stringify({...packed,format:'SECRET'})])assert.equal(fixture([[D.LAST_RACE_TRACE_KEY,raw]]).export().lastRaceTrace.rows.length,0);
});

test('blocked storage, quota denial and clock rollback preserve memory export without throwing',()=>{
 let at=1000;const logger=D.create({clock:()=>at,storage:{getItem(){throw Error('SECRET blocked')},setItem(){throw Error('SECRET quota')}}});
 assert.equal(logger.trace(race()),true);at=500;assert.equal(logger.trace(race()),true);
 const data=JSON.parse(logger.exportText());assert.equal(data.lastRaceTrace.persistence,'memory-only');assert.equal(data.lastRaceTrace.rows.length,2);assert.equal(data.lastRaceTrace.coverage.spanMs,0);assert.doesNotMatch(JSON.stringify(data),/SECRET/);
 logger.record('manual');logger.record('stop');assert.equal(JSON.parse(logger.exportText()).lastRaceTrace.rows.length,2);logger.clear();assert.equal(JSON.parse(logger.exportText()).lastRaceTrace.rows.length,0);
});
