'use strict';
// Exact Win32 platform input used by the original16627 initializer. Definitions only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const IMPORT=Object.freeze({name:'QueryPerformanceFrequency',iat:7876888,target:2088916698,frequencyHz:1000000,returnAddress:4439454});
const states=new WeakMap();
function invoke(f,cpu,target,{expectedCpu,directory}){
  assert.equal(cpu,expectedCpu);assert.equal(target,IMPORT.target);assert.equal(f.get(IMPORT.iat),target);
  const sp=f.get(cpu+16),out=f.get(sp+4),ra=f.get(sp);
  assert.equal(ra,IMPORT.returnAddress,'Original16627 QPF call site only');
  assert.equal(out,sp+8,'Original16627 owns this exact local8B output');
  assert(sp>=0x10000&&out+8<=f.memory.buffer.byteLength);
  const before=Buffer.from(f.bytes(cpu,344)),argumentsBefore=Buffer.from(f.bytes(sp,8)),outBefore=f.bytes(out,8).toString('hex'),shadow=f.exports.sp.value,shadowBytes=Buffer.from(f.bytes(shadow,64));
  f.view.setBigInt64(out,BigInt(IMPORT.frequencyHz),true);
  f.put(cpu,1);f.put(cpu+16,sp+8);f.put(cpu+32,ra);
  const after=Buffer.from(f.bytes(cpu,344));for(const o of[0,16,32])after.copy(before,o,o,o+4);
  assert.deepEqual(after,before);assert.deepEqual(f.bytes(sp,8),argumentsBefore);
  assert.equal(f.exports.sp.value,shadow);assert.deepEqual(f.bytes(shadow,64),shadowBytes);
  const row={...IMPORT,cpu,out,outBefore,outAfter:f.bytes(out,8).toString('hex'),beforeEsp:sp,afterEsp:sp+8,returnEip:ra,returnEax:1,
    abi:'stdcall one output-pointer argument; native API return/argument pop8B',otherCpuReturnAndArgumentWordsAndShadowStackPreserved:true,
    platformInputOnly:true,nativeFrequencyFactorShiftOrTimerWritten:false};
  let calls=states.get(f.memory);if(!calls){calls=[];states.set(f.memory,calls);}calls.push(row);
  fs.appendFileSync(path.join(directory,'platform-performance-frequency-calls.jsonl'),JSON.stringify(row)+'\n');return 1;
}
function install(H,{directory}){const prior=H.boundary[21833];H.boundary[21833]=(f,cpu,target)=>target===IMPORT.target?invoke(f,cpu,target,{expectedCpu:H.A.cpu,directory}):prior(f,cpu,target);}
function receipt(f){return{import:IMPORT,calls:states.get(f.memory)||[],scope:'Declared1MHz QPF input is coherent with existing microsecond QPC and WASI monotonic nanoseconds; original16627 owns factor/shift outputs.'};}
module.exports={IMPORT,install,receipt};
