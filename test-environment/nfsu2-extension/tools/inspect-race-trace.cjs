#!/usr/bin/env node
'use strict';
// Local reviewer utility only. Reads one bounded JSON export; no eval, network,
// raw message/identity/path output, extension installation or guest writes.
const fs=require('node:fs');
const Diagnostics=require('../extension/diagnostics.js');
const Catalog=require('../extension/race-catalog.js');
const {planReasonCodes,guardCodes}=require('../extension/forward-driving.js');
const Route=require('../extension/route-probe.js'),Geometry=require('../extension/forward-geometry.js');
const MAX_INPUT_BYTES=8*1024*1024,MAX_OUTPUT_BYTES=128*1024,MAX_ROWS=20000,MAX_GROUPS=16,MAX_SETTINGS=4;
const KNOWN=new Set(Diagnostics.TRACE_COLUMNS),TOOL_FIELDS=Diagnostics.TRACE_COLUMNS.filter(k=>k.startsWith('tools.'));
const ENUMS={
 traceStatus:['captured','unavailable'],nativeTelemetryStatus:['sampled','profile-unverified','state-unavailable','context-stale','drift-ineligible','context-changed'],
 nativeRoadTargetStatus:['sampled','driver-unverified','behavior-unverified','not-road','value-invalid'],nativePaceTelemetryStatus:['unavailable','mailbox-unready','unsupported','context-unowned','mailbox-invalid','mailbox-changed','sampled'],
 cornerPlannerTelemetryStatus:['unsupported','command-ineligible','route-unavailable','record-invalid','context-changed','sampled'],
 catchupTelemetryStatus:['unsupported','unavailable','mailbox-unready','context-invalid','context-changed','value-invalid','sampled'],
 forwardState:['off','waiting','requested','unknown','armed','observed','native-fallback'],adaptiveRaceState:['off','invalid','unsupported','street-x','mode','network-permission','ai-off','paused','handoff','pace-pending','planner-pending','planner-observed','native-fallback','coverage-unknown','clearance-limited'],
 adaptivePacingState:['off','invalid','native-route','native-fallback','coverage-unknown','clearance-limited'],powerStatus:['off','unsupported','not-ready','not-driving','network-permission','hidden','unfocused','menu','hud','drift-change','layout','settling','applied','neutral','changed','rejected','suspended','tuner-busy'],planClearanceSource:['barrier','vehicle']
};
const RANGES={
 at:[0,8640000000000000],trackId:[0,65535],raceType:[0,100],racePhase:[0,100],hud:[0,3],flow:[0,100],driverKind:[0,100],physicsKind:[0,100],nativeSkill:[0,255],
 requestedPace:[.5,3],paceApplied:[.75,3],nativePaceRequested:[.75,3],nativePaceApplied:[.75,3],nativePaceFactor:[0,4],nativePaceHits:[0,4294967295],
 catchupDriverFactor:[0,32],catchupCarFactor:[0,32],
 speedMps:[0,500],forwardMps:[-500,500],nativeRoadTarget:[-500,500],nativeBrake:[0,1],nativeThrottle:[0,1],nativeHandbrake:[0,1],nativeSteering:[-32768,32767],carGear:[0,10],carRpm:[0,30000],
 cornerMode:[0,3],cornerPace:[.5,3],cornerBraking:[.5,1],cornerHits:[0,4294967295],brakingHits:[0,4294967295],cornerApplied:[0,1],cornerRouteNodes:[0,40],cornerPlannerCorners:[0,40],cornerPlannerUsable:[0,5],cornerGuardMask:[0,255],
 adaptiveRaceCeiling:[1,2],adaptiveRuntimePace:[.75,2],adaptiveClearanceM:[0,150],planInputSpeedMps:[0,500],planSelectedPace:[.75,3],planClearanceTarget:[0,60],
 forwardSamples:[0,48],forwardHorizon:[0,512.01],forwardPriorityTurns:[0,24],forwardRequestedTarget:[0,150],forwardLeaseTicks:[0,400],forwardFailureCode:[1,10],forwardGuardCode:[11,143],
 forwardPlanReasonCode:[0,40],forwardPlanTarget:[0,150],forwardPlanConstraints:[0,24],forwardPlanKnots:[0,24],forwardLimitingDistance:[0,512.01],forwardLimitingAngle:[0,180],forwardLimitingCurvature:[0,100],forwardLimitingCurveTarget:[0,1e6],forwardLimitingEntryTarget:[0,1e6],forwardPlanGrip:[0,100],forwardPlanLateral:[0,1000],forwardPlanBrake:[0,1000],
 producerFailureCode:[0,3],producerStage:[0,3],pageHeartbeat:[0,4294967295],nativeHeartbeatAck:[0,4294967295],aiRequestedMode:[0,2],aiNativeStatus:[0,3],aiStaleTicks:[0,4294967295],
 'tools.adaptiveRaceCeiling':[1,2],'tools.raceCornerFactor':[.6,.95],'tools.raceCornerMargin':[0,25],'tools.raceBraking':[.5,1],'tools.paceFactor':[.75,3],'tools.racePaceFactor':[.75,3],'tools.cornerFactor':[.6,.95],'tools.cornerMargin':[0,25],'tools.power':[1,3],'tools.gripFactor':[1,2],'tools.rpm':[3000,10000]
};
const INTEGERS=new Set(['at','trackId','raceType','racePhase','hud','flow','driverKind','physicsKind','nativeSkill','nativePaceHits','carGear','cornerMode','cornerHits','brakingHits','cornerRouteNodes','cornerPlannerCorners','cornerPlannerUsable','cornerGuardMask','forwardSamples','forwardPriorityTurns','forwardLeaseTicks','forwardFailureCode','forwardGuardCode','forwardPlanReasonCode','forwardPlanConstraints','forwardPlanKnots','producerFailureCode','producerStage','pageHeartbeat','nativeHeartbeatAck','aiRequestedMode','aiNativeStatus','aiStaleTicks']);
const REQUIRED=['version','revision','moduleHash','trackId','raceType','streetXRace','forcedStreetX','onlineStreetX','speedMps','nativeRoadTarget','nativeRoadTargetStatus','nativeBrake','nativeThrottle','nativeTelemetryStatus','nativeSkill','requestedPace','nativePaceRequested','nativePaceApplied','nativePaceHits','nativePaceTelemetryStatus','nativePaceFactor','cornerMode','cornerPlannerCorners','cornerPlannerUsable','cornerPlannerTelemetryStatus','cornerGuardMask','forwardState','forwardCaptured','forwardRequestedTarget','forwardGuardCode','forwardPlanAvailable','forwardPlanOverride','forwardPlanReasonCode','forwardPlanTarget','forwardLimitingDistance','forwardLimitingAngle','forwardLimitingCurvature','producerFailureCode','traceStatus','tools.racePace','tools.racePaceFactor','tools.raceBraking','tools.raceCornerFactor','tools.raceCornerMargin','tools.adaptiveRace','tools.adaptiveRaceCeiling','tools.boost','tools.power','tools.grip','tools.gripFactor'];
const NUMBER_FIELDS=['requestedPace','nativePaceRequested','nativePaceApplied','paceApplied','nativePaceFactor','nativeRoadTarget','nativeBrake','nativeThrottle','speedMps','forwardRequestedTarget','forwardPlanTarget'];
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const finite=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
const count=x=>Number.isSafeInteger(x)&&x>=0?x:null;
function clean(key,value){
 if(value===null||value===undefined)return null;
 if(key==='version')return typeof value==='string'&&/^\d{1,3}\.\d{1,3}(?:\.\d{1,3})?$/.test(value)?value:null;
 if(key==='revision')return typeof value==='string'&&/^[a-f0-9]{8}$/i.test(value)?value.toLowerCase():null;
 if(key==='moduleHash')return typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value)?value.toLowerCase():null;
 if(ENUMS[key])return ENUMS[key].includes(value)?value:null;
 if(RANGES[key])return finite(value,...RANGES[key])&&(!INTEGERS.has(key)||Number.isInteger(value))?value:null;
 return typeof value==='boolean'?value:null;
}
const get=(data,key)=>key.startsWith('tools.')?(object(data.tools)?data.tools[key.slice(6)]:undefined):data[key];
function decode(input){
 const declared=new Set(),invalid=Object.create(null),rows=[];let malformedRows=0,omittedRows=0,duplicates=0,unknownColumns=0,source='race-trace',reason=null,reported={};
 const add=(raw,at)=>{if(!object(raw)||!finite(at,0,8640000000000000)){malformedRows++;return;}const row={at:Math.floor(at)};
  for(const key of KNOWN){if(key==='at')continue;const value=get(raw,key);if(value!==undefined)declared.add(key);const v=clean(key,value);if(value!==null&&value!==undefined&&v===null)invalid[key]=(invalid[key]||0)+1;row[key]=v;}rows.push(row);
 };
 if(input.raceTrace!==undefined){const t=input.raceTrace;
  if(!object(t)||t.format!=='nfsu2-driving-trace-v1'||t.schema!==1||!Array.isArray(t.columns)||t.columns.length<1||t.columns.length>512||!Array.isArray(t.rows))return{rows,declared,invalid,source,reason:'invalid-race-trace-schema',malformedRows,omittedRows,duplicates,unknownColumns,reported};
  const positions=new Map();for(let i=0;i<t.columns.length;i++){const key=t.columns[i];if(typeof key!=='string'||key.length>80||positions.has(key))return{rows,declared,invalid,source,reason:'invalid-or-duplicate-trace-columns',malformedRows,omittedRows,duplicates,unknownColumns,reported};positions.set(key,i);if(KNOWN.has(key))declared.add(key);else unknownColumns++;}
  if(!positions.has('at'))return{rows,declared,invalid,source,reason:'trace-time-column-missing',malformedRows,omittedRows,duplicates,unknownColumns,reported};
  omittedRows=Math.max(0,t.rows.length-MAX_ROWS);
  for(const raw of t.rows.slice(-MAX_ROWS)){if(!Array.isArray(raw)||raw.length!==t.columns.length){malformedRows++;continue;}const data={tools:{}};for(const[key,i]of positions)if(KNOWN.has(key)&&key!=='at'){if(key.startsWith('tools.'))data.tools[key.slice(6)]=raw[i];else data[key]=raw[i];}add(data,raw[positions.get('at')]);}
  reported={dropped:count(t.dropped),samples:count(t.coverage?.samples),spanMs:count(t.coverage?.spanMs),gapsOver500Ms:count(t.coverage?.gapsOver500Ms),nominalCadenceMs:finite(t.nominalCadenceMs,1,60000)?t.nominalCadenceMs:null};
 }else{
  source='legacy-sparse-observations';reason='legacy-export-has-no-race-trace';const seen=new Set();
  if(!Array.isArray(input.events)&&!Array.isArray(input.historicalDriving?.samples))return{rows,declared,invalid,source,reason:'no-diagnostic-observations',malformedRows,omittedRows,duplicates,unknownColumns,reported};
  const events=Array.isArray(input.events)?input.events:[],historical=Array.isArray(input.historicalDriving?.samples)?input.historicalDriving.samples:[];
  const candidates=[...events.filter(e=>object(e)&&['state','export'].includes(e.event)),...historical.filter(object)];omittedRows=Math.max(0,candidates.length-MAX_ROWS);
  for(const e of candidates.slice(-MAX_ROWS)){const before=rows.length;add(e.data,e.at);if(rows.length===before)continue;const row=rows.at(-1),id=JSON.stringify(row);if(seen.has(id)){rows.pop();duplicates++;}else seen.add(id);}
  rows.sort((a,b)=>a.at-b.at);reported={dropped:count(input.dropped),samples:null,spanMs:null,gapsOver500Ms:null,nominalCadenceMs:null};
 }
 return{rows,declared,invalid,source,reason,malformedRows,omittedRows,duplicates,unknownColumns,reported};
}
function histogram(rows,key,labels=null){const counts=new Map();let missing=0;
 for(const r of rows){const value=r[key];if(value===null||value===undefined){missing++;continue;}counts.set(value,(counts.get(value)||0)+1);}
 const values=[...counts].sort((a,b)=>b[1]-a[1]||(typeof a[0]==='number'&&typeof b[0]==='number'?a[0]-b[0]:String(a[0]).localeCompare(String(b[0]))));
 return{observed:rows.length-missing,missing,values:values.slice(0,24).map(([value,samples])=>({value,...(labels?{meaning:labels[value]||'unrecognized-code'}:{}),samples})),omittedDistinctValues:Math.max(0,values.length-24)};
}
function numbers(rows,key){const values=rows.map(r=>r[key]).filter(x=>typeof x==='number'),h=histogram(rows,key);return{...h,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,zeroSamples:values.filter(x=>x===0).length,negativeSamples:values.filter(x=>x<0).length,positiveSamples:values.filter(x=>x>0).length};}
function mode(r){
 const street=r.streetXRace===true||r.forcedStreetX===true||r.onlineStreetX===true,drag=r.dragRace===true||r.forcedDrag===true,drift=r.driftRace===true||r.forcedDrift===true;
 if([street,drag,drift].filter(Boolean).length>1)return'conflicting-special-flags';if(drag)return'drag';if(drift)return'drift';if(street)return'street-x';if(r.raceType===7)return'outrun';if(r.raceType===0)return'free-roam';
 const classified=r.trackId!==null?Catalog.classify(r.trackId):'unknown';return['circuit','sprint','street-x','url','drag','drift'].includes(classified)?classified:r.raceType===1?'road-kind-unknown':'unknown';
}
function coverage(rows,decoded){let maxGap=0,gaps=0,rollback=0;for(let i=1;i<rows.length;i++){const gap=rows[i].at-rows[i-1].at;maxGap=Math.max(maxGap,gap);if(gap>500)gaps++;if(gap<0)rollback++;}
 return{retainedSamples:rows.length,firstAt:rows[0]?.at??null,lastAt:rows.at(-1)?.at??null,spanMs:rows.length?Math.max(0,rows.at(-1).at-rows[0].at):0,maxGapMs:maxGap,gapsOver500Ms:gaps,clockRollbacks:rollback,nominalCadenceMs:decoded.reported.nominalCadenceMs,reported:decoded.reported,clipped:(decoded.reported.dropped||0)>0||decoded.omittedRows>0||decoded.malformedRows>0,malformedRows:decoded.malformedRows,processingOmittedRows:decoded.omittedRows,duplicateLegacyObservationsRemoved:decoded.duplicates,ignoredUnknownColumns:decoded.unknownColumns};
}
function tracks(rows){const groups=new Map();for(const row of rows){const key=String(row.trackId)+':'+mode(row);if(!groups.has(key))groups.set(key,{trackId:row.trackId,mode:mode(row),rows:[]});groups.get(key).rows.push(row);}
 const all=[...groups.values()].sort((a,b)=>b.rows.length-a.rows.length);return{omittedTrackModes:Math.max(0,all.length-MAX_GROUPS),groups:all.slice(0,MAX_GROUPS).map(g=>{
  const settings=new Map();for(const r of g.rows){const values=Object.fromEntries(TOOL_FIELDS.filter(k=>r[k]!==null&&r[k]!==undefined).map(k=>[k.slice(6),r[k]])),key=JSON.stringify(values);if(!settings.has(key))settings.set(key,{values,samples:0,firstAt:r.at,lastAt:r.at});const s=settings.get(key);s.samples++;s.lastAt=r.at;}
  const sets=[...settings.values()].sort((a,b)=>b.samples-a.samples);return{trackId:g.trackId,mode:g.mode,samples:g.rows.length,firstAt:g.rows[0].at,lastAt:g.rows.at(-1).at,forwardScope:g.mode==='street-x'?'excluded-by-design':['circuit','sprint','url','road-kind-unknown'].includes(g.mode)?'ordinary-road-candidate':'not-ordinary-road',settings:sets.slice(0,MAX_SETTINGS),omittedSettingSets:Math.max(0,sets.length-MAX_SETTINGS),requestedPace:numbers(g.rows,'requestedPace'),nativePaceApplied:numbers(g.rows,'nativePaceApplied'),legacyPaceApplied:numbers(g.rows,'paceApplied'),nativeRoadTarget:numbers(g.rows,'nativeRoadTarget'),nativeBrake:numbers(g.rows,'nativeBrake'),cornerRecords:numbers(g.rows,'cornerPlannerCorners')};
 })};}
