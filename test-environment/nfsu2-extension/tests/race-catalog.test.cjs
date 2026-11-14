'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../extension/race-catalog.js');
const sourcePath=path.join(__dirname,'../../research/all-race-map-data/track-event-inventory.json');
const raw=fs.readFileSync(sourcePath),source=JSON.parse(raw);
const kinds={Circuit:'circuit',Sprint:'sprint',Drag:'drag',Drift:'drift','Street X':'street-x',URL:'url'};
test('catalogue pins the actual inventory and describes coverage without geometry or live claims',()=>{
 assert.equal(C.PROVENANCE.inventorySha256,crypto.createHash('sha256').update(raw).digest('hex'));assert.equal(C.PROVENANCE.sourceSha256,source.sourceSha256);
 assert.equal(C.TRACKS.length,130);assert.equal(C.LAYOUTS.length,144);assert.equal(C.PROVENANCE.trackRecords,131);
 assert.equal(C.PROVENANCE.primaryRaceTrackIds,100);assert.equal(C.PROVENANCE.geometryVerified,false);assert.equal(C.PROVENANCE.liveVerified,false);
});
test('every table ID and its regions/duplicate record indices survive the factual projection',()=>{
 const ids=[...new Set(source.tracks.map(t=>t.trackId))].sort((a,b)=>a-b);assert.deepEqual(C.TRACKS.map(t=>t.trackId),ids);
 for(const row of C.TRACKS){const originals=source.tracks.filter(t=>t.trackId===row.trackId);assert.deepEqual(row.tableIndices,originals.map(t=>t.tableIndex));assert.ok(originals.every(t=>t.region===row.region));}
 assert.deepEqual(C.TRACKS.find(t=>t.trackId===4400).tableIndices,[91,101]);
});
test('all144 directional layouts exactly match primary nonstory references and preserve unique kind labels',()=>{
 const layouts=new Map(),tracks=new Map();
 for(const e of source.careers[0].events.filter(e=>e.rawType!==3))for(const h of e.heats){
  const key=h.trackId+':'+h.reverse;if(!layouts.has(key))layouts.set(key,new Set());layouts.get(key).add(kinds[e.kind]);
  if(!tracks.has(h.trackId))tracks.set(h.trackId,new Set());tracks.get(h.trackId).add(kinds[e.kind]);
 }
 assert.equal(layouts.size,C.LAYOUTS.length);
 for(const row of C.LAYOUTS){assert.deepEqual(row.raceTypes,[...layouts.get(row.trackId+':'+row.reverse)].sort());assert.equal(row.raceType,row.raceTypes.length===1?row.raceTypes[0]:'unknown');assert.equal(row.region,C.TRACKS.find(t=>t.trackId===row.trackId).region);}
 for(const row of C.TRACKS){assert.deepEqual(row.raceTypes,[...(tracks.get(row.trackId)||[])].sort());assert.deepEqual(row.directions,[...new Set(C.LAYOUTS.filter(l=>l.trackId===row.trackId).map(l=>l.reverse?'backward':'forward'))].sort());}
});
test('race types follow event metadata including URL and organic drags rather than numeric ranges',()=>{
 for(const [id,want]of [[4011,'circuit'],[4164,'sprint'],[4201,'drag'],[4404,'drag'],[4301,'drift'],[4601,'street-x'],[4715,'url']])assert.equal(C.classify(id),want);
 for(const id of [4700,4706,4400,1001,9999,4209,NaN,Infinity,'4715',null])assert.equal(C.classify(id),'unknown');
});
test('mode flags take priority while conflicting modes fail closed',()=>{
 for(const [flags,want]of [[{drag:true},'drag'],[{drift:true},'drift'],[{streetX:true},'street-x'],[{roam:true},'free-roam'],[{outrun:true},'outrun'],[{roam:true,outrun:true},'outrun']])assert.equal(C.classify(4715,flags),want);
 for(const flags of [{drag:true,drift:true},{drag:true,streetX:true},{drift:true,streetX:true},{roam:true,drag:true},{outrun:true,drift:true},{drag:1},{roam:'true'},null])assert.equal(C.classify(4715,flags),'unknown');
 assert.equal(C.classify(4715,{drag:false,drift:false,streetX:false,roam:false,outrun:false}),'url');
});

test('factual display names cover every primary race without exposing internal IDs as names',()=>{
 const evidence=JSON.parse(fs.readFileSync(path.join(__dirname,'../integration/track-labels-v0388.json'),'utf8'));
 assert.equal(C.DISPLAY_PROVENANCE.languageSha256,evidence.languageSha256);
 for(const row of C.TRACKS.filter(r=>r.primaryRace)){
  assert.equal(C.displayName(row.trackId),evidence.labels[row.trackId].name);
  assert.match(C.displayName(row.trackId),/[a-z]/i);
 }
 for(const [id,want]of [[4000,'Bayview'],[4001,'Outer Ring'],[4101,'Bayview Plaza'],[4601,'Industrial Park Track 1'],[4715,'Airport Circuit Track 5']])assert.equal(C.displayName(id),want);
 assert.equal(C.displayName(4715,{reverse:true}),'Airport Circuit Track 5 Reverse');
 for(const row of C.TRACKS.filter(r=>r.primaryRace)){
  const reverse=evidence.labels[row.trackId].reverse;
  assert.equal(C.displayName(row.trackId,{reverse:true}),reverse&&!/^\d+ Reverse$/.test(reverse)?reverse:evidence.labels[row.trackId].name+' · Reverse');
  assert.doesNotMatch(C.displayName(row.trackId,{reverse:true}),/^\d+(?: Reverse)?$/);
 }
 for(const id of [4163,4201,4401,4402,4404])assert.equal(C.displayName(id,{reverse:true}),C.displayName(id)+' · Reverse');
 for(const id of [0,-1,9999,65536,1.5,'4001',null,NaN,Infinity,'__proto__'])assert.equal(C.displayName(id),null);
 assert.equal(C.displayName(4001,{reverse:1}),null);
 assert.equal(C.modeName('circuit'),'Circuit');assert.equal(C.modeName('url'),'URL race');assert.equal(C.modeName('__proto__'),'Race');
 assert(Object.isFrozen(C.DISPLAY_NAMES));assert(Object.isFrozen(C.DISPLAY_NAMES[4715]));
});
test('exported metadata is deeply immutable and contains no route coordinates or original labels',()=>{
 assert.ok(Object.isFrozen(C.TRACKS));assert.ok(Object.isFrozen(C.LAYOUTS));assert.ok(C.TRACKS.every(t=>Object.isFrozen(t)&&Object.isFrozen(t.raceTypes)&&Object.isFrozen(t.directions)&&Object.isFrozen(t.tableIndices)));
 assert.throws(()=>{C.TRACKS[0].raceTypes.push('drag');},TypeError);assert.throws(()=>{C.LAYOUTS[0].region='x';},TypeError);
 for(const row of [...C.TRACKS,...C.LAYOUTS])for(const key of ['points','geometry','internalLabel','internalName','resources'])assert.equal(row[key],undefined);
});
