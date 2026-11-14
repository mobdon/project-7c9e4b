/* Local research tests compile exact private game-function extracts at runtime.
 * They are not extension artifacts and must not be shipped as game code. */
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {patchCornerBody,BASE:A,MAGIC,CORNER_BASE:B,CORNER_MAGIC,Controller}=require('../extension/ai.js');
let originalModule,patchedModule;
function sameNativeMemory(a,b){const actual=Buffer.from(b.memory.buffer),expected=Buffer.from(a.memory.buffer);actual.copy(expected,B+28,B+28,B+32);assert.deepEqual(actual,expected);}

function replaceFirstBody(bytes){let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};const enc=n=>{const a=[];do{let x=n&127;n>>>=7;if(n)x|=128;a.push(x);}while(n);return Buffer.from(a);};while(p<bytes.length){const start=p,id=bytes[p++],len=u(),body=p,end=p+len;if(id===10){u();const at=p,n=u(),begin=p,fn=patchCornerBody(bytes.subarray(begin,begin+n));const section=Buffer.concat([bytes.subarray(body,at),enc(fn.length),Buffer.from(fn),bytes.subarray(begin+n,end)]);return Buffer.concat([bytes.subarray(0,start),Buffer.from([10]),enc(section.length),section,bytes.subarray(end)]);}p=end;}throw Error('No code section');}
before(async()=>{
 const {wabt,functions}=await require('../tools/extract-'+(process.env.NFS_PROFILE||'latest')+'-functions.cjs')([4653,4576,4577,4578]);
 const text=[4653,4576,4577,4578].map(i=>functions.get(i)).join('\n');
 const m=wabt.parseWat('latest-native-corner.wat',`(module (memory (export "memory") 256 65536 shared) ${text} (export "run" (func $f4653)))`,{threads:true});m.resolveNames();m.validate({threads:true});const bytes=Buffer.from(m.toBinary({}).buffer);
 originalModule=new WebAssembly.Module(bytes);patchedModule=new WebAssembly.Module(replaceFirstBody(bytes));
});

