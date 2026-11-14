'use strict';
// Independent, read-only reconstruction of the optional post-sealed patch.
// It emits a new scope receipt; it never invokes either builder's write entry.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root);
const P=require('../../work-aa-profile/tools/native-proof.cjs');
const Compose=require('../native/build-plans.cjs'),Publisher=require('../native/native-rubberband.js');
const Product=require('../extension/native-corner-target.js');
const plans=require('../native/corner-target-plans.json'),build=require('../native/corner-target-build.json');
const sealedPin='0505326e2b384b9918899efa936d2e2db3b3cc8ea0da2ddd6ee9ead4d1b6f3ca';
const inputs={aa2429fb:'8e9dad5c36a8d4e9de19656e37f15ac7a23886f6a4afaf710c010e4441d5c114',
 '15e5958f':'4fb939201464f2fdcb117bbfa56ce5c9dff88387aa4fb81deb610cd489b3688b',
 '943ee537':'6d23a0a62c1d133eaf5b64581a213a136d08c47600ae1d298452712e873f8bc2'};
const outputs={aa2429fb:'cc8d3b46da22d6dad1a99de1e1c8c8a28d3782cfcd92d01fe722a7ee4c54baed',
 '15e5958f':'314b47584891c237f8ce7826c3424f3e2c2610131542fdda6564b6e22288db71',
 '943ee537':'73581fa5430fae6e6b2d7276b264deed29d0ec90232c4e6d0b6b402069e086fe'};
const names=['native/build-corner-target.cjs','native/native-corner-target.template.js',
 'native/native-corner-target.js','extension/native-corner-target.js','native/corner-target-plans.json',
 'native/corner-target-build.json','native/native-rubberband.js','integration/review-corner-target-v0387.cjs'];
