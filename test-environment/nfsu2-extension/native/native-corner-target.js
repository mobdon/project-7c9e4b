/* Exact post-sealed authored command3 target correction. */
(function(root){'use strict';
 const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
 const configs=freeze({"a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8":{"revision":"aa2429fb","sourceModuleHash":"a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8","inputModuleHash":"2ecc7cb9515f611221bbd844873fb11d2c7ce4f8757844181d52d0e532cf904a","outputModuleHash":"e71b34af8fd926f58754df7536b44bd122b077e28af528200c24602b63b47a73","index":4653,"originalLength":3412,"originalBodyHash":"b4a50ed5234e1e4d71d8b2f62c0822e2702fca7a5a57e4cace505e2bce7f2860","patchedBodyHash":"cb55d4a4d038f5b6f12071119e98b0ef6d711230104e6a2a4df8e05a33bff467","offset":3116,"needle":"IBe4RAAAAAAAAFlAoyEiIB9EAAAAAAAA8D8gHiAlICWioiAdQbij6QMqAgC7oiAiICKioqOgn6MhIQ==","replacement":"IBe4RAAAAAAAAFlAoyEiIB8gJCAioiAjo6QhIQ=="},"f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9":{"revision":"15e5958f","sourceModuleHash":"f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9","inputModuleHash":"acd91ae5e9a8d6cd4b1310467c2b994aa463eafb9292e5a41adf23a80acb09fd","outputModuleHash":"2863cd57dc898efa1bee1dffd83bace6872cf72b355c2e8043d501a8d7ddf7d0","index":4653,"originalLength":3412,"originalBodyHash":"b4a50ed5234e1e4d71d8b2f62c0822e2702fca7a5a57e4cace505e2bce7f2860","patchedBodyHash":"cb55d4a4d038f5b6f12071119e98b0ef6d711230104e6a2a4df8e05a33bff467","offset":3116,"needle":"IBe4RAAAAAAAAFlAoyEiIB9EAAAAAAAA8D8gHiAlICWioiAdQbij6QMqAgC7oiAiICKioqOgn6MhIQ==","replacement":"IBe4RAAAAAAAAFlAoyEiIB8gJCAioiAjo6QhIQ=="},"c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391":{"revision":"943ee537","sourceModuleHash":"c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391","inputModuleHash":"8d2f26db929eec415732f261e8739bec55bc7a8f496a57b324bed1d6d5edb97c","outputModuleHash":"7d7b7854340965a964b255c01ff2750d12e82cd814144156bb2050137a931c3e","index":4653,"originalLength":3412,"originalBodyHash":"b4a50ed5234e1e4d71d8b2f62c0822e2702fca7a5a57e4cace505e2bce7f2860","patchedBodyHash":"cb55d4a4d038f5b6f12071119e98b0ef6d711230104e6a2a4df8e05a33bff467","offset":3116,"needle":"IBe4RAAAAAAAAFlAoyEiIB9EAAAAAAAA8D8gHiAlICWioiAdQbij6QMqAgC7oiAiICKioqOgn6MhIQ==","replacement":"IBe4RAAAAAAAAFlAoyEiIB8gJCAioiAjo6QhIQ=="}});
 const supports=hash=>typeof hash==='string'&&Object.prototype.hasOwnProperty.call(configs,hash);
 const select=hash=>supports(hash)?freeze({revision:configs[hash].revision,sourceModuleHash:hash,inputModuleHash:configs[hash].inputModuleHash,outputModuleHash:configs[hash].outputModuleHash,index:4653,command:3,onlyAuthoredExpression:true,liveVerified:false}):null;
 const fail=s=>{throw Error('Native corner target: '+s);};
 const sha=async bytes=>Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const decode=s=>Uint8Array.from(root.atob(s),c=>c.charCodeAt(0));
 const concat=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
 const leb=n=>{const a=[];do{const x=n&127;n>>>=7;a.push(x|(n?128:0));}while(n);return Uint8Array.from(a);};
 const read=(bytes,at)=>{let value=0,shift=0,b;do{if(at>=bytes.length||shift>28)fail('invalid unsigned LEB');b=bytes[at++];value+=(b&127)*2**shift;shift+=7;}while(b&128);return{value:value>>>0,end:at};};
 async function patchModule(input,{verifiedOriginalHash}={}){
  if(!supports(verifiedOriginalHash))return input;
  const plan=configs[verifiedOriginalHash],bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(await sha(bytes)!==plan.inputModuleHash)fail('complete input hash mismatch');
  const sections=[bytes.subarray(0,8)];let at=8,found=false,changed=0;
  while(at<bytes.length){const start=at,id=bytes[at++],length=read(bytes,at),data=length.end,end=data+length.value;if(end>bytes.length)fail('section bounds');at=end;
   if(id!==10){sections.push(bytes.subarray(start,end));continue;}
   if(found)fail('duplicate code section');found=true;
   const count=read(bytes,data),bodies=[leb(count.value)];let cursor=count.end;
   for(let n=0;n<count.value;n++){const size=read(bytes,cursor),last=size.end+size.value;if(last>end)fail('body bounds');const body=bytes.subarray(size.end,last);cursor=last;
    if(n+37!==plan.index){bodies.push(leb(body.length),body);continue;}
    if(body.length!==plan.originalLength||await sha(body)!==plan.originalBodyHash)fail('original body pin');
    const needle=decode(plan.needle),replacement=decode(plan.replacement),offset=plan.offset;
    if(!Number.isInteger(offset)||offset<0||offset+needle.length>body.length)fail('expression bounds');
    if(needle.some((b,i)=>body[offset+i]!==b))fail('expression pin');
    const patched=concat([body.subarray(0,offset),replacement,body.subarray(offset+needle.length)]);
    if(await sha(patched)!==plan.patchedBodyHash)fail('patched body pin');
    bodies.push(leb(patched.length),patched);changed++;
   }
   if(cursor!==end)fail('trailing code bytes');const code=concat(bodies);sections.push(Uint8Array.of(10),leb(code.length),code);
  }
  if(!found||changed!==1)fail('missing authored corner target');const output=concat(sections);
  if(await sha(output)!==plan.outputModuleHash)fail('complete output hash mismatch');
  if(!root.WebAssembly.validate(output))fail('invalid output');return output;
 }
 const api=Object.freeze({supports,select,patchModule});root.__NFSU2_NATIVE_CORNER_TARGET__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
