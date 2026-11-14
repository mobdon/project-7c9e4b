'use strict';
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {compose}=require('../tools/compose-contact-prefixes.cjs');
const Cars=require('../extension/cars.js'),Walls=require('../extension/walls.js'),{BASE:A,MAGIC:AM}=require('../extension/ai.js');
let module_;
before(async()=>{
 const wabt=await require('../research/compatibility-v011/node_modules/wabt')();
 const car=fs.readFileSync(__dirname+'/../tools/cars.wat','utf8'),wall=fs.readFileSync(__dirname+'/../tools/walls-current.wat','utf8'),tail=' (call $native (local.get $cpu))))';
 assert.equal(car.endsWith(tail),true);assert.equal(wall.endsWith(tail),true);
 const source=car.slice(0,-tail.length)+wall.slice(wall.indexOf('(block $ordinary'),-tail.length)+tail;
 const compile=s=>{const m=wabt.parseWat('contact-composition.wat',s,{threads:true});m.resolveNames();m.validate({threads:true});return Buffer.from(m.toBinary({}).buffer);};
 module_=new WebAssembly.Module(compile(source));
 // Verify source composition exactly matches the raw prefix supplied for integration.
 const standalone=source.replace(tail,'))').replace('(import "env" "original" (func $native (param i32)))','');
 const imports=Array.from({length:22718},(_,i)=>`(import "unused" "${i}" (func))`).join('');
 const prod=compile(standalone.replace('(import "env" "roam_online"',imports+'(import "env" "roam_online"'));
 let p=8;const u=()=>{let n=0,s=0,x;do{x=prod[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0};let body;while(p<prod.length){const id=prod[p++],n=u(),end=p+n;if(id===10){u();const len=u();body=prod.subarray(p,p+len);break;}p=end;}
 const expected=compose(require('../tools/car-current-body.json'),require('../tools/wall-current-body.json'));assert.deepEqual([...body],expected);assert.deepEqual(expected,require('../tools/contact-current-body.json'));
});
function fixture(kind,cars,walls){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),put=(p,v)=>d.setUint32(p,v,true),get=p=>d.getUint32(p,true);
 const p=0xe00000,car=0xe01000,race=0xe04000,body=0xe05000,other=0xe06000,face=0xe07000,contact=0xe08000,pair=0xe09000,cpu=0xe0a000,stack=0xe0b000;
 put(A,AM);put(A+28,AM);put(A+4,2);put(0xd00000,p);put(p+4,car);put(0xd00030,1);put(0x8654a4,6);put(0x890118,race);put(race,4);put(car+0x3c,body);put(body+0x130,car);put(0x802084,2);put(contact+12,body);put(contact+16,other);put(contact+20,pair);put(pair+0x238,body);put(pair+0x23c,other);
 if(kind==='car'){put(other+0x130,face);put(face+0x3c,other);}else{put(other,0x7a22a8);d.setUint8(other+17,kind==='prop'?1:3);put(other+0x60,face);put(face+0x10,other);d.setFloat32(face+0x70,kind==='floor'?0:1,true);d.setFloat32(face+0x78,kind==='floor'?1:0,true);}
 const c=new Cars.Controller(memory,true),w=new Walls.Controller(memory,true),s={ready:true,driving:true,network:false,car,race};c.update({enabled:cars,safe:true,state:s});w.update({enabled:walls,safe:true,state:s});let original=0;
 const native=new WebAssembly.Instance(module_,{env:{memory,roam_online:()=>0,original:()=>{original++}}});const step=()=>{put(cpu+4,contact);put(cpu+16,stack);put(stack,0x12345678);native.exports.step(cpu);};return {step,get,pair,c,w,original:()=>original};
}
test('independent car/wall toggles only filter their selected contact category',()=>{
 for(const kind of ['car','wall','floor','prop'])for(const cars of [false,true])for(const walls of [false,true]){
  const x=fixture(kind,cars,walls);x.step();const skipped=kind==='car'?cars:kind==='wall'?walls:false;assert.equal(x.original(),+!skipped,`${kind}: cars=${cars}, walls=${walls}`);assert.equal(x.get(x.pair+0x240),+skipped);assert.equal(x.c.status().hits,+(kind==='car'&&cars));assert.equal(x.w.status().hits,+(kind==='wall'&&walls));
 }
});
test('turning either contact switch off leaves the other independent',()=>{
 const c=fixture('car',true,true);c.w.stop();c.step();assert.equal(c.original(),0);c.c.stop();c.step();assert.equal(c.original(),1);
 const w=fixture('wall',true,true);w.c.stop();w.step();assert.equal(w.original(),0);w.w.stop();w.step();assert.equal(w.original(),1);
});
