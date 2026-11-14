/* Bounded native full-physics publication; exact reviewed complete inputs. */
(function(root){'use strict';
 const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
 const configs=freeze(__CONFIGS__);
 const BASE=0xd0d100,MAGIC=0x36414252,CLAIMING=0x36434252;
 const offsets=freeze({magic:232,command:236,ack:240,percent:244,car:248,status:252});
 const mailbox=freeze({base:BASE,magic:MAGIC,offsets});
 const has=hash=>typeof hash==='string'&&Object.prototype.hasOwnProperty.call(configs,hash);
 const select=hash=>has(hash)?freeze({revision:configs[hash].revision,sourceModuleHash:hash,baseModuleHash:configs[hash].completeModuleHash,outputModuleHash:configs[hash].outputModuleHash,sealed:configs[hash].completePinSealed,index:3553,minimumPercent:100,maximumPercent:150,pairedSelectedPace:true,fullPhysicsOnly:true,mailbox,liveVerified:false}):null;
 const fail=s=>{throw Error('Native rubberband: '+s);};
 const sha=async bytes=>Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const decode=s=>Uint8Array.from(root.atob(s),c=>c.charCodeAt(0));
 const concat=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
 const leb=n=>{const a=[];do{const x=n&127;n>>>=7;a.push(x|(n?128:0));}while(n);return Uint8Array.from(a);};
 const read=(bytes,at)=>{let value=0,shift=0,b;do{if(at>=bytes.length||shift>28)fail('invalid unsigned LEB');b=bytes[at++];value+=(b&127)*2**shift;shift+=7;}while(b&128);return{value:value>>>0,end:at};};
 async function patchModule(input,{verifiedOriginalHash}={}){
  if(!has(verifiedOriginalHash))return input;
  const p=configs[verifiedOriginalHash],bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(p.completePinSealed!==true)fail('unsealed native plan');
  if(await sha(bytes)!==p.completeModuleHash)fail('complete input hash mismatch');
  if(bytes.length<8||bytes[0]!==0||bytes[1]!==97||bytes[2]!==115||bytes[3]!==109)fail('module header');
  const sections=[bytes.subarray(0,8)];let at=8,found=false;
  while(at<bytes.length){const start=at,id=bytes[at++],length=read(bytes,at),data=length.end,end=data+length.value;if(end>bytes.length)fail('section bounds');at=end;
   if(id!==10){sections.push(bytes.subarray(start,end));continue;}
   if(found)fail('duplicate code section');found=true;
   const count=read(bytes,data),bodies=[leb(count.value)];let cursor=count.end;
   for(let n=0;n<count.value;n++){const size=read(bytes,cursor),last=size.end+size.value;if(last>end)fail('body bounds');const original=bytes.subarray(size.end,last);cursor=last;
    if(n+37!==p.index){bodies.push(leb(original.length),original);continue;}
    if(original.length!==p.originalLength||await sha(original)!==p.originalHash)fail('original body pin');
    const parts=[decode(p.locals),decode(p.entry)];let previous=p.originalLocalsEnd;
    for(const site of p.insertions){if(!Number.isInteger(site.offset)||site.offset<previous||site.offset>=original.length)fail('insertion bounds');parts.push(original.subarray(previous,site.offset),decode(site.bytes));previous=site.offset;}
    parts.push(original.subarray(previous));const body=concat(parts);bodies.push(leb(body.length),body);
   }
   if(cursor!==end)fail('trailing code bytes');const code=concat(bodies);sections.push(Uint8Array.of(10),leb(code.length),code);
  }
  if(!found)fail('missing code section');const output=concat(sections);
  if(await sha(output)!==p.outputModuleHash)fail('complete output hash mismatch');
  if(!root.WebAssembly.validate(output))fail('invalid output');return output;
 }
 function words(memory){if(!(memory?.buffer instanceof SharedArrayBuffer)||memory.buffer.byteLength<BASE+256)throw TypeError('Shared guest memory required');return new Uint32Array(memory.buffer,BASE,64);}
 function claim(memory){const w=words(memory),at=offsets.magic/4;if(Atomics.load(w,at)===MAGIC)return true;for(const off of Object.values(offsets))if(Atomics.load(w,off/4)!==0)return false;if(Atomics.compareExchange(w,at,0,CLAIMING)!==0)return false;for(const off of Object.values(offsets)){if(off===offsets.magic)continue;if(Atomics.load(w,off/4)!==0){Atomics.compareExchange(w,at,CLAIMING,0);return false;}}return Atomics.compareExchange(w,at,CLAIMING,MAGIC)===CLAIMING;}
 const decodeCommand=command=>({generation:command>>>16,percent:command&255,enabled:!!(command&256),stackingReady:!!(command&512)});
 function command(memory,{enabled=false,percent=100,stackingReady=false,forceGeneration=false}={}){if(typeof enabled!=='boolean'||typeof stackingReady!=='boolean'||typeof forceGeneration!=='boolean')throw TypeError('Literal Boolean settings required');if(!Number.isInteger(percent)||percent<100||percent>150)throw RangeError('Native assist percent must be100..150');if(!enabled)percent=100;if(!claim(memory))fail('foreign mailbox occupancy');const w=words(memory),old=Atomics.load(w,offsets.command/4),low=percent|(enabled?256:0)|(stackingReady?512:0);if((old&65535)===low&&(old>>>16)&&!forceGeneration)return old;const generation=((old>>>16)%65535)+1,next=((generation<<16)|low)>>>0;Atomics.store(w,offsets.command/4,next);return next;}
 // This is a coherent historical snapshot. Clients must additionally require a
 // recent advancing publication counter, current command and current car.
 function readAck(memory){const w=words(memory),first=Atomics.load(w,offsets.status/4),ack1=Atomics.load(w,offsets.ack/4),percent=Atomics.load(w,offsets.percent/4),car=Atomics.load(w,offsets.car/4),ack2=Atomics.load(w,offsets.ack/4),last=Atomics.load(w,offsets.status/4),current=Atomics.load(w,offsets.command/4),request=decodeCommand(current),publisher=last&255,reason=(last>>>8)&255;if(Atomics.load(w,offsets.magic/4)!==MAGIC||first!==last||((last>>>16)&1)||ack1!==ack2||ack2!==current||!request.generation||(current&0xfc00)||request.percent<100||request.percent>150||(!request.enabled&&request.percent!==100)||publisher!==1||![1,2,3].includes(reason)||percent<100||percent>150||car<65536||car>=0x28000000||(car&3))return null;if(reason===1&&(!request.enabled||!request.stackingReady||percent!==request.percent))return null;if(reason!==1&&percent!==100)return null;if((reason===2)!==!request.enabled)return null;return{command:ack2,percent,car,publisher,reason,publication:(last>>>16)>>>1};}
 const api=Object.freeze({supports:has,select,patchModule,mailbox,claim,command,readAck});root.__NFSU2_NATIVE_RUBBERBAND__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
