'use strict';
// Runs actual pinned lifted functions in isolated synthetic memory. Never ships
// the extracted routines or original executable, and is not a gameplay test.
const fs=require('fs'),path=require('path'),readline=require('readline'),assert=require('node:assert/strict'),crypto=require('crypto');
const wabtFactory=require(process.env.WABT_MODULE||require('node:path').resolve(__dirname,'../research/compatibility-v011/node_modules/wabt'));
(async()=>{
 const wanted=['sub_005b56e0','sub_005b5810','sub_005764d0','sub_005b3e40','sub_0059aee0','sub_0050fdd0'],src=new Map(wanted.map(k=>[k,[]]));let active;
 const file=path.resolve(__dirname,'../../research/game.wat'),input=fs.createReadStream(file),hash=crypto.createHash('sha256');input.on('data',b=>hash.update(b));
 for await(const line of readline.createInterface({input,crlfDelay:Infinity})){const m=/^  \(func \$(\w+)/.exec(line);if(m)active=src.get(m[1]);if(active)active.push(line);}
 assert.equal(hash.digest('hex'),'e755897131ea53ecfa3c3bf066584d080830dc98edd61a44701cac37593e80db');
 const text=[...src.values()].map(x=>x.join('\n')).join('\n').replace(/\$(x87_[\w]+)\.\d+/g,'$$$1');const calls=[...new Set([...text.matchAll(/call \$([\w.]+)/g)].map(m=>m[1]))].filter(n=>!wanted.includes(n));
 assert.deepEqual(calls.sort(),['sub_005b2800','sub_005b2980','sub_005f6c20','x87_r2_nan','x87_r2pc_slow','x87_round24']);
 const imports='(import "env" "rebuild" (func $sub_005f6c20 (param i32)))(import "env" "round24" (func $x87_round24 (param f64 i32)(result f64)))(import "env" "nan" (func $x87_r2_nan (param f64 f64)(result f64)))(import "env" "round" (func $x87_r2pc_slow (param i32 f64 f64 f64)(result f64)))(import "env" "range" (func $sub_005b2980 (param i32)))(import "env" "convert" (func $sub_005b2800 (param i32)))';
 const wat=`(module (type $t0 (func (param i32)))${imports}(memory (export "memory") 256)(table $T0 1 funcref)${text}${wanted.map(n=>`(export "${n}" (func $${n}))`).join('')})`;
 const wabt=await wabtFactory(),m=wabt.parseWat('native-dyno.wat',wat,{tail_call:true,simd:true});m.resolveNames();m.validate({tail_call:true,simd:true});let v,rebuilt;
 const get=p=>v.getUint32(p,true),put=(p,x)=>v.setUint32(p,x,true),f32=(p,x)=>v.setFloat32(p,x,true),ret=(c,n)=>{let sp=get(c+16);put(c+32,get(sp));put(c+16,sp+4+4*n);};
 const i=new WebAssembly.Instance(new WebAssembly.Module(m.toBinary({}).buffer),{env:{rebuild:c=>{rebuilt={car:get(c+4),arg:get(get(c+16)+4)};ret(c,1);},round24:x=>Math.fround(x),nan:()=>NaN,round:(cw,a,b,x)=>(cw&768)?x:Math.fround(x),range:c=>{const sp=get(c+16);f32(get(sp+8),10);f32(get(sp+12),30);ret(c,5);},convert:()=>{throw Error('Displayed conversion was not requested');}}});
 v=new DataView(i.exports.memory.buffer);
 // Load constant sections of the local research executable only into test memory.
 const pe=fs.readFileSync(process.env.NFSU2_EXE||'/tmp/drag-research/SPEED2.EXE'),off=pe.readUInt32LE(0x3c),count=pe.readUInt16LE(off+6),opt=off+24,base=pe.readUInt32LE(opt+28),sections=opt+pe.readUInt16LE(off+20);
 for(let n=0;n<count;n++){let s=sections+n*40,len=pe.readUInt32LE(s+16),at=base+pe.readUInt32LE(s+12),raw=pe.readUInt32LE(s+20);new Uint8Array(v.buffer,at,len).set(pe.subarray(raw,raw+len));}
 const cpu=0xe00000,stack=0xe01000,thisP=0xe02000,rpmOut=0xe05000;
 function call(name,args){new Uint8Array(v.buffer,cpu,344).fill(0);put(cpu+4,thisP);put(cpu+16,stack);v.setUint16(cpu+140,0x37f,true);put(stack,0xdeadbeef);args.forEach((x,k)=>put(stack+4+k*4,x));i.exports[name](cpu);assert.equal(get(cpu+32),0xdeadbeef);assert.equal(get(cpu+16),stack+4+4*args.length);return v.getFloat64(cpu+72+8*(get(cpu+136)&7),true);}
 let assertions=0;
 put(thisP+0xa0c,0);put(0x8900ac,0);put(0xd00000,0xe06000);put(0xe06004,0xe07000);call('sub_0050fdd0',[]);assert.deepEqual(rebuilt,{car:0xe07000,arg:1});assertions++;
 // Physical getter: default 20, range span20, normalized +/-0.5 =>30 /10.
 for(const [offset,kind,col]of [[23,23,0],[31,23,8],[32,24,0],[40,24,8]]){
  f32(thisP+(kind===23?0x9c:0xc0)+col*4,20);
  for(const byte of [50,100,150]){v.setUint8(thisP+20+offset,byte);assert.equal(call('sub_005b3e40',[kind,col,0]),20+(byte-100)/100*20);assertions++;}
 }
 f32(thisP+0x220,1000);f32(thisP+0x228,8000);for(let j=0;j<9;j++)f32(thisP+0x230+j*4,.3);
 const torque=call('sub_005b5810',[rpmOut,0]);assert(Math.abs(torque-.3)<1e-6);assert.equal(v.getFloat32(rpmOut,true),1000);assertions+=2;
 const kw=call('sub_005b56e0',[rpmOut,0]),rpm=v.getFloat32(rpmOut,true);const expected=.3*rpm*v.getFloat32(0x784550,true)*v.getFloat32(0x79bef8,true);assert(Math.abs(kw-expected)<.01,`kW ${kw}, expected ${expected}`);assert.equal(rpm,1000+(Math.ceil(7000/v.getFloat32(0x785b80,true))-1)*v.getFloat32(0x785b80,true));assertions+=2;
 // Changing a real torque-curve sample affects the actual native result.
 f32(thisP+0x230+8*4,.4);const more=call('sub_005b56e0',[rpmOut,0]);assert(more>kw);assertions++;
 console.log(JSON.stringify({passed:true,nativeFunctions:wanted.length,assertions,baselineKw:kw,modifiedKw:more,torqueNm:torque*1000,scope:'actual native getter/interpolation/peak calculations, synthetic car, NOT gameplay'}));
})().catch(e=>{console.error(e);process.exit(1)});
