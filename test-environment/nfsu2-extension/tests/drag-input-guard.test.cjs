'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {readPinned,bodies}=require('../tools/latest-native-utils.cjs'),AI=require('../extension/ai.js');
function locals(b){let p=0;const u=()=>{let v=0,s=0,x;do{x=b[p++];v|=(x&127)<<s;s+=7;}while(x&128);return v>>>0};const ts=[];for(let n=u();n--;){const count=u(),type=b[p++];for(let i=0;i<count;i++)ts.push(type);}return {end:p,types:ts};}
for(const version of ['latest','next'])test(version+' drag input guard preserves all native instructions and original locals',()=>{
 const config=require('../extension/'+version+'-profile.js').dragInputGuard,raw=bodies(readPinned(version)).get(config.index),patched=Buffer.from(AI.patchDragInputBody(raw,config));
 const a=locals(raw),b=locals(patched);assert.deepEqual(b.types.slice(0,a.types.length),a.types);assert.equal(b.types.length-a.types.length,7);
 assert.deepEqual(patched.subarray(b.end+config.prefix.length),raw.subarray(a.end));
 assert.equal(require('../extension/'+version+'-profile.js').capabilities.nativeDragInputHandoff,true);
 assert.throws(()=>AI.patchDragInputBody(raw.subarray(1),config),/layout changed/);
 const invalid=Buffer.from(raw);invalid[2]=126;assert.throws(()=>AI.patchDragInputBody(invalid,config),/layout changed/);
});
test('legacy profiles do not claim the reviewed native input-mode repair',()=>{
 assert.equal(require('../extension/current-profile.js').capabilities.nativeDragInputHandoff,undefined);
});
