// Local .8 regression retaining all pinned .7 test assertions.
// Historical test SHA28ae3f85cee2c966e05ffe3c1066c14ea678549a3744a142112cc3acad52d6ac stays unchanged.
// Only inspection uses explicit offsets; proof writes use a new .8 filename.
'use strict';
// Actual pinned native corner function and its three exact native callees.
// Controlled ownership/route fixtures prove ABI and target math, not live laps.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Historical=require('../../work-aa-profile/tools/native-proof.cjs'),P=Object.freeze({...Historical,parse:require('./wasm-inspector-v0388.cjs').inspect}),Build=require('./build-plans.cjs'),RB=require('./native-rubberband.js'),Product=require('./native-corner-target.js'),Maker=require('./build-corner-target.cjs'),F=require('../../work-race-shortcuts/native-fixture.cjs');
const PLANS=require('./corner-target-plans.json'),A=0xd0d100,B=0xd0d200,CPU=0xe00000,SP=0xe01000,PLAYER=0xe02000,CAR=0xe03000,DRIVER=0xe06000,RACE=0xe08000,ROUTE=DRIVER+0x370;
const profiles=require('./profile-config.cjs').PROFILES;
let products;
async function getProducts(){return products??=Promise.all(profiles.map(async profile=>{const {raw,full}=await Build.composed(profile),before=Buffer.from(await RB.patchModule(full,{verifiedOriginalHash:profile.native.hash})),after=Buffer.from(await Product.patchModule(before,{verifiedOriginalHash:profile.native.hash}));return{profile,raw,before,after};}));}
async function fixture(bytes){
 const built=await F.fixture([4653,4576,4577,4578],[],{},{sourceBytes:bytes}),memory=new WebAssembly.Memory({initial:256,maximum:65536,shared:true}),data=new Uint8Array(memory.buffer),d=new DataView(memory.buffer),sp=new WebAssembly.Global({value:'i32',mutable:true},712000000),inst=new WebAssembly.Instance(built.module,{env:{memory,sp},fixture:{stub(){throw Error('No stub is permitted');}}});
 const put=(a,v)=>d.setUint32(a,v,true),f32=(a,v)=>d.setFloat32(a,v,true),get=a=>d.getUint32(a,true);
 const setup=({command=3,pace=100,live=pace,percent=95,margin=0,q=1,network=false,permission=network}={})=>{
  data.fill(0);put(CPU+16,SP);put(CPU+12,CAR);put(CPU+24,ROUTE);d.setUint16(CPU+140,0x37f,true);put(SP,0x4228bb);f32(SP+4,1);f32(SP+8,9.8*q/(40*40));f32(SP+12,40);f32(0x7a51b8,9.8);f32(0x7d7d3c,0);
  for(const[p,v]of[[A,0x3749414e],[A+28,0x3749414e],[A+4,2],[A+8,command===1?2:1],[A+12,PLAYER],[A+16,CAR],[A+20,RACE],[A+32,PLAYER],[A+36,CAR],[A+40,RACE],[A+52,1],[A+60,live],[A+84,permission?1:0],[B,0x33524e43],[B+4,command],[B+8,percent],[B+36,margin],[B+44,100],[B+48,pace],[0xd00000,PLAYER],[0xd00030,1],[0x890118,RACE],[0x8654a4,6],[0x89e7b0,command===1?0:1],[PLAYER+4,CAR],[CAR+0x24,3],[CAR+0x2c,DRIVER],[DRIVER+4,CAR],[DRIVER+0x6e8,ROUTE],[RACE,4]])put(p,v);
  if(network)put(0x850078,8);
 };
 const run=()=>{inst.exports.f4653(CPU);return d.getFloat64(CPU+72+(get(CPU+136)&7)*8,true);};
 return{memory,data,d,put,get,f32,setup,run};
}
test('browser post-sealed patcher pins all three complete modules and changes only the authored command3 expression',async()=>{
 const unknown=Uint8Array.of(1);assert.equal(Product.supports('unknown'),false);assert.equal(Product.select('unknown'),null);assert.equal(await Product.patchModule(unknown,{verifiedOriginalHash:'unknown'}),unknown);
 const expression=await Maker.fragments();
 for(const{profile,raw,before,after}of await getProducts()){
  const plan=PLANS[profile.native.hash],a=P.parse(before),b=P.parse(after),old=a.bodies.get(4653),now=b.bodies.get(4653),metadata=Product.select(profile.native.hash);assert(Object.isFrozen(metadata));assert.equal(metadata.command,3);assert.equal(metadata.onlyAuthoredExpression,true);assert.equal(P.hash(before),plan.inputModuleHash);assert.equal(P.hash(after),plan.outputModuleHash);assert(WebAssembly.validate(after));await WebAssembly.compile(after);
  assert.deepEqual([...a.bodies].filter(([id,body])=>!body.equals(b.bodies.get(id))).map(([id])=>id),[4653]);assert.deepEqual(a.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]),b.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]));assert.deepEqual(now.subarray(0,plan.offset),old.subarray(0,plan.offset));assert.deepEqual(now.subarray(plan.offset+expression.replacement.length),old.subarray(plan.offset+expression.old.length));assert.equal(old.subarray(plan.offset,plan.offset+expression.old.length).toString('hex'),expression.old.toString('hex'));
  const native=P.parse(raw).bodies.get(4653),nativeEnd=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs').locals(native).end;assert(now.includes(native.subarray(nativeEnd,-1)),'Complete original native instructions remain contiguous');
  for(const id of[3553,16153,21267,21268,6140,6837,13093])assert.deepEqual(b.bodies.get(id),a.bodies.get(id));
  await assert.rejects(()=>Product.patchModule(raw,{verifiedOriginalHash:profile.native.hash}),/complete input hash/);await assert.rejects(()=>Product.patchModule(after,{verifiedOriginalHash:profile.native.hash}),/complete input hash/);const changed=Buffer.from(before);changed[changed.length-1]^=1;await assert.rejects(()=>Product.patchModule(changed,{verifiedOriginalHash:profile.native.hash}),/complete input hash/);
 }
});
test('actual native command3 keeps open bends, physical curve targets, pace compensation, margin, Stop and legacy modes',async()=>{
 const evidence=[];
 for(const{profile,raw,before,after}of await getProducts()){
  const old=await fixture(before),next=await fixture(after),native=await fixture(raw);let cases=0;
  for(const pace of[100,200])for(const q of[0,.01,1,9])for(const percent of[60,95])for(const margin of[0,25]){
   const options={pace,q,percent,margin};native.setup(options);const nativeSpeed=native.run();old.setup(options);const prior=old.run();next.setup(options);const result=next.run();const k=Math.abs(next.d.getFloat32(SP+8,true)),g=next.d.getFloat32(0x7a51b8,true),curve=k?Math.sqrt(g/k):Infinity,expected=k?Math.min(nativeSpeed,Math.min(40,curve*percent/100/(pace/100))*(1-margin/100*Math.max(0,1-curve/40))):nativeSpeed;
   assert(Math.abs(result-expected)<1e-10,profile.revision+JSON.stringify(options)+' expected '+expected+' got '+result);assert(result<=nativeSpeed+1e-10);assert(result+1e-10>=prior);assert.equal(next.get(CPU+16),SP+4);assert.equal(next.get(CPU+32),0x4228bb);assert.equal(next.get(A+60),pace);assert.equal(next.get(B+4),3);assert.equal(next.get(B+8),percent);
   if(pace===100&&q===1&&percent===95&&margin===0){assert(result>37.9&&result<38.1);assert(prior>27.5&&prior<27.6);}
   if(q===.01&&margin===0)assert.equal(result,40,'Gentle bend retains native straight ceiling');cases++;
  }
  // Both older command paths retain every memory effect, not only ST0.
  for(const command of[1,2])for(const pace of[100,200])for(const q of[.01,1,9])for(const margin of[0,25]){
   const options={command,pace,q,margin,percent:80};old.setup(options);next.setup(options);assert.equal(next.run(),old.run());assert.deepEqual(next.data,old.data);cases++;
  }
  const denials=[f=>f.put(B+4,0),f=>f.put(A+8,0),f=>f.put(A+36,0),f=>f.put(A+4,3),f=>f.put(A+48,180),f=>f.put(B+8,96),f=>f.put(B+36,26),f=>f.put(B+48,201),f=>f.put(A+60,201),f=>f.put(RACE,6),f=>f.put(DRIVER+0x6e8,ROUTE+4),f=>f.d.setUint8(0x89e7e3,1),f=>f.put(0x89010c,1),f=>f.put(0x890104,1),f=>f.put(0x890108,1),f=>f.put(0x850078,8)];
  for(const change of denials){old.setup();next.setup();change(old);change(next);assert.equal(next.run(),old.run());assert.deepEqual(next.data,old.data);cases++;}
  // Explicit online permission still admits the owned ordinary command3 route.
  native.setup({network:true,permission:true,q:9});next.setup({network:true,permission:true,q:9});assert(next.run()<native.run());assert.equal(next.get(B+4),3);assert.equal(next.get(B+8),95);cases++;
  evidence.push({revision:profile.revision,cases,actualNativeBodies:[4653,4576,4577,4578],commandOneTwoCompleteMemoryParity:true,stopAndSafetyParity:true,onlinePermissionRetained:true,tinyBendCeilingRetained:true,thresholdTargetBeforeApprox:27.55,thresholdTargetAfterApprox:38,liveVerified:false});
 }
 const proof={version:'0.38.7',kind:'actual-native offline command3 corner target matrix',passed:true,checkedAt:new Date().toISOString(),productSha256:P.hash(fs.readFileSync(path.join(__dirname,'native-corner-target.js'))),testSha256:P.hash(fs.readFileSync(__filename)),modules:evidence,totalCases:evidence.reduce((n,r)=>n+r.cases,0),liveVerified:false};
 const receipt=path.join(__dirname,'corner-target-tests-v0388-regression.json'),oldProof=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt,'utf8')):null;
 if(!oldProof||JSON.stringify({...oldProof,checkedAt:null})!==JSON.stringify({...proof,checkedAt:null}))fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');
});
