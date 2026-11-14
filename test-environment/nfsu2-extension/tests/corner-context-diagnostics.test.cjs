const {test}=require('node:test'),assert=require('node:assert/strict');
const {Controller,BASE:A,MAGIC,CORNER_BASE:B,CORNER_MAGIC}=require('../extension/ai.js');
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),put=(a,v)=>d.setUint32(a,v,true);
 const p=0xe00000,car=0xe02000,race=0xe04000,driver=0xe06000,route=driver+0x370;
 for(const [a,v] of [[A,MAGIC],[A+28,MAGIC],[A+8,2],[A+12,p],[A+16,car],[A+20,race],[A+32,p],[A+36,car],[A+40,race],[A+52,1],[B,CORNER_MAGIC],[B+4,1],[B+8,80],[0xd00000,p],[0xd00030,1],[0x8654a4,6],[0x890118,race],[p+4,car],[car+0x24,3],[car+0x2c,driver],[driver+4,car],[driver+0x6e8,route],[route+4,10],[route+0xd0,3],[race,4]])put(a,v);
 const c=new Controller(memory,true,require('../extension/latest-profile.js').capabilities);
 return {memory,d,put,p,car,race,driver,route,c};
}
test('valid private route exposes bounded counts without claiming a hook hit',()=>{
 const f=fixture(),before=Buffer.from(f.memory.buffer),s=f.c.status();
 assert.equal(s.cornerGuardMask,0);assert.equal(s.cornerDriverValid,true);assert.equal(s.cornerRouteOwned,true);assert.equal(s.cornerRouteNodes,10);assert.equal(s.cornerPlannerCorners,3);assert.equal(s.cornerHits,0);assert.equal(s.cornerApplied,null);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('network opt-in matches native corner guard and does not require offline free roam',()=>{
 const f=fixture();f.put(0x850078,8);assert.equal(f.c.status().cornerGuardMask,32);f.put(A+84,1);assert.equal(f.c.status().cornerGuardMask,0);
});
test('zero planner corners, invalid counts and route mismatch remain distinguishable',()=>{
 const f=fixture();f.put(f.route+0xd0,0);assert.equal(f.c.status().cornerPlannerCorners,0);
 f.put(f.route+4,41);f.put(f.route+0xd0,0xffffffff);let s=f.c.status();assert.equal(s.cornerRouteNodes,null);assert.equal(s.cornerPlannerCorners,null);
 f.put(f.driver+0x6e8,f.route+4);s=f.c.status();assert.equal(s.cornerGuardMask,128);assert.equal(s.cornerRouteOwned,false);assert.equal(s.cornerRouteNodes,null);assert.equal(s.cornerPlannerCorners,null);
});
test('guard masks identify drift and stale ownership without writes',()=>{
 const f=fixture();f.put(0x890104,1);assert.equal(f.c.status().cornerGuardMask,16);f.put(0x890104,0);f.put(f.driver+4,0);const before=Buffer.from(f.memory.buffer),s=f.c.status();assert.equal(s.cornerGuardMask,192);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('schema includes only bounded diagnostic counts and flags, never pointers',()=>{
 const memoryStorage={getItem:()=>null,setItem(k,v){this.value=v}},log=require('../extension/diagnostics.js').create({storage:memoryStorage});
 log.record('state',{cornerDriverValid:true,cornerRouteOwned:true,cornerRouteNodes:10,cornerPlannerCorners:3,cornerGuardMask:32,cornerRoute:123456});
 let e=JSON.parse(memoryStorage.value).events.at(-1).data;assert.deepEqual(e,{cornerDriverValid:true,cornerRouteOwned:true,cornerRouteNodes:10,cornerPlannerCorners:3,cornerGuardMask:32});
 log.record('state',{cornerRouteNodes:41,cornerPlannerCorners:-1,cornerGuardMask:256});e=JSON.parse(memoryStorage.value).events.at(-1).data;assert.deepEqual(e,{});
});
