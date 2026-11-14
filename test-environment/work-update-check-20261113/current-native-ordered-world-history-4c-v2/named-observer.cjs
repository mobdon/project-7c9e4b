'use strict';
// Read-only evidence for the ordinary posthook. No frame observer call is added.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),R=703598208,CARS=703604128,FPS=703603728,SPEED=703596016,RC=703496992,RC_STRIDE=12376,TABLE=9031504,MONITOR=674009140;
const MARKERS=new Set([22828,22866]),OUT={speed:0x6502040,jump:0x6502060};
function create({directory,getClockMicroseconds}){
  const rawName='named-observer-raw.bin',journalName='named-observer-observations.jsonl',rawFd=fs.openSync(path.join(directory,rawName),'wx'),journalFd=fs.openSync(path.join(directory,journalName),'wx');
  const rows=[],spans=[],frames=[];let binding=null,frameId=0,offset=0,journalLine=0,closed=false,baseline=null,result=null;
  const capture=(f,p,n,role)=>{const b=Buffer.from(f.bytes(p,n)),span={file:rawName,address:p,length:n,offset,sha256:sha(b),role};fs.writeSync(rawFd,b);offset+=n;spans.push(span);return span;};
  const f32=(f,p)=>{const value=f.view.getFloat32(p,true);return{value:Number.isFinite(value)?value:String(value),bits:f.get(p)};};
  const vector=(f,p)=>Array.from({length:3},(_,i)=>f32(f,p+4*i));
  const u64=(f,p)=>String(f.view.getBigUint64(p,true));
  function history(f,p){return{position:vector(f,p),previousDisplacement:vector(f,p+12),previousStep:f32(f,p+24),have:f.view.getInt32(p+28,true),jumped:f.view.getInt32(p+32,true),jumps:f.get(p+36),big:f.get(p+40),maximum:f32(f,p+44)};}
  function snapshot(q,label){
    const{f}=q;assert(binding);
    const records=Array.from({length:8},(_,i)=>{const p=CARS+i*208,first=f.view.getBigUint64(p+40,true),last=f.view.getBigUint64(p+48,true);return{address:p,car:f.get(p),nameHex:f.bytes(p+4,16).toString('hex'),updates:f.get(p+20),direct:f.get(p+24),g100:f.get(p+28),g250:f.get(p+32),g500:f.get(p+36),firstMicroseconds:String(first),lastMicroseconds:String(last),derivedUpdateSpanMicroseconds:last>=first?String(last-first):null,gapMaxMicroseconds:u64(f,p+56),shown:history(f,p+64),game:history(f,p+112),gapLastMicroseconds:u64(f,p+160),gapAtMicroseconds:u64(f,p+168),reportableJump:f32(f,p+176),faded:f.get(p+180),kept:f.get(p+184),unhit:f.get(p+188),ageMin:f32(f,p+192),ageMax:f32(f,p+196),ageSum:f.view.getFloat64(p+200,true)};});
    const rc=Array.from({length:8},(_,i)=>RC+i*RC_STRIDE).filter(p=>f.get(p)===0x0a4d0002&&f.get(p+8)===binding.remoteCar);assert.equal(rc.length,1);const rcp=rc[0];
    return{label,frameId,hostMicroseconds:String(getClockMicroseconds()),nativeTime:{worldTickSigned:f.view.getInt32(8802700,true),worldDt:f32(f,8802644),realTickSigned:f.view.getInt32(8802732,true),realDt:f32(f,8802712),realTimeFrames:f.get(8369928),realTimeFrameTick:f.get(8369932)},
      raw:{R:capture(f,R,96,label+'-native-R'),cars:capture(f,CARS,8*208,label+'-native-car-records'),fps:capture(f,FPS,8*48,label+'-native-peer-FPS'),speed:capture(f,SPEED,8*20,label+'-retained-speed-records'),speedRing:capture(f,rcp+11288,400,label+'-native-remote-speed-ring'),carWriteAggregate:capture(f,MONITOR,16,label+'-native-car-write-aggregate-raw'),nativeClocks:capture(f,8802624,112,label+'-native-clocks')},
      R:{on:f.get(R),host:f.get(R+4),meHex:f.bytes(R+8,16).toString('hex'),t0Microseconds:u64(f,R+24),prevMicroseconds:u64(f,R+32),frames:f.get(R+40),slow:f.get(R+44),longestMicroseconds:u64(f,R+48),windowStartMicroseconds:u64(f,R+56),windowFrames:f.get(R+64),windowSlow:f.get(R+68),windowLongestMicroseconds:u64(f,R+72),carStatesSent:f.get(R+80),carStatesCame:f.get(R+84),carStatesRefused:f.get(R+88),playerListsRefused:f.get(R+92)},
      records,remoteRecords:records.filter(record=>record.car===binding.remoteCar),
      fps:Array.from({length:8},(_,i)=>{const p=FPS+i*48;return{address:p,nameHex:f.bytes(p,16).toString('hex'),samples:f.get(p+16),slow:f.get(p+20),longestMilliseconds:f.get(p+24),sum:f32(f,p+28),low:f32(f,p+32),clockSumMilliseconds:f.view.getFloat64(p+40,true)};}),
      retainedSpeed:Array.from({length:8},(_,i)=>{const p=SPEED+i*20;return{address:p,nameHex:f.bytes(p,16).toString('hex'),maximumKmh:f32(f,p+16)};}),
      remoteSpeed:{Rc:rcp,nameHex:f.bytes(rcp+12,16).toString('hex'),count:f.get(rcp+11672),index:f.get(rcp+11676),epochBytes:f.bytes(rcp+11680,2).toString('hex'),retainedMaximumKmh:f32(f,rcp+11684),namedPublicationGuardSatisfied:f.view.getUint8(rcp+12)!==0,
        senderTimestamps:Array.from({length:48},(_,i)=>({signedMicroseconds:f.view.getInt32(rcp+11288+i*4,true),bits:f.get(rcp+11288+i*4)})),metersPerSecond:Array.from({length:48},(_,i)=>f32(f,rcp+11480+i*4))},
      carWriteAggregate:{address:MONITOR,length:16,interpretation:'Exact native backing copied by21272; bytes remain raw, unknown fields are not labeled.'}};
  }
  function observe({f,marker,cpu,event,activeStage}){
    if(!binding||!frameId||!MARKERS.has(marker.id))return null;assert(!closed);
    const row={line:++journalLine,event,frameId,activeStage,function:marker.id,phase:marker.phase,cpuHex:f.bytes(cpu,344).toString('hex'),hostMicroseconds:String(getClockMicroseconds()),R_on:f.get(R),nativeTime:{worldDt:f32(f,8802644),worldTickSigned:f.view.getInt32(8802700,true),realDt:f32(f,8802712),realTickSigned:f.view.getInt32(8802732,true)},nativeCallAdded:false,guestWritesPerformed:false};
    rows.push(row);fs.writeSync(journalFd,JSON.stringify(row)+'\n');return{file:journalName,line:row.line,event,frameId,function:marker.id,phase:marker.phase};
  }
  function bind({q,legacy,admission}){
    assert(!binding);assert.equal(legacy.complete,true);assert.equal(admission.complete,true);const{f}=q;
    binding={remoteCar:admission.remote.car,remoteController:admission.remote.remoteController,record:legacy.nativeObserverRecord.address,nativeNameHex:legacy.nativeObserverRecord.nameHex,setupObserverCalls:2};
    assert.equal(f.get(binding.record),binding.remoteCar);assert.equal(f.bytes(binding.record+4,16).toString('hex'),binding.nativeNameHex);
    for(const p of Object.values(OUT))q.commit(p,16);
    baseline=snapshot(q,'after-verified-legacy-setup-before-replay');assert.equal(baseline.R.on,1);
    return baseline;
  }
  function afterFrame({q,frameId:actualFrame}){
    assert.equal(actualFrame,frameId);const matching=rows.filter(row=>row.frameId===frameId),counts=Object.fromEntries([...MARKERS].map(id=>[id,Object.fromEntries(['before','after','tail'].map(phase=>[phase,matching.filter(row=>row.function===id&&row.phase===phase).length]))])),state=snapshot(q,'replay-frame'+frameId+'-after-native-World-posthook-and-WorldTimer'),row={frameId,counts,markers:matching.map(item=>({file:journalName,line:item.line,event:item.event,function:item.function,phase:item.phase})),state,complete:false};frames.push(row);
    for(const id of MARKERS){assert.equal(counts[id].before,1,'Exactly one automatic native entry per replay frame');assert.equal(counts[id].after,1,'Exactly one automatic native returned observer per replay frame');assert.equal(counts[id].tail,0);}
    assert.equal(state.R.on,1);assert.equal(state.remoteRecords.length,1);assert.equal(state.remoteRecords[0].nameHex,binding.nativeNameHex,'Preserve actual native published observer identity');row.complete=true;
    row.line=++journalLine;fs.writeSync(journalFd,JSON.stringify({kind:'read-only-post-frame-native-observer-state',...row})+'\n');
    return{frameId,counts,complete:row.complete,stateLine:row.line,remoteRecords:state.remoteRecords,hostMicroseconds:state.hostMicroseconds,nativeTime:state.nativeTime};
  }
  function finish({q,replay}){
    assert(binding);assert(!result);const{f,A}=q;result={complete:false,requestedFrames:192,completedFrames:frames.filter(row=>row.complete).length,binding,baseline,final:snapshot(q,'after-combined-replay'),getters:[],failure:null,
      observerOwnership:'Verified setup retains its two22866 calls;192 replay frames use existing21767post→21907→22866→22828 only, no direct per-frame observer call.',
      limitations:['Single frozen AI trajectory and generic separated scene; only this observed window is covered.','Native R totals include their original setup interval; replay host window is reported separately.','Native RealTimer remains actual warmup output; verified World-only caller uses WorldTimer and host time for the relevant observer metrics.','Rc.name is sampled as native output at every snapshot. It was empty before replay and naturally populated during frame1 in the frozen parent; no name repair or threshold result is supplied.','Car-write aggregate is raw16B only; no classifier/report/online qualification or detector clearance claim.']};
    const fullObservedReplay=replay.complete&&frames.length===192&&frames.every(row=>row.complete);result.gettersSkipped=!fullObservedReplay;
    if(fullObservedReplay){
      for(const[id,out,kind]of[[22812,OUT.speed,'retained-speed-kmh'],[22873,OUT.jump,'retained-jump-metres']]){
        assert(q.metadata.real.includes(id));const observerBefore=Buffer.concat([f.bytes(R,96),f.bytes(CARS,8*208),f.bytes(FPS,8*48),f.bytes(SPEED,8*20)]),cpuBefore=Buffer.from(f.bytes(A.cpu,344)),shadow=f.exports.sp.value,
          row={function:id,signature:'(outName16:i32)->f32',kind,out,callerOutputBefore:capture(f,out,16,kind+'-output-before'),nativeFrameObserverInvoked:false};result.getters.push(row);
        const value=f.exports['f'+id](out),bits=Buffer.alloc(4);bits.writeFloatLE(value);row.result={type:'f32',value:Number.isFinite(value)?value:String(value),bits:bits.readUInt32LE()};row.nativeName=capture(f,out,16,kind+'-native-output-name');row.nativeNameHex=f.bytes(out,16).toString('hex');row.wholeNativeReturned=true;
        assert.equal(f.exports.sp.value,shadow);assert.deepEqual(f.bytes(A.cpu,344),cpuBefore);assert.deepEqual(Buffer.concat([f.bytes(R,96),f.bytes(CARS,8*208),f.bytes(FPS,8*48),f.bytes(SPEED,8*20)]),observerBefore);row.observerHistoriesCountersAndCpuPreserved=true;
      }
    }
    result.replayHostWindow={startMicroseconds:baseline.hostMicroseconds,endMicroseconds:result.final.hostMicroseconds,elapsedMicroseconds:String(BigInt(result.final.hostMicroseconds)-BigInt(baseline.hostMicroseconds)),automaticObserverFrameSamples:frames.length};
    result.complete=replay.complete&&frames.length===192&&frames.every(row=>row.complete)&&result.getters.length===2;return result;
  }
  function finalize(){
    assert(!closed);closed=true;fs.closeSync(rawFd);fs.closeSync(journalFd);
    const receipt={kind:'READ-ONLY-AUTOMATIC-NATIVE-NAMED-OBSERVER-REPLAY',binding,result,frames,markerRows:rows.length,spans,rawSha256:sha(fs.readFileSync(path.join(directory,rawName))),journalSha256:sha(fs.readFileSync(path.join(directory,journalName))),nativeFrameCallsAdded:0,nativeStateOutputsAuthored:false};
    fs.writeFileSync(path.join(directory,'named-observer-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return receipt;
  }
  return{bind,setFrame(value){assert(binding);assert(Number.isInteger(value)&&value>=1&&value<=192);frameId=value;},observe,afterFrame,finish,finalize};
}
module.exports={R,CARS,FPS,SPEED,RC,RC_STRIDE,TABLE,MONITOR,MARKERS,OUT,create};
