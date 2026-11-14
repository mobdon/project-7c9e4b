/* Local research tests compile exact private game-function extracts at runtime.
 * They are not extension artifacts and must not be shipped as game code. */
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {patchCornerBody,BASE:A,MAGIC,CORNER_BASE:B,CORNER_MAGIC,Controller}=require('../extension/ai.js');
let originalModule,patchedModule;
function sameNativeMemory(a,b){const actual=Buffer.from(b.memory.buffer),expected=Buffer.from(a.memory.buffer);actual.copy(expected,B+28,B+28,B+32);assert.deepEqual(actual,expected);}

function replaceFirstBody(bytes){let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};const enc=n=>{const a=[];do{let x=n&127;n>>>=7;if(n)x|=128;a.push(x);}while(n);return Buffer.from(a);};while(p<bytes.length){const start=p,id=bytes[p++],len=u(),body=p,end=p+len;if(id===10){u();const at=p,n=u(),begin=p,fn=patchCornerBody(bytes.subarray(begin,begin+n));const section=Buffer.concat([bytes.subarray(body,at),enc(fn.length),Buffer.from(fn),bytes.subarray(begin+n,end)]);return Buffer.concat([bytes.subarray(0,start),Buffer.from([10]),enc(section.length),section,bytes.subarray(end)]);}p=end;}throw Error('No code section');}
before(async()=>{
 const {wabt,functions}=await require('../tools/extract-next-functions.cjs')([4653,4576,4577,4578]);
 const text=[4653,4576,4577,4578].map(i=>functions.get(i)).join('\n');
 const m=wabt.parseWat('next-native-corner.wat',`(module (memory (export "memory") 256 65536 shared) ${text} (export "run" (func $f4653)))`,{threads:true});m.resolveNames();m.validate({threads:true});const bytes=Buffer.from(m.toBinary({}).buffer);
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
test('exact native straight-cap cases remain bit-for-bit unchanged',()=>{
 for(const k of [0,-0,0.0001,-0.0001,0.001]){const a=fixture(originalModule),b=fixture();a.f(a.sp+8,k);b.f(b.sp+8,k);assert.equal(b.run(),a.run());assert.equal(b.get(B+16),0);assert.equal(b.get(A+60),100);}
});
test('actual native curvature-limited output is reduced only for the owned free-roam route',()=>{
 for(const k of [0.003,0.01,-0.01,0.05,-0.1]){const a=fixture(originalModule),b=fixture();a.f(a.sp+8,k);b.f(b.sp+8,k);const normal=a.run(),slower=b.run();assert.equal(slower,normal*0.8);assert.equal(b.get(B+16),1);assert.equal(b.get(B+12),b.car);assert.equal(b.get(b.cpu+32),0x4228bb);assert.equal(b.get(b.cpu+16),b.sp+4);assert.equal(b.get(b.cpu+136),a.get(a.cpu+136));assert.equal(b.get(A+60),100,'straight pace choice unchanged');}
});
test('disabled and all safety guards preserve complete native memory effects',()=>{
 const setup=[x=>x.put(B+4,0),x=>x.put(A+8,1),x=>x.put(0x89e7b0,1),x=>x.put(0x89e7b0,7),x=>x.put(0x89e7b0,8),x=>x.put(x.sp,0x123456),x=>x.put(x.cpu+12,x.car+4),x=>x.put(x.cpu+24,x.route+4),x=>x.put(x.driver+0x6e8,x.route+4),x=>x.put(A+36,0),x=>x.put(A+16,0),x=>x.put(A+4,3),x=>x.put(A+48,180),x=>x.put(A+52,0),x=>x.put(0x8654a4,3),x=>x.put(0xd00030,2),x=>x.put(0x850078,8),x=>x.put(0x866a14,1),x=>x.put(0x8669f4,1),x=>x.d.setUint8(0x89cf69,1),x=>x.d.setUint8(0x89e7d8,1),x=>x.d.setUint8(0x89e7d9,1),x=>x.put(0x890104,1),x=>x.put(x.car+0x24,1),x=>x.put(x.p+4,0),x=>x.put(x.p+16,1),x=>x.put(x.driver+4,0),x=>x.put(x.race,6),x=>x.put(A+20,x.race+4),x=>x.put(B+8,59),x=>x.put(B+8,96)];
 for(const change of setup){const a=fixture(originalModule),b=fixture();change(a);change(b);a.run();b.run();sameNativeMemory(a,b);}
});
test('non-finite or implausible planner arguments remain native and are not modified by hook',()=>{
 for(const [off,value] of [[4,NaN],[4,0],[4,-1],[4,21],[8,NaN],[8,Infinity],[8,11],[12,0],[12,NaN],[12,Infinity],[12,151]]){const a=fixture(originalModule),b=fixture();a.f(a.sp+off,value);b.f(b.sp+off,value);const normal=a.run(),result=b.run();assert.ok(Object.is(result,normal));assert.equal(b.get(B+16),0);}
});
test('corner modifier changes only returned ST0 and dedicated diagnostic records',()=>{
 const a=fixture(originalModule),b=fixture();a.run();b.run();const expected=new Uint8Array(a.memory.buffer),actual=new Uint8Array(b.memory.buffer),slot=b.cpu+72+(b.get(b.cpu+136)&7)*8;
 for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])assert.ok((i>=slot&&i<slot+8)||(i>=B+12&&i<B+36),'unexpected write at '+i.toString(16));
 assert.equal(b.get(b.sp+4),a.get(a.sp+4));assert.equal(b.get(b.sp+8),a.get(a.sp+8));assert.equal(b.get(b.sp+12),a.get(a.sp+12));
});
test('Controller only enables corner hook in free-roam mode and explicit opt-in',()=>{
 const f=fixture(),c=new Controller(f.memory,true,require('../extension/next-profile.js').capabilities),state={ready:true,driving:true,network:false,drag:false,car:f.car,race:f.race};
 c.update({enabled:true,safe:true,state,mode:2,cornerAssist:true,cornerFactor:0.7});assert.equal(f.get(B+4),1);assert.equal(f.get(B+8),70);
 c.update({enabled:true,safe:true,state,mode:1,cornerAssist:true});assert.equal(f.get(B+4),0);
 c.update({enabled:true,safe:true,state,mode:2,cornerAssist:'true'});assert.equal(f.get(B+4),0);c.stop();assert.equal(f.get(B+4),0);
});


