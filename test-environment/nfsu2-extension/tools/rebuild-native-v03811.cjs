'use strict';
// Candidate-only reproducible native chain. Builds compile complete modules in
// memory and save authored fragments/pins; never installs or runs a game.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),P=require('../../work-aa-profile/tools/native-proof.cjs');
const ROOT=path.resolve(__dirname,'..'),NATIVE=path.join(ROOT,'native'),VERIFY=path.join(ROOT,'verification'),BASELINE=path.resolve(ROOT,'../work-paced-v03810');
const digest=p=>P.hash(fs.readFileSync(p)),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function run(args){const r=cp.spawnSync(process.execPath,args,{cwd:ROOT,windowsHide:true,encoding:'utf8',maxBuffer:4*1024*1024});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,'Native phase '+args.join(' '));}
function main(){
 const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--npc-manifest');assert.match(args[1],/^[a-f0-9]{64}$/);
 // The executable formulas and runtime CPU fix are exact delivered .10 code.
 const fixed=['full-publisher.cjs','paced-publisher.cjs','mode3-publisher.cjs','paced-guard.cjs','paced-protocol.cjs','free-braking.cjs','native-rubberband.template.js','native-corner-target.template.js','paced-catchup.template.js'];
 const preserved=Object.fromEntries(fixed.map(name=>{assert.equal(digest(path.join(NATIVE,name)),digest(path.join(BASELINE,'native',name)),'Preserved native formula '+name);return['native/'+name,digest(path.join(NATIVE,name))];}));
 run(['tools/compose-native-v03811.cjs',...args]);
 run(['-e',"require('./native/build-plans.cjs').build({sealed:false}).catch(e=>{console.error(e);process.exitCode=1;})"]);
 fs.copyFileSync(path.join(NATIVE,'native-rubberband.js'),path.join(NATIVE,'native-rubberband.unsealed-reviewed.js'));fs.copyFileSync(path.join(NATIVE,'plans.json'),path.join(NATIVE,'plans.unsealed-reviewed.json'));
 const unsealed=fs.readFileSync(path.join(NATIVE,'native-rubberband.js'),'utf8'),candidate=read(path.join(NATIVE,'candidate-build.json'));
 run(['-e',"require('./native/build-plans.cjs').build({sealed:true}).catch(e=>{console.error(e);process.exitCode=1;})"]);
 const sealed=fs.readFileSync(path.join(NATIVE,'native-rubberband.js'),'utf8'),seal=read(path.join(NATIVE,'sealed-build.json'));assert.equal((unsealed.match(/\"completePinSealed\":false/g)||[]).length,3);assert.equal(unsealed.replaceAll('"completePinSealed":false','"completePinSealed":true'),sealed);
 assert.deepEqual(candidate.modules.map(m=>m.candidateOutputSha256),seal.modules.map(m=>m.candidateOutputSha256));
 fs.writeFileSync(path.join(NATIVE,'seal-review-v03811.json'),JSON.stringify({version:'0.38.11',kind:'reconstructed unchanged authored publisher with reviewed upstream pins',unsealedProductSha256:P.hash(Buffer.from(unsealed)),sealedProductSha256:P.hash(Buffer.from(sealed)),onlyThreePlanSealedBooleansChanged:true,nativeCandidateOutputPinsUnchanged:true,preservedFormulaSources:preserved,liveVerified:false},null,2)+'\n');
 run(['native/build-corner-target.cjs']);run(['native/build-paced.cjs']);
 const names=['extension/aa-profile.js','extension/family-profiles.js','extension/forward-native-config.js','extension/shortcut-policy.js','extension/native-rubberband.js','extension/native-corner-target.js','extension/paced-catchup.js','native/profile-config.cjs','native/plans.json','native/corner-target-plans.json','native/paced-plans.json','native/candidate-build.json','native/sealed-build.json','native/corner-target-build.json','native/paced-build.json','native/seal-review-v03811.json','verification/npc-profile-integration-v03811.json','verification/shortcut-repin-v03811.json','tools/compose-native-v03811.cjs','tools/rebuild-native-v03811.cjs'];
 const sourceHashes=Object.fromEntries(names.map(n=>[n,digest(path.join(ROOT,n))])),report={version:'0.38.11',kind:'candidate-only exact authored native composition and downstream pin derivation',passed:true,checkedAt:new Date().toISOString(),npcManifestSha256:args[1],preservedFormulaSources:preserved,sourceHashes,paced:read(path.join(NATIVE,'paced-build.json')),productionChanged:false,desktopChanged:false,fullGameInstantiated:false,liveVerified:false};
 fs.writeFileSync(path.join(VERIFY,'native-composition-v03811.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,receipt:'verification/native-composition-v03811.json',receiptSha256:digest(path.join(VERIFY,'native-composition-v03811.json')),pacedProductSha256:sourceHashes['extension/paced-catchup.js'],liveVerified:false}));return report;
}
module.exports={main};if(require.main===module)try{main();}catch(e){console.error(e);process.exitCode=1;}
