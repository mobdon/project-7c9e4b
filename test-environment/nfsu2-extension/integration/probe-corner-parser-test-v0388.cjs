'use strict';
// Instrument only failed read-only assertions in the original unchanged test.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const original=assert.deepEqual;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function exactSections(bytes){
 let cursor=8;const rows=[];
 while(cursor<bytes.length){
  const start=cursor,id=bytes[cursor++];let value=0,shift=0,byte;
  do{byte=bytes[cursor++];value+=(byte&127)*2**shift;shift+=7;}while(byte&128);
  const payload=cursor,end=cursor+value;rows.push({id,start,payload,end});cursor=end;
 }
 return rows;
}
function metadata(rows){return rows.map(([id,data])=>{
 const backing=Buffer.from(data.buffer),strict=exactSections(backing),match=strict.find(s=>s.id===id&&s.payload===data.byteOffset);
 return {id,length:data.length,offset:data.byteOffset,head:data.subarray(0,12).toString('hex'),hash:hash(data),wholeModuleHash:hash(backing),wholeModuleBytes:backing.length,strictPayloadMatch:!!match,
  strictSections:strict.filter(s=>s.id===11||s.id===0).map(s=>({...s,head:backing.subarray(s.payload,s.payload+12).toString('hex')}))};
});}
assert.deepEqual=function(actual,expected,...rest){
 try{return original(actual,expected,...rest);}
 catch(error){
  if(Array.isArray(actual)&&Array.isArray(expected)&&actual.every(x=>Array.isArray(x)&&typeof x[0]==='number'&&Buffer.isBuffer(x[1]))&&expected.every(x=>Array.isArray(x)&&typeof x[0]==='number'&&Buffer.isBuffer(x[1]))){
   const diagnostic={node:process.version,actual:metadata(actual).filter(x=>x.id===11||x.id===0||x.id>13),expected:metadata(expected).filter(x=>x.id===11||x.id===0||x.id>13)};
   console.log('PARSER_DIAGNOSTIC '+JSON.stringify(diagnostic));
   throw Error('Original unchanged non-code assertion failed; explicit backing-buffer section metadata captured above');
  }
  throw error;
 }
};
require('../native/corner-target.test.cjs');
