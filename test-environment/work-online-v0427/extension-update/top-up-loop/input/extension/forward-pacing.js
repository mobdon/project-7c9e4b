/* Pure speed advice for a verified, ordered native query window.
 * This module does not read/write game memory or acquire driving control. */
(function(root){
  'use strict';
  const Geometry=root.__NFSU2_RACE_WINDOW_GEOMETRY__||(typeof require==='function'?require('./race-window-geometry.js'):null);
  const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
  const unknown=reason=>({available:false,reason,wholeRaceChecked:false});
  const Profiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
  const PIN='ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c';
  // PC24 retains the x87 exponent range between its 24-bit rounding steps.
  // Math.fround alone differs for a subnormal or overflowing intermediate.
  function x87Round24Nearest(value){
    const rounded=Math.fround(value),magnitude=Math.abs(rounded);
    if(value===0||(magnitude>2**-126&&magnitude<=Math.fround(3.4028234663852886e38)))return rounded;
    if(!Number.isFinite(value))return value;
    const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value,true);
    const bits=view.getBigUint64(0,true),low=bits&0x1fffffffn;
    if(low===0n)return value;
    let result=bits-low;
    if(low>0x10000000n||(low===0x10000000n&&(result&0x20000000n)!==0n))result+=0x20000000n;
    view.setBigUint64(0,result,true);return view.getFloat64(0,true);
  }
  // Native f2078 uses the at/after anchor and its predecessor. Keep the
  // captured nearest-rounding precision; the real CPU is never normalized.
  function interpolate(anchors,distance,controlWord=0x37f){
    const index=anchors.findIndex(p=>p.distance>=distance);
    if(index<0||distance<anchors[0].distance)return null;
    if(index===0)return anchors[0].xyz.slice();
    const a=anchors[index-1],b=anchors[index],round=controlWord===0x7f?x87Round24Nearest:value=>value,t=Math.fround(round(distance-a.distance)/round(b.distance-a.distance));
    return a.xyz.map((x,i)=>Math.fround(round(x+round(t*Math.fround(b.xyz[i]-x)))));
  }
  // Local interpolation uses up to48 points, retaining native knots and spacing8.
  // The raw native mailbox still has at most24 anchors and <=184.01 route units.
  function windowFromCapture(capture,{spacing=8,maxSamples=48}={}){
    const profile=Profiles?.select?.(capture?.moduleHash),controlWord=capture?.controlWord,supportedControlWord=profile?.runtime?.numericReceipt?.controlWords?.includes(controlWord)??controlWord===0x37f;
    if(capture?.status!=='captured'||!profile||capture.source!=='owned-native-forward-query-v1'||capture.sampling!=='native-node-anchors-linear-v1'||capture.postConstructionVerified!==true||capture.forwardOrderVerified!==true||capture.horizontalAxes!=='xy'||!supportedControlWord||!Number.isInteger(capture.request)||capture.request<=0||(capture.request&1))return unknown('verified-native-anchor-capture-required');
    if(!finite(spacing,1,20)||!Number.isInteger(maxSamples)||maxSamples<3||maxSamples>48)return unknown('bounded-resampling-policy-required');
    const anchors=capture.points,progress=capture.progress,end=capture.end;
    const maxHorizon=Profiles.select(capture.moduleHash).runtime.maxHorizon||184;
    if(!Array.isArray(anchors)||anchors.length<2||anchors.length>24||!finite(progress,-1e6,1e6)||!finite(end,-1e6,1e6)||Math.fround(end-progress)<16||end-progress>maxHorizon+.01||!anchors.every((p,i)=>p&&finite(p.distance,-1e6,1e6)&&p.distance===Math.fround(p.distance)&&Array.isArray(p.xyz)&&p.xyz.length===3&&p.xyz.every(n=>finite(n,-1e6,1e6)&&n===Math.fround(n))&&(!i||p.distance>anchors[i-1].distance))||progress<anchors[0].distance||end>anchors.at(-1).distance)return unknown('bounded-ordered-native-anchors-required');
    const boundaries=anchors.map(p=>p.distance).filter(d=>d>progress&&d<end);boundaries.push(end);
    const samples=[{distance:0,xyz:interpolate(anchors,progress,controlWord)}];let current=progress;
    for(const boundary of boundaries){
      const from=current,steps=Math.ceil((boundary-from)/spacing);
      for(let i=1;i<=steps;i++){
        const absolute=i===steps?boundary:Math.fround(from+(boundary-from)*i/steps);
        const relative=Math.fround(absolute-progress);
        if(relative<=samples.at(-1).distance)return unknown('native-distance-resolution-exhausted');
        samples.push({distance:relative,xyz:interpolate(anchors,absolute,controlWord)});current=absolute;
        if(samples.length===maxSamples)break;
      }
      if(samples.length===maxSamples)break;
    }
    if(samples.length<3||samples.some(p=>!p.xyz||!p.xyz.every(Number.isFinite)))return unknown('insufficient-forward-anchor-window');
    return {available:true,moduleHash:capture.moduleHash,source:capture.source,request:capture.request,pathKind:'selected-road-centerline',unitSystem:'native-world-units-per-second',siCalibrated:false,orderVerified:true,postConstructionVerified:true,horizontalAxes:'xy',nativeUnitScaleVerified:capture.nativeUnitScaleVerified===true,controlWord,sampling:capture.sampling,resolutionVerified:false,wholeRaceChecked:false,nativeAnchorCount:anchors.length,progress,physicalSpeed:capture.physical?.speed,samples};
  }
  function plan(window,{lateralAcceleration,brakingDeceleration,cornerFactor=.8,sharpMargin=15,reactionSeconds=.6,marginDistance=8,maxSpacing=20}={}){
    if(!Geometry||window?.source!=='owned-native-forward-query-v1'||window.orderVerified!==true||window.nativeUnitScaleVerified!==true||window.horizontalAxes!=='xy'||window.postConstructionVerified!==true||window.pathKind!=='selected-road-centerline')return unknown('verified-forward-centerline-required');
    if(!finite(lateralAcceleration,.5,12)||!finite(brakingDeceleration,.5,12)||!finite(cornerFactor,.6,.95)||!finite(sharpMargin,0,25)||!finite(reactionSeconds,0,2)||!finite(marginDistance,0,30)||!finite(maxSpacing,1,25))return unknown('bounded-physical-policy-required');
    if(!finite(window.physicalSpeed,0,500))return unknown('verified-current-native-speed-required');
    const samples=window.samples;
    if(!Array.isArray(samples)||samples.length<3||samples.length>48)return unknown('bounded-forward-samples-required');
    if(!samples.every((p,i)=>p&&finite(p.distance,0,10000)&&Array.isArray(p.xyz)&&p.xyz.length===3&&p.xyz.every(n=>finite(n,-1e6,1e6))&&(i===0?p.distance===0:p.distance>samples[i-1].distance&&p.distance-samples[i-1].distance<=maxSpacing)))return unknown('invalid-distance-order-or-spacing');
    // Route coordinates remain interpolation/binding parameters. Braking uses
    // measured XY chords, capped by each route step to preserve the released
    // horizon bound without ever crediting more than the measured path.
    const pathDistances=[0],brakingDistances=[0];
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1],b=samples[i],step=b.distance-a.distance,chord=Math.hypot(b.xyz[0]-a.xyz[0],b.xyz[1]-a.xyz[1]);
      if(chord<1e-4||chord>maxSpacing||chord/step<.5||chord/step>1.1)return unknown('unverified-native-unit-spacing');
      if(Math.abs(b.xyz[2]-a.xyz[2])/chord>.25)return unknown('grade-outside-horizontal-policy');
      pathDistances.push(pathDistances[i-1]+chord);
      brakingDistances.push(Math.min(b.distance,brakingDistances[i-1]+Math.min(chord,step)));
    }
    const points=samples.map(p=>p.xyz.slice(0,2));
    const geometry=Geometry.inspectPolyline({source:'native-race-route',orderVerified:true,coverage:'bounded-forward-window',points},{maxSegmentLength:maxSpacing,maxStraightGap:20});
    if(geometry.status!=='measured'||geometry.corners.some(c=>c.reversal||c.curvature===null))return unknown('incomplete-or-reversing-geometry');
    const priority=new Set(geometry.priorityCorners.flatMap(run=>run.indices));
    // Infinity is internal absence of a measured corner constraint, never a
    // published target. A straight excerpt does not impose a fixed ceiling.
    const caps=samples.map(()=>Infinity),curveCaps=samples.map(()=>Infinity);
    for(const c of geometry.corners){
      if(c.curvature<=0)continue;
      const speed=Math.sqrt(lateralAcceleration/c.curvature)*cornerFactor*(priority.has(c.index)?1-sharpMargin/100:1);
      caps[c.index]=curveCaps[c.index]=speed;
    }
    // The excerpt ends because observation is bounded, not because the road
    // ends. Never turn that boundary into a zero-speed obstacle. Unknown
    // continuation leaves native driving in charge rather than certifying it.
    const routeHorizon=samples.at(-1).distance,pathHorizon=pathDistances.at(-1),horizon=brakingDistances.at(-1);
    // A corner can arrive before the end of the measured window. Account for
    // response time and margin to each target too, rather than only to the
    // horizon. A target at the current sample applies its curve cap directly.
    for(let i=0;i<caps.length;i++)for(let j=i+1;j<caps.length;j++){
      if(!Number.isFinite(curveCaps[j]))continue;
      const usable=Math.max(0,brakingDistances[j]-brakingDistances[i]-marginDistance);
      const delayedEntry=Math.sqrt((brakingDeceleration*reactionSeconds)**2+curveCaps[j]**2+2*brakingDeceleration*usable)-brakingDeceleration*reactionSeconds;
      caps[i]=Math.min(caps[i],Math.max(curveCaps[j],delayedEntry));
    }
    for(let i=caps.length-2;i>=0;i--)caps[i]=Math.min(caps[i],Math.sqrt(caps[i+1]**2+2*brakingDeceleration*(brakingDistances[i+1]-brakingDistances[i])));
    const hasCornerConstraint=curveCaps.some(Number.isFinite),reactionHorizon=window.physicalSpeed*reactionSeconds+marginDistance;
    const reason=!hasCornerConstraint?'no-observed-corner-constraint':horizon<=reactionHorizon?'insufficient-observed-reaction-horizon':!finite(caps[0],Number.MIN_VALUE,150)?'no-supported-positive-corner-target':'measured-corner-constraint';
    const override=reason==='measured-corner-constraint',targetCap=override?Math.fround(caps[0]):null;
    return {available:true,override,targetCap,reason,source:window.source,pathKind:window.pathKind,unitSystem:'native-world-units-per-second',siCalibrated:false,advisoryOnly:true,wholeRaceChecked:false,horizonDistance:horizon,brakingHorizonDistance:horizon,routeHorizonDistance:routeHorizon,pathHorizonDistance:pathHorizon,reactionHorizonDistance:reactionHorizon,brakingDistanceBasis:'sum-of-min-horizontal-chord-and-route-step',priorityTurns:geometry.priorityCorners.length,
      samples:samples.map((p,i)=>({distance:p.distance,routeDistance:p.distance,pathDistance:pathDistances[i],brakingDistance:brakingDistances[i],curveSpeed:Number.isFinite(curveCaps[i])?curveCaps[i]:null,entrySpeed:Number.isFinite(caps[i])?caps[i]:null,priority:priority.has(i)})),
      assumptions:{lateralAcceleration,brakingDeceleration,cornerFactor,sharpMargin,reactionSeconds,marginDistance},
      notice:'Selected road centerline, not the final racing line. Assumed acceleration limits and sampled horizontal geometry; no physical speed-cap, grip, braking or race-result guarantee.'};
  }
  const NATIVE_POLICY_HASHES=Object.freeze(['14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd','e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03','a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8','f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9','c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391','395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e','3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb','f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b','2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d']);
  function nativePolicyValid(capture,p){
    return p?.available===true&&p.source==='exact-native-grade-policy-v1'&&NATIVE_POLICY_HASHES.includes(p.moduleHash)&&capture?.moduleHash===p.moduleHash&&p.request===capture.request&&Number.isInteger(p.request)&&p.request>0&&!(p.request&1)&&p.gravity===Math.fround(9.8)&&p.straightCap===60&&p.lateralAcceleration===p.grip*p.gravity&&
      [[3.7,12],[3.4,10.6],[3.1,9.3],[2.8,8],[3,10],[3,9],[3,8],[2,6]].some(([g,a])=>p.grip===Math.fround(g)&&p.brakingDeceleration===Math.fround(a));
  }
  function physicsEvidenceValid(g){
    if(g?.physicsKind===1)return g.evidenceKind==='four-tires'&&g.wheelHits===4&&g.gripHits===0&&g.combinedGripFactor==null;
    return g?.physicsKind===3&&g.evidenceKind==='combined-grip'&&g.wheelHits===0&&g.gripHits===1&&
      Number.isFinite(g.combinedGripFactor)&&g.combinedGripFactor>0&&g.combinedGripFactor===Math.fround(g.combinedGripFactor);
  }
  function nativeGainValid(capture,g,pace){
    if(!g)return false;
    const p=Math.fround(Math.round(pace*100)/100),s=g.strength,q=g.strengthCode,power=Math.fround(Math.fround(g.nativeFactor*p)*s),tire=Math.fround(power*p);
    return g.available===true&&g.source==='owned-paced-handling-publication-v2'&&['a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8','f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9','c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391','395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e','3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb','f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b','2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'].includes(g.moduleHash)&&g.moduleHash===capture.moduleHash&&g.request===capture.request&&g.ownerSequence===capture.ownerSequence&&Number.isInteger(g.ownerSequence)&&g.ownerSequence>0&&!(g.ownerSequence&1)&&g.car===capture.identity?.car&&Number.isInteger(g.car)&&g.car>=0x10000&&g.car<0x28000000&&!(g.car&3)&&g.percent===Math.round(pace*100)&&g.pace===p&&p>=1&&p<=2&&capture.pace===pace&&Number.isInteger(q)&&q>=0&&q<=36&&s===1+q/4&&g.relativePowerGain===p*s&&g.relativeTireGain===p*p*s&&g.curveGain===p*Math.sqrt(s)&&g.outputsVerified===true&&physicsEvidenceValid(g)&&Number.isInteger(g.command)&&g.command>0&&g.command<=0xffffffff&&(g.command>>>16)>0&&(g.command&255)===g.percent&&(g.command&0x300)===0x300&&((g.command>>>10)&63)===q&&Number.isInteger(g.publication)&&g.publication>=0&&g.publication<=32767&&Number.isFinite(g.nativeFactor)&&g.nativeFactor>0&&Number.isFinite(power)&&power>0&&Number.isFinite(tire)&&tire>0&&g.powerFactor===power&&g.tireFactor===tire;
  }
  const NATIVE_TURN_ARM=16,NATIVE_PRIORITY_SPACING=8;
  // A native anchor is a binding knot, not a measured tire-path radius. First
  // discard only redundant forward-collinear XY knots, after the caller has
  // checked every raw edge. Adding a knot on a straight must not change a cap.
  function nativeBendGeometry(points){
    const knots=[];
    for(let index=0;index<points.length;index++){
      knots.push({index,xy:points[index].xyz.slice(0,2)});
      while(knots.length>2){
        const [a,b,c]=knots.slice(-3).map(p=>p.xy),u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],product=Math.hypot(...u)*Math.hypot(...v);
        if(u[0]*v[0]+u[1]*v[1]<=0||Math.abs(u[0]*v[1]-u[1]*v[0])>product*1e-10)break;
        knots.splice(knots.length-2,1);
      }
    }
    if(knots.length<3)return{corners:[],priority:new Set(),priorityTurns:0,canonicalKnots:knots.length};
    // Rebuild the straight-gap analysis on a deterministic physical grid.
    // Otherwise the number/location of redundant raw straight anchors can
    // split or merge the same accumulated 75-degree turn.
    const analysis=[{xy:knots[0].xy,index:knots[0].index}];
    for(let i=1;i<knots.length;i++){
      const a=knots[i-1],b=knots[i],steps=Math.ceil(Math.hypot(b.xy[0]-a.xy[0],b.xy[1]-a.xy[1])/NATIVE_PRIORITY_SPACING);
      for(let j=1;j<=steps;j++)analysis.push(j===steps?{xy:b.xy,index:b.index}:{xy:a.xy.map((v,k)=>v+(b.xy[k]-v)*j/steps)});
    }
    const runs=Geometry.inspectPolyline({source:'native-race-route',orderVerified:true,coverage:'bounded-forward-window',points:analysis.map(p=>p.xy)},{maxSegmentLength:NATIVE_PRIORITY_SPACING+.001,maxStraightGap:20});
    if(runs.status!=='measured')return null;
    const priority=new Set(runs.priorityCorners.flatMap(run=>run.indices.map(index=>analysis[index].index).filter(Number.isInteger))),corners=[];
    for(let i=1;i<knots.length-1;i++){
      const before=knots[i-1].xy,at=knots[i].xy,after=knots[i+1].xy;
      const arms=[Math.min(NATIVE_TURN_ARM,Math.hypot(at[0]-before[0],at[1]-before[1])),Math.min(NATIVE_TURN_ARM,Math.hypot(after[0]-at[0],after[1]-at[1]))];
      // The fixed maximum physical arms stop at the next genuine vertex or
      // observed endpoint. Do not average across an opposite bend, extrapolate
      // a rounded corner, or infer a larger radius from long straight legs.
      const left=at.map((v,k)=>v+(before[k]-v)*arms[0]/Math.hypot(at[0]-before[0],at[1]-before[1]));
      const right=at.map((v,k)=>v+(after[k]-v)*arms[1]/Math.hypot(after[0]-at[0],after[1]-at[1]));
      const corner=Geometry.triple(left,at,right);
      if(corner.status!=='measured'||corner.reversal||corner.curvature===null)return null;
      corners.push({...corner,index:knots[i].index,nextIndex:knots[i+1].index,turnArms:arms});
    }
    return{corners,priority,priorityTurns:runs.priorityCorners.length,canonicalKnots:knots.length};
  }
