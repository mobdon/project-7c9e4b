/* Private native evaluator. Game instructions are extracted only from the game's
 * exact verified download. This file contains authored instrumentation, not game code. */
(function(root){'use strict';
const U=n=>{n>>>=0;const a=[];do{let x=n&127;n>>>=7;if(n)x|=128;a.push(x);}while(n);return a;};
const S=n=>{n|=0;const a=[];for(;;){let x=n&127;n>>=7;const done=(n===0&&!(x&64))||(n===-1&&(x&64));if(!done)x|=128;a.push(x);if(done)return a;}};
const cat=(...xs)=>{const a=new Uint8Array(xs.reduce((n,x)=>n+x.length,0));let p=0;for(const x of xs){a.set(x,p);p+=x.length;}return a;};
const name=s=>{const b=new TextEncoder().encode(s);return cat(U(b.length),b);};
const section=(id,b)=>cat([id],U(b.length),b),vec=xs=>cat(U(xs.length),...xs),constant=n=>[65,...S(n)];
const reader=(bytes,p=0,end=bytes.length)=>({bytes,p,end});
function u(r){let n=0,shift=0;for(let i=0;i<5;i++){if(r.p>=r.end)throw Error('Truncated native module');const x=r.bytes[r.p++];n+=(x&127)*2**shift;if(!(x&128))return n>>>0;shift+=7;}throw Error('Invalid native integer');}
function parse(bytes){const r=reader(bytes,8),sections=new Map();while(r.p<r.end){const id=bytes[r.p++],n=u(r),start=r.p;r.p+=n;if(r.p>r.end||sections.has(id)&&id)throw Error('Invalid native section');sections.set(id,bytes.subarray(start,r.p));}return sections;}
const opCodes={'i32.load':[40],'i64.load':[41],'f32.load':[42],'f64.load':[43],'i32.load8_s':[44],'i32.load8_u':[45],'i32.load16_u':[47],'i64.load32_s':[52],'i32.store':[54],'i64.store':[55],'f32.store':[56],'f64.store':[57],'i32.store8':[58],'i32.store16':[59],'v128.load32_lane':[253,86],'v128.store':[253,11]};
const valueTypes={i32:127,i64:126,f32:125,f64:124,v128:123};
function helperInfo(op,lane){
 if(!opCodes[op])throw Error('Unsupported native memory opcode '+op);
 const type=op.split('.')[0],store=op.includes('.store'),laneLoad=op.includes('_lane'),wide=store||laneLoad;
 const width=op.includes('8_')||op.endsWith('8')?1:op.includes('16_')||op.endsWith('16')?2:op.includes('32_')||op.endsWith('32')?4:type==='v128'?16:type==='i64'||type==='f64'?8:4;
 const params=wide?[127,valueTypes[type],127,127,127]:[127,127,127,127];
 const offset=wide?2:1,fn=wide?3:2,site=wide?4:3;
 const body=[0,32,0,32,offset,...constant(width),32,fn,32,site,16,store?2:1,32,0,32,offset,106];
 if(wide)body.push(32,1);body.push(...opCodes[op],0,0);if(laneLoad)body.push(lane);body.push(11);
 return {type:[96,...U(params.length),...params,...(store?[0]:[1,valueTypes[type]])],body:Uint8Array.from(body)};
}
function originalElements(data){const r=reader(data),count=u(r),table=new Map();for(let i=0;i<count;i++){
 const flags=u(r);if(flags!==0&&flags!==2)throw Error('Unsupported native elements');if(flags===2&&u(r)!==0)throw Error('Unknown native table');
 if(r.bytes[r.p++]!==65)throw Error('Unsupported native element offset');const start=u(r);if(r.bytes[r.p++]!==11)throw Error('Invalid native offset');if(flags===2&&r.bytes[r.p++]!==0)throw Error('Invalid native elemkind');
 const n=u(r);for(let j=0;j<n;j++)table.set(start+j,u(r));
 }if(r.p!==r.end)throw Error('Invalid native elements tail');return table;}
function firstPassive(data){const r=reader(data);if(u(r)<1||u(r)!==1)throw Error('Unsupported native dispatch metadata');const n=u(r);if(r.p+n>r.end)throw Error('Invalid native data');return data.subarray(r.p,r.p+n);}
async function build(input,meta){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(!meta){const current=root.__NFSU2_DYNO_NATIVE_PROFILE_943__||(typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-native-profile-943.js'):null),next=root.__NFSU2_DYNO_NATIVE_PROFILE_BDC9__||(typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-native-profile-bdc9.js'):null);const b1=root.__NFSU2_DYNO_NATIVE_PROFILE_B1__||(typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-native-profile-b1.js'):null);const ed8=root.__NFSU2_DYNO_NATIVE_PROFILE_ED8__||(typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-native-profile-ed8.js'):null);const p102c=root.__NFSU2_DYNO_NATIVE_PROFILE_102C__||(typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-native-profile-102c.js'):null);meta=[root.__NFSU2_DYNO_NATIVE_PROFILE__,current,next,b1,ed8,p102c].find(p=>p?.moduleSize===bytes.length);}
 if(!meta||bytes.length!==meta.moduleSize)throw Error('Full tuner needs its exact verified game build');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==meta.moduleHash)throw Error('Full tuner module hash mismatch');
 const nativeImports=meta.nativeImports||[];
 const bdcPolicy=meta.moduleHash==='395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e'&&meta.privateEvaluator===true&&meta.currentNumericWrapper===true&&JSON.stringify(meta.nativePolicyCapture)===JSON.stringify({version:1,magic:826495054,cache:673810672,online:704975480,bitmap:697812912,logCar:673810664,logAmount:673810668,frame:673830276,logStream:672524520,getenv:24188,helper:23003,wrapper:23427,log:24341});
 const b1Policy=meta.moduleHash==='3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb'&&meta.privateEvaluator===true&&meta.currentNumericWrapper===true&&JSON.stringify(meta.nativePolicyCapture)===JSON.stringify({"version":1,"magic":826495054,"cache":673812320,"online":705706016,"bitmap":697814592,"logCar":673812312,"logAmount":673812316,"frame":673831940,"logStream":672526168,"getenv":24215,"helper":23051,"wrapper":23453,"log":24368});
 const ed8Policy=meta.moduleHash==='f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b'&&meta.privateEvaluator===true&&meta.currentNumericWrapper===true&&JSON.stringify(meta.nativePolicyCapture)===JSON.stringify({"version":1,"magic":826495054,"cache":673813312,"online":704979224,"bitmap":697815584,"logCar":673813304,"logAmount":673813308,"frame":673832900,"logStream":672527144,"getenv":24235,"helper":23016,"wrapper":23473,"log":24388});
 const p102cPolicy=meta.moduleHash==='2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'&&meta.privateEvaluator===true&&meta.currentNumericWrapper===true&&JSON.stringify(meta.nativePolicyCapture)===JSON.stringify({"version":1,"magic":826495054,"cache":673813984,"online":704980184,"bitmap":697816560,"logCar":673813976,"logAmount":673813980,"frame":673833604,"logStream":672527832,"getenv":24240,"helper":23018,"wrapper":23478,"log":24393});
 if(nativeImports.length&&!(meta.moduleHash==='c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391'&&meta.privateEvaluator===true&&meta.currentNumericWrapper===true&&nativeImports.length===1&&nativeImports[0].id===24127&&nativeImports[0].type===4&&nativeImports[0].name==='numericControlLog')&&!(bdcPolicy&&JSON.stringify(nativeImports)===JSON.stringify([{id:24341,name:'numericControlLog',type:8},{id:24188,name:'unexpectedNativeEnvironment',type:4}]))&&!(b1Policy&&JSON.stringify(nativeImports)===JSON.stringify([{id:24368,name:'numericControlLog',type:8},{id:24215,name:'unexpectedNativeEnvironment',type:4}]))&&!(ed8Policy&&JSON.stringify(nativeImports)===JSON.stringify([{id:24388,name:'numericControlLog',type:8},{id:24235,name:'unexpectedNativeEnvironment',type:4}]))&&!(p102cPolicy&&JSON.stringify(nativeImports)===JSON.stringify([{id:24393,name:'numericControlLog',type:8},{id:24240,name:'unexpectedNativeEnvironment',type:4}])))throw Error('Unsupported private native import');
 const sections=parse(bytes),typeSection=sections.get(1),tr=reader(typeSection),typeCount=u(tr),ids=Object.keys(meta.functions).map(Number).sort((a,b)=>a-b),importCount=5+nativeImports.length,mapped=new Map(ids.map((id,i)=>[id,i+importCount]));
 mapped.set(meta.tail,3);mapped.set(meta.dispatch,4);
 for(let i=0;i<nativeImports.length;i++)mapped.set(nativeImports[i].id,5+i);
 const aliases=meta.nativeAliases||{};
 for(const [from,to]of Object.entries(aliases)){
  if(meta.moduleHash!=='c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391'||meta.researchOnly!==true||meta.researchLegacyFallback!==true||+from!==23301||to!==8710||!mapped.has(to)||mapped.has(+from))throw Error('Unsupported private legacy alias');
  mapped.set(+from,mapped.get(to));
 }
 const extraTypes=[[96,2,127,127,0],[96,5,127,127,127,127,127,0]],helpers=new Map();
 for(const id of ids)for(const p of meta.functions[id].patches)if(p.kind==='memory'){
  const key=p.op+':'+(p.lane??'');if(!helpers.has(key)){const h=helperInfo(p.op,p.lane);h.index=importCount+ids.length+helpers.size;h.typeIndex=typeCount+extraTypes.length;helpers.set(key,h);extraTypes.push(h.type);}
 }
 if(ids.some(id=>meta.functions[id].patches.some(p=>p.kind==='copy'))){
  if(!meta.currentNumericWrapper||!meta.privateEvaluator)throw Error('Unsupported private bulk copy');
  const h={type:[96,5,127,127,127,127,127,0],body:Uint8Array.from([0,32,1,65,0,32,2,32,3,32,4,16,1,32,0,65,0,32,2,32,3,32,4,16,2,32,0,32,1,32,2,252,10,0,0,11])};
  h.index=importCount+ids.length+helpers.size;h.typeIndex=typeCount+extraTypes.length;helpers.set('memory.copy',h);extraTypes.push(h.type);
 }
 const types=cat(U(typeCount+extraTypes.length),typeSection.subarray(tr.p),...extraTypes);
 const imports=vec([...([['fuel',typeCount],['read',typeCount+1],['write',typeCount+1],['tail',0],['dispatch',typeCount]]),...nativeImports.map(p=>[p.name,p.type])].map(([n,t])=>cat(name('audit'),name(n),[0],U(t))));
 const fnTypes=vec([...ids.map(id=>U(meta.functions[id].type)),...[...helpers.values()].map(h=>U(h.typeIndex))]);
 const bodies=ids.map(id=>{
  const f=meta.functions[id],original=bytes.subarray(f.offset,f.offset+f.length),patches=[{at:f.localsEnd,length:0,kind:'fuel'},...f.patches];let p=0;const chunks=[];
  for(const patch of patches){if(patch.at<p||patch.at+patch.length>original.length)throw Error('Overlapping native instrumentation');chunks.push(original.subarray(p,patch.at));
   if(patch.kind==='fuel')chunks.push(Uint8Array.from([...constant(id),...constant(patch.at),16,0]));
   else if(patch.kind==='call'){const target=mapped.get(patch.target);if(target===undefined)throw Error('Uncaptured direct native target');chunks.push(Uint8Array.from([patch.tail?18:16,...U(target)]));}
   else if(patch.kind==='copy'){const h=helpers.get('memory.copy');chunks.push(Uint8Array.from([...constant(id),...constant(patch.at),16,...U(h.index)]));}
   else{const h=helpers.get(patch.op+':'+(patch.lane??''));chunks.push(Uint8Array.from([...constant(patch.offset),...constant(id),...constant(patch.at),16,...U(h.index)]));}
   p=patch.at+patch.length;
  }chunks.push(original.subarray(p));const body=cat(...chunks);return cat(U(body.length),body);
 });
 for(const h of helpers.values())bodies.push(cat(U(h.body.length),h.body));
 const nativeTable=originalElements(sections.get(9)),elements=[];
 for(const [slot,id]of nativeTable)if(mapped.has(id))elements.push(Uint8Array.from([0,...constant(slot),11,1,...U(mapped.get(id))]));
 const exports=vec([cat(name('memory'),[2,0]),...(meta.privateRuntimeStack?[cat(name('runtimeStack'),[3,0])]:[]),...ids.map(id=>cat(name('f'+id),[0],U(mapped.get(id))))]);
 const moduleBytes=cat([0,97,115,109,1,0,0,0],section(1,types),section(2,imports),section(3,fnTypes),section(4,[1,112,0,...U(meta.tableSize)]),section(5,[1,1,...U(meta.memoryPages),...U(32768)]),section(6,sections.get(6)),section(7,exports),section(9,vec(elements)),section(10,cat(U(bodies.length),...bodies)));
 const data=firstPassive(sections.get(11)),dv=new DataView(data.buffer,data.byteOffset,data.byteLength),count=dv.getUint32(0,true),pbase=(16+4*count+15)&~15,guestMap=new Map(),lookup=[];
 if(count>100000||pbase+count*4>data.length)throw Error('Invalid native dispatch map');
 for(let i=0;i<count;i++){const address=dv.getUint32(16+i*4,true),slot=dv.getUint32(pbase+i*4,true),id=nativeTable.get(slot);guestMap.set(address,aliases[id]??id);if(address>=4198400&&address<7875312)lookup.push([meta.lookupBase+(address-4198400)*4,slot]);}
 return {module:await WebAssembly.compile(moduleBytes),guestMap,lookup,meta,byteLength:moduleBytes.length};
}
const CPU=0x2b000000,SP=0x2b020000,RUNTIME_SP=0x2b030000;
async function instantiate(prepared){
 let instance,memory,view,remaining=0,active=false,reads=[],writes=[],journal=new Map(),fuelUsed=0,writeTrace=null,executedTrace=null;
 const within=(p,n,regions)=>Number.isInteger(p)&&p>=0&&Number.isInteger(n)&&n>0&&p+n<=memory.buffer.byteLength&&regions.some(([a,b])=>p>=a&&p+n<=b);
 const check=(p,n,regions,label)=>{if(!active||!within(p,n,regions))throw Error(label+':'+(p>>>0).toString(16));};
 const address=(base,offset)=>{const p=(base>>>0)+(offset>>>0);if(p>0xffffffff)throw Error('NATIVE_ADDRESS_OVERFLOW');return p;};
 let lookupRegions=[];
 const lookupContains=(p,n)=>{let lo=0,hi=lookupRegions.length;while(lo<hi){const m=(lo+hi)>>>1;if(lookupRegions[m][0]<=p)lo=m+1;else hi=m;}const r=lookupRegions[lo-1];return !!r&&p>=r[0]&&p+n<=r[1];};
 const audit={fuel:(fn)=>{if(!active||--remaining<0)throw Error('NATIVE_BUDGET');fuelUsed++;if(executedTrace)executedTrace.add(fn);},read:(base,offset,n,fn,site)=>{const p=address(base,offset);if(!active||!within(p,n,reads)&&!lookupContains(p,n))throw Error('NATIVE_UNCAPTURED_READ:f'+fn+':'+site+':'+p.toString(16));},write:(base,offset,n,fn,site)=>{const p=address(base,offset);check(p,n,writes,'NATIVE_FORBIDDEN_WRITE:f'+fn+':'+site);if(writeTrace)writeTrace.push({address:p,length:n,fn,site});for(let i=0;i<n;i++)if(!journal.has(p+i))journal.set(p+i,view.getUint8(p+i));},tail:cpu=>dispatch(cpu,view.getUint32(cpu+32,true)),dispatch:(cpu,a)=>dispatch(cpu,a),numericControlLog:()=>{if(!active||!prepared.meta.currentNumericWrapper||!prepared.meta.privateEvaluator)throw Error('Private control logging scope');return 0;},unexpectedNativeEnvironment:()=>{throw Error('NATIVE_UNCAPTURED_ENVIRONMENT');}};
 function dispatch(cpu,a){if(cpu!==CPU)throw Error('NATIVE_CPU_IDENTITY');const id=prepared.guestMap.get(a),fn=instance.exports['f'+id];if(!fn)throw Error('NATIVE_TARGET_UNAVAILABLE:'+a.toString(16));fn(cpu);}
 instance=await WebAssembly.instantiate(prepared.module,{audit});memory=instance.exports.memory;view=new DataView(memory.buffer);
 if(prepared.meta.privateRuntimeStack){if(!prepared.meta.currentNumericWrapper||!prepared.meta.privateEvaluator||!(instance.exports.runtimeStack instanceof WebAssembly.Global))throw Error('Unsupported private runtime stack');instance.exports.runtimeStack.value=RUNTIME_SP;}
 for(const [address,slot]of prepared.lookup)view.setUint32(address,slot,true);
 const lookupRanges=prepared.lookup.map(([a])=>[a,a+4]); // Coalesce to keep each instrumented read cheap.
 lookupRanges.sort((a,b)=>a[0]-b[0]);const compact=[];for(const r of lookupRanges){const last=compact[compact.length-1];if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else compact.push(r);}
 function hydrate(snapshot){
  if(active)throw Error('Native evaluator busy');if(!snapshot||!Array.isArray(snapshot.ranges)||snapshot.ranges.length>16)throw Error('Invalid native snapshot');
  // The capture bridge verifies the active native guest window and committed
  // pages. Preserve exact source addresses in this separate evaluator memory;
  // never admit the intervening runtime region or its CPU/dispatch scratch.
  const sources=[];let required=memory.buffer.byteLength;
  for(const range of snapshot.ranges){
   const {address,data,writable=false}=range,end=address+(data?.length||0);
   if(!(data instanceof Uint8Array)||!data.length||!Number.isSafeInteger(address)||address<0x10000||!(end<=0x28000000||(address>=0x50000000&&end<=0x7ffe0000&&data.length<=46*0x890)))throw Error('Invalid native snapshot range');
   sources.push([address,end,!!writable]);required=Math.max(required,end);
  }
  if(required>memory.buffer.byteLength){memory.grow(Math.ceil(required/65536)-memory.buffer.byteLength/65536);view=new DataView(memory.buffer);}
  for(const {address,data}of snapshot.ranges)new Uint8Array(memory.buffer,address,data.length).set(data);
  reads=[...sources.map(r=>r.slice(0,2)),[CPU,CPU+344],[SP-16384,SP+128]];lookupRegions=compact;writes=[...sources.filter(r=>r[2]).map(r=>r.slice(0,2)),[CPU,CPU+344],[SP-16384,SP+128],[0x86b620,0x86b620+368]];
  if(prepared.meta.currentNumericWrapper){
   // Exact private host scalars and a dedicated native C stack. No live runtime
   // range is admitted. Bitmap bits describe only the captured source pages.
   const policy=prepared.meta.nativePolicyCapture;
   if(policy){const p=snapshot.nativePolicy;if(!['395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e','3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb','f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b','2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'].includes(prepared.meta.moduleHash)||p?.magic!==826495054||p.moduleHash!==prepared.meta.moduleHash||![0,1].includes(p.cache)||p.online!==0)throw Error('NATIVE_POLICY_CAPTURE');}
   const bitmap=policy?.bitmap||695752272;new Uint8Array(memory.buffer,bitmap,32768).fill(0);
   for(const[a,b]of sources)for(let page=a&~16383;page<b;page+=16384){const at=bitmap+(page>>>17);view.setUint8(at,view.getUint8(at)|(1<<((page>>>14)&7)));}
   const logCar=policy?.logCar||673787912,logAmount=policy?.logAmount||673787916,frame=policy?.frame||673790852,stream=policy?.logStream||672501640;
   reads.push([bitmap,bitmap+32768],[RUNTIME_SP-4096,RUNTIME_SP+64],[logCar,logAmount+4],[frame,frame+4],[stream,stream+4]);
   writes.push([RUNTIME_SP-4096,RUNTIME_SP+64],[logCar,logAmount+4]);
   view.setUint32(logCar,0xffffffff,true);view.setUint32(logAmount,0xffffffff,true);
   if(policy){reads.push([policy.cache,policy.cache+4],[policy.online,policy.online+4]);view.setUint32(policy.cache,snapshot.nativePolicy.cache,true);view.setUint32(policy.online,snapshot.nativePolicy.online,true);view.setUint32(frame,0,true);view.setUint32(stream,0,true);}
   instance.exports.runtimeStack.value=RUNTIME_SP;
  }
  // Dispatch holes remain uncaptured; populated slots are checked by binary search.
 }
 function call(id,args=[],{thisArg,fuel=100000,rollback=false,capture=null,captureWrites=false}={}){
  if(active||!Number.isInteger(fuel)||fuel<1||fuel>150000)throw Error('Invalid native call budget');
  const fn=instance.exports['f'+id];if(!fn)throw Error('Unsupported native entry');new Uint8Array(memory.buffer,CPU,344).fill(0);view.setUint32(CPU+4,thisArg,true);view.setUint32(CPU+16,SP,true);view.setUint16(CPU+140,0x37f,true);view.setUint32(SP,0xdeadbeef,true);args.forEach((x,i)=>view.setUint32(SP+4+4*i,x,true));
  journal=new Map();writeTrace=captureWrites?[]:null;executedTrace=captureWrites?new Set():null;remaining=fuel;fuelUsed=0;active=true;let result,completed=false;
  try{fn(CPU);result={eax:view.getUint32(CPU,true),value:view.getFloat64(CPU+72+8*(view.getUint32(CPU+136,true)&7),true),fuel:fuelUsed};if(capture)result.captured=new Uint8Array(memory.buffer,capture.address,capture.length).slice();if(writeTrace){result.writes=writeTrace;result.executedFunctions=[...executedTrace];}completed=true;return result;}
  finally{active=false;if(rollback||!completed)for(const [address,value]of journal)view.setUint8(address,value);journal.clear();writeTrace=null;executedTrace=null;if(prepared.meta.privateRuntimeStack)instance.exports.runtimeStack.value=RUNTIME_SP;}
 }
 return {hydrate,call,get view(){return view;},memory,CPU,SP};
}
const api={build,instantiate,CPU,SP};root.__NFSU2_DYNO_NATIVE__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
