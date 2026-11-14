'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Product=require('./native-rubberband.unsealed-reviewed.js'),K=require('./full-publisher.cjs'),Build=require('./build-plans.cjs'),P=require('../../work-aa-profile/tools/native-proof.cjs');
const F=require('../../work-race-shortcuts/native-fixture.cjs'),Image=require('../../research/current-native-image/evaluator-audit.cjs');
const source=fs.readFileSync(path.join(__dirname,'native-rubberband.unsealed-reviewed.js'),'utf8'),plans=require('./plans.json');
function privateSealedFixture(){
 // The distributable stays unsealed until independent review. This explicit
 // in-memory test variant opens only its plan gate; it is never saved/delivered.
 const hits=[...source.matchAll(/"completePinSealed":false/g)].length;assert.equal(hits,3);
 const c=vm.createContext({crypto:crypto.webcrypto,WebAssembly,Uint8Array,Uint32Array,ArrayBuffer,SharedArrayBuffer,Atomics,atob});new vm.Script(source.replaceAll('"completePinSealed":false','"completePinSealed":true')).runInContext(c);return c.__NFSU2_NATIVE_RUBBERBAND__;
}
test('exact-profile metadata stays frozen and the distributed unsealed plans reject installation',async()=>{
 assert.equal(Product.supports('unknown'),false);assert.equal(Product.select('unknown'),null);const unknown=new Uint8Array([1,2]);assert.equal(await Product.patchModule(unknown,{verifiedOriginalHash:'unknown'}),unknown);
 for(const profile of K.PROFILES){const meta=Product.select(profile.native.hash);assert(Object.isFrozen(meta)&&Object.isFrozen(meta.mailbox)&&Object.isFrozen(meta.mailbox.offsets));assert.equal(meta.sealed,false);assert.equal(meta.minimumPercent,100);assert.equal(meta.maximumPercent,150);assert.equal(meta.fullPhysicsOnly,true);assert.equal(meta.pairedSelectedPace,true);assert.equal(meta.baseModuleHash,profile.completeInputHash);assert.equal(meta.outputModuleHash,plans[profile.native.hash].outputModuleHash);assert(!('sources' in meta));const {full}=await Build.composed(profile);await assert.rejects(()=>Product.patchModule(full,{verifiedOriginalHash:profile.native.hash}),/unsealed/);}
});
test('browser patcher recreates all exact candidate pins and rejects wrong or tampered complete inputs',async()=>{
 const patcher=privateSealedFixture();
 for(const profile of K.PROFILES){const {raw,full}=await Build.composed(profile),saved=Buffer.from(full),patched=Buffer.from(await patcher.patchModule(full,{verifiedOriginalHash:profile.native.hash}));assert.deepEqual(full,saved);assert.equal(P.hash(patched),plans[profile.native.hash].outputModuleHash);assert(WebAssembly.validate(patched));await WebAssembly.compile(patched);const before=P.parse(full),after=P.parse(patched);assert.deepEqual([...before.bodies].filter(([id,b])=>!b.equals(after.bodies.get(id))).map(([id])=>id),[3553]);assert.deepEqual(before.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]),after.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]));const maker=K.create(profile),built=await maker.build();assert.deepEqual(after.bodies.get(3553),built.body);await assert.rejects(()=>patcher.patchModule(raw,{verifiedOriginalHash:profile.native.hash}),/complete input hash/);const tampered=Buffer.from(full);tampered[tampered.length-1]^=1;await assert.rejects(()=>patcher.patchModule(tampered,{verifiedOriginalHash:profile.native.hash}),/complete input hash/);await assert.rejects(()=>patcher.patchModule(patched,{verifiedOriginalHash:profile.native.hash}),/complete input hash/);}
});
test('actual native tire consumer raises a finite combined force capacity, preserves direction and still gives zero at zero load',async()=>{
 const ids=require('../../work-rubberband-native/physics/audit.json').completeDirectClosureFunctions,built=await F.fixture(ids,[],{}),f=F.instance(built),pe=fs.readFileSync(path.resolve(__dirname,'../../research/current-native-image/SPEED2.EXE'));assert.equal(F.sha(pe),'f9dd86c054878ce6276beb07c1fd61874f7a1e4bf1f241b084c65b73e24168a7');for(const s of Image.imageSections(pe).sections)new Uint8Array(f.memory.buffer).set(pe.subarray(s.raw,s.raw+s.rawSize),s.va);
 const wheel=0x330000,params=0x324000,fg=p=>f.d.getFloat32(p,true),surface=fg(0x800f04),scale=fg(0x7fc718);let count=0;
 for(const input of[[100,0],[0,100],[-100,0],[0,-100],[60,80],[-60,-80]])for(const boost of[1,1.25,1.5])for(const load of[0,10]){
  f.zero(wheel,0x200);f.zero(params,0x100);f.put(wheel+0x18,params);f.put(wheel+0x20,F.A.car);f.put(F.A.car+0x424,3);f.u8(wheel+0x11c,1);for(const[p,v]of[[params+0xc,1],[wheel+0x188,1],[wheel+0x184,boost],[wheel+0x180,1],[wheel+0x164,load],[wheel+0x124,input[0]],[wheel+0x128,input[1]]])f.f32(p,v);f.put(0x7fc7fc,1);for(let i=0;i<4;i++)f.f32(wheel+0x70+(i*4+i)*4,1);f.call('f13093',{ecx:wheel,args:[0]});const capacity=surface*scale*boost*load,ratio=Math.min(1,capacity/Math.hypot(...input));for(let i=0;i<2;i++)assert(Math.abs(fg(wheel+0x124+i*4)-input[i]*ratio)<1e-4);assert.equal(fg(wheel+0x188),1);assert.equal(fg(wheel+0x184),boost);count++;
 }
 assert.equal(count,36);
});
