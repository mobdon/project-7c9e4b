'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Engine,A}=require('../extension/core.js'),Radar=require('../extension/rear-radar.js'),Registry=require('../extension/forward-native-config.js');
const profiles=['modern','d2fa','cd5','abf'].map(name=>require('../extension/'+name+'-profile.js'));
function fixture(profile=profiles.at(-1)){
 const bitmap=Registry.select(profile.hash).runtime.bitmap,memory=new WebAssembly.Memory({initial:Math.ceil((bitmap+Radar.ABI.bitmapBytes)/65536),maximum:65536,shared:true}),d=new DataView(memory.buffer);
 const engine=new Engine(memory),player=0xe00000,car=0xe01000,race=0xe03000,world=0xe04000;
 const put=(p,v)=>d.setUint32(p,v,true),f32=(p,v)=>d.setFloat32(p,v,true);
 const commit=(p,n=4,value=true)=>{for(let page=Math.floor(p/16384);page<=Math.floor((p+n-1)/16384);page++){const at=bitmap+(page>>>3),mask=1<<(page&7);d.setUint8(at,value?d.getUint8(at)|mask:d.getUint8(at)&~mask);}};
 for(const[p,v]of [[A.FLOW,6],[A.MODE,8],[A.PLAYER,player],[player+4,car],[player+16,0],[A.RACE,race],[race,4],[0x890080,world]]){put(p,v);commit(p);}
 commit(player,0x14);commit(car,0x9e4);commit(race,0xc44);commit(world,0x14);f32(car+A.RPM,6000);put(car+A.GEAR,3);put(car+0x24,1);d.setUint8(car+0x550,1);
 [1000,1000,10].forEach((v,i)=>f32(car+0x60+i*4,v));f32(car+0x90,1);f32(car+0x94,0);
 let objects=[];
 function list(entries){
  objects=entries.map((entry,i)=>{const p=0xe08000+i*0x1000;commit(p,0x9e4);[entry[0]+1000,entry[1]+1000,(entry[2]??0)+10].forEach((v,j)=>f32(p+0x60+j*4,v));d.setUint8(p+0x550,entry[3]??1);put(p+0x998,entry[4]??0);return p;});
  const all=[car,...objects];put(world,all[0]);put(world+4,all.at(-1));put(world+0x10,all.length);
  all.forEach((p,i)=>{put(p,i+1<all.length?all[i+1]:world);put(p+4,i?all[i-1]:world);});
 }
 list([[-30,0]]);
 const options={verified:true,moduleHash:profile.hash,range:200};
 const observe=extra=>Radar.observe(engine,engine.state(),{...options,...extra});
 const snapshot=()=>({low:Buffer.from(new Uint8Array(memory.buffer,0,0x1000000)),bitmap:Buffer.from(new Uint8Array(memory.buffer,bitmap,Radar.ABI.bitmapBytes))});
 return{profile,bitmap,memory,d,engine,player,car,race,world,put,f32,commit,list,options,observe,snapshot,objects:()=>objects};
}
for(const profile of profiles)test(profile.revision+': real Engine observes committed online rear cars without AI/network-tool permission or any guest writes',()=>{
 const f=fixture(profile),before=f.snapshot(),sample=f.observe();assert.equal(f.engine.state().network,true);assert.equal(f.engine.u32(f.car+0x24),1);assert.equal(sample.available,true);assert.equal(sample.nearest.distanceNative,30);assert.equal(sample.nearest.side,'center');assert.equal(sample.units,'native-coordinate-units');assert.equal(sample.metricScaleVerified,false);assert.equal(sample.classification,'unknown');assert.equal(sample.coverage,'locally-loaded-world-car-list');assert.deepEqual(f.snapshot(),before);
});
test('native blink-out is one byte; adjacent car state cannot hide the local car or rear cars in solo or online free roam',()=>{
 const f=fixture();
 // runtime/roam_game.c uses MR8(car + CAR_BLINKOUT), not MR32. Other
 // native state sharing the dword may be nonzero while blink-out is clear.
 f.put(f.car+0x998,0xa5b6c700);f.put(f.objects()[0]+0x998,0x12345600);
 for(const mode of [1,8]){
  f.put(A.MODE,mode);const before=f.snapshot(),r=f.observe();
  assert.equal(r.available,true);assert.equal(r.nearest.distanceNative,30);assert.equal(r.cars.length,1);assert.deepEqual(f.snapshot(),before);
 }
 f.d.setUint8(f.objects()[0]+0x998,1);let r=f.observe();assert.equal(r.available,true);assert.equal(r.cars.length,0);
 f.d.setUint8(f.car+0x998,1);r=f.observe();assert.equal(r.available,false);assert.equal(r.state,'local-car-hidden');
});
test('rear half-plane reports distance and signed left/right bearing while omitting front, cross-street, parked and other-height cars',()=>{
 const f=fixture();f.list([[-30,0],[-40,30],[-40,-30],[10,0],[0,20],[-10,0,6],[-501,0],[-10,0,0,0],[-11,0,0,1,1]]);const r=f.observe({range:500});
 assert.equal(r.available,true);assert.equal(r.scannedCars,10);assert.equal(r.cars.length,3);assert.deepEqual(r.cars.map(x=>x.distanceNative),[30,50,50]);assert.deepEqual(r.cars.map(x=>x.side),['center','left','right']);assert.ok(Math.abs(r.cars[1].bearingDegrees-36.86989764584402)<1e-9);assert.equal(r.cars[2].bearingDegrees,-r.cars[1].bearingDegrees);assert.equal(r.nearest.behindNative,30);assert.equal(r.nearest.classification,'unknown');
});
test('local heading rotates rear/left/right projection and the adjustable range uses horizontal native distance',()=>{
 const f=fixture();f.f32(f.car+0x90,0);f.f32(f.car+0x94,1);f.list([[0,-30],[-30,-40],[30,-40],[0,20]]);let r=f.observe({range:50});assert.equal(r.cars.length,3);assert.deepEqual(r.cars.map(x=>x.side),['center','left','right']);f.list([[0,-50.01]]);assert.equal(f.observe({range:50}).cars.length,0);assert.equal(f.observe({range:500}).cars.length,1);
});
test('strict caller verification, exact known hash and numeric range are required before reading memory',()=>{
 const unreadable=new Proxy({},{get(){throw Error('unexpected engine read');}});
 for(const options of [{},{verified:1,moduleHash:profiles[0].hash},{verified:true,moduleHash:'0'.repeat(64)},{verified:true,moduleHash:profiles[0].hash.toUpperCase()}])assert.equal(Radar.observe(unreadable,{},options).state,'exact-build-required');
 const f=fixture();for(const range of [49,501,0,NaN,Infinity,'200',null])assert.equal(f.observe({range}).state,'invalid-range');for(const range of [50,500])assert.equal(f.observe({range}).available,true);
});
test('uncommitted pages, low/high pointer bounds, non-shared or too-short memory never publish cars',()=>{
 for(const mutate of [f=>f.commit(f.objects()[0],0x9e4,false),f=>f.put(0x890080,0x50000000),f=>f.put(f.car,0x50000000),f=>f.put(f.world,f.memory.buffer.byteLength-4),f=>f.put(f.world,f.objects()[0]+1),f=>f.commit(f.player,0x14,false)]){const f=fixture();mutate(f);const r=f.observe();assert.equal(r.available,false);assert.equal(r.nearest,null);assert.equal(r.cars.length,0);}
 const f=fixture();f.engine.memory=new WebAssembly.Memory({initial:256,maximum:256});assert.equal(f.observe().available,false);
 const g=fixture();g.engine.memory=new WebAssembly.Memory({initial:1,maximum:1,shared:true});assert.equal(g.observe().available,false);
});
test('bad headings and stale/paused local player or race state are unknown, never a clear rear view',()=>{
 for(const mutate of [f=>f.f32(f.car+0x90,NaN),f=>{f.f32(f.car+0x90,0);f.f32(f.car+0x94,0);},f=>f.f32(f.car+0x60,Infinity),f=>f.put(f.player+16,1),f=>f.put(f.race,6),f=>f.put(A.FLOW,3),f=>f.d.setUint8(f.car+0x550,0),f=>f.put(f.car+0x998,1)]){const f=fixture();mutate(f);assert.equal(f.observe().available,false);}
 const f=fixture(),state=f.engine.state();f.put(f.player+4,0xe02000);assert.equal(Radar.observe(f.engine,state,f.options).available,false);
});
test('reciprocal world links, sentinel termination, local membership and the existing96-car limit fail closed',()=>{
 for(const mutate of [f=>f.put(f.objects()[0]+4,f.world),f=>f.put(f.objects()[0],f.car),f=>f.put(f.world+4,f.car),f=>{const p=f.objects()[0];f.put(f.world,p);f.put(p+4,f.world);f.put(p,f.world);f.put(f.world+4,p);},f=>f.put(f.car,0)]){const f=fixture();mutate(f);assert.equal(f.observe().available,false);}
 const f=fixture();f.list(Array.from({length:96},(_,i)=>[-10-i,0]));const r=f.observe({range:500});assert.equal(r.available,false);assert.equal(r.state,'world-list-unavailable');assert.equal(r.nearest,null);
});
test('source mutation during a real Engine scan discards peer poses, links, ownership, world identity and released pages',()=>{
 const mutations=[f=>f.f32(f.objects()[0]+0x60,999),f=>f.put(f.objects()[0],f.car),f=>f.put(f.player+4,0xe02000),f=>f.put(0x890080,f.world+0x1000),f=>f.commit(f.objects()[0],0x9e4,false),f=>f.memory.grow(1)];
 for(const mutate of mutations){const f=fixture(),original=f.engine.live.bind(f.engine);let calls=0;f.engine.live=(...args)=>{if(++calls===2)mutate(f);return original(...args);};const r=f.observe();assert.equal(r.available,false);assert.equal(r.nearest,null);assert.equal(r.cars.length,0);}
});
test('only the nearest32 observed rear cars are returned and nearest stays real even when the UI limit truncates the list',()=>{
 const f=fixture();f.list(Array.from({length:40},(_,i)=>[-80+i,0]));const r=f.observe();assert.equal(r.available,true);assert.equal(r.cars.length,32);assert.equal(r.observedBehindCars,40);assert.equal(r.truncated,true);assert.equal(r.nearest.distanceNative,41);assert.equal(r.cars.at(-1).distanceNative,72);
});
