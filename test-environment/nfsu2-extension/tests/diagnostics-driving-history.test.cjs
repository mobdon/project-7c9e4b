'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create,KEY,MAX_BYTES}=require('../extension/diagnostics.js');
const race={ready:true,driving:true,aiActive:true,aiOwned:true,nativeTelemetry:true,revision:'3bdd9959',trackId:4715,cornerRouteNodes:28,cornerPlannerCorners:0,paceConfirmed:true,paceApplied:1.45};
function fixture(){let at=1000;const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},logger=create({storage,clock:()=>at});return{logger,storage,data,tick:ms=>at+=ms,read:()=>JSON.parse(logger.exportText())};}

test('race evidence survives idle event eviction and same-tab reload with an explicit historical label',()=>{
 const f=fixture();f.logger.snapshot(race);f.tick(2000);f.logger.snapshot({...race,speedMps:55});
 for(let i=0;i<300;i++){f.tick(5000);f.logger.snapshot({ready:false,driving:false,aiActive:false,aiOwned:false});}
 const exported=f.read();assert(exported.events.every(e=>e.data.aiActive!==true));
 assert.equal(exported.historicalDriving.historical,true);assert.equal(exported.historicalDriving.samples.length,2);
 assert.equal(exported.historicalDriving.samples.at(-1).data.cornerPlannerCorners,0);
 assert.equal(exported.historicalDriving.samples.at(-1).data.speedMps,55);
 assert.match(exported.historicalDriving.notice,/not current ownership/);
 const reload=JSON.parse(create({storage:f.storage,clock:()=>2e6}).exportText());
 assert.deepEqual(reload.historicalDriving,exported.historicalDriving);assert(f.data.get(KEY).length<=MAX_BYTES);
});

test('history is bounded and retains only sanitized active owned driving samples',()=>{
 const f=fixture();for(let i=0;i<100;i++){f.logger.record('state',{...race,speedMps:i,raw:'SECRET',carPointer:0xe00000,tools:{ai:true,raw:'SECRET'}});f.tick(2000);}
 const j=f.read();assert.equal(j.historicalDriving.samples.length,12);assert.equal(j.historicalDriving.samples.at(-1).data.speedMps,99);
 assert.doesNotMatch(f.logger.exportText(),/SECRET|carPointer/);assert(f.data.get(KEY).length<=MAX_BYTES);
 for(const field of ['ready','driving','aiActive','aiOwned'])f.logger.record('state',{...race,[field]:false});
 f.logger.record('tools',race);assert.deepEqual(f.read().historicalDriving,j.historicalDriving);
});

test('clear removes retained driving evidence as well as ordinary events',()=>{
 const f=fixture();f.logger.record('state',race);f.logger.clear();assert.equal(f.read().historicalDriving.samples.length,0);
 assert.deepEqual(f.read().events.map(e=>e.event),['clear']);assert.equal(JSON.parse(f.data.get(KEY)).drivingSamples.length,0);
});

test('stored historical evidence is revalidated; a previous ordinary race record is migrated',()=>{
 const storage={getItem:()=>JSON.stringify({schema:1,events:[],drivingSamples:[{at:1,data:{...race,raw:'SECRET',speedMps:Infinity}},{at:2,data:{...race,aiOwned:'true'}}]}),setItem(){}};
 const j=JSON.parse(create({storage,clock:()=>1000}).exportText());assert.equal(j.historicalDriving.samples.length,1);
 assert.equal('speedMps'in j.historicalDriving.samples[0].data,false);assert.doesNotMatch(JSON.stringify(j),/SECRET/);
 const migrated=JSON.parse(create({storage:{getItem:()=>JSON.stringify({schema:1,events:[{at:12,event:'state',data:race}]}),setItem(){}},clock:()=>1000}).exportText());
 assert.equal(migrated.historicalDriving.samples.length,1);assert.equal(migrated.historicalDriving.samples[0].at,12);
});

test('blocked storage still keeps bounded historical evidence in memory',()=>{
 const logger=create({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
 logger.record('state',race);assert.equal(JSON.parse(logger.exportText()).historicalDriving.samples.length,1);assert.equal(logger.status().persistence,'memory-only');
});
