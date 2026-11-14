/* Read-only control-flow trace for pinned build 6f4f1e4e.
 * Executes original lifted functions, stubbing native dependencies and memory objects.
 * This is not gameplay validation and contains no game code or assets.
 * Requires the existing local research/game.wat and WABT_MODULE (same as bridge builder).
 * Run: node tools/trace-native-drag.cjs
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const crypto=require('node:crypto'),readline=require('node:readline');
const root=path.resolve(__dirname,'..');
const wabtFactory=require(process.env.WABT_MODULE || require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
(async()=>{
 const wanted=['sub_005fae20','sub_005faf10','sub_005f4400','sub_005f6d50','sub_004260b0'];
 const sources=new Map(wanted.map(n=>[n,[]]));
 const input=fs.createReadStream(path.join(root,'research/game.wat'));
 const hash=crypto.createHash('sha256');input.on('data',chunk=>hash.update(chunk));
 let active=null;
 for await(const line of readline.createInterface({input,crlfDelay:Infinity})){
  const name=/^  \(func \$(\w+)/.exec(line);
  if(name)active=sources.get(name[1])||null;
  if(active)active.push(line);
 }
 assert.equal(hash.digest('hex'),'e755897131ea53ecfa3c3bf066584d080830dc98edd61a44701cac37593e80db','Unexpected disassembly: no trace was run.');
 for(const [name,lines] of sources)assert(lines.length,`Missing ${name}`);
 const [on,off,choose,activate,ctor]=wanted.map(n=>sources.get(n).join('\n'));
 const wabt=await wabtFactory();
 async function compile(s){
  const defined=[...s.matchAll(/\(func \$(\w+)/g)].map(m=>m[1]);
  const names=[...new Set([...s.matchAll(/(?:return_call|call) \$([\w.]+)/g)].map(m=>m[1]))].filter(n=>!defined.includes(n));
  const imports=names.map(n=>n.startsWith('x87')?`(import "env" "${n}" (func $${n} (param ${n.includes('round24')?'f64 i32':n.includes('r2_nan')?'f64 f64':'i32 f64 f64 f64'}) (result f64)))`:`(import "env" "${n}" (func $${n} (param i32${n.startsWith('dispatch_')?' i32':''})))`).join('\n');
  const name=s.match(/\(func \$(\w+)/)[1];
  const wat=`(module (type $t0 (func (param i32))) ${imports}
    (memory (export "memory") 256) (table $T0 1 funcref)
    ${s} (export "run" (func $${name})))`;
  const m=wabt.parseWat('trace.wat',wat,{tail_call:true});m.resolveNames();m.validate({tail_call:true});
  return {module:new WebAssembly.Module(m.toBinary({}).buffer),names};
 }
 const modules={on:await compile(on),off:await compile(off),choose:await compile(choose),ctor:await compile(ctor),activate:await compile(activate+'\n'+choose)};
 function setup(which,drag){
  const calls=[];let d,heap=0xf00000;
  const get=a=>d.getUint32(a,true),put=(a,v)=>d.setUint32(a,v,true);
  const cpu=0xe00000,stack=0xe01000,player=0xe02000,car=0xe03000,driver=0xe04000,rec=0xe05000,vt=0xe06000,input=0xe07000,race=0xe08000,body=0xe09000,fsseg=0xe0a000;
  const ret=(n,args=0,result=0)=>{const sp=get(cpu+16);put(cpu,result);put(cpu+32,get(sp));put(cpu+16,sp+4+args*4);};
  const env={};for(const n of modules[which].names)env[n]=(c,target)=>{
    if(n.startsWith('x87'))throw Error('Unexpected float helper '+n);const sp=get(cpu+16),ecx=get(cpu+4),arg=get(sp+4);calls.push({name:n,this:ecx,arg,target});
    if(n==='sub_005eba30'){put(car+0x24,arg);put(car+0x2c,driver);ret(n,1,driver);}
    else if(n==='sub_005f46a0'){put(car+0x28,arg);ret(n,1);}
    else if(n==='dispatch_indirect'){ret(n,target===0x20004?0:1);}
    else if(n==='sub_00593100'){ret(n,1);}
    else if(n==='sub_00401950'){ret(n,0);}
    else if(n==='sub_00420500'){put(ecx+4,arg);ret(n,1,ecx);}
    else if(n==='sub_00575620'){const a=heap;heap+=0x2000;ret(n,0,a);}
    else if(n==='sub_00579f20'||n==='sub_00425ab0'||n==='sub_00425e40'){ret(n,1,ecx);}
    else throw Error('Unexpected native call '+n);
  };
  const inst=new WebAssembly.Instance(modules[which].module,{env});d=new DataView(inst.exports.memory.buffer);
  put(cpu+4,which==='ctor'?driver:which==='activate'?car:player);put(cpu+16,stack);put(cpu+36,fsseg);put(stack,0x1234);put(stack+4,car);put(player+4,car);put(car+0x24,which==='off'||which==='choose'||which==='ctor'?3:1);put(car+0x28,1);put(car+0x2c,driver);put(driver,vt);put(car+0x14,rec);put(rec+4,which==='on'||which==='off'?1:2);put(car+0x30,input);put(car+0x3c,body);put(input,vt);put(vt+0x30,0x20000);put(vt+0x50,0x20004);put(vt+0x10,0x20008);put(vt+0x1c,0x2000c);put(vt+0x34,0x20010);put(0x890118,race);put(race,4);d.setUint8(0x89e7d8,drag);put(0x8021ac,0xffffffff);
  inst.exports.run(cpu);return {calls,result:get(cpu),driver:get(car+0x24),physics:get(car+0x28),driverVtable:get(driver),behavior:get(driver+8),get};
 }
 for(const drag of [0,1]){
  const c=setup('choose',drag),a=setup('on',drag),o=setup('off',drag),r=setup('ctor',drag),v=setup('activate',drag);
  assert.equal(c.result,drag?1:3);
  assert.equal(a.driver,3);assert.equal(a.physics,3);
  assert.equal(o.driver,1);assert.equal(o.physics,1);
  assert.equal(v.driver,3);assert.equal(v.physics,drag?1:3);
  assert.equal(r.driverVtable,0x785370);assert(r.calls.some(x=>x.name==='sub_00425ab0'));
  console.log(JSON.stringify({drag,vehiclePhysicsChoice:c.result,opponentActivation:{driver:v.driver,physics:v.physics},autoPilotOn:{driver:a.driver,physics:a.physics},autoPilotOff:{driver:o.driver,physics:o.physics},constructor:{vtable:'0x'+r.driverVtable.toString(16),behaviorCtor:r.calls.filter(x=>x.name==='sub_00425ab0'||x.name==='sub_00425e40').map(x=>x.name)},onCalls:a.calls.map(x=>[x.name,x.arg])}));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
