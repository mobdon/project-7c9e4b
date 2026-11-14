(function(root){
'use strict';
// Pure search core. This module never writes game memory or saves a profile.
const REVISION='6f4f1e4e', REVISIONS=Object.freeze([REVISION,'2f0ddd3b','78e2bb69','93af6ccb','943ee537','bdc9cbc2','b1efa173','ed8d3359','102c8d92']), SETUP_SIZE=41, DYNO=0x839c40;
const SCALARS=Object.freeze(['frontSprings','frontShocks','frontSwayBar','frontRideHeight','rearSprings','rearShocks','rearSwayBar','rearRideHeight','camberNativeId','finalDrive','gear1','gear2','gear3','gear4','gear5','gear6','nosDepletionRate','nosTorque','brakeBias','frontGrip','rearGrip','frontDownforce','rearDownforce']);
const FIELDS=Object.freeze([...SCALARS,...Array.from({length:9},(_,i)=>`ecu${i}`),...Array.from({length:9},(_,i)=>`turbo${i}`)]);
const FIELD_LABELS=Object.freeze(['Front springs','Front shocks','Front sway bar','Front lowering','Rear springs','Rear shocks','Rear sway bar','Rear lowering','Steering ratio (native CAMBER)','Final drive','Gear 1','Gear 2','Gear 3','Gear 4','Gear 5','Gear 6','Nitrous depletion rate','Nitrous torque','Brake bias','Front tire grip','Rear tire grip','Front downforce','Rear downforce',...Array.from({length:9},(_,i)=>`ECU point ${i+1}`),...Array.from({length:9},(_,i)=>`Turbo point ${i+1}`)]);
const MODE_LABELS=Object.freeze(['Circuit / Sprint','Drag','Drift','Street X','URL']);
const GROUPS=Object.freeze([
 {id:'suspension',label:'Suspension',offsets:[0,1,2,3,4,5,6,7,8]},
 {id:'gearing',label:'Gearing',offsets:[9,10,11,12,13,14,15]},
 {id:'aero',label:'Downforce',offsets:[21,22]},
 {id:'tires',label:'Tires / brakes',offsets:[18,19,20]},
 {id:'nos',label:'Nitrous',offsets:[16,17]},
 {id:'ecu',label:'ECU',offsets:[23,24,25,26,27,28,29,30,31]},
 {id:'turbo',label:'Turbo',offsets:[32,33,34,35,36,37,38,39,40]}
].map(group=>Object.freeze({...group,offsets:Object.freeze(group.offsets)})));
function setupCopy(value) {
  if(!value || value.length!==SETUP_SIZE || !Array.from(value).every(v=>Number.isInteger(v)&&v>=0&&v<=200)) throw Error('Unrecognized tuning setup');
  return Uint8Array.from(value);
}
function nativeField(offset){
  if(!Number.isInteger(offset)||offset<0||offset>=SETUP_SIZE)throw Error('Invalid tuning offset');
  return offset<23?{kind:offset,column:0}:offset<32?{kind:23,column:offset-23}:{kind:24,column:offset-32};
}
function allowedOffsets(mask){
  if(!Number.isInteger(mask)||mask<0||mask>0x1ffffff)throw Error('Unrecognized native eligibility mask');
  return Array.from({length:SETUP_SIZE},(_,i)=>i).filter(i=>mask&(1<<nativeField(i).kind));
}
function setupDiff(baseline,accepted,requested=accepted){
  const a=setupCopy(baseline),b=setupCopy(accepted),r=setupCopy(requested);
  return Array.from({length:SETUP_SIZE},(_,offset)=>({offset,field:FIELDS[offset],before:a[offset],after:b[offset],requested:r[offset],adjusted:b[offset]!==r[offset]})).filter(x=>x.before!==x.after||x.adjusted);
}
function normalized(value){if(!Number.isInteger(value)||value<0||value>200)throw Error('Invalid tuning value');return (value-100)/100;}
// Menu/record pointers alone are not a write authorization. The future bridge must
// additionally prove the active front-end screen on the game thread before any edit.
function inspect(memory,revision){
  if(!REVISIONS.includes(revision))return {available:false,reason:'Unsupported game revision'};
  const v=new DataView(memory.buffer),ok=(p,n=4)=>Number.isSafeInteger(p)&&p>=0x10000&&p+n<=Math.min(0x28000000,v.byteLength);
  const u32=p=>ok(p)?v.getUint32(p,true):0;
  if(!ok(DYNO,0xb65))return {available:false,reason:'Dyno memory unavailable'};
  const record=u32(DYNO),tuned=u32(DYNO+0x900),kind=u32(DYNO+0x9fc);
  if(v.getUint8(DYNO+0xb64)!==1||kind>4||!ok(record,0x360+5*SETUP_SIZE)||!ok(tuned,0x14+SETUP_SIZE))return {available:false,reason:'Open Performance Tuning / Dyno'};
  let setup;
  try{setup=setupCopy(new Uint8Array(v.buffer,tuned+0x14,SETUP_SIZE));}catch{return {available:false,reason:'Unrecognized tuning setup'};}
  const runCount=u32(DYNO+0xa18),r=DYNO+0xa1c;
  const value=(o,max)=>{const x=v.getFloat32(r+o,true);return Number.isFinite(x)&&x>0&&x<max?x:null;};
  const time=o=>{const ticks=u32(r+o);return ticks>0&&ticks<0x7fffffff?ticks/4000:null;};
  const result=runCount?{topSpeedMps:value(0,1000),zeroTo60Seconds:time(8),zeroTo100Seconds:time(12),peakTorqueNm:(value(0x58,100)||0)*1000||null,peakPowerKw:value(0x5c,100000),torqueRpm:value(0x60,30000),powerRpm:value(0x64,30000)}:null;
  if(record!==u32(DYNO)||tuned!==u32(DYNO+0x900)||kind!==u32(DYNO+0x9fc)||runCount!==u32(DYNO+0xa18)||!setup.every((n,i)=>n===v.getUint8(tuned+0x14+i)))return {available:false,reason:'Dyno changed while reading'};
  return {available:true,readOnly:true,record,tuned,kind,setup,runCount,result};
}
function score(result,goal){
  const spec={peakPower:['peakPowerKw',1],peakTorque:['peakTorqueNm',1],topSpeed:['topSpeedMps',1],acceleration60:['zeroTo60Seconds',-1],acceleration100:['zeroTo100Seconds',-1]}[goal];
  if(!spec)throw Error('Unknown tuning goal');
  const value=result?.[spec[0]];if(!Number.isFinite(value)||value<=0)throw Error('Dyno result missing for the selected goal');
  return spec[1]*value;
}
function equal(a,b){return a.length===b.length&&a.every((x,i)=>x===b[i]);}
function abort(signal){if(signal?.aborted)throw Object.assign(Error('Tuning cancelled'),{name:'AbortError'});}
/** Adapter contract (implemented by dyno.js and the pinned game-thread bridge):
 * acquire({signal}) -> {lease, setup, allowedOffsets} captures all setup bytes on
 * the game thread, installed-part eligibility, car/mode/generation and screen.
 * evaluate({lease,setup,signal}) -> {setup,result} uses the native bounded setter,
 * confirms accepted bytes, calculates a fresh native peak result, then rolls back the trial in the same frame.
 * release({lease,restore:true}) -> {restored,reason} restores only if the lease
 * still owns this exact live setup; never writes a stale/new car or another mode.
 * It MUST restore even when evaluate threw after applying a candidate, and must
 * quiesce all in-flight evaluation before resolving. A timeout belongs in adapter.
 * Persistent profile saves are outside this contract. Search always restores.
 */
class Search {
  constructor(adapter){this.adapter=adapter;this.running=false;}
  async run({goal='peakPower',offsets,steps=[40,20,10],budget=160,epsilon=1e-5,signal,onProgress=()=>{}}={}){
    if(this.running)throw Error('A dyno search is already running');
    if(!Array.isArray(offsets)||!offsets.length||offsets.some(n=>!Number.isInteger(n)||n<0||n>=41)||new Set(offsets).size!==offsets.length)throw Error('Choose distinct tuning fields');
    if(!Array.isArray(steps)||!steps.length||steps.some(n=>!Number.isInteger(n)||n<1||n>200))throw Error('Invalid search steps');
    if(!Number.isInteger(budget)||budget<2||budget>2000||!Number.isFinite(epsilon)||epsilon<0)throw Error('Invalid search limits');
    // Validate goal before acquiring a potentially mutating lease.
    score({peakPowerKw:1,peakTorqueNm:1,topSpeedMps:1,zeroTo60Seconds:1,zeroTo100Seconds:1},goal);
    this.running=true;let acquired=null,outcome,failure;
    try{
      abort(signal);acquired=await this.adapter.acquire({signal});
      const baseline=setupCopy(acquired.setup),allowed=new Set(acquired.allowedOffsets);
      if(offsets.some(n=>!allowed.has(n)))throw Error('A selected tuning field is locked or unsupported');
      const cache=new Map();let evaluations=0;
      const evaluate=async candidate=>{
        abort(signal);const key=Array.from(candidate).join(',');if(cache.has(key))return cache.get(key);
        const measured=await this.adapter.evaluate({lease:acquired.lease,setup:setupCopy(candidate),signal});evaluations++;abort(signal);
        const actual=setupCopy(measured.setup);
        for(let i=0;i<41;i++)if(!offsets.includes(i)&&actual[i]!==baseline[i])throw Error('Native tuning changed a field outside the selected scope');
        const entry={requested:setupCopy(candidate),setup:actual,result:{...measured.result},score:score(measured.result,goal)};cache.set(key,entry);
        onProgress({evaluations,budget,score:entry.score,goal});return entry;
      };
      let best=await evaluate(baseline);const original=best;
      // Bounded coordinate search, including both directions and progressively
      // smaller steps. Native game constraints decide the accepted trial setup.
      outer:for(const step of steps){
        let improved=true;
        while(improved){
          improved=false;
          for(const offset of offsets){
            const center=best;let winner=center;
            for(const direction of [-1,1]){
              abort(signal);if(evaluations>=budget){best=winner;break outer;}
              const candidate=setupCopy(center.setup);candidate[offset]=Math.max(0,Math.min(200,candidate[offset]+direction*step));
              if(equal(candidate,center.setup))continue;
              const measured=await evaluate(candidate);
              if(measured.score>winner.score+epsilon)winner=measured;
            }
            if(winner!==center){best=winner;improved=true;}
          }
        }
      }
      outcome={goal,baseline,baselineResult:original.result,best:setupCopy(best.setup),bestRequest:setupCopy(best.requested),bestResult:best.result,improved:best.score>original.score+epsilon,evaluations,budgetReached:evaluations>=budget,globallyOptimal:false};
    }catch(error){failure=error;}
    finally{
      if(acquired){
        try{const restored=await this.adapter.release({lease:acquired.lease,restore:true});if(restored?.restored!==true)throw Error('Baseline could not be restored: '+(restored?.reason||'unconfirmed'));}
        catch(error){failure=failure?new AggregateError([failure,error],'Search stopped and baseline restoration is unconfirmed'):error;}
      }
      this.running=false;
    }
    if(failure)throw failure;
    return {...outcome,baselineRestored:true};
  }
}
const api={REVISION,REVISIONS,SETUP_SIZE,DYNO,SCALARS,FIELDS,FIELD_LABELS,MODE_LABELS,GROUPS,nativeField,allowedOffsets,setupDiff,normalized,setupCopy,inspect,score,Search};root.__NFSU2_DYNO_CORE__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
