'use strict';
// Exact AA authored helper correction. Keep the request/ack/owner/lease checks;
// validate native M separately from selected pace at every helper boundary.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),AA='a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8',file=path.join(root,'extension/forward-native-config.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),registry=require(file),profiles=JSON.parse(JSON.stringify(registry.profiles)),profile=profiles[AA];
const {locals}=require('../../work-logger-v0385/tools/compose-contact-prefixes.cjs'),P=require('../../work-aa-profile/tools/native-proof.cjs');
(async()=>{
 const oldRegistry=require('../../work-logger-v0385/extension/forward-native-config.js'),previous=oldRegistry.select(AA),old=previous.helpers.find(x=>x.name==='fwg_context'),helper=profile.helpers.find(x=>x.name==='fwg_context');assert(old&&helper);assert.deepEqual(helper,old);
 assert.deepEqual(profile.hooks.filter(h=>[13653,13962].includes(h.index)).map(h=>h.index),[13653,13962]);
 const wabt=await require('../../build-deps/node_modules/wabt')();
 async function fragment(expression){const w=wabt.parseWat('authored-clean-native-factor-contract.wat',`(module (import "env" "memory" (memory 256 65536 shared)) (func (param i32) (result i32) (local i32 i32 i32) ${expression}))`,{threads:true});w.resolveNames();w.validate({threads:true});const b=[...P.parse(Buffer.from(w.toBinary({}).buffer)).bodies.values()][0];return b.subarray(locals(b).end,-1);}
 const read='(f32.load offset=1904 (local.get 3))',oldExpression=`(f32.ne ${read} (f32.div (f32.convert_i32_u (i32.load offset=88 (i32.const ${0xd0d800}))) (f32.const 100)))`,newExpression=`(i32.or (f32.lt ${read} (f32.const 0)) (f32.gt ${read} (f32.const 4)))`;
 const needle=await fragment(oldExpression),replacement=await fragment(newExpression),before=Buffer.from(helper.body,'base64'),at=before.indexOf(needle);assert(at>=0);assert.equal(before.indexOf(needle,at+1),-1,'Unique AA selected-factor equality');
 const after=Buffer.concat([before.subarray(0,at),replacement,before.subarray(at+needle.length)]);helper.body=after.toString('base64');profile.capabilities.nativePaceTargetConsumers=true;
 assert.equal(profile.helpers.length,previous.helpers.length);for(let i=0;i<profile.helpers.length;i++)if(profile.helpers[i].name!=='fwg_context')assert.deepEqual(profile.helpers[i],previous.helpers[i]);
 fs.writeFileSync(file,`/* Reviewed authored native fragments and hashes only; exact-build registry. */\n(function(root){'use strict';const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};const profiles=freeze(Object.assign(Object.create(null),${JSON.stringify(profiles)}));const fallback=profiles[${JSON.stringify(registry.moduleHash)}];const api=Object.freeze({...fallback,profiles,select:hash=>Object.prototype.hasOwnProperty.call(profiles,hash)?profiles[hash]:null});if(typeof module==='object'&&module.exports)module.exports=api;root.__NFSU2_FORWARD_NATIVE_CONFIG__=api;})(globalThis);\n`);
 const receipt={kind:'AA-only native clean-factor settlement contract',helper:'fwg_context',functionIndex:profile.importFunctions+profile.definedFunctions+profile.helpers.findIndex(h=>h.name==='fwg_context'),beforeSha256:sha(before),afterSha256:sha(after),authoredOffset:at,oldFragmentBytes:needle.length,newFragmentBytes:replacement.length,finiteCheckPreserved:true,nativeBaseMinimum:0,nativeBaseMaximum:4,selectedPaceAcknowledgementAndLeaseChecksPreserved:true,otherHelpersPreserved:true,nonAAProfilesPreserved:true};
 fs.writeFileSync(path.join(root,'verification/catchup-geometry-contract-v0386.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
