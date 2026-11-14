const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {Controller,BASE:B,patchBytes}=require('../extension/ai.js');
const bridge=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-bridge.wasm'));
const paceModule=new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-pace.wasm'));
function fixture({native=1,catchup=null}={}){
 const memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),d=new DataView(memory.buffer),calls=[];
 const p=0xe00000,car=0xe01000,race=0xe04000,rec=0xe05000,cpu=0xe08000,stack=0xe09000,driver=0xe10000;
 const put=(a,v)=>d.setUint32(a,v,true),get=a=>d.getUint32(a,true),setFloat=(a,v)=>d.setFloat32(a,v,true),float=a=>d.getFloat32(a,true);
 put(cpu+16,stack);put(stack,0x581475);put(0x8654a4,6);put(0xd00000,p);put(0xd00030,1);put(p+4,car);put(car+0x24,1);put(car+0x14,rec);put(car+0x2c,driver);put(driver+4,car);put(0x890118,race);put(race,4);d.setUint8(rec+0x901,4);
 setFloat(car+0x468,1.17);
 const game=new WebAssembly.Instance(bridge,{env:{memory,stack:new WebAssembly.Global({value:'i32',mutable:true},0xf00000),dispatch:()=>{throw Error('Unexpected dyno call while unarmed');},gcall:(c,fn)=>{calls.push(fn);if(fn===0x5fae20)put(car+0x24,3);if(fn===0x5faf10)put(car+0x24,1);}}});
 let nativeValue=native;
 const hook=new WebAssembly.Instance(paceModule,{env:{memory,original:c=>{calls.push('original');const drv=get(c+4);if(drv>=0x10000&&drv+0x774<d.byteLength)setFloat(drv+0x770,nativeValue);put(c+4,0x1234);},catchup:drv=>{calls.push(['catchup',drv]);if(catchup!==null && drv>=0x10000 && drv+0x774<d.byteLength)setFloat(drv+0x770,catchup);}}});
 const frame=()=>game.exports.step(cpu);frame();const c=new Controller(memory,true),state={ready:true,driving:true,network:false,drag:false,car,race};
 const on=(pace=1)=>{c.update({enabled:true,safe:true,state,mode:2,pace});frame();};
 const step=(drv=driver)=>{put(cpu+4,drv);hook.exports.step(cpu);};
 return {memory,d,p,car,race,rec,cpu,driver,put,get,float,setFloat,c,state,on,frame,step,calls,native:v=>nativeValue=v};
}
test('pace hook preserves native update and catchup order, then adjusts only target speed',()=>{
 const f=fixture({native:0.9,catchup:0.8});f.on(1.25);assert.equal(f.c.status().paceApplied,null);const boost=f.float(f.car+0x468);
 f.step();assert.deepEqual(f.calls.slice(-2),['original',['catchup',f.driver]]);assert.equal(f.get(f.cpu+4),0x1234,'original CPU effects are preserved');
 assert.equal(f.float(f.driver+0x770),1);assert.equal(f.float(f.car+0x468),boost);assert.equal(f.c.status().paceRequested,1.25);assert.equal(f.c.status().paceApplied,1.25);
});
test('pace multiplication uses freshly recomputed native target and never compounds',()=>{
 const f=fixture();f.on(1.5);for(let i=0;i<20;i++){f.step();assert.equal(f.float(f.driver+0x770),1.5);}
 f.native(0.8);f.step();assert.equal(f.float(f.driver+0x770),Math.fround(Math.fround(0.8)*1.5));
 f.on(0.75);f.step();assert.equal(f.float(f.driver+0x770),Math.fround(Math.fround(0.8)*0.75));
 f.on(1);f.step();assert.equal(f.float(f.driver+0x770),Math.fround(0.8));assert.equal(f.c.status().paceApplied,1);
});
test('default pace does not alter the native factor bits, including negative zero',()=>{
 for(const native of [0,-0,0.73,1,1.37,3.9]){const f=fixture({native});f.on();f.step();assert.ok(Object.is(f.float(f.driver+0x770),Math.fround(native)));}
});
test('native zero-speed intent stays zero and unexpected factors stay untouched',()=>{
 for(const native of [0,NaN,Infinity,-1,4.1]){const f=fixture({native});f.on(1.5);f.step();assert.ok(Object.is(f.float(f.driver+0x770),Math.fround(native)));if(native!==0)assert.equal(f.c.status().paceApplied,null);}
});
test('pace hook never modifies another AI driver or an unowned native AI',()=>{
 const f=fixture();f.on(1.5);const other=0xe20000;f.put(other+4,f.car);f.step(other);assert.equal(f.float(other+0x770),1);assert.equal(f.get(B+80),0);
 f.put(B+36,0);f.step();assert.equal(f.float(f.driver+0x770),1);assert.equal(f.get(B+80),0);
});
test('pace guards cover drag, network, paused, stale, replaced and mismatched driver states',()=>{
 const setups=[f=>f.d.setUint8(0x89e7d8,1),f=>f.put(0x850078,8),f=>f.put(0x866a14,1),f=>f.put(0x8669f4,1),f=>f.d.setUint8(0x89cf69,1),f=>f.put(0xd00030,2),f=>f.put(0x8654a4,3),f=>f.put(f.race,6),f=>f.put(B+48,180),f=>f.put(B+4,f.get(B+4)|1),f=>f.put(B+8,0),f=>f.put(B+8,3),f=>f.put(B+52,0),f=>f.put(B,0),f=>f.put(B+28,0),f=>f.put(f.p+4,0xe40000),f=>f.put(f.car+0x24,1),f=>f.put(f.car+0x2c,0xe20000),f=>f.put(f.driver+4,0),f=>f.put(B+20,f.race+4),f=>f.put(B+32,f.p+4),f=>f.put(B+12,f.p+4),f=>f.put(B+16,f.car+4),f=>f.put(B+40,f.race+4),f=>f.put(f.p+16,1),f=>f.put(0xd00000,0),f=>f.put(0x890118,0)];
 for(const setup of setups){const f=fixture();f.on(1.5);setup(f);f.step();assert.equal(f.float(f.driver+0x770),1);assert.equal(f.get(B+80),0);}
});
test('pace rejects malicious command values and controller normalizes invalid requests',()=>{
 for(const percent of [0,74,301,0xffffffff]){const f=fixture();f.on(1.5);f.put(B+60,percent);f.step();assert.equal(f.float(f.driver+0x770),1);assert.equal(f.get(B+80),0);}
 for(const pace of [0,0.74,3.01,NaN,Infinity,'1.25']){const f=fixture();f.on(pace);assert.equal(f.get(B+60),100);f.step();assert.equal(f.float(f.driver+0x770),1);}
});
test('stop clears pace application status and native handback still works',()=>{
 const f=fixture();f.on(1.5);f.step();assert.equal(f.c.status().paceApplied,1.5);f.c.stop();f.step();assert.equal(f.float(f.driver+0x770),1);f.frame();assert.equal(f.c.status().active,false);assert.equal(f.c.status().owned,false);assert.equal(f.c.status().manual,true);assert.equal(f.c.status().paceApplied,null);assert.equal(f.get(B+80),0);assert.deepEqual(f.calls.slice(-2),[0x5faf10,0x605c70]);
});
function sections(bytes){const out=[];let p=8;const leb=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};while(p<bytes.length){const id=bytes[p++],len=leb(),end=p+len;let bodies=null;if(id===10){const n=leb();bodies=[];for(let i=0;i<n;i++){const len=leb();bodies.push(bytes.subarray(p,p+len));p+=len;}}out.push({id,data:bytes.subarray(end-len,end),bodies});p=end;}return out;}
test('exact-module patch changes only the four named bodies and preserves all other sections',{skip:!fs.existsSync(__dirname+'/../research/game.wasm')},async()=>{
 const before=fs.readFileSync(__dirname+'/../research/game.wasm'),after=await patchBytes(before),a=sections(before),b=sections(after);
 assert.equal(a.length,b.length);const changed=[];
 a.forEach((s,i)=>{assert.equal(s.id,b[i].id);if(s.id!==10)assert.ok(Buffer.from(b[i].data).equals(Buffer.from(s.data)));else {assert.equal(s.bodies.length,b[i].bodies.length);s.bodies.forEach((fn,k)=>{if(!Buffer.from(fn).equals(Buffer.from(b[i].bodies[k])))changed.push(k+37);});}});
 assert.deepEqual(changed,[4497,4653,21213,21262,22720]);assert.equal(WebAssembly.validate(after),true);await WebAssembly.compile(after);
});