function inspect(input){
 if(!object(input))return{format:'nfsu2-driving-tools-trace-review-v1',ok:false,errorCode:'export-object-required'};
 const d=decode(input),rows=d.rows,planLabels=Object.fromEntries(Object.entries(planReasonCodes).map(([name,code])=>[code,name]));
 const guardLabels=Object.fromEntries([...Object.entries(guardCodes),...Object.entries(Route.guardCodes||{})].map(([name,code])=>[code,name]));
 const builds=new Map();for(const row of rows){const value={version:row.version,revision:row.revision,moduleHash:row.moduleHash},key=JSON.stringify(value);if(!builds.has(key))builds.set(key,{...value,samples:0});builds.get(key).samples++;}
 const numeric=Object.fromEntries(NUMBER_FIELDS.map(k=>[k,numbers(rows,k)])),street=rows.filter(r=>mode(r)==='street-x');
 const result={format:'nfsu2-driving-tools-trace-review-v1',ok:d.reason===null||d.reason==='legacy-export-has-no-race-trace',exporterVersion:clean('version',input.exporterVersion),raceTrace:{available:d.source==='race-trace'&&!d.reason,source:d.source,reason:d.reason},coverage:coverage(rows,d),builds:[...builds.values()].slice(0,16),omittedBuilds:Math.max(0,builds.size-16),requiredFieldAvailability:Object.fromEntries(REQUIRED.map(k=>[k,{sourceHasColumnOrField:d.declared.has(k),observed:rows.filter(r=>r[k]!==null&&r[k]!==undefined).length,missing:rows.filter(r=>r[k]===null||r[k]===undefined).length,rejected:d.invalid[k]||0}])),trackModes:tracks(rows),pace:{pageRequest:numeric.requestedPace,mailboxRequest:numeric.nativePaceRequested,mailboxAcknowledgement:numeric.nativePaceApplied,legacyAcknowledgement:numeric.paceApplied,currentNativeFactor:numeric.nativePaceFactor},sampledControls:{roadTargetNativeUnits:numeric.nativeRoadTarget,brake:numeric.nativeBrake,throttle:numeric.nativeThrottle,speedMps:numeric.speedMps},forward:{state:histogram(rows,'forwardState'),failureCodes:histogram(rows,'forwardFailureCode',Geometry.reasons),guardCodes:histogram(rows,'forwardGuardCode',guardLabels),planReasonCodes:histogram(rows,'forwardPlanReasonCode',planLabels),requestedTargetNativeUnits:numeric.forwardRequestedTarget,plannedTargetNativeUnits:numeric.forwardPlanTarget,applicationEvidence:'not-established-by-cap-requests-or-plans',reportedNotApplied:rows.filter(r=>r.forwardNativeApplied===false).length,unexpectedAppliedTrueReports:rows.filter(r=>r.forwardNativeApplied===true).length,streetXSamples:street.length,streetXOffSamples:street.filter(r=>r.forwardState==='off').length,streetXExplicitFailureCodes:street.filter(r=>r.forwardFailureCode!==null||r.forwardGuardCode!==null).length},sourceStatuses:Object.fromEntries(['traceStatus','nativeTelemetryStatus','nativeRoadTargetStatus','nativePaceTelemetryStatus','cornerPlannerTelemetryStatus','adaptiveRaceState','adaptivePacingState','producerFailureCode','producerStage'].map(k=>[k,histogram(rows,k)])),notices:['null or absent fields are unavailable, never zero or evidence that a control did not occur.','Pace requests, hook acknowledgements, native factors, target requests and sampled brake inputs are distinct observations.','Forward preview intentionally excludes Street X in reviewed builds; off without a failure code is expected ineligibility, not a failed forward guard.','Native target and geometry scalars are native units; no metric calibration or actual grip/braking capability is inferred.','Sparse or clipped samples cannot prove an impact, full lap, earlier race outcome or absence of transient braking.']};
 return result;
}
function output(result){let text=JSON.stringify(result,null,2);if(Buffer.byteLength(text)>MAX_OUTPUT_BYTES){result.outputClipped=true;for(const g of result.trackModes?.groups||[]){g.settingsOmittedForOutputBound=g.settings.length;delete g.settings;}text=JSON.stringify(result,null,2);}if(Buffer.byteLength(text)>MAX_OUTPUT_BYTES)text=JSON.stringify({format:'nfsu2-driving-tools-trace-review-v1',ok:false,errorCode:'summary-output-bound'});return text+'\n';}
function main(){let result;try{if(process.argv.length!==3){process.exitCode=1;result={ok:false,errorCode:'one-local-json-file-required'};}else{const stat=fs.statSync(process.argv[2]);if(!stat.isFile())throw{reviewCode:'regular-file-required'};if(stat.size>MAX_INPUT_BYTES)throw{reviewCode:'input-too-large'};const bytes=fs.readFileSync(process.argv[2]);if(bytes.length>MAX_INPUT_BYTES)throw{reviewCode:'input-too-large'};let data;try{data=JSON.parse(bytes.toString('utf8'));}catch{throw{reviewCode:'invalid-json'};}result=inspect(data);if(!result.ok)process.exitCode=1;}}catch(error){process.exitCode=1;result={ok:false,errorCode:['regular-file-required','input-too-large','invalid-json'].includes(error?.reviewCode)?error.reviewCode:'input-unavailable'};}process.stdout.write(output(result));}
if(require.main===module)main();module.exports={inspect,MAX_INPUT_BYTES,MAX_OUTPUT_BYTES};
