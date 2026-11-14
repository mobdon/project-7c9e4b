'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Capture=require('../extension/race-capture.js'),Config=require('../extension/race-capture-config.js');
const B=Capture.BASE,CBITS=Config.cbits;
function fixture(){
 const memory=new WebAssembly.Memory({initial:11000,maximum:65536,shared:true}),d=new DataView(memory.buffer),u=(p,v)=>d.setUint32(p,v,true),f=(p,v)=>d.setFloat32(p,v,true);
 const cpu=0x100000,stack=0x180000,player=0x110000,car=0x120000,driver=0x130000,route=driver+0x370,race=0x140000;
 new Uint8Array(memory.buffer,CBITS,32768).fill(255);
 [[0x8654a4,6],[0xd00030,1],[0x89e7b0,1],[0xd00000,player],[player+4,car],[car+36,3],[car+44,driver],[driver+4,car],[driver+0x6e8,route],[0x890118,race],[race,4],[0x89e7a0,4101],[0x89e7a4,0],[0x86518c,42],[0x883dac,0x150000],[0x150040,0x4152344c],[0x15008a,4101],[route+4,4],[route+0xd0,1],[cpu+4,route],[cpu+16,stack+8],[cpu+32,0x4281ba],[stack,0x4281ba],[stack+4,car]].forEach(([p,v])=>u(p,v));
 for(let i=0;i<4;i++){const n=0x200000+i*0x100;u(route+8+i*4,n);f(n+0x54,i*50);f(n+0x40,50);}
 const points=[[-50,0],[0,0],[50,0],[50,50],[50,100]],p=route+0xd4;
 points.forEach((xy,i)=>{f(p+i*8,xy[0]);f(p+i*8+4,xy[1]);f(p+40+i*4,i*50);});d.setInt8(p+116,1);for(let i=117;i<=124;i++)d.setInt8(p+i,1);
 const req=()=>{[[0,Capture.MAGIC],[4,1],[8,2],[12,1],[32,player],[36,car],[40,driver],[44,route],[48,race],[52,4101],[56,0],[60,42],[1420,0x150000],[1424,0x4152344c],[1436,0xffffffff]].forEach(([o,v])=>u(B+o,v));};
 const module=new WebAssembly.Module(fs.readFileSync(path.join(__dirname,'race-capture-observer.wasm'))),exports=new WebAssembly.Instance(module,{env:{memory}}).exports;
 return{memory,d,u,f,cpu,stack,player,car,driver,route,race,req,step:()=>exports.step(cpu),get:p=>d.getUint32(p,true)};
}
function outsideHash(f){const b=Buffer.from(f.memory.buffer);return crypto.createHash('sha256').update(b.subarray(0,B)).update(b.subarray(B+2048,0x1000000)).update(b.subarray(CBITS,CBITS+32768)).digest('hex');}
test('native safe-point observer only writes its mailbox and preserves CPU/game bytes',()=>{
 const f=fixture();f.req();const before=outsideHash(f);f.step();assert.equal(f.get(B+16),2);assert.equal(f.get(B+20),0);assert.equal(f.get(B+96),4);assert.equal(f.get(B+100),1);assert.equal(f.get(B+112),1);assert.equal(outsideHash(f),before);
});
test('disabled, odd, acknowledged and foreign-route paths are complete no-ops',()=>{
 for(const change of [f=>f.u(B+12,0),f=>f.u(B+8,3),f=>f.u(B+16,2),f=>f.u(B,0),f=>f.u(f.cpu+4,0x250000)]){
  const f=fixture();f.req();change(f);const before=Buffer.from(new Uint8Array(f.memory.buffer,B,2048));const game=outsideHash(f);f.step();assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,B,2048)),before);assert.equal(outsideHash(f),game);
 }
});
test('mode, owner, identity, capacity and stale-request guards reject without game writes',()=>{
 const changes=[f=>f.u(0x850078,520),f=>f.u(0x866a14,1),f=>f.u(0x89e7d8,1),f=>f.u(0x89e7d9,1),f=>f.u(f.race,3),f=>f.u(f.driver+4,0),f=>f.u(0x89e7a0,4102),f=>f.u(0x86518c,10000),f=>f.u(f.route+0xd0,6),f=>f.u(f.route+4,41),f=>f.u(f.cpu+32,0),f=>f.u(f.stack+4,0x220000)];
 for(const change of changes){const f=fixture();f.req();change(f);const before=outsideHash(f);f.step();assert.equal(f.get(B+16),2);assert.notEqual(f.get(B+20),0);assert.equal(outsideHash(f),before);}
});
test('node range checks every spanned committed page',()=>{
 const f=fixture();f.req();f.u(f.route+8,0x20fff0);const page=0x210000>>>14,at=CBITS+(page>>>3);f.d.setUint8(at,f.d.getUint8(at)&~(1<<(page&7)));f.step();assert.equal(f.get(B+20),1);assert.equal(f.get(B+16),2);
});
test('stale sample markers and unprocessed native tails are explicitly not fresh',()=>{
 for(const change of [f=>f.d.setInt8(f.route+0xd4+117,-1),f=>f.d.setInt8(f.route+0xd4+124,4),f=>f.d.setInt8(f.route+0xd4+116,3)]){const f=fixture();f.req();change(f);f.step();assert.equal(f.get(B+20),0);assert.equal(f.get(B+112),0);}
});
test('controller is opt-in, bounded, exports geometry and leaves control fields unchanged',()=>{
 const f=fixture(),c=new Capture.Controller(f.memory,true,{});assert.equal(c.enabled,false);assert.equal(f.get(B),0);c.start();c.poll(200);assert.ok(c.pending);const before=outsideHash(f);f.step();c.poll(220);assert.equal(c.samples.length,1);assert.equal(c.samples[0].corners[0].geometry.safetyPriority,true);assert.equal(c.samples[0].wholeRaceChecked,false);assert.equal(c.export().wholeRaceChecked,false);assert.equal(outsideHash(f),before);
 assert.equal(c.samples[0].corners[0].analysis.thresholdDegrees,75);assert.equal(c.samples[0].corners[0].analysis.wholeRaceChecked,false);
 c.stop();assert.equal(c.enabled,false);assert.equal(f.get(B+12),0);
});
test('controller rejects occupied mailbox and new owner on reused memory',()=>{
 let f=fixture();f.u(B+200,1);assert.throws(()=>new Capture.Controller(f.memory,true,{}).start(),/occupied/);
 f=fixture();new Capture.Controller(f.memory,true,{}).start();assert.throws(()=>new Capture.Controller(f.memory,true,{}).start(),/owner/);
});
test('timeout and observed event transition stop recording without automatic retries',()=>{
 const f=fixture(),c=new Capture.Controller(f.memory,true,{});c.start();c.poll(200);c.poll(3000);assert.equal(c.enabled,false);assert.match(c.text,/acknowledge/);assert.throws(()=>c.start(),/settled/);
 const g=fixture(),d=new Capture.Controller(g.memory,true,{});d.start();d.poll(200);g.step();d.poll(220);g.u(0x89e7a0,4102);d.poll(400);assert.equal(d.enabled,false);assert.match(d.text,/changed/);
});
function uncommit(f,p){const page=p>>>14,at=CBITS+(page>>>3);f.d.setUint8(at,f.d.getUint8(at)&~(1<<(page&7)));}
test('foreign/unclaimed controllers and changed module identity cannot cancel an owner request',()=>{
 const f=fixture(),owner=new Capture.Controller(f.memory,true,{});owner.start();owner.poll(200);
 const other=new Capture.Controller(f.memory,true,{});assert.throws(()=>other.start(),/owner/);const before=Buffer.from(new Uint8Array(f.memory.buffer,B,2048));other.stop();assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,B,2048)),before);
 owner.moduleIdentity={};owner.stop();assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,B,2048)),before);
 const g=fixture();g.req();new Capture.Controller(g.memory,true,{}).stop();assert.equal(g.get(B+12),1);
});
test('uncommitted mailbox is a complete native no-op and cannot be claimed or cancelled',()=>{
 const f=fixture();f.req();uncommit(f,B);const before=Buffer.from(new Uint8Array(f.memory.buffer,B,2048));f.step();assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,B,2048)),before);
 const c=new Capture.Controller(f.memory,true,{});assert.throws(()=>c.start(),/unavailable/);c.stop();assert.deepEqual(Buffer.from(new Uint8Array(f.memory.buffer,B,2048)),before);
});
test('every fixed-global page is checked by native observer and page controller',()=>{
 for(const p of [0x8654a4,0xd00000,0x89cf69,0x89e7a0,0x850078,0x8669f4,0x890104,0x86518c,0x86346c,0x883dac]){
  const f=fixture();f.req();uncommit(f,p);f.step();assert.equal(f.get(B+20),1);assert.equal(f.get(B+16),2);assert.equal(new Capture.Controller(f.memory,true,{}).context(),null);
 }
});
test('guest sources overlapping the mailbox reject before copying',()=>{
 for(const p of [B,B-16,B+Capture.SIZE-16]){const f=fixture();f.req();f.u(f.route+8,p);f.step();assert.equal(f.get(B+20),1);assert.equal(f.get(B+16),2);assert.equal(new Capture.Controller(f.memory,true,{}).valid(p,0x60),false);}
});
test('race clock restart rejects pending native requests and stops subsequent recording',()=>{
 let f=fixture();f.req();f.u(B+124,1000);f.u(f.race+0x14,0);f.step();assert.equal(f.get(B+20),7);
 f=fixture();f.u(f.race+0x14,1000);const c=new Capture.Controller(f.memory,true,{});c.start();c.poll(200);f.step();c.poll(220);f.u(f.race+0x14,0);c.poll(400);assert.equal(c.enabled,false);assert.equal(c.samples.length,1);
});
test('recording stops at256 windows, disarmed observer leaves game bytes unchanged',()=>{
 const f=fixture(),c=new Capture.Controller(f.memory,true,{});c.start();const before=outsideHash(f);for(let i=0;i<256;i++){c.poll(200+i*200);f.step();c.poll(220+i*200);}assert.equal(c.enabled,false);assert.equal(c.samples.length,256);assert.equal(f.get(B+12),0);assert.equal(outsideHash(f),before);assert.match(c.text,/256/);
});

