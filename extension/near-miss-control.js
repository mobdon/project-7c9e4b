(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.__NFSU2_NEAR_MISS_CONTROL__=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // A page control consumes a verified worker service. It never edits native
  // car/traffic/style memory or turns the offline fixture into a worker export.
  const IDENTITY=Object.freeze(['id','epoch','token','generation','car','race','racer','manager','style']);
  const uint=value=>Number.isInteger(value)&&value>0&&value<=0xffffffff;
  const signed=value=>Number.isInteger(value)&&value>=-0x80000000&&value<=0x7fffffff;
  const same=(a,b)=>!!a&&!!b&&IDENTITY.every(key=>a[key]===b[key]);
  const sameContext=(a,b)=>!!a&&!!b&&['moduleIdentity','moduleHash','generation','car','race'].every(key=>a[key]===b[key]);
  const sameSession=(a,b)=>!!a&&!!b&&['moduleIdentity','moduleHash','generation'].every(key=>a[key]===b[key]);
  const unavailable='Synthetic near miss unavailable on this game build';
  function create({getBridge=()=>null,getContext=()=>null,clock=()=>Date.now(),timeoutMs=3000}={}){
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new TypeError('Invalid near-miss timeout');
    let pending=null,nextId=1,last={state:'unavailable',text:unavailable};
    function current(){
      let context,bridge;
      try{
        bridge=getBridge();
        if(bridge?.verified!==true||bridge?.ownsMailbox!==true||bridge?.witnessedEvents!==true||bridge.protocolVersion!==4||
          typeof bridge.request!=='function'||typeof bridge.poll!=='function'||typeof bridge.cancel!=='function')return{available:false};
        if(typeof bridge.isCurrent==='function'&&bridge.isCurrent()!==true)return{available:false};
        context=getContext();
      }catch{return{available:false};}
      const available=!!context&&bridge.moduleIdentity===context.moduleIdentity&&bridge.moduleHash===context.moduleHash;
      return{available,bridge,context};
    }
    function eligibility(now){
      if(!now.available)return'unavailable';
      const c=now.context;
      if(c.safe!==true||!uint(c.generation)||!uint(c.car)||!uint(c.race))return'paused';
      if(c.network===true&&c.allowNetwork!==true)return'permission';
      return null;
    }
    function status(){
      const now=current(),reason=eligibility(now),state=reason||(last.state==='unavailable'?'idle':last.state);
      const text=reason==='unavailable'?unavailable:reason==='paused'?'Near miss paused · drive with the game focused':
        reason==='permission'?'Near miss needs Allow network tools online':last.state==='unavailable'?'Ready · one synthetic award per request':last.text;
      return Object.freeze({...last,outcomeState:last.state,state,text,available:now.available,canRequest:!reason&&!pending&&nextId<0x7fffffff,pending:!!pending});
    }
    function request(){
      const now=current(),reason=eligibility(now);
      if(reason||pending||nextId>=0x7fffffff)return{published:false,reason:reason||(pending?'pending':'request-limit')};
      const id=nextId++,context={...now.context};
      let result;
      try{result=now.bridge.request({id,generation:context.generation,car:context.car,race:context.race,allowNetwork:context.allowNetwork===true});}
      catch{last={state:'unknown',text:'Near-miss request outcome unknown · waiting for confirmation'};pending={bridge:now.bridge,context,request:null,started:clock()};return{published:false,reason:'outcome-unknown'};}
      if(result?.published!==true){last={state:'rejected',text:'Near-miss request was not queued'};return{published:false,reason:result?.reason||'not-queued'};}
      const r=result.request;
      const valid=!!r&&IDENTITY.every(key=>uint(r[key]))&&r.id===id&&r.generation===context.generation&&r.car===context.car&&r.race===context.race;
      pending={bridge:now.bridge,context,request:valid?Object.freeze({...r}):null,started:clock()};
      last={state:valid?'pending':'unknown',text:valid?'Near-miss request queued · waiting for native confirmation':'Near-miss request identity unknown · reload before another request'};
      return{published:true,confirmed:false,...(valid?{request:pending.request}:{reason:'invalid-request-identity'})};
    }
    function poll(){
      if(!pending)return status();
      const now=current();
      if(!now.available||now.bridge!==pending.bridge||!sameSession(now.context,pending.context)){invalidate('Game session changed · request outcome unconfirmed');return status();}
      const previousCar=!sameContext(now.context,pending.context);
      if(previousCar)pending.cancelWanted=true;
      if((eligibility(now)||pending.cancelWanted)&&!pending.cancelRequested)cancel();
      if(!pending||!pending.request)return status();
      let receipt;
      try{receipt=pending.bridge.poll(pending.request);}catch{last={state:'unknown',text:'Near-miss confirmation unavailable · request will not retry'};return status();}
      if(receipt?.acknowledged===true&&same(receipt.request,pending.request)){
        if(!signed(receipt.points)||!signed(receipt.nos)){last={state:'unknown',text:'Near-miss outcome is invalid · request will not retry'};return status();}
        const event=receipt.event;
        const eventRequest=event?.request&&{...event.request.target,id:event.request.id,epoch:event.request.epoch};
        const verified=event?.status==='VERIFIED'&&same(eventRequest,pending.request)&&Number.isFinite(event.producerPendingPoints)&&event.producerPendingPoints>0;
        const state=verified&&[1,9].includes(receipt.result)?'confirmed':receipt.result===6&&event?.status==='NATIVE_GATE'?'native-gate':
          receipt.result===11||event?.status==='EVENT_MISMATCH'?'event-mismatch':'unconfirmed';
        const labels={confirmed:'Synthetic near-miss award confirmed','native-gate':'Native near-miss gate · no award','event-mismatch':'Different native event observed · synthetic request unconfirmed',unconfirmed:'Synthetic near miss unconfirmed'};
        last={state,result:receipt.result,text:(previousCar?'Previous car request · ':'')+labels[state]+` · tick style ${receipt.points} · tick NOS ${receipt.nos}`,points:receipt.points,nos:receipt.nos,eventPoints:verified?event.producerPendingPoints:null};
        pending=null;
      }else if(clock()-pending.started>=timeoutMs){last={state:'unknown',text:'Near-miss confirmation timed out · request will not retry'};}
      return status();
    }
    function cancel(){
      if(!pending)return status();
      const now=current();
      if(!now.available||now.bridge!==pending.bridge||!sameSession(now.context,pending.context))return invalidate();
      if(pending.cancelRequested)return status();
      pending.cancelWanted=true;
      try{if(pending.request)pending.cancelRequested=pending.bridge.cancel(pending.request)?.requested===true;}catch{}
      // Cancellation is a request, not proof that native work was withdrawn.
      last={state:'unknown',text:'Near-miss cancellation requested · waiting for confirmation'};
      return status();
    }
    function invalidate(text='Game session changed · request outcome unconfirmed'){
      pending=null;last={state:'unconfirmed',text};
      // Request IDs remain monotonic even when a module reuses its memory.
      return status();
    }
    return Object.freeze({status,request,poll,cancel,invalidate});
  }
  return Object.freeze({create,unavailable});
});
