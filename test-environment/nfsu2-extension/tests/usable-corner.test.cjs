'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const AI=require('../extension/ai.js'),{Pacing}=require('../extension/dynamic-pacing.js'),profile=require('../extension/next-profile.js');
const A=AI.BASE,B=AI.CORNER_BASE;
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:256,shared:true}),d=new DataView(memory.buffer),put=(p,n)=>d.setUint32(p,n,true),f=(p,n)=>d.setFloat32(p,n,true);
 const player=0xe00000,car=0xe02000,race=0xe04000,driver=0xe06000,route=driver+0x370,record=route+0xd4;
 for(const [p,n]of [[A,AI.MAGIC],[A+28,AI.MAGIC],[A+4,2],[A+8,1],[A+12,player],[A+16,car],[A+20,race],[A+32,player],[A+36,car],[A+40,race],[A+52,1],[A+60,200],[B,AI.CORNER_MAGIC],[B+4,3],[B+8,80],[B+12,car],[B+16,1],[B+32,80],[B+36,15],[B+40,15],[B+44,75],[B+48,200],[B+52,200],[B+56,75],[B+60,9],[0xd00000,player],[0xd00030,1],[0x8654a4,6],[0x890118,race],[0x89e7b0,1],[player+4,car],[car+0x24,3],[car+0x2c,driver],[driver,0x785370],[driver+4,car],[driver+0x6e8,route],[route+4,28],[route+0xd0,1],[race,4]])put(p,n);
 f(B+20,60);f(B+24,30);
 const nodes=Array.from({length:28},(_,i)=>{const p=0xf00000+i*256;put(route+8+i*4,p);put(p+0x64,route);return p;});
 const points=[[-10,0],[0,0],[10,0],[10,10],[10,20]];
 const point=(i,x,y)=>{f(record+i*8,x);f(record+i*8+4,y);};points.forEach((p,i)=>point(i,...p));
 for(let i=0;i<5;i++)f(record+40+i*4,i*10);
 d.setInt8(record+116,10);for(let i=0;i<8;i++)d.setInt8(record+117+i,i);
 f(record+0x60,30);
 return {memory,d,put,f,player,car,race,driver,route,record,nodes,point,c:new AI.Controller(memory,true,profile.capabilities)};
}
function paced(status){const p=new Pacing();let result;for(let now=0;now<=10000;now+=50)result=p.update({enabled:true,ceiling:2,identity:'same-route',now,evidence:status,speedMps:60,hazards:{cars:[],barrierAhead:null}});return result;}
test('owned current nonzero bend exposes bounded usable count without memory writes',()=>{
 const x=fixture(),before=Buffer.from(x.memory.buffer),s=x.c.status();assert.equal(s.cornerGuardMask,0);assert.equal(s.cornerPlannerUsable,1);assert.equal(paced(s).pace,2);assert.deepEqual(Buffer.from(x.memory.buffer),before);
 for(const index of [0,26]){x.d.setInt8(x.record+116,index);assert.equal(x.c.status().cornerPlannerUsable,1);}
});
test('tail-only record cannot authorize boost despite matching historical hook results',()=>{
 const x=fixture();x.d.setInt8(x.record+116,27);const s=x.c.status();assert.equal(s.cornerPlannerCorners,1);assert.equal(s.cornerHits,1);assert.equal(s.brakingHits,9);assert.equal(s.cornerPlannerUsable,0);assert.equal(paced(s).pace,1);
});
test('negative sentinel remains unknown forward coverage and malformed indices fail closed',()=>{
 const x=fixture();x.d.setInt8(x.record+116,-1);assert.equal(x.c.status().cornerPlannerUsable,0);assert.equal(paced(x.c.status()).pace,1);
 for(const index of [-128,-2,28,127]){x.d.setInt8(x.record+116,index);assert.equal(x.c.status().cornerPlannerUsable,null);assert.equal(paced(x.c.status()).pace,1);}
});
test('empty, excessive and unavailable node/record counts cannot authorize boost',()=>{
 for(const [nodes,corners,want]of [[28,0,0],[28,6,null],[28,40,null],[1,1,null],[0,1,null],[41,1,null]]){const x=fixture();x.put(x.route+4,nodes);x.put(x.route+0xd0,corners);assert.equal(x.c.status().cornerPlannerUsable,want);assert.equal(paced(x.c.status()).pace,1);}
});
test('zero or straight caps, straight triples, duplicate points and collinear reversal grant no boost',()=>{
 for(const cap of [0,60]){const x=fixture();x.f(x.record+0x60,cap);assert.equal(x.c.status().cornerPlannerUsable,0);assert.equal(paced(x.c.status()).pace,1);}
 for(const mutate of [x=>x.point(3,20,0),x=>x.point(2,0,0),x=>x.point(3,0,0)]){const x=fixture();mutate(x);assert.equal(x.c.status().cornerPlannerUsable,0);assert.equal(paced(x.c.status()).pace,1);}
});
test('nonfinite/invalid cap, points, native distances and stale side markers are unknown',()=>{
 const changes=[x=>x.f(x.record+0x60,NaN),x=>x.f(x.record+0x60,61),x=>x.f(x.record+0x60,-1),x=>x.point(0,NaN,0),x=>x.f(x.record+44,0),x=>x.f(x.record+48,Infinity),x=>x.d.setInt8(x.record+117,-1),x=>x.d.setInt8(x.record+117,28),x=>x.put(x.nodes[0]+0x64,0),x=>x.put(x.route+8,0)];
 for(const change of changes){const x=fixture();change(x);assert.equal(x.c.status().cornerPlannerUsable,null);assert.equal(paced(x.c.status()).pace,1);}
});
test('all five bounded records are checked and any malformed current record withholds boost',()=>{
 const x=fixture(),one=new Uint8Array(x.memory.buffer,x.record,128).slice();x.put(x.route+0xd0,5);
 for(let i=1;i<5;i++)new Uint8Array(x.memory.buffer,x.record+i*128,128).set(one);
 assert.equal(x.c.status().cornerPlannerUsable,5);x.d.setInt8(x.record+4*128+117,-1);assert.equal(x.c.status().cornerPlannerUsable,null);
});
test('concurrent count/identity or record publication changes withhold boost',()=>{
 for(const field of ['count','identity','record']){
  const x=fixture(),original=x.c.u32.bind(x.c);let reads=0;
  x.c.u32=p=>{
   const value=original(p);
   if(field==='count'&&p===x.route+4&&++reads===2)return value+1;
   if(field==='identity'&&p===x.driver+0x6e8&&++reads===2)return value+4;
   if(field==='record'&&p===x.nodes[0]+0x64&&++reads===1)x.f(x.record+0x60,20);
   return value;
  };
  assert.equal(x.c.status().cornerPlannerUsable,null,field);
 }
});
test('city command stays ineligible while legacy race command samples the same bounded records',()=>{
 for(const command of [1,2]){const x=fixture();x.put(B+4,command);const before=Buffer.from(x.memory.buffer),s=x.c.status();assert.equal(s.cornerPlannerUsable,command===2?1:null);assert.equal(s.cornerPlannerTelemetryStatus,command===2?'sampled':'command-ineligible');assert.deepEqual(Buffer.from(x.memory.buffer),before);}
});
