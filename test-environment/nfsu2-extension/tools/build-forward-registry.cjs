'use strict';
// Rebuild the browser registry from reviewed authored fragments and scalar
// hashes. Inputs contain no original game function bodies or private images.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),REVISIONS=['3bdd9959','d2fa4f4c','cd5b74d5','8abf9be8','93cfc6e9','aa2429fb','15e5958f','943ee537'];
function generate(){
 const profiles={};
 for(const revision of REVISIONS){
  const config=JSON.parse(fs.readFileSync(path.join(ROOT,'integration/forward-native-profiles',revision+'.json'),'utf8'));
  assert.equal(config.schema,'nfsu2-forward-native-patch-v1');assert.equal(config.revision,revision);
  assert.match(config.moduleHash,/^[a-f0-9]{64}$/);assert.equal(config.runtime?.moduleHash,config.moduleHash);
  assert.equal(config.runtime?.revision,revision);assert.equal(config.runtime?.rawAnchorLimit,24);assert.equal(config.runtime?.resampledLimit,48);
  assert.equal(config.runtime?.maxLeaseTicks,400);assert.equal(config.runtime?.ticksPerSecond,4000);
  const nativePolicy=['8abf9be8','93cfc6e9','aa2429fb','15e5958f','943ee537'].includes(revision)&&config.capabilities.nativePolicy===true;
  assert.equal(config.runtime.maxHorizon,nativePolicy?512:184);
  assert.equal(config.helpers.length,nativePolicy?26:22);assert.equal(config.globals.count,nativePolicy?581:571);
  if(nativePolicy)assert.deepEqual(config.runtime.nativePolicy,{version:1,magic:0x31505746,magicOffset:612,requestOffset:616,gripOffset:620,decelOffset:628,gwin:({'8abf9be8':0x2978be80,'93cfc6e9':0x2978d2f0,aa2429fb:695785168,'15e5958f':695785168,'943ee537':695785040})[revision]});
  profiles[config.moduleHash]=config;
 }
 const defaultHash=Object.keys(profiles)[0];
 return '/* Reviewed authored native fragments and hashes only; exact-build registry. */\n(function(root){\n"use strict";\nconst freeze=value=>{if(value&&typeof value==="object"){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};\nconst profiles=freeze(Object.assign(Object.create(null),'+JSON.stringify(profiles)+'));\nconst select=hash=>typeof hash==="string"&&Object.prototype.hasOwnProperty.call(profiles,hash)?profiles[hash]:null;\nconst api=Object.freeze({...profiles["'+defaultHash+'"],profiles,select});\nif(typeof module==="object"&&module.exports)module.exports=api;else root.__NFSU2_FORWARD_NATIVE_CONFIG__=api;\n})(globalThis);\n';
}
if(require.main===module){const output=path.join(ROOT,'extension/forward-native-config.js');fs.writeFileSync(output,generate());console.log(JSON.stringify({file:output,profiles:REVISIONS}));}
module.exports={generate,REVISIONS};
