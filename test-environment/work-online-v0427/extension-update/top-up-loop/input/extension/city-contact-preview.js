/* Read-only preview of ordinary-roam car contact eligibility. Current exact
 * module only. A selected switch is never enough to exclude a vehicle. */
(function(root){
  'use strict';
  const HASH='c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391';
  const C=0xd0d1c0,A=0xd0d100,CM=0x3143414e,AM=0x3749414e;
  const PORT=[702898672,705326832,705311452],SLOTS=703504048,STRIDE=1568,COUNT=64;
  const BASE=0x890160,RECORD=0x940,BITMAP=695752272;
  const PROFILES=Object.freeze({[HASH]:Object.freeze({PORT,SLOTS,BITMAP}),'395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e':Object.freeze({PORT:Object.freeze([704975480,707403664,707388276]),SLOTS:705580864,BITMAP:697812912}),'3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb':Object.freeze({PORT:Object.freeze([705706016,708134192,708118804]),SLOTS:706311392,BITMAP:697814592}),'f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b':Object.freeze({PORT:Object.freeze([704979224,707407408,707392020]),SLOTS:705584608,BITMAP:697815584}),'2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d':Object.freeze({PORT:Object.freeze([704980184,707408368,707392980]),SLOTS:705585568,BITMAP:697816560})});
  function filter({engine,state,controller,verified=false,moduleHash,hazards}={}){
    const unchanged=reason=>({hazards,available:false,state:reason,observedCars:hazards?.cars?.length||0,excludedCars:0});
    const profile=typeof moduleHash==='string'&&Object.hasOwn(PROFILES,moduleHash)?PROFILES[moduleHash]:null;
    if(verified!==true||!profile)return unchanged('exact-build-required');
    const {PORT,SLOTS,BITMAP}=profile;
    if(!hazards||!Array.isArray(hazards.cars)||hazards.cars.length>96)return unchanged('scan-unavailable');
    try{
      if(!engine?.live(state,true,true)||!controller?.available||!controller.refresh())return unchanged('context-unavailable');
      const memory=engine.memory,buffer=memory?.buffer;
      if(Object.prototype.toString.call(buffer)!=='[object SharedArrayBuffer]'||controller.memory!==memory||buffer.byteLength<BITMAP+32768)return unchanged('memory-unavailable');
      const d=new DataView(buffer),reads=[],committedBits=new Map();
      const span=(p,n,guest=false)=>{
        if(!Number.isSafeInteger(p)||p<0||!Number.isSafeInteger(n)||n<1||p+n>buffer.byteLength)throw Error('bounds');
        if(guest){
          if(p<0x10000||p%4||p+n>0x28000000)throw Error('guest-bounds');
          for(let page=Math.floor(p/16384);page<=Math.floor((p+n-1)/16384);page++){
            const at=BITMAP+(page>>>3),value=d.getUint8(at),bit=1<<(page&7);
            if(!(value&bit))throw Error('uncommitted');
            committedBits.set(at,(committedBits.get(at)||0)|bit);
          }
        }
      };
      const word=(p,guest=false)=>{span(p,4,guest);const v=d.getUint32(p,true);reads.push([p,4,v]);return v;};
      const byte=(p,guest=false)=>{span(p,1,guest);const v=d.getUint8(p);reads.push([p,1,v]);return v;};
      // Native eligibility uses the freshness threshold, not an immutable age.
      // Likewise only pages used by this proof must remain committed; another
      // page changing in the same bitmap byte is not a change to this proof.
      const freshHeartbeat=()=>{span(A+48,4);return d.getUint32(A+48,true)<180;};
      const nativePointer=(p,n)=>{if(p>=0x27fff000||p>=buffer.byteLength-4096)throw Error('native-pointer');span(p,n,true);};
      const seq=word(C+4),aseq=word(A+4),mode=word(C+36),player=word(0xd00000,true),race=word(0x890118,true);
      if(word(C)!==CM||word(A)!==AM||word(A+28)!==AM||(seq|aseq)&1||word(C+8)!==1||!freshHeartbeat()||word(A+84)!==1||mode===0||(mode&~11)!==0)return unchanged('command-ineligible');
      if(word(0x8654a4,true)!==6||word(0xd00030,true)!==1||word(0x89e7b0,true)!==0||word(0x850078,true)&0x208||word(0x866a14,true)||word(0x8669f4,true)||byte(0x89cf69))return unchanged('mode-ineligible');
      if([0x89e7d8,0x89e7d9,0x89e7e3].some(p=>byte(p))||[0x890104,0x890108,0x89010c,0x890114].some(p=>word(p,true)))return unchanged('special-mode');
      if(!word(PORT[0])||!byte(PORT[1])||!word(PORT[2]))return unchanged('offline');
      nativePointer(player,0x14);nativePointer(race,0xc44);nativePointer(state.car,0x9e4);
      if(state?.network!==true||race!==state.race||word(race,true)!==4||word(C+12)!==player||word(C+16)!==state.car||word(C+20)!==race||word(player+4,true)!==state.car||word(player+16,true))return unchanged('owner-changed');
      const body=word(state.car+0x3c,true);
      nativePointer(body,0x134);
      if(byte(body+17)||word(body+0x130,true)!==state.car)return unchanged('local-body-unavailable');
      if(word(0x802084,true)!==2)return unchanged('mode-ineligible');
      // Exact f22880: 64 slots, state3, car+76. Friend/crew fields affect
      // labels only; every matching return is one of the native player kinds.
      const remote=new Set();
      for(let i=0;i<COUNT;i++){
        const p=SLOTS+i*STRIDE;
        if(word(p)===3)remote.add(word(p+76));
      }
      let worldAI=null;
      const npcMember=car=>{
        if(worldAI===null){
          const world=word(0x890080,true);nativePointer(world,0x74);
          const n=word(world+16,true),first=word(world+20,true),end=word(world+24,true);
          if(n<1||n>22||first>=end||end>n)throw Error('world-ai-range');
          worldAI=[];for(let i=first;i<end;i++)worldAI.push(word(world+28+i*4,true));
        }
        return worldAI.filter(p=>p===car).length===1;
      };
      let excludedCars=0;
      const cars=hazards.cars.filter(h=>{
        try{
        const car=h?.car,peerBody=h?.body;
        if(!Number.isSafeInteger(car)||!Number.isSafeInteger(peerBody)||car===state.car)return true;
        nativePointer(car,0x9e4);nativePointer(peerBody,0x134);
        if(word(car+0x3c,true)!==peerBody||byte(peerBody+17)||word(peerBody+0x130,true)!==car)return true;
        let excluded=false;
        if(remote.has(car))excluded=!!(mode&2)&&controller.onlinePlayersAvailable===true;
        else if(word(car+0x24,true)===4)excluded=!!(mode&1)&&controller.onlineTrafficAvailable===true;
        else if((mode&8)&&controller.onlineRivalsAvailable===true&&word(car+0x24,true)===3){
          const record=word(car+0x14,true);
          excluded=record>=BASE&&record<BASE+22*RECORD&&(record-BASE)%RECORD===0&&word(record+4,true)===2&&npcMember(car);
        }
        if(excluded)excludedCars++;
        return !excluded;
        // An unproven observation stays solid. Its failed individual proof
        // does not restore a different car whose current proof succeeded.
        }catch{return true;}
      });
      if(memory.buffer!==buffer||!engine.live(state,true,true)||memory.buffer!==buffer||!freshHeartbeat()||[...committedBits].some(([p,mask])=>(d.getUint8(p)&mask)!==mask)||reads.some(([p,n,v])=>(n===1?d.getUint8(p):d.getUint32(p,true))!==v))return unchanged('source-changed');
      return {hazards:{...hazards,cars},available:true,state:'current-contact-policy',observedCars:hazards.cars.length,excludedCars};
    }catch{return unchanged('source-unavailable');}
  }
  const api=Object.freeze({filter});root.__NFSU2_CITY_CONTACT_PREVIEW__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
