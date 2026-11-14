'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const AA=require('../extension/aa-profile.js'),Family=require('../extension/family-profiles.js');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('two reviewed current identities retain frozen authored controls and explicit address metadata',()=>{
 const profiles=Family.profiles;assert(Object.isFrozen(Family)&&Object.isFrozen(profiles));assert.deepEqual(profiles.map(p=>p.revision),['15e5958f','943ee537']);
 for(const p of profiles){assert(Object.isFrozen(p));assert.equal(p.statusCapacity,64);assert.equal(p.capabilities.nativePaceCacheFix,true);assert.equal(p.capabilities.nativePaceTargetConsumers,true);assert.deepEqual(p.pace.bridge,AA.pace.bridge);assert.deepEqual(p.ownedNos,AA.ownedNos);assert.equal(p.capabilities.travel,false);}
 assert.equal(hash(Buffer.from(AA.bridge)),'48c9c2b02f3b66be369d86bb6b55317c143d8c620b89db9ebf513e57076c99d4');assert.equal(AA.locals,64);assert.equal(AA.capabilities.fullTuner,false);
 assert.deepEqual(profiles[0].bridge,AA.bridge);assert.equal(profiles[0].locals,64);assert.equal(profiles[0].capabilities.fullTuner,false);assert.equal(profiles[0].capabilities.dyno,false);
 assert.deepEqual(profiles[0].wall.onlineAddresses,AA.wall.onlineAddresses);assert.deepEqual(profiles[1].wall.onlineAddresses,[702898672,705326832,705311452]);assert.deepEqual(profiles[1].cars.onlineAddresses,[702898672,705326832,705311452]);
 assert.equal(profiles[0].hash,'f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9');assert.equal(profiles[1].hash,'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391');
});

test('current943 tuner is exactly the independently pinned normal prefix plus the preserved authored tail',()=>{
 // Normal-only evidence receipt SHAd7373f124d605712ea44dcc21a8f9e4e8db0c14e476f6b3780de96d7576fa956.
 // Pin the authored artifact independently; do not call the runtime transformer
 // to generate the expected bridge or drop the original control-tail check.
 const bytes=fs.readFileSync(require.resolve('../native/full-tuner-prefix.json'));
 assert.equal(hash(bytes),'d6dff1cf4ba6e3acc5a6054490fd3d2eae3eeeb0521d666a0199f68f1f77256f');
 const prefix=JSON.parse(bytes),current=Family.profiles[1],original=Buffer.from(AA.bridge),headerBytes=29;
 assert.equal(prefix.oldLocals,64);assert.equal(prefix.totalLocals,170);assert.equal(current.locals,170);
 assert.deepEqual(Buffer.from(current.bridge),Buffer.concat([Buffer.from(prefix.newheader),Buffer.from(prefix.code),original.subarray(headerBytes)]));
 assert.equal(hash(Buffer.from(current.bridge)),'a63882c96b4e351e0462b1a313a04845308c8f88ab66a2745f84eea5e3883049');
 assert.deepEqual(current.fullTuner.baseBridge,AA.bridge);assert.equal(current.fullTuner.baseLocals,64);assert.equal(current.fullTuner.nativeModuleHash,'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391');assert.equal(current.fullTuner.nativeEvaluatorRevision,'943ee537');assert.equal(current.fullTuner.staged,true);
 assert(Object.isFrozen(current.bridge));assert(Object.isFrozen(current.fullTuner));assert(Object.isFrozen(current.fullTuner.baseBridge));
 for(const key of ['fullTuner','dyno','tunerSecondGuestWindow','tunerCurrentNativeClamp'])assert.equal(current.capabilities[key],true,key);
 assert.equal(current.capabilities.tunerOrderedRecipe,false);assert.equal(current.capabilities.travel,false);
});
