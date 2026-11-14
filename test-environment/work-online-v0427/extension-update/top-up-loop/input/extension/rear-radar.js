/* Read-only rear half-plane observations from the native loaded-world car list.
 * Offsets follow core.hazards and public runtime/game.h + roam_game.c. Native
 * units are uncalibrated; equal rereads do not prove allocator lifetime. */
(function(root){
  'use strict';
  const Registry=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
  const ABI=Object.freeze({worldPointer:0x890080,playerPointer:0xd00000,racePointer:0x890118,flow:0x8654a4,
    guestCeiling:0x28000000,pageBytes:16384,bitmapBytes:32768,carBytes:0x9e4,maxCars:96,maxDetections:32,
    minRange:50,maxRange:500,defaultRange:200,maxHeightDifference:5});
  const metadata=Object.freeze({units:'native-coordinate-units',metricScaleVerified:false,readOnly:true,liveVerified:false,
    coverage:'locally-loaded-world-car-list',classification:'unknown',allocatorLifetimeVerified:false});
  const unavailable=(state,range=ABI.defaultRange)=>({...metadata,available:false,state,rangeNative:range,cars:[],nearest:null,scannedCars:0,truncated:false});
  function observe(engine,state,{verified=false,moduleHash=null,range=ABI.defaultRange}={}){
    const config=Registry?.select?.(moduleHash);
    if(verified!==true||!config?.runtime||config.moduleHash!==moduleHash)return unavailable('exact-build-required',range);
    if(typeof range!=='number'||!Number.isFinite(range)||range<ABI.minRange||range>ABI.maxRange)return unavailable('invalid-range',range);
    try{
      if(!engine||typeof engine.live!=='function'||typeof engine.refresh!=='function'||!engine.live(state,true,true))return unavailable('not-driving',range);
      engine.refresh();
      const memory=engine.memory,buffer=memory?.buffer,bitmap=config.runtime.bitmap;
      if(Object.prototype.toString.call(buffer)!=='[object SharedArrayBuffer]'||!Number.isSafeInteger(bitmap)||bitmap<ABI.guestCeiling||buffer.byteLength<bitmap+ABI.bitmapBytes)return unavailable('committed-memory-required',range);
      const view=new DataView(buffer),spans=[],admitted=[];
      const bounded=(p,n)=>Number.isSafeInteger(p)&&p>=0x10000&&p%4===0&&Number.isSafeInteger(n)&&n>0&&p+n<=Math.min(ABI.guestCeiling,view.byteLength);
      const committed=(p,n)=>{
        if(!bounded(p,n))return false;
        for(let page=Math.floor(p/ABI.pageBytes);page<=Math.floor((p+n-1)/ABI.pageBytes);page++)
          if(!(view.getUint8(bitmap+(page>>>3))&(1<<(page&7))))return false;
        return true;
      };
      const capture=(p,n)=>{if(!committed(p,n))throw Error('uncommitted-source');const bytes=new Uint8Array(buffer,p,n).slice();spans.push({p,n,bytes});return new DataView(bytes.buffer);};
      const word=p=>capture(p,4).getUint32(0,true);
      const byte=p=>capture(p,1).getUint8(0);
      const flow=word(ABI.flow),player=word(ABI.playerPointer),race=word(ABI.racePointer),world=word(ABI.worldPointer);
      if(flow!==6||race!==state.race||!bounded(player,0x14)||!bounded(state.car,ABI.carBytes)||!committed(race,0xc44)||word(race)!==4)return unavailable('identity-unavailable',range);
      const owner=capture(player,0x14);
      if(owner.getUint32(4,true)!==state.car||owner.getUint32(16,true)!==0||!committed(state.car,ABI.carBytes))return unavailable('identity-unavailable',range);
      admitted.push([race,0xc44],[state.car,ABI.carBytes]);
      // CAR_ACTIVE and CAR_BLINKOUT are bytes in the native renderer. The
      // neighboring state at +0x999..+0x99b is not part of blink-out.
      if(!byte(state.car+0x550)||byte(state.car+0x998))return unavailable('local-car-hidden',range);
      const local=capture(state.car+0x60,12),heading=capture(state.car+0x90,8);
      const x=local.getFloat32(0,true),y=local.getFloat32(4,true),z=local.getFloat32(8,true);
      let fx=heading.getFloat32(0,true),fy=heading.getFloat32(4,true);const length=Math.hypot(fx,fy);
      if(![x,y,z,fx,fy].every(Number.isFinite)||Math.max(Math.abs(x),Math.abs(y),Math.abs(z))>1e7||length<.5||length>1.5)return unavailable('heading-unavailable',range);
      fx/=length;fy/=length;
      const head=capture(world,0x14),first=head.getUint32(0,true),last=head.getUint32(4,true),seen=new Set(),cars=[];
      let car=first,previous=world,localPresent=false;
      while(car!==world){
        if(seen.size>=ABI.maxCars||seen.has(car)||!committed(car,ABI.carBytes))return unavailable('world-list-unavailable',range);
        admitted.push([car,ABI.carBytes]);
        seen.add(car);const links=capture(car,8),next=links.getUint32(0,true),prev=links.getUint32(4,true);
        if(prev!==previous)return unavailable('world-list-unavailable',range);
        if(car===state.car)localPresent=true;
        else{
          const active=byte(car+0x550),blink=byte(car+0x998),pose=capture(car+0x60,12);
          const px=pose.getFloat32(0,true),py=pose.getFloat32(4,true),pz=pose.getFloat32(8,true);
          const dx=px-x,dy=py-y,dz=pz-z,ahead=dx*fx+dy*fy,lateral=-dx*fy+dy*fx,distance=Math.hypot(dx,dy);
          if(active&&!blink&&[px,py,pz,ahead,lateral,distance,dz].every(Number.isFinite)&&ahead<0&&distance<=range&&Math.abs(dz)<ABI.maxHeightDifference)
            cars.push({distanceNative:distance,behindNative:-ahead,lateralNative:lateral,bearingDegrees:Math.atan2(lateral,-ahead)*180/Math.PI,
              side:Math.abs(lateral)<.05?'center':lateral>0?'left':'right',classification:'unknown'});
        }
        previous=car;car=next;
      }
      if(!localPresent||previous!==last)return unavailable('world-list-unavailable',range);
      if(memory.buffer!==buffer||!engine.live(state,true,true))return unavailable('source-changed',range);
      if(admitted.some(([p,n])=>!committed(p,n)))return unavailable('source-changed',range);
      for(const span of spans){
        if(!committed(span.p,span.n))return unavailable('source-changed',range);
        const now=new Uint8Array(buffer,span.p,span.n);
        if(!span.bytes.every((value,index)=>now[index]===value))return unavailable('source-changed',range);
      }
      if(memory.buffer!==buffer)return unavailable('source-changed',range);
      cars.sort((a,b)=>a.distanceNative-b.distanceNative);
      const limited=cars.slice(0,ABI.maxDetections);
      return {...metadata,available:true,state:'observed',rangeNative:range,cars:limited,nearest:limited[0]||null,scannedCars:seen.size,
        observedBehindCars:cars.length,truncated:cars.length>limited.length,completeBoundedWorldList:true};
    }catch{return unavailable('unreadable-source',range);}
  }
  const api=Object.freeze({ABI,observe});root.__NFSU2_REAR_RADAR__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
