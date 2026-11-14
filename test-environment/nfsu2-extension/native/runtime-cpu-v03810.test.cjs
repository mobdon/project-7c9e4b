'use strict';
// Exact isolated native3553 runs, not live game or a complete physics world.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),I=require('./wasm-inspector-v0388.cjs'),K=require('./paced-publisher.cjs'),Build=require('./build-paced.cjs'),Product=require('./paced-catchup.js');
const OldProduct=require('../../work-paced-v0389/native/paced-catchup.js'),Native=require('../../research/current-native-image/evaluator-audit.cjs'),{fixture,physics,B}=require('./paced-fixture.cjs');
const OldBuild=require('../../work-paced-v0389/native/build-paced.cjs'),OldProfiles=require('../../work-paced-v0389/native/paced-profile-config.cjs'),Replace=require('../../work-catchup-wrapper/cache-fix.cjs').replace;
const CLOSURE=require('../../work-rubberband-native/physics/audit.json').completeDirectClosureFunctions;
const ACTUAL_943_CPU=0x2a6b5098,OTHER_HIGH_CPU=0x28010000;
const digest=file=>P.hash(fs.readFileSync(file));
assert.equal(digest(path.resolve(__dirname,'../../work-paced-v0389/native/paced-catchup.js')),'cc89847cf35637402a182b32e04feec3552a8ad5da39151b90c591280b513a0b');

test('943 native main allocates and initializes the actual344-byte runtime CPU above the guest cap',async()=>{
 const raw=fs.readFileSync(path.resolve(__dirname,'../../research/compatibility-943ee537/game.wasm'));assert.equal(P.hash(raw),'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391');
 const body=I.inspect(raw).bodies.get(23547);assert.equal(P.hash(body),'3685f3472e30a8f3f122db7b073ef0bc3b52422805d2fb720891266aea974a00');
 const wabt=await require('../../build-deps/node_modules/wabt')(),main=P.texts(wabt,raw,[23547])[23547];
 assert.match(main,/i32\.const 0\s+i32\.const 711676056\s+i32\.store offset=695752220/,'Native g_cur_cpu receives the exact main CPU');
 assert.match(main,/i32\.const 711676056\s+i32\.const 0\s+i32\.const 344\s+memory\.fill/,'Native main initializes the entire344-byte CPU');
 assert.equal(ACTUAL_943_CPU,711676056);
});

function instantiate(module,memory){const imports={env:{memory}};for(const item of WebAssembly.Module.imports(module))if(item.kind==='function')(imports[item.module]??={})[item.name]=()=>{throw Error('Unexpected native import');};return new WebAssembly.Instance(module,imports).exports;}

