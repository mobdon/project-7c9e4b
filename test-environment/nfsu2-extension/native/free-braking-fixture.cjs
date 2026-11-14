'use strict';
// Exact pinned f4497/f6454 braking closure. Only the native grade method is a
// controlled boundary; nodes are synthetic and no complete game world runs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),Image=require('../../research/current-native-image/evaluator-audit.cjs');
const Replace=require('../../work-catchup-wrapper/cache-fix.cjs').replace,AI=require('../extension/ai.js'),Free=require('./free-braking.cjs');
const A=0xd0d100,B=0xd0d200,M=0x3749414e,D={cpu:0xe00000,sp:0xe01000,car:0xe02000,meta:0xe03000,driver:0xe04000,player:0xe06000,race:0xe08000,grade:0xe0d000,epoch:0xe0d004,mutationAddress:0xe0d008,mutationValue:0xe0d00c,storage:0xe10000,records:0xf60000};
const modules=new Map();
async function build(profile){
 if(modules.has(profile.native.hash))return modules.get(profile.native.hash);
 const work=(async()=>{
  const raw=fs.readFileSync(path.join(__dirname,'../../research/compatibility-'+profile.revision+'/game.wasm'));assert.equal(P.hash(raw),profile.native.hash);const parsed=P.parse(raw),native=parsed.bodies.get(4497);assert.equal(P.hash(native),Free.NATIVE_HASH);
  const before=Buffer.from(AI.patchBrakingBody(native)),next=await Free.transform(profile,before),wabt=await require('../../build-deps/node_modules/wabt')();
  const source=`(module (import "env" "memory" (memory 256 65536 shared)) (func (param $cpu i32) (local $sp i32) (local $epoch i32)
   (local.set $sp (i32.load offset=16 (local.get $cpu))) (local.set $epoch (i32.load (i32.const ${D.epoch})))
   (if (local.get $epoch) (then (i32.store (i32.const ${A+4}) (local.get $epoch))))
   (if (i32.load (i32.const ${D.mutationAddress})) (then (i32.store (i32.load (i32.const ${D.mutationAddress})) (i32.load (i32.const ${D.mutationValue})))))
   (i32.store (local.get $cpu) (i32.load (i32.const ${D.grade})))
   (i32.store offset=32 (local.get $cpu) (i32.load (local.get $sp)))
   (i32.store offset=16 (local.get $cpu) (i32.add (local.get $sp) (i32.const 4)))))`;
  const wat=wabt.parseWat('controlled-grade-boundary.wat',source,{threads:true});wat.resolveNames();wat.validate({threads:true});const grade=[...P.parse(Buffer.from(wat.toBinary({}).buffer)).bodies.values()][0];wat.destroy();
  const selected=new Set([4497,6454,6455,6456,6468,11530]),make=body=>Image.privateModule(Replace(raw,{4497:body,11530:grade}),selected,[4497,6454]).module;
  return{original:make(native),baseline:make(before),patched:make(next.body),plan:next.plan,nativeHashes:Object.fromEntries([4497,6454,6455,6456,6468].map(id=>[id,P.hash(parsed.bodies.get(id))]))};
 })();modules.set(profile.native.hash,work);return work;
}
async function fixture(profile,{variant='patched',pace=150,command=1,braking=100,mode=2,raceType=0,permission=0,apex=20,count=31,gap=10,corner=true,grade=0,forward=false}={}){
 const built=await build(profile),pages=Math.ceil(Math.max(profile.bitmap+32768,...profile.online.map(p=>p+4))/65536),memory=new WebAssembly.Memory({initial:pages,maximum:65536,shared:true}),d=new DataView(memory.buffer),data=new Uint8Array(memory.buffer),module=built[variant],imports={env:{memory}};
 for(const item of WebAssembly.Module.imports(module))if(item.kind==='function')(imports[item.module]??={})[item.name]=()=>{throw Error('Unexpected native host call');};const native=new WebAssembly.Instance(module,imports).exports;
 const u=(p,v)=>v===undefined?d.getUint32(p,true):d.setUint32(p,v>>>0,true),f=(p,v)=>v===undefined?d.getFloat32(p,true):d.setFloat32(p,v,true),route=D.driver+0x370;
 const commit=(p,n)=>{for(let at=p&-16384;at<p+n;at+=16384){const pg=at>>>14,b=profile.bitmap+(pg>>>3);d.setUint8(b,d.getUint8(b)|(1<<(pg&7)));}};
 for(const[p,v]of[[D.cpu+4,route],[D.cpu+16,D.sp],[D.sp,0x422b2e],[D.sp+4,forward?1:count-2],[D.sp+8,+forward],[D.sp+12,D.car],[D.car+16,D.meta],[D.meta,0],[0x8a1ccc,D.records],[route+4,count],
  [A,M],[A+28,M],[A+4,2],[A+8,mode],[A+12,D.player],[A+16,D.car],[A+20,D.race],[A+32,D.player],[A+36,D.car],[A+40,D.race],[A+52,1],[A+60,pace],[A+84,permission],
  [B,0x33524e43],[B+4,command],[B+8,80],[B+44,braking],[B+48,Math.max(100,pace)],[0xd00000,D.player],[0xd00030,1],[0x890118,D.race],[0x8654a4,6],[0x89e7b0,raceType],[D.player+4,D.car],[D.car+36,3],[D.car+44,D.driver],[D.driver,0x785370],[D.driver+4,D.car],[D.driver+0x6e8,route],[D.race,4],[D.grade,grade]])u(p,v);
 d.setUint16(D.cpu+140,0x37f,true);for(const[p,v]of[[0x7a51b8,9.8],[0x7d7d3c,0],[7879820,60],[0x784554,1],[0x7846ec,-1],...Free.TABLES])f(p,v);
 for(const[p,n]of[[D.cpu,344],[D.sp-64,256],[D.car,0x9e4],[D.meta,0x20],[D.driver,0x800],[D.player,0x14],[D.race,0xc44],[D.records,0x890],[0x7a4740,64],[A,256],[B,64]])commit(p,n);
 const nodes=Array.from({length:count},(_,i)=>{const p=D.storage+i*256;u(route+8+i*4,p);f(p+0x54,i*gap);for(let off=0x40;off<=0x50;off+=4)f(p+off,100);f(p+0x40,corner&&i===(forward?0:count-1)?apex:60);return p;});
 return{...D,A,B,profile,built,memory,d,data,native,u,f,commit,route,nodes,
  run(){native.f6454(D.cpu);assert.equal(u(D.cpu+16),D.sp+16);assert.equal(u(D.cpu+32),0x422b2e);return nodes.map(p=>f(p+0x40));},
  prepareGetter(backward=false){u(D.sp,backward?0x40a723:0x4227a1);u(D.sp+4,D.car);u(D.cpu+12,backward?0:D.car);u(D.cpu+24,route);u(D.cpu+20,route);u(D.sp+40,0x422b2e);u(D.sp+48,0);u(D.sp+52,D.car);},
  getter(){native.f4497(D.cpu);return d.getFloat64(D.cpu+72+(u(D.cpu+136)&7)*8,true);},
  sample(){return Buffer.from(new Uint8Array(memory.buffer,0,16*1024*1024));}
 };
}
module.exports={A,B,D,build,fixture};
