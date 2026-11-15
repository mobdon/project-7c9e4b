'use strict';
// Host contracts only. The bridge suite separately labels all artificial data.
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const EXT=path.resolve(__dirname,'../extension'),RAW='7e383d40180403ce116e0541ad76d1e2b2d81513e9bbd3625cad72575e14dd03';
const P=require('../extension/d739e631-profile.js'),Paced=require('../extension/paced-catchup.js'),Legacy=require('../extension/native-rubberband.js');
const BuildMetadata=require('./d739-game-metadata.json');
test('draft numeric version and visible labels identify the uninstalled draft',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json')));assert.equal(manifest.version,'0.43.1');assert.equal(manifest.version_name,'0.43.1-a3a9a837-draft.1');
 for(const name of ['page.js','popup.html'])assert(fs.readFileSync(path.join(EXT,name),'utf8').includes(manifest.version_name));
});
test('d739e631 metadata is exact and unsupported capability categories stay disabled',()=>{
 assert.equal(P.revision,'d739e631');assert.equal(P.size,40257214);assert.equal(P.hash,RAW);assert(Object.isFrozen(P)&&Object.isFrozen(P.capabilities));
 assert.equal(BuildMetadata.rev,P.revision);assert.equal(BuildMetadata.size,P.size);assert.equal(BuildMetadata.module,'fjg9QBgEA84RbgVBrXbR4r');
 assert.equal(BuildMetadata.pages,16384);assert.equal(BuildMetadata.maxPages,65536);assert.equal(BuildMetadata.guestEnd,0x28000000);
 for(const key of ['fullTuner','nativeForwardLease','nativeTargetFeedback','onlineTraffic','onlinePlayers','onlineRaceCars','onlineRivals','onlinePlayerOutrun'])assert.equal(P.capabilities[key],false);
});
test('d739e631 selects the composed RBA8/RBA9 protocol without aliasing legacy RBA6',()=>{
 assert.equal(Paced.supports(RAW),true);assert.equal(Legacy.supports(RAW),false);assert.equal(Paced.supports('0'.repeat(64)),false);assert.equal(Paced.select('0'.repeat(64)),null);
 const p=Paced.select(RAW);assert.equal(p.inputModuleHash,p.outputModuleHash);assert.equal(p.outputModuleHash,'cb03d474474bd381fb01e0073ff3f5c458bfb53cf5411bbece233f590b5d6b61');
 assert.equal(Paced.mailbox.magic,0x38414252);assert.equal(Paced.mailbox.offsets.ownerSequence,244);assert.equal(Paced.mailbox.extra.base,0xd0d240);assert.equal(Paced.mailbox.extra.size,64);
});
test('all four d739e631 producers precede AI and source interfaces precede profile resolution',()=>{
 const scripts=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json'))).content_scripts[0].js,ai=scripts.indexOf('ai.js');
 for(const name of ['d739e631-profile.js','native-transplant-d739e631.js','native-online-d739e631.js','native-synthetic-near-miss-d739e631.js','source-interfaces.js'])assert(scripts.indexOf(name)>=0&&scripts.indexOf(name)<ai);
 assert.equal(scripts.length,117);assert.equal(ai+1,84);
});
test('draft package inventory and every extension file match fresh checksums',()=>{
 const p=JSON.parse(fs.readFileSync(path.join(EXT,'PACKAGE-CHECKSUMS.json'))),names=fs.readdirSync(EXT).filter(n=>n!=='PACKAGE-CHECKSUMS.json'&&fs.statSync(path.join(EXT,n)).isFile()).sort();
 assert.equal(p.extension_version,'0.43.1');assert.equal(p.version_name,'0.43.1-a3a9a837-draft.1');assert.deepEqual(Object.keys(p.files).sort(),names);
 for(const name of names){const b=fs.readFileSync(path.join(EXT,name));assert.equal(b.length,p.files[name].bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),p.files[name].sha256);}
});
