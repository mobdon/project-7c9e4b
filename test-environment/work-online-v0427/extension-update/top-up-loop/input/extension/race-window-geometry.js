(function(root){
'use strict';
// Authored, read-only geometry analysis. This does not drive or modify the game.
const THRESHOLD=75;
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
function triple(a,b,c){
 if(![a,b,c].every(finitePoint))return{status:'unknown',reason:'non-finite-point'};
 const u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],la=Math.hypot(...u),lb=Math.hypot(...v);
 if(la<1e-5||lb<1e-5)return{status:'unknown',reason:'duplicate-or-near-duplicate'};
 const cross=u[0]*v[1]-u[1]*v[0],dot=u[0]*v[0]+u[1]*v[1],theta=Math.atan2(cross,dot);
 const angleDegrees=Math.abs(theta)*180/Math.PI,chord=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const reversal=angleDegrees>=179.5;
 // A zero area at a collinear reversal is NOT a safe straight. The native
 // curvature helper returns zero in this degeneracy; represent it explicitly.
 const signedCurvature=chord>1e-5?2*cross/(la*lb*chord):null;
 return{status:'measured',angleDegrees,signedAngleDegrees:theta*180/Math.PI,
  signedCurvature,curvature:signedCurvature===null?null:Math.abs(signedCurvature),
  segmentLengths:[la,lb],reversal,safetyPriority:angleDegrees>=THRESHOLD-1e-6};
}
function inspectPolyline(input,{thresholdDegrees=THRESHOLD,maxSegmentLength=100,maxStraightGap=25}={}){
 if(!(thresholdDegrees>0&&thresholdDegrees<=180&&Number.isFinite(maxSegmentLength)&&maxSegmentLength>0&&Number.isFinite(maxStraightGap)&&maxStraightGap>=0))throw Error('invalid geometry policy');
 if(!input||input.source!=='native-race-route'||input.orderVerified!==true||!Array.isArray(input.points)||input.points.length<3)
  return{status:'unknown',reason:'ordered-race-geometry-required',wholeRaceChecked:false,priorityCorners:[],gaps:[]};
 if(input.points.length>100000)throw Error('point budget exceeded');
 const points=input.points,closed=input.closed===true,n=points.length,dist=[0],edges=[],gaps=[];
 for(let i=0;i<n-(closed?0:1);i++){
  const a=points[i],b=points[(i+1)%n];const length=finitePoint(a)&&finitePoint(b)?Math.hypot(b[0]-a[0],b[1]-a[1]):NaN;
  const valid=Number.isFinite(length)&&length>=1e-5&&length<=maxSegmentLength;
  edges.push({length,valid});if(!valid)gaps.push({edge:i,reason:!Number.isFinite(length)?'non-finite-point':length<1e-5?'duplicate-point':'sampling-gap'});
  if(i<n-1)dist.push(Number.isFinite(length)?dist[i]+length:dist[i]);
 }
 const corners=[];
 for(let i=closed?0:1;i<(closed?n:n-1);i++){
  const before=(i+n-1)%n,after=i%n;
  const t=triple(points[before],points[i],points[(i+1)%n]);
  if(!edges[before]?.valid||!edges[after]?.valid||t.status!=='measured'){
   corners.push({index:i,status:'unknown',reason:t.reason||'adjacent-sampling-gap'});continue;
  }
  corners.push({...t,index:i,distance:dist[i],safetyPriority:t.angleDegrees>=thresholdDegrees-1e-6});
 }
 // Accumulate same-direction curvature through real samples, rather than
 // requiring any one polyline vertex to turn 75 degrees. Unknown edges and
 // reversals of turn direction break the run. A long straight also breaks it.
 const runs=[];let run=null,pendingStraight=0;
 const finish=()=>{if(run){run.safetyPriority=run.angleDegrees>=thresholdDegrees-1e-6;runs.push(run);}run=null;pendingStraight=0;};
 for(const corner of corners){
  if(corner.status!=='measured'){finish();continue;}
  const sign=Math.sign(corner.signedAngleDegrees);
  if(corner.angleDegrees<1e-5){pendingStraight+=edges[corner.index]?.length||0;if(pendingStraight>maxStraightGap)finish();continue;}
  if(run&&sign!==run.sign)finish();
  if(!run)run={startIndex:corner.index,endIndex:corner.index,angleDegrees:0,sign,peakCurvature:0,indices:[],reversal:false};
  run.endIndex=corner.index;run.indices.push(corner.index);run.angleDegrees+=corner.angleDegrees;
  run.peakCurvature=Math.max(run.peakCurvature,corner.curvature||0);run.reversal ||= corner.reversal;pendingStraight=0;
 }
 finish();
 // Join a continuous same-sign bend across a circuit's storage seam. Do not
 // join across unknown/straight boundaries; circuit closure must be explicit.
 if(closed&&runs.length>1){
  const first=runs[0],last=runs[runs.length-1];
  if(first.startIndex===0&&last.endIndex===n-1&&first.sign===last.sign){
   runs[0]={...last,endIndex:first.endIndex,wraps:true,angleDegrees:last.angleDegrees+first.angleDegrees,
    indices:[...last.indices,...first.indices],peakCurvature:Math.max(last.peakCurvature,first.peakCurvature),
    reversal:last.reversal||first.reversal,safetyPriority:last.angleDegrees+first.angleDegrees>=thresholdDegrees-1e-6};runs.pop();
  }
 }
 const unknown=corners.some(c=>c.status==='unknown')||gaps.length>0;
 return{status:unknown?'incomplete':'measured',thresholdDegrees,angleDefinition:'absolute change of forward heading, 0 straight and 180 reversal',
  wholeRaceChecked:input.coverage==='complete-event'&&input.resolutionVerified===true&&!unknown,
  sampledWholeEvent:input.coverage==='complete-event'&&!unknown,
  coverage:input.coverage||'unknown',horizontalOnly:true,resolutionVerified:input.resolutionVerified===true,maxSegmentLength,maxStraightGap,
  corners,runs,priorityCorners:runs.filter(r=>r.safetyPriority),gaps,
  limitations:['Sampled horizontal geometry, not a driving guarantee.','A gentle bend can be speed-limiting even below the priority angle.','Unobserved geometry is unknown, never straight.']};
}
// Advisory only. Caller must supply calibrated game-unit speed and deceleration.
// Distance to the final checked point bounds speed even if no corner was found.
function lookaheadAdvice({speed,cornerSpeed,distanceToCorner,availableDeceleration,reactionSeconds,marginDistance,knownHorizon}){
 const positive=[availableDeceleration];const nonnegative=[speed,cornerSpeed,distanceToCorner,reactionSeconds,marginDistance,knownHorizon];
 if(!positive.every(v=>Number.isFinite(v)&&v>0)||!nonnegative.every(v=>Number.isFinite(v)&&v>=0))return{status:'unknown',reason:'calibrated-physical-inputs-required',apply:false};
 const brakingDistance=Math.max(0,(speed*speed-cornerSpeed*cornerSpeed)/(2*availableDeceleration));
 const requiredDistance=brakingDistance+speed*reactionSeconds+marginDistance;
 // The target itself cannot be claimed observed past the checked horizon.
 const targetObserved=distanceToCorner<=knownHorizon;
 return{status:knownHorizon>=requiredDistance&&targetObserved?'observed-horizon-sufficient':'insufficient-horizon',
  targetObserved,
  brakingDistance,requiredDistance,shouldSlow:!targetObserved||distanceToCorner<=requiredDistance||knownHorizon<requiredDistance,
  apply:false,reason:'research-advice-only; preserve native controls until integrated and tested'};
}
const api={THRESHOLD,triple,inspectPolyline,lookaheadAdvice};root.__NFSU2_RACE_WINDOW_GEOMETRY__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
