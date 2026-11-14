'use strict';
// Whole normal session allocator initializer; no authored owner, lists or backing.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const GLOBAL=9031496,SLOT=8552800,OWNER=8553248,KEY=8553312,SIZE=215040,LABEL=8020112;
function initialize({q,stage,abi,writeJson,Shared,Critical,directory}){
  return stage('native-session-allocator9348-before-name-registration',()=>{
    const f=q.f,heap=Shared.bind(f,{cpu:q.A.cpu}).heap;
    // These are original resident PE globals, committed without changing bytes.
    q.commit(8552492,1280);
    const before={owner:f.get(SLOT),sessionBacking:f.get(GLOBAL+96),sessionState:f.get(GLOBAL),
      allocatorTableHex:f.bytes(8552788,32).toString('hex'),ownerHex:f.bytes(OWNER,88).toString('hex'),
      defaultInitialized:f.get(8553744),gameMode:f.view.getUint16(8716408,true),realTick:f.get(8802732)},firstAllocation=heap.calls.length;
    assert.equal(before.owner,0);assert.equal(before.sessionBacking,0);
    // The original2922 caller supplies two unused stack words.9348 is RET8.
    const result=q.rawCall(9348,GLOBAL,[0,0]);abi(12);
    const backing=f.get(GLOBAL+96),owner=f.get(SLOT);
    assert.equal(owner,OWNER,'Whole18971 must publish the original kind3 owner');
    assert(backing>=0x10000&&backing+SIZE<0x28000000);
    assert.equal(f.get(owner),LABEL,'Whole18814 must publish original allocator label');
    assert.equal(f.get(owner+36),SIZE);
    assert.equal(f.view.getUint8(owner+56),1);assert.equal(f.view.getUint8(owner+57),1);
    const allocation=heap.calls.find(a=>a.live&&backing>=a.address&&backing+SIZE<=a.address+a.bytes);
    assert(allocation,'Native session backing must lie wholly inside a genuine tracked platform allocation');
    const locks=Critical.receipt(f),lock=locks.locks.find(l=>l.key===KEY),calls=locks.calls.filter(c=>c.key===KEY);
    assert(lock);assert.equal(lock.owner,0);assert.equal(lock.depth,0);
    assert.equal(calls.filter(c=>c.name==='InitializeCriticalSection').length,1);
    assert(calls.some(c=>c.name==='EnterCriticalSection'));assert(calls.some(c=>c.name==='LeaveCriticalSection'));
    assert.equal(f.get(GLOBAL),before.sessionState,'Allocator setup does not synthesize a connected session');
    assert.equal(f.get(8802732),before.realTick,'Timer prerequisite remains separate');
    const bytes=Buffer.from(f.bytes(backing,SIZE)),file='native-session-allocator-backing.bin';
    fs.writeFileSync(path.join(directory,file),bytes,{flag:'wx'});
    const proof={kind:'WHOLE-NATIVE-SESSION-ALLOCATOR-INITIALIZATION',function:9348,guest:0x5efe30,
      receiver:GLOBAL,arguments:[0,0],argumentMeaning:'Two unused ordinary API caller words; normal2922 uses zero/nativeEBX, neither consumed by9348.',
      ...result,wholeNativeReturned:true,before,after:{owner,sessionBacking:backing,sessionState:f.get(GLOBAL),
        allocatorTableHex:f.bytes(8552788,32).toString('hex'),ownerHex:f.bytes(owner,88).toString('hex'),
        gameMode:f.view.getUint16(8716408,true),realTick:f.get(8802732)},
      nativeBacking:{file,address:backing,length:SIZE,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),containingTrackedAllocation:allocation},
      nativeHeapCalls:heap.calls.slice(firstAllocation),kind3CriticalSection:{key:KEY,owner:OWNER,lock,calls},
      sourceChain:[2922,9348,216,19280,17095,18971,18814,8124,16315],
      allocatorOwnerBackingListsMetadataLocksOrClockAuthored:false};
    writeJson('native-session-allocator-proof.json',proof);return proof;
  });
}
module.exports={GLOBAL,SLOT,OWNER,KEY,SIZE,LABEL,initialize};
