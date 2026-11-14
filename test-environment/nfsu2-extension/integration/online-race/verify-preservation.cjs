'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'../full-tuner-v018'),oldAI=require(base+'/extension/ai.js');delete globalThis.__NFSU2_AI__;const newAI=require(root+'/extension/ai.js');
const fixed=['walls.js','cars.js','current-profile.js','latest-profile.js','next-profile.js','signatures.js','signature-profile.js','signature-profile-latest.js','signature-profile-next.js','core.js','dyno-core.js','dyno.js','dyno-native-profile.js','dyno-native.js','dyno-evaluator.js','dyno-full.js'];
for(const name of fixed)assert.deepEqual(fs.readFileSync(root+'/extension/'+name),fs.readFileSync(base+'/extension/'+name),name);
const manifest=require(root+'/extension/manifest.json'),oldManifest=require(base+'/extension/manifest.json');assert.deepEqual(manifest.content_scripts,oldManifest.content_scripts);assert.equal(manifest.permissions,oldManifest.permissions);assert.ok(!manifest.content_scripts[0].js.includes('native-tuning.js'));
function parse(bytes){let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};const sections=[],functions=[];while(p<bytes.length){const id=bytes[p++],len=u(),start=p,end=p+len;sections.push({id,bytes:bytes.subarray(start,end)});if(id===10){const n=u();for(let i=0;i<n;i++){const size=u();functions.push(bytes.subarray(p,p+size));p+=size;}}p=end;}return {sections,functions};}
(async()=>{
 const bytes=fs.readFileSync(root+'/research/compatibility-93af6ccb/game.wasm'),a=parse(await oldAI.patchBytes(bytes)),b=parse(await newAI.patchBytes(bytes));
 const changed=[];for(let i=0;i<a.functions.length;i++)if(!Buffer.from(a.functions[i]).equals(Buffer.from(b.functions[i])))changed.push(i+37);assert.deepEqual(changed,[4497,4653]);
 for(let i=0;i<a.sections.length;i++){assert.equal(a.sections[i].id,b.sections[i].id);if(a.sections[i].id!==10)assert.deepEqual(a.sections[i].bytes,b.sections[i].bytes);}
 const hashes={};for(const name of ['NFSU2-Driving-Tools-v0.18-Combined-Race-AI.zip','NFSU2-Driving-Tools-v0.20-Full-Preset-Tuner.zip'])hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'..',name))).digest('hex');
 assert.equal(hashes['NFSU2-Driving-Tools-v0.20-Full-Preset-Tuner.zip'],'14b4a4e56b97e4b6234f67319a977b9451920507b55f3ee74e179758688d2f84');
 console.log(JSON.stringify({preservedFiles:fixed,unchangedScriptListAndPermissions:true,changedNativeFunctionsRelativeToV020:changed,allOtherBodiesAndNonCodeSectionsUnchanged:true,fullTunerPrefixAndProfiles:'byte-identical',nativeGripDownforce:'not activated',frozenArchives:hashes},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
