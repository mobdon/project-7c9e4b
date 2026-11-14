'use strict';
// Repair only the reporter-summary decoding. The successful test process is
// retained verbatim; no tests or extension source are rerun or changed here.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),verify=path.join(root,'verification'),resultPath=path.join(verify,'canonical-suite-v0385-result.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const result=JSON.parse(fs.readFileSync(resultPath,'utf8'));assert.equal(result.exitCode,0);assert.equal(result.sourceUnchanged,true);assert.equal(result.passed,false);
const archive=path.join(verify,'canonical-suite-v0385-before-summary-parser-fix-result.json');assert(!fs.existsSync(archive));fs.copyFileSync(resultPath,archive);
const logfile=path.join(verify,'final-suite-v0385.txt'),bytes=fs.readFileSync(logfile),log=bytes.toString('utf8'),counts={};
for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const matches=[...log.matchAll(new RegExp('(?:'+String.fromCharCode(0x2139)+'|#)\\s+'+key+'\\s+(\\d+)\\s*$','gm'))];assert.equal(matches.length,1,'Unique final '+key);counts[key]=Number(matches[0][1]);}
assert.deepEqual(counts,{tests:2496,pass:2496,fail:0,cancelled:0,skipped:0,todo:0});
const native=JSON.parse(fs.readFileSync(path.join(verify,'release-modules-v0385.json'),'utf8'));
const source=Object.fromEntries(fs.readdirSync(path.join(root,'extension')).sort().map(name=>[name,hash(fs.readFileSync(path.join(root,'extension',name)))]));assert.deepEqual(source,native.sourceHashes);
assert.equal(JSON.parse(fs.readFileSync(path.join(verify,'logger-review-v0385.json'),'utf8')).result,'passed');
const corrected={...result,counts,passed:true,summaryParserCorrection:{reason:'Windows default decoding converted the non-ASCII reporter marker in the copied runner; recovered counts from the immutable UTF-8 final log.',originalResult:path.basename(archive),logSha256:hash(bytes),correctedRunnerSha256:hash(fs.readFileSync(path.join(root,'integration/run-suite-v0385.cjs'))),sameSuccessfulTestProcess:true}};
fs.writeFileSync(resultPath,JSON.stringify(corrected,null,2)+'\n');fs.writeFileSync(path.join(verify,'source-reviewed-v0385.json'),JSON.stringify(source,null,2)+'\n');
assert.equal(hash(fs.readFileSync(logfile)),hash(bytes));console.log(JSON.stringify({counts,sourceUnchanged:true,sameSuccessfulTestProcess:true,logSha256:hash(bytes)}));