for(const profile of K.PROFILES)test(profile.revision+' actual full publisher rejects high runtime CPU in frozen9 and confirms four tires in current output without guest commitment',async()=>{
 // The .11 contact/TrackInfo preimage is intentionally different. Reproduce
 // frozen .9 using its own exact input, then retain its exact3553 body in an
 // isolated current module so only the CPU guard differs in this comparison.
 const oldProfile=OldProfiles.PROFILES.find(p=>p.revision===profile.revision),oldInput=await OldBuild.compose7(oldProfile),frozen9=Buffer.from(await OldProduct.patchModule(oldInput.full,{verifiedOriginalHash:profile.native.hash}));
 const {full}=await Build.compose7(profile),after=Buffer.from(await Product.patchModule(full,{verifiedOriginalHash:profile.native.hash})),oldBody=I.inspect(frozen9).bodies.get(3553),before=Replace(after,{3553:oldBody}),a=I.inspect(before),b=I.inspect(after);
 assert.deepEqual(a.bodies.get(3553),oldBody,'Exact frozen .9 publisher retained');
 assert.deepEqual([...a.bodies].filter(([id,body])=>!body.equals(b.bodies.get(id))).map(([id])=>id),[3553]);
 assert.equal(a.bodies.size,b.bodies.size);for(let i=0;i<a.sections.length;i++)if(a.sections[i].id!==10)assert.deepEqual(a.sections[i].bytes,b.sections[i].bytes);
 const f=await fixture(profile.revision),out=physics(f),current=f.native,old=instantiate(Native.privateModule(before,new Set(CLOSURE),[3553]).module,f.memory),originalCpu=f.cpu;
 const M=Math.fround(1.485);f.f32(f.driver+0x770,M);f.f32(f.car+0x468,M);f.u(B+60,145);
 for(const cpu of [ACTUAL_943_CPU,OTHER_HIGH_CPU]){
  assert(cpu>=0x28000000&&cpu+344<=f.memory.buffer.byteLength);
  const page=cpu>>>14,at=profile.bitmap+(page>>>3),mask=1<<(page&7);f.view.setUint8(at,f.view.getUint8(at)&~mask);assert.equal(f.view.getUint8(at)&mask,0);
  const bitmapBefore=f.view.getUint8(at),carSource=f.u(f.car+0x468),driverSource=f.u(f.driver+0x770);f.cpu=cpu;
  Product.command(f.memory,{enabled:true,percent:145,strength:3.5,ownerSequence:f.u(B+4),stackingReady:true,forceGeneration:true});
  f.native=old;assert.equal(f.publish(M),M,'Frozen9 original native outputs remain unenhanced');assert.equal(Product.readAck(f.memory),null);assert.equal(Product.readEvidence(f.memory).ackRejectCode,3);
  for(const wheel of out.wheels)assert.equal(f.f32(wheel+0x184),M);
  Product.command(f.memory,{enabled:true,percent:145,strength:3.5,ownerSequence:f.u(B+4),stackingReady:true,forceGeneration:true});
  const E=Math.fround(Math.fround(M*Math.fround(1.45))*3.5),T=Math.fround(E*Math.fround(1.45));f.native=current;assert.equal(f.publish(M),E);
  const evidence=Product.readEvidence(f.memory),ack=evidence.ack;assert(ack);assert.equal(evidence.ackRejectCode,0);assert.equal(ack.physicsKind,1);assert.equal(ack.evidenceKind,'four-tires');assert.equal(ack.wheelHits,4);assert.equal(ack.gripHits,0);assert.equal(ack.powerFactor,E);assert.equal(ack.tireFactor,T);assert.equal(ack.outputsVerified,true);
  for(const wheel of out.wheels)assert.equal(f.f32(wheel+0x184),T);
  assert.equal(f.u(f.car+0x468),carSource);assert.equal(f.u(f.driver+0x770),driverSource);assert.equal(f.view.getUint8(at),bitmapBefore,'CPU needs no guest commitment and does not edit the bitmap');
  Product.command(f.memory,{enabled:false,forceGeneration:true});assert.equal(f.publish(M),M);assert.equal(Product.readAck(f.memory).reason,2);for(const wheel of out.wheels)assert.equal(f.f32(wheel+0x184),M);
 }
 f.cpu=originalCpu;
});

test('exact runtime CPU guard uses full344 extent with widened arithmetic and rejects malformed ranges before any CPU load',async()=>{
 const wabt=await require('../../build-deps/node_modules/wabt')(),wat=`(module (import "env" "memory" (memory 2 65536 shared)) (func (export "eligible") (param $cpu i32) (result i32) ${K.runtimeCpuBound('(local.get $cpu)')}))`,module=wabt.parseWat('runtime-cpu-bound.wat',wat,{threads:true});module.resolveNames();module.validate({threads:true});const bytes=module.toBinary({}).buffer;module.destroy();
 const memory=new WebAssembly.Memory({initial:2,maximum:65536,shared:true}),eligible=new WebAssembly.Instance(new WebAssembly.Module(bytes),{env:{memory}}).exports.eligible,end=memory.buffer.byteLength;
 assert.equal(eligible(65536),1);assert.equal(eligible(end-344),1,'Exact complete state end accepted');
 for(const cpu of [0,65532,65537,end-340,end,end+4,-1,-4,0xffffff00,0xfffffffc])assert.equal(eligible(cpu),0,'Malformed CPU '+cpu.toString(16));
 const highMemory=new WebAssembly.Memory({initial:11000,maximum:65536,shared:true}),high=new WebAssembly.Instance(new WebAssembly.Module(bytes),{env:{memory:highMemory}}).exports.eligible;
 assert.equal(high(ACTUAL_943_CPU),1);assert.equal(high(OTHER_HIGH_CPU),1);assert.equal(high(ACTUAL_943_CPU+1),0);
});
