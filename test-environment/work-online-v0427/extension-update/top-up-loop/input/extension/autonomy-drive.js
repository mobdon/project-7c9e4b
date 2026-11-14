/* Destination travel through the existing page input publisher. Returns key
 * intentions only; no AI mailbox, native object or network writes. */
(function(root){
'use strict';
const NONE=Object.freeze([]),STOP=Object.freeze({keys:NONE,ownsInput:false,joinReady:false});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clip=(x,a,b)=>Math.max(a,Math.min(b,x));
function closest(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy,t=n?clip(((p.x-a.x)*dx+(p.y-a.y)*dy)/n,0,1):0;return{distance:dist(p,{x:a.x+t*dx,y:a.y+t*dy}),t};}
function inside(p,d){return Array.isArray(d?.box)&&d.box.length===4&&p.x>=d.box[0]&&p.y>=d.box[1]&&p.x<=d.box[2]&&p.y<=d.box[3]&&Math.abs(p.z-d.marker.z)<=4;}
function create({clock=()=>performance.now(),maximumSpeed=20}={}){
 let active=false,phase='off',reason='Off',route=null,destination=null,index=1,lastNow=null,lastTick=null,tickAt=null,stillAt=null,startAt=0,progressAt=0,lastPosition=null,joinReady=false,intent=STOP;
 const status=()=>({active,phase,reason,index,count:route?.waypoints.length||0,joinReady,intent});
 function stop(why='Stopped; manual control'){active=false;phase='stopped';reason=why;joinReady=false;intent=STOP;return status();}
 function start(plan,d,s){
  const now=clock();if(active||!plan?.ok||!Array.isArray(plan.waypoints)||!plan.waypoints.length||plan.waypoints.length>513||!d||!Array.isArray(d.box)||d.box.length!==4||!d.marker||!s?.safe||s.manual!==true||s.aiOwned===true||s.handbackPending===true||s.kind!==1||s.identity!==plan.identity||!Number.isFinite(now))return false;
  if(!d.box.every(Number.isFinite)||d.box[0]>d.box[2]||d.box[1]>d.box[3]||!Object.values(d.marker).every(Number.isFinite)||plan.waypoints.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))return false;
  route={...plan,waypoints:[{...s.position},...plan.waypoints.map(p=>({...p}))]};destination=JSON.parse(JSON.stringify(d));index=1;lastNow=now;lastTick=s.tick;tickAt=now;stillAt=null;startAt=now;progressAt=now;lastPosition={...s.position};joinReady=false;active=true;phase='following';reason='Driving to selected start';intent=STOP;return true;
 }
 function update(s){
  if(!active)return status();const now=clock();
  if(!Number.isFinite(now)||now<lastNow||now-lastNow>250)return stop('Driving observation stalled');lastNow=now;
  if(!s?.safe||s.manual!==true||s.kind!==1||s.aiOwned===true||s.handbackPending===true||s.identity!==route.identity||s.hidden||s.focused===false||s.manualInput||s.tunerBusy||s.menu||s.network&&!s.allowNetwork)return stop('Travel interrupted; manual control');
  if(typeof route.validate==='function'&&route.validate()!==true)return stop('The native road snapshot changed');
  if(![s.position?.x,s.position?.y,s.position?.z,s.heading?.x,s.heading?.y,s.speed,s.tick].every(Number.isFinite)||s.speed<0||s.speed>150||Math.hypot(s.heading.x,s.heading.y)<.5)return stop('Driving sample unavailable');
  if(s.tick!==lastTick){lastTick=s.tick;tickAt=now;}else if(now-tickAt>250)return stop('Game clock stopped');
  if(now-startAt>900000)return stop('Travel timed out');
  if(dist(s.position,lastPosition)>2){lastPosition={...s.position};progressAt=now;}else if(now-progressAt>15000&&phase==='following')return stop('Car stopped making route progress');
  if(inside(s.position,destination)){
   phase=s.speed<=.5?'settling':'braking';reason=s.speed<=.5?'Stopped at selected start; confirming arrival':'At selected start; stopping';
   if(s.speed<=.5){if(stillAt===null)stillAt=now;if(now-stillAt>=1500){phase='waiting';reason='Stopped at selected start; waiting for host';joinReady=true;}}
   else{stillAt=null;joinReady=false;}
   intent={keys:s.speed>1.2?['ArrowDown']:['Space'],ownsInput:true,joinReady,targetSpeed:0};return status();
  }
  if(phase==='waiting'||phase==='settling'||phase==='braking')return stop('Car left the selected start');
  stillAt=null;joinReady=false;
  const points=route.waypoints;let advances=0;
  while(index<points.length-1&&advances<3){const a=points[index-1],b=points[index],hit=closest(s.position,a,b);if(dist(s.position,b)<7||hit.t>.98&&hit.distance<12){index++;advances++;}else break;}
  const current=points[index],previous=points[index-1],projected=closest(s.position,previous,current);
  if(projected.distance>35||Math.abs(s.position.z-current.z)>12)return stop('Car left the planned road');
  let aim=current,remaining=dist(s.position,current),lookahead=clip(6+s.speed*.7,8,24),j=index;
  while(remaining<lookahead&&j+1<points.length){remaining+=dist(points[j],points[j+1]);aim=points[++j];}
  const dx=aim.x-s.position.x,dy=aim.y-s.position.y,angle=Math.atan2(s.heading.x*dy-s.heading.y*dx,s.heading.x*dx+s.heading.y*dy),turn=Math.abs(angle);
  let target=clip(maximumSpeed,5,25);if(turn>1.5)target=3;else if(turn>Math.PI*75/180)target=5;else if(turn>Math.PI/3)target=8;else if(turn>Math.PI/6)target=12;
  for(let k=index;k<Math.min(points.length-1,index+3);k++){const p=points[k-1],q=points[k],r=points[k+1],ax=q.x-p.x,ay=q.y-p.y,bx=r.x-q.x,by=r.y-q.y,bend=Math.abs(Math.atan2(ax*by-ay*bx,ax*bx+ay*by)),away=dist(s.position,q),corner=bend>=Math.PI*75/180?5:bend>=Math.PI/3?8:bend>=Math.PI/6?12:target;target=Math.min(target,Math.sqrt(corner*corner+2*4*Math.max(away-8,0)));}
  const toEnd=dist(s.position,destination.marker);target=Math.min(target,Math.sqrt(2*3*Math.max(toEnd-2,0)));
  const keys=[];if(angle>.08)keys.push('ArrowLeft');else if(angle<-.08)keys.push('ArrowRight');if(s.speed>target+1||turn>1.5&&s.speed>3)keys.push('ArrowDown');else if(s.speed<target-.5)keys.push('ArrowUp');
  intent={keys,ownsInput:true,joinReady:false,targetSpeed:target,turnRadians:angle};return status();
 }
 function canJoin(s,d){return active&&phase==='waiting'&&joinReady&&s?.safe&&s.manual===true&&s.kind===1&&s.identity===route.identity&&s.speed<=.5&&inside(s.position,destination)&&d?.key===destination.key&&clock()-lastNow<=250;}
 return Object.freeze({start,update,stop,status,canJoin});
}
const api=Object.freeze({create,inside,closest});if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_AUTONOMY_DRIVE__=api;
})(globalThis);
