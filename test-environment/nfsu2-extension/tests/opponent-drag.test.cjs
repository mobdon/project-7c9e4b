'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {bodies,readPinned,leb,section,string}=require('../tools/latest-native-utils.cjs');
const {patchDragSelector,Controller}=require('../extension/ai.js'),profile=require('../extension/latest-profile.js');
const original=bodies(readPinned('latest')).get(19277),patched=Buffer.from(patchDragSelector(original,profile.dragSelector));
// Execute the exact native initializer body, with only its native action setter stubbed.
// Native call index17092 is preserved, so import matching indices, all with (i32)->void.
const imports=[];for(let i=0;i<=17092;i++)imports.push(...string('env'),...string('f'+i),0,0);
imports.push(...string('env'),...string('memory'),2,3,...leb(256),...leb(65536));
const moduleBytes=Buffer.from([0,97,115,109,1,0,0,0,...section(1,[1,0x60,1,127,0]),...section(2,[...leb(17094),...imports]),...section(3,[1,0]),...section(7,[1,...string('run'),0,...leb(17093)]),...section(10,[1,...leb(patched.length),...patched])]);
const mod=new WebAssembly.Module(moduleBytes);
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),byte=(a,v)=>d.setUint8(a,v);
 const cpu=0xe00000,p=0xe01000,car=0xe02000,driver=0xe04000,rec=0xe06000,race=0xe08000,stack=0xe09000,B=13684992,calls=[];
 const env={memory};for(let i=0;i<=17092;i++)env['f'+i]=()=>{throw Error('Unexpected native call '+i)};
 env.f17092=c=>{const sp=get(c+16);calls.push(get(sp+4));put(c+16,sp+8);};
 const instance=new WebAssembly.Instance(mod,{env});
 for(const [a,v] of [[cpu+4,driver],[cpu+16,stack],[driver,0x785370],[driver+4,car],[car+20,rec],[rec+4,1],[car+36,3],[car+40,1],[car+44,driver],[p+4,car],[0xd00000,p],[0xd00030,1],[0x8654a4,6],[0x890118,race],[race,4],[B,927547726],[B+28,927547726],[B+4,2],[B+8,2],[B+12,p],[B+16,car],[B+20,race],[B+32,p],[B+36,car],[B+40,race],[B+88,1]])put(a,v);
 byte(0x89e7d8,1);byte(car+1472,1);
 return {memory,d,put,get,byte,cpu,p,car,driver,rec,race,stack,B,calls,run(){put(cpu+16,stack);instance.exports.run(cpu);return calls.at(-1)}};
}
test('exact initializer retains all bytes except selector expression and extra locals',()=>{const off=profile.dragSelector.offset;assert.deepEqual(patched.subarray(3,off),original.subarray(3,off));assert.deepEqual(patched.subarray(off+profile.dragSelector.expression.length),original.subarray(off+2));});
test('owned player selects opponent action2 without identity writes; native reinitialization repeats safely',()=>{const f=fixture();assert.equal(f.run(),2);assert.equal(f.get(f.rec+4),1);assert.equal(f.get(f.car+36),3);assert.equal(f.run(),2);});
test('native opponent and non-drag paths unchanged',()=>{const f=fixture();f.put(f.rec+4,2);assert.equal(f.run(),2);const g=fixture();g.byte(0x89e7d8,0);assert.equal(g.run(),1);});
test('selector rejects stale, paused, unowned, wrong targets, foreign drivers, offline permission and incomplete requests',()=>{
 const changes=[f=>f.put(f.B,0),f=>f.put(f.B+28,0),f=>f.put(f.B+4,3),f=>f.put(f.B+48,180),f=>f.put(f.B+8,0),f=>f.put(f.B+88,0),f=>f.put(0x8654a4,3),f=>f.put(0xd00030,2),f=>f.put(f.B+36,0),f=>f.put(f.B+16,0),f=>f.put(f.B+32,0),f=>f.put(f.B+12,0),f=>f.put(f.B+40,0),f=>f.put(f.B+20,0),f=>f.put(f.p+16,1),f=>f.put(f.race,3),f=>f.put(f.car+36,1),f=>f.put(f.car+40,3),f=>f.byte(f.car+1472,0),f=>f.put(f.car+44,0),f=>f.put(f.driver,0),f=>f.put(0x850078,8),f=>f.put(0x866a14,1),f=>f.put(0x8669f4,1),f=>f.byte(0x89cf69,1),f=>f.put(0xd00000,0xffffffff),f=>f.put(0x890118,0xffffffff)];
 for(const change of changes){const f=fixture();change(f);assert.equal(f.run(),3,String(change));}
});
test('explicit online permission allows owned selection without changing native network state',()=>{const f=fixture();f.put(0x850078,8);f.put(f.B+84,1);assert.equal(f.run(),2);assert.equal(f.get(0x850078),8);});
