/* Named extension choices only. Never stores game setups, car data or diagnostics.
 * Synchronous storage core: page.js serializes save/remove/setAuto with Web Locks.
 * Stop uses an independent marker and never waits for the profile-write lock. */
(function(root) {
  'use strict';
  const KEY='nfsu2-driving-tools-profiles-v1', STOP_KEY=KEY+'-stop';
  const MAX_PROFILES=16, MAX_NAME=48, MAX_BYTES=32768;
  const FLAGS=['raceCornerAssist','cornerAssist','racePace','walls','cars','traffic','players','online','ai','aiPace','nos','dragNoBlowout','drag','tester','boost','unlimit','grip','dynoEnabled'];
  const NUMBERS={raceCornerFactor:[0.6,0.95],raceCornerMargin:[0,25],raceBraking:[0.5,1],racePaceFactor:[0.75,3],cornerFactor:[0.6,0.95],cornerMargin:[0,25],paceFactor:[0.75,3],rpm:[3000,10000],power:[1,3],gripFactor:[1,2]};
  const GOALS=['peakPower','peakTorque','acceleration60','acceleration100','topSpeed'];
  const forbidden=new Set(['__proto__','constructor','prototype']);
  const token=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14);
  const validToken=value=>typeof value==='string'&&/^[a-z0-9-]{1,64}$/.test(value);
  function fail(text){throw Error(text);}
  function exact(value,keys){
    if(!value||typeof value!=='object'||Array.isArray(value))fail('Invalid profile storage.');
    const proto=Object.getPrototypeOf(value);
    if(proto!==null&&Object.getPrototypeOf(proto)!==null)fail('Invalid profile object.');
    const own=Object.keys(value);
    if(own.length!==keys.length||own.some(k=>forbidden.has(k)||!keys.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')))fail('Invalid profile fields.');
  }
  function settings(value){
    exact(value,[...FLAGS,...Object.keys(NUMBERS),'drift','dynoGoal']);
    const out={};
    for(const k of FLAGS){if(typeof value[k]!=='boolean')fail('Invalid profile switch.');out[k]=value[k];}
    for(const [k,[min,max]] of Object.entries(NUMBERS)){const n=value[k];if(!Number.isFinite(n)||n<min||n>max)fail('Invalid profile number.');out[k]=n;}
    if(value.drift!==null&&typeof value.drift!=='boolean')fail('Invalid drift choice.');
    if(!GOALS.includes(value.dynoGoal))fail('Invalid tuner preference.');
    out.drift=value.drift;out.dynoGoal=value.dynoGoal;return out;
  }
  function name(value){
    if(typeof value!=='string'||!value.trim()||value.length>MAX_NAME||/[\u0000-\u001f\u007f-\u009f]/.test(value)||forbidden.has(value.trim().toLowerCase()))fail('Use a profile name of 1–48 characters without control characters.');
    return value.trim();
  }
  const empty=()=>({schema:1,profiles:[],auto:null});
  function decode(raw){
    if(raw===null)return empty();
    if(typeof raw!=='string'||raw.length*2>MAX_BYTES)fail('Profile storage is too large. Nothing was loaded.');
    let value;
    try{value=JSON.parse(raw,(key,v)=>{if(forbidden.has(key))fail('Invalid profile key.');return v;});}catch{fail('Profile storage is damaged. Nothing was loaded or overwritten.');}
    exact(value,['schema','profiles','auto']);
    if(value.schema!==1||!Array.isArray(value.profiles)||value.profiles.length>MAX_PROFILES)fail('Unsupported or invalid profile storage.');
    const ids=new Set(),names=new Set();
    for(const p of value.profiles){
      exact(p,['id','name','settings','networkConsent','revision']);
      if(!validToken(p.id)||!validToken(p.revision)||typeof p.networkConsent!=='boolean')fail('Invalid saved profile.');
      if(name(p.name)!==p.name||ids.has(p.id)||names.has(p.name.toLowerCase()))fail('Invalid or duplicate saved profile.');
      ids.add(p.id);names.add(p.name.toLowerCase());p.settings=settings(p.settings);
    }
    if(value.auto!==null){exact(value.auto,['id','stopToken']);if(!ids.has(value.auto.id)||!validToken(value.auto.stopToken))fail('Invalid automatic profile choice.');}
    return value;
  }
  function create(storage){
    let current=empty(),lastRaw=null,stopToken='initial',error='',available=false;
    function refresh(){
      try{
        if(!storage)fail('Local storage is unavailable. Profiles cannot be saved or automatically loaded.');
        const raw=storage.getItem(KEY),stopped=storage.getItem(STOP_KEY);
        if(stopped!==null&&!validToken(stopped))fail('Invalid profile Stop marker. Automatic loading is blocked.');
        const next=decode(raw);
        // Autoload also requires functioning writes, so read-only/blocked storage fails closed.
        const probe=KEY+'-probe',value=token();storage.setItem(probe,value);
        if(storage.getItem(probe)!==value)fail('Local storage could not be verified.');
        storage.removeItem(probe);
        if(storage.getItem(KEY)!==raw||storage.getItem(STOP_KEY)!==stopped)fail('Profiles changed while reading storage. Select the profile again.');
        current=next;lastRaw=raw;stopToken=stopped||'initial';available=true;error='';
      }catch(e){available=false;error=e.message||'Local storage is unavailable.';current=empty();}
      return snapshot();
    }
    function snapshot(){return {data:JSON.parse(JSON.stringify(current)),stopToken,available,error,paused:stopToken!=='initial'&&(!current.auto||current.auto.stopToken!==stopToken)};}
    function commit(next){
      decode(JSON.stringify(next));
      const raw=JSON.stringify(next);if(raw.length*2>MAX_BYTES)fail('Profile storage limit reached. Delete a profile first.');
      if(storage.getItem(KEY)!==lastRaw)fail('Profiles changed in another tab. Select the profile again.');
      storage.setItem(KEY,raw);if(storage.getItem(KEY)!==raw)fail('The profile write could not be verified.');
      current=next;lastRaw=raw;error='';return snapshot();
    }
    function mutate(fn){
      refresh();if(!available)fail(error);
      const next=JSON.parse(JSON.stringify(current));fn(next);return commit(next);
    }
    function find(next,id,revision){const p=next.profiles.find(p=>p.id===id);if(!p||p.revision!==revision)fail('This profile changed in another tab. Select it again before continuing.');return p;}
    function save({id=null,revision=null,name:label,settings:choices,networkConsent=false}){
      const cleanName=name(label),cleanSettings=settings(choices);
      if(typeof networkConsent!=='boolean')fail('Invalid network permission.');
      let saved;
      mutate(next=>{
        const existing=id?find(next,id,revision):null;
        if(next.profiles.some(p=>p.id!==id&&p.name.toLowerCase()===cleanName.toLowerCase()))fail('That name already exists. Select it and use Update, or choose a different name.');
        if(!existing&&next.profiles.length>=MAX_PROFILES)fail('You can save up to 16 profiles. Delete one before adding another.');
        saved={id:existing?.id||token(),name:cleanName,settings:cleanSettings,networkConsent,revision:token()};
        if(existing)next.profiles[next.profiles.indexOf(existing)]=saved;else next.profiles.push(saved);
        // Updating an automatically loaded profile is not permission to change the next startup.
        if(next.auto?.id===saved.id)next.auto=null;
      });return saved;
    }
    function load(id,revision){refresh();if(!available)fail(error);const p=find(current,id,revision),out=settings(p.settings);if(!p.networkConsent)out.online=out.traffic=out.players=false;return {profile:JSON.parse(JSON.stringify(p)),settings:out};}
    function remove(id,revision){return mutate(next=>{const p=find(next,id,revision);next.profiles.splice(next.profiles.indexOf(p),1);if(next.auto?.id===id)next.auto=null;});}
    function setAuto(id,revision){return mutate(next=>{if(id){
      find(next,id,revision);
      // Never authorize startup against an absent marker. Removing or clearing
      // the marker later must not revive an old pre-Stop automatic profile.
      if(stopToken==='initial'){const fresh=token();storage.setItem(STOP_KEY,fresh);if(storage.getItem(STOP_KEY)!==fresh)fail('Could not save startup permission.');stopToken=fresh;}
      next.auto={id,stopToken};
    }else next.auto=null;});}
    function startup(){refresh();if(!available||stopToken==='initial'||!current.auto||current.auto.stopToken!==stopToken)return null;const p=current.profiles.find(p=>p.id===current.auto.id),out=settings(p.settings);if(!p.networkConsent)out.online=out.traffic=out.players=false;return {profile:JSON.parse(JSON.stringify(p)),settings:out};}
    function pause(){
      // The separate marker protects Stop from a stale settings-record write in another tab.
      const marker=token();let durable=false;
      try{if(!storage)fail('Storage unavailable');storage.setItem(STOP_KEY,marker);durable=storage.getItem(STOP_KEY)===marker;}catch{}
      if(durable){stopToken=marker;refresh();return {durable:true,error:available?'':'Stop saved; '+error};}
      // If possible, remove ONLY automatic loading, preserving all profiles.
      try{const next=decode(storage.getItem(KEY));next.auto=null;const raw=JSON.stringify(next);storage.setItem(KEY,raw);durable=storage.getItem(KEY)===raw;}catch{}
      available=false;error=durable?'Automatic loading disabled, but local storage is not fully available.':'Stop is active on this page, but could not be saved. Automatic loading may return after reload; restore storage, then press F9 / Stop again before reloading.';
      return {durable,error};
    }
    refresh();return {refresh,snapshot,save,load,remove,setAuto,startup,pause};
  }
  const api=Object.freeze({KEY,STOP_KEY,MAX_PROFILES,MAX_NAME,MAX_BYTES,FLAGS:Object.freeze(FLAGS),NUMBERS:Object.freeze(NUMBERS),GOALS:Object.freeze(GOALS),settings,decode,create});
  if(typeof module==='object'&&module.exports)module.exports=api;else Object.defineProperty(root,'__NFSU2_TOOL_PROFILES__',{value:api});
})(globalThis);
