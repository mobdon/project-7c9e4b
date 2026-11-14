'use strict';
// Ownerless private fixture. No browser or running-game memory is available.
const assert=require('node:assert/strict'),Native=require('../extension/dyno-native.js'),Fixture=require('../../research/tuner-fixtures-93cf/retail-fixture.cjs'),P=require('../../work-aa-profile/tools/native-proof.cjs');
const PIN=require('../../work-paced-v03811/native/profile-config.cjs').PROFILES.find(x=>x.revision==='943ee537').native;
const mapping=require('../verification/function-map-v03812.json').mapping;
const bits=x=>{const v=new DataView(new ArrayBuffer(4));v.setFloat32(0,x,true);return v.getUint32(0,true);};
async function create(meta,carType=27){
 const prepared=await Native.build(P.pinned(PIN),meta),h=await Native.instantiate(prepared),snapshot=Fixture.seed(carType),stock=snapshot.ranges.find(r=>r.address===Fixture.A.STOCK),cacheOffset=carType*0x890+0x4f8;
 snapshot.ranges.push({address:stock.address+cacheOffset,data:stock.data.slice(cacheOffset,cacheOffset+4),writable:true});h.hydrate(snapshot);
 const call=(id,args=[],thisArg=snapshot.tuned,options={})=>{const r=h.call(id,args,{thisArg,fuel:150000,...options});assert.equal(h.view.getUint32(h.CPU+32,true),0xdeadbeef);assert.equal(h.view.getUint32(h.CPU+16,true),h.SP+4+4*args.length);return r;};
 call(mapping[15440],[0,0]);call(meta.entries.rebuild,[0,1,1],snapshot.ride+16);
 for(const range of snapshot.ranges)range.data=new Uint8Array(h.memory.buffer,range.address,range.data.length).slice();
 snapshot.setup=new Uint8Array(h.memory.buffer,snapshot.tuned+20,41).slice();snapshot.partBytes=new Uint8Array(h.memory.buffer,snapshot.parts,148).slice();h.hydrate(snapshot);
 const physics=snapshot.ride+0x40,curve=()=>Array.from({length:9},(_,i)=>h.view.getFloat32(physics+512+i*4,true));
 const peak=()=>call(meta.entries.peakPower,[h.SP+64,0],snapshot.ride+16).value;
 const reset=()=>h.hydrate(snapshot),rideBytes=()=>new Uint8Array(h.memory.buffer,snapshot.ride,0x8f0).slice();
 function ceilings(){return Array.from({length:9},(_,column)=>{const bounds=[];for(const kind of[23,24]){call(6371,[kind,h.SP+64,h.SP+68,column,0]);bounds.push(h.view.getFloat32(h.SP+68,true));}const turbo=h.view.getFloat32(physics+548+column*4,true),engine=h.view.getFloat32(physics+512+column*4,true);return Math.fround(Math.max(Math.fround(engine-turbo),bounds[0])+Math.max(turbo,bounds[1]));});}
 return{h,prepared,snapshot,call,curve,peak,reset,rideBytes,ceilings,physics,carType};
}
module.exports={create,PIN,bits};
