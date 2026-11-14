'use strict';
// Offline inspector only. All cursor changes are explicit return values, so
// decoding a section length never mutates an enclosing parser variable.
function bytes(value){if(!(value instanceof Uint8Array))throw TypeError('Uint8Array required');return value;}
function unsigned(input,offset){
 const data=bytes(input);
 if(!Number.isSafeInteger(offset)||offset<0||offset>=data.length)throw RangeError('Unsigned LEB bounds');
 let cursor=offset,value=0,shift=0;
 for(let count=0;count<5;count++){
  if(cursor>=data.length)throw RangeError('Truncated unsigned LEB');
  const byte=data[cursor];cursor+=1;
  if(count===4&&byte>15)throw RangeError('Unsigned LEB exceeds u32');
  value+=(byte&127)*2**shift;
  if(!(byte&128))return {value:value>>>0,end:cursor};
  shift+=7;
 }
 throw RangeError('Invalid unsigned LEB');
}
function sections(input){
 const data=bytes(input),header=[0,97,115,109,1,0,0,0];
 if(data.length<header.length||header.some((b,i)=>data[i]!==b))throw Error('WebAssembly header required');
 const result=[];let cursor=8;
 while(cursor<data.length){
  const start=cursor,id=data[cursor];cursor+=1;
  const size=unsigned(data,cursor);cursor=size.end;
  const payload=cursor,end=cursor+size.value;
  if(!Number.isSafeInteger(end)||end>data.length)throw RangeError('Section payload bounds');
  result.push({id,start,payload,end,bytes:data.subarray(start,end),data:data.subarray(payload,end)});
  cursor=end;
 }
 return result;
}
function inspect(input,importFunctions=37){
 const data=bytes(input),all=sections(data),bodies=new Map(),code=all.filter(s=>s.id===10);
 if(!Number.isSafeInteger(importFunctions)||importFunctions<0)throw RangeError('Import function count');
 if(code.length!==1)throw Error('Exactly one code section required');
 const section=code[0],count=unsigned(data,section.payload);let cursor=count.end;
 if(cursor>section.end)throw RangeError('Code count bounds');
 for(let i=0;i<count.value;i++){
  if(cursor>=section.end)throw RangeError('Function size bounds');
  const size=unsigned(data,cursor);cursor=size.end;
  const end=cursor+size.value;
  if(cursor>section.end||end>section.end)throw RangeError('Function body bounds');
  bodies.set(importFunctions+i,data.subarray(cursor,end));cursor=end;
 }
 if(cursor!==section.end)throw Error('Trailing code payload');
 return {sections:all,bodies};
}
module.exports=Object.freeze({unsigned,sections,inspect});
