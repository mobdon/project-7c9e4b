(function(root){'use strict';
// Presentation and diagnostic freshness only; never controls the car.
const VALUES={Incoming:'incomingTarget',RequestedCap:'requestedCap',EffectiveCap:'effectiveCap',Result:'resultTarget'};
const COUNTS={ReceiptSequence:'sequence',CapSequence:'capSequence',Request:'request',OwnerSequence:'ownerSequence',CaptureTick:'captureTick',SetterTick:'setterTick',CapAgeTicks:'ageTicks',PrimaryReason:'primaryReason',CachedReason:'cachedReason',Outcome:'outcome',Car:'car',Driver:'driver',Race:'race',Route:'route'};
const fields=Object.freeze(['nativeTargetStatus','nativeTargetFresh','nativeTargetProof','nativeTargetCommandStable','nativeTargetReceiptAgeMs','nativeTargetSetterAgeTicks',...Object.keys(VALUES).map(n=>'nativeTarget'+n),...Object.keys(COUNTS).map(n=>'nativeTarget'+n)]);
function create({decode,clock=()=>performance.now()}={}){
 if(typeof decode!=='function')throw TypeError('Receipt decoder required');
 let last=null,afterTick=null,afterSequence=null;
 // A Stop/settings boundary invalidates even queued receipts with the same
 // pointers. No-argument reset is reserved for a newly bound game session.
 function reset(tick,sequence){last=null;afterTick=Number.isInteger(tick)?tick>>>0:null;afterSequence=afterTick!==null&&Number.isInteger(sequence)&&sequence!==0&&(sequence&1)===0?sequence>>>0:null;}
 function afterBoundary(sample){return (afterTick===null||(Number.isInteger(sample.setterTick)&&((sample.setterTick-afterTick)|0)>0))&&(afterSequence===null||(Number.isInteger(sample.ownerSequence)&&((sample.ownerSequence-afterSequence)|0)>0));}
 function receive(receipt){const sample=decode(receipt),at=clock();if(!sample||!Number.isFinite(at)||!afterBoundary(sample))return false;last={sample,at};return true;}
 function snapshot(current={}){
  const out=Object.fromEntries(fields.map(n=>[n,undefined]));out.nativeTargetFresh=false;out.nativeTargetStatus='waiting';
  if(!current.available){reset(current.tick,current.ownerSequence);out.nativeTargetStatus='unavailable';return out;}
  if(!current.safe||!current.owned){reset(current.tick,current.ownerSequence);out.nativeTargetStatus='suspended';return out;}
  if(!Number.isInteger(current.ownerSequence)||!current.ownerSequence||(current.ownerSequence&1)){reset(current.tick,current.ownerSequence);out.nativeTargetStatus='suspended';return out;}
  if(!last)return out;
  const {sample:r,at}=last,now=clock(),age=now-at;
  if(!afterBoundary(r)||!Number.isInteger(r.ownerSequence)||!r.ownerSequence||(r.ownerSequence&1)){out.nativeTargetStatus='invalid';return out;}
  if(!Number.isFinite(age)||age<0||age>750){out.nativeTargetStatus='stale';return out;}
  if(!r.car||!r.driver||!r.race||!r.route||r.car!==current.car||r.driver!==current.driver||r.race!==current.race||r.route!==current.route){last=null;afterTick=Number.isInteger(current.tick)?current.tick>>>0:afterTick;out.nativeTargetStatus='owner-changed';return out;}
  if(!Number.isInteger(current.tick)||(r.available&2)===0){out.nativeTargetStatus='invalid';return out;}
  const ticks=(current.tick-r.setterTick)>>>0;
  if(ticks>4000){out.nativeTargetStatus='stale';return out;}
  out.nativeTargetStatus='observed';out.nativeTargetFresh=true;out.nativeTargetReceiptAgeMs=age;out.nativeTargetSetterAgeTicks=ticks;
  out.nativeTargetProof=r.proof===1;out.nativeTargetCommandStable=r.commandStable===1;
  for(const[name,key]of Object.entries(VALUES))if(Number.isFinite(r[key]))out['nativeTarget'+name]=r[key];
  for(const[name,key]of Object.entries(COUNTS))if(Number.isInteger(r[key]))out['nativeTarget'+name]=r[key];
  return out;
 }
 function text(s){
  const waiting={unavailable:'Native target feedback unavailable on this build',waiting:'Native target feedback · waiting for a road target',suspended:'Native target feedback · paused',stale:'Native target feedback · waiting for a fresh receipt','owner-changed':'Native target feedback · waiting for the current route',invalid:'Native target feedback · incomplete receipt'};
  if(s.nativeTargetStatus!=='observed')return waiting[s.nativeTargetStatus]||waiting.waiting;
  const n=x=>Number.isFinite(x)?x.toFixed(2):'—',outcomes={1:'geometry limit applied',2:'cached geometry limit applied',3:'native target already lower',4:'guard rejected or unresolved',5:'publication changed'};
  return `Target ${n(s.nativeTargetIncoming)} → ${n(s.nativeTargetResult)} · ${outcomes[s.nativeTargetOutcome]||'unresolved'} · native units`;
 }
 return Object.freeze({receive,snapshot,reset,text});
}
const api=Object.freeze({create,fields,VALUES,COUNTS});root.__NFSU2_TARGET_FEEDBACK_STATE__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
