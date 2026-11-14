'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const [condition,analysis,note]=process.argv.slice(2);
assert(condition&&analysis&&note);
const source=path.resolve(ROOT,condition),target=path.resolve(ROOT,analysis);
assert(source.startsWith(ROOT+path.sep)&&target.startsWith(ROOT+path.sep)&&source!==target);
assert(!fs.existsSync(target),'Fresh external analysis directory required');
const pins={},sizes={};
function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())visit(p);else {assert(item.isFile());const rel=path.relative(source,p),bytes=fs.readFileSync(p);pins[rel]=crypto.createHash('sha256').update(bytes).digest('hex');sizes[rel]=bytes.length;}}}
visit(source);
fs.mkdirSync(target);
const result={kind:'FROZEN-CODEC-UNIT-CONDITION-FULL-INVENTORY',condition,createdAt:new Date().toISOString(),note,entireConditionFrozen:true,neverEditAddOrRerun:true,fileCount:Object.keys(pins).length,pins,sizes};
const text=JSON.stringify(result,null,2)+'\n',dest=path.join(target,'frozen-output-manifest.json');
fs.writeFileSync(dest,text,{flag:'wx'});
console.log(JSON.stringify({manifest:path.relative(ROOT,dest),sha256:crypto.createHash('sha256').update(text).digest('hex'),files:result.fileCount}));
