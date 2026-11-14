(function(root){
  'use strict';
  const MAX_ACK_AGE_MS=1000, MAX_PERCENT=200, MAX_STRENGTH=10, PUBLICATIONS=32768;
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const uint=value=>Number.isInteger(value)&&value>=0&&value<=0xffffffff;
  const car=value=>uint(value)&&value>=0x10000&&value<0x28000000&&(value&3)===0;
  const time=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER;
  const identity=value=>(typeof value==='string'&&value.length>0)||(value!==null&&(typeof value==='object'||typeof value==='function'));
  const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
  function decode(value){
    if(!uint(value)||!(value>>>16))return null;
    const percent=value&255,enabled=!!(value&256),stackingReady=!!(value&512);
    const strengthCode=(value>>>10)&63,strength=1+strengthCode/4;
    return percent>=100&&percent<=MAX_PERCENT&&strength<=MAX_STRENGTH&&(enabled||percent===100&&strengthCode===0)?{percent,enabled,stackingReady,strengthCode,strength}:null;
  }
  function coherent(ack,currentCar,ownerSequence){
    if(!object(ack)||!decode(ack.command)||ack.car!==currentCar||!car(ack.car)||ack.publisher!==1||
      !Number.isInteger(ack.publication)||ack.publication<0||ack.publication>=PUBLICATIONS||
      ![1,2,3].includes(ack.reason)||!Number.isInteger(ack.percent)||ack.percent<100||ack.percent>MAX_PERCENT)return false;
    const request=decode(ack.command);
    if(ack.reason===1){
      const p=Math.fround(request.percent/100),m=ack.sourceFactor,e=Math.fround(Math.fround(m*p)*request.strength),t=Math.fround(e*p);
      return request.enabled&&request.stackingReady&&ack.ownerSequence===ownerSequence&&ack.percent===request.percent&&ack.strength===request.strength&&ack.strengthCode===request.strengthCode&&
        Number.isFinite(m)&&m>0&&m===Math.fround(m)&&Number.isFinite(e)&&e>0&&Number.isFinite(t)&&t>0&&
        ack.powerFactor===e&&ack.tireFactor===t&&ack.outputsVerified===true&&
        ((ack.physicsKind===undefined||ack.physicsKind===1)&&ack.wheelHits===4||ack.physicsKind===3&&ack.evidenceKind==='combined-grip'&&ack.wheelHits===0&&ack.gripHits===1&&Number.isFinite(ack.combinedGripFactor)&&ack.combinedGripFactor>0);
    }
    return ack.percent===100&&(ack.reason===2)===!request.enabled;
  }
  function advanced(next,previous){
    const distance=(next-previous+PUBLICATIONS)%PUBLICATIONS;
    // A backwards/ambiguous half-cycle is not evidence of a new publication.
    return distance>0&&distance<PUBLICATIONS/2;
  }
  class Controller {
    constructor(memory,options={}){
      options=object(options)?options:{};
      this.memory=memory;this.installed=options.installed;this.verified=options.verified;
      this.moduleHash=options.moduleHash;this.moduleIdentity=options.moduleIdentity;
      this.protocol=options.protocol||root.__NFSU2_PACED_CATCHUP__;
      this._binding=null;this._command=null;this._lastPublication=null;this._lastAdvanceAt=null;
      this._lastNow=null;this._lastInput={};this._force=true;this._stopLatched=false;
      this._ownerSequence=null;
      this._stopSawDisabled=false;this._stopping=false;this._clockInvalid=false;
      this._snapshot=Object.freeze({state:'waiting',reason:'not-polled',active:false,requested:false,
        commandEnabled:false,command:null,requestedPercent:100,appliedPercent:null,currentCar:null,
        publication:null,ackAgeMs:null,resetPending:false,resetAcknowledged:false,supported:false,verified:false,
        requestedStrength:1,appliedStrength:null,strength:null,strengthCode:null,sourceFactor:null,powerFactor:null,tireFactor:null,relativePowerGain:null,relativeTireGain:null,wheelHits:null,outputsVerified:false,ackRejectCode:null,physicsKind:null,evidenceKind:null,combinedGripFactor:null,nativeStage:null});
    }
    _forget(){this._command=null;this._lastPublication=null;this._lastAdvanceAt=null;this._force=true;}
    _status(base,state,reason,extra={}){
      this._snapshot=Object.freeze({...base,state,reason,...extra});return this._snapshot;
    }
    update(input={}){
      if(!object(input))input={enabled:false,now:NaN};
      this._lastInput={...input};
      for(const key of ['memory','installed','verified','moduleHash','moduleIdentity','protocol'])if(own(input,key))this[key]=input[key];
      const requested=input.enabled===true,percent=input.percent===undefined?100:input.percent;
      const validPercent=Number.isInteger(percent)&&percent>=100&&percent<=MAX_PERCENT;
      const strength=input.strength===undefined?1:input.strength;
      const validStrength=Number.isFinite(strength)&&strength>=1&&strength<=MAX_STRENGTH&&Number.isInteger((strength-1)*4);
      const ownerSequence=input.ownerSequence;
      const validOwner=uint(ownerSequence)&&ownerSequence>0&&(ownerSequence&1)===0;
      const currentCar=car(input.currentCar)?input.currentCar:null;
      const base={active:false,requested,commandEnabled:false,command:null,requestedPercent:validPercent?percent:null,
        appliedPercent:null,currentCar,publication:null,ackAgeMs:null,resetPending:false,resetAcknowledged:false,
        supported:false,verified:this.installed===true&&this.verified===true,
        requestedStrength:validStrength?strength:null,appliedStrength:null,strength:null,strengthCode:null,sourceFactor:null,powerFactor:null,tireFactor:null,relativePowerGain:null,relativeTireGain:null,wheelHits:null,outputsVerified:false,ackRejectCode:null,physicsKind:null,evidenceKind:null,combinedGripFactor:null,nativeStage:null};
      if(this._stopLatched&&!this._stopping){
        if(input.enabled===false)this._stopSawDisabled=true;
        else if(requested&&this._stopSawDisabled){this._stopLatched=false;this._stopSawDisabled=false;}
      }
      let now=input.now,validTime=time(now)&&(this._lastNow===null||now>=this._lastNow);
      if(!validTime){
        if(!this._clockInvalid)this._forget();
        this._clockInvalid=true;this._lastNow=null;
      }else{
        // A publication first observed after a long polling gap may itself be
        // historical. Reissue a generation instead of dating it as live now.
        if(this._clockInvalid||(this._lastNow!==null&&now-this._lastNow>MAX_ACK_AGE_MS))this._forget();
        this._clockInvalid=false;this._lastNow=now;
      }
      const protocol=this.protocol;
      if(!base.verified){this._binding=null;this._forget();return this._status(base,'unverified','module-not-verified');}
      if(!hash(this.moduleHash)||!identity(this.moduleIdentity)){
        this._binding=null;this._forget();return this._status(base,'unverified','module-identity-unavailable');
      }
      if(!protocol||!['supports','select','claim','command','readAck'].every(key=>typeof protocol[key]==='function')){
        this._binding=null;this._forget();return this._status(base,'unsupported','protocol-unavailable');
      }
      let buffer,profile;
      try{
        if(protocol.supports(this.moduleHash)!==true||!(profile=protocol.select(this.moduleHash))){
          this._binding=null;this._forget();return this._status(base,'unsupported','module-unsupported');
        }
        buffer=this.memory?.buffer;
      }catch{
        this._binding=null;this._forget();return this._status(base,'protocol-error','profile-error');
      }
      base.supported=true;
      if(typeof SharedArrayBuffer==='undefined'||!(buffer instanceof SharedArrayBuffer)){
        this._binding=null;this._forget();return this._status(base,'unavailable','shared-memory-unavailable');
      }
      const nextBinding=[this.memory,buffer,this.moduleHash,this.moduleIdentity,protocol,currentCar,input.network,input.allowNetwork===true];
      if(!this._binding||nextBinding.some((value,index)=>value!==this._binding[index])){
        this._forget();this._binding=nextBinding;
      }
      let reason=null;
      if(input.enabled!==undefined&&typeof input.enabled!=='boolean')reason='invalid-enabled';
      else if(!validTime)reason='invalid-time';
      else if(!validPercent)reason='invalid-percent';
      else if(!validStrength)reason='invalid-strength';
      else if(!currentCar)reason='current-car-unavailable';
      else if(this._stopLatched)reason='stopped';
      else if(requested&&input.safe!==true)reason='unsafe';
      else if(requested&&input.ordinaryRace!==true)reason='not-ordinary-race';
      else if(requested&&typeof input.network!=='boolean')reason='network-unknown';
      else if(requested&&input.network===true&&input.allowNetwork!==true)reason='network-permission';
      else if(requested&&(!object(input.aiState)||input.aiState.active!==true||input.aiState.owned!==true))reason='ai-unowned';
      else if(requested&&!validOwner)reason='owner-generation-unavailable';
      const stackingReady=input.customPower===1&&input.customGrip===1&&
        ['customBoost','customUnlimit','boost','unlimit','grip'].every(key=>!own(input,key)||input[key]===false)&&
        input.featureOwnsPace===true&&validPercent&&validStrength&&input.selectedPace===percent/100;
      if(!reason&&requested&&!stackingReady)reason='stacking-not-neutral';
      const enabled=requested&&!reason;
      if(enabled&&this._ownerSequence!==ownerSequence){this._forget();this._ownerSequence=ownerSequence;}
      else if(!enabled)this._ownerSequence=null;
      let previous,command,ack;
      try{
        if(protocol.claim(this.memory)!==true){this._forget();return this._status(base,'blocked','foreign-mailbox');}
        previous=protocol.readAck(this.memory);
        command=protocol.command(this.memory,{enabled,percent:enabled?percent:100,strength:enabled?strength:1,ownerSequence:enabled?ownerSequence:undefined,stackingReady:enabled&&stackingReady,forceGeneration:this._force});
        const decoded=decode(command);
        if(!decoded||decoded.enabled!==enabled||decoded.percent!==(enabled?percent:100)||decoded.strength!==(enabled?strength:1)||decoded.stackingReady!==(enabled&&stackingReady))throw Error('command');
        if(this._force||command!==this._command){
          this._lastPublication=coherent(previous,currentCar,ownerSequence)?previous.publication:null;
          this._lastAdvanceAt=null;this._command=command;
        }
        this._force=false;
        if(typeof protocol.readEvidence==='function'){
          const observed=protocol.readEvidence(this.memory);ack=observed.ack;
          base.ackRejectCode=Number.isInteger(observed.ackRejectCode)&&observed.ackRejectCode>=0&&observed.ackRejectCode<=31?observed.ackRejectCode:null;
          base.physicsKind=[1,3].includes(observed.physicsKind)?observed.physicsKind:null;base.evidenceKind=['four-tires','combined-grip'].includes(observed.evidenceKind)?observed.evidenceKind:null;
          base.nativeStage=Number.isInteger(observed.nativeStage)&&observed.nativeStage>=0&&observed.nativeStage<=31?observed.nativeStage:null;
        }else ack=protocol.readAck(this.memory);
      }catch{
        this._forget();return this._status(base,'protocol-error','mailbox-error',{resetPending:true});
      }
      base.command=command;base.commandEnabled=enabled;
      const match=coherent(ack,currentCar,ownerSequence)&&ack.command===command;
      if(match){
        if(this._lastPublication===null)this._lastPublication=ack.publication;
        else if(advanced(ack.publication,this._lastPublication)){
          this._lastPublication=ack.publication;
          this._lastAdvanceAt=validTime?now:null;
        }else if(ack.publication!==this._lastPublication){
          // Rebase after counter rollback/ambiguous wrap; never retain active.
          this._lastPublication=ack.publication;this._lastAdvanceAt=null;
        }
      }else{
        // A lost or changed receipt invalidates prior live evidence immediately.
        this._lastAdvanceAt=null;
      }
      const age=validTime&&this._lastAdvanceAt!==null?now-this._lastAdvanceAt:null;
      const fresh=match&&age!==null&&age>=0&&age<=MAX_ACK_AGE_MS;
      const evidence={publication:match?ack.publication:null,ackAgeMs:age};
      if(fresh&&enabled&&ack.reason===1)return this._status(base,'applied','native-publication-confirmed',{
        ...evidence,active:true,appliedPercent:ack.percent,sourceFactor:ack.sourceFactor,
        powerFactor:ack.powerFactor,tireFactor:ack.tireFactor,appliedStrength:ack.strength,strength:ack.strength,strengthCode:ack.strengthCode,
        relativePowerGain:Math.fround(Math.fround(ack.percent/100)*ack.strength),
        relativeTireGain:Math.fround(Math.fround(Math.fround(ack.percent/100)*ack.strength)*Math.fround(ack.percent/100)),wheelHits:ack.wheelHits,gripHits:ack.gripHits,combinedGripFactor:ack.combinedGripFactor??null,scalarFactor:ack.scalarFactor,aeroDivisor:ack.aeroDivisor,outputsVerified:true});
      if(fresh&&enabled&&ack.reason===3)return this._status(base,'guarded-native','native-guarded',{
        ...evidence,appliedPercent:100});
      if(fresh&&!enabled&&ack.reason===2)return this._status(base,'off',reason||'native-off-confirmed',{
        ...evidence,appliedPercent:100,resetAcknowledged:true});
      return this._status(base,enabled?'waiting':'reset-pending',reason||(age!==null&&age>MAX_ACK_AGE_MS?'ack-expired':'awaiting-publication'),{
        ...evidence,resetPending:!enabled});
    }
    stop(input={}){
      if(!this._stopLatched){this._stopLatched=true;this._stopSawDisabled=false;this._force=true;}
      this._stopping=true;
      try{return this.update({...this._lastInput,...(object(input)?input:{}),enabled:false});}
      finally{this._stopping=false;}
    }
    status(now){
      if(now===undefined)return this._snapshot;
      if(!time(now)||this._lastNow===null||now<this._lastNow||
        (this._lastAdvanceAt!==null&&now-this._lastAdvanceAt>MAX_ACK_AGE_MS)){
        const prior=this._snapshot;
        return Object.freeze({...prior,active:false,appliedPercent:null,resetAcknowledged:false,
          appliedStrength:null,strength:null,strengthCode:null,sourceFactor:null,powerFactor:null,tireFactor:null,relativePowerGain:null,relativeTireGain:null,wheelHits:null,gripHits:null,combinedGripFactor:null,scalarFactor:null,aeroDivisor:null,outputsVerified:false,
          resetPending:prior.command!==null&&!prior.commandEnabled,state:prior.commandEnabled?'waiting':prior.command!==null?'reset-pending':prior.state,
          reason:'ack-expired',ackAgeMs:time(now)&&this._lastAdvanceAt!==null?now-this._lastAdvanceAt:null});
      }
      return this._snapshot;
    }
  }
  const api=Object.freeze({Controller,MAX_ACK_AGE_MS,MAX_PERCENT,MAX_STRENGTH});
  root.__NFSU2_PACED_CATCHUP_CONTROLLER__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
