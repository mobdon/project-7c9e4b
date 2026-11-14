'use strict';
// Offline OS memory-query boundary only. Importing this file never creates
// game memory, calls native code, commits pages, or changes queried storage.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const CONTRACT_PATH=path.join(ROOT,'work-online-v0427/extension-movement/native/guest-crt-startup-source-review-v1/platform-resolution-review.json');
const CONTRACT_SHA='25bb6ab0fc3d35df1185c0b82f96e6351ba5a8bd1137ee88898b948bd561e741',PE_SHA='f9dd86c054878ce6276beb07c1fd61874f7a1e4bf1f241b084c65b73e24168a7';
const contractBytes=fs.readFileSync(CONTRACT_PATH),contract=JSON.parse(contractBytes),pe=fs.readFileSync(path.join(ROOT,'research/current-native-image/SPEED2.EXE'));
assert.equal(sha(contractBytes),CONTRACT_SHA);assert.equal(sha(pe),PE_SHA);assert.equal(contract.peSha256,PE_SHA);assert.equal(contract.imports.length,252);
const GUEST_END=0x28000000,PAGE_BYTES=0x4000,BITMAP_BASE=697848352,DISPATCHER=21833,CPU_BYTES=344;
const IMPORTS=Object.freeze({IsBadReadPtr:Object.freeze({iat:0x783110,target:0x7c809eb3,args:2,access:'read'}),IsBadWritePtr:Object.freeze({iat:0x78310c,target:0x7c809f29,args:2,access:'write'})});
for(const[name,spec]of Object.entries(IMPORTS)){const row=contract.imports.find(r=>r.dll==='kernel32.dll'&&r.name===name);assert(row);assert.equal(row.iat,spec.iat);assert.equal(row.target,spec.target);}

function parsePePermissions(bytes){
 assert(Buffer.isBuffer(bytes));assert.equal(bytes.readUInt16LE(0),0x5a4d);const nt=bytes.readUInt32LE(60);assert.equal(bytes.readUInt32LE(nt),0x4550);const coff=nt+4,opt=coff+20;assert.equal(bytes.readUInt16LE(opt),0x10b);
 const base=bytes.readUInt32LE(opt+28),alignment=bytes.readUInt32LE(opt+32),imageEnd=base+bytes.readUInt32LE(opt+56),headerEnd=base+bytes.readUInt32LE(opt+60),sections=[];assert(alignment>0);assert(base<headerEnd&&headerEnd<=imageEnd&&imageEnd<=GUEST_END);
 for(let i=0;i<bytes.readUInt16LE(coff+2);i++){const at=opt+bytes.readUInt16LE(coff+16)+40*i,va=base+bytes.readUInt32LE(at+12),size=Math.max(bytes.readUInt32LE(at+8),bytes.readUInt32LE(at+16)),characteristics=bytes.readUInt32LE(at+36),end=va+Math.ceil(size/alignment)*alignment;assert(va>=headerEnd&&end<=imageEnd);sections.push(Object.freeze({name:bytes.subarray(at,at+8).toString('ascii').replace(/\0/g,''),start:va,end,characteristics,read:!!(characteristics&0x40000000),write:!!(characteristics&0x80000000)}));}
 sections.sort((a,b)=>a.start-b.start);for(let i=1;i<sections.length;i++)assert(sections[i-1].end<=sections[i].start,'PE permission sections overlap');
 return Object.freeze({base,headerEnd,imageEnd,sections:Object.freeze(sections)});
}
const PE_PERMISSIONS=parsePePermissions(pe);
const inputScope=Object.freeze({kind:'offline-committed-guest-range-memory-query',sourceContractSha256:CONTRACT_SHA,peSha256:PE_SHA,guestEndExclusive:GUEST_END,pageBytes:PAGE_BYTES,bitmapBase:BITMAP_BASE,dispatcher:DISPATCHER,imports:IMPORTS,pePermissions:PE_PERMISSIONS,permissionModel:'Every requested16KiBguest page must already be committed in current bitmap. PE headers are read-only; PE section pages use pinned IMAGE_SCN_MEM_READ/WRITE bits; PE image gaps deny access. Committed non-PE guest fixture pages are modeled read/write. No page or permission is created/modified by this provider.',limitations:['This is an explicit single-thread offline fixture permission model, not a host pointer probe or a substitute for a complete Win32 virtual-memory implementation.','The harness copies PE sections without necessarily committing every PE page. Such pages returnbad until the loader/setup genuinely commits them; this provider never sets commit bits.','No real concurrent protection changes, guard pages, mapped OS modules, exception side effects or query-result caching are modeled. All other OS imports stay with the prior boundary.']});

