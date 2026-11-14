'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../extension/race-telemetry.js'),{ABI}=T;
const memory=new WebAssembly.Memory({initial:Math.ceil((ABI.bitmap+ABI.bitmapBytes)/65536),maximum:32768,shared:true});
const bytes=new Uint8Array(memory.buffer),view=new DataView(memory.buffer),car=0xe10000,ride=0xe20000;
function fixture(type=27,types=0x2000000){
 bytes.fill(0,ABI.bitmap,ABI.bitmap+ABI.bitmapBytes);bytes.fill(0,car,car+0x14);bytes.fill(0,ride,ride+4);
 bytes.fill(0,types,types+ABI.stockTypes*ABI.typeStride);
 const put=(p,v)=>view.setUint32(p,v,true);
 const mark=(p,n,on=true)=>{for(let page=p>>>14;page<=(p+n-1)>>>14;page++){
  const at=ABI.bitmap+(page>>>3),mask=1<<(page&7);view.setUint8(at,on?view.getUint8(at)|mask:view.getUint8(at)&~mask);
 }};
 for(const [p,n]of [[car+0x10,4],[ride,4],[ABI.typesPointer,4],[types,ABI.stockTypes*ABI.typeStride]])mark(p,n);
 put(car+0x10,ride);put(ride,type);put(ABI.typesPointer,types);
 const entry=types+Math.min(type,30)*ABI.typeStride,name=T.STOCK_NAMES[Math.min(type,30)];
 bytes.set(Buffer.from(name+'\0'),entry);put(entry+0xd0,T.STOCK_HASHES[Math.min(type,30)]);
 const options={verified:true,moduleHash:ABI.moduleHash};
 const read=(m=memory,c=car,o=options)=>T.readCar(m,c,o);
 const snapshot=()=>[car,ride,ABI.typesPointer,types,ABI.bitmap].map((p,i)=>Buffer.from(bytes.subarray(p,p+[0x14,4,4,ABI.stockTypes*ABI.typeStride,ABI.bitmapBytes][i])));
 return{types,entry,put,mark,read,snapshot,options};
}
test('exact current build opt-in precedes every memory access',()=>{
 const memory={get buffer(){throw Error('must not read memory');}};
 for(const options of [undefined,null,{}, {verified:true},{moduleHash:ABI.moduleHash},{verified:1,moduleHash:ABI.moduleHash},{verified:true,moduleHash:'128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6'}])
  assert.deepEqual(T.readCar(memory,car,options),{carKey:'unknown',status:'unknown',reason:'exact-build-verification-required',liveVerified:false});
});
test('R34 requires stock SKYLINE name, terminator and name hash; reads never alter source memory',()=>{
 const f=fixture(),before=f.snapshot(),result=f.read();assert.equal(result.carKey,'r34');assert.equal(result.carType,27);assert.equal(result.stockName,'SKYLINE');assert.equal(result.stockHash,0xbe48375e);
 assert.equal(result.performanceVerified,false);assert.equal(result.liveVerified,false);assert.deepEqual(f.snapshot(),before);
});
test('all31 known stock player types require their own exact name and hash',()=>{
 for(let type=0;type<31;type++){
  const f=fixture(type),r=f.read();assert.equal(r.carKey,type===27?'r34':'other');assert.equal(r.carType,type);assert.equal(r.stockName,T.STOCK_NAMES[type]);
  f.put(f.entry+0xd0,T.STOCK_HASHES[type]^1);assert.equal(f.read().carKey,'unknown');
 }
});
test('ordinal27 alone, renamed models, prefixes and missing terminators never label R34',()=>{
 for(const change of [f=>bytes.set(Buffer.from('SKYLINX\0'),f.entry),f=>bytes.set(Buffer.from('SKYLINE2\0'),f.entry),
  f=>bytes.set(Buffer.from('skyline\0'),f.entry),f=>bytes.fill(0x41,f.entry,f.entry+32),f=>f.put(f.entry+0xd0,0),f=>f.put(ride,31)]){
  const f=fixture();change(f);assert.equal(f.read().carKey,'unknown');
 }
 const f=fixture(0);bytes.set(Buffer.from('SKYLINE\0'),f.entry);f.put(f.entry+0xd0,0xbe48375e);assert.equal(f.read().carKey,'unknown');
});
test('invalid car, ride, table alignment and low guest bounds fail closed',()=>{
 for(const bad of [0,1,-1,NaN,Infinity,car+1,0xffffffff,ABI.ceiling-8]){const f=fixture();assert.equal(f.read(memory,bad).carKey,'unknown');}
 for(const target of [car+0x10,ABI.typesPointer])for(const bad of [0,1,0xffffffff,ABI.ceiling-4,0x50000000]){
  const f=fixture();f.put(target,bad);assert.equal(f.read().carKey,'unknown');
 }
 const f=fixture();f.put(ride,0xffffffff);assert.equal(f.read().carKey,'unknown');
});
test('every page of car identity, ride, fixed pointer and declared table must be committed',()=>{
 for(const target of [car+0x10,ride,ABI.typesPointer,0x2000000,0x2004000,0x2008000,0x200c000,0x2010000,0x2014000,0x2018000]){
  const f=fixture();f.mark(target,1,false);assert.equal(f.read().carKey,'unknown',target.toString(16));
 }
});
test('exact low-window upper boundary is admitted and a table spanning it is not',()=>{
 const base=ABI.ceiling-ABI.stockTypes*ABI.typeStride,f=fixture(27,base);assert.equal(f.read().carKey,'r34');
 f.put(ABI.typesPointer,base+16);assert.equal(f.read().carKey,'unknown');
});
test('pointer/type/name/hash changes or loss of commitment before equal rereads return unknown',()=>{
 for(const change of [f=>f.put(car+0x10,ride+4),f=>f.put(ride,0),f=>f.put(ABI.typesPointer,f.types+16),
  f=>bytes.set(Buffer.from('CHANGED\0'),f.entry),f=>f.put(f.entry+0xd0,0),f=>f.mark(f.types+0x4000,1,false)]){
  const f=fixture();let reads=0;const changing={get buffer(){if(++reads===2)change(f);return memory.buffer;}};
  assert.equal(f.read(changing).carKey,'unknown');
 }
});
test('memory identity changes and unproved nonshared or undersized buffers stay unknown',()=>{
 const f=fixture();let reads=0;const changing={get buffer(){return ++reads===1?memory.buffer:new SharedArrayBuffer(16);}};
 assert.equal(f.read(changing).carKey,'unknown');
 for(const m of [null,{}, {buffer:new ArrayBuffer(16)},{buffer:new SharedArrayBuffer(16)}])assert.equal(f.read(m).carKey,'unknown');
});
test('module metadata explicitly limits the observational source evidence',()=>{
 assert.equal(T.PROVENANCE.stockBinaryPresent,false);assert.equal(T.PROVENANCE.liveVerified,false);assert.equal(T.PROVENANCE.performanceVerified,false);
 assert.equal(T.STOCK_HASHES[27],0xbe48375e);assert.equal(T.nameHash('SKYLINE'),0xbe48375e);assert.ok(Object.isFrozen(T.ABI));assert.ok(Object.isFrozen(T.STOCK_NAMES));
});
