'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const mod=new WebAssembly.Module(fs.readFileSync(__dirname+'/full-tuner-bridge.wasm'));
const memory=new WebAssembly.Memory({initial:16384,maximum:65536,shared:true});
const PB=memory.grow(256)*65536,B=0xd0d300,D=0x839c40,base=0x890160,stride=0x940,rec=0xe04000,car=0xe05000,player=0xe06000,cpu=0xe07000,sp=0xe09000,stock=0x1000000,rules=0x1100000,extra=0x1200000,curve=0x1300000;
const step=new WebAssembly.Instance(mod,{env:{memory}}).exports.step,v=new DataView(memory.buffer);
const put=(p,x)=>v.setUint32(p,x,true),get=p=>v.getUint32(p,true),fill=(p,n,x)=>new Uint8Array(memory.buffer,p,n).fill(x),bytes=(p,n)=>new Uint8Array(memory.buffer,p,n).slice();let seq=0;
function seed(index=0,mode=0,ride=base+16+index*stride){
 fill(B,512,0);fill(PB,4096,0);fill(base,22*stride,37);fill(ride,0x8f0,0);fill(D,0xb80,0);fill(rec,0x430,31);fill(0x837b90,68*4,0);
 put(B,0x384e5944);put(B+12,1);put(B+96,PB);put(PB,0x3154464e);put(PB+4,1);put(PB+8,0x1000000);
 const t=ride+0x384;put(t,0);put(t+8,ride+0x2f0);put(t+12,ride+0x40);fill(t+20,41,100);fill(ride+0x2f0,148,7);put(ride+0x208,5);v.setFloat32(ride+560,1000,true);v.setFloat32(ride+568,8000,true);
 put(D,rec);put(D+0x900,t);put(D+0x9fc,mode);v.setUint8(D+0xb64,1);for(let m=0;m<5;m++){fill(D+0x904+m*41,41,80+m);fill(rec+0x360+m*41,41,80+m);}put(D+0xa0c,0);
 put(0xd00030,1);put(0xd00000,player);put(player+4,car);put(car+16,ride);put(car+20,ride-16);put(ride-12,1);put(0x89e810,base);put(0x89e814,index+1);put(0x850078,0);put(0x866a14,0);put(0x8669f4,0);v.setUint8(0x89cf69,0);
 put(0x8384c4,0xe10000);put(0xe10008,0xe11000);put(0xe110e4,0xe12000);put(0xe1200c,0xe13000);new Uint8Array(memory.buffer,0xe13000,32).set(Buffer.from('UI_PerformanceDyno_MAIN.fng\0'));
 put(0x8a1ccc,stock);put(0x86b340,rules);put(0x86b344,2);put(0x8383f8,extra);put(0x8383fc,1);fill(extra,380,0);put(extra+8,1);put(extra+12,0);put(0x837b90,extra+12);put(ride+0x56c,10);put(ride+0x57c,curve);put(cpu+16,sp);put(sp,0x581475);fill(curve,40,21);return ride;
}
function request(cmd){put(B+8,cmd);put(B+4,seq+=2);step(cpu);assert.equal(get(B+36),seq);return get(B+40);}
const targets=()=>({records:bytes(base,22*stride),ui:bytes(D,0xb80),saved:bytes(rec,0x430)});
test('all 22 native static slots capture exact image and ride bytes without game writes',()=>{
 for(let i=0;i<22;i++){const ride=seed(i),before=targets();assert.equal(request(16),0,'slot '+i);assert.deepEqual(targets(),before);assert.equal(get(PB+32),ride);const image=get(PB+132),copy=get(PB+148);assert.deepEqual(bytes(PB+image+ride-0x400000,0x8f0),bytes(PB+copy,0x8f0));assert.deepEqual(bytes(PB+copy,0x8f0),bytes(ride,0x8f0));}
});
test('static slots stage and restore only active setup and selected visit, never saved record or neighboring racers',()=>{
 for(const index of [0,21])for(let mode=0;mode<5;mode++){const ride=seed(index,mode);assert.equal(request(16),0);const before=targets(),current=bytes(PB+256,41),visit=bytes(PB+304,41);fill(PB+512,41,120);fill(PB+560,41,121);assert.equal(request(17),0);const expected={records:before.records.slice(),ui:before.ui.slice(),saved:before.saved.slice()};expected.records.fill(120,index*stride+16+0x398,index*stride+16+0x398+41);expected.ui.fill(121,0x904+mode*41,0x904+(mode+1)*41);assert.deepEqual(targets(),expected);new Uint8Array(memory.buffer,PB+512,41).set(current);new Uint8Array(memory.buffer,PB+560,41).set(visit);assert.equal(request(18),0);assert.deepEqual(targets(),before);}
});
test('arbitrary low addresses and non-slot alignment never bypass S20',()=>{
 for(const ride of [0x800000,0x839c50,0x890160,0x890171,0x890174,0x89c3b1,0x89ccf0,0xd0f000]){seed(0,0,ride);const before=targets(),data=bytes(ride,0x8f0);assert.notEqual(request(16),0,ride.toString(16));assert.deepEqual(targets(),before);assert.deepEqual(bytes(ride,0x8f0),data);}
});
test('static exception requires live table membership, owner identity and human record kind for every command',()=>{
 const cases=[()=>put(0x89e810,base+4),()=>put(0x89e814,0),()=>put(0x89e814,23),()=>put(0x89e814,0xffffffff),()=>put(car+20,base+stride),()=>put(base+4,2),()=>put(base+4,0)];
 for(const mutate of cases)for(const cmd of [16,17,18,19]){seed();assert.equal(request(16),0);fill(PB+512,41,120);fill(PB+560,41,120);mutate();const before=targets();assert.equal(request(cmd),8);assert.equal(get(B+104),20);assert.deepEqual(targets(),before);}
 seed(21);put(0x89e814,21);assert.equal(request(16),8);assert.equal(get(B+104),20);
});
test('static native ownership does not bypass original record/player/car/CPU alias guards',()=>{
 for(const [guard,mutate]of [[21,ride=>put(D,ride+0x700)],[23,ride=>{put(player+4,ride+0x800);put(ride+0x810,ride);put(ride+0x814,ride-16);}],[24,ride=>{put(0xd00000,ride+0x800);put(ride+0x804,car);}]]){const ride=seed();mutate(ride);const before=targets();assert.equal(request(16),8);assert.equal(get(B+104),guard);assert.deepEqual(targets(),before);}
 const ride=seed(),aliasCPU=ride+0x700;put(aliasCPU+16,sp);put(B+8,16);put(B+4,seq+=2);const before=targets();step(aliasCPU);assert.equal(get(B+40),8);assert.equal(get(B+104),22);assert.deepEqual(targets(),before);
});
