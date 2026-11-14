/* Session-only clearance reductions for an already owned online free-roam AI.
 * Uses existing observations and pace commands; no steering or route proof. */
(function(root){
  'use strict';
  const finite=(value,lo,hi)=>typeof value==='number'&&Number.isFinite(value)&&value>=lo&&value<=hi;
  const result=(state,extra={})=>({active:false,state,pace:null,wholeRouteChecked:false,collisionGuarantee:false,...extra});
  class Controller{
    constructor({Pacing=root.__NFSU2_DYNAMIC_PACING__?.Pacing,contactPreview=root.__NFSU2_CITY_CONTACT_PREVIEW__?.filter}={}){
      this.pacer=typeof Pacing==='function'?new Pacing():null;
      this.contactPreview=typeof contactPreview==='function'?contactPreview:null;
    }
    reset(){this.pacer?.reset();return result('off');}
    update({enabled=false,verified=false,capabilities=null,automaticAI=false,allowNetwork=false,
      safe=false,focused=false,hidden=true,menuOpen=false,tunerBusy=false,hud=0,raceType=-1,
      drag=false,drift=false,streetX=false,engine=null,state=null,aiState=null,handbackPending=false,
      identity,now,selectedPace=1,nativeSpeed,carController=null,moduleHash=null}={}){
      const paused=reason=>{this.pacer?.reset();return result(reason);};
      if(enabled!==true)return paused('off');
      if(!this.pacer||verified!==true||capabilities?.ai!==true||capabilities?.pace!==true)return paused('unsupported');
      if(allowNetwork!==true)return paused('network-permission');
      if(state?.network!==true)return paused('not-online');
      if(hud!==2||raceType!==0||drag!==false||drift!==false||streetX!==false)return paused('mode');
      if(automaticAI!==true)return paused('ai-off');
      if(safe!==true||focused!==true||hidden!==false||menuOpen!==false||tunerBusy!==false||state?.ready!==true||state.driving!==true)return paused('paused');
      if(aiState?.available!==true||aiState.ready!==true||aiState.active!==true||aiState.owned!==true||aiState.switching===true||handbackPending===true)return paused('waiting-owner');
      if(!finite(selectedPace,.75,3)||typeof identity!=='string'||!identity||identity.length>160)return paused('invalid');
      try{
        if(!engine||typeof engine.live!=='function'||typeof engine.state!=='function'||typeof engine.ok!=='function'||typeof engine.u32!=='function'||typeof engine.u8!=='function'||typeof engine.pacingHazards!=='function'||!engine.live(state,true,true))return paused('waiting-owner');
        const player=engine.u32(0xd00000),driver=engine.u32(state.car+0x2c);
        const valid=(pointer,bytes)=>Number.isSafeInteger(pointer)&&pointer%4===0&&engine.ok(pointer,bytes);
        const ownerCurrent=()=>engine.live(state,true,true)&&engine.state().network===true&&engine.u32(0x89e7b0)===0&&
          !engine.u8(0x89e7d8)&&!engine.u8(0x89e7d9)&&!engine.u8(0x89e7e3)&&![0x890104,0x890108,0x89010c,0x890114].some(address=>engine.u32(address))&&engine.u32(0x850088)!==10&&
          valid(player,0x14)&&valid(state.car,0x9e4)&&valid(state.race,0xc44)&&valid(driver,0x800)&&
          engine.u32(0xd00000)===player&&engine.u32(player+4)===state.car&&engine.u32(player+0x10)===0&&engine.u32(state.car+0x24)===3&&
          engine.u32(state.car+0x2c)===driver&&engine.u32(driver)===0x785370&&engine.u32(driver+4)===state.car;
        if(!ownerCurrent())return paused('waiting-owner');
        const rawHazards=engine.pacingHazards(state,true,true);
        const contacts=this.contactPreview?.({engine,state,controller:carController,verified,moduleHash,hazards:rawHazards});
        const hazards=contacts?.hazards||rawHazards;
        if(!ownerCurrent())return paused('waiting-owner');
        const pacing=this.pacer.update({enabled:true,ceiling:selectedPace,nativePaceSelected:true,identity:[identity,player,state.car,state.race,driver].join(':'),now,evidence:{},speedMps:nativeSpeed,hazards,brakingMps2:4});
        if(pacing.active!==true||!finite(pacing.pace,.75,selectedPace))return paused('invalid');
        const maxPace=selectedPace,pace=Math.min(maxPace,pacing.pace);
        return result(pacing.state==='clearance-limited'?'clearance-limited':'selected-native',{active:true,pace,selectedPace,maxPace,
          clearanceObserved:pacing.clearance?.observed===true,clearanceDistance:pacing.clearance?.observed===true?pacing.clearance.distanceM:null,
          clearanceSource:pacing.clearance?.observed===true?pacing.clearance.source:null,clearanceTarget:pacing.clearance?.observed===true?pacing.clearance.targetMps:null,
          timingState:pacing.timingState,sampleGapMs:pacing.sampleGapMs,
          contactPreviewAvailable:contacts?.available===true,contactPreviewState:contacts?.state||'unavailable',
          observedCars:contacts?.observedCars,excludedCars:contacts?.excludedCars,
          speedUnits:'native-coordinate-units-per-native-second'});
      }catch{return paused('waiting-owner');}
    }
  }
  const api=Object.freeze({Controller});root.__NFSU2_CITY_PACING__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