test('nonmonotonic native sample distances remain unknown rather than an ordered bend',()=>{
 for(const value of [50,-1,NaN]){const f=fixture(),c=new Capture.Controller(f.memory,true,{});c.start();c.poll(200);f.f(f.route+0xd4+48,value);f.step();c.poll(220);assert.equal(c.samples[0].corners[0].status,'unknown');assert.equal(c.samples[0].corners[0].analysis,undefined);}
});
function career(f,index=0){const event=0x230000;f.u(0x863470,event);f.u(event+8,0x12345678);f.u(0x86346c,123);f.d.setInt8(event+0x7e,4);f.u(0x85ef4c,4);for(let i=0;i<4;i++){const h=0x85bab8+i*0xd24;f.u(h,4101);f.u(h+4,0);f.d.setInt16(event+0x18+i*4,4101,true);f.d.setUint8(event+0x1a+i*4,0);}f.u(0x85ef48,0x85bab8+index*0xd24);return event;}
test('career identity captures event hash, bounded region and all four native heat slots',()=>{
 for(let i=0;i<4;i++){const f=fixture();career(f,i);const c=new Capture.Controller(f.memory,true,{});c.start();c.poll(200);assert.ok(c.pending);f.step();c.poll(220);assert.equal(c.samples.length,1,c.text);const s=c.samples[0];assert.equal(s.eventHash,'12345678');assert.equal(s.careerHeat,i+1);assert.equal(s.careerHeatCount,4);assert.equal(s.region,'L4RA');assert.equal(s.startCounter,123);assert.equal(s.heatIdentityVerified,true);assert.equal(s.wholeRaceChecked,false);assert.equal('event' in s,false);assert.equal('heat' in s,false);}
});
test('career event/heat/region/restart changes reject native request without touching game bytes',()=>{
 for(const change of [f=>f.u(0x230008,0xabcdef01),f=>f.u(0x86346c,124),f=>f.u(0x85ef48,0x85bab8+0xd24),f=>f.u(0x85ef48,0x85bab9),f=>f.u(0x85ef4c,5),f=>f.d.setInt8(0x23007e,3),f=>f.u(0x85bab8,4102),f=>f.d.setInt16(0x230018,4102,true),f=>f.d.setUint8(0x23001a,1),f=>f.u(0x150040,0x4252344c),f=>f.u(0x150044,1),f=>f.u(0x85bab8+8,2),f=>f.d.setUint16(0x15008a,4102,true)]){
  const f=fixture();career(f);const c=new Capture.Controller(f.memory,true,{});c.start();c.poll(200);change(f);const before=outsideHash(f);f.step();assert.equal(f.get(B+16),2);assert.equal(f.get(B+20),7);assert.equal(outsideHash(f),before);c.poll(220);assert.equal(c.samples.length,0);assert.equal(c.enabled,false);
 }
});
test('career and TrackInfo source pages are mandatory, including straddled records',()=>{
 for(const p of [0x230000,0x85ef48,0x85bab8,0x150040]){const f=fixture();career(f);const c=new Capture.Controller(f.memory,true,{});c.start();c.poll(200);uncommit(f,p);f.step();assert.equal(f.get(B+20),1);assert.equal(c.context(),null);}
});
test('quick race never reuses stale career heat identity',()=>{
 const f=fixture();f.u(0x85ef48,0xdeadbeef);f.u(0x85ef4c,999);uncommit(f,0x85ef48);const c=new Capture.Controller(f.memory,true,{});c.start();c.poll(200);f.step();c.poll(220);assert.equal(c.samples.length,1,c.text);const s=c.samples[0];assert.equal(s.eventHash,null);assert.equal(s.careerHeat,null);assert.equal(s.heatIdentityVerified,false);assert.equal(s.eventIdentityVerified,false);
});
test('candidate analyzer detects gradual75-degree bends, separates S bends and leaves gaps unknown',()=>{
 const g=require('../extension/race-window-geometry.js'),poly=(turns)=>{let h=0,at=[0,0],points=[at];for(const turn of [0,...turns]){h+=turn*Math.PI/180;at=[at[0]+10*Math.cos(h),at[1]+10*Math.sin(h)];points.push(at);}return{source:'native-race-route',orderVerified:true,points};};
 for(const [turns,priority]of [[Array(16).fill(5),1],[[25,25,25],1],[[25,24,25],0],[[45,45,-45,-45],2]]){const input=poly(turns),result=g.inspectPolyline(input);assert.equal(result.priorityCorners.length,priority);assert.equal(result.wholeRaceChecked,false);}
 const input=poly([45,45]);input.points[1]=input.points[0];const unknown=g.inspectPolyline(input);assert.equal(unknown.status,'incomplete');assert.ok(unknown.gaps.length);assert.equal(g.triple([0,0],[1,0],[0,0]).reversal,true);
});
