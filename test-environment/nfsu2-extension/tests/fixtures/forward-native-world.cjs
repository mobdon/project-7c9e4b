'use strict';
// Controlled projection/construction receipt; actual pinned production query,
// planner, publisher and setter thereafter. No complete game world is run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const Query=require('../../../research/current-native-image/query-audit.cjs');
const Native=require('../../../research/current-native-image/evaluator-audit.cjs');
const P=require('../../../work-current-profile/tools/native-proof.cjs');
const Registry=require('../../extension/forward-native-config.js');
const Patcher=require('../../extension/forward-native-patcher.js');
const Geometry=require('../../extension/forward-geometry.js');
const Driving=require('../../extension/forward-driving.js');
const Pacing=require('../../extension/forward-pacing.js');
const FILES={
 '3bdd9959':'research/game-3bdd9959.wasm',
 'd2fa4f4c':'research/compatibility-d2fa4f4c/game.wasm',
 'cd5b74d5':'research/compatibility-cd5b74d5/game.wasm',
 '8abf9be8':'research/compatibility-8abf9be8/game.wasm',
 '93cfc6e9':'research/compatibility-93cfc6e9/game.wasm',
 'aa2429fb':'research/compatibility-aa2429fb/game.wasm',
 '15e5958f':'research/compatibility-15e5958f/game.wasm',
 '943ee537':'research/compatibility-943ee537/game.wasm'
};
const A={player:0x210000,car:0x220000,driver:0x230000,race:0x240000,trackInfo:0x250000,nodeBase:0x260000,group:0x300000,controller:0x320000,vtable:0x340000};
const modules=new Map();
async function nativeModule(profile,{includeIDs=[],transformBytes=null}={}){
 const key=profile.moduleHash+':'+[...includeIDs].sort((a,b)=>a-b).join(',');
 const create=async()=>{
  const input=fs.readFileSync(path.resolve(__dirname,'../../..',FILES[profile.revision]));assert.equal(input.length,profile.originalBytes);assert.equal(P.hash(input),profile.moduleHash);
  const patched=Buffer.from(await Patcher.patchModule(input)),output=transformBytes?Buffer.from(await transformBytes(patched)):patched,base=profile.importFunctions+profile.definedFunctions,helperIds=profile.helpers.map((_,i)=>base+i);
  const module=Native.privateModule(output,new Set([...profile.requiredBodies.map(p=>p.index),...helperIds,6140,...includeIDs]),[...helperIds,6140,...includeIDs]).module;
  return{input,output,module,helperIds};
 };
 if(transformBytes)return create();
 if(!modules.has(key))modules.set(key,create());
 return modules.get(key);
}
async function world(revision='3bdd9959',{progress=50,network=null,permission=0,dense=false,pace=1.45,angle=90,exitAligned=true,nodeCount=null,nodeGap=null,cornerAt=null,nativeOptions=undefined}={}){
 const profile=Object.values(Registry.profiles).find(p=>p.revision===revision);assert(profile,'Exact test profile');
 const abi=Geometry.abiForHash(profile.moduleHash),q=await Query.createFixture(),built=await nativeModule(profile,nativeOptions),view=q.v,data=q.f.bytes,memory=q.f.memory;
 const f={...A,memory,view,data,cpu:Query.ORIGINAL_CPU,stack:Query.ORIGINAL_STACK,profile,abi};
 f.u=(p,value)=>value===undefined?view.getUint32(p,true):view.setUint32(p,value>>>0,true);
 f.f32=(p,value)=>value===undefined?view.getFloat32(p,true):view.setFloat32(p,value,true);
 f.h=(p,value)=>view.setUint16(p,value&65535,true);
 f.commit=(p,n)=>{for(let at=p&-16384;at<p+n;at+=16384){const pg=at>>>14,b=abi.bitmap+(pg>>>3);view.setUint8(b,view.getUint8(b)|(1<<(pg&7)));}};
 const route=f.driver+0x370,count=nodeCount??(dense?19:3);f.route=route;
 for(const[p,n]of [[abi.base,abi.size],[0xd0d100,104],[0xd0d200,64],[0x8654a4,4],[0xd00000,0x34],[0x89e7a0,0x48],[0x850078,20],[0x8669f4,0x24],[0x89cf69,1],[0x890104,0x18],[0x86346c,8],[0x86518c,4],[0x883dac,4],[0x85ef48,8],[0x88a334,6000],[f.player,20],[f.car,0x9c],[f.driver,0x774],[f.race,24],[f.trackInfo,0x8c],[f.nodeBase,40*128],[f.group,140+56*count],[f.controller,0x240],[f.vtable,60],[f.stack-4096,8192],...[7881336,8513532,8972912].map(p=>[p,4]),...[0x784a48,0x784aa0].map(p=>[p,60])])f.commit(p,n);
 for(const p of [0x850078,0x850088,0x866a14,0x8669f4,0x890104,0x890108,0x89010c,0x890114,0x863470,0x85ef48,0x85ef4c])f.u(p,0);
 for(const p of [0x89cf69,0x89e7d8,0x89e7d9,0x89e7e3])view.setUint8(p,0);
 f.u(0x8654a4,6);f.u(0xd00030,1);f.u(0xd00000,f.player);f.u(0x89e7b0,1);f.u(0x89e7a0,4715);f.u(0x89e7a4,0);f.u(0x890118,f.race);
 f.u(f.player+4,f.car);f.u(f.player+16,0);f.u(f.car+36,3);f.u(f.car+44,f.driver);f.u(f.driver,0x785370);f.u(f.driver+4,f.car);f.u(f.driver+0x6e8,route);f.f32(f.driver+0x770,pace);f.u(f.driver+16,1);
 if(profile.capabilities.nativePolicy===true){const ride=0x360000,types=0x370000;f.u(f.car+0x10,ride);f.u(ride,0);view.setUint8(ride+0x14,0);f.u(0x8a1ccc,types);view.setUint8(types+0x88a,0);for(const[p,n]of [[ride,24],[types,0x890],[0x8a1ccc,4],[0x7a4740,64],[0x7a51b8,4],[0x783c8c,4]])f.commit(p,n);f.ride=ride;f.types=types;}
 f.u(f.driver+8,f.controller);f.u(f.car+0x34,f.controller);f.u(f.controller+0x220,f.car);f.u(f.controller,f.vtable);f.u(f.vtable+56,0x4054a0);
 [Math.min(progress,dense?140:100),Math.max(0,progress-(dense?140:100)),0].forEach((x,i)=>f.f32(f.car+0x60+i*4,x));
 [10,0,0].forEach((x,i)=>f.f32(f.car+0x70+i*4,x));[1,0,0].forEach((x,i)=>f.f32(f.car+0x90+i*4,x));
 f.u(f.race,4);f.u(f.race+20,1000);f.u(0x86518c,400);f.u(0x86346c,3);f.u(0x883dac,f.trackInfo);
 data.fill(0,f.trackInfo,f.trackInfo+0x8c);data.set(Buffer.from('L4RA\0'),f.trackInfo+0x40);f.h(f.trackInfo+0x8a,4715);
 for(const[o,value]of [[0,0x3749414e],[4,2],[8,1],[12,f.player],[16,f.car],[20,f.race],[28,0x3749414e],[32,f.player],[36,f.car],[40,f.race],[52,1],[60,Math.round(pace*100)],[76,Math.round(pace*100)],[80,1],[84,permission]])f.u(0xd0d100+o,value);
 f.u(0xd0d200,0x33524e43);f.u(0xd0d204,3);f.u(route+4,count);f.u(route+0xd0,0);f.f32(route+0xb0,50);view.setUint8(route+0xad,0);
 f.u(0x88a334,f.group);f.h(f.group+10,0);f.h(f.group+52,count);
 for(let i=0;i<count;i++){
  const distance=i*(nodeGap??(dense?10:100)),knot=cornerAt??(dense?140:100),node=f.nodeBase+i*128,road=f.group+140+56*i;
  f.u(route+8+i*4,node);f.u(node,0x784a48);f.u(node+100,route);f.f32(node+84,distance);f.f32(node+88,0);f.h(node+92,0);f.h(node+94,i);
  f.f32(road,Math.min(distance,knot));f.f32(road+4,Math.max(0,distance-knot));f.u(road+12,0);f.h(road+18,0);f.h(road+24,distance>=knot?0:32767);f.h(road+26,distance>=knot?32767:0);view.setInt8(road+32,0);view.setInt8(road+33,0);
 }
 if(!dense&&nodeCount===null){const theta=angle*Math.PI/180;for(let i=0;i<3;i++){const road=f.group+140+56*i;f.f32(road,i===0?0:i===1?100:100+100*Math.cos(theta));f.f32(road+4,i===2?100*Math.sin(theta):0);}if(progress>100){f.f32(f.car+0x60,100+(progress-100)*Math.cos(theta));f.f32(f.car+0x64,(progress-100)*Math.sin(theta));if(exitAligned){f.f32(f.car+0x90,Math.cos(theta));f.f32(f.car+0x94,Math.sin(theta));}}}
 if(revision!=='3bdd9959'){f.u(678642880,0);f.u(678645504,0);}
 for(const[address,slot]of [[0x40d0f0,388],[0x40d380,401]])f.u(profile.runtime.lookup+4*(address-0x401000),slot);
 data.fill(0x5a,f.cpu,f.cpu+344);f.u(f.cpu+136,0);f.h(f.cpu+140,0x37f);f.h(f.cpu+142,0);
 for(const[p,value,n=4]of network||[])if(n===1)view.setUint8(p,value);else f.u(p,value);
 const imports={env:{memory}};for(const item of WebAssembly.Module.imports(built.module))if(item.kind==='function')((imports[item.module]??={})[item.name]=()=>{throw Error('Unexpected native host import');});
 f.native=new WebAssembly.Instance(built.module,imports).exports;f.e=Object.fromEntries(profile.helpers.map((h,i)=>[h.name,f.native['f'+built.helperIds[i]]]));
 data.fill(0,abi.base,abi.base+abi.size);globalThis.__NFSU2_FORWARD_PACING__=Pacing;
 f.session=new Driving.Controller(memory,{installed:true,verified:true,moduleHash:profile.moduleHash,moduleIdentity:{}});
 f.options={enabled:true,safe:true,offline:!network,allowNetwork:permission===1,ordinaryRace:true,applyTarget:profile.capabilities.nativePolicy===true?'native-policy':true,aiState:{active:true,owned:true,ownerSequence:2},expectedPace:pace,identity:'controlled-native-'+revision,policy:{mode:profile.capabilities.nativePolicy===true?'native':undefined,brakingFactor:.75,lateralAcceleration:6,brakingDeceleration:5,reactionSeconds:.6,marginDistance:8}};
 f.capture=({beforePoll=null,expectedNativeCode=0,alreadyRequested=false}={})=>{
  if(alreadyRequested)assert.equal(f.session.pendingRequest,f.u(abi.base+8));else{const requested=f.session.update(f.options);assert.equal(requested.forwardState,'requested',JSON.stringify(requested));}const request=f.u(abi.base+8),sp=f.stack,ts=sp-4;
  f.u(sp,0x42879f);f.u(f.cpu+32,0x42879f);f.u(f.cpu+16,sp+20);f.u(f.cpu,progress<=100?1:2);f.f32(sp+40,progress);f.f32(sp+56,0);
  f.e.fwg_projection_post(f.cpu,route,sp,f.car+0x60,sp+40,sp+56);assert.equal(f.u(abi.base+640),request);
  f.u(ts,0x428a6b);f.u(f.cpu+16,ts);const prepared=f.e.fwg_ready(f.cpu,route,ts,0);assert.equal(prepared,request);
  f.u(f.cpu+16,ts+24);f.u(f.cpu+32,0x428a6b);f.e.fwg_after(f.cpu,route,ts,prepared,1);assert.equal(f.u(abi.base+16),request);assert.equal(f.u(abi.base+20),expectedNativeCode);
  beforePoll?.(f);return f.session.update(f.options);
 };
 f.target=value=>{f.u(f.cpu+4,f.controller);f.u(f.cpu+16,f.stack);f.u(f.stack,0x41c980);f.f32(f.stack+4,value);f.u(f.stack+8,0x7fa12345);f.u(f.stack+12,0xffc12345);f.u(f.stack+16,1);f.native.f6140(f.cpu);return f.f32(f.controller+0x230);};
 return f;
}
module.exports={world,nativeModule,FILES,A};
