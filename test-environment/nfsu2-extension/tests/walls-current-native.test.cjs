/* Executes the current module's actual wall wrapper and online guard with the
 * authored wall prefix. Only ghost/trampoline calls are controlled test stubs. */
'use strict';
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {Controller,BASE:B,MAGIC}=require('../extension/walls.js');
const {BASE:A,MAGIC:AM}=require('../extension/ai.js');
const config=require('../tools/wall-current-config.json');
let module_;
before(async()=>{
 const {wabt,functions}=await require('../tools/extract-current-functions.cjs')([22430,22718]);
 let source=fs.readFileSync(__dirname+'/../tools/walls-current.wat','utf8');
 source=source.replace('(memory 256 65536 shared)','(memory 10800 65536 shared)');
 source=source.replace('(import "env" "roam_online" (func $roam_online (result i32)))',functions.get(22718).replace('$f22718','$roam_online'));
 source=source.replace('(import "env" "original" (func $native (param i32)))',functions.get(22430).replace('$f22430','$native'));
 source=source.replace('(module','(module (import "env" "ghost" (func $f22747 (param i32)(result i32))) (import "env" "dispatch" (func $f22749 (param i32 i32)))');
 const m=wabt.parseWat('current-native-wall.wat',source,{threads:true});m.resolveNames();m.validate({threads:true});module_=new WebAssembly.Module(m.toBinary({}).buffer);
});
function fixture(){
 const memory=new WebAssembly.Memory({initial:10800,maximum:65536,shared:true}),d=new DataView(memory.buffer);
 const p=0xe00000,car=0xe01000,race=0xe04000,body=0xe05000,wall=0xe06000,face=0xe07000,contact=0xe08000,pair=0xe09000,cpu=0xe0a000,stack=0xe0b000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),f=(a,v)=>d.setFloat32(a,v,true);
 put(A,AM);put(A+28,AM);put(A+4,2);put(B,MAGIC);put(B+4,2);put(B+8,1);put(B+12,p);put(B+16,car);put(B+20,race);
 put(0xd00000,p);put(0xd00030,1);put(0x8654a4,6);put(0x850078,1);put(0x890118,race);put(race,4);put(p+4,car);put(car+0x3c,body);put(body+0x130,car);
 put(wall,0x7a22a8);d.setUint8(wall+0x11,3);put(wall+0x60,face);put(face+0x10,wall);f(face+0x70,1);
 put(contact+0xc,body);put(contact+0x10,wall);put(contact+0x14,pair);put(pair+0x238,body);put(pair+0x23c,wall);put(0x802084,2);
 let ghost=false,ghostCalls=0,dispatch=[];const inst=new WebAssembly.Instance(module_,{env:{memory,ghost:c=>{assert.equal(c,contact);ghostCalls++;return +ghost},dispatch:(c,target)=>dispatch.push({cpu:c,target})}});
 const step=()=>{put(cpu+4,contact);put(cpu+16,stack);put(stack,0x12345678);inst.exports.step(cpu)};
 return {memory,d,put,get,car,contact,pair,cpu,stack,step,ghost:v=>{ghost=v},ghostCalls:()=>ghostCalls,dispatch,controller:new Controller(memory,true,config)};
}
test('current actual wall wrapper is skipped only for the eligible offline wall',()=>{
 const x=fixture();x.step();assert.equal(x.ghostCalls(),0);assert.deepEqual(x.dispatch,[]);assert.equal(x.get(x.pair+0x240),1);assert.equal(x.get(x.cpu+16),x.stack+4);assert.equal(x.get(x.cpu+32),0x12345678);
});
test('disabled prefix preserves the current actual wrapper and its exact original table target',()=>{
 const x=fixture();x.put(B+8,0);x.step();assert.equal(x.ghostCalls(),1);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:20700}]);assert.equal(x.get(x.cpu+16),x.stack);assert.equal(x.get(x.pair+0x240),0);
});
test('disabled prefix preserves the current original ghost-return path',()=>{
 const x=fixture();x.put(B+8,0);x.ghost(true);x.step();assert.equal(x.ghostCalls(),1);assert.deepEqual(x.dispatch,[]);assert.equal(x.get(x.cpu+16),x.stack+4);assert.equal(x.get(x.cpu+32),0x12345678);
});
test('actual current online globals block both native filter and page controller',()=>{
 const x=fixture();for(const a of config.onlineAddresses)x.put(a,1);x.controller.refresh();assert.equal(x.controller.onlineRoam(),true);x.step();assert.equal(x.get(B+24),2);assert.equal(x.get(x.pair+0x240),0);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:20700}]);
});
test('old online addresses cannot replace current online guard checks',()=>{
 const x=fixture();for(const a of [703669484,703786368,703670652])x.put(a,1);x.controller.refresh();assert.equal(x.controller.onlineRoam(),false);x.step();assert.deepEqual(x.dispatch,[]);assert.equal(x.get(x.pair+0x240),1);
});
