'use strict';
// Condition-agnostic host recorder definitions only. No native/fixture imports,
// guest reads/writes, clocks, report callbacks, or native calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function createObserverRecorder({directory,fullThroughFrame=1,fullFile='constructor-events.jsonl',countsFile='observer-frame-counts.jsonl'}={}){
 assert.equal(typeof directory,'string');assert(fs.statSync(directory).isDirectory());assert(Number.isSafeInteger(fullThroughFrame)&&fullThroughFrame>=1);
 const names=[fullFile,countsFile];for(const name of names)assert.equal(path.basename(name),name);assert.equal(new Set(names).size,2);
 const fullPath=path.join(directory,fullFile),countsPath=path.join(directory,countsFile);for(const p of[fullPath,countsPath])assert(!fs.existsSync(p),'Preserve existing observer journal');
 let totalEvents=0,checkedEvents=0,fullEvents=0,compactEvents=0,fullLines=0,countLines=0,pending=null,bucket=null,closed=false;
 const append=(p,text,first)=>fs.writeFileSync(p,text+'\n',{flag:first?'wx':'a'});
 function flush(){if(!bucket)return;const {counts,...base}=bucket;const row={kind:'host-observer-stage-function-counts',...base,counts:[...counts.values()].sort((a,b)=>a.function-b.function||a.phase.localeCompare(b.phase)),allRecordedCallbacksPreservedCpuAndStacks:bucket.startedEvents===bucket.checkedEvents,claim:'Counts of existing observation markers only; no native typed-helper return, routine completion, detector result or movement inferred.'};append(countsPath,JSON.stringify(row),countLines===0);countLines++;bucket=null;}
 function begin({marker,activeStage,frameId=null}){
  assert(!closed);assert.equal(pending,null,'One synchronous host recorder event at a time');assert(Number.isSafeInteger(marker.id)&&marker.id>=0);assert(['before','after','tail'].includes(marker.phase));assert.equal(typeof activeStage,'string');assert(frameId===null||(Number.isSafeInteger(frameId)&&frameId>=1));
  const full=frameId===null||frameId<=fullThroughFrame,key=JSON.stringify([activeStage,frameId]);
  if(bucket?.key!==key){flush();bucket={key,activeStage,frameId,recording:full?'full':'counts-only',firstEvent:totalEvents,lastEvent:totalEvents,startedEvents:0,events:0,checkedEvents:0,counts:new Map()};}
  const token=Object.freeze({event:totalEvents++,function:marker.id,phase:marker.phase,activeStage,frameId,full});bucket.startedEvents++;bucket.lastEvent=token.event;const counterKey=token.function+':'+token.phase,c=bucket.counts.get(counterKey)||{function:token.function,phase:token.phase,events:0,preservationChecksPassed:0};c.events++;bucket.counts.set(counterKey,c);pending=token;return token;
 }
 function commitPreserved(token,row=null){
  // Call only after the unchanged outer CPU/guest/shadow assertions succeed.
  assert.equal(pending,token);assert(!closed);assert(bucket);assert.equal(bucket.activeStage,token.activeStage);assert.equal(bucket.frameId,token.frameId);
  if(token.full){assert(row&&row.event===token.event&&row.id===token.function&&row.phase===token.phase);assert.equal(row.activeStage,token.activeStage);assert.equal(row.observerPreservedCpuAndStacks,true);append(fullPath,JSON.stringify(row),fullLines===0);fullLines++;fullEvents++;}
  else{assert.equal(row,null,'Later frames retain function/phase counts and the separate actual frame journals');compactEvents++;}
  checkedEvents++;bucket.events++;bucket.checkedEvents++;const key=token.function+':'+token.phase,c=bucket.counts.get(key);assert(c);c.preservationChecksPassed++;pending=null;return 0;
 }
 function summary(){return{kind:'host-only-full-first-frame-then-function-counts',totalEvents,checkedEvents,fullEvents,compactEvents,fullLines,countLines,allObserversPreservedCpuAndStacks:checkedEvents===totalEvents&&pending===null,pendingEvent:pending,fullThroughFrame,fullFile,countsFile,fullEventsRetainedInMemory:false,typedHelperArgumentsOrReturnInferred:false,nativeCallsOrInputsChanged:false};}
 function finalize(){assert(!closed);flush();closed=true;return summary();}
 return Object.freeze({begin,commitPreserved,summary,finalize});
}
module.exports={createObserverRecorder};
