'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('production Drag input lease survives exact native Player updates and preserves native mode5 replacement',()=>{
 const run=spawnSync(process.execPath,[path.resolve(__dirname,'../research/drag-lifecycle-v030-native/probe-candidate.cjs')],{encoding:'utf8',maxBuffer:1024*1024,env:{...process.env,NFSU2_EXTENSION_ROOT:path.resolve(__dirname,'..')}});
 assert.equal(run.status,0,run.stderr);const report=JSON.parse(run.stdout);
 assert.equal(report.retainedPlayerUpdates,180);assert.equal(report.productionBridgeNativeCycles,180);assert(report.rejectedGuardsWithByteExactNativeFallback>=32);
 const replacement=report.handbackChecks.find(x=>x.name==='actualNative4To5ReplacementPreserved');assert.deepEqual(replacement.state,{driver:3,physics:3,mode:5,requested:5});
 assert.equal(report.handbackChecks.find(x=>x.name==='interveningSkillPreserved').skill,6);
 assert.equal(report.productionPublishRace.afterNative.status,'active');assert.equal(report.oddNegativeControls.length,34);assert.equal(report.oddWatchdog.frames,180);assert.equal(report.oddWatchdog.owned,false);assert.equal(report.oddWatchdog.lease,0);assert.equal(report.genuineRequest.status,'retry');assert.equal(report.genuineRequest.handbackPending,false);assert.equal(report.genuineRequest.owned,false);assert.equal(report.genuineRequest.failed,true);
 for(const row of report.publishInterleave)assert.equal(row.after.owned,true);
});
