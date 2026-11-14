/* Bounded observations from the existing page telemetry. A mode exit ends an
 * observation only: this module has no race-result, completion or win proof. */
(function(root){
  'use strict';
  const KEY='nfsu2-driving-tools-race-stats-v1';
  const VERSION=1,MAX_RUNS=200,MAX_BYTES=65536,MAX_GAP_MS=1000,WRITE_INTERVAL_MS=1000;
  const SPEED_UNITS='native-coordinate-units-per-native-second';
  const MAX_TIME=8640000000000000,MAX_RUN_MS=604800000;
  const TYPES=new Set(['circuit','sprint','drag','drift','street-x','url','outrun','unknown']);
  const END_REASONS=new Set(['race-exit','driving-ended','identity-change','observation-interrupted']);
  const read=(value,key)=>{try{return value==null?undefined:value[key];}catch{return undefined;}};
  const integer=(value,lo,hi)=>Number.isSafeInteger(value)&&value>=lo&&value<=hi;
  const finite=(value,lo,hi)=>typeof value==='number'&&Number.isFinite(value)&&value>=lo&&value<=hi;
  const type=value=>integer(value,0,255)?value:TYPES.has(value)?value:'unknown';
  const track=value=>integer(value,0,65535)?value:null;
  const car=value=>value==='r34'||value==='other'?value:'unknown';
  const peak=value=>finite(value,0,500)?Math.round(value*1000)/1000:null;
  const identity=value=>(typeof value==='string'&&value.length>0&&value.length<=256)||integer(value,0,Number.MAX_SAFE_INTEGER);
  const copyRun=run=>({id:run.id,trackId:run.trackId,raceType:run.raceType,carKey:run.carKey,startedAt:run.startedAt,lastObservedAt:run.lastObservedAt,endedAt:run.endedAt,endReason:run.endReason,aiMilliseconds:run.aiMilliseconds,peakNativeSpeed:run.peakNativeSpeed,samples:run.samples});
  function restoredRun(value){
    const id=read(value,'id'),startedAt=read(value,'startedAt'),lastObservedAt=read(value,'lastObservedAt'),endedAt=read(value,'endedAt'),aiMilliseconds=read(value,'aiMilliseconds'),samples=read(value,'samples');
    if(!integer(id,1,1000000000)||!integer(startedAt,0,MAX_TIME)||!integer(lastObservedAt,startedAt,MAX_TIME)||!integer(aiMilliseconds,0,Math.min(MAX_RUN_MS,lastObservedAt-startedAt))||!integer(samples,1,1000000000))return null;
    if(endedAt!==null&&!integer(endedAt,lastObservedAt,MAX_TIME))return null;
    const rawTrack=read(value,'trackId'),rawType=read(value,'raceType'),rawCar=read(value,'carKey'),rawPeak=read(value,'peakNativeSpeed'),endReason=read(value,'endReason');
    if((rawTrack!==null&&track(rawTrack)===null)||type(rawType)!==rawType||car(rawCar)!==rawCar||(rawPeak!==null&&peak(rawPeak)===null))return null;
    if(endedAt!==null&&!END_REASONS.has(endReason))return null;
    // An old active record cannot resume ownership across a page reload.
    return {id,trackId:rawTrack,raceType:rawType,carKey:rawCar,startedAt,lastObservedAt,endedAt:endedAt===null?lastObservedAt:endedAt,endReason:endedAt===null?'observation-interrupted':endReason,aiMilliseconds,peakNativeSpeed:peak(rawPeak),samples};
  }
  function create({storage=null,clock=()=>Date.now()}={}){
    let runs=[],active=null,activeIdentity=null,previous=null,nextId=1,lastWrite=null,dirty=false,storageAvailable=false;
    const now=()=>{try{const value=clock();return finite(value,0,MAX_TIME)?Math.floor(value):null;}catch{return null;}};
    // Only a schema-selected record is serialized. Opaque runtime identities,
    // addresses, names, chat and caller-supplied fields never enter storage.
    const packed=()=>({version:VERSION,speedUnits:SPEED_UNITS,runs:runs.map(copyRun)});
    const bound=()=>{
      while(runs.length>MAX_RUNS||JSON.stringify(packed()).length*2>MAX_BYTES){
        if(runs.length<=1)break;
        runs.shift();
      }
    };
    const persist=(at,force=false)=>{
      if(!dirty||(!force&&lastWrite!==null&&at>=lastWrite&&at-lastWrite<WRITE_INTERVAL_MS))return;
      bound();
      try{
        if(storage&&typeof storage.setItem==='function'){
          storage.setItem(KEY,JSON.stringify(packed()));storageAvailable=true;
        }
      }catch{storageAvailable=false;}
      lastWrite=at;dirty=false;
    };
    try{
      if(storage&&typeof storage.getItem==='function'){
        const raw=storage.getItem(KEY);storageAvailable=true;
        if(typeof raw==='string'&&raw.length*2<=MAX_BYTES){
          const saved=JSON.parse(raw);
          if(read(saved,'version')===VERSION&&read(saved,'speedUnits')===SPEED_UNITS&&Array.isArray(read(saved,'runs'))){
            const seen=new Set();
            for(const value of saved.runs.slice(-MAX_RUNS)){
              const run=restoredRun(value);
              if(run&&!seen.has(run.id)){runs.push(run);seen.add(run.id);}
            }
            nextId=runs.reduce((max,run)=>Math.max(max,run.id+1),1);
            bound();
          }
        }
      }
    }catch{storageAvailable=false;}
    const finish=(at,reason)=>{
      if(!active)return;
      // Do not credit the unobserved interval leading into a menu or mode exit.
      active.endedAt=Math.max(active.lastObservedAt,at);active.endReason=reason;
      active=null;activeIdentity=null;previous=null;dirty=true;
    };
    const totals=items=>{
      let aiMilliseconds=0,peakNativeSpeed=null;
      for(const run of items){aiMilliseconds+=run.aiMilliseconds;if(run.peakNativeSpeed!==null&&(peakNativeSpeed===null||run.peakNativeSpeed>peakNativeSpeed))peakNativeSpeed=run.peakNativeSpeed;}
      return {observedRuns:items.length,aiDrivingSeconds:aiMilliseconds/1000,peakNativeSpeed};
    };
    const snapshot=()=>{
      const byType=new Map(),byTrack=new Map();
      for(const run of runs){
        if(!byType.has(run.raceType))byType.set(run.raceType,[]);
        byType.get(run.raceType).push(run);
        if(!byTrack.has(run.trackId))byTrack.set(run.trackId,[]);
        byTrack.get(run.trackId).push(run);
      }
      return {version:VERSION,speedUnits:SPEED_UNITS,...totals(runs),r34:totals(runs.filter(run=>run.carKey==='r34')),byType:[...byType].map(([raceType,items])=>({raceType,...totals(items)})),byTrack:[...byTrack].map(([trackId,items])=>({trackId,...totals(items)})),runs:runs.map(copyRun),active:!!active,maxRuns:MAX_RUNS,maxStoredBytes:MAX_BYTES,maxGapMs:MAX_GAP_MS,storageAvailable,confirmedResultsAvailable:false,wins:null};
    };
    const observe=data=>{
      const at=now();
      if(at===null){previous=null;return snapshot();}
      const driving=read(data,'driving')===true,inRace=read(data,'inRace')===true;
      const generation=read(data,'sessionGeneration'),raceIdentity=read(data,'raceIdentity');
      const validIdentity=integer(generation,0,4294967295)&&identity(raceIdentity);
      const trackId=track(read(data,'trackId')),raceType=type(read(data,'raceType')),carKey=car(read(data,'carKey'));
      const continuing=active&&activeIdentity&&activeIdentity.generation===generation&&activeIdentity.raceIdentity===raceIdentity&&active.trackId===trackId&&active.raceType===raceType&&active.carKey===carKey;
      let edge=false;
      if(active&&(!inRace||!driving||!validIdentity||!continuing)){
        finish(at,!inRace?'race-exit':!driving?'driving-ended':'identity-change');edge=true;
      }
      if(!inRace||!driving||!validIdentity){persist(at,edge);return snapshot();}
      if(active&&at<active.lastObservedAt){previous=null;return snapshot();}
      if(!active){
        if(nextId>1000000000){runs.forEach((run,index)=>{run.id=index+1;});nextId=runs.length+1;}
        active={id:nextId++,trackId,raceType,carKey,startedAt:at,lastObservedAt:at,endedAt:null,endReason:null,aiMilliseconds:0,peakNativeSpeed:null,samples:0};
        activeIdentity={generation,raceIdentity};
        runs.push(active);dirty=true;edge=true;previous=null;
      }
      const aiOwned=read(data,'aiOwned')===true;
      if(previous&&previous.aiOwned&&aiOwned&&at>=previous.at&&at-previous.at<=MAX_GAP_MS){
        active.aiMilliseconds=Math.min(MAX_RUN_MS,active.aiMilliseconds+at-previous.at);
      }
      const speed=peak(read(data,'nativeSpeed'));
      if(speed!==null&&(active.peakNativeSpeed===null||speed>active.peakNativeSpeed))active.peakNativeSpeed=speed;
      active.lastObservedAt=Math.max(active.lastObservedAt,at);active.samples=Math.min(1000000000,active.samples+1);
      previous={at,aiOwned};dirty=true;bound();persist(at,edge);
      return snapshot();
    };
    const clear=()=>{
      runs=[];active=null;activeIdentity=null;previous=null;nextId=1;dirty=false;lastWrite=null;
      try{
        if(storage&&typeof storage.removeItem==='function'){storage.removeItem(KEY);storageAvailable=true;}
        else if(storage&&typeof storage.setItem==='function'){storage.setItem(KEY,JSON.stringify(packed()));storageAvailable=true;}
      }
      catch{storageAvailable=false;}
      return snapshot();
    };
    return Object.freeze({observe,snapshot,clear});
  }
  const api=Object.freeze({create,KEY,VERSION,SPEED_UNITS,MAX_RUNS,MAX_BYTES,MAX_GAP_MS});
  root.__NFSU2_RACE_STATS__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
