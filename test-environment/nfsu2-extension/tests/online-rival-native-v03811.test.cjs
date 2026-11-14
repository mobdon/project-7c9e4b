'use strict';
// Exact current943 contact wrapper and native online/player-slot consumers.
// This is offline contact classification evidence, not live online verification.
const {test,before}=require('node:test'),assert=require('node:assert/strict');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),Adapter=require('../tools/online-rival-cars-v03811.cjs'),Cars=require('../extension/cars.js'),{Engine}=require('../extension/core.js');
const {leb,string,section}=require('../tools/latest-native-utils.cjs'),{locals}=require('../tools/compose-contact-prefixes.cjs');
const baseProfile=require('../extension/family-profiles.js').profiles.find(p=>p.revision==='943ee537');
const A=0xd0d100,B=Cars.BASE,AM=0x3749414e,REC=0x890160,SLOT=703504048,IMPORTS=22997,TARGET=20723;
let candidate,module_,onlineModule,slotModule;
function single(body,type){const types=[2,96,0,1,127,96,2,127,127,1,127],imports=[1,...string('env'),...string('memory'),2,3,...leb(11000),...leb(65536)];return new WebAssembly.Module(Buffer.from([0,97,115,109,1,0,0,0,...section(1,types),...section(2,imports),...section(3,[1,type]),...section(7,[1,...string('run'),0,0]),...section(10,[1,...leb(body.length),...body])]));}
before(async()=>{
 candidate=await Adapter.build(baseProfile);const raw=P.pinned(require('../native/full-publisher.cjs').PROFILES.find(p=>p.revision==='943ee537').native),native=P.parse(raw).bodies;
 onlineModule=single(native.get(22879),0);slotModule=single(native.get(22880),1);
 const old=native.get(22957),prefix=Buffer.from(candidate.combined),patched=Buffer.concat([prefix.subarray(0,-1),old.subarray(locals(old).end)]);
 assert.equal(locals(old).types.length,1);assert.equal(locals(patched).types.length,19);
 const imports=[...leb(IMPORTS+1),...string('env'),...string('memory'),2,3,...leb(11000),...leb(65536)];
 for(let i=0;i<IMPORTS;i++){const spec=i===22879?['online',2]:i===22880?['slot_kind',5]:i===22911?['ghost',3]:i===22913?['dispatch',4]:i===22523||i===22996?['pre'+i,1]:[String(i),0];imports.push(...string(spec[1]?'env':'unused'),...string(spec[0]),0,...leb(spec[1]));}
 const types=[6,96,0,0,96,1,127,0,96,0,1,127,96,1,127,1,127,96,2,127,127,0,96,2,127,127,1,127],code=[2,...leb(patched.length),...patched,...leb(old.length),...old];
 module_=new WebAssembly.Module(Buffer.from([0,97,115,109,1,0,0,0,...section(1,types),...section(2,imports),...section(3,[2,1,1]),...section(7,[2,...string('step'),0,...leb(IMPORTS),...string('original'),0,...leb(IMPORTS+1)]),...section(10,code)]));
});
function fixture({rivals=true,traffic=false,players=false,profile=candidate?.profile}={}){
 const memory=new WebAssembly.Memory({initial:11000,maximum:65536,shared:true}),d=new DataView(memory.buffer),put=(p,v)=>d.setUint32(p,v>>>0,true),get=p=>d.getUint32(p,true),byte=(p,v)=>d.setUint8(p,v);
 const p=0xe00000,car=0xe01000,race=0xe04000,body=0xe05000,other=0xe06000,face=0xe07000,contact=0xe08000,pair=0xe09000,cpu=0xe0a000,stack=0xe0b000,world=0xe0c000;
 for(const[a,v]of [[A,AM],[A+28,AM],[A+4,2],[A+84,1],[0xd00000,p],[0xd00030,1],[0x8654a4,6],[0x850078,1],[0x890118,race],[race,4],[p+4,car],[car+0x3c,body],[body+0x130,car],[other+0x130,face],[face+0x3c,other],[face+0x24,3],[face+0x14,REC],[REC+4,2],[0x890080,world],[world+0x10,2],[world+0x14,1],[world+0x18,2],[world+0x1c,car],[world+0x20,face],[contact+0xc,body],[contact+0x10,other],[contact+0x14,pair],[pair+0x238,body],[pair+0x23c,other],[0x802084,2],[car+0x434,3]])put(a,v);
 d.setFloat32(car+0x440,6000,true);profile.cars.onlineAddresses.forEach((a,i)=>i===1?byte(a,1):put(a,1));
 const engine=new Engine(memory,64,profile.hash),c=new Cars.Controller(memory,true,profile.cars),input={enabled:false,onlineRivals:rivals,onlineTraffic:traffic,onlinePlayers:players,allowNetwork:true,safe:true};
 const online=new WebAssembly.Instance(onlineModule,{env:{memory}}).exports.run,slotKind=new WebAssembly.Instance(slotModule,{env:{memory}}).exports.run;
 let ghost=0,slotCalls=0,pre=0,mutation=null;const dispatch=[];
 const env={memory,online,slot_kind:(car,out)=>{slotCalls++;const v=slotKind(car,out);if(mutation)mutation(slotCalls);return v;},ghost:()=>{ghost++;return 0;},pre22523:()=>{pre++;},pre22996:()=>{pre++;},dispatch:(cpu,target)=>dispatch.push({cpu,target})};
 const unused=new Proxy({},{get:(_,name)=>()=>{throw Error('Unexpected native call '+name);}}),native=new WebAssembly.Instance(module_,{env,unused});
 const update=(extra={})=>c.update({...input,state:engine.state(),...extra});update();
 const step=(original=false)=>{put(cpu+4,contact);put(cpu+16,stack);put(stack,0x12345678);native.exports[original?'original':'step'](cpu);};
 const swap=()=>{put(contact+12,other);put(contact+16,body);put(pair+0x238,other);put(pair+0x23c,body);};
 const outrun=()=>{put(0x89e7b0,7);put(race+0x24,2);for(const [i,carId]of[[0,car],[1,face]]){const r=race+0x30+0x1f0*i;put(r,carId);put(race+0xbd0+4*i,r);put(carId+0x1c,r);}update();};
 return{memory,d,put,get,byte,p,car,race,body,other,face,contact,pair,cpu,stack,world,c,engine,update,step,swap,outrun,online,slotKind,dispatch,ghost:()=>ghost,pre:()=>pre,slotCalls:()=>slotCalls,mutate:fn=>{mutation=fn;}};
}
function rejected(x){x.step();assert.equal(x.get(x.pair+0x240),0);assert.equal(x.ghost(),1);assert.equal(x.pre(),2);assert.deepEqual(x.dispatch,[{cpu:x.cpu,target:TARGET}]);assert.equal(x.c.status().hits,0);assert.equal(x.get(x.cpu+16),x.stack);}
test('current943 NPC mode skips only reciprocal car contacts in either order and preserves Stop/catch-up memory',()=>{
 for(const reverse of[false,true]){const x=fixture();assert.equal(x.engine.state().network,true);assert.equal(x.c.status().onlineRivals,true);assert.equal(x.get(B+36),8);if(reverse)x.swap();const bodies=Buffer.from(x.memory.buffer,x.body,0x3000),reservation=Buffer.from(x.memory.buffer,B+40,24);x.step();assert.equal(x.get(x.pair+0x240),1);assert.equal(x.ghost(),0);assert.equal(x.get(x.cpu+16),x.stack+4);assert.equal(x.get(x.cpu+32),0x12345678);assert.equal(x.c.status().hits,1);assert.equal(x.c.status().trafficHits,0);assert.equal(x.c.status().trafficHitsExact,false);assert.equal(x.c.status().contactCounterScope,'aggregate-car-contacts');assert.equal(Object.hasOwn(x.c.status(),'rivalHits'),false);assert.deepEqual(Buffer.from(x.memory.buffer,x.body,0x3000),bodies);assert.deepEqual(Buffer.from(x.memory.buffer,B+40,24),reservation);x.c.stop();x.put(x.pair+0x240,0);rejected(x);assert.equal(x.get(B+36),0);}
});
test('all22 exact static NPC records are accepted, while copied remote records and misaligned/outside/kind records are refused',()=>{
 for(let i=0;i<22;i++){const x=fixture(),rec=REC+i*0x940;x.put(x.face+0x14,rec);x.put(rec+4,2);x.step();assert.equal(x.get(x.pair+0x240),1);}
 for(const rec of[0,REC-0x940,REC+1,REC+4,REC+22*0x940,0xe10000,0xffffffff]){const x=fixture();if(rec===0xe10000)x.put(rec+4,2);x.put(x.face+0x14,rec);rejected(x);}
 for(const kind of[0,1,3,4,255]){const x=fixture();x.put(REC+4,kind);rejected(x);}
});
test('native active player slots always outrank NPC identity for all64 player slots',()=>{
 for(let i=0;i<64;i++){const x=fixture(),slot=SLOT+1568*i;x.put(slot,3);x.put(slot+76,x.face);assert.notEqual(x.slotKind(x.face,0),-1);const before=Buffer.from(x.memory.buffer,slot,1568);rejected(x);assert.deepEqual(Buffer.from(x.memory.buffer,slot,1568),before);}
});
test('rival, traffic and player switches keep exact independent native categories and aggregate counts honest',()=>{
 for(const rivals of[false,true])for(const traffic of[false,true])for(const players of[false,true])for(const kind of['npc','traffic','player']){const x=fixture({rivals,traffic,players});if(kind==='traffic')x.put(x.face+0x24,4);if(kind==='player'){x.put(SLOT,3);x.put(SLOT+76,x.face);}const skip=kind==='npc'?rivals:kind==='traffic'?traffic:players;x.step();assert.equal(x.get(x.pair+0x240),+skip,JSON.stringify({rivals,traffic,players,kind}));const s=x.c.status();assert.equal(s.hits,+skip);assert.equal(s.playerHits,+(kind==='player'&&players));assert.equal(s.trafficHits,+(kind==='traffic'&&traffic&&!rivals));assert.equal(s.trafficHitsExact,!rivals);}
 const x=fixture({rivals:true,traffic:true,players:true});x.step();x.put(x.face+0x24,4);x.put(x.pair+0x240,0);x.step();assert.equal(x.c.status().hits,2);assert.equal(x.c.status().trafficHits,0);assert.match(x.update({onlineTraffic:true}).trafficReason,/counted with NPC rivals/);
});
test('world count, AI range and unique current membership must agree with exact NPC record identity',()=>{
 const changes=[x=>x.put(0x890080,0),x=>x.put(0x890080,0xffffffff),x=>x.put(x.world+16,0),x=>x.put(x.world+16,23),x=>x.put(x.world+20,0xffffffff),x=>x.put(x.world+20,2),x=>x.put(x.world+24,23),x=>x.put(x.world+24,3),x=>x.put(x.world+0x20,x.face+4),x=>{x.put(x.world+20,0);x.put(x.world+0x1c,x.face);}];
 for(const change of changes){const x=fixture();change(x);rejected(x);}
 for(const driver of[0,1,2,4,5,255]){const x=fixture();x.put(x.face+0x24,driver);rejected(x);}
});
test('NPC Outrun accepts only exact current roster members and never a player duel or unrelated rival',()=>{
 for(const reverse of[false,true]){const x=fixture();x.outrun();if(reverse)x.swap();x.step();assert.equal(x.get(x.pair+0x240),1);assert.equal(x.c.status().onlineRivals,true);}
 const changes=[x=>x.put(x.race+36,1),x=>x.put(x.race+36,7),x=>x.put(x.race+0xbd0,x.race+0x31),x=>x.put(x.race+0xbd0,x.race+0x30+6*0x1f0),x=>x.put(x.race+0xbd4,x.race+0x30),x=>x.put(x.face+0x1c,x.race+0x30),x=>x.put(x.car+0x1c,0),x=>x.put(x.race+0x30,x.car+4),x=>{x.put(SLOT,3);x.put(SLOT+76,x.face);}];
 for(const change of changes){const x=fixture();x.outrun();change(x);rejected(x);}
 for(const kind of['traffic','player']){const x=fixture({traffic:true,players:false});x.outrun();if(kind==='traffic')x.put(x.face+36,4);else{x.put(SLOT,3);x.put(SLOT+76,x.face);}rejected(x);}
});
test('rival mode requires exact new capability, literal true, network permission and safe ordinary driving',()=>{
 for(const onlineRivals of[false,0,1,'true',null]){const x=fixture();x.update({onlineRivals});assert.equal(x.get(B+36),0);rejected(x);}
 for(const extra of[{allowNetwork:false},{safe:false}]){const x=fixture();x.update(extra);assert.equal(x.get(B+8),0);rejected(x);}
 const p=JSON.parse(JSON.stringify(candidate.profile));delete p.cars.onlineRivals;const x=fixture({profile:p});assert.equal(x.get(B+36),0);assert.match(x.update().rivalsReason,/not verified/);rejected(x);
 const changes=[...[1,2,3,4,5,6,8,9,10,255].map(t=>x=>x.put(0x89e7b0,t)),...[8,0x200,0x208].map(v=>x=>x.put(0x850078,v)),...[0x866a14,0x8669f4].map(p=>x=>x.put(p,1)),x=>x.byte(0x89cf69,1),...[0x89e7d8,0x89e7d9,0x89e7e3].map(p=>x=>x.byte(p,1)),...[0x890104,0x890108,0x89010c,0x890114].map(p=>x=>x.put(p,1))];
 for(const change of changes){const x=fixture();change(x);rejected(x);assert.equal(x.update().requested,false);}
});
test('stale, torn, stopped and changed identities fall through the exact unchanged native wrapper',()=>{
 const changes=[x=>x.put(A+84,0),x=>x.put(A+48,180),x=>x.put(A+4,3),x=>x.put(B+4,3),x=>x.put(B+8,0),x=>x.put(B,0),x=>x.put(A+28,0),x=>x.put(x.p+4,x.car+4),x=>x.put(x.body+0x130,x.face),x=>x.put(x.face+0x3c,x.body),x=>x.put(x.pair+0x238,x.other),x=>x.put(x.race,6),x=>x.put(0xd00030,2),x=>x.put(0x802084,3)];
 for(const change of changes){const x=fixture();change(x);rejected(x);}
 for(const mode of[5,6,7,12,13,15,255]){const x=fixture();x.put(B+36,mode);rejected(x);assert.equal(x.c.status().requested,false);}
});
test('fresh final NPC/slot/body/context checks reject state changed during native slot classification',()=>{
 const changes=[x=>x.put(SLOT,3)||x.put(SLOT+76,x.face),x=>x.put(REC+4,1),x=>x.put(x.face+36,4),x=>x.put(x.world+0x20,x.face+4),x=>x.put(A+84,0),x=>x.put(B+4,x.get(B+4)+2),x=>x.put(A+4,x.get(A+4)+2),x=>x.put(x.other+0x130,x.car),x=>x.put(x.face+0x3c,0),x=>x.put(0x850078,8),x=>x.put(0x89e7b0,1),x=>x.put(x.p+4,x.car+4)];
 for(const change of changes){const x=fixture();x.mutate(n=>{if(n===1)change(x);});rejected(x);}
});
test('walls, floors, props and unrelated contacts preserve native calls and never become NPC cars',()=>{
 for(const type of[1,2,3,4,255]){const x=fixture();x.byte(x.other+17,type);rejected(x);}
 const x=fixture();x.put(x.contact+12,x.other);rejected(x);
});
test('existing exclusive Online/LAN race mode remains separate from rival free-roam and Outrun mode',()=>{
 const x=fixture({players:true});x.put(0x850078,8);x.put(0x89e7b0,1);x.put(x.race+36,2);for(const [i,car]of[[0,x.car],[1,x.face]]){const rec=x.race+0x30+i*0x1f0;x.put(rec,car);x.put(x.race+0xbd0+4*i,rec);x.put(car+28,rec);}const s=x.update({onlinePlayers:true});assert.equal(x.get(B+36),4);assert.equal(s.onlineRaceCars,true);assert.equal(s.onlineRivals,false);x.step();assert.equal(x.get(x.pair+0x240),1);assert.equal(x.c.status().playerHits,1);
});
test('actual native player Outrun slots accept current challenge opponents in either order without NPC identity',()=>{
 for(let i=0;i<64;i++)for(const reverse of[false,true]){const x=fixture({rivals:false,players:true}),slot=SLOT+1568*i;x.put(slot,3);x.put(slot+76,x.face);x.put(slot+932,i%2);x.put(slot+1556,i%2);x.put(slot+1536,i%3);x.put(x.face+36,i%5);x.put(x.face+20,0xe10000);x.put(0x890080,0);x.outrun();if(reverse)x.swap();const before=Buffer.from(x.memory.buffer,x.body,0x3000);x.step();assert.equal(x.get(B+36),2);assert.equal(x.get(x.pair+0x240),1);assert.equal(x.ghost(),0);assert.equal(x.get(x.cpu+16),x.stack+4);assert.equal(x.get(x.cpu+32),0x12345678);assert.equal(x.c.status().onlinePlayerOutrun,true);assert.equal(x.c.status().onlineRivals,false);assert.equal(x.c.status().playerHits,1);assert.equal(x.c.status().trafficHits,0);assert.equal(x.c.status().hits,1);assert.deepEqual(Buffer.from(x.memory.buffer,x.body,0x3000),before);}
});
function playerOutrunFixture(){const x=fixture({rivals:false,players:true});x.put(SLOT,3);x.put(SLOT+76,x.face);x.outrun();return x;}
test('player Outrun ignores outsiders, stale/nonactive slots and malformed current-roster identities',()=>{
 const changes=[x=>x.put(SLOT,0),x=>x.put(SLOT,2),x=>x.put(SLOT+76,x.face+4),x=>x.put(x.race+36,1),x=>x.put(x.race+36,7),x=>x.put(x.race+0xbd4,x.race+0x31),x=>x.put(x.race+0xbd4,x.race+0x30+6*0x1f0),x=>x.put(x.race+0xbd4,x.race+0x30),x=>x.put(x.race+0x30+0x1f0,x.face+4),x=>x.put(x.face+28,0),x=>x.put(x.car+28,0)];
 for(const change of changes){const x=playerOutrunFixture();change(x);rejected(x);}
 // A second player may be present in the world without being in this challenge.
 const x=playerOutrunFixture();x.put(x.race+0x30+0x1f0,x.face+0x2000);rejected(x);
});
test('player Outrun stop, opt-out, permission withdrawal and unsupported profile restore the native path',()=>{
 for(const extra of[{onlinePlayers:false},{allowNetwork:false},{safe:false}]){const x=playerOutrunFixture();x.step();assert.equal(x.c.status().playerHits,1);x.update(extra);x.put(x.pair+0x240,0);rejected(x);assert.equal(x.get(B+8),0);assert.equal(x.get(B+36),0);assert.equal(x.c.status().onlinePlayerOutrun,false);}
 const x=playerOutrunFixture();x.step();x.c.stop();x.put(x.pair+0x240,0);rejected(x);assert.equal(x.get(B+36),0);
 const p=JSON.parse(JSON.stringify(candidate.profile));delete p.cars.onlinePlayerOutrun;const y=fixture({rivals:false,players:true,profile:p});y.put(SLOT,3);y.put(SLOT+76,y.face);y.outrun();assert.equal(y.get(B+36),0);rejected(y);
});
test('player Outrun final proof rejects changed slot, roster, permission, body and session after classification',()=>{
 const changes=[x=>x.put(SLOT,0),x=>x.put(SLOT+76,x.face+4),x=>x.put(x.face+28,0),x=>x.put(x.race+0xbd4,x.race+0x30),x=>x.put(A+84,0),x=>x.put(B+4,x.get(B+4)+2),x=>x.put(A+4,x.get(A+4)+2),x=>x.put(x.other+0x130,x.car),x=>x.put(x.face+0x3c,0),x=>x.put(0x850078,8),x=>x.put(0x89e7b0,1),x=>x.put(x.p+4,x.car+4),x=>x.put(A+48,180)];
 for(const change of changes){const x=playerOutrunFixture();x.mutate(n=>{if(n===1)change(x);});rejected(x);}
});
test('player and NPC Outrun use their own opt-ins and counts while all switches can be selected together',()=>{
 for(const npc of[false,true])for(const players of[false,true])for(const rivals of[false,true]){const x=fixture({traffic:true,players,rivals});if(!npc){x.put(SLOT,3);x.put(SLOT+76,x.face);}x.outrun();const expected=npc?rivals:players;x.step();assert.equal(x.get(x.pair+0x240),+expected);assert.equal(x.c.status().playerHits,+(!npc&&players));assert.equal(x.c.status().hits,+expected);assert.equal(x.c.status().onlineTraffic,false);assert.equal(x.get(B+36),(players?2:0)|(rivals?8:0));}
});
test('allthree current authored contact baselines compose independently without extra locals or allocation',async()=>{
 const profiles=[require('../extension/aa-profile.js'),...require('../extension/family-profiles.js').profiles];
 for(const profile of profiles){const b=await Adapter.build(profile);assert.equal(b.receipt.totalLocals,19);assert.equal(b.receipt.mailbox.bytes,40);assert.equal(b.receipt.mailbox.newAllocation,false);assert.equal(b.receipt.liveVerified,false);assert.equal(b.profile.capabilities.onlineRivals,true);assert.equal(b.profile.capabilities.onlinePlayerOutrun,true);assert.equal(b.profile.cars.onlinePlayerOutrun,true);assert.deepEqual(b.profile.wall.onlineAddresses,profile.wall.onlineAddresses);assert.equal(b.profile.hash,profile.hash);}
});
test('candidate profile application is idempotent and rejects changed body pins or contact metadata',()=>{
 const {applyArtifact}=require('../tools/build-online-rival-cars-v03811.cjs'),artifact=require('../integration/online-rival-cars-v03811/943ee537.json');
 const next=applyArtifact(baseProfile,artifact);assert.deepEqual(applyArtifact(next,artifact),next);assert.equal(next.cars.onlineRivals,true);
 for(const mutate of[a=>{a.contact.bridge[50]^=1;},a=>{a.moduleHash='0'.repeat(64);},a=>{a.cars.slotKind++;}]){const altered=JSON.parse(JSON.stringify(artifact));mutate(altered);assert.throws(()=>applyArtifact(baseProfile,altered));}
 const altered=JSON.parse(JSON.stringify(baseProfile));altered.wall.bridge[50]^=1;assert.throws(()=>applyArtifact(altered,artifact));
});