function permissionAt(address,model){
 if(address<model.base)return{end:model.base,read:true,write:true,source:'committed-fixture'};
 if(address<model.headerEnd)return{end:model.headerEnd,read:true,write:false,source:'PE-headers'};
 if(address>=model.imageEnd)return{end:GUEST_END,read:true,write:true,source:'committed-fixture'};
 for(const s of model.sections){if(address<s.start)return{end:s.start,read:false,write:false,source:'PE-image-gap'};if(address<s.end)return{end:s.end,read:s.read,write:s.write,source:'PE-section:'+s.name,characteristics:s.characteristics};}
 return{end:model.imageEnd,read:false,write:false,source:'PE-image-gap'};
}
function checkRange({pointer,count,access,readBitmapByte,availableBytes=GUEST_END,permissions=PE_PERMISSIONS}){
 assert(access==='read'||access==='write');assert.equal(typeof readBitmapByte,'function');const row={pointer,count,access,endExclusive:null,permissions:[],pages:[],result:1,reason:null};
 const finish=(result,reason)=>({...row,result,reason});
 if(!Number.isInteger(count)||count<0||count>0xffffffff)return finish(1,'invalid-u32-size');
 if(count===0)return finish(0,'zero-size');
 if(!Number.isInteger(pointer)||pointer<0||pointer>0xffffffff)return finish(1,'invalid-u32-pointer');
 const end=pointer+count;row.endExclusive=end;if(pointer===0)return finish(1,'null-pointer');if(end>0x100000000)return finish(1,'u32-range-overflow');if(pointer>=GUEST_END||end>GUEST_END)return finish(1,'outside-guest-range');if(end>availableBytes)return finish(1,'outside-fixture-buffer');
 for(let at=pointer;at<end;){const p=permissionAt(at,permissions),until=Math.min(end,p.end);assert(until>at);row.permissions.push({start:at,endExclusive:until,source:p.source,read:p.read,write:p.write,...(p.characteristics===undefined?{}:{characteristics:p.characteristics})});if(!p[access])return finish(1,'permission-denied');at=until;}
 for(let page=Math.floor(pointer/PAGE_BYTES)*PAGE_BYTES;page<end;page+=PAGE_BYTES){const index=Math.floor(page/0x20000),mask=1<<((page>>>14)&7),value=readBitmapByte(index);assert(Number.isInteger(value)&&value>=0&&value<=255,'Unavailable/invalid commit bitmap byte');const committed=!!(value&mask);row.pages.push({pageStart:page,bitmapAddress:BITMAP_BASE+index,mask,value,committed});if(!committed)return finish(1,'uncommitted-page');}
 return finish(0,'all-requested-bytes-permitted-and-committed');
}

const states=new WeakMap();
function bind(f,{cpu=0x100000,journalPath=path.join(__dirname,'memory-query-calls.jsonl')}={}){
 let state=states.get(f.memory);if(!state){state={cpu,journalPath,calls:[]};states.set(f.memory,state);}assert.equal(state.cpu,cpu);
 function invoke(actualCpu,target){
  assert.equal(actualCpu,cpu);const name=Object.keys(IMPORTS).find(n=>IMPORTS[n].target===target);assert(name,'Unrecognized memory-query import');const spec=IMPORTS[name];assert.equal(f.get(spec.iat),target,'Exact pinned PE memory-query IAT binding');
  const sp=f.get(cpu+16),shadow=f.exports.sp.value;assert(sp>=0x10000&&sp+32<=f.memory.buffer.byteLength);assert(cpu>=0&&cpu+CPU_BYTES<=f.memory.buffer.byteLength);assert(shadow>=0&&shadow+64<=f.memory.buffer.byteLength);
  const before=Buffer.from(f.bytes(cpu,CPU_BYTES)),stack=Buffer.from(f.bytes(sp,32)),shadowBytes=Buffer.from(f.bytes(shadow,64)),ra=f.get(sp),args=[f.get(sp+4),f.get(sp+8)];
  const query=checkRange({pointer:args[0],count:args[1],access:spec.access,availableBytes:Math.min(GUEST_END,f.memory.buffer.byteLength),readBitmapByte:index=>f.bytes(BITMAP_BASE+index,1)[0]});
  f.put(cpu,query.result);f.put(cpu+16,sp+12);f.put(cpu+32,ra);
  const after=Buffer.from(f.bytes(cpu,CPU_BYTES));for(let at=0;at<CPU_BYTES;at++)if(![0,16,32].some(o=>at>=o&&at<o+4))assert.equal(after[at],before[at],'Memory-query clobbered otherCPU byte'+at);
  assert.deepEqual(f.bytes(sp,32),stack);assert.equal(f.exports.sp.value,shadow);assert.deepEqual(f.bytes(shadow,64),shadowBytes);
  const row={name,iat:spec.iat,target,args,query,cpu,beforeEsp:sp,afterEsp:sp+12,returnEip:ra,returnEax:query.result,otherCpuAndGuestStacksPreserved:true,onlyWrites:[cpu,cpu+16,cpu+32],sourceContractSha256:CONTRACT_SHA};state.calls.push(row);if(state.journalPath)fs.appendFileSync(state.journalPath,JSON.stringify(row)+'\n');return query.result;
 }
 return{state,invoke};
}
function install(H,options={}){const prior=H.boundary[DISPATCHER];assert.equal(typeof prior,'function');H.boundary[DISPATCHER]=(f,cpu,target)=>Object.values(IMPORTS).some(s=>s.target===target)?bind(f,{...options,cpu:H.A.cpu}).invoke(cpu,target):prior(f,cpu,target);}
function receipt(f){const calls=states.get(f.memory)?.calls||[];return{inputScope,calls,allOtherCpuAndGuestStacksPreserved:calls.every(r=>r.otherCpuAndGuestStacksPreserved),nativeExecutionAuthorized:false};}
module.exports={IMPORTS,GUEST_END,PAGE_BYTES,BITMAP_BASE,DISPATCHER,PE_PERMISSIONS,inputScope,parsePePermissions,checkRange,bind,install,receipt};
