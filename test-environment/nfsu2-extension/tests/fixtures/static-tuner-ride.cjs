'use strict';
const assert=require('node:assert/strict');
// Private fixture only: retain the real retail data and native-computed ride,
// relocate its proven internal pointers into a native static racer slot.
module.exports=function staticRideFixture({h,snapshot},index=0){
 const ride=0x890170+index*0x940,old=snapshot.ride,data=new Uint8Array(h.memory.buffer,old,0x8f0).slice(),v=new DataView(data.buffer),relocated=[];
 for(let off=0;off<data.length;off+=4){const p=v.getUint32(off,true);if(p>=old&&p<old+0x8f0){relocated.push(off);v.setUint32(off,p-old+ride,true);}}
 assert.deepEqual(relocated,[0x38c,0x390,0x57c],'Review any new internal native pointer before relocating');
 new Uint8Array(h.memory.buffer,ride,data.length).set(data);h.put(ride-12,1);h.put(0x89e810,0x890160);h.put(0x89e814,index+1);
 const ranges=snapshot.ranges.map(r=>{const address=r.address>=old&&r.address<old+0x8f0?r.address-old+ride:r.address;return {...r,address,data:new Uint8Array(h.memory.buffer,address,r.data.length).slice()};});
 return {...snapshot,ride,tuned:ride+0x384,parts:ride+0x2f0,ranges};
};
