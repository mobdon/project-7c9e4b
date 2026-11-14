/* Player-only near-vertical track contacts. Pinned native hook; no map edits. */
(function(root){
  'use strict';
  const BASE=0xd0d180, MAGIC=0x38574c4e, AI_BASE=0xd0d100, AI_MAGIC=0x3749414e;
  class Controller {
    constructor(memory,available=false,profile=null){this.memory=memory;this.available=!!available;this.words=null;this.view=null;this.onlineAddresses=profile?.onlineAddresses||[703669484,703786368,703670652];}
    refresh(){const b=this.memory.buffer;if(!this.view||this.view.buffer!==b){this.view=new DataView(b);this.words=new Int32Array(b);}return b.byteLength>=BASE+40;}
    read(off){return Atomics.load(this.words,(BASE+off)/4)>>>0;}
    write(off,v){Atomics.store(this.words,(BASE+off)/4,v|0);}
    guest(p){return p>=0x10000&&p+4<=Math.min(this.view.byteLength,0x28000000)?this.view.getUint32(p,true):0;}
    onlineRoam(){
      // The verified module profile supplies roam_game_online_here addresses.
      const [a,b,c]=this.onlineAddresses;
      return this.view.byteLength>=Math.max(a+4,b+1,c+4)&&!!this.view.getUint32(a,true)&&!!this.view.getUint8(b)&&!!this.view.getUint32(c,true);
    }
    publish(enabled=false,player=0,car=0,race=0){
      if(!this.available||!this.refresh()||this.guest(AI_BASE+28)!==AI_MAGIC)return false;
      if(this.read(0)!==MAGIC){for(let off=0;off<40;off+=4)if(this.read(off)!==0)return false;}
      let seq=this.read(4);if(seq&1)seq++;
      this.write(4,seq+1);this.write(0,MAGIC);this.write(8,enabled===true?1:0);this.write(12,player);this.write(16,car);this.write(20,race);
      if(!enabled){this.write(24,0);this.write(28,0);this.write(32,0);}
      this.write(4,seq+2);return true;
    }
    stop(){this.publish(false);return this.status();}
    update({enabled=false,safe=false,state=null}={}){
      this.refresh();const p=this.guest(0xd00000);
      const wanted=enabled===true&&safe===true&&state?.ready&&state.driving&&!state.network&&!this.onlineRoam()&&this.guest(p+4)===state.car;
      this.publish(!!wanted,p,state?.car||0,state?.race||0);
      const result=this.status();
      if(enabled&&(state?.network||this.onlineRoam()))result.reason='Paused online. Turn Free roam with others off, or use a solo race.';
      return result;
    }
    status(){
      if(!this.available)return {available:false,requested:false,hits:0,reason:'Reload after installing the wall-contact module.'};
      if(!this.refresh()||this.guest(AI_BASE+28)!==AI_MAGIC)return {available:true,requested:false,hits:0,reason:'Waiting for the native game loop.'};
      const wanted=this.read(8)===1,code=this.read(24),hits=this.read(28),p=this.guest(0xd00000),car=this.guest(p+4);
      const current=wanted&&p===this.read(12)&&car===this.read(16)&&this.guest(0x890118)===this.read(20);
      return {available:true,requested:current,hits:current?hits:0,reason:!current?'Paused or off.':code===2?'Paused online. Turn Free roam with others off, or use a solo race.':hits?`${hits} wall contacts skipped · ground and cars unchanged`:'Armed · waiting for a supported wall contact'};
    }
  }
  const api={Controller,BASE,MAGIC};root.__NFSU2_WALLS__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
