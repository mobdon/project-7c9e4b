'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {scan,scanAll,summarize,parse}=require('../extension/signatures.js');
const profile=require('../extension/signature-profile.js');
const latestProfile=require('../extension/signature-profile-latest.js');
const base=path.resolve(__dirname,'../..');
const digest=async data=>crypto.createHash('sha256').update(data).digest();
const leb=n=>{const a=[];do{a.push((n&127)|((n>>>=7)?128:0));}while(n);return Buffer.from(a);};
const sec=(id,b)=>Buffer.concat([Buffer.from([id]),leb(b.length),b]);
function moduleBytes(bodies=[Buffer.from([0,11])],param=0){return Buffer.concat([Buffer.from([0,97,115,109,1,0,0,0]),sec(1,Buffer.from(param?[1,96,1,127,0]:[1,96,0,0])),sec(2,Buffer.from([2,1,109,3,109,101,109,2,0,1,1,109,1,102,0,0])),sec(3,Buffer.from([bodies.length,...bodies.map(()=>0)])),sec(10,Buffer.concat([leb(bodies.length),...bodies.flatMap(b=>[leb(b.length),b])]))]);}
function syntheticProfile(){return {schema:1,revision:'fixture',anchors:[{name:'hook',index:1,length:2,sha256:crypto.createHash('sha256').update(Buffer.from([0,11])).digest('hex'),signature:{params:[],results:[]}}],features:{test:['hook']}};}

test('mixed imports counted correctly; unique signature does not authorize writes',async()=>{
 const bytes=moduleBytes(),before=Buffer.from(bytes),r=await scan(bytes,syntheticProfile(),{digest});
 assert.equal(r.importedFunctions,1);assert.equal(r.anchors[0].status,'unique');assert.deepEqual(r.anchors[0].indices,[1]);assert.equal(r.features.test.status,'candidate-only');assert.equal(r.features.test.enabled,false);assert.equal(r.canEnable,false);assert.deepEqual(bytes,before);
});
test('duplicate bodies remain ambiguous; no first-match wins',async()=>{
 const r=await scan(moduleBytes([Buffer.from([0,11]),Buffer.from([0,11])]),syntheticProfile(),{digest});assert.equal(r.anchors[0].status,'ambiguous');assert.deepEqual(r.anchors[0].indices,[1,2]);assert.equal(r.features.test.status,'unresolved');
});
test('changed body and changed semantic signature remain missing',async()=>{
 for(const bytes of [moduleBytes([Buffer.from([0,1,11])]),moduleBytes(undefined,1)]){const r=await scan(bytes,syntheticProfile(),{digest});assert.equal(r.anchors[0].status,'missing');assert.equal(r.canEnable,false);}
});
test('truncated, malformed, unsupported and duplicate sections are rejected',()=>{
 for(const b of [Buffer.alloc(8),moduleBytes().subarray(0,-1),Buffer.concat([moduleBytes(),sec(3,Buffer.from([0]))]),Buffer.concat([moduleBytes(),Buffer.from([0,255,255,255,255,16])])])assert.throws(()=>parse(b));
});
test('unknown feature dependency, duplicate labels and invalid profile are rejected',async()=>{
 for(const change of [p=>p.features.test.push('absent'),p=>p.anchors.push({...p.anchors[0]}),p=>p.anchors[0].sha256='wrong',p=>p.schema=2]){const p=syntheticProfile();change(p);await assert.rejects(scan(moduleBytes(),p,{digest}));}
});
test('multiple reference reports stay separate and cannot combine into activation',async()=>{
 const bytes=moduleBytes(),first=syntheticProfile(),second=syntheticProfile();
 first.anchors[0].sha256='0'.repeat(64);second.revision='exact-fixture';second.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 const result=await scanAll(bytes,[first,second],{digest});
 assert.equal(result.reports.length,2);assert.equal(result.reports[0].features.test.status,'unresolved');assert.equal(result.reports[1].features.test.status,'candidate-only');assert.equal(result.bestReference.referenceRevision,'exact-fixture');assert.equal(result.bestReference.unique,1);assert.equal(result.bestReference.referenceModuleMatches,true);assert.equal(result.canEnable,false);assert(result.reports.every(r=>!r.canEnable));assert.equal(summarize(result.reports[0]).missing,1);
 await assert.rejects(scanAll(bytes,[],{digest}));
});
test('2f0ddd3b signature anchors match their recorded indices without mutation',async()=>{
 const bytes=fs.readFileSync(base+'/research/compatibility-v011/game.wasm'),before=crypto.createHash('sha256').update(bytes).digest('hex'),r=await scan(bytes,profile,{digest});
 assert.equal(r.anchors.length,34);for(const a of r.anchors){assert.equal(a.status,'unique',a.name);assert.deepEqual(a.indices,[a.expectedIndex],a.name);}assert.equal(r.canEnable,false);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),before);
});
test('78e2bb69 yields partial candidates and cannot activate any feature',async()=>{
 const bytes=fs.readFileSync(base+'/research/compatibility-78e2bb69/game.wasm'),before=crypto.createHash('sha256').update(bytes).digest('hex'),r=await scan(bytes,profile,{digest});
 const a=Object.fromEntries(r.anchors.map(a=>[a.name,a]));assert.equal(a.mainHook.status,'missing');assert.equal(a.contactHook.status,'missing');assert.equal(a.nosWrapper.status,'unique');assert.deepEqual(a.nosWrapper.indices,[22782]);assert.equal(a.engine.status,'unique');assert.equal(r.features.ai.status,'unresolved');assert.equal(r.features.power.status,'candidate-only');assert.equal(r.canEnable,false);assert(Object.values(r.features).every(f=>!f.enabled));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),before);
 fs.writeFileSync(base+'/research/update-resilience/runtime-signatures-78e2bb69.json',JSON.stringify(r,null,2)+'\n');
});
test('both real reference builds select their own exact diagnostic manifest; never enables',async()=>{
 for(const [revision,file]of [['2f0ddd3b','compatibility-v011'],['78e2bb69','compatibility-78e2bb69']]){
  const bytes=fs.readFileSync(base+'/research/'+file+'/game.wasm'),before=crypto.createHash('sha256').update(bytes).digest('hex');
  const result=await scanAll(bytes,[profile,latestProfile],{digest}),selected=result.reports.find(r=>r.referenceRevision===revision);
  assert.equal(result.bestReference.referenceRevision,revision);assert.equal(result.bestReference.referenceModuleMatches,true);assert.equal(result.bestReference.unique,34);assert.equal(result.bestReference.missing,0);assert.equal(result.bestReference.ambiguous,0);
  for(const a of selected.anchors){assert.equal(a.status,'unique',a.name);assert.deepEqual(a.indices,[a.expectedIndex],a.name);}assert.equal(result.canEnable,false);assert(result.reports.every(r=>!r.canEnable));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),before);
  if(revision==='78e2bb69')fs.writeFileSync(base+'/research/update-resilience/runtime-multiple-signatures-78e2bb69.json',JSON.stringify(result,null,2)+'\n');
 }
});
