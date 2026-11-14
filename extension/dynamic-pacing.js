/* Session-only reductions of the owned adaptive driver's pace request.
 * Distances are observations from the existing wall/car reader. They are not
 * a road centerline, a physical speed limit, or proof of complete coverage. */
(function(root){
  'use strict';
  const finite=(n,lo,hi)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
  function clearanceEnvelope({hazards,speedMps,brakingMps2=4,reactionSeconds=.6,marginM=8}={}){
    if(!finite(speedMps,0,500)||!finite(brakingMps2,.5,12)||!finite(reactionSeconds,0,2)||!finite(marginM,0,30))return {available:false};
    if(!hazards||!Array.isArray(hazards.cars)||hazards.cars.length>96)return {available:false};
    let distance=null,source=null;
    const accept=(d,s)=>{if(finite(d,0,150)&&(distance===null||d<distance)){distance=d;source=s;}};
    if(hazards.barrierAhead!==null&&hazards.barrierAhead!==undefined)accept(hazards.barrierAhead,'barrier');
    for(const car of hazards.cars)if(car&&finite(car.side,-2.5,2.5))accept(car.ahead,'vehicle');
    // No intersection gives no permission to accelerate: the reader's scan
    // is partial and can miss road curvature, height, shapes and moving cars.
    if(distance===null)return {available:true,observed:false};
    const availableM=Math.max(0,distance-marginM-speedMps*reactionSeconds);
    return {available:true,observed:true,source,distanceM:distance,targetMps:Math.sqrt(2*brakingMps2*availableM)};
  }
  class Pacing {
    constructor(){this.reset();}
    reset(){this.key=null;this.at=null;this.timingReady=false;this.pace=1;}
    update({enabled=false,ceiling=1.3,identity,now,evidence={},speedMps,hazards,brakingMps2=4,nativeFallback=false,nativePaceSelected=false}={}){
      if(enabled!==true){this.reset();return {active:false,state:'off',pace:null};}
      const city=nativePaceSelected===true&&nativeFallback!==true;
      if(!finite(ceiling,city ? .75 : 1,city ? 3 : 2)||typeof identity!=='string'||!identity||identity.length>256){this.reset();return {active:false,state:'invalid',pace:1};}
      const sameOwner=this.key===identity,validTime=finite(now,0,Number.MAX_SAFE_INTEGER);
      const continuous=sameOwner&&this.timingReady&&validTime&&this.at!==null&&now>=this.at&&now-this.at<=500;
      const timingState=!validTime?'invalid':!sameOwner?'initial':this.at!==null&&now<this.at?'rollback':continuous?'continuous':'gap';
      const sampleGapMs=sameOwner&&validTime&&this.at!==null&&now>=this.at?now-this.at:null;
      if(!sameOwner){this.pace=city?ceiling:1;this.key=identity;this.at=null;this.timingReady=false;}
      // A timing interruption discards race boost and earns no recovery. City
      // keeps its selected ceiling and any existing same-owner slowdown.
      else if(!continuous)this.pace=Math.min(this.pace,city?ceiling:1);
      const dt=continuous?Math.min(500,now-this.at)/1000:0;
      const currentRoute=evidence.active===true&&evidence.owned===true&&evidence.cornerMode===3&&evidence.cornerGuardMask===0&&evidence.cornerRouteOwned===true&&finite(evidence.cornerRouteNodes,2,40);
      // Old hit counters cannot stand in for current route records. On 4715
      // those counters remain zero while a 2x request otherwise stays active.
      const currentCorners=currentRoute&&finite(evidence.cornerPlannerCorners,1,5)&&Number.isInteger(evidence.cornerPlannerUsable)&&evidence.cornerPlannerUsable>0&&evidence.cornerPlannerUsable<=evidence.cornerPlannerCorners&&finite(evidence.cornerApplied,0,1)&&evidence.cornerHits>0&&evidence.brakingHits>0;
      // Road-race fallback keeps the user's selected native pace. Missing
      // optional corner records are not a slower speed limit. The existing
      // native driver still handles its route, braking and corner compensation;
      // partial heading-ray observations remain diagnostics, not an additional
      // uncalibrated physical speed controller. City slowing uses its own policy.
      if(nativeFallback===true){
        this.key=identity;this.at=null;this.timingReady=false;this.pace=ceiling;
        return {active:true,state:currentCorners?'native-route':'native-fallback',pace:ceiling,ceiling,currentCorners,clearance:clearanceEnvelope({hazards,speedMps,brakingMps2})};
      }
      // In city mode the ceiling is the user's existing native pace choice.
      // An empty partial scan does not create a new pace choice or route proof.
      let target=city?ceiling:currentCorners?ceiling:1,state=city?'selected-native':currentCorners?'native-route':'coverage-unknown';
      const clearance=clearanceEnvelope({hazards,speedMps,brakingMps2});
      if(clearance.observed&&speedMps>1&&clearance.targetMps<speedMps){
        // Convert the observed overspeed into an absolute pace request. Using
        // the prior reduced request here compounds the same observation every
        // page tick, before the physical car has had time to respond.
        const reduction=Math.min(target,Math.max(.75,(city?ceiling:Math.min(1,target))*clearance.targetMps/speedMps));
        if(reduction<target){target=reduction;state='clearance-limited';}
      }
      // Reduce immediately; city pace regains 0.35x/s toward the user's choice,
      // while the existing race planner retains 0.10x/s. A delayed timer or
      // replacement owner cannot jump straight back to the selected ceiling.
      this.pace=Math.max(.75,Math.min(target,this.pace+(city ? .35 : .1)*dt));
      // Invalid/backwards samples earn no recovery time. Keep the high-water
      // timestamp so clock rollback cannot credit the same interval twice;
      // the first fresh sample after an interruption only reestablishes time.
      if(validTime&&(this.at===null||now>=this.at)){this.at=now;this.timingReady=true;}
      else this.timingReady=false;
      return {active:true,state,pace:Math.round(this.pace*100)/100,ceiling,currentCorners,clearance,...(city?{timingState,sampleGapMs}:{})};
    }
  }
  const api=Object.freeze({Pacing,clearanceEnvelope});
  root.__NFSU2_DYNAMIC_PACING__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
