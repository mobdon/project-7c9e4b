'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Controller,BASE:B,MAGIC:M}=require('../extension/ai.js');
const D=require('../extension/diagnostics.js');
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:300,shared:true}),d=new DataView(memory.buffer);
 const c=new Controller(memory,true,{nativePaceCacheFix:true}),player=0xe00000,car=0xe01000,driver=0xe03000,race=0xe05000;
 const put=(p,v)=>d.setUint32(p,v,true),fput=(p,v)=>d.setFloat32(p,v,true);
 for(const[p,v]of[[B,M],[B+28,M],[B+4,2],[0x8654a4,6],[0xd00030,1],[0xd00000,player],[player+4,car],[0x890118,race],[race,4],[car+0x24,3],[car+0x2c,driver],[driver,0x785370],[driver+4,car]])put(p,v);
 fput(car+0x468,1.37);fput(driver+0x770,2.6715);
 return{memory,d,c,player,car,driver,race,put,fput,sample:()=>c.catchupDiagnostics()};
}
test('actual catchup car and driver factors are sampled separately without writes or address exports',()=>{
 const f=fixture(),before=Buffer.from(f.memory.buffer),s=f.sample();
 assert.equal(s.catchupTelemetryStatus,'sampled');assert.equal(s.catchupDriverVerified,true);
 assert.equal(s.catchupCarFactor,Math.fround(1.37));assert.equal(s.catchupDriverFactor,Math.fround(2.6715));
 assert.deepEqual(Buffer.from(f.memory.buffer),before);assert.deepEqual(Object.keys(s).sort(),['catchupCarFactor','catchupDriverFactor','catchupDriverVerified','catchupTelemetryStatus']);
});
test('catchup observation bounds retain runaway symptoms but never nonfinite or negative factors',()=>{
 const f=fixture();for(const value of[0,1,7.414875,12,32]){f.fput(f.driver+0x770,value);assert.equal(f.sample().catchupDriverFactor,Math.fround(value));}
 for(const value of[-1,32.1,Infinity,NaN]){f.fput(f.driver+0x770,value);const s=f.sample();assert.equal(s.catchupTelemetryStatus,'value-invalid');assert.equal('catchupDriverFactor'in s,false);assert.equal(s.catchupCarFactor,Math.fround(1.37));}
});
test('manual handback still observes the current player car factor without claiming an AI driver factor',()=>{
 const f=fixture();f.put(f.car+0x24,1);const s=f.sample();assert.equal(s.catchupTelemetryStatus,'sampled');assert.equal(s.catchupDriverVerified,false);assert.equal('catchupDriverFactor'in s,false);assert.equal(s.catchupCarFactor,Math.fround(1.37));
});
for(const [name,change,status]of[
 ['unsupported profile',f=>f.c.capabilities={},'unsupported'],['unavailable module',f=>f.c.available=false,'unavailable'],
 ['missing mailbox',f=>f.put(B+28,0),'mailbox-unready'],['odd publication',f=>f.put(B+4,3),'mailbox-unready'],
 ['invalid player',f=>f.put(0xd00000,0xffffffff),'context-invalid'],['invalid car',f=>f.put(f.player+4,0xfffffff0),'context-invalid'],
 ['unaligned player',f=>f.put(0xd00000,f.player+1),'context-invalid'],['foreign player',f=>f.put(f.player+16,1),'context-invalid'],
 ['menu',f=>f.put(0x8654a4,3),'context-invalid'],['two local players',f=>f.put(0xd00030,2),'context-invalid'],
])test('catchup reader fails closed: '+name,()=>{const f=fixture();change(f);assert.deepEqual(f.sample(),{catchupTelemetryStatus:status});});
for(const [name,address,change]of[
 ['publication',f=>4,f=>f.put(B+4,4)],['car identity',f=>f.car+0x468,f=>f.put(f.player+4,f.car+4)],
 ['driver factor',f=>f.driver+0x770,f=>f.fput(f.driver+0x770,2)],['race identity',f=>f.car+0x468,f=>f.put(0x890118,f.race+4)],
])test('catchup reader rejects changing '+name,()=>{const f=fixture(),read=name==='publication'?f.c.read.bind(f.c):f.c.u32.bind(f.c);let done=false;const wrapper=p=>{const value=read(p);if(p===address(f)&&!done){done=true;change(f);}return value;};if(name==='publication')f.c.read=wrapper;else f.c.u32=wrapper;assert.deepEqual(f.sample(),{catchupTelemetryStatus:'context-changed'});});
test('logger retains separate factors, statuses and nulls without allowing arbitrary fields',()=>{
 let at=1000;const log=D.create({clock:()=>at,version:'0.38.6'});log.trace({ready:true,driving:true,...fixture().sample(),catchupCarPointer:0xe01000,secret:'SECRET'});
 const t=JSON.parse(log.exportText()).raceTrace,row=Object.fromEntries(t.columns.map((k,i)=>[k,t.rows[0][i]]));
 assert.equal(row.catchupDriverFactor,2.671);assert.equal(row.catchupCarFactor,1.37);assert.equal(row.catchupTelemetryStatus,'sampled');assert.doesNotMatch(log.exportText(),/SECRET|Pointer/);
 at+=250;log.trace({ready:true,driving:true,catchupTelemetryStatus:'value-invalid',catchupDriverFactor:Infinity});const latest=JSON.parse(log.exportText()).raceTrace;assert.equal(latest.rows.at(-1)[latest.columns.indexOf('catchupDriverFactor')],null);
});
test('new trace columns restore prior .5 evidence without promoting it to current factor readings',()=>{
 const old=require('../../work-logger-v0385/extension/diagnostics.js'),values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const prior=old.create({storage,clock:()=>1000,version:'0.38.5'});prior.trace({ready:true,driving:true,nativeBrake:.278,nativeRoadTarget:20});prior.exportText();
 const next=D.create({storage,clock:()=>2000,version:'0.38.6'}),t=JSON.parse(next.exportText()).raceTrace,row=Object.fromEntries(t.columns.map((k,i)=>[k,t.rows[0][i]]));
 assert.equal(t.restoredFromSameTab,true);assert.equal(row.version,'0.38.5');assert.equal(row.nativeBrake,.278);assert.equal(row.nativeRoadTarget,20);assert.equal(row.catchupCarFactor,null);assert.equal(row.catchupTelemetryStatus,null);
});
