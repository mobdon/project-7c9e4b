'use strict';
// Reproducible authored exact8ab policy fragments. No original bodies emitted.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const Sampler=require('./native-route-policy.cjs'),baseHook=require('../../work-forward-online-8ab/tools/hook.cjs');
const Hook={fragment:()=>baseHook.fragment().replace('(local.set $native ','(if (i32.eqz (call $fwg_policy_current)) (then (return (i32.const 0))))\n (local.set $native ')};
const file=path.resolve(__dirname,'../../work-forward-online-8ab/tools/build.cjs'),baseRequire=createRequire(file),ctx={module:{exports:{}},require:n=>n==='./sampler.cjs'?Sampler:n==='./hook.cjs'?Hook:baseRequire(n),__dirname:path.dirname(file),Buffer,console,process};
vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const Builder=ctx.module.exports;
async function config(){
 const emitter=path.resolve(__dirname,'../../work-forward-online-8ab/tools/emit-config.cjs'),req=createRequire(emitter),c={module:{exports:{}},require:n=>n==='./build.cjs'?Builder:n==='./sampler.cjs'?Sampler:req(n),__dirname:path.dirname(emitter),Buffer,console,process};
 vm.runInNewContext(fs.readFileSync(emitter,'utf8'),c,{filename:emitter});const out=await c.module.exports.config(),profile=out.config;
 profile.globals.i32+=Sampler.policyGlobalNames.length;assert.equal(profile.globals.count,581);assert.equal(profile.globals.i32,21);assert.equal(profile.helpers.length,26);
 profile.capabilities.nativePolicy=true;profile.capabilities.originalAnchorCurvature=true;
 profile.runtime={revision:profile.revision,moduleHash:profile.moduleHash,bitmap:0x29783e80,lookup:678452096,onlineAddresses:[703620376,706048544,706033164],guestCeiling:0x28000000,rawAnchorLimit:24,resampledLimit:48,maxLeaseTicks:400,ticksPerSecond:4000,maxHorizon:512,
  nativePolicy:{version:1,magic:Sampler.MAGIC,magicOffset:612,requestOffset:616,gripOffset:620,decelOffset:628,gwin:0x2978be80}};
 return out;
}
if(require.main===module)config().then(({config:c,build:b})=>{const file=path.resolve(__dirname,'../integration/forward-native-profiles/8abf9be8.json');fs.writeFileSync(file,JSON.stringify(c,null,2)+'\n');console.log(JSON.stringify({file,helpers:c.helpers.length,globals:c.globals.count,forwardOnlyBytes:b.output.length,forwardOnlySha256:require('../../work-current-profile/tools/native-proof.cjs').hash(b.output)}));}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={...Builder,config,Sampler};
