'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const mod=new WebAssembly.Module(fs.readFileSync(__dirname+'/full-tuner-bridge.wasm'));
const memory=new WebAssembly.Memory({initial:16384,maximum:65536,shared:true});
const PB=memory.grow(256)*65536,B=0xd0d300,D=0x839c40,ride=0xe00000,T=ride+0x384,rec=0xe04000,parts=ride+0x2f0,car=0xe05000,player=0xe06000,cpu=0xe07000,sp=0xe09000,stock=0x1000000,rules=0x1100000,extra=0x1200000,curve=0x1300000;
const inst=new WebAssembly.Instance(mod,{env:{memory}});let seq=0;
const dv=()=>new DataView(memory.buffer),put=(p,x)=>dv().setUint32(p,x,true),get=p=>dv().getUint32(p,true),f32=(p,x)=>dv().setFloat32(p,x,true),bytes=(p,n)=>Uint8Array.from(new Uint8Array(memory.buffer,p,n)),fill=(p,n,x)=>new Uint8Array(memory.buffer,p,n).fill(x);
function seed(mode=0){
 fill(B,512,0);fill(PB,4096,0);fill(ride,0x8f0,0);fill(D,0xb80,0);fill(rec,0x430,0);fill(0x837b90,68*4,0);
 put(B,0x384e5944);put(B+12,1);put(B+96,PB);put(PB,0x3154464e);put(PB+4,1);put(PB+8,0x1000000);
 put(T,0);put(T+8,parts);put(T+12,ride+0x40);fill(T+20,41,100);fill(parts,148,7);put(ride+0x208,5);f32(ride+560,1000);f32(ride+568,8000);
 put(D,rec);put(D+0x900,T);put(D+0x9fc,mode);dv().setUint8(D+0xb64,1);for(let m=0;m<5;m++){fill(D+0x904+m*41,41,80+m);fill(rec+0x360+m*41,41,80+m);}put(D+0xa0c,0);
 put(0xd00030,1);put(0xd00000,player);put(player+4,car);put(car+16,ride);put(0x850078,0);put(0x866a14,0);put(0x8669f4,0);dv().setUint8(0x89cf69,0);
 put(0x8384c4,0xe10000);put(0xe10008,0xe11000);put(0xe110e4,0xe12000);put(0xe1200c,0xe13000);new Uint8Array(memory.buffer,0xe13000,32).set(Buffer.from('UI_PerformanceDyno_MAIN.fng\0'));
 put(0x8a1ccc,stock);put(0x86b340,rules);put(0x86b344,2);put(0x8383f8,extra);put(0x8383fc,1);fill(extra,380,0);put(extra+8,1);put(extra+12,0);put(0x837b90,extra+12);put(ride+0x56c,10);put(ride+0x57c,curve);put(cpu+16,sp);put(sp,0x581475);fill(curve,40,21);
}
function request(cmd){put(B+8,cmd);put(B+4,seq+=2);inst.exports.step(cpu);assert.equal(get(B+36),seq);return get(B+40);}
function draft(a=120,b=121){fill(PB+512,41,a);fill(PB+560,41,b);}
function targets(){return {ride:bytes(ride,0x8f0),visits:bytes(D+0x904,205),record:bytes(rec,0x430),reset:bytes(D+0x9d1,41)};}
const sameTargets=b=>assert.deepEqual(targets(),b);
test('capture six exact source ranges, explicit curve backing and owned allocation',()=>{seed();assert.equal(PB,0x40000000);assert.equal(request(16),0);assert.equal(get(B+100),PB);assert.equal(get(PB+120),6);assert.equal(get(PB+68),1);assert.deepEqual(bytes(PB+256,41),bytes(T+20,41));assert.deepEqual(bytes(PB+352,148),bytes(parts,148));let end=4096;for(let i=0;i<6;i++){const src=get(PB+128+i*16),dest=get(PB+132+i*16),len=get(PB+136+i*16);assert.equal(dest,end);assert.deepEqual(bytes(PB+dest,len),bytes(src,len));end+=len;}assert.equal(get(PB+72),end);assert.equal(get(PB+60),curve);assert.equal(get(PB+64),10);});
test('stage all modes; only active41 and selectedvisit41; separate exact restore snapshots',()=>{for(let mode=0;mode<5;mode++){seed(mode);assert.equal(request(16),0);const before=targets(),current=bytes(PB+256,41),visit=bytes(PB+304,41);draft();assert.equal(request(17),0);assert.deepEqual(bytes(T+20,41),new Uint8Array(41).fill(120));assert.deepEqual(bytes(D+0x904+mode*41,41),new Uint8Array(41).fill(121));assert.deepEqual(bytes(rec,0x430),before.record);assert.deepEqual(bytes(D+0x9d1,41),before.reset);for(let m=0;m<5;m++)if(m!==mode)assert.deepEqual(bytes(D+0x904+m*41,41),before.visits.slice(m*41,m*41+41));const expected=before.ride.slice();expected.fill(120,0x398,0x398+41);assert.deepEqual(bytes(ride,0x8f0),expected);new Uint8Array(memory.buffer,PB+512,41).set(current);new Uint8Array(memory.buffer,PB+560,41).set(visit);assert.equal(request(18),0);sameTargets(before);}});
test('148th part byte and each expected lease reject atomically',()=>{for(const mutate of [()=>dv().setUint8(parts+147,8),()=>dv().setUint8(T+20,99),()=>dv().setUint8(D+0x904,99),()=>dv().setUint8(rec+0x360+204,99),()=>put(PB+16,rec+4),()=>put(PB+20,T+4),()=>put(PB+24,1),()=>put(PB+28,parts+4),()=>put(PB+32,ride+4)]){seed();request(16);draft();mutate();const before=targets();assert.equal(request(17),3);sameTargets(before);}});
test('candidate range and cancellation reject before writes',()=>{for(const mutate of [()=>dv().setUint8(PB+512+40,201),()=>dv().setUint8(PB+560+40,255),()=>put(B+12,0)]){seed();request(16);draft();mutate();const before=targets();assert.ok([1,4].includes(request(17)));sameTargets(before);}});
test('read readiness ignores selected slot but detects any other pending preset',()=>{seed(2);request(16);draft();request(17);assert.equal(get(PB+68),1);dv().setUint8(D+0x904+41,77);const before=targets();assert.equal(request(19),0);assert.equal(get(PB+68),0);sameTargets(before);});
test('capture bounds, malformed sources, depth, gear and RPM fail without game writes',()=>{for(const mutate of [()=>put(0x8a1ccc,0xfffffff0),()=>put(0x86b344,257),()=>put(0x8383fc,257),()=>put(0x837b90,extra+1),()=>put(0x837b90,extra+380),()=>put(ride+0x56c,1),()=>put(ride+0x56c,513),()=>put(ride+0x57c,0xfffffff0),()=>put(T,46),()=>put(T+0xe4,1),()=>put(ride+0x208,0),()=>put(ride+0x208,7),()=>f32(ride+560,NaN),()=>f32(ride+568,Infinity),()=>put(0x8a1ccc,ride),()=>put(0x86b340,stock+12)]){seed();mutate();const before=targets();assert.notEqual(request(16),0);sameTargets(before);}});
test('empty rule/extra arrays allowed, zero pointers ignored; curve count exact',()=>{seed();put(0x86b344,0);put(0x86b340,0);put(0x8383fc,0);put(0x8383f8,0);fill(0x837b90,68*4,0);assert.equal(request(16),0);assert.equal(get(PB+136+3*16),0);assert.equal(get(PB+136+4*16),0);});
test('PB growth, alignment, capacity, magic, latch and widened overflow protections',()=>{for(const mutate of [()=>put(B+96,PB+1),()=>put(B+96,PB-65536),()=>put(B+96,0xffff0000),()=>put(PB+8,0xffffff),()=>put(PB,0),()=>put(PB+4,2)]){seed();mutate();const before=targets();assert.equal(request(16),8);sameTargets(before);}seed();assert.equal(request(16),0);const next=memory.grow(256)*65536;put(next,0x3154464e);put(next+4,1);put(next+8,0x1000000);put(B+96,next);assert.equal(request(16),8);assert.equal(get(B+100),PB);});
test('odd, duplicate, foreign return and legacy command do not acknowledge',()=>{seed();put(B+8,16);put(B+4,999);inst.exports.step(cpu);assert.equal(get(B+36),0);put(B+4,1000);put(B+8,1);inst.exports.step(cpu);assert.equal(get(B+36),0);put(B+8,16);put(sp,0);inst.exports.step(cpu);assert.equal(get(B+36),0);put(sp,0x581475);inst.exports.step(cpu);assert.equal(get(B+36),1000);put(B+40,123);inst.exports.step(cpu);assert.equal(get(B+40),123);});
test('new prefix preserves all64 old local types and standalone module has no native calls',()=>{const {locals}=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs'),profile=require('../extension/aa-profile.js'),old=profile.fullTuner?.baseBridge||profile.bridge,p=require('./full-tuner-prefix.json');assert.deepEqual(locals(p.newheader).types.slice(0,64),locals(old).types);assert.equal(p.totalLocals,170);assert.deepEqual(WebAssembly.Module.imports(mod),[{module:'env',name:'memory',kind:'memory'}]);});
test('host/runtime CPU above guest cap is valid while its guest ESP remains bounded',()=>{seed();const hostCPU=0x28010000;put(hostCPU+16,sp);put(B+8,16);put(B+4,seq+=2);inst.exports.step(hostCPU);assert.equal(get(B+36),seq);assert.equal(get(B+40),0);});

test('curve may be wholly inside ride; extra lookup must be selector-matched child, not record',()=>{seed();put(ride+0x57c,ride+0x600);assert.equal(request(16),0);for(const mutate of [()=>put(0x837b90,extra),()=>put(extra+8,5),()=>put(extra+12,1),()=>put(0x837b90,extra+12+92),()=>put(ride+0x57c,ride+0x8e0)]){seed();mutate();assert.equal(request(16),8);}seed();put(extra+8,4);put(extra+12+3*92,67);put(0x837b90+67*4,extra+12+3*92);assert.equal(request(16),0);});

test('snapshot failures identify exact guarded component without changing game targets',()=>{
 const cases=[
  [1,()=>put(B+96,PB+1)], [2,()=>put(PB,0)], [3,()=>put(PB+4,2)], [4,()=>put(PB+8,123)], [5,()=>put(B+100,PB+65536)],
  [10,()=>put(0x8384c4,0)], [11,()=>put(D,0)], [12,()=>put(D+0x900,0)], [13,()=>put(0xd00000,0)], [14,()=>put(player+4,0)], [15,()=>put(car+16,0)],
  [21,()=>put(D,ride+0x700)], [23,()=>{put(player+4,ride+0x800);put(ride+0x810,ride);}], [24,()=>{put(0xd00000,ride+0x800);put(ride+0x804,car);}],
  [30,()=>put(0x86b344,257),257], [31,()=>put(0x8383fc,257),257], [32,()=>put(ride+0x56c,0),0], [32,()=>put(ride+0x56c,513),513],
  [42,()=>put(0x8a1ccc,0xfffffff0)], [43,()=>put(0x86b340,0xfffffff0)], [44,()=>put(0x8383f8,0xfffffff0)], [45,()=>put(ride+0x57c,0xfffffff0)],
  [50,()=>put(0x86b340,stock+12),23], [50,()=>put(ride+0x57c,ride+0x8e0),15], [60,()=>put(ride+0x57c,parts)],
  [70,()=>put(extra+8,5),5], [71,()=>put(0x837b90,extra-4)], [72,()=>put(0x837b90,extra+13)], [73,()=>put(0x837b90,extra+12+92)], [74,()=>put(extra+12,1)]
 ];
 for(const [guard,mutate,observed=0]of cases){seed();put(B+104,999);put(B+108,0xffffffff);mutate();const before=targets();assert.equal(request(16),8,'guard '+guard);assert.equal(get(B+104),guard);assert.equal(get(B+108),observed);sameTargets(before);}
});
test('diagnostic detail is cleared on success and non-layout failure, ignored requests leave it alone',()=>{
 seed();put(ride+0x56c,513);assert.equal(request(16),8);assert.equal(get(B+104),32);put(ride+0x56c,10);assert.equal(request(16),0);assert.equal(get(B+104),0);assert.equal(get(B+108),0);
 put(B+104,32);put(B+108,513);put(B+12,0);assert.equal(request(16),1);assert.equal(get(B+104),0);assert.equal(get(B+108),0);
 for(const mutate of [()=>put(B+4,0),()=>put(B+4,999),()=>put(B+4,get(B+36)),()=>put(B+8,1),()=>put(sp,0),()=>put(cpu+16,0xffffffff)]){
  seed();put(B+8,16);put(B+4,seq+=2);put(B+104,74);put(B+108,100);mutate();const before=bytes(B,128);inst.exports.step(cpu);assert.deepEqual(bytes(B,128),before);
 }
});
