'use strict';
// One root-reviewed invocation; no retry and no incoming/live network transport.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.resolve(ROOT,p)),sha=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
for(const n of['bounded-started.json','bounded-receipt.json','remote-condition-receipt.json','remote-admission-observations.jsonl','remote-admission-raw.bin'])assert(!fs.existsSync(path.join(__dirname,n)),n);
const contract=JSON.parse(read(path.join(__dirname,'execution-source-contract.json')));assert.equal(contract.rootApprovedForOneBoundedRun,true);assert.equal(contract.unitOnly,true);assert.equal(contract.condition,'current-native-ordered-world-history-4c-v2');assert.equal(contract.boundedMilliseconds,8000);
for(const[p,h]of Object.entries(contract.sourcePins))assert.equal(sha(p),h,p);const before=Object.fromEntries(Object.keys(contract.sourcePins).map(p=>[p,sha(p)])),started=Date.now();
fs.writeFileSync(path.join(__dirname,'bounded-started.json'),JSON.stringify({executionContractSha256:sha(path.join(__dirname,'execution-source-contract.json')),boundedMilliseconds:8000,orderedWorldHistoryEnrollmentUnitOnly:true},null,2)+'\n',{flag:'wx'});
const child=cp.spawnSync(process.execPath,[path.join(__dirname,'probe-current-native-ai.cjs')],{cwd:ROOT,encoding:'utf8',windowsHide:true,timeout:8000,maxBuffer:1024*1024}),elapsedMilliseconds=Date.now()-started;
for(const[p,h]of Object.entries(before))assert.equal(sha(p),h,'Pinned input preserved '+p);const p=path.join(__dirname,'remote-condition-receipt.json'),actual=fs.existsSync(p)?JSON.parse(read(p)):null;
const receipt={kind:'BOUNDED-NATIVE-ORDERED-WORLD-HISTORY-ENROLLMENT',exitCode:child.status,timedOut:child.error?.code==='ETIMEDOUT',elapsedMilliseconds,boundedMilliseconds:8000,stdout:child.stdout,stderr:child.stderr,error:child.error?.message||null,complete:child.status===0&&actual?.complete===true,pinnedInputsUnchanged:true,pinnedFiles:Object.keys(before).length};
fs.writeFileSync(path.join(__dirname,'bounded-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
