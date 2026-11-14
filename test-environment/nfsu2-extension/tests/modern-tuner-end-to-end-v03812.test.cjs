'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Fixture=require('../native/fixture-v03812.cjs'),Meta=require('../extension/dyno-native-profile-943.js'),NativeWindow=require('../native/native-window.cjs'),Full=require('../extension/dyno-full.js');
async function liveFixture({highStock=false,commit=true}={}){
 const f=await Fixture.create(Meta),memory=new WebAssembly.Memory({initial:32768,maximum:65536,shared:true}),view=()=>new DataView(memory.buffer),put=(p,x)=>view().setUint32(p,x,true),fill=(p,n,x)=>new Uint8Array(memory.buffer,p,n).fill(x),copy=(p,n)=>new Uint8Array(memory.buffer,p,n).slice();
 for(const r of f.snapshot.ranges)new Uint8Array(memory.buffer,r.address,r.data.length).set(r.data);
 const B=0xd0d300,D=0x839c40,record=0x1400000,player=0x1410000,car=0x1420000,cpu=0x2a010000,sp=0x1430000,tuned=f.snapshot.tuned,ride=f.snapshot.ride,mode=1;
 fill(B,512,0);put(B+32,0x384e5944);put(D,record);put(D+0x900,tuned);put(D+0x9fc,mode);put(D+0xa0c,0);view().setUint8(D+0xb64,1);fill(D+0x904,205,100);fill(record+0x360,205,100);fill(D+0x904+41,41,90);
 put(0xd00030,1);put(0xd00000,player);put(player+4,car);put(car+16,ride);put(car+20,ride-16);put(0x850078,0);put(0x866a14,0);put(0x8669f4,0);view().setUint8(0x89cf69,0);
 put(0x8384c4,0x1440000);put(0x1440008,0x1450000);put(0x14500e4,0x1460000);put(0x146000c,0x1470000);new Uint8Array(memory.buffer,0x1470000,32).set(Buffer.from('UI_PerformanceDyno_MAIN.fng\0'));put(cpu+16,sp);put(sp,0x581475);
 const window=NativeWindow.attach(await NativeWindow.prepare(),memory);window.exports.init();
 if(highStock){const range=f.snapshot.ranges.find(r=>r.address===0x1000000);new Uint8Array(memory.buffer,0x50000000,range.data.length).set(range.data);put(0x8a1ccc,0x50000000);if(commit)window.exports.commit(0x50000000,range.data.length);}
 const frameModule=new WebAssembly.Module(fs.readFileSync(path.resolve(__dirname,'../native/full-tuner-bridge.wasm'))),frame=new WebAssembly.Instance(frameModule,{env:{memory}}),controller=new Full.Controller(memory,true,'943ee537',{prepared:Promise.resolve(f.prepared),module:frameModule});controller.setEnabled(true);assert(controller.canUse());
 const targets=()=>({ride:copy(ride,0x8f0),visits:copy(D+0x904,205),record:copy(record+0x360,205)});
 return{f,memory,view,put,fill,copy,B,D,record,car,player,cpu,sp,tuned,ride,mode,window,frame,controller,targets};
}
for(const highStock of[false,true])test('actual943 capture → private native estimate → selected Stage → exact Restore'+(highStock?' with committed high stock':''),async()=>{
 const x=await liveFixture({highStock}),c=x.controller,before=x.targets(),timer=setInterval(()=>x.frame.exports.step(x.cpu),2);
 try{
  const editor=await c.loadSetup();assert(editor.allowedOffsets.length>=40);assert.deepEqual(x.targets(),before);
  assert.equal(editor.lease.snapshot.ranges.some(r=>r.address===0x50000000),highStock);
  for(const[offset,value]of[[0,140],[9,140],[16,150],[19,140],[21,130],[23,140]])c.setDraft(offset,value);
  const preview=await c.preview();assert(preview.changed);assert(preview.bestResult.peakPowerKw>0);assert.deepEqual(x.targets(),before);
  const staged=await c.apply();assert(staged.staged);assert.deepEqual(x.copy(x.tuned+20,41),preview.best);assert.deepEqual(x.copy(x.D+0x904+41,41),preview.best);assert.deepEqual(x.copy(x.record+0x360,205),before.record);
  const expectedRide=before.ride.slice();expectedRide.set(preview.best,0x398);assert.deepEqual(x.copy(x.ride,0x8f0),expectedRide);
  const expectedVisits=before.visits.slice();expectedVisits.set(preview.best,41);assert.deepEqual(x.copy(x.D+0x904,205),expectedVisits);
  await c.restore();assert.deepEqual(x.targets(),before);
  const result={version:'0.38.12',kind:'actual943 bounded frame capture and private native estimator end-to-end',highStock,carType:27,mode:1,allowed:editor.allowedOffsets.length,measuredMetrics:preview.bestResult,acceptedChanges:preview.changes.length,captureSourceUnchanged:true,previewGameUnchanged:true,stageOnlySelectedCurrentAndVisit:true,savedRecordUnchanged:true,separateVisitRestoredExactly:true,currentNativeClampPreserved:true,liveGameTested:false,fullGameInstantiated:false};
  fs.writeFileSync(path.resolve(__dirname,'../verification/tuner-e2e-'+(highStock?'high':'low')+'-v03812.json'),JSON.stringify(result,null,2)+'\n');
 }finally{clearInterval(timer);c.cancel();}
});
test('943 uncommitted high stock reports exact S42 without changes, then a native commit permits retry',async()=>{
 const x=await liveFixture({highStock:true,commit:false}),c=x.controller,before=x.targets(),timer=setInterval(()=>x.frame.exports.step(x.cpu),2);
 try{await assert.rejects(c.loadSetup(),e=>e.dynoStatus===8&&e.dynoGuard===42);assert.deepEqual(x.targets(),before);x.window.exports.commit(0x50000000,46*0x890);const editor=await c.loadSetup();assert(editor.allowedOffsets.length>=40);assert.deepEqual(x.targets(),before);}finally{clearInterval(timer);c.cancel();}
});
test('943 Stage denies a changed148th installed-part byte and preserves the manual change',async()=>{
 const x=await liveFixture(),c=x.controller,timer=setInterval(()=>x.frame.exports.step(x.cpu),2);
 try{await c.loadSetup();c.setDraft(23,140);await c.preview();x.view().setUint8(x.ride+0x2f0+147,6);const before=x.targets();await assert.rejects(c.apply(),/changed|Preview/i);assert.deepEqual(x.targets(),before);}finally{clearInterval(timer);c.cancel();}
});
