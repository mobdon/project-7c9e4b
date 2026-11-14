'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function isolated(fn){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'combined-next-rebuild-'));try{fs.cpSync(root+'/tools',tmp+'/tools',{recursive:true});fs.mkdirSync(tmp+'/tests');fs.mkdirSync(tmp+'/extension');fs.copyFileSync(root+'/extension/next-profile.js',tmp+'/extension/next-profile.js');return fn(tmp);}finally{fs.rmSync(tmp,{recursive:true,force:true});}}
const run=tmp=>spawnSync(process.execPath,[tmp+'/tools/build-next-profile.cjs'],{encoding:'utf8',env:{...process.env,WABT_MODULE:root+'/research/compatibility-v011/node_modules/wabt'}});
const readProfile=s=>{const c={};vm.runInNewContext(s,c);return JSON.parse(JSON.stringify(c.__NFSU2_NEXT_PROFILE__));};
test('contact profile rebuild preserves full tuner prefix, all capabilities and exact generated profile',()=>isolated(tmp=>{
 const file=tmp+'/extension/next-profile.js',before=fs.readFileSync(file),result=run(tmp);assert.equal(result.status,0,result.stderr);assert.deepEqual(fs.readFileSync(file),before);
 const p=readProfile(before.toString());assert.equal(p.locals,170);assert.equal(p.fullTuner.abi,1);assert.equal(p.capabilities.fullTuner,true);assert.equal(p.capabilities.onlineRaceCars,true);assert.equal(p.cars.onlineRaceCars,true);
 for(const n of ['ai-next-body.json','pace-next-body.json','wall-next-body.json','car-next-body.json','contact-next-body.json','car-next-config.json'])assert.deepEqual(fs.readFileSync(tmp+'/tools/'+n),fs.readFileSync(root+'/tools/'+n));
}));
test('contact-only builder refuses an unexpected AI base bridge without replacing profile',()=>isolated(tmp=>{
 const file=tmp+'/extension/next-profile.js',text=fs.readFileSync(file,'utf8'),p=readProfile(text);p.fullTuner.baseBridge[0]^=1;const changed=text.replace(/const profile=.*?;const freeze=/,'const profile='+JSON.stringify(p)+';const freeze=');assert.notEqual(changed,text);fs.writeFileSync(file,changed);const result=run(tmp);assert.notEqual(result.status,0);assert.match(result.stderr,/Base AI bridge changed/);assert.equal(fs.readFileSync(file,'utf8'),changed);
}));

test('reviewed heat and Drift pace upgrades retain complete tuner and online race contact capability',()=>isolated(tmp=>{
 const file=tmp+'/extension/next-profile.js';fs.copyFileSync(path.join(root,'../combined-v022-integration/extension/next-profile.js'),file);const old=readProfile(fs.readFileSync(file,'utf8'));assert.equal(old.capabilities.nativeDragOverheat,undefined);
 const result=run(tmp);assert.equal(result.status,0,result.stderr);const upgraded=readProfile(fs.readFileSync(file,'utf8')),current=readProfile(fs.readFileSync(root+'/extension/next-profile.js','utf8'));assert.deepEqual(upgraded,current);assert.equal(upgraded.locals,170);assert.equal(upgraded.capabilities.fullTuner,true);assert.equal(upgraded.capabilities.onlineRaceCars,true);assert.equal(upgraded.capabilities.nativeDragOverheat,true);assert.deepEqual(upgraded.cars,old.cars);assert.deepEqual(upgraded.wall,old.wall);assert.equal(upgraded.capabilities.nativeDriftPace,true);assert.equal(upgraded.pace.target,old.pace.target);assert.notDeepEqual(upgraded.pace.bridge,old.pace.bridge);assert.notDeepEqual(upgraded.fullTuner.baseBridge,old.fullTuner.baseBridge);
}));

test('reviewed snapshot diagnostic upgrade changes only the full tuner prefix',()=>isolated(tmp=>{
 const file=tmp+'/extension/next-profile.js',s=fs.readFileSync(file,'utf8'),old=readProfile(s),legacy=require('../tools/compose-contact-prefixes.cjs').locals;
 const previous=readProfile(fs.readFileSync(path.join(root,'../combined-v025-integration/extension/next-profile.js'),'utf8'));
 const priorTail=previous.fullTuner.baseBridge.slice(legacy(previous.fullTuner.baseBridge).end),tail=old.fullTuner.baseBridge.slice(legacy(old.fullTuner.baseBridge).end);
 old.bridge=[...previous.bridge.slice(0,-priorTail.length),...tail];
 fs.writeFileSync(file,s.replace(/const profile=.*?;const freeze=/,'const profile='+JSON.stringify(old)+';const freeze='));
 const result=run(tmp);assert.equal(result.status,0,result.stderr);
 const next=readProfile(fs.readFileSync(file,'utf8'));assert.notDeepEqual(next.bridge,old.bridge);const {bridge:a,...left}=old,{bridge:b,...right}=next;assert.deepEqual(right,left);
 const first=fs.readFileSync(file);assert.equal(run(tmp).status,0);assert.deepEqual(fs.readFileSync(file),first);
}));
test('unknown snapshot prefix or changed base tail rejects without replacing profile',()=>{for(const baseline of ['../combined-v025-integration/extension/next-profile.js','../combined-v027-integration/extension/next-profile.js','../combined-v033-integration/extension/next-profile.js','extension/next-profile.js'])for(const at of [400,-2])isolated(tmp=>{
 const file=tmp+'/extension/next-profile.js',s=fs.readFileSync(path.join(root,baseline),'utf8'),p=readProfile(s);p.bridge[at<0?p.bridge.length+at:at]^=1;
 const changed=s.replace(/const profile=.*?;const freeze=/,'const profile='+JSON.stringify(p)+';const freeze=');fs.writeFileSync(file,changed);
 const result=run(tmp);assert.notEqual(result.status,0);assert.match(result.stderr,/Existing full tuner (prefix|base tail) changed/);assert.equal(fs.readFileSync(file,'utf8'),changed);
});});