const source=()=>Object.fromEntries(names.map(n=>[n,P.hash(fs.readFileSync(path.join(root,n)))]));
async function main(){
 const beforeHashes=source(),watPath=path.join(workspace,'nfsu2-extension/tools/corner-hook.wat');
 const wat=fs.readFileSync(watPath,'utf8'),watHash=P.hash(Buffer.from(wat));
 assert.equal(beforeHashes['native/native-rubberband.js'],sealedPin);
 assert.equal(watHash,'93e97f5cc41af6a0c60353fce40a56f77ef9b61d18610a69fc31340385a9af8b');
 assert.equal(beforeHashes['native/native-corner-target.js'],beforeHashes['extension/native-corner-target.js']);
 const template=fs.readFileSync(path.join(root,'native/native-corner-target.template.js'),'utf8');
 assert.equal(fs.readFileSync(path.join(root,'extension/native-corner-target.js'),'utf8'),template.replace('__CONFIGS__',JSON.stringify(plans)));
 assert.equal(build.passed,true);assert.equal(build.productSha256,beforeHashes['extension/native-corner-target.js']);
 assert.equal(build.builderSha256,beforeHashes['native/build-corner-target.cjs']);
 assert.equal(build.templateSha256,beforeHashes['native/native-corner-target.template.js']);
 assert.equal(build.sealedPublisherSha256,sealedPin);assert.equal(build.cornerWatSourceSha256,watHash);
 const wabt=await require('../../build-deps/node_modules/wabt')();
 const expression='(local.set $severity (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100)))\n'+
 '(local.set $scaled (f64.min (local.get $cap) (f64.div (f64.mul (local.get $curveSpeed) (local.get $severity)) (local.get $pace))))';
 const compiled=wabt.parseWat('independent-corner-expression.wat',wat.slice(0,wat.indexOf('(block $skip'))+expression+'))',{threads:true});
 compiled.resolveNames();compiled.validate({threads:true});
 const expressionBody=[...P.parse(Buffer.from(compiled.toBinary({}).buffer)).bodies.values()][0];
 const localEnd=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs').locals(expressionBody).end;
 const expectedExpression=expressionBody.subarray(localEnd,-1);compiled.destroy();
 const unknown=new Uint8Array([1,2]);assert.equal(Product.supports('unknown'),false);assert.equal(Product.select('unknown'),null);
 assert.equal(await Product.patchModule(unknown,{verifiedOriginalHash:'unknown'}),unknown);
 const modules=[];
 for(const profile of require('../native/profile-config.cjs').PROFILES){
  const plan=plans[profile.native.hash],meta=Product.select(profile.native.hash),{raw,full}=await Compose.composed(profile);
  assert(Object.isFrozen(meta));assert.equal(meta.command,3);assert.equal(meta.onlyAuthoredExpression,true);assert.equal(meta.liveVerified,false);
  const sealed=Buffer.from(await Publisher.patchModule(full,{verifiedOriginalHash:profile.native.hash}));
  assert.equal(P.hash(sealed),inputs[profile.revision]);assert.equal(plan.inputModuleHash,inputs[profile.revision]);
  const saved=Buffer.from(sealed),output=Buffer.from(await Product.patchModule(sealed,{verifiedOriginalHash:profile.native.hash}));
  assert.deepEqual(sealed,saved);assert.equal(P.hash(output),outputs[profile.revision]);assert.equal(plan.outputModuleHash,outputs[profile.revision]);
  const a=P.parse(sealed),b=P.parse(output),old=a.bodies.get(4653),next=b.bodies.get(4653);
  assert.deepEqual([...a.bodies].filter(([i,body])=>!body.equals(b.bodies.get(i))).map(([i])=>i),[4653]);
  assert.deepEqual(a.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]),b.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]));
  const needle=Buffer.from(plan.needle,'base64'),replacement=Buffer.from(plan.replacement,'base64');
  assert.deepEqual(replacement,expectedExpression);assert.deepEqual(old.subarray(plan.offset,plan.offset+needle.length),needle);
  assert.equal(old.indexOf(needle),plan.offset);assert.equal(old.indexOf(needle,plan.offset+1),-1);
  assert.deepEqual(next,Buffer.concat([old.subarray(0,plan.offset),expectedExpression,old.subarray(plan.offset+needle.length)]));
  assert.deepEqual(a.bodies.get(3553),b.bodies.get(3553));assert(WebAssembly.validate(output));await WebAssembly.compile(output);
  await assert.rejects(()=>Product.patchModule(raw,{verifiedOriginalHash:profile.native.hash}),/complete input hash mismatch/);
  const tampered=Buffer.from(sealed);tampered[tampered.length-1]^=1;
  await assert.rejects(()=>Product.patchModule(tampered,{verifiedOriginalHash:profile.native.hash}),/complete input hash mismatch/);
  await assert.rejects(()=>Product.patchModule(output,{verifiedOriginalHash:profile.native.hash}),/complete input hash mismatch/);
  const proof=build.modules.find(m=>m.revision===profile.revision);assert(proof);assert.equal(proof.outputModuleHash,P.hash(output));assert.equal(proof.offset,plan.offset);
  modules.push({revision:profile.revision,inputSha256:P.hash(sealed),outputSha256:P.hash(output),modifiedFunctions:[4653],
   exactAuthoredExpressionOnly:true,publisherBody3553Preserved:true,otherBodiesAndNonCodeSectionsPreserved:true,inputUnchanged:true,
   unknownIdentityBypasses:true,wrongTamperedAndAlreadyPatchedInputsReject:true,valid:true,compiled:true,liveGameTested:false});
 }
 assert.deepEqual(source(),beforeHashes);assert.equal(P.hash(fs.readFileSync(watPath)),watHash);
 const report={format:1,version:'0.38.7',kind:'independent post-sealed corner patch scope reconstruction',checkedAt:new Date().toISOString(),
  result:'passed',findings:[],reviewer:'/root/locate_extension',sourceHashes:beforeHashes,cornerWatSourceSha256:watHash,sealedPublisherSha256:sealedPin,
  productSha256:beforeHashes['extension/native-corner-target.js'],modules,sourceUnchanged:true,builderWriteEntryInvoked:false,
  behaviorTestsRunByThisReview:0,liveGameTested:false,limits:['This scope proof does not establish behavioral or live racing results.',
   'Command3 eligibility, margin and lower-only guards were also source-inspected; actual native behavior requires the separately bound matrix.']};
 const target=path.join(root,'integration/native-corner-target-independent-scope-v0387.json');
 fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,receiptSha256:P.hash(fs.readFileSync(target)),modules,liveGameTested:false},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
