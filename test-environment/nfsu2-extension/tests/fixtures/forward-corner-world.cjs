'use strict';
const assert=require('node:assert/strict');
const {world}=require('./forward-native-world.cjs');
const Pacing=require('../../extension/forward-pacing.js'),Driving=require('../../extension/forward-driving.js'),{Publisher}=require('../../extension/forward-clamp.js');
async function fixture({revision='3bdd9959',progress=0,kind='dense',scale=1,speed=10,applyTarget}={}){
 const dense=kind==='dense'||kind==='gradual',f=await world(revision,{progress,network:[[0x850078,8]],permission:1,dense,pace:2}),old=f.session;
 const publisher=new Publisher(old.geometry,{installed:true,moduleIdentity:old.moduleIdentity});
 f.session=new Driving.Controller(f.memory,{installed:true,verified:true,moduleHash:f.profile.moduleHash,moduleIdentity:old.moduleIdentity,geometry:old.geometry,publisher});f.session.pacing=Pacing;
 f.options={...f.options,policy:{lateralAcceleration:6,brakingDeceleration:3,cornerFactor:.8,sharpMargin:15,reactionSeconds:.6,marginDistance:8}};if(applyTarget!==undefined)f.options.applyTarget=applyTarget;
 const count=dense?19:3;
 if(kind==='straight')for(let i=0;i<count;i++){const road=f.group+140+56*i;f.f32(road,i*100*scale);f.f32(road+4,0);f.h(road+24,32767);f.h(road+26,0);}
 if(kind==='small-bend')for(let i=0;i<count;i++){const road=f.group+140+56*i,node=f.nodeBase+i*128;f.f32(node+84,i*8);f.f32(road,Math.min(i,1)*4);f.f32(road+4,Math.max(0,i-1)*4);f.h(road+24,i===0?32767:0);f.h(road+26,i===0?0:32767);}
 if(kind==='gradual')for(let i=0;i<count;i++){const road=f.group+140+56*i,node=f.nodeBase+i*128,theta=i*Math.PI/36;f.f32(node+84,i*8);f.f32(road,80*Math.sin(theta));f.f32(road+4,80*(1-Math.cos(theta)));f.h(road+24,Math.round(Math.cos(theta)*32767));f.h(road+26,Math.round(Math.sin(theta)*32767));}
 if(kind==='straight'){f.f32(f.car+0x60,progress*scale);f.f32(f.car+0x64,0);}
 for(let i=0;i<3;i++)f.f32(f.car+0x70+4*i,i===0?speed:0);
 f.complete=()=>{
  const request=f.u(f.abi.base+8),sp=f.stack,ts=sp-4;
  f.u(sp,0x42879f);f.u(f.cpu+32,0x42879f);f.u(f.cpu+16,sp+20);f.u(f.cpu,progress<=100?1:2);f.f32(sp+40,progress);f.f32(sp+56,0);
  f.e.fwg_projection_post(f.cpu,f.route,sp,f.car+0x60,sp+40,sp+56);assert.equal(f.u(f.abi.base+640),request);
  f.u(ts,0x428a6b);f.u(f.cpu+16,ts);const prepared=f.e.fwg_ready(f.cpu,f.route,ts,0);assert.equal(prepared,request);
  f.u(f.cpu+16,ts+24);f.u(f.cpu+32,0x428a6b);f.e.fwg_after(f.cpu,f.route,ts,prepared,1);assert.equal(f.u(f.abi.base+16),request);assert.equal(f.u(f.abi.base+20),0);
  return f.session.update(f.options);
 };
 f.capture=()=>{assert.equal(f.session.update(f.options).forwardState,'requested');return f.complete();};
 f.plan=()=>Pacing.plan(Pacing.windowFromCapture(f.session.geometry.last),f.options.policy);
 return f;
}
module.exports={fixture,Pacing};
