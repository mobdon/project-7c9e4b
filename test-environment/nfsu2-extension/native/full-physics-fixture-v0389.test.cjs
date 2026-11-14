'use strict';
// Private native fixtures only: no full game, live driving or allocation proof.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../../work-aa-profile/tools/native-proof.cjs'),{fixture,physics,B}=require('./paced-fixture.cjs'),Product=require('./paced-catchup.js');

test('full physics fixture retains separate native behavior and type1 physics objects with the actual constructor vtable',async()=>{
 const raw=fs.readFileSync(path.resolve(__dirname,'../../research/compatibility-943ee537/game.wasm'));
 assert.equal(P.hash(raw),'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391');
 assert.equal(P.guestMap(raw).get(0x5b5cc0).index,12939);
 const parsed=require('../../work-paced-v0388/native/wasm-inspector-v0388.cjs').inspect(raw);
 assert.equal(P.hash(parsed.bodies.get(12939)),'ec8e662bd09085a0df2ab8f00c32e6daeda343b06bf74ba161718c3c352d9a2e');
 const wabt=await require('../../build-deps/node_modules/wabt')(),ctor=P.texts(wabt,raw,[12939])[12939];
 assert.match(ctor,/local\.get 3\s+i32\.const 8005088\s+i32\.store align=1/,'Exact native constructor installs 0x7a25e0');

 const f=await fixture('943ee537'),behavior=f.controller,behaviorBefore=Buffer.from(f.data.subarray(behavior,behavior+0x240)),out=physics(f);
 assert.notEqual(out.physics,behavior);assert.equal(f.u(f.car+0x28),1);assert.equal(f.u(f.car+0x34),out.physics);
 assert.equal(f.u(out.physics),0x7a25e0);assert.equal(f.u(out.physics+0x5c),f.car);
 assert.equal(f.u(f.driver+8),behavior);assert.equal(f.u(f.car+0x30),behavior);assert.equal(f.u(out.physics+4),behavior);assert.deepEqual(Buffer.from(f.data.subarray(behavior,behavior+0x240)),behaviorBefore);
 const M=Math.fround(1.485);f.f32(f.driver+0x770,M);f.f32(f.car+0x468,M);f.u(B+60,100);
 const base=f.policy(13962);f.u(B+60,200);Product.command(f.memory,{enabled:true,percent:200,strength:10,ownerSequence:f.u(B+4),stackingReady:true});
 assert.equal(f.policy(13962),base);assert.equal(f.u(B+76),100);
 const E=Math.fround(Math.fround(M*2)*10),T=Math.fround(E*2);
 assert.equal(f.publish(M),E);assert.equal(Product.readAck(f.memory).tireFactor,T);
 assert(Math.abs(f.policy(13962)/base-2)<1e-5);assert.equal(f.u(B+76),200);
 assert.equal(f.u(f.car+0x34),out.physics);assert.equal(f.u(f.driver+8),behavior);
 assert.equal(f.u(behavior),behaviorBefore.readUInt32LE(0));
 f.u(out.physics,0x7a25b0);assert.equal(Product.readAck(f.memory),null,'Historical wrong receiver class cannot certify full physics');
});
