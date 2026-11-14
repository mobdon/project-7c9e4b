'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),prior=path.resolve(root,'../work-paced-v03811/extension/diagnostics.js'),next=path.join(root,'extension/diagnostics.js');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'verification/log-retention-baseline-v03812.json'),'utf8'));
assert.equal(sha(prior),baseline.sourceHashes['diagnostics.js']);
const before=require(prior),after=require(next),state=()=>({values:new Map(),writes:[],at:1000});
function make(D,s){return D.create({version:'0.38.11',clock:()=>s.at,storage:{getItem:key=>s.values.get(key)??null,setItem:(key,value)=>{s.values.set(key,String(value));s.writes.push({key,value});}}});}
const oldState=state(),newState=state(),oldLogger=make(before,oldState),newLogger=make(after,newState);
const checkpoints=[];
function sameNormal(label){
 const oldExport=JSON.parse(oldLogger.exportText()),newExport=JSON.parse(newLogger.exportText());
 assert.deepEqual(newExport.raceTrace,oldExport.raceTrace,label+' current raceTrace');
 assert.deepEqual(newExport.events,oldExport.events,label+' events');assert.deepEqual(newExport.historicalDriving,oldExport.historicalDriving,label+' historical driving');
 for(const key of [before.KEY,before.TRACE_KEY])assert.equal(newState.values.get(key),oldState.values.get(key),label+' stored '+key);
 const normalWrites=newState.writes.filter(write=>write.key!==after.LAST_RACE_TRACE_KEY);assert.deepEqual(normalWrites,oldState.writes,label+' normal write cadence/bytes');
 checkpoints.push({label,raceTraceSamples:oldExport.raceTrace.rows.length,normalTraceDropped:oldExport.raceTrace.dropped,normalWrites:normalWrites.length,lastRaceSamples:newExport.lastRaceTrace.rows.length});
}
const sample={ready:true,driving:true,hud:1,raceType:1,aiActive:true,aiOwned:true,safe:true,focused:true,hidden:false,trackId:4014,speedMps:21,nativeRoadTarget:17,tools:{ai:true,racePace:true,racePaceFactor:1.5}};
for(let i=0;i<40;i++){for(const logger of [oldLogger,newLogger]){logger.trace({...sample,speedMps:21+i/10});logger.snapshot({...sample,speedMps:21+i/10});}oldState.at+=250;newState.at+=250;}
sameNormal('race');
for(let i=0;i<500;i++){for(const logger of [oldLogger,newLogger]){const row={...sample,hud:2,raceType:0,trackId:0,speedMps:10+i/100};logger.trace(row);logger.snapshot(row);}oldState.at+=250;newState.at+=250;}
sameNormal('500 city rows');
for(const event of ['manual','stop']){oldLogger.record(event);newLogger.record(event);}sameNormal('manual and Stop');
oldLogger.clear();newLogger.clear();sameNormal('Clear');
const output=path.join(root,'verification/last-race-contract-v03812.json'),receipt={kind:'delivered-v03811-normal-diagnostics-contract-differential',passed:true,liveGame:false,node:process.version,baselineSourceSha256:sha(prior),candidateSourceSha256:sha(next),checkpoints,unchanged:['raceTrace complete export contract and codebooks','ordinary event exports','historical driving exports','normal storage values','normal storage write counts, order and bytes','Clear behavior'],added:'Separate sanitized lastRaceTrace export and storage only'};
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');process.stdout.write(JSON.stringify({output,sha256:sha(output),checkpoints:checkpoints.length,passed:true})+'\n');
