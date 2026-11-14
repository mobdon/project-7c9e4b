'use strict';
// Disclosed timing-only6520 caller subset. No native execution at import.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const MARKERS=new Set([16627,16780,16937,21992,2610,21996,8084]);
function create({directory,getClockMicroseconds,setClockMicroseconds}){
  const rawName='native-realtime-timing-raw.bin',journalName='native-realtime-timing-observations.jsonl',rawFd=fs.openSync(path.join(directory,rawName),'wx'),journalFd=fs.openSync(path.join(directory,journalName),'wx');
  let offset=0,closed=false,active=false,ran=false;const spans=[],rows=[];
  function capture(f,address,length,role){const bytes=Buffer.from(f.bytes(address,length)),span={file:rawName,address,length,offset,sha256:sha(bytes),role};fs.writeSync(rawFd,bytes);offset+=length;spans.push(span);return span;}
  function cpu(f,A){return{raw:capture(f,A.cpu,344,'native-cpu'),eax:f.get(A.cpu),ecx:f.get(A.cpu+4),esp:f.get(A.cpu+16),eip:f.get(A.cpu+32),fpuTop:f.get(A.cpu+136),controlWord:f.view.getUint16(A.cpu+140,true)};}
  function state(f,A,label){return{label,hostMicroseconds:String(getClockMicroseconds()),cpu:cpu(f,A),
    clock:capture(f,8802624,112,label+'-native-clock'),realTimeFrames:capture(f,8369928,24,label+'-native-rtf'),
    frequencyFactor:capture(f,8552488,4,label+'-native-factor'),frequencyShift:capture(f,8553700,4,label+'-native-shift'),
    pacer:capture(f,695660688,256,label+'-native-pacer'),configuration:capture(f,695697376,48,label+'-native-config'),
    values:{realDt:f.view.getFloat32(8802712,true),realDtBits:f.get(8802712),realTick:f.view.getInt32(8802732,true),worldTick:f.view.getInt32(8802700,true),
      tickCount:f.get(8802624),carryBits:f.get(8802628),residualBits:f.get(8802632),frameCount:f.get(8802636),rtf:f.get(8369928),rtfTick:f.get(8369932),
      factor:f.view.getFloat32(8552488,true),factorBits:f.get(8552488),shift:f.get(8553700)}};}
  function observe({f,marker,cpu:cpuAddress,event,activeStage}){
    if(!active||!MARKERS.has(marker.id))return null;assert(!closed);
    const sp=f.get(cpuAddress+16),row={event,activeStage,function:marker.id,phase:marker.phase,cpuHex:f.bytes(cpuAddress,344).toString('hex'),
      esp:sp,stackHex:f.bytes(sp,64).toString('hex'),hostMicroseconds:String(getClockMicroseconds()),nativeCallAdded:false,guestWritesPerformed:false};
    rows.push(row);fs.writeSync(journalFd,JSON.stringify(row)+'\n');return{file:journalName,line:rows.length,function:marker.id,phase:marker.phase,event};
  }
  function run({q,stage,writeJson}){
    assert(!ran);ran=true;active=true;const{f,A}=q;
    const schedule=JSON.parse(fs.readFileSync(path.join(directory,'timing-caller-inputs.json'))),proof={kind:'ORDINARY-NATIVE-REALTIME-TIMING-CALLER-SUBSET',complete:false,
      inputs:schedule,frequencyInitialization:null,steps:[],failure:null,nativeClockDtRateFlagHistoryOrReportOutputsAuthored:false,
      scope:'At most12 declared60Hz host work intervals before unchanged114. Complete native21992 pacing and21996 remain authoritative; this is not a whole6520/World frame.'};
    // Preserve the actual CPU/FPU. Push only ordinary caller return/argument words.
    function call(id,args,returnAddress,label){
      assert(q.metadata.real.includes(id));const outerEsp=f.get(A.cpu+16),entryEsp=outerEsp-4*(args.length+1),shadow=f.exports.sp.value;
      assert(entryEsp>=A.stack-4096&&outerEsp<=A.stack+256,'Bounded existing native guest stack');
      const row={id,label,args,returnAddress,outerEsp,entryEsp,argumentBytes:4*args.length,before:cpu(f,A),returned:false};proof.activeCall=row;
      f.put(entryEsp,returnAddress);args.forEach((v,i)=>f.put(entryEsp+4+i*4,v));f.put(A.cpu+16,entryEsp);
      row.entered=cpu(f,A);row.entryStack=capture(f,entryEsp,Math.max(16,4*(args.length+1)),label+'-entry-stack');
      try{f.exports['f'+id](A.cpu);row.returned=true;row.nativeReturn=cpu(f,A);row.returnStack=capture(f,entryEsp,Math.max(16,4*(args.length+1)),label+'-returned-stack');
        assert.equal(f.exports.sp.value,shadow);assert.equal(f.get(A.cpu+32),returnAddress);assert.equal(f.get(A.cpu+16),entryEsp+4,'PlainRET must be observed before caller cleanup');
        row.nativeCalleeEspAdvance=4;f.put(A.cpu+16,f.get(A.cpu+16)+4*args.length);row.callerCleanupBytes=4*args.length;row.afterCallerCleanup=cpu(f,A);assert.equal(f.get(A.cpu+16),outerEsp);
      }catch(error){row.failure={name:error.name,message:error.message,stack:error.stack};row.atFailure=cpu(f,A);throw error;}
      finally{proof.lastCall=row;delete proof.activeCall;}
      return row;
    }
    let okay=true;
    try{
      assert.equal(schedule.steps.length,12);assert.equal(schedule.frequencyHz,1000000);assert.equal(f.view.getUint16(A.cpu+140,true),0x37f,'Retain actual default native FPU control');
      proof.before=state(f,A,'before-timing-prerequisite');
      okay=stage('native-realtime-whole16627-frequency-initializer',()=>{
        proof.frequencyInitialization={before:state(f,A,'before-whole16627')};
        proof.frequencyInitialization.call=call(16627,[],0x12345678,'whole16627');
        proof.frequencyInitialization.after=state(f,A,'after-whole16627');return proof.frequencyInitialization;
      });
      for(const input of schedule.steps){
        if(!okay)break;const row={input,complete:false};proof.steps.push(row);
        okay=stage('native-realtime-timing-only-input-step'+input.frameId,()=>{
          row.before=state(f,A,'step'+input.frameId+'-before');
          row.previousSampleCall=call(16780,[],0x5811d2,'step'+input.frameId+'-previous16780');row.previousSample=row.previousSampleCall.nativeReturn.eax;
          const hostBefore=getClockMicroseconds(),scheduled=BigInt(input.hostMicroseconds),effective=scheduled>hostBefore?scheduled:hostBefore;
          setClockMicroseconds(effective);assert.equal(getClockMicroseconds(),effective);
          row.platformInput={scheduledMicroseconds:String(scheduled),beforeMicroseconds:String(hostBefore),effectiveMicroseconds:String(effective),monotonicAdvanceMicroseconds:String(effective-hostBefore),nativePacingAdvanceRetained:hostBefore>scheduled};
          row.currentSampleCall=call(16780,[],0x5812da,'step'+input.frameId+'-current16780');row.currentSample=row.currentSampleCall.nativeReturn.eax;
          row.elapsedCall=call(16937,[row.previousSample,row.currentSample],0x5812e1,'step'+input.frameId+'-elapsed16937');
          const top=f.get(A.cpu+136)&7,st0Address=A.cpu+72+8*top,st0Bytes=Buffer.from(f.bytes(st0Address,8)),elapsed=f.view.getFloat64(st0Address,true),control=f.view.getUint16(A.cpu+140,true),constantBits=f.get(7881564),constant=f.view.getFloat32(7881564,true);
          row.elapsed={top,st0Address,rawHex:st0Bytes.toString('hex'),valueMilliseconds:elapsed,controlWord:control,constantAddress:7881564,constantBits,constant};
          assert.equal(control,0x37f);assert.equal(constantBits,981668463);assert(Number.isFinite(elapsed));
          const product=elapsed*constant,value=Math.fround(product),argument=Buffer.alloc(4);argument.writeFloatLE(value);assert(Number.isFinite(product)&&Number.isFinite(value));
          // Actual6520 FMUL/FSTP: store the f32 argument and pop TOP; consumed physicalST0 remains unchanged.
          f.put(A.cpu+136,(top+1)&7);assert.deepEqual(f.bytes(st0Address,8),st0Bytes);
          row.callerConversion={productF64:product,argumentF32:value,argumentBits:argument.readUInt32LE(),topBefore:top,topAfter:(top+1)&7,physicalSt0Unchanged:true,
            modeledNormalCallerOnly:true,nativeFpuControlAssigned:false};
          row.frameTimeCall=call(21992,[argument.readUInt32LE()],0x5812f2,'step'+input.frameId+'-whole21992');
          row.afterFrameTime=state(f,A,'step'+input.frameId+'-after21992');
          row.realTimerCall=call(21996,[],0x5814ea,'step'+input.frameId+'-whole21996');
          row.afterRealTimer=state(f,A,'step'+input.frameId+'-after21996');row.complete=true;return row;
        });
      }
      proof.complete=okay&&proof.steps.length===12&&proof.steps.every(row=>row.complete);
    }catch(error){proof.failure={name:error.name,message:error.message,stack:error.stack};proof.complete=false;}
    finally{proof.after=state(f,A,'after-timing-prerequisite');proof.stageFailureRetained=!okay;proof.markerRows=rows.length;proof.spans=spans;writeJson('native-realtime-timing-receipt.json',proof);active=false;}
    return proof;
  }
  function finalize(){assert(!closed);closed=true;fs.closeSync(rawFd);fs.closeSync(journalFd);return{rawSha256:sha(fs.readFileSync(path.join(directory,rawName))),journalSha256:sha(fs.readFileSync(path.join(directory,journalName))),rows:rows.length,spans};}
  return{run,observe,finalize};
}
module.exports={MARKERS,create};