test('online pace requires session opt-in in both hooks and stops on withdrawal',()=>{
 for(const [address,value] of [[0x850078,8],[0x850078,0x200],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
  const f=fixture();f.put(address,value);f.state.network=true;f.c.update({enabled:true,safe:true,state:f.state,mode:1,pace:1.25,allowNetwork:true});f.frame();f.step();
  assert.equal(f.c.status().active,true);assert.equal(f.float(f.driver+0x770),1.25);assert.equal(f.c.status().paceApplied,1.25);assert.equal(f.get(address),value);
  f.put(B+84,2);f.step();assert.equal(f.float(f.driver+0x770),1,'unknown online command values are rejected');
  f.c.update({enabled:true,safe:true,state:f.state,mode:1,pace:1.25,allowNetwork:false});f.step();assert.equal(f.float(f.driver+0x770),1);f.frame();assert.equal(f.c.status().active,false);assert.equal(f.c.status().manual,true);assert.equal(f.c.status().paceApplied,null);
 }
});


test('2x and 3x pace are bounded, fresh each native update, and confirmed without affecting drag',()=>{
 for(const factor of [2,2.5,3]){
  const f=fixture();f.on(factor);for(let i=0;i<25;i++){f.step();assert.equal(f.float(f.driver+0x770),factor);assert.equal(f.c.status().paceApplied,factor);}
  f.native(.8);f.step();assert.equal(f.float(f.driver+0x770),Math.fround(Math.fround(.8)*factor));
  f.d.setUint8(0x89e7d8,1);f.step();assert.equal(f.float(f.driver+0x770),Math.fround(.8));
 }
});
