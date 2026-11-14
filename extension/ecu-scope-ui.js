/* Compact controls inside the existing tuner menu. No independent overlay. */
(function(root){'use strict';
const format=x=>Number.isFinite(x)?x.toFixed(1):'unavailable';
function mount(container,{getController,beforeAction=()=>{},onDiagnostic=()=>{}}={}){
 if(!container||typeof getController!=='function')throw Error('ECU recipe needs its tuner container and controller');
 const doc=container.ownerDocument,section=doc.createElement('div'),title=doc.createElement('strong'),status=doc.createElement('p'),buttons=doc.createElement('div'),controls={};
 section.dataset.ecuRecipe='1';section.style.cssText='margin-top:8px;padding-top:8px;border-top:1px solid #ffffff25';title.textContent='ECU / turbo recipe';status.textContent='Experimental · solo Skyline with level 3 ECU and turbo. Measure before applying.';status.style.cssText='font-size:11px;line-height:1.4;margin:6px 0';status.setAttribute('role','status');status.setAttribute('aria-live','polite');buttons.style.cssText='display:flex;gap:4px;flex-wrap:wrap';
 for(const[key,label]of[['preview','Measure recipe'],['apply','Apply recipe'],['undo','Undo recipe'],['stop','Stop ECU']]){const button=doc.createElement('button');button.type='button';button.textContent=label;button.dataset.ecuAction=key;if(key==='stop')button.style.cssText='border-color:#ff947a;color:#ffb19d;font-weight:700';controls[key]=button;buttons.append(button);}
 section.append(title,status,buttons);container.append(section);
 let busy=false,abort=null,owner=null,measuredOwner=null,destroyed=false,epoch=0,sessionController=getController();
 const say=text=>{if(!destroyed)status.textContent=text;};
 const emit=(action,result)=>{try{onDiagnostic('ecu-recipe-'+action,result);}catch{}};
 // Superseding owns cleanup. A late promise must never clear a newer action's
 // busy/abort/owner state or replace Stop/session-change text and diagnostics.
 function supersede(){epoch++;const stopped=new Set([owner,measuredOwner].filter(Boolean));abort?.abort();for(const c of stopped)c.stop?.();busy=false;abort=null;owner=null;measuredOwner=null;return stopped;}
 function refresh(){if(destroyed)return;const c=getController();if(c!==sessionController){supersede();sessionController=c;say('ECU session changed. Measure the current car.');}const ready=!!c?.available?.()&&!c?.busy,same=c===measuredOwner;controls.preview.disabled=busy||!ready||!!c?.sealed;controls.apply.disabled=busy||!ready||!same||!c?.recipe||!c?.enabled?.()||!!c?.sealed;controls.undo.disabled=busy||!ready||!c?.sealed;controls.stop.disabled=!busy&&!c?.enabled?.();section.hidden=!c;if(c!==measuredOwner)measuredOwner=null;}
 function current(operation){if(destroyed||operation.epoch!==epoch)return false;if(operation.controller!==getController()){refresh();return false;}return true;}
 function stop(reason='ECU stopped. A sealed result can still be undone in the same tuning session.'){
  if(destroyed)return;const stopped=supersede(),c=getController();if(!stopped.has(c))c?.stop?.();sessionController=c;say(reason);emit('stop',{undoAvailable:!!c?.sealed});refresh();
 }
 async function run(action){
  if(destroyed)return;refresh();if(busy)return;const c=getController();if(!c?.available?.()||c.busy)return;const operation={epoch:++epoch,controller:c,abort:new AbortController()};busy=true;owner=c;abort=operation.abort;refresh();
  try{
   beforeAction(action);if(!current(operation))return null;emit('start',{action});let result;
   if(action==='preview'){
    say('Capturing the selected Skyline and measuring native ECU actions…');await c.arm();if(!current(operation))return null;
    result=await c.prepareRecipe({signal:operation.abort.signal,onStep:p=>{if(current(operation))say('Measuring ECU action '+(p.actionIndex+1)+' / '+p.actions+' · '+p.clicks+' native clicks');}});
    if(!current(operation))return null;measuredOwner=c;
    say('Private dyno: '+format(result.before.peakPowerKw)+' → '+format(result.afterRebuild.peakPowerKw)+' kW ('+format(result.measuredPrivateGainPercent)+'%). Review, then Apply recipe. Driving effect unverified.');
   }else if(action==='apply'){
    if(c!==measuredOwner||!c.recipe||!c.enabled())throw Error('Measure this exact car before Apply');say('Applying the measured native actions and checking every click…');result=await c.applyRecipe();if(!current(operation))return null;
    say('Applied: '+format(result.before.peakPowerKw)+' → '+format(result.after.peakPowerKw)+' kW in the current dyno. Undo is ready. Driving effect and saved persistence unverified.');
   }else if(action==='undo'){
    say('Restoring the complete captured car and tuning visits…');result=await c.undo();if(!current(operation))return null;measuredOwner=null;say('Original car and tuning visits restored.');
   }else throw Error('Unknown ECU action');
   emit(action,result);return result;
  }catch(error){if(!current(operation))return null;c.stop();measuredOwner=null;say((error?.message||'ECU action stopped')+(c.sealed?' · Undo remains available.':''));emit('error',{action,message:error?.message,undoAvailable:!!c.sealed});return null;}
  finally{if(current(operation)){busy=false;owner=null;abort=null;refresh();}}
 }
 const handlers=Object.fromEntries(Object.keys(controls).map(key=>[key,()=>key==='stop'?stop():void run(key)]));for(const[key,button]of Object.entries(controls))button.addEventListener('click',handlers[key]);refresh();
 return{refresh,run,stop,element:section,destroy(){stop('ECU controls closed.');destroyed=true;for(const[key,button]of Object.entries(controls))button.removeEventListener('click',handlers[key]);section.remove();}};
}
const api={mount,experimental:true};root.__NFSU2_ECU_SCOPE_UI__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
