/* Ordered game-worker boot adaptation. The caller verifies source bytes and
 * capabilities; failures retain the original module and process configuration. */
(function(root){
  'use strict';
  function create({prepare,timeoutMs=10000,onError=()=>{},clone=root.structuredClone}={}){
    if(typeof prepare!=='function'||typeof clone!=='function')throw new Error('Worker module preparation is unavailable.');
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>10000)throw new Error('Invalid worker module preparation timeout.');
    const decisions=new WeakMap();
    let primaryGeneration=0,primaryFamily=null;
    const report=error=>{try{onError(error);}catch{}};
    function decision(originalModule){
      if(decisions.has(originalModule))return decisions.get(originalModule);
      const abort=new AbortController();let timer;
      const pending=Promise.race([
        Promise.resolve().then(()=>prepare(originalModule,{signal:abort.signal})).catch(error=>{report(error);return null;}),
        new Promise(resolve=>{timer=setTimeout(()=>{abort.abort();report(new Error('Worker module preparation timed out.'));resolve(null);},timeoutMs);})
      ]).then(value=>value?.module instanceof WebAssembly.Module&&value.profile?value:null)
        .catch(error=>{report(error);return null;})
        .finally(()=>clearTimeout(timer));
      decisions.set(originalModule,pending);return pending;
    }
    function snapshot(message,rest){
      const arg=rest[0];
      const object=value=>value!==null&&(typeof value==='object'||typeof value==='function');
      if(arg!=null&&!object(arg))throw new TypeError('Worker message options must be an object.');
      const iterator=arg?.[Symbol.iterator];
      if(iterator!=null&&typeof iterator!=='function')throw new TypeError('Worker transfer sequence is not iterable.');
      const sequence=typeof iterator==='function',transfer=sequence?arg:arg?.transfer;
      if(transfer!==undefined&&(!object(transfer)||typeof transfer[Symbol.iterator]!=='function'))throw new TypeError('Worker transfer sequence is not iterable.');
      const list=transfer===undefined?[]:Array.from(transfer);
      // Include the list itself so even transferred objects not reachable from
      // message have corresponding owned clones available for the later send.
      const copied=clone.call(root,{message,transfers:list},{transfer:list});
      const copiedRest=rest.slice();
      if(rest.length&&arg!=null)copiedRest[0]=sequence?copied.transfers:{transfer:copied.transfers};
      return {message:copied.message,rest:copiedRest,transfers:copied.transfers};
    }
    function generation(originalModule,originalMemory,slot){
      // A delayed older primary may still boot its own native worker, but it
      // cannot replace the page's newest session. Same-family secondaries can.
      if(slot===0){primaryFamily={originalModule,originalMemory};return ++primaryGeneration;}
      return primaryFamily?.originalModule===originalModule&&primaryFamily.originalMemory===originalMemory?primaryGeneration:null;
    }
    const close=entry=>{for(const transfer of entry.transfers||[])try{transfer.close?.();}catch{}};
    function attach(worker,{onForward=()=>{}}={}){
      const send=worker.postMessage,terminate=worker.terminate;
      if(typeof send!=='function')throw new Error('Worker message channel is unavailable.');
      const originalPost=Object.getOwnPropertyDescriptor(worker,'postMessage');
      const originalTerminate=Object.getOwnPropertyDescriptor(worker,'terminate');
      const queue=[];let alive=true,draining=false;
      const notify=(message,meta)=>{try{onForward(message,meta);}catch(error){report(error);}};
      const discard=()=>{for(const entry of queue)close(entry);queue.length=0;};
      async function drain(){
        if(draining)return;draining=true;
        try{
          while(alive&&queue.length){
            const entry=queue[0],prepared=entry.init?await entry.prepared:null;
            if(!alive)return;
            if(prepared)entry.message.mod=prepared.module;
            if(entry.boot&&entry.generation===primaryGeneration)notify(entry.message,{originalModule:entry.originalModule,originalMemory:entry.originalMemory,verified:!!prepared,profile:prepared?.profile||null});
            try{Reflect.apply(send,worker,[entry.message,...entry.rest]);}
            catch(error){report(error);alive=false;discard();return;}
            queue.shift();
          }
        }finally{draining=false;}
      }
      function postMessage(message,...rest){
        if(this!==worker)return Reflect.apply(send,this,[message,...rest]);
        if(!alive)return Reflect.apply(send,this,[message,...rest]);
        const boot=message?.mod instanceof WebAssembly.Module&&Number.isSafeInteger(message.slot)&&message.slot>=0;
        const init=boot&&message?.memory instanceof WebAssembly.Memory;
        // Memory-port boots remain native and unverified. Current page controls
        // require an actual shared Memory in the page, not a transferred port.
        if(!init&&!draining&&!queue.length){
          if(boot&&generation(message.mod,null,message.slot)===primaryGeneration)notify(message,{originalModule:message.mod,originalMemory:null,verified:false,profile:null});
          return Reflect.apply(send,this,[message,...rest]);
        }
        const originalModule=boot?message.mod:null,originalMemory=init?message.memory:null;
        const entry={...snapshot(message,rest),boot,init,originalModule,originalMemory};
        if(boot)entry.generation=generation(originalModule,originalMemory,message.slot);
        if(init)entry.prepared=decision(originalModule);
        queue.push(entry);void drain().catch(error=>{report(error);alive=false;discard();});
      }
      function terminateWorker(...args){
        if(this!==worker)return Reflect.apply(terminate,this,args);
        alive=false;discard();return Reflect.apply(terminate,this,args);
      }
      try{
        worker.postMessage=postMessage;
        if(typeof terminate==='function')worker.terminate=terminateWorker;
      }catch(error){
        alive=false;discard();
        try{if(originalPost)Object.defineProperty(worker,'postMessage',originalPost);else delete worker.postMessage;}catch{}
        try{if(originalTerminate)Object.defineProperty(worker,'terminate',originalTerminate);else delete worker.terminate;}catch{}
        throw error;
      }
      return {cancel(){alive=false;discard();}};
    }
    return Object.freeze({attach});
  }
  const api=Object.freeze({create});
  root.__NFSU2_WORKER_MODULE_LOADER__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
