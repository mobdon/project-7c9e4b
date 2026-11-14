'use strict';
// Authored GEOMETRY INPUT only. Native loaders, queries and triangle/cache
// builders produce all sector ownership, contacts, normals, planes and motion.
const assert=require('node:assert/strict');
function chunk(id,data){const b=Buffer.alloc(8+data.length);b.writeUInt32LE(id>>>0);b.writeUInt32LE(data.length,4);data.copy(b,8);return b;}
function make(){
 const directory=Buffer.alloc(4);directory.writeUInt32LE(10);
 const sector=Buffer.alloc(36+4*8);sector.writeInt16LE(101,8);sector.writeInt16LE(4,10);[-128,-128,128,128].forEach((v,i)=>sector.writeFloatLE(v,12+i*4));
 const points=[[-128,-128],[128,-128],[128,128],[-128,128]];points.forEach((p,i)=>p.forEach((v,j)=>sector.writeFloatLE(v,36+i*8+j*4)));
 const metadata=chunk(0x80034150,Buffer.concat([chunk(0x34151,directory),chunk(0x34152,sector)]));
 // With an aligned parent, the first child header is parent+8 and its
 // payload parent+16, satisfying original17004's aligned34131 contract.
 const header=Buffer.alloc(48);header.writeUInt16LE(111,0);header[2]=0;header[3]=0;header.writeUInt16LE(8,4);header.writeUInt16LE(8,6);header.writeFloatLE(-128,8);header.writeFloatLE(-128,12);[-128,-128,-1].forEach((v,i)=>header.writeFloatLE(v,16+i*4));[128,128,1].forEach((v,i)=>header.writeFloatLE(v,32+i*4));
 const packed=Buffer.alloc(32);packed[0]=0;packed[1]=0x90;packed[2]=0;packed[3]=0x10;packed.writeUInt16LE(0,4);packed.writeInt16LE(-1,6);points.forEach((p,i)=>{packed.writeInt16LE(p[0]*8,8+i*2);packed.writeInt16LE(p[1]*8,16+i*2);packed.writeInt16LE(0,24+i*2);});
 const indices=Buffer.alloc(4),membership=Buffer.alloc(4),cells=Buffer.alloc(64*4);membership.writeUInt16LE(0,0);membership.writeUInt16LE(0xffff,2);for(let i=0;i<64;i++){cells.writeUInt16LE(0,i*4);cells.writeUInt16LE(1,i*4+2);}
 const geometry=chunk(0x80034130,Buffer.concat([chunk(0x34131,header),chunk(0x34134,packed),chunk(0x34135,indices),chunk(0x34136,membership),chunk(0x34137,cells)]));
 assert.equal(geometry.readUInt32LE(8),0x34131);assert.equal(geometry.readUInt16LE(16),111);assert.equal(packed.readInt16LE(6),-1);
 return{metadata,geometry,description:{kind:'authored-256m-square-flat-quad-input',authenticTrack:false,streetXTrack4602:false,directoryBase:10,polygonId:101,geometryId:111,lookupSlotExpectedFromSource:1,grid:{width:8,height:8,origin:[-128,-128],cellWidthFromNativeConstant:32,coarseCells:64,membershipEntries:1},points:points.map(p=>[...p,0]),packedInput:{attribute:0,boundsIndices:0x90,flags:0x10,baseZ:0,cacheIndexInitially:-1},unseeded:['native triangle cache','native normal/plane','context section pointer','native contact flags/counts','chassis forces/integration outputs','car pose/velocity after setup']}};
}
module.exports={make};
