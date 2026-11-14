'use strict';
// Definitions only: explicitly synthetic N2RS framing of frozen genuine codec bodies.
// No full sender or transport claim. Only whole current native writer helpers build bytes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inputScope=Object.freeze({kind:'offline-authored-N2RS-header-with-frozen-native-codec-payload',writerInit:22899,put8:22900,put32:22901,putBytes:22902,receiver:22813,headerBytes:24,capturedRealSenderPacket:false,liveTransport:false});
function createPacketInput({q,root,expectedJournalSha256,expectedRawSha256,writer,buffer,payloadScratch,capacity=512,capture}){
 const sourceDir=path.resolve(root,'work-update-check-20261113/current-native-ai-world-4c-codec-unit-v4'),journal=fs.readFileSync(path.join(sourceDir,'codec-unit-observations.jsonl')),raw=fs.readFileSync(path.join(sourceDir,'codec-unit-raw.bin'));
 assert.equal(sha(journal),expectedJournalSha256);assert.equal(sha(raw),expectedRawSha256);
 const rows=journal.toString().trim().split('\n').map(JSON.parse).filter(r=>r.kind==='offline-native-codec-unit-case');assert.equal(rows.length,384);
 const indexed=new Map();for(const r of rows){assert.equal(r.completed,true);assert.equal(r.decoderResultI32,0);const key=r.case+':'+r.frameId;assert(!indexed.has(key));indexed.set(key,r);}
 const f=q.f,mem=new Uint8Array(f.memory.buffer);for(const id of[22899,22900,22901,22902,22813]){assert(q.metadata.real.includes(id));assert.equal(typeof f.exports['f'+id],'function');}
 assert(capacity>=128);for(const[p,n]of[[writer,16],[buffer,capacity],[payloadScratch,capacity]])assert(Number.isInteger(p)&&p>=0&&p+n<=mem.length);
 assert(writer+16<=buffer||buffer+capacity<=writer);assert(writer+16<=payloadScratch||payloadScratch+capacity<=writer);assert(buffer+capacity<=payloadScratch||payloadScratch+capacity<=buffer);
 function invoke(calls,id,args){const row={id,args,returned:false};calls.push(row);try{const result=f.exports['f'+id](...args);row.returned=true;row.actualResult=result===undefined?{type:'void'}:{type:'i32',signed:result|0,bits:result>>>0};return result;}catch(e){row.error={name:e.name,message:e.message};throw e;}}
 function build({variant,frameId,slot,epoch=0,clockEpoch=0,status=0,echo=0,held=0,result}){
  assert(result&&typeof result==='object','Caller retains partial packet result before native calls');const source=indexed.get(variant+':'+frameId);assert(source);assert(Number.isInteger(slot)&&slot>=0&&slot<6);for(const v of[epoch,clockEpoch,status])assert(Number.isInteger(v)&&v>=0&&v<=255);
  const span=source.encodedBody;assert(span.offset>=0&&span.length>0&&span.offset+span.length<=raw.length);const body=raw.subarray(span.offset,span.offset+span.length);assert.equal(sha(body),span.sha256);assert(24+body.length<=capacity);
  Object.assign(result,{kind:inputScope.kind,frameId,variant,capturedRealSenderPacket:false,source:{journalSha256:expectedJournalSha256,rawSha256:expectedRawSha256,span,decodedState:source.decodedState,unitInput:source.input},authoredHeader:{magic:'N2RS',version:1,extensionFlag:source.extArgument&1,slot,stateCount:1,epoch,clockEpoch,status,authoredFlags:0,wallStampU32:Number(BigInt.asUintN(32,BigInt(source.input.callerHostMicroseconds))),echo:echo>>>0,held:held>>>0},nativeCalls:[]});
  try{
  // Input scratch bytes are caller-owned. Writer and packet bytes below are native outputs.
  mem.set(body,payloadScratch);result.payloadInput=capture(payloadScratch,body.length,'frozen-native-codec-body-input');
  invoke(result.nativeCalls,22899,[writer,buffer,capacity]);
  for(const b of Buffer.from('N2RS'))invoke(result.nativeCalls,22900,[writer,b]);
  for(const b of[1,result.authoredHeader.extensionFlag,slot,1,epoch,clockEpoch,status,0])invoke(result.nativeCalls,22900,[writer,b]);
  for(const v of[result.authoredHeader.wallStampU32,echo>>>0,held>>>0])invoke(result.nativeCalls,22901,[writer,v]);
  invoke(result.nativeCalls,22902,[writer,payloadScratch,body.length]);
  result.actualWriter={buffer:f.get(writer),length:f.get(writer+4),capacity:f.get(writer+8),error:f.get(writer+12),raw:capture(writer,16,'native-packet-writer-output')};
  assert.equal(result.actualWriter.buffer,buffer);assert.equal(result.actualWriter.error,0);assert.equal(result.actualWriter.length,24+body.length);assert.equal(result.actualWriter.capacity,capacity);
  result.actualPacket=capture(buffer,result.actualWriter.length,'actual-native-writer-N2RS-packet');assert.deepEqual(Buffer.from(mem.subarray(buffer+24,buffer+24+body.length)),body,'Original frozen body retained byte exact');
  result.completed=true;return{pointer:buffer,length:result.actualWriter.length,source,result};
  }catch(error){result.nativeFailure={name:error.name,message:error.message};result.partialAfterFailure={writer:capture(writer,16,'partial-native-packet-writer-after-failure'),ownedPacketBuffer:capture(buffer,capacity,'full-owned-native-packet-buffer-after-failure')};throw error;}
 }
 return{inputScope,build};
}
module.exports={inputScope,createPacketInput};