function fixture(module=patchedModule){
 const inst=new WebAssembly.Instance(module),memory=inst.exports.memory,d=new DataView(memory.buffer),cpu=0xe00000,sp=0xe01000,p=0xe02000,car=0xe03000,driver=0xe06000,race=0xe08000,route=driver+0x370;
 const put=(a,v)=>d.setUint32(a,v,true),f=(a,v)=>d.setFloat32(a,v,true),get=a=>d.getUint32(a,true);
 put(cpu+16,sp);put(cpu+12,car);put(cpu+24,route);d.setUint16(cpu+140,0x37f,true);put(sp,0x4228bb);f(sp+4,1);f(sp+8,0.01);f(sp+12,60);f(0x7a51b8,9.8);f(0x7d7d3c,0);
 put(A,MAGIC);put(A+28,MAGIC);put(A+4,2);put(A+8,2);put(A+12,p);put(A+16,car);put(A+20,race);put(A+32,p);put(A+36,car);put(A+40,race);put(A+52,1);put(A+60,100);put(B+48,100);
 put(B,CORNER_MAGIC);put(B+4,1);put(B+8,80);put(0xd00000,p);put(0xd00030,1);put(0x890118,race);put(0x8654a4,6);put(p+4,car);put(car+0x24,3);put(car+0x2c,driver);put(driver+4,car);put(driver+0x6e8,route);put(race,4);
 const run=()=>{inst.exports.run(cpu);return d.getFloat64(cpu+72+(get(cpu+136)&7)*8,true);};return {d,memory,cpu,sp,p,car,driver,race,route,put,f,get,run};
}
function road(module=patchedModule,{pace=300,braking=75,curvature=.01,factor=80,margin=15}={}){const x=fixture(module);x.put(A+8,1);x.put(A+60,pace);x.put(0x89e7b0,1);x.put(B+4,2);x.put(B+8,factor);x.put(B+36,margin);x.put(B+44,braking);x.put(B+48,pace);x.f(x.sp+8,curvature);return x;}
const nearly=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('opted-in online corner output equals solo output without changing network or foreign state',()=>{
 for(const [address,value] of [[0x850078,8],[0x850078,512],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
  const a=road(),b=road();b.put(address,value);b.put(A+84,1);assert.equal(b.run(),a.run());assert.equal(b.get(B+16),1);
  const expected=Buffer.from(a.memory.buffer);expected.writeUInt32LE(value,address);expected.writeUInt32LE(1,A+84);assert.deepEqual(Buffer.from(b.memory.buffer),expected);
  for(const bad of [0,2,0xffffffff]){const c=road(originalModule),d=road();c.put(address,value);d.put(address,value);c.put(A+84,bad);d.put(A+84,bad);assert.equal(d.run(),c.run());assert.equal(d.get(B+16),0);sameNativeMemory(c,d);}
 }
 for(const change of [x=>x.put(A+36,x.car+4),x=>x.put(x.cpu+12,x.car+4),x=>x.put(x.driver+0x6e8,x.route+4),x=>x.put(x.p+16,1),x=>x.put(0xd00030,2),x=>x.put(A+4,3),x=>x.put(A+48,180),x=>x.put(x.race,6),x=>x.d.setUint8(0x89e7d8,1),x=>x.d.setUint8(0x89e7d9,1)]){
  const a=road(originalModule),b=road();for(const x of [a,b]){x.put(0x850078,8);x.put(A+84,1);change(x);}assert.equal(b.run(),a.run());assert.equal(b.get(B+16),0);sameNativeMemory(a,b);
 }
});
test('race corner output compensates post-route pace while preserving native controls and sharpness',()=>{
 for(const pace of [75,100,150,260,300])for(const factor of [60,80,95])for(const curvature of [.003,.01,-.01,.1,1]){
  const a=road(originalModule,{pace,factor,curvature}),b=road(patchedModule,{pace,factor,curvature});const normal=a.run(),got=b.run(),P=Math.max(1,pace/100);
  const corner=P===1?normal:Math.sqrt(Math.fround(9.8)/Math.abs(Math.fround(curvature)));
  const protectedCap=corner*factor/100*(1-.15*Math.max(0,1-corner/60));
  nearly(got,protectedCap/P);assert.ok(got<=normal);assert.equal(b.get(B+16),1);assert.equal(b.get(B+52),pace);assert.equal(b.get(B+56),75);assert.equal(b.get(A+60),pace);
  assert.equal(b.get(b.cpu+32),0x4228bb);assert.equal(b.get(b.cpu+16),b.sp+4);
 }
});
test('race clear straights stay native and high-pace gentle curves are protected',()=>{
 for(const pace of [75,100,150,260,300])for(const curvature of [0,-0,.000001]){const a=road(originalModule,{pace,curvature}),b=road(patchedModule,{pace,curvature});assert.equal(b.run(),a.run());assert.equal(b.get(B+16),0);assert.equal(b.get(B+52),0);}
 const a=road(originalModule,{curvature:.001}),b=road(patchedModule,{curvature:.001});assert.equal(a.run(),60);assert.ok(b.run()<60);assert.equal(b.get(B+16),1);
});
test('road option rejects all non-road, foreign, special, malformed and network contexts',()=>{
 const changes=[x=>x.put(B+4,0),x=>x.put(B+4,1),x=>x.put(B,0x32524e43),x=>x.put(A+8,2),... [0,7,8,99].map(v=>x=>x.put(0x89e7b0,v)),... [0x89e7d8,0x89e7d9].map(p=>x=>x.d.setUint8(p,1)),... [0x890104,0x890108,0x890114].map(p=>x=>x.put(p,1)),x=>{x.put(A+84,0);x.put(0x850078,8)},... [0x866a14,0x8669f4,0x89cf69].map(p=>x=>{x.put(A+84,0);x.put(p,1)}),x=>x.put(A+36,0),x=>x.put(A+4,3),x=>x.put(A+48,180),x=>x.put(x.cpu+12,x.car+4),x=>x.put(x.cpu+24,x.route+4),x=>x.put(x.driver+0x6e8,x.route+4),x=>x.put(x.race,6),x=>x.put(x.sp,0x4228bc),... [0,74,301,0xffffffff].map(v=>x=>x.put(B+48,v)),... [0,49,101,0xffffffff].map(v=>x=>x.put(B+44,v)),x=>x.put(A+60,260),x=>x.put(B+8,96),x=>x.put(B+36,26)];
 for(const change of changes){const a=road(originalModule),b=road();change(a);change(b);a.run();b.run();sameNativeMemory(a,b);assert.equal(b.get(B+16),0);}
});
test('race hook only changes ST0 and dedicated diagnostic fields, never steering or identity',()=>{
 const a=road(originalModule),b=road();a.run();b.run();const expected=new Uint8Array(a.memory.buffer),actual=new Uint8Array(b.memory.buffer),slot=b.cpu+72+(b.get(b.cpu+136)&7)*8;
 for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])assert.ok((i>=slot&&i<slot+8)||(i>=B+12&&i<B+36)||(i>=B+40&&i<B+44)||(i>=B+52&&i<B+60),'unexpected write '+i.toString(16));
 const status=new Controller(b.memory,true).status();assert.equal(status.cornerMode,2);assert.equal(status.cornerPace,3);assert.equal(status.cornerBraking,.75);assert.equal(status.cornerHits,1);assert.equal(status.cornerProbeStage,7);assert.ok(status.cornerApplied>0);b.put(B+52,260);assert.equal(new Controller(b.memory,true).status().cornerApplied,null);
});
