'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Native=require('./native-window.cjs');
test('exact943 original native init and commit retain exact second-window bounds',async()=>{
 const p=await Native.prepare(),rows=[];let spans=0;
 for(const[pages,enabled,heapBreak,expected]of [[16384,true,700000000n,false],[32766,true,700000000n,true],[32768,true,1342177280n,true],[32768,true,1342177281n,false],[32768,false,700000000n,false]]){
  const f=Native.instance(p,pages,{enabled,heapBreak}),v=f.view;f.exports.init();
  assert.equal(v.getUint32(Native.WLO,true),expected?Native.LO:0);assert.equal(v.getUint32(Native.WHI,true),expected?Native.HI:0);assert.equal(v.getUint8(Native.DONE),1);
  if(expected)for(const[address,n,ok]of [[Native.LO,100832,true],[Native.HI-100832,100832,true],[Native.LO+16383,100832,true],[0x30000000,100832,false],[Native.LO-16384,100832,false],[Native.HI,16384,false]]){
   f.bytes.fill(0,Native.BITS,Native.BITS+32768);f.exports.commit(address,n);
   const expectedPages=[];if(ok)for(let page=address>>>14;page<Math.ceil((address+n)/16384);page++)expectedPages.push(page);
   const actual=[];for(let page=0;page<262144;page++)if(v.getUint8(Native.BITS+(page>>>3))&(1<<(page&7)))actual.push(page);
   assert.deepEqual(actual,expectedPages);spans++;
  }
  rows.push({pages,environmentEnabled:enabled,heapBreak:String(heapBreak),active:expected});
 }
 fs.writeFileSync(path.join(__dirname,'native-window-receipt-v03812.json'),JSON.stringify({checkedAt:new Date().toISOString(),moduleHash:p.moduleHash,byteIdenticalNativeBodies:p.bodyHashes,controlledCallees:p.controlledCallees,windowGlobals:[Native.WLO,Native.WHI],bitmap:Native.BITS,window:[Native.LO,Native.HI],rows,committedRangeCases:spans,liveVerified:false,limits:['Private execution of exact current native init/commit bodies with controlled environment, heap-break and logging dependencies.','No full game, live snapshot, tune change, save or browser-memory-headroom claim.']},null,2)+'\n');
});
