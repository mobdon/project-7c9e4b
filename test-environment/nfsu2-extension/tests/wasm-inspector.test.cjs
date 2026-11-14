'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const I=require('../native/wasm-inspector-v0388.cjs');
const HEADER=Buffer.from([0,97,115,109,1,0,0,0]);
const leb=value=>{const out=[];do{const byte=value&127;value>>>=7;out.push(byte|(value?128:0));}while(value);return Buffer.from(out);};
const section=(id,payload)=>Buffer.concat([Buffer.from([id]),leb(payload.length),payload]);
test('explicit decoder advances across all u32 LEB widths and rejects truncation or overflow',()=>{
 for(const value of [0,1,127,128,16383,16384,2702312,0xfffffff,0xffffffff]){
  const encoded=leb(value),input=Buffer.concat([Buffer.from([99]),encoded,Buffer.from([77])]);
  assert.deepEqual(I.unsigned(input,1),{value,end:encoded.length+1});assert.equal(input[encoded.length+1],77);
 }
 for(const input of [[],[128],[255,255,255,255,16],[255,255,255,255,128]])assert.throws(()=>I.unsigned(Uint8Array.from(input),0),/bounds|Truncated|u32/);
 for(const offset of [-1,1.5,NaN,2])assert.throws(()=>I.unsigned(Uint8Array.of(1),offset),/bounds/);
});
test('the observed 2702312-byte section starts after its four-byte length and preserves its trailing custom section',()=>{
 const payload=Buffer.alloc(2702312);payload.set([3,1,140,168,86,2,76]);
 const custom=Buffer.from([1,120,121]),module=Buffer.concat([HEADER,section(11,payload),section(0,custom)]),before=Buffer.from(module);
 const parsed=I.sections(module);assert.equal(parsed.length,2);assert.equal(parsed[0].payload,13);
 assert.deepEqual(parsed[0].data,payload);assert.deepEqual(parsed[1].data,custom);
 assert.equal(parsed[1].start,13+payload.length);assert.equal(parsed[1].end,module.length);assert.deepEqual(module,before);
});
test('non-code comparison retains exact bytes and detects one changed payload byte',()=>{
 const a=Buffer.concat([HEADER,section(11,Buffer.from([3,1,2,3])),section(0,Buffer.from([1,120]))]),b=Buffer.from(a);
 b[12]^=1;assert.notDeepEqual(I.sections(a).map(s=>[s.id,s.data]),I.sections(b).map(s=>[s.id,s.data]));
});
test('section and function inspection reject malformed bounds without omitting trailing data',()=>{
 assert.throws(()=>I.sections(Buffer.alloc(7)),/header/);assert.throws(()=>I.sections(Buffer.alloc(8)),/header/);
 assert.throws(()=>I.sections(Buffer.concat([HEADER,Buffer.from([11,2,1])])),/bounds/);
 assert.throws(()=>I.sections(Buffer.concat([HEADER,Buffer.from([11,128])])),/Truncated/);
 const body=Buffer.from([0,11]),valid=Buffer.concat([HEADER,section(10,Buffer.concat([leb(1),leb(body.length),body]))]);
 const parsed=I.inspect(valid);assert.deepEqual([...parsed.bodies],[[37,body]]);assert.deepEqual(I.inspect(valid,0).bodies.get(0),body);
 assert.throws(()=>I.inspect(Buffer.concat([valid,section(10,Buffer.from([0]))])),/one code/);
 assert.throws(()=>I.inspect(Buffer.concat([HEADER,section(10,Buffer.from([1,3,0,11]))])),/bounds/);
 assert.throws(()=>I.inspect(Buffer.concat([HEADER,section(10,Buffer.from([0,0]))])),/Trailing/);
});
