'use strict';
// Research-only exact hash-pinned native f4497 + f6454 execution. No game bytes ship.
// Grade/acceleration and planner route-query/curvature dependencies are controlled; route fixtures are synthetic.
// This proves propagation/ABI, not live planner reachability, tire physics or lap times.
const {test,before}=require('node:test'),assert=require('node:assert/strict');
const {patchBrakingBody,patchCornerBody,BASE:A,MAGIC,CORNER_BASE:B,CORNER_MAGIC}=require('../extension/ai.js');
const profiles={};
const leb=n=>{const a=[];do{let x=n&127;n>>>=7;if(n)x|=128;a.push(x);}while(n);return Buffer.from(a);};
function patchFirst(bytes,target=0,patcher=patchBrakingBody){let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};while(p<bytes.length){const start=p,id=bytes[p++],len=u(),body=p,end=p+len;if(id===10){u();for(let k=0;k<target;k++){const len=u();p+=len;}const at=p,n=u(),begin=p,old=bytes.subarray(begin,begin+n),fn=Buffer.from(patcher(old));
 // Original instructions occur intact in the injected body, including native calls.
 let q=0;const r=()=>{let n=0,s=0,x;do{x=old[q++];n|=(x&127)<<s;s+=7;}while(x&128);return n;};const groups=r();for(let i=0;i<groups;i++){r();q++;}assert.ok(fn.includes(old.subarray(q,old.length-1)));
 const section=Buffer.concat([bytes.subarray(body,at),leb(fn.length),fn,bytes.subarray(begin+n,end)]);return Buffer.concat([bytes.subarray(0,start),Buffer.from([10]),leb(section.length),section,bytes.subarray(end)]);}p=end;}throw Error('Missing code');}
