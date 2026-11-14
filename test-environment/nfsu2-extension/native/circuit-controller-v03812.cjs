'use strict';
// Controlled execution of exact current943 native controller bodies. All
// unlisted native calls trap. This does not start a game or simulate physics.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture,instance,A,sha}=require('./circuit-native-fixture.cjs');
const E={controller:0x320000,record:0x330000,pid:0x340000,race:0x350000};
const REAL=[15844,10128,10285,10441,15836,15837,15841,15843];
const STUBS=[13183,6210,6296,21769,11678,9955,5982,18030,8855,5669,2543,19961,9024,9180,18563,4178,17618,7393,9740,17783,16541,11537];
const built=fixture(REAL,STUBS);
const nativeNOSBuilt=fixture([...REAL,17783,5896,5585],[...STUBS.filter(id=>id!==17783),5741,9816]);
const args=(f,c,n)=>{const s=f.get(c+16);return Array.from({length:n},(_,i)=>f.get(s+4+4*i));};
const bits=x=>{const d=new DataView(new ArrayBuffer(4));d.setFloat32(0,x,true);return d.getUint32(0,true);};
const image=fs.readFileSync(path.resolve(__dirname,'../../research/current-native-image/SPEED2.EXE'));
assert.equal(sha(image),'f9dd86c054878ce6276beb07c1fd61874f7a1e4bf1f241b084c65b73e24168a7');
function peRead(va,n){
 const pe=image.readUInt32LE(0x3c),count=image.readUInt16LE(pe+6),base=image.readUInt32LE(pe+52),first=pe+24+image.readUInt16LE(pe+20);
 for(let i=0;i<count;i++){const p=first+40*i,rva=image.readUInt32LE(p+12),size=image.readUInt32LE(p+16),off=image.readUInt32LE(p+20);if(va>=base+rva&&va+n<=base+rva+size)return image.subarray(off+va-base-rva,off+va-base-rva+n);}
 throw Error('Unmapped PE data '+va.toString(16));
}
async function controller({speed=80,target=0,previousTarget=0,contact=true,enabled=true,nos=false,latch=false,front=false,nativeNOS=false,since=nos?1000:0,ticks=2000,full=10000,left=10000}={}){
 const events=[];
 const f=instance(await (nativeNOS?nativeNOSBuilt:built),{
  13183:(f,c)=>f.ret(c),
  8855:(f,c)=>{f.fpu(c,0);f.ret(c,4);},
  9955:(f,c)=>{f.fpu(c,0);f.ret(c,4);},
  9740:(f,c)=>{f.fpu(c,0);f.ret(c,0);},
  6210:(f,c)=>f.ret(c,4,contact?1:0),
  6296:(f,c)=>{for(const p of args(f,c,3))f.f32(p,0);f.ret(c,12);},
  // The tests use the explicit zero-target stop branch; no PID calibration or
  // nonzero-target throttle/brake calculation is inferred from this stub.
  11678:(f,c)=>{events.push({kind:'pid',self:f.get(c+4),args:args(f,c,4)});f.f32(f.get(c+4)+0x7c,0);f.ret(c,16);},
  7393:(f,c)=>f.ret(c,4),
  17783:(f,c)=>{events.push({kind:'nos-query',self:f.get(c+4),throttle:f.d.getFloat32(E.controller+0x20c,true),brake:f.d.getFloat32(E.controller+0x214,true)});f.ret(c,0,nos?1:0);},
  9816:(f,c)=>{events.push({kind:'offline-clock'});f.ret(c,0,0);},
  5741:(f,c)=>{events.push({kind:'native-stop-nos',self:f.get(c+4)});f.put(f.get(c+4)+0x420,0);f.ret(c);},
  21769:(f,c,address)=>{
   events.push({kind:'virtual',address,self:f.get(c+4)});
   if(address===0x11110000)f.ret(c,0,1);
   else if(address===0x11110001)f.ret(c);
   else if(address===0x11110002){f.fpu(c,0);f.ret(c,4);}
   else throw Error('Unexpected controller virtual '+address.toString(16));
  }
 });
 for(const[va,n]of [[0x783000,0xe000],[0x7a178c,16],[0x7d7d3c,4],[0x42aba0,44]])new Uint8Array(f.memory.buffer,va,n).set(peRead(va,n));
 f.put(A.context,A.car);f.put(A.car+0x2c,A.driver);f.put(A.car+0x30,A.desc);f.put(A.driver+4,A.car);f.put(A.driver+8,E.controller);
 f.put(A.car+0x14,E.record);f.put(E.record+4,1);f.put(E.controller,A.vtable);
 f.put(A.vtable+0x14,0x11110000);f.put(A.vtable+0x6c,0x11110001);f.put(A.vtable+8,0x11110002);
 f.put(A.car+0x34,E.controller);f.put(E.controller+0x220,A.car);f.put(A.car+0x28,4);f.put(A.car+0x24,2);
 f.f32(A.car+0x430,Math.abs(speed));f.f32(A.car+0x42c,speed);f.u8(A.car+0x392,contact?1:0);if(front)f.u8(A.car+0x390,1);
 f.u8(E.controller+0x23c,enabled?1:0);f.f32(E.controller+0x22c,1);f.f32(E.controller+0x230,target);f.f32(E.controller+0x260,previousTarget);f.u8(E.controller+0x25c,latch?1:0);
 f.put(A.car+0x454,full);f.put(A.car+0x45c,left);f.put(A.car+0x460,since);f.put(0x86518c,ticks);
 for(const[o,i]of [[0x264,0],[0x268,1],[0x26c,2],[0x270,3]])f.put(E.controller+o,E.pid+i*0x100);f.put(0x890118,E.race);
 f.events=events;f.run=()=>f.call('f15844',{ecx:E.controller,args:[bits(1/60)]});
 if(nativeNOS)f.sampleNOS=()=>f.call('f17783',{ecx:A.car+0x40});
 f.outputs=()=>({throttle:f.d.getFloat32(E.controller+0x20c,true),brake:f.d.getFloat32(E.controller+0x214,true),handbrake:f.d.getFloat32(E.controller+0x210,true),target:f.d.getFloat32(E.controller+0x230,true),previousTarget:f.d.getFloat32(E.controller+0x260,true),latch:f.d.getUint8(E.controller+0x25c)});
 return f;
}
module.exports={controller,REAL,STUBS,A,E,args,bits,built,nativeNOSBuilt,peRead};
