'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const mod=new WebAssembly.Module(fs.readFileSync(__dirname+'/full-tuner-bridge.wasm'));
const memory=new WebAssembly.Memory({initial:32768,maximum:65536,shared:true});
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

const LO=0x50000000,HI=0x7ffe0000,WLO=0x2978d650,WHI=WLO+4,BITS=0x29785650;
function mark(p,n,on=true){for(let page=p>>>14;page<=Math.floor((p+n-1)/16384);page++){const b=BITS+(page>>>3),bit=1<<(page&7);dv().setUint8(b,on?dv().getUint8(b)|bit:dv().getUint8(b)&~bit);}}
function window(){put(WLO,LO);put(WHI,HI);fill(BITS,32768,0);}
function high(which,address=LO+which*0x40000){
 const sizes=[46*0x890,48,380,40],old=[stock,rules,extra,curve][which],n=sizes[which];new Uint8Array(memory.buffer,address,n).set(bytes(old,n));
 put([0x8a1ccc,0x86b340,0x8383f8,ride+0x57c][which],address);if(which===2)put(0x837b90,address+12);mark(address,n);return {address,n};
}
test('high stock reproduces old S42 and the exact active committed window captures it',()=>{
 seed();window();const s=high(0);const before=targets(),source=bytes(s.address,s.n);const oldModule=new WebAssembly.Module(fs.readFileSync(__dirname+'/../../nfsu2-extension/tests/fixtures/v033/full-tuner-bridge.wasm'));put(B+8,16);put(B+4,seq+=2);new WebAssembly.Instance(oldModule,{env:{memory}}).exports.step(cpu);assert.equal(get(B+40),8);assert.equal(get(B+104),42);sameTargets(before);assert.equal(request(16),0);sameTargets(before);assert.deepEqual(bytes(s.address,s.n),source);assert.equal(get(PB+160),s.address);assert.deepEqual(bytes(PB+get(PB+164),s.n),source);
});
test('each read source and all sources together support the exact window without source writes',()=>{
 for(const selected of [[0],[1],[2],[3],[0,1,2,3]]){seed();window();const sources=selected.map(i=>high(i)),before=targets(),captured=sources.map(s=>bytes(s.address,s.n));assert.equal(request(16),0);sameTargets(before);sources.forEach((s,i)=>assert.deepEqual(bytes(s.address,s.n),captured[i]));}
});
test('window start/end and cross-page boundaries are exact for stock capture',()=>{
 for(const address of [LO,LO+16383,HI-46*0x890]){seed();window();high(0,address);assert.equal(request(16),0,address.toString(16));}
 for(const address of [0,0xffff,0x28000000,0x30000000,LO-1,HI-46*0x890+1,HI,0x80000000,0xfffffff0]){seed();window();put(0x8a1ccc,address);const before=targets();assert.equal(request(16),8);assert.equal(get(B+104),42);sameTargets(before);}
});
test('inactive or changed window and any missing committed page fail closed',()=>{
 for(const mutate of [()=>put(WLO,0),()=>put(WHI,0),()=>put(WLO,LO-16384),()=>put(WHI,HI+16384)]){seed();window();high(0);mutate();assert.equal(request(16),8);assert.equal(get(B+104),42);}
 for(let page=0;page<8;page++){seed();window();const s=high(0,LO+16383);mark(LO+page*16384,1,false);const before=targets();assert.equal(request(16),8,'missing page '+page);assert.equal(get(B+104),42);sameTargets(before);}
});
test('high-source snapshot does not broaden ride or Stage/Restore destinations',()=>{
 for(let mode=0;mode<5;mode++){seed(mode);window();const s=high(0),data=bytes(s.address,s.n);assert.equal(request(16),0);const before=targets(),a=bytes(PB+256,41),b=bytes(PB+304,41);draft();assert.equal(request(17),0);assert.deepEqual(bytes(rec,0x430),before.record);assert.deepEqual(bytes(s.address,s.n),data);new Uint8Array(memory.buffer,PB+512,41).set(a);new Uint8Array(memory.buffer,PB+560,41).set(b);assert.equal(request(18),0);sameTargets(before);}
 seed();window();put(car+16,LO);assert.equal(request(16),8);assert.equal(get(B+104),15);
});
test('high source guards reject every range at its original component code',()=>{
 for(let i=0;i<4;i++){seed();window();high(i);put(WHI,0);assert.equal(request(16),8);assert.equal(get(B+104),42+i);}
});
test('high snapshot source cannot alias the private mailbox even with forged window metadata',()=>{
 seed();window();const fakePB=LO;put(B+96,fakePB);put(fakePB,0x3154464e);put(fakePB+4,1);put(fakePB+8,0x1000000);high(0,LO+4096);const before=targets(),source=bytes(LO+4096,46*0x890);assert.equal(request(16),8);assert.equal(get(B+104),42);sameTargets(before);assert.deepEqual(bytes(LO+4096,46*0x890),source);
});
test('forged active window with insufficient actual memory fails before any high source read',()=>{
 seed();window();high(0);const small=new WebAssembly.Memory({initial:16384,maximum:65536,shared:true}),smallPB=small.grow(256)*65536,sv=new DataView(small.buffer);
 for(const [p,n]of [[0x400000,0x900000],[ride,0x8f0],[rec,0x430],[car,32],[player,32],[cpu,344],[sp,4],[0xe10000,0x4000],[B,128],[0xd00000,64],[WLO,8]])new Uint8Array(small.buffer,p,n).set(bytes(p,n));
 new Uint8Array(small.buffer,smallPB,4096).set(bytes(PB,4096));sv.setUint32(B+96,smallPB,true);sv.setUint32(B+100,0,true);sv.setUint32(B+8,16,true);sv.setUint32(B+4,2,true);sv.setUint32(B+36,0,true);new WebAssembly.Instance(mod,{env:{memory:small}}).exports.step(cpu);assert.equal(sv.getUint32(B+36,true),2);assert.equal(sv.getUint32(B+40,true),8);assert.equal(sv.getUint32(B+104,true),42);
});

