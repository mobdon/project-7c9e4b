'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {world}=require('./fixtures/forward-native-world.cjs'),Registry=require('../extension/forward-native-config.js'),Probe=require('../extension/route-probe.js');
const HASH='e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03';
test('all eight forward profiles bind evaluator guards to their own lookup after stale cells are cleared',async()=>{
 for(const profile of Object.values(Registry.profiles)){
  const f=await world(profile.revision),first=profile.runtime.lookup+4*(0x40d0f0-0x401000),second=profile.runtime.lookup+4*(0x40d380-0x401000);
  if(profile.revision!=='3bdd9959'){assert.equal(f.u(678642880),0);assert.equal(f.u(678645504),0);}
  assert.equal(f.u(first),388);assert.equal(f.u(second),401);assert.equal(f.e.fwg_slot(f.nodeBase),1);
  f.u(f.nodeBase,0x784aa0);assert.equal(f.e.fwg_slot(f.nodeBase),1);f.u(second,0);assert.equal(f.e.fwg_slot(f.nodeBase),0);f.u(second,401);f.u(f.nodeBase,0x784a48);
  assert.equal(f.capture().forwardState,'armed');f.u(first,0);if(profile.revision!=='3bdd9959'){f.u(678642880,388);f.u(678645504,401);}
  assert.equal(f.e.fwg_slot(f.nodeBase),0);assert.equal(f.target(180),180);f.session.stop();
 }
});
test('current route probe is read-only metadata and retains exact hash, permission and commitment fences',async()=>{
 const f=await world('93cfc6e9'),before=Buffer.from(f.data.subarray(0,0x1000000)),options={verified:true,moduleHash:HASH,expectedPace:1.45},sample=Probe.capture(f.memory,options);
 assert.equal(sample.status,'captured');assert.equal(sample.revision,'93cfc6e9');assert.equal(sample.nodeCount,3);assert.equal(sample.cornerCount,0);assert.equal(sample.wholeRaceChecked,false);
 assert.equal(sample.capabilities.nativeCalls,false);assert.equal(sample.capabilities.memoryWrites,false);assert.equal(sample.capabilities.authorizesPacing,false);assert.deepEqual(Buffer.from(f.data.subarray(0,0x1000000)),before);
 assert.equal(Probe.capture(f.memory,{...options,moduleHash:'0'.repeat(64)}).status,'unavailable');f.u(0x850078,8);assert.equal(Probe.capture(f.memory,options).reason,'online-permission-required');f.u(0xd0d100+84,1);assert.equal(Probe.capture(f.memory,{...options,allowNetwork:true}).status,'captured');
 const page=f.nodeBase>>>14,at=f.abi.bitmap+(page>>>3);f.view.setUint8(at,f.view.getUint8(at)&~(1<<(page&7)));assert.equal(Probe.capture(f.memory,{...options,allowNetwork:true}).reason,'uncommitted-page');f.session.stop();
});
test('native policy is available only on the five reviewed exact profiles and retains the distinct verified runtime ABI',()=>{
 const enabled=Object.values(Registry.profiles).filter(p=>p.capabilities.nativePolicy===true);assert.deepEqual(enabled.map(p=>p.revision),['8abf9be8','93cfc6e9','aa2429fb','15e5958f','943ee537']);
 const p=Registry.select(HASH);assert.equal(p.originalTypes,139);assert.equal(p.types.count,0);assert.equal(p.helpers.length,26);assert.equal(p.globals.count,581);assert.equal(p.runtime.maxHorizon,512);
 assert.equal(p.runtime.bitmap,0x297852f0);assert.equal(p.runtime.lookup,0x28706780);assert.equal(p.runtime.nativePolicy.gwin,0x2978d2f0);assert.deepEqual(p.runtime.onlineAddresses,[702897808,705325968,705310588]);
});
test('the current8ab authored policy builder reproduces the corrected folded evaluator cells',async()=>{
 const {config}=await require('../tools/build-native-route-policy.cjs').config(),expected=Object.values(Registry.profiles).find(p=>p.revision==='8abf9be8');
 assert.deepEqual(JSON.parse(JSON.stringify(config)),JSON.parse(JSON.stringify(expected)));
});
