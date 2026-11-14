'use strict';
// Authored post-sealed correction only. The sealed publisher is an immutable
// input; original native instructions and every other helper remain identical.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const Historical=require('../../work-aa-profile/tools/native-proof.cjs'),P=Object.freeze({...Historical,parse:require('./wasm-inspector-v0388.cjs').inspect}),Build=require('./build-plans.cjs'),RB=require('./native-rubberband.js'),Replace=require('../../work-catchup-wrapper/cache-fix.cjs').replace;
const INDEX=4653,DIR=__dirname;
const oldExpression=`(local.set $severity (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100)))
  (local.set $scaled (f64.div (local.get $cap) (f64.sqrt
   (f64.add (f64.const 1) (f64.div
    (f64.mul (local.get $curvature) (f64.mul (local.get $pacedCap) (local.get $pacedCap)))
    (f64.mul (f64.mul (local.get $grip) (f64.promote_f32 (f32.load (i32.const 0x7a51b8)))) (f64.mul (local.get $severity) (local.get $severity))))))))`;
const newExpression=`(local.set $severity (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100)))
  (local.set $scaled (f64.min (local.get $cap)
   (f64.div (f64.mul (local.get $curveSpeed) (local.get $severity)) (local.get $pace))))`;
async function fragments(){
 const source=fs.readFileSync(path.join(DIR,'../tools/corner-hook.wat'),'utf8'),header=source.slice(0,source.indexOf('(block $skip'));
 assert(source.includes(oldExpression));
 const wabt=await require('../../build-deps/node_modules/wabt')();
 const compile=expr=>{const w=wabt.parseWat('authored-command3-expression.wat',header+expr+'))',{threads:true});w.resolveNames();w.validate({threads:true});const bytes=Buffer.from(w.toBinary({}).buffer),body=[...P.parse(bytes).bodies.values()][0],localEnd=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs').locals(body).end;return body.subarray(localEnd,-1);};
 return{old:compile(oldExpression),replacement:compile(newExpression),sourceHash:P.hash(Buffer.from(source))};
}
async function build(){
 const expression=await fragments(),configs={},modules=[];
 for(const profile of require('./profile-config.cjs').PROFILES){
  const {raw,full:prePublisher}=await Build.composed(profile),before=Buffer.from(await RB.patchModule(prePublisher,{verifiedOriginalHash:profile.native.hash})),parsed=P.parse(before),original=parsed.bodies.get(INDEX),offset=original.indexOf(expression.old);
  assert(offset>=0);assert.equal(original.indexOf(expression.old,offset+1),-1);
  const replacement=Buffer.concat([original.subarray(0,offset),expression.replacement,original.subarray(offset+expression.old.length)]),after=Replace(before,{[INDEX]:replacement}),p=P.parse(after);
  assert.deepEqual([...parsed.bodies].filter(([id,b])=>!b.equals(p.bodies.get(id))).map(([id])=>id),[INDEX]);
  assert.deepEqual(parsed.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]),p.sections.filter(s=>s.id!==10).map(s=>[s.id,s.data]));
  assert(WebAssembly.validate(after));await WebAssembly.compile(after);
  const plan={revision:profile.revision,sourceModuleHash:profile.native.hash,inputModuleHash:P.hash(before),outputModuleHash:P.hash(after),index:INDEX,originalLength:original.length,originalBodyHash:P.hash(original),patchedBodyHash:P.hash(replacement),offset,needle:expression.old.toString('base64'),replacement:expression.replacement.toString('base64')};
  configs[profile.native.hash]=plan;modules.push({...plan,inputBytes:before.length,outputBytes:after.length,modifiedFunctions:[INDEX],originalNativePreserved:true,guardsAndCommandOneTwoPreserved:true,nonCodeSectionsPreserved:true,valid:true,compiled:true,liveVerified:false});
 }
 const product=fs.readFileSync(path.join(DIR,'native-corner-target.template.js'),'utf8').replace('__CONFIGS__',JSON.stringify(configs));assert(!product.includes('__CONFIGS__'));
 fs.writeFileSync(path.join(DIR,'native-corner-target.js'),product);fs.writeFileSync(path.join(DIR,'../extension/native-corner-target.js'),product);
 fs.writeFileSync(path.join(DIR,'corner-target-plans.json'),JSON.stringify(configs,null,2)+'\n');
 const proof={version:'0.38.12',kind:'exact post-sealed command3 corner expression correction',checkedAt:new Date().toISOString(),passed:true,productSha256:P.hash(Buffer.from(product)),builderSha256:P.hash(fs.readFileSync(__filename)),templateSha256:P.hash(fs.readFileSync(path.join(DIR,'native-corner-target.template.js'))),cornerWatSourceSha256:expression.sourceHash,sealedPublisherSha256:P.hash(fs.readFileSync(path.join(DIR,'native-rubberband.js'))),formula:'min(C, sqrt(grip*9.8/abs(curvature))*cornerFactor/max(selectedPace,1)); retain sharpMargin and lower-only native write',originalExpressionBytes:expression.old.length,replacementExpressionBytes:expression.replacement.length,modules,liveVerified:false};
 fs.writeFileSync(path.join(DIR,'corner-target-build.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:true,productSha256:proof.productSha256,modules:modules.map(m=>({revision:m.revision,input:m.inputModuleHash,output:m.outputModuleHash,index:m.index,offset:m.offset})),liveVerified:false}));return{configs,proof};
}
module.exports={INDEX,oldExpression,newExpression,fragments,build};
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
