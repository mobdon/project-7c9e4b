'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../..'),EXT=path.join(ROOT,'nfsu2-extension/extension');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const output=path.join(__dirname,'working-source-freeze-v0428-loop.json');
assert(!fs.existsSync(output),'Preserve the existing loop freeze; use another experiment name');
const priorBytes=fs.readFileSync(path.join(__dirname,'../working-source-freeze-v0428.json')),prior=JSON.parse(priorBytes);
const input=path.join(__dirname,'input/extension');
assert.deepEqual(fs.readdirSync(input).sort(),Object.keys(prior.files).sort());
for(const [name,pin]of Object.entries(prior.files))assert.equal(sha(fs.readFileSync(path.join(input,name))),pin.sha256,'Pre-loop input changed: '+name);
const manifest=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json')));assert.equal(manifest.version,'0.42.8');
const scripts=manifest.content_scripts[0].js;
for(const name of scripts)new vm.Script(fs.readFileSync(path.join(EXT,name),'utf8'),{filename:name});
assert(scripts.indexOf('near-miss-top-up.js')>scripts.indexOf('near-miss-control.js'));
assert(scripts.indexOf('near-miss-top-up.js')<scripts.indexOf('page.js'));
const current=Object.fromEntries(fs.readdirSync(EXT).filter(name=>fs.statSync(path.join(EXT,name)).isFile()).map(name=>{const bytes=fs.readFileSync(path.join(EXT,name));return[name,{bytes:bytes.length,sha256:sha(bytes)}];}));
const changed=Object.keys(prior.files).filter(name=>prior.files[name].sha256!==current[name]?.sha256);
const allowed=new Set(['page.js','near-miss-control.js','manifest.json','README.md','CHANGELOG.md','UPDATE-WINDOWS.txt','popup.html','PACKAGE-CHECKSUMS.json']);
assert(changed.every(name=>allowed.has(name)),'Unrelated payload changed: '+changed.filter(name=>!allowed.has(name)).join(','));
const added=Object.keys(current).filter(name=>!prior.files[name]);assert.deepEqual(added,['near-miss-top-up.js']);
const test=JSON.parse(fs.readFileSync(path.join(__dirname,'focused-test-receipt.json')));assert.equal(test.exitCode,0);assert.equal(test.fail,0);
for(const [name,hash]of Object.entries(test.sourceHashes))assert.equal(sha(fs.readFileSync(path.join(ROOT,name))),hash,'Tested source changed: '+name);
const hostFreezeBytes=fs.readFileSync(path.join(__dirname,'source-freeze.json')),hostFreeze=JSON.parse(hostFreezeBytes),host=JSON.parse(fs.readFileSync(path.join(__dirname,'updated-host-check-receipt.json')));
assert.equal(host.sourceFreezeSha256,sha(hostFreezeBytes));assert.equal(hostFreeze.updated.manifestSha256,current['manifest.json'].sha256);
for(const [name,hash]of Object.entries(hostFreeze.updated.scripts))assert.equal(current[name].sha256,hash,'Host-checked source changed: '+name);
assert(host.cases.every(row=>row.stages.every(stage=>stage.marks===0)&&row.boot.cfgPreserved&&row.boot.reportMarkerPreserved));
assert.equal(current['native-synthetic-near-miss-609.js'].sha256,'6afe5ad7939d62c640ab7e81b89b9981db1ae63ad24998b5f0e8cf32c9d306a3');
const cadencePath='work-online-v0427/near-miss-integration/production-synthetic-style-audit/cadence-native-bridge-receipt.json';
const cadenceBytes=fs.readFileSync(path.join(ROOT,cadencePath));
assert.equal(sha(cadenceBytes),'57a163714ca8fe99019b71744af3d2f71844e62fc7387e14300eee4ca0cc0c1b');
assert.equal(JSON.parse(cadenceBytes).passed,true);
const files=Object.fromEntries(Object.entries(current).filter(([name])=>name!=='PACKAGE-CHECKSUMS.json').sort(([a],[b])=>a.localeCompare(b)));
fs.writeFileSync(path.join(EXT,'PACKAGE-CHECKSUMS.json'),JSON.stringify({extension_version:manifest.version,files},null,2)+'\n');
const inventory=fs.readFileSync(path.join(EXT,'PACKAGE-CHECKSUMS.json'));
if(!changed.includes('PACKAGE-CHECKSUMS.json'))changed.push('PACKAGE-CHECKSUMS.json');
const result={checkedAtUtc:new Date().toISOString(),version:manifest.version,sourceOnly:true,packageCreated:false,installationPerformed:false,liveGameSession:false,
 previousManualFreezeSha256:sha(priorBytes),preLoopFilesVerified:Object.keys(prior.files).length,scriptsParsed:scripts.length,payloadFiles:Object.keys(files).length,
 changedExistingFiles:changed,addedFiles:added,focusedTests:test.tests,files:{...files,'PACKAGE-CHECKSUMS.json':{bytes:inventory.length,sha256:sha(inventory)}},
 verification:Object.fromEntries(['focused-test-receipt.json','updated-host-check-receipt.json'].map(name=>[name,sha(fs.readFileSync(path.join(__dirname,name)))])),
 nativeCadenceReceipt:{path:cadencePath,sha256:sha(cadenceBytes)},
 limitations:['Page sampling does not guarantee NOS stays below full until native consumption; a claimed award may still finish.','This source checkpoint does not establish whole-game movement or server acceptance.']};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({version:result.version,scripts:result.scriptsParsed,payloadFiles:result.payloadFiles,tests:test.tests,changed,added},null,2));
