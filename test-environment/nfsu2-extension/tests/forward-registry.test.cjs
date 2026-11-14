'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Registry=require('../extension/forward-native-config.js'),Geometry=require('../extension/forward-geometry.js'),Patcher=require('../extension/forward-native-patcher.js');
test('browser registry is reproducible authored data with eight deeply immutable exact-hash profiles',()=>{
 assert.equal(fs.readFileSync(require.resolve('../extension/forward-native-config.js'),'utf8'),require('../tools/build-forward-registry.cjs').generate());
 assert.deepEqual(Object.values(Registry.profiles).map(p=>p.revision),['3bdd9959','d2fa4f4c','cd5b74d5','8abf9be8','93cfc6e9','aa2429fb','15e5958f','943ee537']);assert(Object.isFrozen(Registry)&&Object.isFrozen(Registry.profiles));
 for(const p of Object.values(Registry.profiles)){assert.equal(Registry.select(p.moduleHash),p);assert(Object.isFrozen(p)&&Object.isFrozen(p.runtime)&&Object.isFrozen(p.runtime.onlineAddresses));assert.equal(p.runtime.rawAnchorLimit,24);assert.equal(p.runtime.resampledLimit,48);assert.equal(p.runtime.maxLeaseTicks,400);assert.equal(p.globals.count,p.capabilities.nativePolicy?581:571);assert.equal(p.helpers.length,p.capabilities.nativePolicy?26:22);assert.equal(p.capabilities.liveVerified,false);}
 for(const hash of [undefined,null,'','__proto__','constructor','f'.repeat(64),Registry.moduleHash.toUpperCase()])assert.equal(Registry.select(hash),null);
});
test('independent controllers retain their exact ABI when another build is selected',()=>{
 const profiles=Object.values(Registry.profiles),controllers=profiles.map(p=>new Geometry.Controller({}, {moduleHash:p.moduleHash,verified:true,installed:true,moduleIdentity:{}}));
 assert.deepEqual(controllers.map(c=>c.abi.bitmap),[0x29779ac0,0x29782880,0x29783a40,0x29783e80,0x297852f0,695752400,695752400,695752272]);
 for(let i=0;i<controllers.length;i++){assert.equal(controllers[i].abi.hash,profiles[i].moduleHash);assert(Object.isFrozen(controllers[i].abi));assert.equal(controllers[i].verified,true);}
 assert.equal(Geometry.abiForHash('f'.repeat(64)),null);assert.equal(new Geometry.Controller({}, {moduleHash:'f'.repeat(64),verified:true}).verified,false);
});

test('patcher rejects caller-supplied fragments even when they name an approved exact hash',async()=>{
 const header=Uint8Array.from([0,97,115,109,1,0,0,0]),profiles=Object.values(Registry.profiles);
 for(const profile of profiles){
  for(const config of [{...profile},JSON.parse(JSON.stringify(profile)),profiles.find(p=>p!==profile)]){
   await assert.rejects(Patcher.patchModule(header,{verifiedOriginalHash:profile.moduleHash,config}),/immutable exact-build registry/);
  }
 }
 await assert.rejects(Patcher.patchModule(header,{verifiedOriginalHash:'f'.repeat(64)}),/Exact reviewed native module hash/);
});