test('diagnostic prefix upgrade rejects coercible non-byte values without rewriting the profile',()=>{
 for(const baseline of ['../combined-v025-integration/extension/next-profile.js','../combined-v027-integration/extension/next-profile.js','../combined-v033-integration/extension/next-profile.js','extension/next-profile.js'])for(const mutate of [n=>n+256,n=>n-256,n=>n+.5,n=>String(n),()=>null])isolated(tmp=>{
  const file=tmp+'/extension/next-profile.js',s=fs.readFileSync(path.join(root,baseline),'utf8'),p=readProfile(s);p.bridge[400]=mutate(p.bridge[400]);
  const changed=s.replace(/const profile=.*?;const freeze=/,'const profile='+JSON.stringify(p)+';const freeze=');fs.writeFileSync(file,changed);
  const result=run(tmp);assert.notEqual(result.status,0);assert.match(result.stderr,/non-byte value/);assert.equal(fs.readFileSync(file,'utf8'),changed);
 });
 isolated(tmp=>{const file=tmp+'/extension/next-profile.js',before=fs.readFileSync(file),prefixFile=tmp+'/tools/full-tuner-prefix.json',p=JSON.parse(fs.readFileSync(prefixFile));p.code[400]+=256;fs.writeFileSync(prefixFile,JSON.stringify(p));const result=run(tmp);assert.notEqual(result.status,0);assert.match(result.stderr,/non-byte value/);assert.deepEqual(fs.readFileSync(file),before);});
});

test('diagnostic upgrade refuses a sparse prefix hole that would otherwise coerce to zero',()=>{
 for(const baseline of ['../combined-v025-integration/extension/next-profile.js','../combined-v027-integration/extension/next-profile.js','../combined-v033-integration/extension/next-profile.js','extension/next-profile.js'])isolated(tmp=>{
  const file=tmp+'/extension/next-profile.js',s=fs.readFileSync(path.join(root,baseline),'utf8'),p=readProfile(s),zero=p.bridge.indexOf(0);assert.ok(zero>=0&&zero<7234);
  const changed=s.replace(';const freeze=',`;delete profile.bridge[${zero}];const freeze=`);assert.notEqual(changed,s);fs.writeFileSync(file,changed);
  const result=run(tmp);assert.notEqual(result.status,0);assert.match(result.stderr,/non-byte value/);assert.equal(fs.readFileSync(file,'utf8'),changed);
 });
});

test('exact v027 diagnostic prefix upgrades to static ride capture and rebuilds idempotently',()=>isolated(tmp=>{
 const file=tmp+'/extension/next-profile.js';fs.copyFileSync(path.join(root,'../combined-v027-integration/extension/next-profile.js'),file);const old=readProfile(fs.readFileSync(file,'utf8'));
 const result=run(tmp);assert.equal(result.status,0,result.stderr);const upgraded=readProfile(fs.readFileSync(file,'utf8'));const {bridge:a,dragInputGuard:oldGuard,...before}=old,{bridge:b,dragInputGuard:newGuard,...after}=upgraded;assert.notDeepEqual(a,b);assert.deepEqual(before,after);assert.deepEqual(newGuard,readProfile(fs.readFileSync(root+'/extension/next-profile.js','utf8')).dragInputGuard);const once=fs.readFileSync(file);assert.equal(run(tmp).status,0);assert.deepEqual(fs.readFileSync(file),once);
}));

test('Drag retention upgrade rejects an unreviewed old guard without replacing profile',()=>isolated(tmp=>{const file=tmp+'/extension/next-profile.js',s=fs.readFileSync(file,'utf8'),p=readProfile(s);p.dragInputGuard.prefix[10]^=1;const changed=s.replace(/const profile=.*?;const freeze=/,'const profile='+JSON.stringify(p)+';const freeze=');fs.writeFileSync(file,changed);const result=run(tmp);assert.notEqual(result.status,0);assert.match(result.stderr,/Existing Drag input guard changed/);assert.equal(fs.readFileSync(file,'utf8'),changed);}));

test('exact v033 static ride prefix upgrades only tuner capture and remains idempotent',()=>isolated(tmp=>{
 const file=tmp+'/extension/next-profile.js';fs.copyFileSync(path.join(root,'../combined-v033-integration/extension/next-profile.js'),file);const old=readProfile(fs.readFileSync(file,'utf8'));const result=run(tmp);assert.equal(result.status,0,result.stderr);const next=readProfile(fs.readFileSync(file,'utf8')),current=readProfile(fs.readFileSync(root+'/extension/next-profile.js','utf8'));assert.deepEqual(next,current);const {bridge:a,...before}=old,{bridge:b,...after}=next;assert.notDeepEqual(a,b);assert.deepEqual(after,before);const once=fs.readFileSync(file);assert.equal(run(tmp).status,0);assert.deepEqual(fs.readFileSync(file),once);
}));
