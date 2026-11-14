'use strict';
// Run the same explicit historical exclusions, retain the full log and bind a
// successful result to the exact extension bytes that were present throughout.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),verify=path.join(root,'verification'),tag='v0385';
const prior=JSON.parse(fs.readFileSync(path.join(verify,'release-summary-v0384.json'),'utf8'));
const excluded=new Set(prior.excludedFiles.map(v=>v.file));
const files=fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.cjs')&&!excluded.has(n)).sort();
const hashSource=()=>Object.fromEntries(fs.readdirSync(path.join(root,'extension')).sort().filter(n=>fs.statSync(path.join(root,'extension',n)).isFile()).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'extension',n))).digest('hex')]));
const before=hashSource(),startedAt=new Date().toISOString();
const logfile=path.join(verify,'final-suite-'+tag+'.txt'),log=fs.createWriteStream(logfile,{flags:'wx'});
const env={...process.env,NFS_PYTHON:'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'};
const child=spawn(process.execPath,['--test','--test-concurrency=1',...files.map(n=>'tests/'+n)],{cwd:root,env,stdio:['ignore','pipe','pipe']});
let tail='';
for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log.write(chunk);tail=(tail+chunk.toString()).slice(-16000);});
child.on('error',err=>{log.end(String(err));process.exitCode=1;});
child.on('close',code=>log.end(()=>{
 const after=hashSource(),sourceUnchanged=JSON.stringify(before)===JSON.stringify(after),counts={};
 for(const key of ['tests','pass','fail','cancelled','skipped','todo']){
  const matches=[...tail.matchAll(new RegExp('(?:'+String.fromCharCode(0x2139)+'|#)\\s+'+key+'\\s+(\\d+)\\s*$','gm'))];
  counts[key]=matches.length?Number(matches.at(-1)[1]):null;
 }
 const passed=code===0&&sourceUnchanged&&counts.tests===counts.pass&&counts.pass>=prior.passed&&['fail','cancelled','skipped','todo'].every(k=>counts[k]===0);
 const result={version:'0.38.5',startedAt,finishedAt:new Date().toISOString(),exitCode:code,sourceUnchanged,selectedFiles:files.length,excludedFiles:prior.excludedFiles,counts,passed};
 fs.writeFileSync(path.join(verify,'canonical-suite-'+tag+'-result.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(verify,'final-suite-'+tag+'-files.json'),JSON.stringify(files,null,2)+'\n');
 if(passed)fs.writeFileSync(path.join(verify,'source-reviewed-'+tag+'.json'),JSON.stringify(after,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 process.exitCode=passed?0:1;
}));
