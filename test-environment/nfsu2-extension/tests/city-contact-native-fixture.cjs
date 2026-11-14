'use strict';
const assert=require('node:assert/strict');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),Adapter=require('../tools/online-rival-cars-v03811.cjs'),Cars=require('../extension/cars.js'),{Engine}=require('../extension/core.js');
const {leb,string,section}=require('../tools/latest-native-utils.cjs'),{locals}=require('../tools/compose-contact-prefixes.cjs');
const baseProfile=require('../extension/family-profiles.js').profiles.find(p=>p.revision==='943ee537');
const A=0xd0d100,B=Cars.BASE,AM=0x3749414e,REC=0x890160,SLOT=703504048,IMPORTS=22997,TARGET=20723;
let candidate,module_,onlineModule,slotModule;
function single(body,type){const types=[2,96,0,1,127,96,2,127,127,1,127],imports=[1,...string('env'),...string('memory'),2,3,...leb(11000),...leb(65536)];return new WebAssembly.Module(Buffer.from([0,97,115,109,1,0,0,0,...section(1,types),...section(2,imports),...section(3,[1,type]),...section(7,[1,...string('run'),0,0]),...section(10,[1,...leb(body.length),...body])]));}
async function prepare(){
 candidate=await Adapter.build(baseProfile);const raw=P.pinned(require('../native/full-publisher.cjs').PROFILES.find(p=>p.revision==='943ee537').native),native=P.parse(raw).bodies;
 onlineModule=single(native.get(22879),0);slotModule=single(native.get(22880),1);
 const old=native.get(22957),prefix=Buffer.from(candidate.combined),patched=Buffer.concat([prefix.subarray(0,-1),old.subarray(locals(old).end)]);
 assert.equal(locals(old).types.length,1);assert.equal(locals(patched).types.length,19);
 const imports=[...leb(IMPORTS+1),...string('env'),...string('memory'),2,3,...leb(11000),...leb(65536)];
 for(let i=0;i<IMPORTS;i++){const spec=i===22879?['online',2]:i===22880?['slot_kind',5]:i===22911?['ghost',3]:i===22913?['dispatch',4]:i===22523||i===22996?['pre'+i,1]:[String(i),0];imports.push(...string(spec[1]?'env':'unused'),...string(spec[0]),0,...leb(spec[1]));}
 const types=[6,96,0,0,96,1,127,0,96,0,1,127,96,1,127,1,127,96,2,127,127,0,96,2,127,127,1,127],code=[2,...leb(patched.length),...patched,...leb(old.length),...old];
 module_=new WebAssembly.Module(Buffer.from([0,97,115,109,1,0,0,0,...section(1,types),...section(2,imports),...section(3,[2,1,1]),...section(7,[2,...string('step'),0,...leb(IMPORTS),...string('original'),0,...leb(IMPORTS+1)]),...section(10,code)]));
}
function fixture({rivals=true,traffic=false,players=false,profile=candidate?.profile}={}){
 const memory=new WebAssembly.Memory({initial:11000,maximum:65536,shared:true}),d=new DataView(memory.buffer),put=(p,v)=>d.setUint32(p,v>>>0,true),get=p=>d.getUint32(p,true),byte=(p,v)=>d.setUint8(p,v);
 const p=0xe00000,car=0xe01000,race=0xe04000,body=0xe05000,other=0xe06000,face=0xe07000,contact=0xe08000,pair=0xe09000,cpu=0xe0a000,stack=0xe0b000,world=0xe0c000;
 for(const[a,v]of [[A,AM],[A+28,AM],[A+4,2],[A+84,1],[0xd00000,p],[0xd00030,1],[0x8654a4,6],[0x850078,1],[0x890118,race],[race,4],[p+4,car],[car+0x3c,body],[body+0x130,car],[other+0x130,face],[face+0x3c,other],[face+0x24,3],[face+0x14,REC],[REC+4,2],[0x890080,world],[world+0x10,2],[world+0x14,1],[world+0x18,2],[world+0x1c,car],[world+0x20,face],[contact+0xc,body],[contact+0x10,other],[contact+0x14,pair],[pair+0x238,body],[pair+0x23c,other],[0x802084,2],[car+0x434,3]])put(a,v);
 d.setFloat32(car+0x440,6000,true);profile.cars.onlineAddresses.forEach((a,i)=>i===1?byte(a,1):put(a,1));
 const engine=new Engine(memory,64,profile.hash),c=new Cars.Controller(memory,true,profile.cars),input={enabled:false,onlineRivals:rivals,onlineTraffic:traffic,onlinePlayers:players,allowNetwork:true,safe:true};
 const online=new WebAssembly.Instance(onlineModule,{env:{memory}}).exports.run,slotKind=new WebAssembly.Instance(slotModule,{env:{memory}}).exports.run;
 let ghost=0,slotCalls=0,pre=0,mutation=null;const dispatch=[];
 const env={memory,online,slot_kind:(car,out)=>{slotCalls++;const v=slotKind(car,out);if(mutation)mutation(slotCalls);return v;},ghost:()=>{ghost++;return 0;},pre22523:()=>{pre++;},pre22996:()=>{pre++;},dispatch:(cpu,target)=>dispatch.push({cpu,target})};
 const unused=new Proxy({},{get:(_,name)=>()=>{throw Error('Unexpected native call '+name);}}),native=new WebAssembly.Instance(module_,{env,unused});
 const update=(extra={})=>c.update({...input,state:engine.state(),...extra});update();
 const step=(original=false)=>{put(cpu+4,contact);put(cpu+16,stack);put(stack,0x12345678);native.exports[original?'original':'step'](cpu);};
 const swap=()=>{put(contact+12,other);put(contact+16,body);put(pair+0x238,other);put(pair+0x23c,body);};
 const outrun=()=>{put(0x89e7b0,7);put(race+0x24,2);for(const [i,carId]of[[0,car],[1,face]]){const r=race+0x30+0x1f0*i;put(r,carId);put(race+0xbd0+4*i,r);put(carId+0x1c,r);}update();};
 return{memory,d,put,get,byte,p,car,race,body,other,face,contact,pair,cpu,stack,world,c,engine,update,step,swap,outrun,online,slotKind,dispatch,ghost:()=>ghost,pre:()=>pre,slotCalls:()=>slotCalls,mutate:fn=>{mutation=fn;}};
}
module.exports={prepare,fixture,baseProfile,SLOT,A,B};
