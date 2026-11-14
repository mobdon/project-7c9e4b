'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PROFILES}=require('./paced-profile-config.cjs'),Free=require('./free-braking.cjs'),{fixture,A,B}=require('./free-braking-fixture.cjs');

for(const profile of PROFILES){
 test(profile.revision+' actual native backward approach targets retain the same physical braking budget at P1/1.5/2/3',async()=>{
  let reference;
  for(const pace of [100,150,200,300]){
   const p=pace/100,f=await fixture(profile,{pace,apex:20/p}),raw=f.run(),target=raw.map(v=>Math.fround(v*p));
   assert.equal(f.u(B+60)>0,pace>100,'Actual getter must run inside native backward propagation');
   target.forEach((v,i)=>{const expected=Math.min(60*p,Math.sqrt(400+24*(30-i)*10));assert(Math.abs(v-expected)<.001,JSON.stringify({pace,i,v,expected}));});
   // Restrict the comparison to the shared corner approach below every native
   // straight ceiling. The selected long-straight ceiling remains independent.
   if(!reference)reference=target;else target.forEach((v,i)=>{if(reference[i]<60-1e-4)assert(Math.abs(v-reference[i])<.001,JSON.stringify({pace,i,v,reference:reference[i]}));});
   assert(Math.abs(target.at(-1)-20)<1e-5);
  }
 });
 test(profile.revision+' real getter compensates only boosted ordinary free roam and preserves its ABI',async()=>{
  for(const pace of [150,200,300])for(const backward of [false,true]){
   const a=await fixture(profile,{variant:'baseline',pace}),b=await fixture(profile,{pace});a.prepareGetter(backward);b.prepareGetter(backward);
   const normal=a.getter(),actual=b.getter();assert.equal(actual,normal/(pace/100)**2);assert.equal(b.u(B+60),1);assert.equal(b.u(b.cpu+16),b.sp+4);assert.equal(b.u(b.cpu+32),backward?0x40a723:0x4227a1);
   const slot=b.cpu+72+(b.u(b.cpu+136)&7)*8,x=a.sample(),y=b.sample();for(let i=0;i<y.length;i++)if(x[i]!==y[i])assert((i>=slot&&i<slot+8)||(i>=B+60&&i<B+64),'Unexpected authored write '+i.toString(16));
  }
 });
 test(profile.revision+' sub-native/1x requests and race commands retain existing native bytes and behavior',async()=>{
  const cases=[...[75,80,99,100].map(pace=>({pace})),...[2,3].map(command=>({pace:200,command,mode:1,raceType:1,braking:75}))];
  for(const options of cases){const a=await fixture(profile,{...options,variant:'baseline'}),b=await fixture(profile,options);assert.deepEqual(b.run(),a.run());assert(b.sample().equals(a.sample()),JSON.stringify(options));}
  const a=await fixture(profile,{variant:'baseline',pace:300,corner:false}),b=await fixture(profile,{pace:300,corner:false});assert.deepEqual(b.run(),a.run());assert(b.nodes.every(p=>b.f(p+0x40)===60),'A straight route retains its native ceiling without an endpoint stop');
 });
 test(profile.revision+' ownership, protected modes, native tables and network permission deny extra free-roam compensation',async()=>{
  const changes=[f=>f.u(A+8,1),f=>f.u(0x89e7b0,1),f=>f.u(0x89e7b0,7),f=>f.u(A+4,3),f=>f.u(A+48,180),f=>f.u(A+36,0),f=>f.u(f.driver+0x6e8,f.route+4),f=>f.u(f.driver,0),
   ...[0x89e7d8,0x89e7d9,0x89e7e3].map(p=>f=>f.d.setUint8(p,1)),...[0x890104,0x890108,0x89010c,0x890114].map(p=>f=>f.u(p,1)),f=>f.u(B+48,125),f=>f.u(B+44,75),f=>f.f(0x7a4744,10),f=>f.u(f.grade,4),
   f=>f.u(0x850078,8),f=>f.u(0x866a14,1),f=>f.u(0x8669f4,1),f=>f.d.setUint8(0x89cf69,1),f=>{profile.online.forEach((p,i)=>i===1?f.d.setUint8(p,2):f.u(p,2));},
   f=>{const pg=0x7a4740>>>14,p=profile.bitmap+(pg>>>3);f.d.setUint8(p,f.d.getUint8(p)&~(1<<(pg&7)));},f=>f.u(f.epoch,4)];
  for(const change of changes){const a=await fixture(profile,{variant:'baseline',pace:200,apex:10}),b=await fixture(profile,{pace:200,apex:10});change(a);change(b);assert.deepEqual(b.run(),a.run());assert.equal(b.u(B+60),0);assert(b.sample().equals(a.sample()),'Rejected contexts preserve existing native bytes');}
  for(const portOnly of [false,true]){const f=await fixture(profile,{pace:200,permission:1,apex:10});if(portOnly)profile.online.forEach((p,i)=>i===1?f.d.setUint8(p,2):f.u(p,2));else f.u(0x850078,8);f.run();assert(f.u(B+60)>0);}
 });
 test(profile.revision+' same-sequence command, Stop and ownership-state changes during the native getter deny compensation',async()=>{
  for(const[address,value]of[[B+4,0],[B+4,2],[B+4,3],[A,0],[A+28,0],[B,0],[A+52,0],[A+48,180],[A+8,0],[0xd00030,0],[0x8654a4,3]]){
   const a=await fixture(profile,{variant:'baseline',pace:200,apex:10}),b=await fixture(profile,{pace:200,apex:10});for(const f of[a,b]){f.u(f.mutationAddress,address);f.u(f.mutationValue,value);}assert.deepEqual(b.run(),a.run());assert.equal(b.u(B+60),0);assert(b.sample().equals(a.sample()),JSON.stringify({address,value}));
  }
 });
}

test('free-roam braking builder rejects unknown profiles or changed native getter/prefix inputs',async()=>{
 const profile=PROFILES[0],f=await fixture(profile),P=require('../../work-aa-profile/tools/native-proof.cjs'),fs=require('node:fs'),AI=require('../extension/ai.js'),raw=fs.readFileSync(require('node:path').join(__dirname,'../../research/compatibility-'+profile.revision+'/game.wasm')),body=Buffer.from(AI.patchBrakingBody(P.parse(raw).bodies.get(4497)));
 await assert.rejects(()=>Free.transform({...profile,native:{hash:'unknown'}},body),/Exact reviewed/);const changed=Buffer.from(body);changed[1100]^=1;await assert.rejects(()=>Free.transform(profile,changed),/Native getter|Expected values/);assert.equal(f.built.nativeHashes[4497],Free.NATIVE_HASH);
});
