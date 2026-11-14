'use strict';
// Disclosed offline native serializer/decoder API loopback. Definitions only.
// Caller inputs are names, owned bitstream storage, and an explicit event time.
// Every car, controller, serialized state, cursor and observer/report output is native.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const GLOBAL = 9031496, TABLE = 9031504, R = 703598208, RECORDS = 703604128;
const INPUT = { localName: 0x6500000, remoteName: 0x6500020, stream: 0x6501000, maximumName: 0x6502000 };
const MARKERS = new Set([286,18108,2456,114,10600,17637,10443,17795,22840,22866]);
const RAW_MARKERS = new Set([10600,10443,17795,22840,22866]);

function create({directory}) {
  const rawName = 'native-legacy-enrollment-raw.bin', journalName = 'native-legacy-enrollment-observations.jsonl';
  const rawFd = fs.openSync(path.join(directory, rawName), 'wx');
  const journalFd = fs.openSync(path.join(directory, journalName), 'wx');
  let offset = 0, binding = null, closed = false, earlyReportAttempt = null;
  const rows = [], spans = [];
  function capture(f,address,length,role) {
    const bytes = Buffer.from(f.bytes(address,length));
    const span = {file:rawName,address,length,offset,sha256:sha(bytes),role};
    fs.writeSync(rawFd,bytes); offset += length; spans.push(span); return span;
  }
  function snapshot(f,role) {
    assert(binding);
    return {
      remoteCar:capture(f,binding.remote.car,2528,role+'-remote-car'),
      remoteController:capture(f,binding.remote.remoteController,576,role+'-remote-controller'),
      raceObserver:capture(f,R,96,role+'-R'),
      observerRecords:capture(f,RECORDS,8*208,role+'-records'),
      nativeClock:capture(f,8802640,112,role+'-clock'),
      nativeSession:capture(f,GLOBAL,40,role+'-session'),
      values:{on:f.get(R),worldTickSigned:f.view.getInt32(8802700,true),realTickSigned:f.view.getInt32(8802732,true),
        legacyAcceptedCount:f.get(binding.remote.remoteController+396),
        client:f.get(8808948),host:f.get(8808968),session:f.get(GLOBAL),gameMode:f.view.getUint16(8716408,true)}
    };
  }
  function observe({f,marker,cpu,event,activeStage,hookParameter0}) {
    if (!binding || !MARKERS.has(marker.id)) return null;
    assert(!closed);
    const sp=f.get(cpu+16), row={event,activeStage,function:marker.id,phase:marker.phase,
      hookParameter0,typedResultExposed:false,guestWritesPerformed:false,nativeCallAdded:false,
      cpu:{eax:f.get(cpu),ecx:f.get(cpu+4),esp:sp,eip:f.get(cpu+32)},
      stackHex:f.bytes(sp,64).toString('hex')};
    if(RAW_MARKERS.has(marker.id))row.raw=snapshot(f,marker.id+'-'+marker.phase+'-event'+event);
    rows.push(row);fs.writeSync(journalFd,JSON.stringify(row)+'\n');
    return {file:journalName,line:rows.length,function:marker.id,phase:marker.phase,event};
  }
  function reportAvailability({q,stage,writeJson,enrollment,admission}) {
    const {f}=q;
    assert(!binding);assert(!earlyReportAttempt);assert.equal(enrollment.completed,true);assert.equal(admission.complete,true);
    binding={remote:enrollment.state.enrollment.remote,local:enrollment.state.enrollment.local};
    return stage('native-legacy-whole-hub-report23139-natural-availability',()=>{
        const before={lobbyId:f.get(706643224),racePointer:f.get(706643232),context:capture(f,706643224,64,'native-hub-report-context-before')},shadow=f.exports.sp.value;
        f.exports.f23139();assert.equal(f.exports.sp.value,shadow);
        earlyReportAttempt={function:23139,signature:'()->void',wholeNativeReturned:true,before,
          after:{lobbyId:f.get(706643224),racePointer:f.get(706643232),context:capture(f,706643224,64,'native-hub-report-context-after')},
          initialGuardUnavailable:before.lobbyId===0||before.racePointer===0,
          claim:'Whole ordinary producer invoked with actual native context. Initial zero lobby/race guard means natural no report; no synthetic context/body/annotation is supplied. Online rank annotation is a separate unexecuted family.'};
        writeJson('native-hub-report-availability.json',earlyReportAttempt);
        return earlyReportAttempt;
      });
  }
  function run({q,stage,abi,writeJson,enrollment,admission,beforeScheduler}) {
    const {f,A}=q;
    assert(binding);assert(earlyReportAttempt?.wholeNativeReturned);
    assert.equal(enrollment.completed,true);assert.equal(admission.complete,true);
    assert.equal(binding.remote.car,enrollment.state.enrollment.remote.car);
    assert.equal(binding.local.car,enrollment.state.enrollment.local.car);
    const proof={kind:'OFFLINE-NATIVE-LEGACY-SERIALIZER-DECODER-API-LOOPBACK',complete:false,
      interpretation:'One real remote car serialized and decoded back through ordinary native per-car/session APIs; no actual sender, datagram, full CARSPAM header, or normal17623 sender claim.',
      names:[],observerBegin:null,timingPrerequisite:null,bitstream:null,scheduler:null,writer:null,timestamp:null,receiver:null,observerAfter:null,
      retainedMaximum:null,retainedMaximumExcludedFromUnit:true,hubReportAttempt:earlyReportAttempt,unavailable:null,failure:null,
      nativeCarControllerHistoryNameRecordOrReportOutputsAuthored:false};
    let okay=true;
    const stop=(at,reason)=>{proof.unavailable={at,reason,nativeGuardPreserved:true};return false;};
    const extensionObserver=label=>{
      const before=snapshot(f,label+'-before'),cpuBefore=f.bytes(A.cpu,344).toString('hex'),shadowBefore=f.exports.sp.value;
      // Native racenet_frame(CPU*) is a host extension API. It has no guest RET.
      f.exports.f22866(A.cpu);
      assert.equal(f.exports.sp.value,shadowBefore);
      return {function:22866,argument:A.cpu,wholeNativeReturned:true,guestRetExpected:false,
        cpuBefore,cpuAfter:f.bytes(A.cpu,344).toString('hex'),before,after:snapshot(f,label+'-after')};
    };
    try {
      for(const id of MARKERS)assert(q.metadata.real.includes(id),'Retain original native'+id);
      for(const id of [23139])assert(q.metadata.real.includes(id));
      for(const [p,n]of [[INPUT.localName,16],[INPUT.remoteName,16],[INPUT.stream,1033],[INPUT.maximumName,16]])q.commit(p,n);
      okay=stage('native-legacy-register-declared-names286',()=>{
        assert.equal(f.get(8802220),0,'Preserve actual LAN/alternate native name branch');
        for(const spec of [{slot:0,flag:1,name:'Fixture-Local',address:INPUT.localName},{slot:1,flag:0,name:'Fixture-Remote',address:INPUT.remoteName}]) {
          const input=Buffer.alloc(16);input.write(spec.name,'ascii');
          new Uint8Array(f.memory.buffer,spec.address,16).set(input);
          const before={pointer:f.get(TABLE+spec.slot*4),count:f.view.getUint8(GLOBAL+32),nameBranch:f.get(8802220)},
            callerInput=capture(f,spec.address,16,'declared-'+spec.name+'-caller-input'),result=q.rawCall(286,GLOBAL,[spec.slot,0,spec.flag,spec.address]);
          abi(20);
          const pointer=f.get(TABLE+spec.slot*4);
          assert(pointer);
          const actual=Buffer.from(f.bytes(pointer+18,16));
          proof.names.push({...spec,before,callerInput,...result,wholeNativeReturned:true,pointer,
            nativeObject:capture(f,pointer,648,'native-NetPlayer-slot'+spec.slot),actualNameHex:actual.toString('hex')});
          assert.equal(f.view.getUint8(pointer+4),spec.slot);
          assert.equal(f.view.getUint8(pointer+16),spec.flag);
          assert.deepEqual(actual,input,'Whole286/18108 must publish the actual caller-input name');
        }
        return proof.names;
      });
      if(okay)okay=stage('native-legacy-whole-observer22866-begin',()=>{
        proof.observerBegin=extensionObserver('initial-native-observer');return proof.observerBegin;
      });
      if(okay&&f.get(R)!==1)okay=stop('observer-begin','Whole22866 did not naturally enable R.on under the existing World/race inputs.');
      if(okay&&beforeScheduler){proof.timingPrerequisite=beforeScheduler();if(!proof.timingPrerequisite.complete)okay=stop('native-timing-prerequisite','Actual timing-only native caller subset did not complete; preserve its partial outputs and skip unchanged114.');}
      if(okay)okay=stage('native-legacy-bitstream2456-and-scheduler114',()=>{
        const before=capture(f,INPUT.stream,1033,'owned-bitstream-before-native-constructor'),constructor=q.rawCall(2456,INPUT.stream);abi(4);
        proof.bitstream={address:INPUT.stream,bytes:1033,before,constructor,afterConstructor:capture(f,INPUT.stream,1033,'native-bitstream-after2456')};
        assert.equal(f.get(INPUT.stream+1024),0);assert.equal(f.get(INPUT.stream+1028),0);
        const timingBefore=capture(f,8818804,16,'scheduler-native-last-times-before'),clockBefore={realTickSigned:f.view.getInt32(8802732,true),rates:Array.from({length:4},(_,i)=>f.get(8371816+i*4))},result=q.rawCall(114,0);abi(4);
        proof.scheduler={...result,flags:result.eax,timingBefore,clockBefore,timingAfter:capture(f,8818804,16,'scheduler-native-last-times-after'),actualNativeFlags:true};
        assert.equal(result.eax&~15,0);return{bitstream:proof.bitstream,scheduler:proof.scheduler};
      });
      if(okay&&proof.scheduler.flags===0)okay=stop('scheduler114','Actual native scheduler returned zero; no empty-body enrollment is attempted.');
      if(okay)okay=stage('native-legacy-whole-writer10600-actual-remote-slot',()=>{
        const controller=f.get(binding.remote.car+2328),vtable=f.get(controller),dispatch=f.get(vtable+4),
          before=snapshot(f,'before-whole10600');
        assert.equal(controller,binding.remote.remoteController);assert.equal(vtable,0x7a63d8);assert.equal(dispatch,0x5fcd60);
        const result=q.rawCall(10600,GLOBAL,[1,INPUT.stream,proof.scheduler.flags]);abi(16);
        proof.writer={function:10600,receiver:GLOBAL,arguments:[1,INPUT.stream,proof.scheduler.flags],...result,wholeNativeReturned:true,
          controller,vtable,dispatch,before,after:snapshot(f,'after-whole10600'),writtenBits:f.get(INPUT.stream+1024),readBits:f.get(INPUT.stream+1028),
          nativeBitstream:capture(f,INPUT.stream,1033,'native-serialized-legacy-body')};
        assert.equal(proof.writer.readBits,0,'Native writer leaves independent native read cursor untouched');
        assert(proof.writer.writtenBits<=8192);return proof.writer;
      });
      if(okay&&proof.writer.writtenBits===0)okay=stop('writer10600','Whole10600 retained its native guards and produced no body.');
      if(okay)okay=stage('native-legacy-whole-receiver10443-actual-remote-slot',()=>{
        const clock=f.view.getInt32(8802700,true),scale=f.view.getFloat32(7881320,true),value=Math.fround(clock*scale),tmp=Buffer.alloc(4);tmp.writeFloatLE(value);
        assert(Number.isFinite(value));
        proof.timestamp={kind:'declared-ordinary-API-caller-event-time',clockAddress:8802700,signedClock:clock,scaleAddress:7881320,scaleBits:f.get(7881320),scale,
          value,bits:tmp.readUInt32LE(),derivation:'f32(signed actual WorldTimer * original native f32 scale), matching normal17623 arithmetic under default FPU rounding.',
          nativeSenderOutputClaimed:false,capturedSenderTimeClaimed:false,nativeClockWritten:false};
        const before=snapshot(f,'before-whole10443'),result=q.rawCall(10443,GLOBAL,[1,INPUT.stream,proof.timestamp.bits,proof.scheduler.flags]);abi(20);
        proof.receiver={function:10443,receiver:GLOBAL,arguments:[1,INPUT.stream,proof.timestamp.bits,proof.scheduler.flags],...result,wholeNativeReturned:true,before,
          after:snapshot(f,'after-whole10443'),writtenBits:f.get(INPUT.stream+1024),readBits:f.get(INPUT.stream+1028),
          nativeBitstream:capture(f,INPUT.stream,1033,'native-legacy-body-after-reader')};
        return proof.receiver;
      });
      if(okay) {
        const records=Array.from({length:8},(_,i)=>RECORDS+i*208).filter(p=>f.get(p)===binding.remote.car);
        if(records.length!==1)okay=stop('enrollment22840','Whole native receiver did not produce exactly one record for the real remote car.');
        else {
          proof.nativeObserverRecord={address:records[0],raw:capture(f,records[0],208,'native-enrolled-observer-record'),
            nameHex:f.bytes(records[0]+4,16).toString('hex')};
          const published=Buffer.from(f.bytes(f.get(TABLE+4)+18,16)),expected=Buffer.alloc(16);published.copy(expected,0,0,15);
          assert.deepEqual(f.bytes(records[0]+4,16),expected,'Native name reader must copy the actual published remote name');
          assert.equal(proof.receiver.readBits,proof.writer.writtenBits,'Whole native decoder consumes the native body exactly');
          assert.equal(proof.receiver.after.values.legacyAcceptedCount,proof.receiver.before.values.legacyAcceptedCount+1);
          proof.complete=true;
        }
      }
      if(okay)okay=stage('native-legacy-whole-observer22866-after-enrollment',()=>{
        proof.observerAfter=extensionObserver('after-native-legacy-enrollment');
        return{observer:proof.observerAfter,retainedMaximumExcludedFromUnit:true};
      });
      proof.complete=proof.complete&&okay;
    } catch(error) {
      proof.complete=false;proof.failure={name:error.name,message:error.message,stack:error.stack};
    } finally {
      proof.after=snapshot(f,'final-native-legacy-unit');
      proof.markerJournal=journalName;proof.markerRows=rows.length;
      proof.markers=Object.fromEntries([...MARKERS].map(id=>[id,Object.fromEntries(['before','after','tail'].map(phase=>[phase,rows.filter(r=>r.function===id&&r.phase===phase).length]))]));
      proof.spans=spans;proof.nativeExecutedByThisModuleOnlyWhenRootInvokesRun=true;
      proof.limits=['Disclosed serializer/decoder loopback is separate from network admission and actual sender capture.','One post-enrollment whole observer call only; no movement residual, detector clearance, report emission, or Online rank carriage claim.','Timestamp is explicit API caller input derived from actual native clock/scale, not a native sender output.','All native guards, actual names, cursors, counts and outputs are retained; no repairs.'];
      writeJson('native-legacy-enrollment-receipt.json',proof);
    }
    return proof;
  }
  function finalize() {
    assert(!closed);closed=true;fs.closeSync(rawFd);fs.closeSync(journalFd);
    return {rawSha256:sha(fs.readFileSync(path.join(directory,rawName))),journalSha256:sha(fs.readFileSync(path.join(directory,journalName))),rows:rows.length,spans};
  }
  return {observe,reportAvailability,run,finalize};
}
module.exports={GLOBAL,TABLE,R,RECORDS,INPUT,MARKERS,create};
