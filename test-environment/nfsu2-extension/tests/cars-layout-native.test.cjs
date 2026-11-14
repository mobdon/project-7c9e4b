/* Exact downloaded native constructors verify the classification independently
 * of authored contact-filter fixtures. Extracted game code never ships. */
'use strict';
const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
let functions,wabt;
before(async()=>{({functions,wabt}=await require('../tools/extract-current-functions.cjs')([14814,19342,14030]));});
const compile=source=>{const m=wabt.parseWat('native-car-layout.wat',source);m.resolveNames();m.validate();return new WebAssembly.Module(m.toBinary({}).buffer);};
const moduleFor=(index,exportName)=>{const body=functions.get(index),calls=[...new Set([...body.matchAll(/call (\$f\d+)/g)].map(m=>m[1]))];return {calls,module:compile(`(module (import "env" "memory" (memory 256)) ${calls.map(c=>`(import "env" "${c.slice(1)}" (func ${c} (param i32)))`).join(' ')} ${body} (export "${exportName}" (func $f${index})))`)};};
test('actual native car constructor passes body type zero to DynamicCollisionBody',()=>{
 const {module,calls}=moduleFor(14814,'ctor'),memory=new WebAssembly.Memory({initial:256}),d=new DataView(memory.buffer);
 const cpu=0xe00000,stack=0xe10000,body=0xe20000,car=0xe30000,teb=0xe40000;const put=(p,v)=>d.setUint32(p,v,true),get=p=>d.getUint32(p,true);put(cpu+16,stack);put(cpu+4,body);put(cpu+36,teb);put(stack+4,car);put(stack+8,123);const sentinel=new Error('stop after observed constructor call');let called=false;
 const env={memory};for(const c of calls)env[c.slice(1)]=()=>{throw Error('Unexpected dependency '+c)};env.f1366=c=>{called=true;const sp=get(c+16);assert.equal(get(c+4),body);assert.equal(get(sp+4),123);assert.equal(get(sp+8),0,'native car body type');assert.equal(get(sp+12),car+0x5c4);throw sentinel;};
 const native=new WebAssembly.Instance(module,{env});assert.throws(()=>native.exports.ctor(cpu),e=>e===sentinel);assert.equal(called,true);
});
test('actual native base collision constructor writes type argument only to the verified type byte',()=>{
 const {module}=moduleFor(19342,'ctor');for(const type of [0,1,2,3,4]){const memory=new WebAssembly.Memory({initial:256}),d=new DataView(memory.buffer),cpu=0xe00000,stack=0xe10000,body=0xe20000;const put=(p,v)=>d.setUint32(p,v,true);put(cpu+16,stack);put(cpu+4,body);put(stack,0x12345678);put(stack+4,0xffffffff);put(stack+8,type);const native=new WebAssembly.Instance(module,{env:{memory,f10275:()=>{throw Error('Invalid-id constructor must not allocate an indexed body');}}});native.exports.ctor(cpu);assert.equal(d.getUint8(body+0x11),type);assert.equal(d.getUint32(cpu+32,true),0x12345678);}
});
function bodies(bytes){let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0};const out=new Map();while(p<bytes.length){const id=bytes[p++],n=u(),end=p+n;if(id===10){const count=u();for(let i=0;i<count;i++){const size=u();out.set(i+37,bytes.subarray(p,p+size));p+=size;}}p=end;}return out;}
test('car constructor, body classifier constructor and accessor are byte-identical in old/current exact modules',()=>{
 const old=fs.readFileSync(__dirname+'/../research/game.wasm'),current=fs.readFileSync(__dirname+'/../research/compatibility-v011/game.wasm');assert.equal(crypto.createHash('sha256').update(old).digest('hex'),'ee5d281a3109240d5db25dc3921e1044672cf6d650eb58c3baa089b54fe2941f');const a=bodies(old),b=bodies(current);for(const id of [14814,19342,14030])assert.deepEqual(b.get(id),a.get(id),`native function ${id}`);
});
