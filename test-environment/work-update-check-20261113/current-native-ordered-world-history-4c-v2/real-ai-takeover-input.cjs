'use strict';
// Current production Controller inputs and complete real native entry calls.
// Importing this helper never runs constructors, bridge, Controller or game.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
function loadCanonicalRoadInputs({q,stage,abi}){
 return stage('current-native-generated-road-loaders10506-and17476-16383-2623',()=>{
  const dir=path.join(ROOT,'work-update-check-20261113/generated-road-speed-input-4c-v1'),receiptBytes=fs.readFileSync(path.join(dir,'input-receipt.json'));
  assert.equal(q.C.sha(receiptBytes),'27f9e5770e17fc38bdce642127ab5e909c12d47e12e7f05859b53570cb3eb2f3');
  const inputReceipt=JSON.parse(receiptBytes),inputs=[],manager=0x88a320;
  q.rawCall(10506,0);abi(4);
  for(const[name,address]of[['canonical-links-34122.bin',0x4020000],['canonical-groups-34121.bin',0x4030000]]){
   const data=fs.readFileSync(path.join(dir,name)),pin=inputReceipt.files.find(row=>row.file===name);assert(pin);assert.equal(q.C.sha(data),pin.sha256);assert.equal(data.length,pin.bytes);q.commit(address,data.length);new Uint8Array(q.f.memory.buffer).set(data,address);fs.writeFileSync(path.join(__dirname,name),data);
   const result=q.rawCall(17476,0,[address]);abi(4);assert.equal(result.eax,1);inputs.push({file:name,address,bytes:data.length,sha256:pin.sha256,result});
  }
  const group=0x4030000+8;assert.equal(q.f.get(manager+20),group);assert.equal(q.f.get(manager+6020),1);assert.equal(q.f.get(manager+12024),1);assert.equal(q.f.get(manager+12028),group);
  return{nativeEntries:[10506,17476,16383,2623],inputs,inputReceiptSha256:q.C.sha(receiptBytes),manager,managerHeaderHex:q.f.bytes(manager,20).toString('hex'),nativeGroup:group,counts:{all:q.f.get(manager+6020),main:q.f.get(manager+12024),secondary:q.f.get(manager+17228)},tangentScale:q.f.view.getFloat32(8513532,true),generatedAssetDescription:inputReceipt.description,authenticStreetX:false,canonicalPointerOrRouteOutputsAuthored:false};
 });
}
function initializeActionPools({q,stage,abi}){
 return stage('current-native-action-pool-initializer18958',()=>{
  const before=q.f.get(0x81cb70),result=q.rawCall(18958,0);abi(4);
  const pool=q.f.get(0x81cb70);assert(pool>=0x10000&&pool+64<0x28000000,'Native initializer must publish a valid action pool');
  return{...result,nativeEntry:18958,before,pool,poolHeaderHex:q.f.bytes(pool,64).toString('hex'),nativeActionAllocator:17091,poolPointerAuthored:false,freeListOrActionAuthored:false};
 });
}
module.exports={loadCanonicalRoadInputs,initializeActionPools};