function planNative(capture,policy,{pace=1,cornerFactor=1,sharpMargin=0,brakingFactor=1,reactionSeconds=0,marginDistance=0}={}){
 const unknown=reason=>({available:false,override:false,reason});
 if(!nativePolicyValid(capture,policy))return unknown('verified-native-policy-required');
 if(capture?.status!=='captured'||!NATIVE_POLICY_HASHES.includes(capture.moduleHash)||capture.source!=='owned-native-forward-query-v1'||capture.postConstructionVerified!==true||capture.forwardOrderVerified!==true||capture.nativeUnitScaleVerified!==true||capture.horizontalAxes!=='xy'||policy?.available!==true||policy.moduleHash!==capture.moduleHash)return unknown('verified-owned-native-capture-and-policy-required');
 if(!Number.isFinite(pace)||pace<.75||pace>2||!Number.isFinite(brakingFactor)||brakingFactor<.5||brakingFactor>1||!Number.isFinite(reactionSeconds)||reactionSeconds<0||reactionSeconds>2||!Number.isFinite(marginDistance)||marginDistance<0||marginDistance>30)return unknown('bounded-policy-required');
 const points=capture.points,progress=capture.progress,end=capture.end;
 const maxHorizon=Profiles.select(capture.moduleHash).runtime.maxHorizon||184;
 if(!Array.isArray(points)||points.length<2||points.length>24||!Number.isFinite(progress)||!Number.isFinite(end)||end-progress<16||end-progress>maxHorizon+.01||points[0].distance>progress||points.at(-1).distance<end||!points.every((p,i)=>p&&Number.isFinite(p.distance)&&Array.isArray(p.xyz)&&p.xyz.length===3&&p.xyz.every(Number.isFinite)&&(!i||p.distance>points[i-1].distance)))return unknown('ordered-bounded-native-knots-required');
 const geometry=Geometry.inspectPolyline({source:'native-race-route',orderVerified:true,coverage:'bounded-forward-window',points:points.map(p=>p.xyz.slice(0,2))},{maxSegmentLength:maxHorizon+.01,maxStraightGap:20});
 if(geometry.status!=='measured'||geometry.corners.some(c=>c.reversal||c.curvature===null))return unknown('incomplete-or-reversing-native-knots');
 const distances=new Map();let measured=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],step=b.distance-a.distance,chord=Math.hypot(b.xyz[0]-a.xyz[0],b.xyz[1]-a.xyz[1]);
  if(chord/step<.5||chord/step>1.1||Math.abs(b.xyz[2]-a.xyz[2])/chord>.25)return unknown('unverified-native-unit-spacing');
  if(b.distance<progress)continue;
  measured+=Math.min(chord,step)*(b.distance-Math.max(a.distance,progress))/step;distances.set(i,measured);
 }
 const bends=nativeBendGeometry(points);if(!bends)return unknown('incomplete-or-reversing-native-knots');
 const priority=bends.priority,a=policy.brakingDeceleration*brakingFactor,constraints=[];
 // Scale only the corner's reference speed by the verified relative tire gain.
 // Grade policy stays a planning assumption; native M is not counted again.
 // Braking acceleration, reaction time and observed distances stay unchanged.
 const nativeGain=nativeGainValid(capture,capture.nativeGain,pace)?capture.nativeGain:null,paceGain=nativeGain?.pace||1,strength=nativeGain?.strength||1,curveGain=nativeGain?.curveGain||1;
 let target=Infinity;
 for(const c of bends.corners){
  if(points[c.index].distance>end||c.curvature<=0)continue;
  if(!Number.isFinite(cornerFactor)||cornerFactor<.6||cornerFactor>1||!Number.isFinite(sharpMargin)||sharpMargin<0||sharpMargin>25)return unknown('invalid-native-curve-policy');
  const past=points[c.index].distance<progress;
  if(past){
   const h=capture.physical?.heading,out=[points[c.nextIndex].xyz[0]-points[c.index].xyz[0],points[c.nextIndex].xyz[1]-points[c.index].xyz[1]],length=Array.isArray(h)?Math.hypot(h[0],h[1]):NaN,ol=Math.hypot(...out);
   // Authored exit policy: retain a measured apex while heading still crosses
   // the outgoing native segment. Progress past a vertex alone is not exit.
   if(!Number.isFinite(length)||length<.5||length>1.5)return unknown('verified-exit-heading-required');
   if((h[0]*out[0]+h[1]*out[1])/(length*ol)>=Math.cos(15*Math.PI/180))continue;
  }
  const curve=Math.sqrt(policy.lateralAcceleration/c.curvature)*cornerFactor*(priority.has(c.index)?1-sharpMargin/100:1)*curveGain;
  const distance=past?0:distances.get(c.index),usable=Math.max(0,distance-marginDistance),entry=Math.max(curve,Math.sqrt((a*reactionSeconds)**2+curve*curve+2*a*usable)-a*reactionSeconds);
  target=Math.min(target,entry);constraints.push({index:c.index,distanceNative:distance,curvature:c.curvature,angleDegrees:c.angleDegrees,priority:priority.has(c.index),curveSpeed:curve,entrySpeed:entry,turnArms:c.turnArms});
 }
 const override=constraints.length>0&&Number.isFinite(target)&&target>0&&target<=150;
 return{available:true,override,targetCap:override?Math.fround(target):null,reason:constraints.length?'measured-native-knot-bend':'no-observed-speed-limiting-bend',constraints,priorityTurns:bends.priorityTurns,nativeKnots:points.length,canonicalKnots:bends.canonicalKnots,horizonDistance:end-progress,wholeRaceChecked:false,advisoryOnly:true,liveVerified:false,
  assumptions:{nativeGrip:policy.grip,lateralAcceleration:policy.lateralAcceleration,brakingDeceleration:a,cornerFactor,sharpMargin,reactionSeconds,marginDistance,geometryModel:'canonical-bounded-knot-v1',maximumTurnArm:NATIVE_TURN_ARM,prioritySampleSpacing:NATIVE_PRIORITY_SPACING,paceGain,strength,strengthCode:nativeGain?.strengthCode||0,curveGain,relativeTireGain:paceGain*paceGain*strength,gainApplied:curveGain>1},notice:'Native planner tables and bounded horizontal bend geometry are planning assumptions, not measured tire force or actual braking.'};
}
  const api=Object.freeze({plan,planNative,windowFromCapture,nativePolicyValid,nativeGainValid,physicsEvidenceValid});root.__NFSU2_FORWARD_PACING__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
