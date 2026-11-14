(function(root){'use strict';
const KIND=0x4e465446,FIELDS=Object.freeze(['version','sequence','controller','incomingBits','requestedBits','effectiveBits','resultBits','available','capSequence','request','ownerSequence','captureTick','setterTick','age','player','car','driver','race','route','primaryReason','cachedReason','outcome','proof','commandStable']);
const outcomes=Object.freeze({1:'primary-reduction',2:'cached-reduction',3:'native-already-at-or-below-cap',4:'guard-rejected-or-unresolved',5:'publication-changed'});
const integer=n=>Number.isInteger(n)&&n>=-2147483648&&n<=4294967295;
function createReceiver({onReceipt=()=>{},clock=()=>performance.now(),maxWindowMs=1000}={}){
 let pending=null,lastSequence=0,disposed=false;
 function consume(message){
  if(message?.t!=='register'||message.kind!==KIND)return false;
  // Even after teardown, consume this module's queued private registrations so
  // they cannot leak into the upstream game's generic registration map.
  if(disposed)return true;
  if(!integer(message.ptr)||!integer(message.size)){pending=null;return true;}
  const ptr=message.ptr>>>0,value=message.size>>>0,index=ptr&255,frame=ptr>>>8,now=clock();
  if(index===254){pending=value===65536+FIELDS.length?{frame,start:now,values:new Map()}:null;return true;}
  if(!pending||pending.frame!==frame||!Number.isFinite(now)||now<pending.start||now-pending.start>maxWindowMs){pending=null;return true;}
  if(index===255){const p=pending;pending=null;if(p.values.size!==FIELDS.length||p.values.get(0)!==1||p.values.get(1)!==value||!value||(value&1)||(value&0xffffff)!==frame||(lastSequence&&((value-lastSequence)|0)<=0))return true;
   const receipt=Object.freeze(Object.fromEntries(FIELDS.map((name,i)=>[name,p.values.get(i)])));lastSequence=value;try{onReceipt(receipt);}catch{}return true;
  }
  if(index>=FIELDS.length||pending.values.has(index)){pending=null;return true;}
  pending.values.set(index,value);return true;
 }
 return Object.freeze({consume,reset(){pending=null;lastSequence=0;},dispose(){disposed=true;pending=null;}});
}
function decode(receipt){
 if(receipt?.version!==1||!Number.isInteger(receipt.sequence)||!receipt.sequence||(receipt.sequence&1))return null;
 const buffer=new ArrayBuffer(4),v=new DataView(buffer),float=bits=>{v.setUint32(0,bits>>>0,true);const n=v.getFloat32(0,true);return Number.isFinite(n)?n:null;};
 return Object.freeze({...receipt,incomingTarget:(receipt.available&1)?float(receipt.incomingBits):null,requestedCap:(receipt.available&1)?float(receipt.requestedBits):null,effectiveCap:receipt.effectiveBits?float(receipt.effectiveBits):null,resultTarget:(receipt.available&4)?float(receipt.resultBits):null,ageTicks:(receipt.available&2)?receipt.age:null,outcomeName:outcomes[receipt.outcome]||'unknown',units:'uncalibrated native target units'});
}
const api=Object.freeze({KIND,FIELDS,outcomes,createReceiver,decode});root.__NFSU2_TARGET_FEEDBACK__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