test('adaptive margin uses native upcoming curvature, is monotonic and bounded',()=>{
 for(const factor of [60,80,95])for(const k of [0.003,0.01,-0.01,0.1,1,10]){
  const baseline=fixture(originalModule);baseline.f(baseline.sp+8,k);const normal=baseline.run();
  let previous=normal;
  for(const margin of [0,5,15,25]){
   const x=fixture();x.f(x.sp+8,k);x.put(B+8,factor);x.put(B+36,margin);
   const result=x.run(),expected=(normal*factor/100)*(1-(margin/100)*(1-normal/60));
   assert.ok(Math.abs(result-expected)<1e-12);
   assert.ok(result<=previous);assert.ok(result>=normal*factor/100*0.75);
   assert.equal(x.get(B+40),margin);assert.equal(x.get(B+16),1);previous=result;
  }
 }
});
test('adaptive margin leaves straight/gentle cases and malformed settings untouched',()=>{
 for(const k of [0,0.0001,-0.0001,0.001]){
  const a=fixture(originalModule),b=fixture();a.f(a.sp+8,k);b.f(b.sp+8,k);a.put(B+36,25);b.put(B+36,25);
  a.run();b.run();sameNativeMemory(a,b);
 }
 for(const margin of [26,100,0xffffffff]){
  const a=fixture(originalModule),b=fixture();a.put(B+36,margin);b.put(B+36,margin);a.run();b.run();
  sameNativeMemory(a,b);
 }
});
test('adaptive diagnostics reflect the actual last cap and change no other native memory',()=>{
 const a=fixture(originalModule),b=fixture();a.put(B+36,15);b.put(B+36,15);a.run();const result=b.run();
 const expected=new Uint8Array(a.memory.buffer),actual=new Uint8Array(b.memory.buffer),slot=b.cpu+72+(b.get(b.cpu+136)&7)*8;
 for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])assert.ok((i>=slot&&i<slot+8)||(i>=B+12&&i<B+36)||(i>=B+40&&i<B+44),'unexpected write at '+i.toString(16));
 const status=new Controller(b.memory,true).status();assert.equal(status.cornerMargin,15);assert.ok(status.cornerApplied<.8&&status.cornerApplied>.6);assert.equal(status.cornerApplied,b.d.getFloat32(B+24,true)/b.d.getFloat32(B+20,true));
 b.put(B+40,10);assert.equal(new Controller(b.memory,true).status().cornerApplied,null,'stale margin diagnostics cannot confirm');
});

test('native progress stages distinguish no call, context, owned caller, route and curvature without fake confirmation',()=>{
 const cases=[
  [x=>{},0,false],
  [x=>x.put(A+8,1),1,true],
  [x=>x.put(x.sp,0x123456),2,true],
  [x=>x.put(x.p+4,0),3,true],
  [x=>x.put(x.race,6),4,true],
  [x=>x.f(x.sp+8,0),5,true],
  [x=>x.f(0x7a51b8,0),6,true]
 ];
 for(const [change,stage,run] of cases){const a=fixture(originalModule),b=fixture();change(a);change(b);if(run){a.run();b.run();}
  assert.equal(b.d.getFloat32(B+28,true),-stage||0);assert.equal(b.get(B+16),0);sameNativeMemory(a,b);
  // In the wrong mode, status deliberately hides the dormant record.
  const status=new Controller(b.memory,true,require('../extension/next-profile.js').capabilities).status();
  assert.equal(status.cornerApplied,null);assert.equal(status.cornerProbeStage,stage===1?0:stage);
 }
});
test('real hit replaces progress marker and later unrelated helper calls preserve confirmed curvature',()=>{
 const x=fixture();x.run();const curvature=x.d.getFloat32(B+28,true),hits=x.get(B+16);
 assert.ok(curvature>0);assert.equal(new Controller(x.memory,true).status().cornerProbeStage,7);
 x.put(x.cpu+16,x.sp);x.put(x.sp,0x123456);x.run();assert.equal(x.d.getFloat32(B+28,true),curvature);assert.equal(x.get(B+16),hits);
});
test('progress marker is monotonic and fully dormant without an owned, enabled, fresh command',()=>{
 const x=fixture();x.f(x.sp+8,0);x.run();assert.equal(x.d.getFloat32(B+28,true),-5);
 x.put(x.cpu+16,x.sp);x.put(x.sp,0x123456);x.run();assert.equal(x.d.getFloat32(B+28,true),-5);
 for(const change of [x=>x.put(A,0),x=>x.put(A+28,0),x=>x.put(B,0),x=>x.put(B+4,0),x=>x.put(A+4,3),x=>x.put(A+48,180)]){
  const a=fixture(originalModule),b=fixture();change(a);change(b);a.run();b.run();assert.equal(b.get(B+28),0);sameNativeMemory(a,b);
 }
});
