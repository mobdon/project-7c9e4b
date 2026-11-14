'use strict';
// Source-backed WASI poll_oneoff CLOCK boundary. The native pacer/sleep/GIL path
// owns subscriptions and outcomes; this supplies only the declared host wait.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const states=new WeakMap();
function stateFor(f){let state=states.get(f.memory);if(!state){state={calls:[],clockCalls:[],blockedMicroseconds:0n};states.set(f.memory,state);}return state;}
function install(H,{directory,getClockMicroseconds,setClockMicroseconds}){
  assert(!H.boundary[33],'Fresh exact WASI33 boundary only');
  for(const id of[2,7]){
    assert(!H.boundary[id],'Fresh source-backed typed clock shim only');
    H.boundary[id]=f=>{
      const state=stateFor(f),microseconds=id===2?getClockMicroseconds():state.blockedMicroseconds;
      assert(microseconds>=0n&&microseconds<=0xffffffffn,'Typed shim conversion must remain exact unsigned32 microseconds; never wrap');
      const row={api:id===2?'nfsu2_now_ms':'nfsu2_blocked_ms',originalSignature:'()->f64',recorderMicroseconds:String(microseconds),
        originalTypedResultMilliseconds:Number(microseconds)/1000,shim:'exact f64.convert_i32_u /1000.0',guestWritesPerformed:false};
      state.clockCalls.push(row);fs.appendFileSync(path.join(directory,'platform-timing-clock-calls.jsonl'),JSON.stringify(row)+'\n');return Number(microseconds);
    };
  }
  H.boundary[33]=(f,input,output,count,eventsOut)=>{
    const state=stateFor(f),calls=state.calls;
    const row={api:'wasi_snapshot_preview1.poll_oneoff',input,output,count,eventsOut,returned:false};calls.push(row);
    try{
      assert.equal(count,1,'Original24559 single clock subscription only');assert(calls.length<=12,'At most12 native waits in12 timing steps');
      for(const[p,n]of[[input,48],[output,32],[eventsOut,4]])assert(Number.isInteger(p)&&p>=0x10000&&p+n<=f.memory.buffer.byteLength);
      row.subscriptionHex=f.bytes(input,48).toString('hex');row.outputBeforeHex=f.bytes(output,32).toString('hex');row.eventsOutBefore=f.get(eventsOut);
      const tag=f.view.getUint8(input+8),clockId=f.get(input+16),timeout=f.view.getBigUint64(input+24,true),precision=f.view.getBigUint64(input+32,true),flags=f.view.getUint16(input+40,true);
      row.subscription={userdataHex:f.bytes(input,8).toString('hex'),tag,clockId,timeoutNanoseconds:String(timeout),precisionNanoseconds:String(precision),flags};
      assert.equal(tag,0);assert.equal(clockId,0,'Original24560 uses native realtime clockID0 for relative wait');assert.equal(flags,0);assert.equal(precision,0n);
      assert(timeout<=100000000n,'Bounded native pacer wait at most100ms');
      const before=getClockMicroseconds(),advance=(timeout+999n)/1000n;setClockMicroseconds(before+advance);
      assert.equal(getClockMicroseconds(),before+advance);
      state.blockedMicroseconds+=advance;
      // The source game-worker host writes these event fields only; retain padding.
      f.put(output,f.get(input));f.put(output+4,f.get(input+4));f.view.setUint16(output+8,0,true);f.view.setUint8(output+10,tag);f.put(eventsOut,1);
      assert.equal(f.bytes(input,48).toString('hex'),row.subscriptionHex);
      row.hostWait={beforeMicroseconds:String(before),advanceMicroseconds:String(advance),afterMicroseconds:String(getClockMicroseconds()),accumulatedBlockedMicroseconds:String(state.blockedMicroseconds),
        timerQuantizationNanoseconds:String(advance*1000n-timeout),policy:'Integer-microsecond fixture platform timer rounds each exact native requested duration upward by less than1us; no native clock/tick output is written.'};
      row.outputAfterHex=f.bytes(output,32).toString('hex');row.eventsOutAfter=f.get(eventsOut);row.actualResult=0;row.returned=true;return 0;
    }catch(error){row.failure={name:error.name,message:error.message,stack:error.stack};throw error;}
    finally{fs.appendFileSync(path.join(directory,'platform-timing-poll-calls.jsonl'),JSON.stringify(row)+'\n');}
  };
}
function receipt(f){const state=stateFor(f);return{calls:state.calls,clockCalls:state.clockCalls,accumulatedBlockedMicroseconds:String(state.blockedMicroseconds),scope:'Exact typed now_ms and actual accumulated fixture waits in blocked_ms; only native single relative realtime CLOCK subscription: stride48, event32, copied userdata/error0/typeCLOCK, one event and return0. Host clock/wait only; no native pacer/mode/GIL/timer output is supplied.'};}
module.exports={install,receipt};