test('current-only host metadata reproduces S42 in93af prefix and current candidate captures',()=>{
 seed();window();const s=high(0),before=targets();put(0x2974ff60,0);put(0x2974ff64,0);fill(0x29747f60,32768,0);
 const previous=new WebAssembly.Module(fs.readFileSync(__dirname+'/../../nfsu2-extension/tests/full-tuner-bridge.wasm'));
 put(B+8,16);put(B+4,seq+=2);new WebAssembly.Instance(previous,{env:{memory}}).exports.step(cpu);
 assert.equal(get(B+40),8);assert.equal(get(B+104),42);sameTargets(before);
 assert.equal(request(16),0);sameTargets(before);assert.equal(get(PB+160),s.address);
});
test('stale93af metadata and committed bits cannot authorize a943 snapshot',()=>{
 seed();window();high(0);put(WLO,0);put(WHI,0);put(0x2974ff60,LO);put(0x2974ff64,HI);fill(0x29747f60,32768,255);
 const before=targets();assert.equal(request(16),8);assert.equal(get(B+104),42);sameTargets(before);
});
test('byte-identical943 native init and commit authorize all four bounded capture sources',async()=>{
 const Native=require('./native-window.cjs'),prepared=await Native.prepare();seed();window();const sources=[0,1,2,3].map(i=>high(i)),before=targets(),data=sources.map(s=>bytes(s.address,s.n));
 fill(BITS,32768,0);put(WLO,0);put(WHI,0);dv().setUint8(Native.DONE,0);
 const native=Native.attach(prepared,memory);native.exports.init();assert.equal(get(WLO),LO);assert.equal(get(WHI),HI);
 for(const s of sources)native.exports.commit(s.address,s.n);
 assert.equal(request(16),0);sameTargets(before);sources.forEach((s,i)=>assert.deepEqual(bytes(s.address,s.n),data[i]));
 const prefix=require('./full-tuner-prefix.json'),old=require('../extension/aa-profile.js'),{locals}=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs');
 assert.deepEqual(locals(prefix.newheader).types.slice(0,64),locals(old.bridge).types);assert.equal(prefix.totalLocals,170);
 require('node:fs').writeFileSync(__dirname+'/snapshot-native-receipt-v03812.json',JSON.stringify({checkedAt:new Date().toISOString(),revision:'943ee537',moduleHash:prepared.moduleHash,windowGlobals:[WLO,WHI],commitBitmap:BITS,nativeBodiesByteIdentical:prepared.bodyHashes,sources:sources.map(({address,n})=>({address,bytes:n})),baseLocals:64,totalLocals:170,noSourceWrites:true,noTuneChanges:true,liveVerified:false,limits:['Synthetic valid current-ABI source fixture; native window init/commit are exact943.','No live browser capture, full game evaluator, Stage, Save Profile or persistence verification.']},null,2)+'\n');
});
