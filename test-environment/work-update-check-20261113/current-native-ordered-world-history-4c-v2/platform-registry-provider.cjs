'use strict';
// New bounded diagnostic OS condition. These are source-backed platform import
// semantics, never a guest math/physics return or a substituted initialized body.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const states=new WeakMap();
const IMPORTS=Object.freeze({RegOpenKeyA:{iat:0x78300c,target:0x14fdf08,args:3},RegQueryValueExA:{iat:0x783004,target:0x14fd582,args:6},RegCloseKey:{iat:0x783014,target:0x14fe88e,args:1},IsProcessorFeaturePresent:{iat:0x7831a4,target:0x7c80acb2,args:1}});
const NAMES=new Set(['DisablePSGP','DisableD3DXPSGP']);
function bind(f,{cpu=0x100000,journalPath=path.join(__dirname,'platform-registry-calls.jsonl')}={}){
 let state=states.get(f.memory);if(!state){state={keys:new Map(),free:[],next:1,calls:[],journalPath,storedRegistryEmpty:true};states.set(f.memory,state);}
 const valid=(p,n=4)=>Number.isInteger(p)&&p>=0x10000&&p+n<=Math.min(f.memory.buffer.byteLength,0x28000000);
 const string=p=>{assert(valid(p,1),'Bounded string pointer');let s='';for(let i=0;i<256;i++){assert(valid(p+i,1));const b=f.view.getUint8(p+i);if(!b)return s;s+=String.fromCharCode(b);}throw Error('Unterminated platform string');};
 const finish=(name,sp,before,shadow,result,details)=>{const spec=IMPORTS[name],ra=f.get(sp);f.put(cpu,result);f.put(cpu+32,ra);f.put(cpu+16,sp+4+4*spec.args);const after=Buffer.from(f.bytes(cpu,344));for(const o of[0,16,32])after.copy(before,o,o,o+4);assert.deepEqual(after,before,'Only EAX/ESP/EIP may change at documented platform ABI');assert.equal(f.exports.sp.value,shadow);const row={name,iat:spec.iat,target:spec.target,args:spec.args,returnAddress:ra,beforeEsp:sp,afterEsp:f.get(cpu+16),returnEip:f.get(cpu+32),returnEax:result,otherCpuBytesPreserved:true,wasmShadowStackPointerPreserved:true,...details};state.calls.push(row);if(state.journalPath)fs.appendFileSync(state.journalPath,JSON.stringify(row)+'\n');return result;};
 function invoke(actualCpu,target){assert.equal(actualCpu,cpu);const name=Object.keys(IMPORTS).find(k=>IMPORTS[k].target===target);assert(name,'Unsupported platform target');const spec=IMPORTS[name];assert.equal(f.get(spec.iat),target,'Exact pinned PE IAT binding');const sp=f.get(cpu+16);assert(valid(sp,4+4*spec.args));const args=Array.from({length:spec.args},(_,i)=>f.get(sp+4+i*4)),before=Buffer.from(f.bytes(cpu,344)),shadow=f.exports.sp.value;
  if(name==='RegOpenKeyA'){
   const[root,subkey,out]=args;assert.equal(root,0x80000002,'Only observed HKLM import contract');assert.equal(string(subkey),'Software\\Microsoft\\Direct3D');assert(valid(out));assert(state.next<4096,'Bounded native runtime object table');const slot=state.free.length?state.free.pop():state.next++,handle=0xa00000+slot;assert(!state.keys.has(handle));state.keys.set(handle,{slot,subkey:string(subkey)});f.put(out,handle);return finish(name,sp,before,shadow,0,{root,subkey:string(subkey),out,handle,source:'win32_ext.c1366 obj_new(OB_KEY), fresh source H_BASE+slot and success0'});
  }
  if(name==='RegQueryValueExA'){
   const[handle,nameptr,reserved,ptype,pdata,pcb]=args;assert(state.keys.has(handle),'Query requires owned live key');const valueName=string(nameptr);assert(NAMES.has(valueName),'Only observed absent Direct3D override values');assert.equal(reserved,0);assert(!ptype||valid(ptype));assert(!pdata||valid(pdata));assert(!pcb||valid(pcb));const oldType=ptype?f.get(ptype):null,oldData=pdata?f.get(pdata):null,oldSize=pcb?f.get(pcb):null;if(pcb)f.put(pcb,0);if(ptype)assert.equal(f.get(ptype),oldType);if(pdata)assert.equal(f.get(pdata),oldData);return finish(name,sp,before,shadow,2,{handle,valueName,ptype,pdata,pcb,oldType,oldData,oldSize,newSize:pcb?f.get(pcb):null,source:'win32_ext.c1440..1443 absent unstored/nonbuiltin value: ERROR_FILE_NOT_FOUND2, pcb0 only'});
  }
  if(name==='RegCloseKey'){
   const[handle]=args,key=state.keys.get(handle);assert(key,'Close requires exact owned live key');state.keys.delete(handle);state.free.push(key.slot);return finish(name,sp,before,shadow,0,{handle,source:'win32_ext.c1456 obj_close(OB_KEY), return ERROR_SUCCESS0'});
  }
  const[feature]=args;assert([2,3,6,7,8,10].includes(feature),'Bounded source CPU feature query');const result=[2,3,6,8,10].includes(feature)?1:0;return finish(name,sp,before,shadow,result,{feature,source:'win32.c629..639 source Pentium4 feature profile, NFSU2_PF_ALL absent; PF7 false'});
 }
 return{state,invoke};
}
function install(H){const prior=H.boundary[21833];H.boundary[21833]=(f,cpu,target)=>Object.values(IMPORTS).some(s=>s.target===target)?bind(f,{cpu:H.A.cpu}).invoke(cpu,target):prior(f,cpu,target);}
function receipt(f){const s=states.get(f.memory);return s?{calls:s.calls,liveKeys:s.keys.size,nextObjectSlot:s.next,storedRegistryEmpty:s.storedRegistryEmpty,contract:'Only exact observed Direct3D registry imports and source-defined CPU feature predicate; no stored overrides, math/physics output substitution or broader OS emulation'}:null;}
module.exports={IMPORTS,bind,install,receipt};
