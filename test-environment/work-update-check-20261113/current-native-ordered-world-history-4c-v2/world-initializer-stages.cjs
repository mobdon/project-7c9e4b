'use strict';
// SOURCE-PREPARED CONDITION ONLY. Importing this module runs no native code.
// Every constructor below is invoked whole on the existing reviewed fixture.
const assert=require('node:assert/strict');
const PREFIX=Object.freeze([
 {id:13479,storage:[8513552,37360],heads:[8515856]},
 {id:16761,storage:[8551304,16],heads:[8551308]},
 {id:11290,storage:[8554352,7384],heads:[]},
 {id:4879,storage:[8607840,96],heads:[8607840,8607848]},
 {id:5035,storage:[8607712,96],heads:[8607712,8607720]},
 {id:5662,storage:[8588572,8],heads:[8588572]},
 {id:6288,storage:[8575944,56],heads:[8575968]},
 {id:7227,storage:[8607936,8],heads:[8607936]},
 {id:8477,storage:[8588016,8],heads:[8588016]},
 {id:13637,storage:[8796080,12],heads:[8796084]},
 {id:17388,storage:[0xD00100,6*456],heads:Array.from({length:6},(_,i)=>0xD00100+456*i)},
 {id:4568,storage:[8828048,8],heads:[8828048]},
 {id:4724,storage:[8828320,8],heads:[8828320]}
]);
const SUFFIX=Object.freeze([
 {id:6757,storage:[8828328,8],heads:[8828328]},
 {id:6914,storage:[8828096,8],heads:[8828096]},
 {id:11449,storage:[8978328,8],heads:[8978328]},
 {id:11762,storage:[8974780,8],heads:[8974780]},
 {id:12701,storage:[8976192,8],heads:[8976192]},
 {id:16453,storage:[8974856,8],heads:[8974856]},
 {id:976,storage:[9055056,8],heads:[9055056]},
 {id:4102,storage:[9055080,308],heads:[9055080]}
]);
const WORLD_OWNED=Object.freeze([8978560,8827760,8827764,8827776,8826768,8928856,8928848,9051164,8928628,8978736,8928640]);
const EARLIER_OWNED=Object.freeze([8826208,8827544,8827580,8928824,8928828,9055396,9055400]);
const DT_ADDRESS=8802644,TICK_ADDRESS=8802700,WRAPPER_PRESERVED_TIME=8803672;
const inputScope=Object.freeze({cppOrder:[13479,16761,11290,4879,5035,5662,6288,7227,8477,13637,17388,4568,4724,4880,6757,6914,11449,11762,12701,16453,976,4102],worldEntry:21991,worldCore:1690,worldAllocationBytes:5632,nativePoolProducer:11167,renderProducer:8715,excludedRenderPredecessors:[16486,4135],queryManagerBeforeWorld:15134,requestedMovementFrames:0,dtCallerInput:1/60,worldTickNotAuthored:true});
const words=(f,addresses)=>addresses.map(address=>({address,value:f.get(address)}));
function staticGroup(ctx,specs){
 const{q,stage,abi,writeJson,Shared,state}=ctx,{f,A}=q;
 for(const spec of specs){const okay=stage('current-native-World-static-CPP-initializer'+spec.id,()=>{
  // PE virtual .data and the current relocated static port array are native static storage.
  // Commit covered pages but let the whole native initializer own every field.
  q.commit(...spec.storage);
  const beforeNativeHeaderHex=f.bytes(spec.storage[0],Math.min(96,spec.storage[1])).toString('hex');
  const beforeNativeArrayHeadWords=spec.id===17388?spec.heads.map(address=>({address,next:f.get(address),previous:f.get(address+4)})):undefined;
  if(spec.id===11762)assert.equal(beforeNativeHeaderHex,'0000000000000000','Observe fresh native list storage before whole initializer; never repair it');
  const heap=Shared.bind(f,{cpu:A.cpu}).heap,before={base:f.get(9156076),end:f.get(9156072)},table=heap.owned.get(before.base);
  assert(table?.live,'Whole4385 must own the actual onexit table');assert(before.end>=before.base&&before.end+4<=before.base+table.bytes,'Native registration requires real table capacity');
  const result=q.rawCall(spec.id,0);abi(4);assert.equal(result.eax,0,'Whole original C++ initializer must return actual cleanup-registration success');
  const after={base:f.get(9156076),end:f.get(9156072),registeredCallback:f.get(before.end)};
  assert.equal(after.base,before.base);assert.equal(after.end,before.end+4);assert(after.registeredCallback,'Original wrapper must register its real cleanup');
  if(spec.id===16761)assert.equal(after.registeredCallback,0x781b60,'Whole16761 registers its genuine cleanup');
  if(spec.id===17388)assert.equal(after.registeredCallback,0x782290,'Whole17388 registers its genuine six-port array cleanup');
  if(spec.id===16453)assert.equal(after.registeredCallback,0x7825f0,'Whole16453 registers its genuine cleanup');
  if(spec.id===976)assert.equal(after.registeredCallback,0x782840,'Whole976 registers its genuine cleanup');
  if(spec.id===11449)assert.equal(after.registeredCallback,7874048,'Whole11449 registers genuine cleanup0x782600');
  if(spec.id===11762)assert.equal(after.registeredCallback,0x782690,'Whole11762 registers its genuine list cleanup');
  if(spec.id===4879)assert.equal(after.registeredCallback,7872128,'Whole4879 directly4541 registers genuine cleanup0x781e80');
  if(spec.id===4724)assert.equal(after.registeredCallback,7873552,'Whole4724 registers genuine cleanup0x782410');
  if(spec.id===4568)assert.equal(after.registeredCallback,7873520,'Whole4568 registers genuine cleanup0x7823f0');
  if(spec.id===13637){assert.equal(f.get(8796080),7977232,'Whole11511 owns its genuine manager vtable');assert.equal(after.registeredCallback,7872464,'Whole13637 registers genuine cleanup0x781fd0');}
  const heads=spec.heads.map(address=>{const next=f.get(address),previous=f.get(address+4);assert.equal(next,address);assert.equal(previous,address);return{address,next,previous};});
  if(spec.id===6288)assert.deepEqual(Array.from({length:6},(_,i)=>f.get(8575944+4*i)),[128,0x494140,0x494190,0x48b410,0x48da00,0x494210]);
  const proof={initializer:spec.id,beforeNativeHeaderHex,beforeNativeArrayHeadWords,wholeNativeReturned:true,...result,residentStorage:{address:spec.storage[0],bytes:spec.storage[1],dataAuthored:false},beforeOnexit:before,afterOnexit:after,heads,headerHex:f.bytes(spec.storage[0],Math.min(96,spec.storage[1])).toString('hex'),nativeFieldsOrCallbacksAuthored:false};
  state.staticInitializers.push(proof);writeJson('native-World-static-CPP-proof.json',{selectedRelativeOrder:inputScope.cppOrder,completed:state.staticInitializers,existing4880InvokedSeparatelyOnce:true});return proof;
 });if(!okay)return false;}
 return true;
}
function initializePrefix(ctx){return staticGroup(ctx,PREFIX);}
function initializeSuffix(ctx){return staticGroup(ctx,SUFFIX);}
function constructWholeWorld(ctx){
 const{q,stage,abi,writeJson,Shared,state}=ctx,{f,A}=q;
 let okay=stage('current-native-World-required-pool-initializer11167',()=>{
  q.commit(8575624,4);const before=f.get(8575624),heap=Shared.bind(f,{cpu:A.cpu}).heap,firstAllocation=heap.calls.length;
  const result=q.rawCall(11167,0);abi(4);const pool=f.get(8575624);
  assert(pool>=0x10000&&pool+64<f.memory.buffer.byteLength,'Genuine11167 must publish its actual pool');assert.equal(result.eax,pool);
  const allocations=heap.calls.slice(firstAllocation);assert(allocations.length,'Whole11167 must retain the actual native pool allocation path');
  state.requiredPool={initializer:11167,wholeNativeReturned:true,...result,before,pool,elementBytes:24,count:5000,nativePoolFactory:23287,poolHeaderHex:f.bytes(pool,64).toString('hex'),actualHeapAllocations:allocations,sourceEdge:'Whole1690→1530 reads8575624 and passes it to2243 when8928760 is empty; this dependency is separate from the render-only8715 closure.',poolOrFreeListAuthored:false};
  writeJson('native-World-required-pool-proof.json',state.requiredPool);return state.requiredPool;
 });
 if(okay)okay=stage('current-native-World-minimal-render-initializer8715',()=>{
  const heap=Shared.bind(f,{cpu:A.cpu}).heap,firstAllocation=heap.calls.length,before=[8597172,8597284].map(address=>({address,value:f.get(address)}));
  const result=q.rawCall(8715,0);abi(4);
  const outputs=[8597172,8597284].map(address=>{const pointer=f.get(address);assert(pointer>=0x10000&&pointer+20928<=f.memory.buffer.byteLength);const allocation=heap.owned.get(pointer);assert(allocation?.live,'Render record must refer to its actual native allocation');assert.equal(allocation.bytes,20928);return{address,pointer,allocation,headerHex:f.bytes(pointer,128).toString('hex')};});
  state.render={initializer:8715,wholeNativeReturned:true,...result,before,outputs,actualHeapAllocations:heap.calls.slice(firstAllocation),preceding16486Or4135Called:false,renderFieldsOrAllocationResultsAuthored:false};writeJson('native-World-render-proof.json',state.render);return state.render;
 });
 if(okay)okay=stage('current-native-actual-5632-byte-World-allocation5867',()=>{
  const heap=Shared.bind(f,{cpu:A.cpu}).heap,firstAllocation=heap.calls.length;
  // Native5867 is cdecl: its one size argument remains caller-owned (ESP+4).
  const result=q.rawCall(5867,0,[5632]);abi(4);const receiver=result.eax;assert(receiver,'Whole original5867 must return its actual nonnull World allocation');
  const allocation=heap.owned.get(receiver);assert(allocation?.live);assert.equal(allocation.bytes,5632);assert(heap.calls.slice(firstAllocation).includes(allocation));
  state.allocation={allocator:5867,wholeNativeReturned:true,...result,receiver,requestedBytes:5632,nativeCdeclArgumentBytes:4,nativeCalleeEspAdvance:4,allocation,receiverOrPayloadAuthored:false};writeJson('native-World-allocation-proof.json',state.allocation);return state.allocation;
 });
 if(okay)okay=stage('current-native-whole-World-constructor21991-1690',()=>{
  assert(state.allocation?.receiver);const receiver=state.allocation.receiver,before={owned:words(f,WORLD_OWNED),earlierOwnership:words(f,EARLIER_OWNED),dtBits:f.get(DT_ADDRESS),tick:f.get(TICK_ADDRESS),wrapperPreservedTimeBits:f.get(WRAPPER_PRESERVED_TIME)};
  // Never publish a substitute World pointer or inspect an early global as
  // constructor completion. All assertions below occur after the whole return.
  const historyBefore=ctx.historyWitness.beforeWorld({q});const result=q.rawCall(21991,receiver);abi(4);assert.equal(result.eax,receiver);assert.equal(f.get(8978560),receiver);const historyAfter=ctx.historyWitness.afterWorld({q,Shared,receiver});
  const after={owned:words(f,WORLD_OWNED),earlierOwnership:words(f,EARLIER_OWNED),dtBits:f.get(DT_ADDRESS),tick:f.get(TICK_ADDRESS),wrapperPreservedTimeBits:f.get(WRAPPER_PRESERVED_TIME)};
  assert.equal(after.tick,4000,'Whole1690/12930 must produce its actual4000 tick');assert.equal(after.dtBits,0,'Whole12930 owns its dt reset');assert.equal(after.wrapperPreservedTimeBits,before.wrapperPreservedTimeBits,'Whole21991 preserves the native time cell');
  state.world={entry:21991,core:1690,historyBefore,historyPoolProof:historyAfter,wholeNativeReturned:true,...result,receiver,allocation:state.allocation,before,after,actualTailObject:f.get(receiver+5620),worldHeaderHex:f.bytes(receiver,128).toString('hex'),worldTailHex:f.bytes(receiver+5504,128).toString('hex'),worldGlobalValidatedAfterWholeReturn:true,worldOrMembershipOrTimingOutputsAuthored:false,subsystemAllocationSuccessNotInferredFromWorldPointer:true};writeJson('native-World-construction-proof.json',state.world);return state.world;
 });
 return okay;
}
function restoreExplicitDtInput(ctx){
 const{q,stage,writeJson,state}=ctx,{f}=q;
 return stage('current-native-explicit-dt-caller-input-after-World',()=>{
  assert(state.world?.wholeNativeReturned,'Only a completed World constructor precedes the explicit dt caller input');
  const before={dtBits:f.get(DT_ADDRESS),tick:f.get(TICK_ADDRESS),owned:words(f,WORLD_OWNED)};
  assert.equal(before.tick,4000,'Do not replace the World-produced tick with the old fixture1000 input');f.f32(DT_ADDRESS,inputScope.dtCallerInput);
  const after={dtBits:f.get(DT_ADDRESS),dt:f.view.getFloat32(DT_ADDRESS,true),tick:f.get(TICK_ADDRESS),owned:words(f,WORLD_OWNED)};assert.equal(after.tick,before.tick);assert.deepEqual(after.owned,before.owned);
  state.dtCallerInput={address:DT_ADDRESS,value:inputScope.dtCallerInput,before,after,onlyExplicitDtCallerInputAuthored:true,worldTickOrOwnershipAuthored:false};writeJson('native-World-post-return-dt-input.json',state.dtCallerInput);return state.dtCallerInput;
 });
}
module.exports={inputScope,initializePrefix,initializeSuffix,constructWholeWorld,restoreExplicitDtInput};
