/* Source-backed guest offsets: 6f4f1e4e; checked against exact 2f0ddd3b and 78e2bb69 native functions. Page additionally requires a verified binary profile. See README. */
(function (root) {
  'use strict';
  const NetworkProfiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
  // This exact build carries the native hooks as one pinned transplant, without
  // a forward-reader runtime. Its verified online tuple is still required to
  // distinguish online free roam from solo before any controller writes.
  const Network102c=root.__NFSU2_102C_PROFILE__||(typeof require==='function'?require('./102c-profile.js'):null);
  const Network609=root.__NFSU2_609_PROFILE__||(typeof require==='function'?require('./609-profile.js'):null);
  const NetworkD739=root.__NFSU2_D739E631_PROFILE__||(typeof require==='function'?require('./d739e631-profile.js'):null);
  const NetworkD396=root.__NFSU2_D396_PROFILE__||(typeof require==='function'?require('./d396-profile.js'):null);
  const A = Object.freeze({ FLOW: 0x8654a4, MODE: 0x850078, PLAYER: 0xd00000,
    RACE: 0x890118, DRAG: 0x89e7d8, TICKS: 0x86518c, NETWORK_TICKS: 0x8651ac,
    NOS_FULL: 0x454, NOS_LEFT: 0x45c, NOS_SINCE: 0x460, RPM: 0x440, GEAR: 0x434,
    HOST: 0x866a14, CLIENT: 0x8669f4, ONLINE: 0x89cf69 });
  const automaticNosRefill = Object.freeze({available:false,status:'Refill unavailable · manual near miss is separate'});
  class Engine {
    constructor(memory, statusCapacity = 48, moduleHash = null) { this.statusCapacity = statusCapacity === 64 ? 64 : 48; this.memory = memory; this.view = null; this.performancePatch = null; this.gripPatch = null; this.words = null; this.floatBits = new Float32Array(1); this.intBits = new Int32Array(this.floatBits.buffer);const networkProfile=[Network102c,Network609,NetworkD396,NetworkD739].find(profile=>profile&&profile.hash===moduleHash);this.requireNetworkTuple=!!networkProfile;this.networkAddresses=null;try{const cells=NetworkProfiles?.select?.(moduleHash)?.runtime?.onlineAddresses||networkProfile?.cars?.onlineAddresses;if(Array.isArray(cells)&&cells.length===3)this.networkAddresses=Object.freeze(cells.slice());}catch{} }
    refresh() { if (!this.view || this.view.buffer !== this.memory.buffer) { this.view = new DataView(this.memory.buffer); this.words = new Int32Array(this.memory.buffer); } }
    ok(p, n = 4) { return Number.isSafeInteger(p) && p >= 0x10000 && p + n <= Math.min(0x28000000, this.view.byteLength); }
    u32(p) { return this.ok(p) ? this.view.getUint32(p, true) : 0; }
    u8(p) { return this.ok(p, 1) ? this.view.getUint8(p) : 0; }
    networkTupleReady() { const cells=this.networkAddresses;return Array.isArray(cells)&&cells.length===3&&cells.every((p,i)=>Number.isSafeInteger(p)&&p>=0&&p+(i===1?1:4)<=this.view.byteLength); }
    networkState() {
      this.refresh();
      const conventional=!!(this.u32(A.MODE)&0x208)||!!this.u32(A.HOST)||!!this.u32(A.CLIENT)||!!this.u8(A.ONLINE),cells=this.networkAddresses;
      if(conventional)return true;
      if(!cells)return this.requireNetworkTuple;
      // These exact-build port cells are linear-memory metadata beyond the
      // guest object window. Keep ok()/ordinary guest reads unchanged, and
      // require the native u32/u8/u32 tuple and actual memory bounds here.
      if(!this.networkTupleReady())return this.requireNetworkTuple;
      return !!(this.view.getUint32(cells[0],true)&&this.view.getUint8(cells[1])&&this.view.getUint32(cells[2],true));
    }
    state() {
      this.refresh();
      if(this.requireNetworkTuple&&!this.networkTupleReady())return {ready:false,reason:'Waiting for verified network state.'};
      if (this.u32(A.FLOW) !== 6) return { ready: false, reason: 'Start driving to use the tools.' };
      const player = this.u32(A.PLAYER), car = this.u32(player + 4), race = this.u32(A.RACE);
      if (player%4 || car%4 || race%4 || !this.ok(player, 0x14) || !this.ok(car, 0x9e4) || !this.ok(race, 0xc44) || this.u32(player + 0x10) !== 0)
        return { ready: false, reason: 'Waiting for a valid player car.' };
      const rpm = this.view.getFloat32(car + A.RPM, true), gear = this.u32(car + A.GEAR);
      if (!Number.isFinite(rpm) || rpm < 0 || rpm > 30000 || gear > 10)
        return { ready: false, reason: 'Car layout not recognized; no memory changed.' };
      const network = this.networkState();
      return { ready: true, car, race, rpm, gear, driving: this.u32(race) === 4, drag: this.u8(A.DRAG) === 1, network };
    }
    live(s, allowNetwork = true, driving = false) {
      const now=this.state();
      return !!s?.ready && now.ready && now.car===s.car && now.race===s.race && (!driving||now.driving) && (!now.network||allowNetwork===true);
    }
    bits(value) {this.floatBits[0]=value;return this.intBits[0];}
    compareFloat(p, expected, value, guard) {
      if(!this.ok(p)||p%4||!guard())return false;
      const before=this.bits(expected),after=this.bits(value);
      // Exact field ownership, including a native change after validation.
      // This narrows interleavings; it is NOT an allocator/lifetime lock.
      if(before===after)return Atomics.load(this.words,p/4)===before;
      return Atomics.compareExchange(this.words,p/4,before,after)===before;
    }
    nosNetworkClock() {
      // Native 0x5f00f0 used by NOS start, remaining-time and stop. This is
      // intentionally narrower than permission detection: mode bits alone
      // do not select the native network clock, and host/client are signed.
      return !!this.u8(A.ONLINE) || (this.u32(A.CLIENT)|0)>0 || (this.u32(A.HOST)|0)>0;
    }
    // No state reads, timers or writes: stale preferences cannot reactivate the
    // retired automatic refill. Native NOS use and earned credit are separate.
    refill() { return automaticNosRefill.available; }
    performanceInfo(s) {
      if (!s?.ready || this.u32(A.FLOW) !== 6 || this.u32(A.RACE) !== s.race || this.u32(this.u32(A.PLAYER) + 4) !== s.car) return null;
      const ride = this.u32(s.car + 0x10), pi = ride + 0x10;
      if (!ride || pi%4 || !this.ok(pi, 0x574)) return null;
      const f = o => this.view.getFloat32(pi + o, true);
      const type = this.u32(pi), mass = f(0x140), idle = f(0x220), max = f(0x228);
      if (type > 30 || !(mass > 0.1 && mass < 10) || !(idle >= 100 && idle <= 4000) || !(max > idle && max <= 20000)) return null;
      const offsets = [...Array.from({length:9}, (_,i)=>0x230+i*4), 0x2dc, 0x2c0];
      const values = offsets.map(f);
      if (!values.every((v,i)=>Number.isFinite(v) && v >= 0 && v < (i === 10 ? 1000 : 20))) return null;
      return { ride, pi, offsets, values };
    }
    performanceOwned(s, patch, allowNetwork=true, driving=false) {
      return this.live(s,allowNetwork,driving) && s.car===patch.car && s.race===patch.race && this.u32(patch.car+0x10)===patch.ride && patch.pi===patch.ride+0x10;
    }
    restorePerformance(s) {
      const old=this.performancePatch;this.performancePatch=null;
      if(!old)return false;this.refresh();
      if(!this.performanceRestorePending||this.performanceRestorePending.car!==old.car)this.performanceRestorePending=old;
      const guard=()=>this.performanceOwned(s,old);
      if(!guard())return false;
      for(let i=0;i<old.offsets.length;i++){
        if(!guard())return false;
        this.compareFloat(old.pi+old.offsets[i],old.expected[i],old.original[i],guard);
      }
      return true;
    }
    tunePerformance(s, power = 1, unlimit = false, allowNetwork = false) {
      this.refresh();
      if(!this.live(s,allowNetwork,true)||!Number.isFinite(power)||power<1||power>3){this.restorePerformance(s);return {ok:false};}
      if(power===1&&!unlimit){this.restorePerformance(s);return {ok:true,active:false};}
      const info=this.performanceInfo(s);
      if(!info){this.restorePerformance(s);return {ok:false,reason:'Car performance layout unavailable.'};}
      let patch=this.performancePatch;
      if(patch&&(patch.car!==s.car||patch.race!==s.race||patch.pi!==info.pi)){this.performancePatch=null;patch=null;}
      if(patch&&info.values.some((v,i)=>v!==patch.expected[i])){this.restorePerformance(s);return {ok:false,changed:true,reason:'Car tuning changed. Power controls will resume after the new values settle.'};}
      if(!patch)patch={car:s.car,race:s.race,ride:info.ride,pi:info.pi,offsets:info.offsets,original:info.values,expected:info.values.slice()};
      const expected=patch.original.map((v,i)=>Math.fround(i===10?unlimit?0:v:v*power));
      if(expected.some((v,i)=>!Number.isFinite(v)||v<0||v>=(i===10?1000:20))){this.restorePerformance(s);return {ok:false,reason:'Requested power exceeds the recognized tuning range. Lower the power factor.'};}
      const guard=()=>this.performanceOwned(s,patch,allowNetwork,true);
      this.performancePatch=patch;
      for(let i=0;i<expected.length;i++){
        if(!this.compareFloat(info.pi+info.offsets[i],patch.expected[i],expected[i],guard)){
          this.restorePerformance(s);return {ok:false,changed:true,reason:'Car state changed during power adjustment. Waiting for stable values.'};
        }
        patch.expected[i]=expected[i];
      }
      return {ok:true,active:true,power,unlimit};
    }
    gripInfo(s) {
      if (!s?.ready || this.u32(A.FLOW)!==6 || this.u32(A.RACE)!==s.race || this.u32(this.u32(A.PLAYER)+4)!==s.car) return null;
      const physics=this.u32(s.car+0x34);
      if (!this.ok(physics,0x48)) return null;
      const wheels=[0x38,0x3c,0x40,0x44].map(o=>this.u32(physics+o));
      if (new Set(wheels).size!==4 || wheels.some(w=>w%4 || !this.ok(w,0x18c))) return null;
      const values=wheels.map(w=>this.view.getFloat32(w+0x188,true));
      if (values.some(v=>!Number.isFinite(v) || v<0.1 || v>4)) return null;
      return {physics,wheels,values};
    }
    gripOwned(s,patch,allowNetwork=true,driving=false) {
      return this.live(s,allowNetwork,driving) && s.car===patch.car && s.race===patch.race && this.u32(s.car+0x34)===patch.physics && patch.wheels.every((w,i)=>this.u32(patch.physics+0x38+i*4)===w);
    }
    restoreGrip(s) {
      const patch=this.gripPatch;this.gripPatch=null;
      if(!patch)return false;this.refresh();
      if(!this.gripRestorePending||this.gripRestorePending.car!==patch.car)this.gripRestorePending=patch;
      const guard=()=>this.gripOwned(s,patch);
      if(!guard())return false;
      for(let i=0;i<4;i++){
        if(!guard())return false;
        this.compareFloat(patch.wheels[i]+0x188,patch.expected[i],patch.original[i],guard);
      }
      return true;
    }
    legacyPhysicsNeutral(s) {
      if(this.performancePatch||this.gripPatch||!s?.ready||!this.live(s,true))return false;
      this.refresh();
      const power=this.performanceRestorePending,grip=this.gripRestorePending;
      if(power){
        const info=this.performanceInfo(s);
        if(!info)return false;
        if(power.car!==s.car||power.pi!==info.pi||power.ride!==info.ride)this.performanceRestorePending=null;
        else if(info.values.length===power.original.length&&info.values.every((v,i)=>v===power.original[i]))this.performanceRestorePending=null;
        else return false;
      }
      if(grip){
        const info=this.gripInfo(s);
        if(!info)return false;
        if(grip.car!==s.car||grip.physics!==info.physics||grip.wheels.some((w,i)=>w!==info.wheels[i]))this.gripRestorePending=null;
        else if(info.values.every((v,i)=>v===grip.original[i]))this.gripRestorePending=null;
        else return false;
      }
      return true;
    }
    tuneGrip(s, factor=1, allowNetwork=false) {
      this.refresh();
      if(!this.live(s,allowNetwork,true)||!Number.isFinite(factor)||factor<1||factor>2){this.restoreGrip(s);return {ok:false};}
      if(this.u32(0x890104)!==0||this.u8(0x89e7d9)!==0||(!this.u8(0x89e7d8)&&!this.u32(0x890108)&&this.u32(0x890114)!==0)){this.restoreGrip(s);return {ok:false,paused:true,reason:'Extra grip is paused during drift mode/races.'};}
      if(factor===1){this.restoreGrip(s);return {ok:true,active:false};}
      const info=this.gripInfo(s);
      if(!info){this.restoreGrip(s);return {ok:false,reason:'Wheel physics unavailable.'};}
      let patch=this.gripPatch;
      if(patch&&(patch.car!==s.car||patch.race!==s.race||patch.physics!==info.physics||patch.wheels.some((w,i)=>w!==info.wheels[i]))){this.gripPatch=null;patch=null;}
      if(patch&&info.values.some((v,i)=>v!==patch.expected[i])){this.restoreGrip(s);return {ok:false,changed:true,reason:'Wheel physics changed. Extra grip will resume after the new values settle.'};}
      if(!patch)patch={car:s.car,race:s.race,physics:info.physics,wheels:info.wheels,original:info.values,expected:info.values.slice()};
      const expected=patch.original.map(v=>Math.fround(Math.min(4,v*factor)));
      const guard=()=>this.gripOwned(s,patch,allowNetwork,true)&&this.u32(0x890104)===0&&this.u8(0x89e7d9)===0&&(this.u8(0x89e7d8)!==0||this.u32(0x890108)!==0||this.u32(0x890114)===0);
      this.gripPatch=patch;
      for(let i=0;i<4;i++){
        if(!this.compareFloat(info.wheels[i]+0x188,patch.expected[i],expected[i],guard)){
          this.restoreGrip(s);return {ok:false,changed:true,reason:'Car state changed during grip adjustment. Waiting for stable values.'};
        }
        patch.expected[i]=expected[i];
      }
      return {ok:true,active:true,factor};
    }
    driftTap(ptr) {
      // Same synthetic action used by the game's touch Drift button, through
      // its documented single-producer main-page input ring instead of hidden DOM.
      this.refresh();
      if (!Number.isSafeInteger(ptr) || ptr <= 0 || ptr % 4 || ptr+20800 > this.view.byteLength) return false;
      const h=new Int32Array(this.view.buffer,ptr,64);
      if ((Atomics.load(h,0)>>>0)!==0x4e494e50 || Atomics.load(h,1)!==2 || Atomics.load(h,3)!==1024 || Atomics.load(h,7)!==1 || Atomics.load(h,27)!==0 || Atomics.load(h,34)!==0) return false;
      const w=Atomics.load(h,4), r=Atomics.load(h,5);
      if (((w-r)>>>0)>=1024) return false;
      const p=ptr+4416+(w&1023)*16;
      const bytes=new Uint8Array(this.view.buffer,p,16); bytes.fill(0);
      bytes[0]=3; bytes[1]=0xf1; bytes[3]=32; // KEY_TAP, dedicated Drift key, synthetic.
      Atomics.store(h,4,(w+1)|0); Atomics.notify(h,4,1);
      return true;
    }
    hazards(s) {
      // Read-only tester. These are cars and the track's barrier-line table,
      // not a complete collision mesh, traffic classifier, lane map or autopilot.
      if (!s.ready) return null;
      const f = p => this.ok(p) ? this.view.getFloat32(p, true) : NaN;
      const x = f(s.car + 0x60), y = f(s.car + 0x64), z = f(s.car + 0x68);
      let fx = f(s.car + 0x90), fy = f(s.car + 0x94);
      const fl = Math.hypot(fx, fy);
      if (![x,y,z,fl].every(Number.isFinite) || fl < 0.5 || fl > 1.5) return null;
      fx /= fl; fy /= fl;
      const world = this.u32(0x890080), seen = new Set(); let car = this.u32(world);
      const cars = [];
      while (car && car !== world && seen.size < 96 && this.ok(car, 0x9e4) && !seen.has(car)) {
        seen.add(car);
        if (car !== s.car) {
          const dx = f(car + 0x60) - x, dy = f(car + 0x64) - y, dz = f(car + 0x68) - z;
          const ahead = dx * fx + dy * fy, side = -dx * fy + dy * fx;
          if ([ahead,side,dz].every(Number.isFinite) && ahead > 0 && ahead < 150 && Math.abs(side) < 20 && Math.abs(dz) < 5)
            cars.push({ ahead, side, car, body:this.u32(car+0x3c) });
        }
        car = this.u32(car);
      }
      cars.sort((a,b) => a.ahead - b.ahead);
      const nb = this.u32(0x88f298 + 0x498), bars = this.u32(0x88f298 + 0x49c);
      let barrierAhead = null, activeBarriers = 0;
      if (nb <= 8192 && this.ok(bars, nb * 0x24)) for (let i = 0; i < nb; i++) {
        const p = bars + i * 0x24; if (!this.u8(p + 0x10)) continue;
        const ax = f(p) - x, ay = f(p+4) - y, bx = f(p+8) - x, by = f(p+12) - y;
        if (![ax,ay,bx,by].every(Number.isFinite)) continue;
        activeBarriers++;
        const al = -ax*fy + ay*fx, bl = -bx*fy + by*fx;
        if ((al > 0) === (bl > 0) || Math.abs(al-bl) < 0.0001) continue;
        const t = al / (al-bl), distance = (ax + (bx-ax)*t)*fx + (ay + (by-ay)*t)*fy;
        if (distance >= 0 && distance < 150 && (barrierAhead === null || distance < barrierAhead)) barrierAhead = distance;
      }
      return { cars, scannedCars: seen.size, activeBarriers, barrierAhead };
    }
    pacingHazards(s, exactProfile=false, allowNetwork=false) {
      this.refresh();
      if(!exactProfile||!this.live(s,allowNetwork,true)||this.u32(s.car+0x24)!==3)return null;
      const player=this.u32(A.PLAYER),driver=this.u32(s.car+0x2c),world=this.u32(0x890080),bars=this.u32(0x88f734),count=this.u32(0x88f730),track=this.u32(0x89e7a0);
      if(!this.ok(driver,0x800)||this.u32(driver)!==0x785370||this.u32(driver+4)!==s.car)return null;
      // Reuse the established read-only reader. Recheck its source identities
      // before submitting any reduction; an absent scan is never a clear road.
      const sample=this.hazards(s);
      if(!this.live(s,allowNetwork,true)||this.u32(A.PLAYER)!==player||this.u32(s.car+0x24)!==3||this.u32(s.car+0x2c)!==driver||this.u32(driver+4)!==s.car||this.u32(0x890080)!==world||this.u32(0x88f734)!==bars||this.u32(0x88f730)!==count||this.u32(0x89e7a0)!==track)return null;
      return sample;
    }
    nosDiagnostics(s, exactProfile = false) {
      // Read before refill, so the export can show resource/timing state that
      // the refill would otherwise mask. These are sampled raw state fields,
      // not native activation/stop counters or proof of a successful burst.
      this.refresh();
      if (!exactProfile || !s?.ready || !this.live(s)) return {};
      const networkClock=this.nosNetworkClock(),clock=this.u32(networkClock?A.NETWORK_TICKS:A.TICKS);
      const since=this.u32(s.car+A.NOS_SINCE),full=this.u32(s.car+A.NOS_FULL),remaining=this.u32(s.car+A.NOS_LEFT);
      const active=since!==0&&since!==0x7fffffff;
      const out={nosTelemetry:true,nosClockNetwork:networkClock,nosClockTicks:clock,nosSinceTicks:since,nosTimestampActive:active};
      if(full<10000000)out.nosFullTicks=full;
      if(remaining<10000000)out.nosRemainingTicks=remaining;
      if(active)out.nosElapsedTicks=(clock|0)-(since|0);
      if(!this.live(s)||this.nosNetworkClock()!==networkClock||this.u32(s.car+A.NOS_FULL)!==full||this.u32(s.car+A.NOS_SINCE)!==since)return {};
      return out;
    }
    dragEngineDiagnostics(s, exactProfile = false) {
      this.refresh();
      if (!exactProfile || !s?.ready || !this.live(s) || !this.u8(A.DRAG) || this.u32(s.car+0x28)!==1) return {};
      const physics=this.u32(s.car+0x34);
      if (physics%4 || !this.ok(physics,0x4c)) return {};
      const motor=this.u32(physics+0x48);
      if (motor%4 || !this.ok(motor,0x90)) return {};
      const heat=this.view.getFloat32(motor+0x8c,true),out={};
      if (Number.isFinite(heat) && heat>=-1 && heat<=2) {out.dragEngineHeat=heat;out.dragHeatDisabled=heat<0;out.dragEngineBlown=heat===2;}
      const params=this.u32(motor+0x18);
      if (params%4===0 && this.ok(params,8)) {
        const limit=this.view.getFloat32(params+4,true);
        if (Number.isFinite(limit) && limit>=1000 && limit<=30000) out.dragEngineLimitRpm=limit;
      }
      return out;
    }
    driftDiagnostics(s, exactProfile = false) { return this.nativeDiagnostics(s, exactProfile, true); }
    nativeDiagnostics(s, exactProfile = false, driftOnly = false, withStatus = false) {
      // Read-only, best-effort scalar samples. The page opts in only after the
      // exact reviewed module profile has been verified. Never export pointers.
      this.refresh();
      // The logger opts into fixed failures; older optional readers retain
      // their empty-sample contract. Neither path writes native state.
      const unavailable=code=>withStatus?{nativeTelemetry:false,nativeTelemetryStatus:code}:{};
      if (!exactProfile) return unavailable('profile-unverified');
      if (!s?.ready) return unavailable('state-unavailable');
      if (!this.live(s)) return unavailable('context-stale');
      const car=s.car, race=s.race, d=this.view;
      const f=(p,lo,hi)=>{if(!this.ok(p))return undefined;const v=d.getFloat32(p,true);return Number.isFinite(v)&&v>=lo&&v<=hi?v:undefined;};
      // Same event inputs as the reviewed native corner/Street X guards:
      // RaceParams+0x43, forced Street X, and the separate network mode enum.
      const network=()=>this.networkState();
      const networkSample=network(),networkMode=this.u32(0x850088);
      const out={nativeTelemetry:true,nativeTelemetryStatus:'sampled',trackId:this.u32(0x89e7a0),dragRace:!!this.u8(0x89e7d8),forcedDrag:!!this.u32(0x890108),driftRace:!!this.u8(0x89e7d9),forcedDrift:!!this.u32(0x890104),driftVariant:!!this.u32(0x890114),streetXRace:!!this.u8(0x89e7e3),forcedStreetX:!!this.u32(0x89010c),onlineStreetX:networkSample&&networkMode===10,nativeRoadTargetStatus:'driver-unverified'};
      const driftFamily=(out.driftRace||out.forcedDrift||out.driftVariant)&&!out.dragRace&&!out.forcedDrag;
      if(driftOnly&&!driftFamily)return unavailable('drift-ineligible');
      out.carRpm=s.rpm;out.carGear=s.gear;
      const player=this.u32(A.PLAYER);
      if(this.ok(player,0x234)){
        const input=this.u32(player+0x22c),next=this.u32(player+0x230);
        if(input<=10)out.nativeInputMode=input;if(next<=10)out.nativeNextInputMode=next;
      }
      const put=(k,v)=>{if(v!==undefined)out[k]=v;};
      put('speedMps',f(car+0x430,0,500));put('forwardMps',f(car+0x42c,-500,500));
      const record=this.u32(car+0x14);
      if(this.ok(record,0x902)&&this.u32(record+4)===1)out.nativeSkill=this.u8(record+0x901);
      const driver=this.u32(car+0x2c),driverKind=this.u32(car+0x24),driverOK=driverKind===3&&this.ok(driver,0x800)&&this.u32(driver)===0x785370&&this.u32(driver+4)===car;
      out.aiDriverVerified=!!driverOK;
      let behavior=0,action=0,behaviorVT=0,behaviorVerified=false,actionVT=0,actionId=0,actionReadable=false,navigation=0,config=0,companion=0;
      if(driverOK){
        out.nativeRoadTargetStatus='behavior-unverified';
        put('nativePaceFactor',f(driver+0x770,0,4));
        behavior=this.u32(driver+8);action=this.u32(driver+0x6fc);
        navigation=this.u32(driver+0xc);config=this.u32(driver+0x6e0);companion=this.u32(driver+0x6f8);
        out.nativeNavigationPresent=navigation!==0;out.nativeNavigationValid=this.ok(navigation,0x30);
        out.nativeConfigPresent=config!==0;out.nativeConfigValid=this.ok(config,4);
        out.nativeCompanionPresent=companion!==0;out.nativeCompanionValid=this.ok(companion,0x200);
        out.aiGoalPending=action===0;
        out.aiGoalRecognized=false;
        if(this.ok(action,24)){
          actionId=this.u32(action+20);actionVT=this.u32(action);actionReadable=true;
          const tables={1:0x784768,2:0x7847d0,3:0x784830,5:0x784b58,7:0x7848a0,8:0x784900,11:0x784968};
          if(tables[actionId]&&actionVT===tables[actionId]){out.aiGoalId=actionId;out.aiGoalRecognized=true;}
        }
        if(behavior%4===0&&this.ok(behavior,0x234)&&this.u32(behavior+0x220)===car){
          behaviorVT=this.u32(behavior);behaviorVerified=true;out.nativeDriftBehavior=behaviorVT===0x784f40;out.nativeRoadBehavior=behaviorVT===0x784eb0;
          // Exact AA setter f6140 (guest0x4054a0) stores the first target
          // argument at behavior+0x230. Its sign is preserved. Native units
          // have not been calibrated against displayed speed or metricScale.
          if(out.nativeRoadBehavior){const target=f(behavior+0x230,-500,500);put('nativeRoadTarget',target);out.nativeRoadTargetStatus=target===undefined?'value-invalid':'sampled';}
          else out.nativeRoadTargetStatus='not-road';
          if(out.nativeDriftBehavior&&driftFamily)put('driftTargetMps',f(behavior+0x22c,-200,200));
          if(out.nativeDriftBehavior||out.nativeRoadBehavior){
            put('nativeThrottle',f(behavior+0x20c,0,1));put('nativeHandbrake',f(behavior+0x210,0,1));put('nativeBrake',f(behavior+0x214,0,1));
            out.nativeSteering=d.getInt16(behavior+0x1e0,true);
            const gear=d.getInt32(behavior+0x1e4,true);if(gear>=-1&&gear<=10)out.nativeGearCommand=gear;
          }
          if(out.nativeRoadBehavior&&this.ok(behavior,0x264)&&this.ok(car+0x390,4)){
            // Native421f45..421fc7 can latch +25c after59fa30(car+40),
            // then use +22c for throttle and clear brake while the requested
            // target is at least the previous target stored at +260. These are sampled
            // inputs/state, not proof that this override ran in this frame.
            const latched=this.u8(behavior+0x25c);if(latched<=1)out.nativeControlOverrideLatched=!!latched;
            put('nativePreviousTarget',f(behavior+0x260,-500,500));put('nativeThrottleHold',f(behavior+0x22c,0,1));
            // Native4210e0..421105 additionally queries592870 per flagged
            // wheel. This mask reports only the four nonzero source bytes.
            out.nativeWheelContactMask=[0,1,2,3].reduce((mask,i)=>mask|(this.u8(car+0x390+i)?1<<i:0),0);
          }
        }
      }
      const racer=this.u32(car+0x1c),count=this.u32(race+0x24);
      let score=0,driftCar=0,style=0,racerSlot=-1;
      if(count>=1&&count<=6)racerSlot=Array.from({length:count},(_,i)=>this.u32(race+0xbd0+i*4)).indexOf(racer);
      if(driftFamily)out.driftScoreLinked=false;
      if(driftFamily&&this.ok(racer,0x1f0)&&this.u32(racer)===car&&racerSlot>=0){
        score=this.u32(racer+0x1d4);driftCar=this.u32(racer+0x1d8);
        if(this.ok(score,39*4)&&this.ok(driftCar,0x48)&&this.u32(driftCar)===score&&this.u32(driftCar+4)===racer&&this.u32(driftCar+8)===car){
          style=this.u32(score);
          if(this.ok(style,0x3c)&&this.u32(style+0xc)===0){
            out.driftScoreLinked=true;
            const state=this.u32(style+0x14),level=this.u32(driftCar+0x1c),next=this.u32(driftCar+0x20);
            if(state<=4)out.driftScoreState=state;
            if(level>=1&&level<=5)out.driftMultiplier=level;
            if(next<=1e9)out.driftNextPoints=next;
            put('driftPendingPoints',f(style+0x24,0,1e9));put('driftBankedPoints',f(style+0x2c,0,1e9));put('driftRawRate',f(driftCar+0x34,0,1e6));
            put('driftLatchedSlipRad',f(driftCar+0x44,-Math.PI,Math.PI));
            put('currentRawRouteProgress',f(racer+0x14,-1,1e7));put('driftBestRawRouteProgress',f(driftCar+0x30,-1,1e7));
            out.driftCollisionLoss=!!this.u8(driftCar+0x15);
          }
        }
      }
      // Identity may change while the native game is running. Reject a sample
      // if the validated graph changed; this is not a native frame lock.
      if(!this.live(s)||this.u32(car+0x14)!==record||this.u32(car+0x2c)!==driver||this.u32(car+0x24)!==driverKind)return unavailable('context-changed');
      if(this.u32(0x89e7a0)!==out.trackId||!!this.u8(0x89e7d9)!==out.driftRace||!!this.u32(0x890104)!==out.forcedDrift||!!this.u32(0x890114)!==out.driftVariant||!!this.u8(0x89e7d8)!==out.dragRace||!!this.u32(0x890108)!==out.forcedDrag||!!this.u8(0x89e7e3)!==out.streetXRace||!!this.u32(0x89010c)!==out.forcedStreetX||network()!==networkSample||this.u32(0x850088)!==networkMode)return unavailable('context-changed');
      if(this.u32(A.PLAYER)!==player)return unavailable('context-changed');
      if(out.nativeInputMode!==undefined&&this.u32(player+0x22c)!==out.nativeInputMode)return unavailable('context-changed');
      if(out.nativeNextInputMode!==undefined&&this.u32(player+0x230)!==out.nativeNextInputMode)return unavailable('context-changed');
      if(out.nativeSkill!==undefined&&this.u32(record+4)!==1)return unavailable('context-changed');
      if(driverOK&&(this.u32(driver)!==0x785370||this.u32(driver+4)!==car||this.u32(driver+8)!==behavior||this.u32(driver+0x6fc)!==action||this.u32(driver+0xc)!==navigation||this.u32(driver+0x6e0)!==config||this.u32(driver+0x6f8)!==companion))return unavailable('context-changed');
      if(behaviorVerified&&(this.u32(behavior)!==behaviorVT||this.u32(behavior+0x220)!==car))return unavailable('context-changed');
      if(actionReadable&&(this.u32(action)!==actionVT||this.u32(action+20)!==actionId))return unavailable('context-changed');
      if(out.driftScoreLinked&&(this.u32(car+0x1c)!==racer||this.u32(racer)!==car||this.u32(race+0x24)!==count||this.u32(race+0xbd0+racerSlot*4)!==racer||this.u32(racer+0x1d4)!==score||this.u32(racer+0x1d8)!==driftCar||this.u32(score)!==style||this.u32(style+0xc)!==0||this.u32(driftCar)!==score||this.u32(driftCar+4)!==racer||this.u32(driftCar+8)!==car))return unavailable('context-changed');
      return out;
    }
    status(ptr) {
      this.refresh();
      if (!Number.isSafeInteger(ptr) || ptr <= 0 || ptr % 4 || ptr + 16 > this.view.byteLength) return null;
      const h = new Int32Array(this.view.buffer, ptr, 4);
      if ((Atomics.load(h, 0) >>> 0) !== 0x31545453) return null;
      const seq = Atomics.load(h, 1), count = Atomics.load(h, 2);
      if (seq & 1 || count < 0 || count > this.statusCapacity || ptr + 16 + count * 24 > this.view.byteLength) return null;
      const out = {};
      for (let k = 0; k < count; k++) {
        const p = ptr + 16 + 24 * k; let name = '';
        for (let j = 0; j < 16; j++) { const c = this.view.getUint8(p + j); if (!c) break; name += String.fromCharCode(c); }
        out[name] = this.view.getFloat64(p + 16, true);
      }
      return seq === Atomics.load(h, 1) ? out : null;
    }
  }
  class StableGate {
    constructor(samples=3) {this.samples=samples;this.reset();}
    reset() {this.last=null;this.count=0;}
    accept(value) {const key=JSON.stringify(value);if(key!==this.last){this.last=key;this.count=1;}else this.count++;return this.count>=this.samples;}
  }
  function adaptiveRaceSettings({enabled=false,ceiling=1.3,verified=false,ai=false,safe=false,network=false,allowNetwork=false,hud=0,raceType=-1,drag=false,drift=false,streetX=false}={}) {
    // Session-only orchestration of the existing distance-based native route
    // envelope. This is not a per-frame multiplier, steering or NOS controller.
    const result=state=>({requested:state==='requested',state,ceiling});
    if(enabled!==true)return result('off');
    if(!Number.isFinite(ceiling)||ceiling<1||ceiling>2)return result('invalid');
    if(verified!==true)return result('unsupported');
    if(streetX)return result('street-x');
    if(drag||drift||hud!==1||raceType!==1)return result('mode');
    if(network&&allowNetwork!==true)return result('network-permission');
    if(ai!==true)return result('ai-off');
    if(safe!==true)return result('paused');
    return result('requested');
  }
  function createCameraDirector({random=Math.random}={}) {
    if(typeof random!=='function')throw new TypeError('Camera director needs a random function');
    let lastNow=null,lastIdentity,nextAt=null;
    const reset=()=>{lastNow=null;lastIdentity=undefined;nextAt=null;};
    const schedule=now=>{
      let draw;try{draw=random();}catch{draw=0.5;}
      if(!Number.isFinite(draw))draw=0.5;
      nextAt=now+45000+Math.round(Math.max(0,Math.min(1,draw))*75000);
    };
    const update=({enabled=false,ready=false,now,identity}={})=>{
      // No pulse may survive a paused page, stale observation or changed car.
      if(enabled!==true||ready!==true||!Number.isFinite(now)||now<0||now>Number.MAX_SAFE_INTEGER-120000||identity===null||identity===undefined){reset();return {due:false,nextAt:null};}
      const rearm=nextAt===null||!Object.is(identity,lastIdentity)||now<lastNow||now-lastNow>1000;
      lastNow=now;lastIdentity=identity;
      if(rearm){schedule(now);return {due:false,nextAt};}
      if(now>=nextAt){schedule(now);return {due:true,nextAt};}
      return {due:false,nextAt};
    };
    return Object.freeze({update,reset});
  }
  const api = Object.freeze({ Engine, StableGate, adaptiveRaceSettings, createCameraDirector, automaticNosRefill, A, supportedRevision: '6f4f1e4e' });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.defineProperty(root, '__NFSU2_DRIVING_CORE__', { value: api, configurable: true });
})(globalThis);
