'use strict';
// Read-only native call observations. Markers expose parameter0, never a typed result.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),IDS=new Set([14980,22858,7787,22817,22818,22822,22828,21425]);
function create({directory}){
 const rawFd=fs.openSync(path.join(directory,'remote-application-raw.bin'),'wx'),journalFd=fs.openSync(path.join(directory,'remote-application-observations.jsonl'),'wx'),stacks=new Map(),rows=[],spans=[];let binding=null,offset=0,frameId=0,closed=false;
 const capture=(f,p,n,role)=>{const b=Buffer.from(f.bytes(p,n)),s={file:'remote-application-raw.bin',offset,address:p,length:n,sha256:sha(b),role};fs.writeSync(rawFd,b);offset+=n;spans.push(s);return s;};
 function observe({q,f,marker,hookParameter0,cpu,event,activeStage}){
  if(!binding||!IDS.has(marker.id))return null;assert(!closed);const sp=f.get(cpu+16),receiver=f.get(cpu+4),stack=stacks.get(marker.id)||[];stacks.set(marker.id,stack);
  if(marker.phase==='before'){
   const target=marker.id===22817?hookParameter0:marker.id===14980?receiver:marker.id===22858?receiver:marker.id===7787?receiver:marker.id===22818||marker.id===22822?binding.remoteController:null;
   const matches=marker.id===22817||marker.id===14980?target===binding.remoteCar:marker.id===22858?target===binding.remoteController:marker.id===7787?target===binding.remoteController+192&&f.get(sp+4)===binding.remoteCar:marker.id===22818||marker.id===22822?stacks.get(22858)?.at(-1)?.matches===true:marker.id===21425?stacks.get(14980)?.at(-1)?.matches===true:marker.id===22828;
   stack.push({matches,frameId,event,entryEsp:sp,returnAddress:f.get(sp),receiver,target,firstParameter:hookParameter0});
  }
  const entry=stack.at(-1);if(!entry||!entry.matches){if(marker.phase==='after')stack.pop();return null;}
  const row={kind:'actual-native-remote-application-marker',event,frameId:entry.frameId,activeStage,function:marker.id,phase:marker.phase,entry,actualCpu:{eax:f.get(cpu),ecx:receiver,esp:sp,eip:f.get(cpu+32)},nativeSessionState:f.get(9031496),hookParameter0,typedReturnExposed:false,nativeCallAdded:false,guestWritesPerformed:false,remoteCar:binding.remoteCar,remoteController:binding.remoteController,raw:{car:capture(f,binding.remoteCar,2528,'remote-car-at-'+marker.id+'-'+marker.phase),controller:capture(f,binding.remoteController,576,'remote-controller-at-'+marker.id+'-'+marker.phase),Rc:capture(f,703496992,12376,'native-Rc-at-'+marker.id+'-'+marker.phase),K:capture(f,703596192,128,'native-clock-at-'+marker.id+'-'+marker.phase)}};
  if(marker.phase==='after'){row.actualNativeCpuReturn=marker.id!==22817&&marker.id!==22818&&marker.id!==22822&&marker.id!==22828&&row.actualCpu.eip===entry.returnAddress;stack.pop();}
  rows.push(row);fs.writeSync(journalFd,JSON.stringify(row)+'\n');return{file:'remote-application-observations.jsonl',line:rows.length,function:marker.id,phase:marker.phase,frameId:entry.frameId};
 }
 function finalize(){assert(!closed);closed=true;fs.closeSync(rawFd);fs.closeSync(journalFd);const receipt={kind:'READ-ONLY-NATIVE-REMOTE-APPLICATION-MARKERS',binding,markerFunctions:[...IDS],rows:rows.length,spans,frames:Array.from(new Set(rows.map(r=>r.frameId))).sort((a,b)=>a-b),counts:Object.fromEntries([...IDS].map(id=>[id,Object.fromEntries(['before','after','tail'].map(phase=>[phase,rows.filter(r=>r.function===id&&r.phase===phase).length]))])),openMatchingEntries:[...stacks].flatMap(([id,stack])=>stack.filter(e=>e.matches).map(entry=>({function:id,entry}))),rawSha256:sha(fs.readFileSync(path.join(directory,'remote-application-raw.bin'))),journalSha256:sha(fs.readFileSync(path.join(directory,'remote-application-observations.jsonl'))),typedHelperResultsInferred:false,nativeCallsOrInputsChanged:false};fs.writeFileSync(path.join(directory,'remote-application-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return receipt;}
 return{bind(value){assert(!binding);binding={remoteCar:value.remoteCar,remoteController:value.remoteController};},setFrame(value){assert(Number.isInteger(value)&&value>=0);frameId=value;},observe,finalize,getRows(){return rows;}};
}
module.exports={IDS,create};
