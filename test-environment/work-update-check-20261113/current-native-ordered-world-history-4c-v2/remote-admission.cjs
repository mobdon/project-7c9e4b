'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createPacketInput}=require('./native-packet-input.cjs'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const RC={base:703496992,count:8,stride:12376,history:32,historyBytes:10968,packets:12308};
function run({q,stage,writeJson,enrollment,platform,directory,sourceJournalSha256,sourceRawSha256}){
 const f=q.f,remote=enrollment.state.enrollment.remote,local=enrollment.state.enrollment.local,rows=[];let offset=0,complete=false,failure=null,clockFrame=null;
 const raw=fs.openSync(path.join(directory,'remote-admission-raw.bin'),'wx'),journal=fs.openSync(path.join(directory,'remote-admission-observations.jsonl'),'wx');
 const capture=(address,length,role)=>{const b=Buffer.from(f.bytes(address,length)),r={file:'remote-admission-raw.bin',address,length,offset,role,sha256:sha(b)};fs.writeSync(raw,b);offset+=length;return r;};
 const counters=()=>Array.from({length:8},(_,i)=>{const p=RC.base+i*RC.stride;return{address:p,ip:f.get(p),slot:f.view.getInt32(p+4,true),car:f.get(p+8),nameHex:f.bytes(p+12,16).toString('hex'),historyCount:f.get(p+32),packets:f.get(p+RC.packets)};});
 const S=role=>({refused:f.get(703596320),bad:f.get(703596324),raw:capture(703596320,8,role)});
 try{
  assert(enrollment.completed);assert(platform.setupPeer({q,stage}));
  assert(stage('native-racecars-clock-frame22828-before-receive',()=>{f.exports.f22828(q.A.cpu);clockFrame={on:f.get(703596192),K:capture(703596192,128,'native-K-clock-after-frame'),rcBeforeAnyPacket:capture(RC.base,8*RC.stride,'all-native-Rc-before-first-packet')};assert.equal(clockFrame.on,1);return clockFrame;}));
  const packet=createPacketInput({q,root:path.resolve(directory,'../..'),expectedJournalSha256:sourceJournalSha256,expectedRawSha256:sourceRawSha256,writer:0x6400000,buffer:0x6400100,payloadScratch:0x6400400,capacity:512,capture});
  for(const variant of['base','full']){
   const row={kind:'offline-native-remote-admission-case',frameId:1,variant,localCar:local.car,remoteCar:remote.car,remoteController:remote.remoteController,packet:{},receiver:{entry:22813,returned:false},sourceDelivery:'Direct whole native22813 API unit call with synthetic framing; not a transport receipt',before:{rcArray:capture(RC.base,8*RC.stride,'native-Rc-before-'+variant),records:counters(),S:S('native-refusal-and-bad-counters-before-'+variant),localCar:capture(local.car,2528,'native-local-car-before-'+variant),remoteCar:capture(remote.car,2528,'native-remote-car-before-'+variant),controller:capture(remote.remoteController,576,'native-remote-controller-before-'+variant)}};rows.push(row);
   try{const p=packet.build({variant,frameId:1,slot:1,result:row.packet});row.receiver.arguments=[p.pointer,p.length,0x0a4d0002];f.exports.f22813(p.pointer,p.length,0x0a4d0002);row.receiver.returned=true;row.receiver.actualResult={type:'void'};}
   catch(e){row.receiver.error={name:e.name,message:e.message,stack:e.stack};throw e;}
   finally{row.after={rcArray:capture(RC.base,8*RC.stride,'native-Rc-after-'+variant),records:counters(),S:S('native-refusal-and-bad-counters-after-'+variant),remoteCar:capture(remote.car,2528,'native-remote-car-after-'+variant),controller:capture(remote.remoteController,576,'native-remote-controller-after-'+variant)};fs.writeSync(journal,JSON.stringify(row)+'\n');}
   const admitted=row.after.records.find(r=>r.ip===0x0a4d0002);assert(admitted);assert.equal(admitted.slot,1);assert.equal(admitted.car,remote.car);assert(admitted.historyCount>=1);assert.equal(admitted.packets,rows.length);row.admitted=admitted;
  }
  complete=true;
 }catch(e){failure={name:e.name,message:e.message,stack:e.stack};}
 finally{fs.closeSync(raw);fs.closeSync(journal);}
 const receipt={kind:'ISOLATED-TWO-CAR-NATIVE-REMOTE-ADMISSION',complete,failure,clockFrame,enrollment:enrollment.state.enrollment,remote,local,RcLayout:RC,cases:rows,rawSha256:sha(fs.readFileSync(path.join(directory,'remote-admission-raw.bin'))),journalSha256:sha(fs.readFileSync(path.join(directory,'remote-admission-observations.jsonl'))),limits:['Two genuine native roster cars/controller and native N2RS admission only.','Pending client initialization is not a connected live session.','Synthetic header/platform identity/delivery with frozen genuine V4 codec bodies.','Empty actual native names are preserved.','No remote World movement, legacy observation, classifier or report is requested.']};writeJson('remote-admission-receipt.json',receipt);return receipt;
}
module.exports={RC,run};
