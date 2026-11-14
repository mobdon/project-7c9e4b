'use strict';
// Release checks run serially: native fixtures allocate large guest memories.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),verify=path.join(root,'verification');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const inventory=()=>Object.fromEntries(fs.readdirSync(path.join(root,'extension')).sort().map(n=>[n,hash(path.join(root,'extension',n))]));
const prior=read(path.join(root,'../nfsu2-extension/verification/release-summary-v0388.json'));
const excluded=new Set(prior.excludedFiles.map(x=>x.file));
const files=fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.cjs')&&!excluded.has(n)).sort();
const testNames=[...files.map(n=>'tests/'+n),...fs.readdirSync(path.join(root,'tests/fixtures')).filter(n=>n.endsWith('.cjs')).map(n=>'tests/fixtures/'+n),...fs.readdirSync(path.join(root,'native')).filter(n=>n.endsWith('.cjs')).map(n=>'native/'+n),'native/plans.json','native/corner-target-plans.json','native/paced-plans.json','integration/track-labels-v0388.json','../work-paced-v0388/extension/diagnostics.js'].sort();
const tests=()=>Object.fromEntries(testNames.map(n=>[n,hash(path.join(root,n))]));
const sourceHashes=inventory(),testHashes=tests(),runnerSha256=hash(__filename),startedAt=new Date().toISOString();
const stamp=startedAt.replace(/[:.]/g,'-'),attempt=path.join(verify,'canonical-suite-v0389-'+stamp);
const log=fs.createWriteStream(attempt+'.txt',{flags:'wx'});
const child=spawn(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...files.map(n=>'tests/'+n)],{cwd:root,windowsHide:true});
let tail='';
for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log.write(chunk);tail=(tail+chunk).slice(-32000);});
child.on('error',e=>{log.end();console.error(e);process.exitCode=1;});
child.on('close',exitCode=>{
 log.end(()=>{
  const counts={};for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const m=tail.match(new RegExp('^# '+key+' (\\d+)\\r?$','m'));counts[key]=m?Number(m[1]):null;}
  const sourceUnchanged=JSON.stringify(sourceHashes)===JSON.stringify(inventory()),testsUnchanged=JSON.stringify(testHashes)===JSON.stringify(tests()),runnerUnchanged=runnerSha256===hash(__filename);
  const passed=exitCode===0&&sourceUnchanged&&testsUnchanged&&runnerUnchanged&&counts.tests===counts.pass&&counts.tests>=prior.passed&&['fail','cancelled','skipped','todo'].every(k=>counts[k]===0);
  const result={version:'0.38.9',runnerSha256,runnerUnchanged,startedAt,finishedAt:new Date().toISOString(),exitCode,passed,sourceUnchanged,testsUnchanged,sourceHashes,testHashes,selectedFiles:files.length,counts,excludedFiles:prior.excludedFiles};
  fs.writeFileSync(attempt+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  if(passed&&process.argv.includes('--final')){
   for(const n of ['canonical-suite-v0389-final-result.json','final-suite-v0389-final-files.json','final-suite-v0389-final.txt'])if(fs.existsSync(path.join(verify,n)))throw Error('Preserve existing final receipt: '+n);
   fs.writeFileSync(path.join(verify,'canonical-suite-v0389-final-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
   fs.writeFileSync(path.join(verify,'final-suite-v0389-final-files.json'),JSON.stringify(files,null,2)+'\n',{flag:'wx'});
   fs.copyFileSync(attempt+'.txt',path.join(verify,'final-suite-v0389-final.txt'),fs.constants.COPYFILE_EXCL);
  }
  console.log(JSON.stringify({passed,exitCode,sourceUnchanged,testsUnchanged,selectedFiles:files.length,counts,receipt:attempt+'.json',log:attempt+'.txt'},null,2));process.exitCode=passed?0:1;
 });
});