before(async()=>{for(const profile of ['legacy','current','latest','next']){
 const {wabt,functions}=await require('../tools/extract-'+profile+'-functions.cjs')([4497,6454,6455,6456,6468,17087,4653,4576,4577,4578]);
 const extraIds=[4341,12713,831,4966,17088,17089];
 const source=`(module (import "env" "grade" (func $f11531 (param i32))) (import "env" "curve" (func $f11845 (param i32))) (import "env" "accel" (func $f8856 (param i32))) ${extraIds.map(i=>`(import "env" "f${i}" (func $f${i} ${i===17088?"(param i32 f64 f64 f64) (result f64)":i===17089?"(param f64 i32) (result f64)":"(param i32)"}))`).join(" ")} (memory (export "memory") 256 65536 shared) ${[4497,6454,6455,6456,6468,17087,4653,4576,4577,4578].map(i=>functions.get(i)).join('\n')} (export "planner" (func $f17087)) (export "getter" (func $f4497)) (export "propagate" (func $f6454)))`;
 const m=wabt.parseWat('race-braking-native.wat',source,{threads:true});m.resolveNames();m.validate({threads:true});const bytes=Buffer.from(m.toBinary({}).buffer);profiles[profile]={original:new WebAssembly.Module(bytes),patched:new WebAssembly.Module(patchFirst(patchFirst(bytes),6,patchCornerBody))};
}});
function fixture(module,{pace=150,braking=75,forward=false,corner=true,cap=60,apex=20,count=31,gap=150,grade=0,onGrade=null,planner=false,plannerCorners=false}={}){
 let d;const getterCalls=[];const cpu=0xe00000,sp=0xe01000,car=0xe02000,meta=0xe03000,driver=0xe04000,route=driver+0x370,player=0xe06000,race=0xe08000,storage=0xe10000,records=0xf60000;
 const put=(p,v)=>d.setUint32(p,v,true),get=p=>d.getUint32(p,true),f=(p,v)=>d.setFloat32(p,v,true),ff=p=>d.getFloat32(p,true);
 const ret=(args,value)=>{const s=get(cpu+16);put(cpu,value);put(cpu+32,get(s));put(cpu+16,s+4+args*4);};const st=v=>{const top=(get(cpu+136)+7)&7;put(cpu+136,top);d.setFloat64(cpu+72+top*8,v,true);};
 const imports={grade(c){assert.equal(c,cpu);const gs=get(cpu+16)+8;getterCalls.push({caller:get(gs),outer:get(gs+40),direction:get(gs+48),car:get(gs+52),route:get(cpu+20),hitsBefore:get(B+60)});if(onGrade)onGrade({put,get,d});ret(0,grade);},curve(c){assert.equal(c,cpu);assert.ok(forward||planner);ret(0,0xe09000);},accel(c){assert.equal(c,cpu);assert.ok(forward||planner);ret(1,0);st(3);}};
 let boundaryDecel;
 imports.f4341=()=>{boundaryDecel=d.getFloat32(get(cpu+16)+64,true);ret(0,0);st(1);};
 for(const i of [12713,831,4966,4653,17088,17089])imports['f'+i]=()=>{throw Error('Unexpected planner dependency '+i);};
 if(plannerCorners){imports.f12713=()=>ret(4,0);imports.f831=()=>{d.setInt8(route+328,14);ret(2,0);};imports.f4966=()=>{ret(0,0);st(.02);};imports.f17088=(flags,a,b,value)=>value;imports.f17089=v=>v;}

 const inst=new WebAssembly.Instance(module,{env:imports}),memory=inst.exports.memory;d=new DataView(memory.buffer);
 put(cpu+4,route);put(cpu+16,sp);d.setUint16(cpu+140,0x37f,true);put(sp,0x422b2e);put(sp+4,forward?1:count-2);put(sp+8,+forward);put(sp+12,car);
 f(0x7a51b8,9.8);f(0x7d7d3c,0);f(7879820,60);
 put(car+16,meta);put(meta,0);put(0x8a1ccc,records);put(route+4,count);if(plannerCorners)put(route+208,1);
 for(const [i,v]of [12,10.6,9.3,8].entries())f(0x7a4740+i*4,v);for(const [i,v]of [10,9,8,6].entries())f(0x7a4760+i*4,v);f(0x784554,1);f(0x7846ec,-1);
 for(const [p,v]of [[A,MAGIC],[A+28,MAGIC],[A+4,2],[A+8,1],[A+12,player],[A+16,car],[A+20,race],[A+32,player],[A+36,car],[A+40,race],[A+52,1],[A+60,pace],[B,CORNER_MAGIC],[B+4,2],[B+8,80],[B+44,braking],[B+48,pace],[0xd00000,player],[0xd00030,1],[0x890118,race],[0x8654a4,6],[0x89e7b0,1],[player+4,car],[car+36,3],[car+44,driver],[driver+4,car],[driver+0x6e8,route],[race,4]])put(p,v);
 const nodes=Array.from({length:count},(_,i)=>{const p=storage+i*256;put(route+8+i*4,p);f(p+0x54,i*gap);for(let off=0x40;off<=0x50;off+=4)f(p+off,100);f(p+0x40,corner&&i===(forward?0:count-1)?apex:cap);return p;});
 return {getterCalls,planner(){put(sp,0x123456);put(sp+4,car);inst.exports.planner(cpu);return {hits:get(B+60),boundaryDecel,returnAddress:get(cpu+32),stack:get(cpu+16)};},d,memory,cpu,sp,car,meta,driver,route,player,race,put,get,f,nodes,prepareGetter(backward=false){put(sp,backward?0x40a723:0x4227a1);put(sp+4,car);put(cpu+12,backward?0:car);put(cpu+24,route);put(cpu+20,route);put(sp+40,0x422b2e);put(sp+48,0);put(sp+52,car);},getter(){inst.exports.getter(cpu);return d.getFloat64(cpu+72+(get(cpu+136)&7)*8,true);},run(){inst.exports.propagate(cpu);assert.equal(get(cpu+16),sp+16);return nodes.map(p=>ff(p+64));}};
}
for(const profile of ['legacy','current','latest','next']){
 test(profile+': explicit online opt-in retains identical solo braking and private-route envelope',()=>{
  for(const [address,value] of [[0x850078,8],[0x850078,512],[0x866a14,1],[0x8669f4,1],[0x89cf69,1]]){
   const a=fixture(profiles[profile].patched),b=fixture(profiles[profile].patched);b.put(address,value);b.put(A+84,1);assert.deepEqual(b.run(),a.run());assert.ok(b.get(B+60)>0);
   const expected=Buffer.from(a.memory.buffer);expected.writeUInt32LE(value,address);expected.writeUInt32LE(1,A+84);assert.deepEqual(Buffer.from(b.memory.buffer),expected);
   for(const permission of [0,2,0xffffffff]){const c=fixture(profiles[profile].original),d=fixture(profiles[profile].patched);for(const x of [c,d]){x.put(address,value);x.put(A+84,permission);}assert.deepEqual(d.run(),c.run());assert.equal(d.get(B+60),0);assert.deepEqual(Buffer.from(d.memory.buffer),Buffer.from(c.memory.buffer));}
  }
  for(const change of [x=>x.put(A+36,x.car+4),x=>x.put(x.driver+0x6e8,x.route+4),x=>x.put(0xd00030,2),x=>x.put(A+4,3),x=>x.put(A+48,180),x=>x.put(x.race,6),x=>x.put(0x89e7d8,1),x=>x.put(0x89e7d9,1)]){
   const a=fixture(profiles[profile].original),b=fixture(profiles[profile].patched);for(const x of [a,b]){x.put(0x850078,8);x.put(A+84,1);change(x);}assert.deepEqual(b.run(),a.run());assert.equal(b.get(B+60),0);assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));
  }
 });
 test(profile+': patched exact getter preserves ABI and only changes ST0 and B+60',()=>{for(const backward of [false,true])for(const pace of [75,100,130,150,200,300])for(const braking of [50,75,100]){
 const a=fixture(profiles[profile].original,{pace,braking}),b=fixture(profiles[profile].patched,{pace,braking});a.prepareGetter(backward);b.prepareGetter(backward);const normal=a.getter(),actual=b.getter();assert.equal(actual,normal*(braking/100)/(Math.max(1,pace/100)**2));assert.equal(b.get(B+60),1);assert.equal(b.get(b.cpu+16),b.sp+4);assert.equal(b.get(b.cpu+32),backward?0x40a723:0x4227a1);
 const slot=b.cpu+72+(b.get(b.cpu+136)&7)*8;const x=new Uint8Array(a.memory.buffer),y=new Uint8Array(b.memory.buffer);for(let i=0;i<y.length;i++)if(x[i]!==y[i])assert.ok((i>=slot&&i<slot+8)||(i>=B+60&&i<B+64),'unexpected write '+i.toString(16));
 }});
 test(profile+': actual backward propagation protects apex and preserves 3x long-straight cap',()=>{for(const pace of [100,130,150,200,300])for(const braking of [50,75,100]){
 const p=pace/100,b=fixture(profiles[profile].patched,{pace,braking,apex:20/p}),raw=b.run(),target=raw.map(v=>Math.fround(v*p));assert.ok(b.get(B+60)>0,'getter must actually apply inside propagation');
 target.forEach((v,i)=>{const expected=Math.min(60*p,Math.sqrt(400+24*(braking/100)*(30-i)*150));assert.ok(Math.abs(v-expected)<.001,JSON.stringify({pace,braking,i,v,expected}));});assert.equal(target[0],60*p);assert.ok(Math.abs(target.at(-1)-20)<1e-5);assert.equal(b.get(b.cpu+32),0x422b2e);
 }});
 test(profile+': exit acceleration and straight-route envelopes unchanged',()=>{for(const forward of [false,true]){
 const opts={pace:300,braking:50,forward,corner:forward},a=fixture(profiles[profile].original,opts),b=fixture(profiles[profile].patched,opts);assert.deepEqual(b.run(),a.run());if(forward)assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));
 }});
 test(profile+': rejected caller, ownership, mode, malformed and network guards preserve full native memory',()=>{
 const guards=[x=>x.put(A,0),x=>x.put(A+28,0),x=>x.put(B,0),x=>x.put(B+4,0),x=>x.put(B+4,1),x=>x.put(A+4,3),x=>x.put(A+48,180),x=>x.put(A+8,2),x=>x.put(A+52,0),x=>x.put(0x8654a4,3),x=>x.put(0xd00030,2),... [0,2,7,8].map(v=>x=>x.put(0x89e7b0,v)),...[0x89e7d8,0x89e7d9,0x890104,0x890108,0x890114,0x866a14,0x8669f4,0x89cf69].map(p=>x=>x.put(p,1)),...[8,512].map(v=>x=>{x.put(0x850078,v);x.put(A+84,0);}),x=>x.put(x.sp,0x123456),x=>x.put(x.cpu+12,x.car+4),x=>x.put(x.cpu+24,x.route+4),x=>x.put(A+36,0),x=>x.put(A+16,0),x=>x.put(x.car+36,1),x=>x.put(0xd00000,0),x=>x.put(A+12,0),x=>x.put(A+32,0),x=>x.put(x.player+4,0),x=>x.put(x.player+16,1),x=>x.put(x.car+44,0),x=>x.put(x.driver+4,0),x=>x.put(x.driver+0x6e8,x.route+4),x=>x.put(0x890118,0),x=>x.put(A+20,0),x=>x.put(A+40,0),x=>x.put(x.race,6),x=>x.put(A+60,200),...[0,74,301,0xffffffff].map(v=>x=>{x.put(B+48,v);x.put(A+60,v);}),...[0,49,101,0xffffffff].map(v=>x=>x.put(B+44,v)),...[59,96].map(v=>x=>x.put(B+8,v)),x=>x.put(B+36,26)];
 for(const [i,change]of guards.entries()){const a=fixture(profiles[profile].original),b=fixture(profiles[profile].patched);a.prepareGetter();b.prepareGetter();change(a);change(b);a.getter();b.getter();assert.equal(b.get(B+60),0,'guard '+i);assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer),'guard '+i);}
 for(const change of [x=>x.put(x.sp+40,0),x=>x.put(x.sp+48,1),x=>x.put(x.sp+52,x.car+4),x=>x.put(x.cpu+12,1),x=>x.put(x.cpu+20,x.route+4)]){const a=fixture(profiles[profile].original),b=fixture(profiles[profile].patched);a.prepareGetter(true);b.prepareGetter(true);change(a);change(b);a.getter();b.getter();assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));}
 });
 test(profile+': disabled, foreign, alternate-route and non-solo real propagation is native byte-for-byte',()=>{
 const changes=[x=>x.put(B+4,0),x=>x.put(A+36,x.car+4),x=>x.put(x.driver+0x6e8,x.route+4),x=>x.put(x.sp,0x422c00),x=>x.put(0x89e7b0,0),x=>x.put(0x89e7b0,7),x=>x.put(0x89e7b0,8),x=>x.put(0x890114,1),x=>x.put(0x890108,1),x=>{x.put(0x850078,8);x.put(A+84,0);},x=>x.put(B+48,301)];
 for(const change of changes){const a=fixture(profiles[profile].original,{pace:300}),b=fixture(profiles[profile].patched,{pace:300});change(a);change(b);a.run();b.run();assert.equal(b.get(B+60),0);assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));}
 });
 test(profile+': stronger braking margin moves slowdown earlier monotonically',()=>{
 for(const pace of [100,130,150,200,300]){let previous;for(const braking of [100,75,50]){const b=fixture(profiles[profile].patched,{pace,braking,apex:20/(pace/100),gap:10}),target=b.run().map(v=>v*pace/100);if(previous){target.forEach((v,i)=>assert.ok(v<=previous[i]+1e-5));assert.ok(target[15]<previous[15]);}previous=target;}}
 });
 test(profile+': exact f17087 boundary getter caller executes the production hook',()=>{
 for(const pace of [100,130,150,200,300]){const opts={pace,planner:true},a=fixture(profiles[profile].original,opts),b=fixture(profiles[profile].patched,opts);const normal=a.planner(),modified=b.planner();assert.equal(modified.hits,1);assert.equal(modified.returnAddress,0x123456);assert.equal(modified.stack,b.sp+8);assert.ok(Math.abs(modified.boundaryDecel-normal.boundaryDecel*.75/((pace/100)**2))<1e-6,JSON.stringify({normal,modified}));assert.ok(normal.boundaryDecel>0);}
 });
 test(profile+': exact planner backward propagation integration',()=>{
 // Controlled route-query, collision/boundary and curvature dependencies seed one
 // corner. f17087, f4497 and f6454 themselves remain exact native instructions.
 for(const pace of [100,130,150,200,300]){
 const a=fixture(profiles[profile].original,{planner:true,plannerCorners:true,pace}),b=fixture(profiles[profile].patched,{planner:true,plannerCorners:true,pace});const normal=a.planner(),result=b.planner();assert.ok(result.hits>1,JSON.stringify(result));assert.equal(result.returnAddress,0x123456);assert.equal(result.stack,b.sp+8);assert.equal(b.getterCalls[0].caller,0x4227a1);
 const calls=b.getterCalls.filter(c=>c.caller===0x40a723&&c.direction===0);assert.ok(calls.length);for(const c of calls){assert.equal(c.outer,0x422b2e);assert.equal(c.direction,0);assert.equal(c.car,b.car);assert.equal(c.route,b.route);assert.ok(c.hitsBefore>=1);}
 assert.equal(result.hits,1+calls.length);assert.equal(b.get(B+16),1,"actual native corner hook executed");assert.equal(b.get(B+52),pace);assert.equal(b.get(B+56),75);const protectedApex=b.d.getFloat32(B+24,true)*(pace/100);assert.ok(Math.abs(protectedApex-Math.sqrt(Math.fround(9.8)/Math.fround(.02))*.8)<1e-4);assert.ok(Math.abs(result.boundaryDecel-normal.boundaryDecel*.75/((pace/100)**2))<1e-6);
 }

 });
 test(profile+': command epoch changed during original getter prevents post modification',()=>{const opts={onGrade:({put})=>put(A+4,4)},a=fixture(profiles[profile].original,opts),b=fixture(profiles[profile].patched,opts);a.prepareGetter();b.prepareGetter();a.getter();b.getter();assert.deepEqual(Buffer.from(b.memory.buffer),Buffer.from(a.memory.buffer));});
}
