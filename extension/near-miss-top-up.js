(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.__NFSU2_NEAR_MISS_TOP_UP__=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEYS=Object.freeze(['moduleIdentity','moduleHash','generation','car','race']);
  const uint=n=>Number.isInteger(n)&&n>0&&n<=0xffffffff;
  const same=(a,b)=>!!a&&!!b&&KEYS.every(key=>a[key]===b[key]);
  const identity=s=>!!s&&s.moduleIdentity!=null&&typeof s.moduleHash==='string'&&s.moduleHash.length>0&&uint(s.generation)&&uint(s.car)&&uint(s.race);
  const gates=new Set(['paused','permission','unavailable']);
  const terminal=new Set(['confirmed','unconfirmed','native-gate','event-mismatch']);
  function level(sample){
    if(!sample||typeof sample.active!=='boolean'||!Number.isInteger(sample.full)||sample.full<=0||sample.full>=10000000||
      !Number.isInteger(sample.remaining)||sample.remaining<0||sample.remaining>=10000000)return null;
    const elapsedTicks=sample.active?sample.elapsedTicks:0;
    if(!Number.isInteger(elapsedTicks)||elapsedTicks<0||elapsedTicks>=0x7fffffff)return null;
    const effective=Math.max(0,sample.remaining-elapsedTicks);
    return Object.freeze({full:sample.full,remaining:sample.remaining,effective,deficit:Math.max(0,sample.full-effective),atFull:effective>=sample.full,active:sample.active,elapsedTicks});
  }
  function create({control,getSample,clock=()=>Date.now(),intervalMs=250,timeoutMs=4000}={}){
    if(!control||['status','request','poll','cancel'].some(key=>typeof control[key]!=='function'))throw new TypeError('A near-miss control is required');
    if(typeof getSample!=='function'||typeof clock!=='function')throw new TypeError('Top-up readers are required');
    if(!Number.isFinite(intervalMs)||intervalMs<250||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new TypeError('Invalid top-up timing');
    let enabled=false,owner=null,flight=null,nextAt=0,lastTime=null,state='off',reason='off',paused=false,polling=false;
    function read(){
      let status=null,sample=null,error=null;
      try{status=control.status();if(!status||typeof status.pending!=='boolean')error='control-error';}catch{error='control-error';}
      try{sample=getSample();}catch{error=error||'sample-error';}
      return{status,sample,quantity:level(sample),error};
    }
    function time(){
      try{const now=clock();return Number.isFinite(now)&&now>=0&&(lastTime===null||now>=lastTime)?now:null;}catch{return null;}
    }
    function view(snapshot=read()){
      const c=snapshot.status,pending=!!flight||c?.pending===true;
      let shown=state,why=reason;
      if(enabled){
        if(gates.has(c?.state)){shown='paused';why=c.state;}
        else if(!snapshot.quantity){shown='paused';why='nos-unavailable';}
        else if(snapshot.quantity.atFull){shown='full';why='full';}
      }
      const texts={off:'NOS top-up off',armed:'NOS top-up armed',pending:'Waiting for native top-up confirmation',cooldown:'Waiting before the next top-up',paused:'NOS top-up paused',full:'NOS full · waiting for use',stopped:'NOS top-up stopped'};
      return Object.freeze({enabled,state:shown,reason:why,text:texts[shown]||texts.stopped,pending,nextAt:enabled&&!flight?nextAt:null,level:snapshot.quantity,
        canEnable:!enabled&&!pending&&!snapshot.error&&identity(snapshot.sample)&&!!snapshot.quantity&&c?.canRequest===true&&!gates.has(c.state)});
    }
    function halt(why){enabled=false;state='stopped';reason=why;paused=false;if(flight)flight.cancelReason='failure';}
    function markCancellation(why){
      if(!flight)return;
      if(!flight.cancelReason||why==='disable'||why==='failure')flight.cancelReason=why;
    }
    function withdraw(){
      if(!flight?.cancelReason)return;
      try{control.cancel();}catch{halt('cancellation-error');}
    }
    function setEnabled(wanted){
      if(wanted!==true){enabled=false;state='off';reason='off';paused=false;markCancellation('disable');withdraw();return view();}
      if(enabled)return view();
      const snapshot=read(),now=time(),c=snapshot.status;
      if(flight||snapshot.error||now===null||!identity(snapshot.sample)||!snapshot.quantity||c?.pending===true||c?.canRequest!==true||gates.has(c.state))return view(snapshot);
      enabled=true;owner=Object.freeze(Object.fromEntries(KEYS.map(key=>[key,snapshot.sample[key]])));nextAt=now;lastTime=now;paused=false;
      state=snapshot.quantity.atFull?'full':'armed';reason=snapshot.quantity.atFull?'full':'armed';return view(snapshot);
    }
    function pause(why='paused'){
      if(enabled){paused=true;state='paused';reason=typeof why==='string'?why:'paused';const now=time();if(now!==null&&!flight)nextAt=Math.max(nextAt,now+intervalMs);markCancellation('pause');withdraw();}
      return view();
    }
    function settle(c){
      const outcome=c.outcomeState||c.state;
      if(c.pending)return false;
      if(!terminal.has(outcome))return false;
      const cancelled=!!flight.cancelReason&&outcome==='unconfirmed'&&c.result===12&&c.points===0&&c.nos===0;
      const applied=outcome==='confirmed'&&c.result===1&&Number.isInteger(c.nos)&&c.nos>0&&c.nos<=0x7fffffff;
      flight=null;
      if(!applied&&!cancelled){halt(outcome==='confirmed'?'no-nos-progress':outcome);return true;}
      if(enabled){
        const completedAt=time();
        if(completedAt===null){halt('clock-error');return true;}
        lastTime=completedAt;nextAt=completedAt+intervalMs;state='cooldown';reason='cooldown';
      }
      return true;
    }
    function pump(snapshot,now){
      const c=snapshot.status,outcome=c?.outcomeState||c?.state;
      // An already unknown outcome is a failure even when eligibility masks
      // it as paused. Expected cancellation is recorded before asking control.
      if(outcome==='unknown'&&!flight.cancelReason)halt('unknown-outcome');
      if(enabled&&gates.has(c?.state)){paused=true;markCancellation('pause');}
      else if(enabled&&!snapshot.quantity){paused=true;markCancellation('pause');}
      else if(enabled&&snapshot.quantity.atFull)markCancellation('full');
      if(now-flight.started>=timeoutMs)halt('timeout');
      if(!enabled&&!flight.cancelReason)markCancellation('disable');
      withdraw();
      let result;
      try{result=control.poll();if(!result||typeof result.pending!=='boolean')throw Error('Invalid control status');}
      catch{halt('confirmation-error');return;}
      const nextOutcome=result.outcomeState||result.state;
      if(nextOutcome==='unknown'&&!flight.cancelReason)halt('unknown-outcome');
      if(!result.pending&&terminal.has(nextOutcome)){settle(result);return;}
      if(enabled){state=paused?'paused':'pending';reason=paused?'paused':'pending';}
    }
    function publish(now){
      // Re-read after cooldown. A sample read while observing the previous
      // receipt never authorizes the next command.
      const fresh=read(),c=fresh.status;
      if(fresh.error){halt(fresh.error);return;}
      if(identity(fresh.sample)&&!same(owner,fresh.sample)){halt('owner-changed');return;}
      if(c?.pending){halt('independent-request');return;}
      if(!identity(fresh.sample)||!fresh.quantity||gates.has(c?.state)||c?.canRequest!==true){state='paused';reason='not-ready';paused=true;return;}
      if(fresh.quantity.atFull){state='full';reason='full';return;}
      flight={started:now,cancelReason:null};
      let result;
      try{result=control.request();}catch{halt('publication-error');return;}
      const after=read();
      if(result?.published!==true){if(after.status?.pending!==true&&result?.reason!=='outcome-unknown')flight=null;halt('publication-rejected');return;}
      if(after.error||(after.status?.outcomeState||after.status?.state)==='unknown'){halt(after.error||'unknown-outcome');return;}
      if(after.status?.pending!==true){halt('publication-unconfirmed');return;}
      state='pending';reason='pending';paused=false;
    }
    function poll(){
      if(polling)return view();
      polling=true;
      try{
        const snapshot=read(),now=time();
        if(!enabled&&!flight)return view(snapshot);
        if(now===null){halt('clock-error');markCancellation('failure');withdraw();return view(snapshot);}
        lastTime=now;
        if(snapshot.error){halt(snapshot.error);markCancellation('failure');withdraw();return view(snapshot);}
        if(identity(snapshot.sample)&&owner&&!same(owner,snapshot.sample))halt('owner-changed');
        if(flight){pump(snapshot,now);return view();}
        if(!enabled)return view(snapshot);
        if(snapshot.status.pending){halt('independent-request');return view(snapshot);}
        if(!identity(snapshot.sample)||!snapshot.quantity||gates.has(snapshot.status.state)||snapshot.status.canRequest!==true){paused=true;state='paused';reason=gates.has(snapshot.status.state)?snapshot.status.state:'nos-unavailable';return view(snapshot);}
        paused=false;
        if(snapshot.quantity.atFull){state='full';reason='full';return view(snapshot);}
        if(now<nextAt){state='cooldown';reason='cooldown';return view(snapshot);}
        publish(now);return view();
      }finally{polling=false;}
    }
    return Object.freeze({status:()=>view(),setEnabled,poll,pause});
  }
  return Object.freeze({create,level});
});
