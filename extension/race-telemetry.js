(function(root){
'use strict';
// Observational car identity only. The caller supplies its independently
// verified exact module hash; this reader neither verifies a binary nor tunes,
// calls native code, or writes guest memory. Equal reads are not a lifetime lock.
const PIN='ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c';
const ABI=Object.freeze({revision:'3bdd9959',moduleHash:PIN,typesPointer:0x8a1ccc,
 typeStride:0x890,stockTypes:46,playerTypes:31,rideOffset:0x10,nameBytes:32,
 hashOffset:0xd0,bitmap:0x29779ac0,bitmapBytes:32768,pageBytes:16384,ceiling:0x28000000});
// Public source game.h:75 and roam_game.c:767-785 establish the pointer, stride,
// name/hash fields and car -> RideInfo -> type chain. profile.ts:225 supplies
// these stock names and its bStringHash. The referenced original GLOBALB is
// absent here; this is a conservative source-backed tag, not live proof or a
// claim that the whole stock record, vehicle model, or performance is unedited.
const STOCK_NAMES=Object.freeze(['PEUGOT','FOCUS','COROLLA','240SX','MIATA','CIVIC','PEUGOT106','CORSA',
 'HUMMER','NAVIGATOR','ESCALADE','TIBURON','SENTRA','CELICA','IS300','SUPRA','GOLF','A3','RSX',
 'ECLIPSE','TT','RX8','350Z','G35','3000GT','GTO','MUSTANGGT','SKYLINE','LANCEREVO8','RX7','IMPREZAWRX']);
function nameHash(s){let h=0xffffffff;for(let i=0;i<s.length;i++)h=(Math.imul(h,33)+s.charCodeAt(i))>>>0;return h;}
const STOCK_HASHES=Object.freeze(STOCK_NAMES.map(nameHash));
const PROVENANCE=Object.freeze({publicRevision:'9e0230212776f6c9a4d0db30c1963e9730138553',
 source:'public runtime/game.h, runtime/roam_game.c and web/src/app/profile.ts',
 hashDefinition:'bStringHash: initial 0xffffffff, unsigned h*33 + ASCII byte',
 stockSourceSha256:'07e1c37a2e5ba4b3e6a17b257e653409c31d5f0b3f9df3464aec36adbbced9d0',
 stockBinaryPresent:false,observationalOnly:true,liveVerified:false,performanceVerified:false,
 limitations:Object.freeze(['Caller verifies the exact module and supplies the current car.',
  'Only the proved low guest window is admitted; a high-window table remains unknown.',
  'Matching a stock name and hash does not prove the complete record or rendered model is stock.',
  'Equal rereads narrow concurrent changes but do not prove allocator lifetime.'])});
const unknown=reason=>({carKey:'unknown',status:'unknown',reason,liveVerified:false});
function readCar(memory,car,options={}){
 if(!options||options.verified!==true||options.moduleHash!==PIN)return unknown('exact-build-verification-required');
 try{
  const buffer=memory?.buffer;
  if(Object.prototype.toString.call(buffer)!=='[object SharedArrayBuffer]'||buffer.byteLength<ABI.bitmap+ABI.bitmapBytes)
   return unknown('current-shared-memory-required');
  const view=new DataView(buffer),spans=[];
  const range=(p,n)=>Number.isSafeInteger(p)&&p>=0x10000&&Number.isSafeInteger(n)&&n>0&&
   p+n<=Math.min(ABI.ceiling,view.byteLength);
  const committed=(p,n)=>{
   if(!range(p,n))return false;
   for(let page=Math.floor(p/ABI.pageBytes);page<=Math.floor((p+n-1)/ABI.pageBytes);page++)
    if(!(view.getUint8(ABI.bitmap+(page>>>3))&(1<<(page&7))))return false;
   return true;
  };
  const capture=(p,n)=>{
   if(!committed(p,n))return null;
   const data=new Uint8Array(buffer,p,n).slice();spans.push({p,n,data});return data;
  };
  const word=b=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(0,true);
  if(!Number.isSafeInteger(car)||car%4||!range(car,0x14))return unknown('invalid-car');
  const carBytes=capture(car+ABI.rideOffset,4),pointerBytes=capture(ABI.typesPointer,4);
  if(!carBytes||!pointerBytes)return unknown('uncommitted-identity');
  const ride=word(carBytes),types=word(pointerBytes);
  if(ride%4||!range(ride,4))return unknown('invalid-ride');
  if(types%16||!range(types,ABI.stockTypes*ABI.typeStride))return unknown('unsupported-stock-table-range');
  // Validate every page of the declared bounded stock table, even though only
  // the selected name/hash prefix is copied. Runtime-gap and high-window data
  // cannot enter through a plausible individual entry pointer.
  if(!committed(types,ABI.stockTypes*ABI.typeStride))return unknown('uncommitted-stock-table');
  const rideBytes=capture(ride,4);if(!rideBytes)return unknown('uncommitted-ride');
  const type=word(rideBytes);if(type>=ABI.playerTypes)return unknown('not-known-player-stock-type');
  const entry=types+type*ABI.typeStride,data=capture(entry,ABI.hashOffset+4);
  if(!data)return unknown('uncommitted-stock-entry');
  const name=STOCK_NAMES[type];
  for(let i=0;i<name.length;i++)if(data[i]!==name.charCodeAt(i))return unknown('stock-name-mismatch');
  if(data[name.length]!==0)return unknown('stock-name-not-terminated');
  const hash=new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(ABI.hashOffset,true);
  if(hash!==STOCK_HASHES[type])return unknown('stock-hash-mismatch');
  // Reread all consumed source bytes, including pointer/type, and every
  // table/source commitment before publishing even an observational tag.
  if(memory.buffer!==buffer||!committed(types,ABI.stockTypes*ABI.typeStride))return unknown('identity-changed');
  for(const s of spans){
   if(!committed(s.p,s.n))return unknown('identity-changed');
   const now=new Uint8Array(buffer,s.p,s.n);
   for(let i=0;i<s.n;i++)if(now[i]!==s.data[i])return unknown('identity-changed');
  }
  if(memory.buffer!==buffer)return unknown('identity-changed');
  return{carKey:type===27&&name==='SKYLINE'&&hash===0xbe48375e?'r34':'other',status:'observed-stock-identity',
   carType:type,stockName:name,stockHash:hash,liveVerified:false,performanceVerified:false};
 }catch{return unknown('unreadable-memory');}
}
const api=Object.freeze({ABI,PROVENANCE,STOCK_NAMES,STOCK_HASHES,nameHash,readCar});
root.__NFSU2_RACE_TELEMETRY__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
