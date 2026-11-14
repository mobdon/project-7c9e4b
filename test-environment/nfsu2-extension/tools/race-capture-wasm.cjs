'use strict';
// Structural reader for offline observer preservation checks. No game code executes.
const assert=require('node:assert/strict');
function parse(input){
 const b=Buffer.isBuffer(input)?input:Buffer.from(input),s={p:8},sections=[],types=[],imtypes=[],ft=[],bodies=[],exports=[];
 const get=()=>{let n=0,shift=0,x;do{if(s.p>=b.length||shift>28)throw Error('Invalid module integer');x=b[s.p++];n|=(x&127)<<shift;shift+=7;}while(x&128);return n>>>0;};
 const txt=()=>{const n=get(),end=s.p+n;if(end>b.length)throw Error('Invalid module string');const a=b.subarray(s.p,end).toString();s.p=end;return a;};
 const limits=()=>{const f=get();get();if(f&1)get();};
 assert.deepEqual(b.subarray(0,8),Buffer.from([0,97,115,109,1,0,0,0]));
 while(s.p<b.length){
  const id=b[s.p++],sz=get(),start=s.p,end=start+sz;if(end>b.length)throw Error('Invalid module section');
  sections.push({id,payload:b.subarray(start,end)});
  if(id===1)for(let k=get();k;k--){assert.equal(b[s.p++],0x60);const a=get(),args=[...b.subarray(s.p,s.p+a)];s.p+=a;const z=get(),res=[...b.subarray(s.p,s.p+z)];s.p+=z;types.push({args,res});}
  if(id===2)for(let k=get();k;k--){txt();txt();const kind=b[s.p++];if(kind===0)imtypes.push(get());else if(kind===1){s.p++;limits();}else if(kind===2)limits();else if(kind===3)s.p+=2;else if(kind===4){get();get();}else throw Error('Unknown import');}
  if(id===3)for(let k=get();k;k--)ft.push(get());
  if(id===7)for(let k=get();k;k--){const name=txt(),kind=b[s.p++],index=get();exports.push({name,kind,index});}
  if(id===10)for(let k=get();k;k--){const n=get(),stop=s.p+n;if(stop>end)throw Error('Invalid function body');bodies.push(b.subarray(s.p,stop));s.p=stop;}
  if(s.p>end)throw Error('Invalid module payload');s.p=end;
 }
 return{sections,types,imtypes,ft,bodies,exports,total:imtypes.length+ft.length};
}
module.exports={parse};
