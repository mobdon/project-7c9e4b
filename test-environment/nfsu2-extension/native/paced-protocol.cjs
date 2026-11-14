'use strict';
function create(root){
 const ownership=new WeakMap();
 const BASE=0xd0d100,MAGIC=0x38414252,CLAIMING=0x38434252;
 const offsets=Object.freeze({magic:232,command:236,ack:240,ownerSequence:244,car:248,status:252});
 const EXTRA=0xd0d240,EXTRA_MAGIC=0x39414252,EXTRA_CLAIMING=0x39434252;
 const rejectionCodes=Object.freeze({0:'none',1:'magic',2:'busy',3:'command-not-matched',4:'invalid-command',5:'publisher',6:'car-bounds',7:'source',8:'receiver',9:'children',10:'local-binding',11:'owner',12:'finite-gain',13:'scalar-output',14:'tires',15:'stacking',16:'changed-receipt',18:'extra-block',19:'payload',20:'combined-grip',21:'published-phase'});
 const words=memory=>{if(!(memory?.buffer instanceof root.SharedArrayBuffer)||memory.buffer.byteLength<BASE+256)throw TypeError('Shared guest memory required');return new Uint32Array(memory.buffer,BASE,64);};
 function claim(memory){const w=words(memory),at=offsets.magic/4;
  if(Atomics.load(w,at)!==MAGIC){for(const off of Object.values(offsets))if(Atomics.load(w,off/4)!==0)return false;if(Atomics.compareExchange(w,at,0,CLAIMING)!==0)return false;for(const off of Object.values(offsets)){if(off===offsets.magic)continue;if(Atomics.load(w,off/4)!==0){Atomics.compareExchange(w,at,CLAIMING,0);return false;}}if(Atomics.compareExchange(w,at,CLAIMING,MAGIC)!==CLAIMING)return false;}
  if(memory.buffer.byteLength<EXTRA+64)return false;const extra=new Uint32Array(memory.buffer,EXTRA,16);if(Atomics.load(extra,0)===EXTRA_MAGIC)return Atomics.load(extra,10)===1&&Atomics.load(extra,15)===EXTRA_MAGIC;
  for(let i=0;i<16;i++)if(Atomics.load(extra,i)!==0)return false;if(Atomics.compareExchange(extra,0,0,EXTRA_CLAIMING)!==0)return false;
  for(let i=1;i<16;i++)if(Atomics.load(extra,i)!==0){Atomics.compareExchange(extra,0,EXTRA_CLAIMING,0);return false;}Atomics.store(extra,10,1);Atomics.store(extra,15,EXTRA_MAGIC);return Atomics.compareExchange(extra,0,EXTRA_CLAIMING,EXTRA_MAGIC)===EXTRA_CLAIMING;
 }
 const decode=command=>({generation:command>>>16,percent:command&255,enabled:!!(command&256),stackingReady:!!(command&512),strengthCode:(command>>>10)&63,strength:1+((command>>>10)&63)/4});
 function command(memory,{enabled=false,percent=100,strength=1,ownerSequence:requestedOwnerSequence,stackingReady=false,forceGeneration=false}={}){if(typeof enabled!=='boolean'||typeof stackingReady!=='boolean'||typeof forceGeneration!=='boolean')throw TypeError('Literal Boolean settings required');if(!Number.isInteger(percent)||percent<100||percent>200)throw RangeError('Authored pace must be100..200 percent');if(!Number.isFinite(strength)||strength<1||strength>10||!Number.isInteger((strength-1)*4))throw RangeError('Authored strength must be1..10 in quarter steps');if(!enabled){percent=100;strength=1;}if(!claim(memory))throw Error('Paced catch-up: foreign mailbox occupancy');const ownerView=new DataView(memory.buffer),ownerSequence=enabled?(requestedOwnerSequence??ownerView.getUint32(BASE+4,true)):0,binding=ownership.get(memory);if(enabled&&(!Number.isInteger(ownerSequence)||!ownerSequence||(ownerSequence&1)||ownerSequence>0xffffffff))throw RangeError('An even current AI owner sequence is required');const w=words(memory),old=Atomics.load(w,offsets.command/4),low=percent|(enabled?256:0)|(stackingReady?512:0)|(Math.round((strength-1)*4)<<10);Atomics.store(new Uint32Array(memory.buffer,EXTRA,16),9,ownerSequence);if((old&65535)===low&&(old>>>16)&&!forceGeneration&&binding?.ownerSequence===ownerSequence){ownership.set(memory,{command:old,ownerSequence});return old;}const generation=((old>>>16)%65535)+1,next=((generation<<16)|low)>>>0;Atomics.store(w,offsets.command/4,next);ownership.set(memory,{command:next,ownerSequence});return next;}
 function readEvidence(memory){
  const w=words(memory),d=new DataView(memory.buffer),at=o=>Atomics.load(w,o/4)>>>0,first=at(offsets.status),current=at(offsets.command),ack=at(offsets.ack),publishedOwnerSequence=at(offsets.ownerSequence),car=at(offsets.car),request=decode(current),publisher=first&255,reason=(first>>>8)&255;
  const valid=(p,n)=>Number.isInteger(p)&&p>=65536&&(p&3)===0&&p+n<=Math.min(memory.buffer.byteLength,0x28000000),u=p=>d.getUint32(p,true),f=p=>d.getFloat32(p,true),finite=x=>Number.isFinite(x)&&x>0;
  const player=u(0xd00000),observedCar=valid(car,0xa00)?car:valid(player,20)?u(player+4):0;
  const physicsKind=valid(observedCar,0xa00)&&[1,3].includes(u(observedCar+0x28))?u(observedCar+0x28):null,evidenceKind=physicsKind===1?'four-tires':physicsKind===3?'combined-grip':null;
  const extraValid=valid(EXTRA,64)&&u(EXTRA)===EXTRA_MAGIC&&u(EXTRA+40)===1&&u(EXTRA+60)===EXTRA_MAGIC,nativeStage=extraValid?u(EXTRA+32):null;
  const evidence={physicsKind,evidenceKind,nativeStage,requestedGeneration:request.generation,publishedGeneration:ack>>>16,ownerSequence:u(BASE+4),publishedOwnerSequence,publication:(first>>>16)>>>1};
  const reject=ackRejectCode=>Object.freeze({...evidence,ack:null,ackRejectCode});
  if(at(offsets.magic)!==MAGIC)return reject(1);
  if((first>>>16)&1)return reject(2);
  if(ack!==current)return reject(3);
  if(!request.generation||request.strengthCode>36||request.percent<100||request.percent>200||(!request.enabled&&(request.percent!==100||request.strengthCode!==0)))return reject(4);
  if(publisher!==1||![1,2,3].includes(reason)||(reason===2)!==!request.enabled)return reject(5);
  if(!valid(car,0xa00))return reject(6);
  if(!extraValid)return reject(18);
  if(![1,3].includes(physicsKind)||u(EXTRA+4)!==physicsKind||u(EXTRA+20)!==current)return reject(19);
  // Current native caches can advance before their next physical publication.
  // Evidence describes the exact physical inputs still present, using the
  // source stored under that publication's seqlock, never an inferred new M.
  const applied=reason===1,currentSourceBits=u(car+0x468),currentNativeSourceFactor=f(car+0x468),sourceBits=applied?u(EXTRA+8):currentSourceBits,sourceFactor=applied?f(EXTRA+8):currentNativeSourceFactor;
  if(!finite(sourceFactor)||!finite(currentNativeSourceFactor))return reject(7);
  const publishedTick=u(EXTRA+44),nativeTargetFactor=f(EXTRA+48),publishedRaceClock=u(EXTRA+56),driver=u(car+0x2c),race=u(0x890118);
  if(applied&&(u(EXTRA+52)!==0x32504d52||!Number.isFinite(nativeTargetFactor)||!valid(driver,0x774)||u(driver)!==0x785370||u(driver+4)!==car||u(car+0x24)!==3||!valid(race,24)||u(race)!==4||((u(0x86518c)-publishedTick)>>>0)>400||((u(race+20)-publishedRaceClock)>>>0)>400))return reject(21);
  const receiver=u(car+0x34);if(!valid(receiver,0x60)||u(receiver)!==(physicsKind===1?0x7a25e0:0x7a2538)||u(receiver+(physicsKind===1?0x5c:0x34))!==car||u(EXTRA+28)!==receiver)return reject(8);
  const chassis=u(receiver+0x20),power=u(receiver+(physicsKind===1?0x50:0x28)),drivetrain=physicsKind===3?u(receiver+0x24):null,wheels=physicsKind===1?[0x38,0x3c,0x40,0x44].map(o=>u(receiver+o)):[];
  if(!valid(chassis,0x20c)||!valid(power,16)||!wheels.every(p=>valid(p,0x188))||physicsKind===3&&(!valid(drivetrain,0x144)||u(drivetrain)!==0x7a2560||u(drivetrain+0x14)!==chassis||u(drivetrain+0x18)!==u(receiver+0x2c)))return reject(9);
  const binding=ownership.get(memory);if(reason===1&&(!binding||binding.command!==current))return reject(10);const ownerSequence=reason===1?publishedOwnerSequence:0;if(reason===1&&(!ownerSequence||(ownerSequence&1)||binding.ownerSequence!==ownerSequence||u(BASE+4)!==ownerSequence||u(EXTRA+36)!==ownerSequence))return reject(11);const P=applied?Math.fround(request.percent/100):1,S=applied?request.strength:1,nativeSelected=u(0x7fc0a0)?sourceFactor:1,powerExpected=applied?Math.fround(Math.fround(sourceFactor*P)*S):nativeSelected,tireExpected=applied?Math.fround(powerExpected*P):nativeSelected;
  if(!finite(powerExpected)||!finite(tireExpected))return reject(12);
  if(f(power+8)!==(physicsKind===3&&!applied?sourceFactor:powerExpected)||f(chassis+0x208)!==powerExpected)return reject(13);
  if(u(EXTRA+8)!==sourceBits||f(EXTRA+12)!==tireExpected||u(EXTRA+24)!==ownerSequence)return reject(19);
  const combinedGripFactor=physicsKind===3?f(drivetrain+0x140):null;
  if(physicsKind===1&&!wheels.every(p=>f(p+0x184)===tireExpected))return reject(14);
  if(physicsKind===3&&(f(drivetrain+0x13c)!==powerExpected||!finite(combinedGripFactor)||u(drivetrain+0x140)!==u(EXTRA+16)))return reject(20);
  if(applied&&(!request.enabled||!request.stackingReady||u(BASE+60)!==request.percent))return reject(15);
  if(at(offsets.status)!==first||at(offsets.ack)!==ack||at(offsets.command)!==current||at(offsets.magic)!==MAGIC||at(offsets.ownerSequence)!==publishedOwnerSequence||u(car+0x468)!==currentSourceBits||(applied&&(u(BASE+4)!==ownerSequence||u(EXTRA+36)!==ownerSequence||u(EXTRA+8)!==sourceBits||u(EXTRA+44)!==publishedTick||f(EXTRA+48)!==nativeTargetFactor||u(EXTRA+52)!==0x32504d52||u(EXTRA+56)!==publishedRaceClock||u(car+0x2c)!==driver||u(0x890118)!==race||((u(0x86518c)-publishedTick)>>>0)>400||((u(race+20)-publishedRaceClock)>>>0)>400))||u(EXTRA)!==EXTRA_MAGIC||u(EXTRA+40)!==1||u(EXTRA+60)!==EXTRA_MAGIC||at(offsets.car)!==car)return reject(16);
  const result=Object.freeze({command:ack,ownerSequence,percent:applied?request.percent:100,strength:S,strengthCode:applied?request.strengthCode:0,sourceFactor,nativeFactor:sourceFactor,nativeTargetFactor,publishedTick,publishedRaceClock,currentNativeSourceFactor,scalarFactor:powerExpected,aeroDivisor:f(power+8),powerFactor:powerExpected,tireFactor:tireExpected,combinedGripFactor,relativePowerGain:Math.fround(P*S),relativeTireGain:Math.fround(Math.fround(P*S)*P),physicsKind,evidenceKind,wheelHits:physicsKind===1?4:0,gripHits:physicsKind===3?1:0,outputsVerified:true,exactOutputsVerified:true,car,publisher,reason,publication:(first>>>16)>>>1});
  return Object.freeze({...evidence,ack:result,ackRejectCode:0});
 }
 const readAck=memory=>readEvidence(memory).ack;
 function readGain(memory,{currentCar,pace,ownerSequence}={}){const ack=readAck(memory);if(!ack||ack.reason!==1||ack.car!==currentCar||ack.ownerSequence!==ownerSequence||!Number.isInteger(ownerSequence)||!ownerSequence||(ownerSequence&1)||!Number.isFinite(pace)||pace<1||pace>2||Math.round(pace*100)!==ack.percent)return null;const d=new DataView(memory.buffer),u=p=>d.getUint32(p,true);if(u(BASE)!==0x3749414e||u(BASE+28)!==0x3749414e||u(BASE+4)!==ownerSequence||u(BASE+8)!==1||u(BASE+52)!==1||u(BASE+48)>=180||u(BASE+16)!==currentCar||u(BASE+36)!==currentCar||u(BASE+60)!==ack.percent)return null;return Object.freeze({...ack,ownerSequence,pace:ack.percent/100,source:'exact-current-paced-publication-v1'});}
 return Object.freeze({BASE,MAGIC,CLAIMING,offsets,extra:Object.freeze({base:EXTRA,size:64,magic:EXTRA_MAGIC}),claim,command,decode,readAck,readGain,readEvidence,rejectionCodes});
}
module.exports={create,...create(globalThis)};
