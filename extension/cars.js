/* Local-player car-only contacts. Exact-build hook; no body flag or map edits. */
(function(root){
  'use strict';
  const BASE=0xd0d1c0, MAGIC=0x3143414e, AI_BASE=0xd0d100, AI_MAGIC=0x3749414e;
  class Controller {
    constructor(memory,available=false,profile=null){this.memory=memory;this.available=!!available;this.onlineTrafficAvailable=profile?.onlineTraffic===true;this.onlinePlayersAvailable=profile?.onlinePlayers===true&&profile?.contactCounters===2;this.onlineRaceCarsAvailable=this.onlinePlayersAvailable&&profile?.onlineRaceCars===true;this.onlinePlayerOutrunAvailable=this.onlinePlayersAvailable&&profile?.onlinePlayerOutrun===true;this.onlineRivalsAvailable=this.onlineTrafficAvailable&&profile?.onlineRivals===true;this.words=null;this.view=null;this.onlineAddresses=profile?.onlineAddresses||[704405244,704522128,704406412];}
    refresh(){const b=this.memory.buffer;if(!this.view||this.view.buffer!==b){this.view=new DataView(b);this.words=new Int32Array(b);}return b.byteLength>=BASE+40;}
    read(off){return Atomics.load(this.words,(BASE+off)/4)>>>0;}
    write(off,v){Atomics.store(this.words,(BASE+off)/4,v|0);}
    guest(p){return p>=0x10000&&p+4<=Math.min(this.view.byteLength,0x28000000)?this.view.getUint32(p,true):0;}
    onlineRoam(){
      // The verified module profile supplies roam_game_online_here addresses.
      const [a,b,c]=this.onlineAddresses;
      return this.view.byteLength>=Math.max(a+4,b+1,c+4)&&!!this.view.getUint32(a,true)&&!!this.view.getUint8(b)&&!!this.view.getUint32(c,true);
    }
    publish(enabled=false,player=0,car=0,race=0,onlineTraffic=false,onlinePlayers=false,onlineRaceCars=false,onlineRivals=false){
      if(!this.available||!this.refresh()||this.guest(AI_BASE+28)!==AI_MAGIC)return false;
      if(this.read(0)!==MAGIC){for(let off=0;off<40;off+=4)if(this.read(off)!==0)return false;}
      const mode=enabled===true&&onlineRaceCars===true&&this.onlineRaceCarsAvailable?4:enabled===true?((onlineTraffic===true&&this.onlineTrafficAvailable?1:0)|(onlinePlayers===true&&this.onlinePlayersAvailable?2:0)|(onlineRivals===true&&this.onlineRivalsAvailable?8:0)):0;
      const identityChanged=this.read(36)!==mode||this.read(12)!==player||this.read(16)!==car||this.read(20)!==race;
      let seq=this.read(4);if(seq&1)seq++;
      this.write(4,seq+1);this.write(0,MAGIC);this.write(8,enabled===true?1:0);this.write(12,player);this.write(16,car);this.write(20,race);this.write(36,mode);
      if(!enabled||identityChanged){this.write(24,0);this.write(28,0);this.write(32,0);}
      this.write(4,seq+2);return true;
    }
    stop(){this.publish(false);return this.status();}
    update({enabled=false,onlineTraffic=false,onlinePlayers=false,onlineRivals=false,safe=false,state=null,allowNetwork=false}={}){
      this.refresh();const p=this.guest(0xd00000),roam=this.onlineRoam(),raceType=this.guest(0x89e7b0);
      const networkMode=this.guest(0x850078)&0x208;
      // Engine.state includes the port's online free-roam tuple. It is not an
      // Online/LAN race by itself. Keep the native contact hook's conventional
      // network exclusions and ordinary-roam category boundary intact.
      const conventionalNetwork=!!(networkMode||this.guest(0x866a14)||this.guest(0x8669f4)||this.view.getUint8(0x89cf69));
      const special=[0x89e7d8,0x89e7d9,0x89e7e3].some(a=>this.view.getUint8(a))||[0x890104,0x890108,0x89010c,0x890114].some(a=>this.guest(a));
      const onlineFreeRoam=roam&&raceType===0&&!conventionalNetwork&&!special;
      const onlineRivalContext=roam&&(raceType===0||raceType===7)&&!conventionalNetwork&&!special;
      const onlinePlayerContext=onlineFreeRoam||(this.onlinePlayerOutrunAvailable&&onlineRivalContext&&raceType===7);
      const permittedRoam=onlineFreeRoam&&allowNetwork===true;
      const traffic=onlineTraffic===true&&this.onlineTrafficAvailable&&permittedRoam,players=onlinePlayers===true&&this.onlinePlayersAvailable&&onlinePlayerContext&&allowNetwork===true;
      const rivals=onlineRivals===true&&this.onlineRivalsAvailable&&onlineRivalContext&&allowNetwork===true;
      const raceCars=onlinePlayers===true&&this.onlineRaceCarsAvailable&&state?.network===true&&allowNetwork===true&&raceType===1&&(networkMode===8||networkMode===0x200);
      const solo=enabled===true&&!state?.network&&!roam;
      const wanted=safe===true&&state?.ready&&state.driving&&this.guest(p+4)===state.car&&(raceCars||traffic||players||rivals||solo);
      this.publish(!!wanted,p,state?.car||0,state?.race||0,!raceCars&&!!traffic,!raceCars&&!!players,!!raceCars,!raceCars&&!!rivals);
      const result=this.status();
      const networkReason='Paused in Online/LAN races. Online no-clip only supports free roam.';
      const waiting='Waiting for online free roam. Races and outruns keep normal collisions.';
      const roamPermission='Paused · enable Allow network tools for online free roam';
      result.soloReason=!enabled?'OFF · other cars only · solo':onlineFreeRoam?'Paused online · use the separate traffic/player switches':state?.network?networkReason:roam?'Paused online · use the separate traffic/player switches':result.reason;
      result.trafficReason=!onlineTraffic?'OFF · traffic only · online free roam':!this.onlineTrafficAvailable?'Online traffic no-clip is not verified for this build.':onlineFreeRoam&&!permittedRoam?roamPermission:conventionalNetwork?networkReason:!onlineFreeRoam?waiting:result.onlineTraffic?!result.trafficHitsExact?'Armed · traffic · contacts counted with NPC rivals':result.trafficHits?`${result.trafficHits} traffic contacts skipped`:'Armed · online traffic only':result.reason;
      const raceReason=!this.onlineRaceCarsAvailable?networkReason:allowNetwork!==true?'Paused · enable Allow network tools for race car no-clip':raceType!==1?'Waiting for an active Online/LAN race':result.onlineRaceCars?result.playerHits?`${result.playerHits} race-car contacts skipped locally`:'Armed · online race cars · local contacts only':result.reason;
      result.playersReason=!onlinePlayers?'OFF · online players / race cars':!this.onlinePlayersAvailable?'Online player no-clip is not verified for this build.':onlinePlayerContext?(allowNetwork!==true?roamPermission:result.onlinePlayers?result.playerHits?`${result.playerHits} player-car contacts skipped`:raceType===7?'Armed · current player challenge only':'Armed · online player cars only':result.reason):state?.network&&raceType===1?raceReason:waiting;
      result.rivalsReason=onlineRivals!==true?'OFF · NPC rivals':!this.onlineRivalsAvailable?'NPC rival no-clip is not verified for this build.':allowNetwork!==true?'Paused · enable Allow network tools':!onlineRivalContext?'Waiting for online free roam or an NPC outrun':result.onlineRivals?'Armed · NPC rivals · aggregate car contacts':result.reason;
      if(!result.requested)result.reason=onlineRivals===true?result.rivalsReason:onlinePlayers?result.playersReason:onlineTraffic?result.trafficReason:result.soloReason;
      return result;
    }
    status(){
      if(!this.available)return {available:false,requested:false,hits:0,reason:'Reload after installing the car-contact module.'};
      if(!this.refresh()||this.guest(AI_BASE+28)!==AI_MAGIC)return {available:true,requested:false,hits:0,reason:'Waiting for the native game loop.'};
      if(this.read(0)!==MAGIC)return {available:true,requested:false,hits:0,reason:'Car no-clip paused: command memory is unavailable.'};
      const seq=this.read(4);
      if(seq&1)return {available:true,requested:false,hits:0,reason:'Car no-clip paused: waiting for a complete command.'};
      const mode=this.read(36),onlineRaceCars=mode===4&&this.onlineRaceCarsAvailable,onlineTraffic=!!(mode&1)&&this.onlineTrafficAvailable,onlinePlayers=(!!(mode&2)||onlineRaceCars)&&this.onlinePlayersAvailable,onlineRivals=!!(mode&8)&&this.onlineRivalsAvailable,wanted=this.read(8)===1,code=this.read(24),primaryHits=this.read(28),p=this.guest(0xd00000),car=this.guest(p+4);
      const mask=(this.onlineTrafficAvailable?1:0)|(this.onlinePlayersAvailable?2:0)|(this.onlineRivalsAvailable?8:0),validMode=mode===4?this.onlineRaceCarsAvailable:(mode&~mask)===0;
      const current=wanted&&validMode&&p===this.read(12)&&car===this.read(16)&&this.guest(0x890118)===this.read(20)&&this.read(0)===MAGIC&&this.read(4)===seq;
      const trafficHitsExact=!onlineRivals,trafficHits=current&&onlineTraffic&&trafficHitsExact?primaryHits:0,playerHits=current&&onlinePlayers?this.read(32):0,hits=current?primaryHits+playerHits:0;
      const category=onlineRaceCars?'race-car':onlineRivals?'car':onlinePlayers?(onlineTraffic?'traffic/player':'player-car'):onlineTraffic?'traffic':'car';
      const contactCounterScope=onlineRivals?'aggregate-car-contacts':mode?'separate-traffic-and-player':'solo-car-contacts';
      const onlinePlayerOutrun=current&&onlinePlayers&&!onlineRaceCars&&this.onlinePlayerOutrunAvailable&&this.guest(0x89e7b0)===7;
      return {available:true,requested:current,onlineTraffic:current&&onlineTraffic,onlinePlayers:current&&onlinePlayers,onlineRaceCars:current&&onlineRaceCars,onlinePlayerOutrun,onlineRivals:current&&onlineRivals,trafficHitsExact,contactCounterScope,trafficHits,playerHits,hits,reason:!current?'Paused or off.':code===2?'Paused online or in an Online/LAN race.':code===3?'Waiting for online free roam.':hits?`${hits} ${category} contacts skipped · ground and walls unchanged`:mode?`Armed · online ${category} contacts only`:'Armed · waiting for a car contact'};
    }
  }
  const api={Controller,BASE,MAGIC};root.__NFSU2_CARS__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
