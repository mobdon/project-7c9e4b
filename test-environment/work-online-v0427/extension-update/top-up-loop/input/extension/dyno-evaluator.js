/* Full-setting trials run only in independently allocated private WASM memory. */
(function(root){'use strict';
const Core=typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-core.js'):root.__NFSU2_DYNO_CORE__;
const Native=typeof module==='object'&&module.exports&&typeof require==='function'?require('./dyno-native.js'):root.__NFSU2_DYNO_NATIVE__;
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const bits=x=>{const v=new DataView(new ArrayBuffer(4));v.setFloat32(0,x,true);return v.getUint32(0,true);};
const abort=s=>{if(s?.aborted)throw Object.assign(Error('Tuning cancelled'),{name:'AbortError'});};
async function create(prepared){
 const h=await Native.instantiate(prepared);let snapshot,baseline,allowed=[],mask=0;
 const bytes=(p,n)=>new Uint8Array(h.memory.buffer,p,n).slice();
 function validate(s){
  const {ride,tuned,parts,kind,carType}=s,view=h.view,u=p=>view.getUint32(p,true),f=p=>view.getFloat32(p,true);
  if(kind<0||kind>4||carType>45||tuned!==ride+0x384||parts!==ride+0x2f0||u(tuned)!==carType||u(tuned+8)!==parts||u(tuned+12)!==ride+0x40||u(tuned+0xe4)!==0)throw Error('Unrecognized native tuning layout');
  const count=u(0x8383fc),catalog=u(0x8383f8),children=new Map();if(count>256)throw Error('Unsupported parts catalog');
  for(let i=0;i<count;i++){const p=catalog+i*0x17c,n=u(p+8);if(n>4)throw Error('Invalid parts catalog children');for(let j=0;j<n;j++){const q=p+12+j*0x5c,id=u(q);if(id>67)throw Error('Invalid installed part selector');children.set(q,id);for(const o of [0x40,0x44,0x48,0x4c,0x50,0x54,0x58]){const dep=u(q+o);if(dep!==0xffffffff&&dep>67)throw Error('Unsupported part dependency');}}}
  for(let i=0;i<68;i++){const q=u(0x837b90+i*4);if(q&&children.get(q)!==i)throw Error('Uncaptured native parts lookup');}
  const rules=u(0x86b340),ruleCount=u(0x86b344);if(ruleCount<1||ruleCount>256)throw Error('Unsupported tuning rules');
  for(let i=0;i<ruleCount;i++){const p=rules+i*24;if(u(p)>67||view.getUint8(p+5)>24||view.getUint8(p+6)>4||!Number.isFinite(f(p+8))||!Number.isFinite(f(p+12)))throw Error('Unrecognized tuning rule');}
  const pi=ride+16,n=u(pi+0x55c),min=f(pi+0x560),max=f(pi+0x564),inv=f(pi+0x568);if(n<2||n>512||![min,max,inv].every(Number.isFinite)||max<=min||inv<=0)throw Error('Invalid native curve descriptor');
  for(const p of [ride+0x40,u(0x8a1ccc)+carType*0x890+0x110]){const gears=u(p+0x1c8),idle=f(p+0x1f0),rpm=f(p+0x1f8);if(gears<1||gears>6||!Number.isFinite(idle)||!Number.isFinite(rpm)||idle<100||rpm<=idle||rpm>=30000)throw Error('Unsupported native gearing/RPM');}
  Core.setupCopy(bytes(tuned+20,41));if(!same(bytes(tuned+20,41),s.setup)||!same(bytes(parts,148),s.partBytes))throw Error('Native capture mismatch');
 }
 function load(s){
  h.hydrate(s);validate(s);
  if(prepared.meta.currentNumericWrapper){
   if(!(prepared.meta.moduleHash==='c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391'||(prepared.meta.moduleHash==='395d7d34809be586e9ec80866914179247e96df7cb5729c7b8c7e4650c6dee3e'||prepared.meta.moduleHash==='3152b96dbd39c9aaac00f47cb63afff46969d88cd7470166478c9663c9abb1bb'||prepared.meta.moduleHash==='f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b'||prepared.meta.moduleHash==='2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d')&&prepared.meta.nativePolicyCapture?.version===1)||!prepared.meta.privateEvaluator)throw Error('Unsupported private stock scratch');
   const address=h.view.getUint32(0x8a1ccc,true)+s.carType*0x890+0x4f8;
   const stock=s.ranges.find(r=>r.address===h.view.getUint32(0x8a1ccc,true)&&r.data.length===46*0x890&&!r.writable);
   if(!stock||address<stock.address||address+4>stock.address+stock.data.length)throw Error('Uncaptured private stock scratch');
   if(!s.ranges.some(r=>r.writable&&r.address===address&&r.data.length===4))s={...s,ranges:[...s.ranges,{address,data:new Uint8Array(h.memory.buffer,address,4).slice(),writable:true}]};
   h.hydrate(s);validate(s);
  }
  snapshot=s;baseline=Core.setupCopy(s.setup);mask=0;for(let k=0;k<25;k++){const r=h.call((prepared.meta.entries?.unlocked??7775),[k],{thisArg:s.tuned,fuel:20000,rollback:true});if(r.eax&255)mask|=1<<k;}allowed=Core.allowedOffsets(mask);return {allowedOffsets:[...allowed],unlockedOffsets:[...allowed],mask};}
 async function evaluate(draft,{signal,budget=500000}={}){
  if(!snapshot)throw Error('Load a tuning snapshot first');const requested=Core.setupCopy(draft),s=snapshot;h.hydrate(s);validate(s);let remaining=budget;const calls=[];
  const native=(id,args=[],thisArg=s.tuned)=>{abort(signal);const r=h.call(id,args,{thisArg,fuel:Math.min(150000,remaining)});remaining-=r.fuel;calls.push({id,fuel:r.fuel});return r;};
  try{
   const changedKinds=new Set();
   for(let i=0;i<41;i++)if(requested[i]!==baseline[i]){
    abort(signal);if(!allowed.includes(i))throw Error('Setting is locked: '+Core.FIELD_LABELS[i]);const {kind,column}=Core.nativeField(i);changedKinds.add(kind);
    const old=h.view.getUint8(s.tuned+20+i);let value;try{h.view.setUint8(s.tuned+20+i,requested[i]);value=native((prepared.meta.entries?.getValue??9171),[kind,column,0]).value;}finally{h.view.setUint8(s.tuned+20+i,old);}
    if(!Number.isFinite(value)||Math.abs(value)>=1e12)throw Error('Native tuning value is invalid');native((prepared.meta.entries?.setValue??10435),[bits(value),kind,column,0]);await new Promise(r=>setTimeout(r,0));
   }
   const accepted=Core.setupCopy(bytes(s.tuned+20,41));const permitted=new Set(changedKinds);if([...changedKinds].some(k=>k>=10&&k<=15))for(let k=10;k<=15;k++)permitted.add(k);if(changedKinds.has(16)||changedKinds.has(17)){permitted.add(16);permitted.add(17);}
   for(let i=0;i<41;i++)if(accepted[i]!==baseline[i]&&(!permitted.has(Core.nativeField(i).kind)||!allowed.includes(i)))throw Error('Native tuning changed a locked or unrelated setting');
   const pi=s.ride+16;native((prepared.meta.entries?.rebuild??10902),[0,1,1],pi);await new Promise(r=>setTimeout(r,0));abort(signal);
   if(!same(bytes(s.tuned+20,41),accepted))throw Error('Native rebuild changed the accepted setup');
   h.view.setFloat32(pi+0x14,NaN,true);h.view.setFloat32(pi+0x18,NaN,true);native((prepared.meta.entries?.acceleration??19654),[],pi);const top=native((prepared.meta.entries?.topSpeed??12627),[],pi).value;
   const result={zeroTo60Seconds:h.view.getFloat32(pi+0x14,true),zeroTo100Seconds:h.view.getFloat32(pi+0x18,true),topSpeedMps:top};
   const out=h.SP+64;const power=native((prepared.meta.entries?.peakPower??12315),[out,0],pi);result.peakPowerKw=power.value;result.powerRpm=h.view.getFloat32(out,true);const torque=native((prepared.meta.entries?.peakTorque??12470),[out,0],pi);result.peakTorqueNm=torque.value*1000;result.torqueRpm=h.view.getFloat32(out,true);
   for(const key of ['zeroTo60Seconds','zeroTo100Seconds','topSpeedMps','peakPowerKw','peakTorqueNm'])if(!Number.isFinite(result[key])||result[key]<=0)throw Error('Native estimate unavailable: '+key);
   result.nitrousSeconds=h.view.getFloat32(s.ride+0x40+0x2a0,true);result.nitrousTorque=h.view.getFloat32(s.ride+0x40+0x2ac,true);
   abort(signal);return {setup:accepted,result,requested,changes:Core.setupDiff(baseline,accepted,requested),fuel:budget-remaining,calls,scope:'Native estimates in private memory; handling and lap times are not measured.'};
  }finally{h.hydrate(s);}
 }
 return {load,evaluate};
}
const api={create};root.__NFSU2_DYNO_EVALUATOR__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
