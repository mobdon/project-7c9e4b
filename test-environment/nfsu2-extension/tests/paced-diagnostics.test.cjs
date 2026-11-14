'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../extension/diagnostics.js');
const row=t=>Object.fromEntries(t.columns.map((k,i)=>[k,t.rows.at(-1)[i]]));
function fixture(){let at=1000;const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};const log=D.create({clock:()=>at,storage});return{log,storage,values,next:()=>at+=250,read:()=>JSON.parse(log.exportText()).raceTrace};}

test('catch-up diagnostics distinguish native physics paths and acknowledgement rejection stages',()=>{
 const f=fixture();f.log.trace({ready:true,driving:true,rubberbandState:'waiting',pacedAckRejectCode:8,pacedPhysicsKind:1,pacedNativeStage:10});
 let t=f.read(),r=row(t);assert.equal(r.pacedAckRejectCode,8);assert.equal(r.pacedPhysicsKind,1);assert.equal(r.pacedNativeStage,10);assert.equal(r.pacedCombinedGripFactor,null);assert.equal(r.pacedEvidenceKind,null);assert.equal(t.codebooks.pacedAckRejectCode[8],'physics receiver identity');
 f.next();f.log.trace({ready:true,driving:true,rubberbandState:'applied',pacedAckRejectCode:0,pacedPhysicsKind:3,pacedEvidenceKind:'combined-grip',pacedCombinedGripFactor:39,pacedWheelHits:0,pacedOutputsVerified:true,pacedNativeStage:24});
 t=f.read();r=row(t);assert.equal(r.pacedPhysicsKind,3);assert.equal(r.pacedEvidenceKind,'combined-grip');assert.equal(r.pacedCombinedGripFactor,39);assert.equal(r.pacedWheelHits,0);assert.equal(r.pacedOutputsVerified,true);
 assert.equal(t.coverage.missingByColumn.pacedCombinedGripFactor,1);
});

test('malformed or missing catch-up evidence remains unknown without exporting arbitrary data',()=>{
 const f=fixture();f.log.trace({ready:true,driving:true,pacedAckRejectCode:2.5,pacedPhysicsKind:2,pacedNativeStage:99,pacedEvidenceKind:'SECRET',pacedCombinedGripFactor:Infinity,raw:'SECRET'});
 const t=f.read(),r=row(t);for(const k of ['pacedAckRejectCode','pacedPhysicsKind','pacedNativeStage','pacedEvidenceKind','pacedCombinedGripFactor'])assert.equal(r[k],null,k);assert.doesNotMatch(f.log.exportText(),/SECRET/);
});

test('saved v0.38.8 trace migrates with old evidence intact and new rejection fields unavailable',()=>{
 const old=require('../../work-paced-v0388/extension/diagnostics.js'),f=fixture(),prior=old.create({clock:()=>1000,storage:f.storage,version:'0.38.8'});
 prior.trace({ready:true,driving:true,rubberbandState:'waiting',physicsKind:3,requestedPace:2,paceApplied:1,pacedOutputsVerified:false,pacedRequestedStrength:10});prior.exportText();
 const migrated=JSON.parse(D.create({clock:()=>2000,storage:f.storage}).exportText()).raceTrace,r=row(migrated);
 assert.equal(migrated.restoredFromSameTab,true);assert.equal(r.version,'0.38.8');assert.equal(r.physicsKind,3);assert.equal(r.requestedPace,2);assert.equal(r.paceApplied,1);assert.equal(r.pacedOutputsVerified,false);assert.equal(r.pacedRequestedStrength,10);
 for(const k of ['pacedAckRejectCode','pacedPhysicsKind','pacedNativeStage','pacedEvidenceKind','pacedCombinedGripFactor'])assert.equal(r[k],null,k);
});
