'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../../..');
const files=[
 'near-miss-control.test.cjs','near-miss-events.test.cjs','near-miss-page.test.cjs','near-miss-top-up.test.cjs',
 'synthetic-near-miss-bridge.test.cjs','synthetic-near-miss-loader.test.cjs',
 'startup-containment.test.cjs','worker-module-loader.test.cjs','worker-module-page.test.cjs',
 'module-status.test.cjs','nos-clock.test.cjs','diagnostics-page.test.cjs','diagnostics-driving-history.test.cjs'
].map(name=>'nfsu2-extension/tests/'+name);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sources=[...files,...['near-miss-control.js','near-miss-events.js','near-miss-top-up.js','page.js','ai.js','core.js','native-synthetic-near-miss-609.js'].map(name=>'nfsu2-extension/extension/'+name)];
const hashes=Object.fromEntries(sources.map(name=>[name,sha(fs.readFileSync(path.join(ROOT,name)))]));
const args=['--test','--test-reporter=tap',...files];
const run=spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
const log=(run.stdout||'')+(run.stderr||'');
fs.writeFileSync(path.join(__dirname,'focused-tests.tap'),log);
const counts=Object.fromEntries(['tests','pass','fail','skipped','cancelled','todo'].map(key=>[key,Number(log.match(new RegExp('^# '+key+' (\\d+)$','m'))?.[1]??-1)]));
for(const [name,hash]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(ROOT,name))),hash,'Source changed during focused checks: '+name);
const receipt={checkedAtUtc:new Date().toISOString(),runtime:process.version,command:['node',...args],exitCode:run.status,error:run.error?String(run.error):null,...counts,
 sourceHashes:hashes,logSha256:sha(log),sourceOnly:true,gameSessionStarted:false,
 limitations:['These focused checks are not a full repository test run.','Controller/service tests include synthetic receipt fixtures; native execution is recorded in its separate receipt.','No Chrome session, account status or server acceptance was tested.']};
fs.writeFileSync(path.join(__dirname,'focused-test-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({exitCode:receipt.exitCode,...counts,log:'focused-tests.tap'},null,2));
assert.equal(run.status,0,run.error?String(run.error):'Focused tests failed; see focused-tests.tap');
assert.equal(counts.fail,0);assert.equal(counts.cancelled,0);assert(counts.tests>0);
