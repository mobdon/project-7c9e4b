'use strict';
// Actual native route consumer from the final complete .6 artifact; synthetic
// links, authentic difficulty data and controlled native random boundary.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),extension=path.join(root,'extension');
const {fixture}=require('../../work-race-shortcuts/native-fixture.cjs'),{makeHarness}=require('../../work-shortcut-geometry/branch-route-audit.cjs'),{seed}=require('../../work-race-shortcuts/owned-branch-policy.test.cjs');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),B=0xd0d100,C=0xd0d200;
const output=path.join(root,'verification/shortcut-native-v0386-reviewed.json');assert(!fs.existsSync(output));
(async()=>{
 const c=vm.createContext({console,crypto:crypto.webcrypto,WebAssembly,Uint8Array,Int32Array,Float32Array,DataView,ArrayBuffer,SharedArrayBuffer,performance,atob});
 const sourceHashes=Object.fromEntries(fs.readdirSync(extension).sort().map(n=>[n,sha(fs.readFileSync(path.join(extension,n)))]));
 for(const name of JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8')).content_scripts[0].js)if(name!=='page.js')new vm.Script(fs.readFileSync(path.join(extension,name),'utf8'),{filename:name}).runInContext(c);
 const raw=P.pinned(P.CURRENT),base=await c.__NFSU2_AI__.patchBytes(raw),before=Buffer.from(await c.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(base,{verifiedOriginalHash:P.CURRENT.hash})),full=Buffer.from(await c.__NFSU2_SHORTCUT_POLICY__.patchModule(before,{verifiedOriginalHash:P.CURRENT.hash}));
 const pin=JSON.parse(fs.readFileSync(path.join(root,'verification/shortcut-repin-v0386-geometry.json'),'utf8'));assert.equal(sha(before),pin.baseModuleHash);assert.equal(sha(full),pin.outputModuleHash);
 const make=bytes=>makeHarness({buildFixture:(real,stubs)=>fixture(real,stubs,{}, {sourceBytes:bytes})}),h=await make(full),native=await make(before),matrix=[];
 let pace=1;
 const setup=x=>{seed(x);x.f.put(B+60,Math.round(pace*100));x.f.put(C+48,200);x.f.f32(x.D.driver+0x770,1.37);x.f.f32(x.D.car+0x468,1.25);};
 for(pace of[1,1.95,2])for(const identity of[1,2])for(const skill of[0,1,5,9,254,255])for(const type of[0,4,5,7,8,10])for(const random of[.05,.5,.95]){
  const actual=h.runCase({identity,skill,type,random,beforeCall:setup}),effective=identity===1&&skill===254?9:skill,expected=native.runCase({identity,skill:effective,type,random,beforeCall:setup});
  assert.deepEqual([actual.taken,actual.index,actual.selectedLink,actual.drawCount],[expected.taken,expected.index,expected.selectedLink,expected.drawCount]);
  const getter=h.f.call('f12864',{ecx:h.D.driver})|0;assert.equal(getter,skill===254?-2:skill===255?-1:skill);assert.equal(h.f.d.getUint8(h.D.record+0x901),skill);assert.equal(h.f.d.getFloat32(h.D.driver+0x770,true),Math.fround(1.37));assert.equal(h.f.d.getFloat32(h.D.car+0x468,true),1.25);
  matrix.push({pace,identity,skill,type,random,effective,taken:actual.taken,getter});
 }
 pace=1.95;const guards=[];
 for(const[name,change]of[['Stop',x=>x.f.put(B+8,0)],['unowned',x=>x.f.put(B+52,0)],['Street X',x=>x.f.u8(0x89e7e3,1)],['forced Street X',x=>x.f.put(0x89010c,1)],['Drag',x=>x.f.u8(0x89e7d8,1)],['forced Drag',x=>x.f.put(0x890108,1)],['Drift',x=>x.f.u8(0x89e7d9,1)],['online permission withdrawn',x=>{x.f.put(0x850078,8);x.f.put(B+84,0);} ]]){
  const run=target=>target.runCase({identity:1,skill:254,type:0,random:.5,beforeCall:x=>{setup(x);change(x);}}),a=run(h),b=run(native);assert.deepEqual([a.taken,a.index,a.selectedLink],[b.taken,b.index,b.selectedLink]);guards.push({name,taken:a.taken});
 }
 for(const[name,pin]of Object.entries(sourceHashes))assert.equal(sha(fs.readFileSync(path.join(extension,name))),pin);
 const report={version:'0.38.6',completeCandidateSha256:sha(full),baseModuleSha256:sha(before),sourceHashes,sourceUnchanged:true,caseCount:matrix.length+guards.length,matrix,guards,nativePlayerMarkerPreserved:true,driverCacheAndCarFactorPreserved:true,liveVerified:false,limits:['Native route closure in synthetic topology; no real track/checkpoint/race result verification.','Higher pace values test simultaneous policy eligibility, not real shortcut approach speed.','Native probability, category and cached-choice rules remain intact; this does not force every shortcut.']};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({caseCount:report.caseCount,completeCandidateSha256:report.completeCandidateSha256,passed:true,liveVerified:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
