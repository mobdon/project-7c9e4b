/* Session lifecycle for the optional owned native forward sampler and cap.
 * A published request is not a native application acknowledgement. */
(function(root){
  'use strict';
  const Profiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
  const PIN='ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c';
  const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
  const local=name=>{if(typeof require!=='function')return null;try{return require('./'+name+'.js');}catch{return null;}};
  const Probe=root.__NFSU2_ROUTE_PROBE__||local('route-probe');
  const guardCodes=Object.freeze({uninstalled:11,unverified:12,moduleIdentity:13,controllers:14,pacingDependency:15,policy:16,identity:17,pace:18,ownerSequence:19,captureUnavailable:37,requestResult:38,captureIdentity:39,plan:40,publishResult:41,publishException:42,pollException:43,requestException:44,pageException:45});
  const knownGuardCodes=new Set([...Object.values(guardCodes),20,21,22,23,24,25,26,28,29,30,31,32,33,34,35,...Array.from({length:44},(_,i)=>100+i)]);
  const knownGuard=code=>Number.isInteger(code)&&knownGuardCodes.has(code);
  const errorGuard=(error,fallback)=>{try{return knownGuard(error?.forwardGuardCode)?error.forwardGuardCode:fallback;}catch{return fallback;}};
  const planReasonCodes=Object.freeze(Object.fromEntries(['verified-native-policy-required','verified-owned-native-capture-and-policy-required','bounded-policy-required','ordered-bounded-native-knots-required','incomplete-or-reversing-native-knots','unverified-native-unit-spacing','invalid-native-curve-policy','verified-exit-heading-required','measured-native-knot-bend','no-observed-speed-limiting-bend','verified-forward-centerline-required','bounded-physical-policy-required','verified-current-native-speed-required','bounded-forward-samples-required','invalid-distance-order-or-spacing','grade-outside-horizontal-policy','incomplete-or-reversing-geometry','no-observed-corner-constraint','insufficient-observed-reaction-horizon','no-supported-positive-corner-target','measured-corner-constraint'].map((r,i)=>[r,i+1])));
  function planEvidence(plan){
    const out={forwardPlanAvailable:plan?.available===true,forwardPlanOverride:plan?.override===true,forwardPlanReasonCode:planReasonCodes[plan?.reason]||0};
    const keep=(key,value,max)=>{if(finite(value,0,max))out[key]=value;};
    keep('forwardPlanTarget',plan?.targetCap,150);keep('forwardPlanKnots',plan?.nativeKnots,24);
    if(Array.isArray(plan?.constraints)){
      keep('forwardPlanConstraints',plan.constraints.length,24);
      const limiting=plan.constraints.filter(c=>finite(c?.entrySpeed,0,1e6)).reduce((best,c)=>!best||c.entrySpeed<best.entrySpeed?c:best,null);
      keep('forwardLimitingDistance',limiting?.distanceNative,512.01);keep('forwardLimitingAngle',limiting?.angleDegrees,180);keep('forwardLimitingCurvature',limiting?.curvature,100);
      keep('forwardLimitingCurveTarget',limiting?.curveSpeed,1e6);keep('forwardLimitingEntryTarget',limiting?.entrySpeed,1e6);
    }
    keep('forwardPlanGrip',plan?.assumptions?.nativeGrip,100);keep('forwardPlanLateral',plan?.assumptions?.lateralAcceleration,1000);keep('forwardPlanBrake',plan?.assumptions?.brakingDeceleration,1000);
    return Object.freeze(out);
  }
  const snapshot=(forwardState,extra={})=>Object.freeze({forwardState,forwardSamples:0,forwardHorizon:0,forwardPriorityTurns:0,
    forwardRequestedTarget:undefined,forwardFailureCode:undefined,forwardGuardCode:undefined,forwardReadPhaseCode:undefined,forwardReadSubreasonCode:undefined,forwardNumericControlWord:undefined,forwardNumericFailureMask:undefined,forwardLeaseTicks:0,forwardCaptured:false,forwardNativeApplied:false,forwardLiveVerified:false,...extra});
  const numericEvidence=source=>Number.isInteger(source?.forwardNumericControlWord)&&source.forwardNumericControlWord>=0&&source.forwardNumericControlWord<=65535&&Number.isInteger(source?.forwardNumericFailureMask)&&source.forwardNumericFailureMask>=0&&source.forwardNumericFailureMask<=15?{forwardNumericControlWord:source.forwardNumericControlWord,forwardNumericFailureMask:source.forwardNumericFailureMask}:{};
  function policySettings(policy,native=false){
    if(!policy||typeof policy!=='object')return null;
    if(native){
      const p={mode:'native',cornerFactor:policy.cornerFactor??.8,sharpMargin:policy.sharpMargin??15,brakingFactor:policy.brakingFactor??.75,reactionSeconds:policy.reactionSeconds??.6,marginDistance:policy.marginDistance??8};
      return finite(p.cornerFactor,.6,1)&&finite(p.sharpMargin,0,25)&&finite(p.brakingFactor,.5,1)&&finite(p.reactionSeconds,.1,2)&&finite(p.marginDistance,0,30)?p:null;
    }
    const p={lateralAcceleration:policy.lateralAcceleration,brakingDeceleration:policy.brakingDeceleration,
      cornerFactor:policy.cornerFactor??.8,sharpMargin:policy.sharpMargin??15,reactionSeconds:policy.reactionSeconds??.6,
      marginDistance:policy.marginDistance??8,maxSpacing:policy.maxSpacing??20};
    if(!finite(p.lateralAcceleration,.5,12)||!finite(p.brakingDeceleration,.5,12)||!finite(p.cornerFactor,.6,.95)||
      !finite(p.sharpMargin,0,25)||!finite(p.reactionSeconds,.1,2)||!finite(p.marginDistance,0,30)||!finite(p.maxSpacing,1,25))return null;
    return p;
  }
  class Controller{
    constructor(memory,{installed=false,verified=false,moduleHash,moduleIdentity=null,geometry=null,publisher=null,nativeLease=false,runtimeGuard=null,schedule=root.setTimeout?.bind(root),cancelSchedule=root.clearTimeout?.bind(root),clock=()=>Date.now()}={}){
      this.memory=memory;this.installed=installed===true;this.profile=Profiles?.select?.(moduleHash);this.verified=verified===true&&!!this.profile;this.moduleIdentity=moduleIdentity;
      const Geometry=root.__NFSU2_FORWARD_GEOMETRY__||local('forward-geometry');
      const Clamp=root.__NFSU2_FORWARD_CLAMP__||local('forward-clamp');
      this.pacing=root.__NFSU2_FORWARD_PACING__||local('forward-pacing');
      this.geometry=geometry||(Geometry?.Controller?new Geometry.Controller(memory,{installed:this.installed,verified:this.verified,moduleHash,moduleIdentity}):null);
      this.publisher=publisher||(Clamp?.Publisher&&this.geometry?new Clamp.Publisher(this.geometry,{installed:this.installed,moduleIdentity}):null);
      this.key=null;this.pendingRequest=null;this.published=false;this.ownerSequence=null;this.evidence=Object.freeze({});
      this.nativeLease=nativeLease===true&&this.installed&&this.verified&&moduleHash==='2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d'&&typeof this.publisher?.leaseReceipt==='function';
      this.runtimeGuard=runtimeGuard;this.schedule=schedule;this.cancelSchedule=cancelSchedule;this.clock=clock;this.pumpTimer=null;this.pumpInput=null;this.inputAt=0;this.pumpSnapshot=null;this.leasePublication=null;
    }
    revoke(){
      // The cap occupies a subordinate part of the geometry claim. Revoke it
      // before clearing the geometry receipt or invalidating that owner.
      try{this.publisher?.stop();}catch{}
      try{this.geometry?.stop();}catch{}
      this.pendingRequest=null;this.published=false;this.ownerSequence=null;this.leasePublication=null;
      if(this.nativeLease){this.evidence=Object.freeze({});this.evidenceAt=null;}
    }
    stop(){this.cancelPump();this.pumpInput=null;this.revoke();this.key=null;this.evidence=Object.freeze({});this.pumpSnapshot=snapshot('off');return this.pumpSnapshot;}
    diagnosticEvidence(){
      if(!this.nativeLease)return this.evidence;
      const age=this.clock()-this.evidenceAt;
      if(!Number.isFinite(age)||age<0||age>100||!this.pumpInput||!this.pumpCurrent())this.evidence=Object.freeze({});
      let receipt=null;
      if(this.published&&this.leasePublication)try{receipt=this.publisher.leaseReceipt(this.leasePublication);}catch{receipt={status:'invalid'};}
      if(receipt?.status==='invalid'||receipt?.status==='expired')this.evidence=Object.freeze({});
      const acknowledged=receipt?.status==='acknowledged';
      const state=acknowledged?(this.pendingRequest!==null?'renewing':'acknowledged'):receipt?.status==='waiting'?'awaiting':receipt?.status==='expired'?'expired':receipt?.status==='invalid'?'invalid':'off';
      return Object.freeze({...this.evidence,forwardLeaseState:state,forwardLeaseAcknowledged:acknowledged,
        ...(Number.isInteger(receipt?.ageTicks)&&receipt.ageTicks>=0&&receipt.ageTicks<=400?{forwardLeaseAgeTicks:receipt.ageTicks}:{})});
    }
    invalidate(){this.stop();try{this.geometry?.invalidate();}catch{}this.verified=false;return snapshot('off');}
    cancelPump(){
      if(this.pumpTimer!==null){try{this.cancelSchedule?.(this.pumpTimer);}catch{}this.pumpTimer=null;}
    }
    pumpCurrent(){
      const age=this.clock()-this.inputAt;
      if(!Number.isFinite(age)||age<0||age>100||typeof this.runtimeGuard!=='function')return false;
      try{return this.runtimeGuard()===true;}catch{return false;}
    }
    schedulePump(){
      if(!this.nativeLease||!this.pumpInput||this.pumpTimer!==null||typeof this.schedule!=='function'||['off','unknown'].includes(this.pumpSnapshot?.forwardState))return;
      this.pumpTimer=this.schedule(()=>{
        this.pumpTimer=null;
        if(!this.pumpInput||!this.pumpCurrent()){this.stop();return;}
        this.pumpSnapshot=this.advance(this.pumpInput);
        this.schedulePump();
      },16);
    }
    update(input={}){
      if(!this.nativeLease)return this.advance(input);
      this.inputAt=this.clock();
      this.pumpInput={...input,aiState:input.aiState?{...input.aiState}:null,policy:input.policy?{...input.policy}:null};
      this.pumpSnapshot=this.advance(this.pumpInput);
      this.schedulePump();
      return this.pumpSnapshot;
    }

    advance({enabled=false,safe=false,offline=false,ordinaryRace=false,allowNetwork=false,applyTarget=true,aiState=null,handbackPending=false,expectedPace,identity,policy,gain=null}={}){
      if(!this.nativeLease)this.evidence=Object.freeze({});
      const nativeRequested=applyTarget==='native-policy',nativeEnabled=nativeRequested&&this.profile?.capabilities.nativePolicy===true;
      if(applyTarget!==true&&!nativeEnabled)try{this.publisher?.stop();}catch{}
      if(enabled!==true)return this.stop();
      const unknown=(code,guard,readSource)=>{const evidence=this.evidence;this.stop();if(!this.nativeLease)this.evidence=evidence;return snapshot('unknown',{forwardFailureCode:Number.isInteger(code)&&code>=1&&code<=10?code:undefined,forwardGuardCode:knownGuard(guard)?guard:undefined,...numericEvidence(readSource),...(Probe?.readEvidence?.(readSource)||{})});};
      if(!this.installed)return unknown(undefined,11);
      if(!this.verified)return unknown(undefined,12);
      if(!this.moduleIdentity)return unknown(undefined,13);
      if(!this.geometry||!this.publisher)return unknown(undefined,14);
      if(typeof this.pacing?.windowFromCapture!=='function'||typeof this.pacing?.plan!=='function')return unknown(undefined,15);
      if(safe!==true||(offline!==true&&allowNetwork!==true)||ordinaryRace!==true||aiState?.active!==true||aiState?.owned!==true||
        aiState?.switching===true||handbackPending===true){this.stop();return snapshot('waiting');}
      const settings=policySettings(policy,nativeRequested);
      if(!settings)return unknown(undefined,16);
      if(typeof identity!=='string'||!identity||identity.length>256)return unknown(undefined,17);
      if(!finite(expectedPace,.75,nativeRequested?2:3)||Math.abs(expectedPace*100-Math.round(expectedPace*100))>1e-5)return unknown(undefined,18);
      // UI/controller evidence invalidates a stale transaction, but cannot
      // authorize gain. Geometry and Publisher independently read native proof.
      const strengthCode=(gain?.command>>>10)&63;
      const gainReady=nativeRequested&&gain?.active===true&&gain.outputsVerified===true&&this.pacing?.physicsEvidenceValid?.(gain)===true&&(gain.appliedPercent??gain.percent)===Math.round(expectedPace*100)&&Number.isInteger(gain.command)&&gain.command>0&&gain.command<=0xffffffff&&strengthCode<=36&&gain.appliedStrength===1+strengthCode/4;
      const key=JSON.stringify([identity,allowNetwork===true,applyTarget,Math.round(expectedPace*100),...Object.values(settings),gainReady?gain.command:0]);
      if(this.key!==key){this.revoke();this.key=key;}
      // A caller may expose its current command generation. The native probe
      // independently validates it for every request and publication too.
      const observedSequence=aiState.ownerSequence;
      if(observedSequence!==undefined&&(!Number.isInteger(observedSequence)||observedSequence<=0||observedSequence>0xffffffff||(observedSequence&1)))return unknown(undefined,19);
      if(this.ownerSequence!==null&&observedSequence!==undefined&&observedSequence!==this.ownerSequence){this.revoke();this.key=key;}
      let exceptionGuard=44;
      try{
        if(this.pendingRequest!==null){
          exceptionGuard=43;
          const capture=this.geometry.poll();
          if(capture?.status==='waiting')return snapshot('waiting');
          const request=this.pendingRequest;this.pendingRequest=null;
          if(capture?.status!=='captured')return unknown(capture?.code,knownGuard(capture?.forwardGuardCode)?capture.forwardGuardCode:37,capture);
          if(capture.request!==request||capture.pace!==expectedPace||
            !Number.isInteger(capture.ownerSequence)||capture.ownerSequence<=0||capture.ownerSequence>0xffffffff||(capture.ownerSequence&1)||
            (observedSequence!==undefined&&capture.ownerSequence!==observedSequence))return unknown(undefined,39);
          const window=this.pacing.windowFromCapture(capture);
          if(nativeRequested&&!nativeEnabled){this.publisher.stop();this.ownerSequence=capture.ownerSequence;return snapshot('observed',{forwardSamples:window?.samples?.length||0,forwardHorizon:window?.samples?.at(-1)?.distance||0,forwardCaptured:window?.available===true});}
          const plan=window?.available===true?(nativeRequested?this.pacing.planNative?.(capture,capture.nativePolicy,{...settings,pace:expectedPace}):this.pacing.plan(window,settings)):null;
          this.evidence=Object.freeze({...planEvidence(plan),...numericEvidence(capture)});this.evidenceAt=this.clock();
          if(plan?.available!==true||!Array.isArray(window.samples)||window.samples.length<3||window.samples.length>48||
            !finite(plan.horizonDistance,0,(this.profile.runtime.maxHorizon||184)+.01)||!Number.isInteger(plan.priorityTurns)||plan.priorityTurns<0||plan.priorityTurns>24)return unknown(undefined,40);
          if((applyTarget!==true&&!nativeEnabled)||plan.override!==true){
            this.publisher.stop();this.published=false;this.leasePublication=null;this.ownerSequence=capture.ownerSequence;
            return snapshot(applyTarget!==true&&!nativeEnabled?'observed':'native-fallback',{forwardSamples:window.samples.length,forwardHorizon:plan.horizonDistance,forwardPriorityTurns:plan.priorityTurns,forwardCaptured:true,...numericEvidence(capture)});
          }
          exceptionGuard=42;
          const result=this.publisher.publish({capture,window,policy:settings});
          if(result?.status!=='armed'||result.request!==request||!finite(result.cap,Number.MIN_VALUE,150)||
            !Number.isInteger(result.maxAgeTicks)||result.maxAgeTicks<1||result.maxAgeTicks>400)return unknown(undefined,41);
          this.published=true;this.ownerSequence=capture.ownerSequence;
          this.leasePublication=this.nativeLease?{sequence:result.sequence,request:result.request,tick:capture.identity?.tick}:null;
          // Do not request another capture here: changing the native request
          // immediately revokes the cap just published. The next update starts
          // a fresh transaction. Lease/fallback gaps are intentionally allowed.
          return snapshot('armed',{forwardSamples:window.samples.length,forwardHorizon:plan.horizonDistance,
            forwardPriorityTurns:plan.priorityTurns,forwardRequestedTarget:result.cap,forwardLeaseTicks:result.maxAgeTicks,forwardCaptured:true,...numericEvidence(capture)});
        }
        if(this.published){
          if(this.nativeLease){
            const receipt=this.publisher.leaseReceipt(this.leasePublication);
            if(receipt?.status==='waiting')return this.pumpSnapshot?.forwardState==='armed'?this.pumpSnapshot:snapshot('waiting');
            if(receipt?.status==='invalid')return unknown(undefined,41);
            if(receipt?.status!=='acknowledged'&&receipt?.status!=='expired')return unknown(undefined,41);
            if(receipt.status==='expired'){this.revoke();this.key=key;}
            // A matching native cache receipt makes the prior lease independent
            // of the next geometry request. Its original400tick expiry remains.
          }else{this.revoke();this.key=key;}
        }
        const result=this.geometry.request({expectedPace,allowNetwork:allowNetwork===true});
        if(result?.status!=='waiting'||!Number.isInteger(result.request)||result.request<=0||(result.request&1))return unknown(undefined,38);
        this.pendingRequest=result.request;this.ownerSequence=observedSequence??null;
        return snapshot('requested');
      }catch(error){return unknown(undefined,errorGuard(error,exceptionGuard),error);}
    }
  }
  const api=Object.freeze({Controller,PIN,guardCodes,planReasonCodes});root.__NFSU2_FORWARD_DRIVING__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
