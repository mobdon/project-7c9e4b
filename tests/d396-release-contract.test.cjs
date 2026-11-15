'use strict';
// Host contracts only. The bridge suite separately labels all artificial data.
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const EXT=path.resolve(__dirname,'../extension'),RAW='9d7bf57dd30e8eefc8b783c5e1fa7138fd3fed37691452217b718168b486a257';
const P=require('../extension/d396-profile.js'),Paced=require('../extension/paced-catchup.js'),Legacy=require('../extension/native-rubberband.js');
test('draft numeric version and visible labels identify the uninstalled draft',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json')));assert.equal(manifest.version,'0.43.0');assert.equal(manifest.version_name,'0.43.0-d739e631-draft.1');
 for(const name of ['page.js','popup.html'])assert(fs.readFileSync(path.join(EXT,name),'utf8').includes(manifest.version_name));
});
test('d396 metadata is exact and unsupported capability categories stay disabled',()=>{
 assert.equal(P.revision,'d396209f');assert.equal(P.size,39319063);assert.equal(P.hash,RAW);assert(Object.isFrozen(P)&&Object.isFrozen(P.capabilities));
 for(const key of ['fullTuner','nativeForwardLease','nativeTargetFeedback','onlineTraffic','onlinePlayers','onlineRaceCars','onlineRivals','onlinePlayerOutrun'])assert.equal(P.capabilities[key],false);
});
test('d396 selects the composed RBA8/RBA9 protocol without aliasing legacy RBA6',()=>{
 assert.equal(Paced.supports(RAW),true);assert.equal(Legacy.supports(RAW),false);assert.equal(Paced.supports('0'.repeat(64)),false);assert.equal(Paced.select('0'.repeat(64)),null);
 const p=Paced.select(RAW);assert.equal(p.inputModuleHash,p.outputModuleHash);assert.equal(p.outputModuleHash,'6cc53c4e0b78bc7f5a6f5bc972704e528dac4733a607fab4f8e8064afc777782');
 assert.equal(Paced.mailbox.magic,0x38414252);assert.equal(Paced.mailbox.offsets.ownerSequence,244);assert.equal(Paced.mailbox.extra.base,0xd0d240);assert.equal(Paced.mailbox.extra.size,64);
});
test('all four d396 producers precede AI and source interfaces precede profile resolution',()=>{
 const scripts=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json'))).content_scripts[0].js,ai=scripts.indexOf('ai.js');
 for(const name of ['d396-profile.js','native-transplant-d396.js','native-online-d396.js','native-synthetic-near-miss-d396.js','source-interfaces.js'])assert(scripts.indexOf(name)>=0&&scripts.indexOf(name)<ai);
 assert.equal(scripts.length,113);assert.equal(ai+1,80);
});
test('draft package inventory and every extension file match fresh checksums',()=>{
 const p=JSON.parse(fs.readFileSync(path.join(EXT,'PACKAGE-CHECKSUMS.json'))),names=fs.readdirSync(EXT).filter(n=>n!=='PACKAGE-CHECKSUMS.json'&&fs.statSync(path.join(EXT,n)).isFile()).sort();
 assert.equal(p.extension_version,'0.43.0');assert.equal(p.version_name,'0.43.0-d739e631-draft.1');assert.deepEqual(Object.keys(p.files).sort(),names);
 for(const name of names){const b=fs.readFileSync(path.join(EXT,name));assert.equal(b.length,p.files[name].bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),p.files[name].sha256);}
});
