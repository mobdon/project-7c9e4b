'use strict';
// Read-only evidence and assertions. No native API calls and no guest-memory writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const GLOBAL=8978732,LABEL=8020800,STRIDE=128;
function create({directory}){
  let before=null,world=null,result=null;
  const proofName='native-ordered-history-pool-proof.json';
  assert(!fs.existsSync(path.join(directory,proofName)));
  const readable=(f,p,n)=>Number.isSafeInteger(p)&&p>=0x10000&&p+n<=f.memory.buffer.byteLength;
  const header=(f,p)=>({address:p,rawHex:f.bytes(p,64).toString('hex'),label:f.get(p+12),freeHead:f.get(p+16),flags:f.get(p+20),allocated:f.get(p+24),highWater:f.get(p+28),allocationFlags:f.get(p+32),blockCapacity:f.get(p+36),stride:f.get(p+40),totalCapacity:f.get(p+44)});
  const save=()=>fs.writeFileSync(path.join(directory,proofName),JSON.stringify({kind:'READ-ONLY-ORDERED-WORLD-EXTRAPOLATED-STATE-POOL-WITNESS',before,world,result,nativeCallsAdded:0,nativeMemoryAuthored:false,properStartupBaselineClaimed:false},null,2)+'\n');
  function beforeWorld({q}){
    assert(!before);const{f}=q;
    before={pool:f.get(GLOBAL),client:f.get(8808948),host:f.get(8808980),online:f.view.getUint8(9031529),nativeWorld:f.get(8978560)};
    assert.equal(before.pool,0,'Fresh native extrapolated-state pool must be absent before its whole World producer');
    assert(before.client>0,'Existing whole17624 must produce the actual pending-client predicate before World');
    save();return before;
  }
  function afterWorld({q,Shared,receiver}){
    assert(before);assert(!world);const{f,A}=q,pool=f.get(GLOBAL);
    assert(readable(f,pool,64),'Whole1690 must publish an actual nonnull extrapolated-state pool');
    const actual=header(f,pool),heap=Shared.bind(f,{cpu:A.cpu}).heap;
    const containing=[...heap.owned.values()].filter(item=>item.live&&pool>=item.address&&pool+64<=item.address+item.bytes);
    assert.equal(containing.length,1,'Pool header must lie within exactly one actual live platform heap allocation');
    const allocation=containing[0],nativeAllocatorInteriorOffset=pool-allocation.address;
    assert.equal(actual.label,LABEL);assert.equal(actual.stride,STRIDE);assert.equal(actual.flags,11);
    assert(actual.blockCapacity>0);assert(actual.totalCapacity>=actual.blockCapacity);
    assert(pool+48+STRIDE*actual.blockCapacity<=allocation.address+allocation.bytes,'The entire native initial pool block must fit within its containing allocation');
    assert.equal(actual.allocated,0,'Capture the native unused history pool immediately after whole1690');
    assert.equal(actual.freeHead,pool+48,'Native3178 must own the initial free list');
    world={wholeProducer:1690,wrapper:21991,receiver,pool,header:actual,allocation:{...allocation},nativeAllocatorInteriorOffset,nativeAllocatorPrefixHex:f.bytes(allocation.address,Math.min(nativeAllocatorInteriorOffset,128)).toString('hex'),nativePublicationObservedAfterWholeReturn:true,poolMetadataOrLinksAuthored:false};
    save();return world;
  }
  function finish({q,enrollment,legacy}){
    assert(world);assert(!result);assert(legacy?.complete);assert(enrollment?.completed);
    const{f}=q,pool=f.get(GLOBAL);assert.equal(pool,world.pool,'Retain the same native pool throughout enrollment');
    const firstNode=pool+48,nodeAreaEnd=firstNode+STRIDE*world.header.blockCapacity;
    const initialNode=p=>readable(f,p,STRIDE)&&p>=firstNode&&p+STRIDE<=nodeAreaEnd&&(p-firstNode)%STRIDE===0;
    assert.equal(f.get(pool+8),0,'This one-node unit must not require a native growth block');
    assert.equal(f.get(pool+44),world.header.totalCapacity,'Retain the native initial capacity without growth');
    const calls=fs.readFileSync(path.join(directory,'native-pool-allocations.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.activeStage==='native-legacy-whole-receiver10443-actual-remote-slot'&&r.returnAddress===6261307);
    assert.equal(calls.length,1,'Observe the one original7944→2243 allocation at its genuine call site');
    for(const call of calls){assert.equal(call.pool,pool,'Original7944 must pass the actual World-created pool');assert(call.result&&initialNode(call.result),'Native2243 must return a properly aligned node within the actual initial pool area');assert(call.returnEvent>call.event);assert.equal(call.returnedEip,6261307);}
    const controller=enrollment.state.enrollment.remote.remoteController,sentinel=controller+4;
    assert(readable(f,controller,576));const head=f.get(sentinel),tail=f.get(sentinel+4);
    assert(head&&tail,'Native controller history list must retain nonnull links');
    const nodes=[];let node=head,previous=sentinel;
    while(node!==sentinel){
      assert(nodes.length<world.header.totalCapacity,'Bounded native list traversal must reach its actual sentinel');
      assert(initialNode(node),'Every native list node must belong to the initial128B node area');assert.equal(f.get(node+4),previous,'Native history previous link');
      const next=f.get(node);assert(next===sentinel||initialNode(next),'The next link must be an owned native node or the controller sentinel');assert.equal(f.get(next+4),node,'Native history next/back link');
      nodes.push({address:node,next,previous:f.get(node+4),rawHex:f.bytes(node,STRIDE).toString('hex')});previous=node;node=next;
    }
    assert.equal(tail,previous);for(const call of calls)assert(nodes.some(n=>n.address===call.result),'The actual returned native node must reside in the native controller list');
    result={complete:true,pool,header:header(f,pool),initialNodeArea:{start:firstNode,end:nodeAreaEnd,stride:STRIDE,relativeAlignmentVerified:true,growthObserved:false},controller,sentinel,head,tail,nodes,nativeAllocations:calls,nativeLegacyAccepted:legacy.receiver.after.values.legacyAcceptedCount,nativeObserverRecord:legacy.nativeObserverRecord,requestedMovementFrames:0,typedMaximumGettersCalled:0,scope:'Only ordered World/history allocation and legacy receiver enrollment. Other known startup omissions remain unresolved.'};
    save();return result;
  }
  return{beforeWorld,afterWorld,finish};
}
module.exports={GLOBAL,LABEL,STRIDE,create};
