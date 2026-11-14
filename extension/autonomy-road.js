/* Read-only city-road snapshot and bounded route planning. No native calls or
 * object writes. Steering and arrival remain separately observed actions. */
(function(root){
'use strict';
const Profiles=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
const LIMITS=Object.freeze({groups:1500,roads:4096,links:8192,states:8192,route:512,bytes:1048576,page:16384});
const ADDR=Object.freeze({groups:0x88a334,links:0x883db0,player:0xd00000,flow:0x8654a4,race:0x890118,type:0x89e7b0,track:0x89e7a0,tick:0x86518c});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),flat=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function reader(memory,profile){
 const buffer=memory?.buffer;if(Object.prototype.toString.call(buffer)!=='[object SharedArrayBuffer]')throw Error('shared-memory');
 const bitmap=profile?.runtime?.bitmap;if(!Number.isSafeInteger(bitmap)||bitmap+32768>buffer.byteLength)throw Error('bitmap');
 const view=new DataView(buffer),records=[],pages=new Set();let size=0,window=null;
 function span(p,n){
  if(!Number.isSafeInteger(p)||!Number.isSafeInteger(n)||p<65536||n<1||!Number.isSafeInteger(p+n)||p+n>buffer.byteLength)throw Error('span');
  if(p<0x28000000){if(p+n>0x28000000)throw Error('span');}
  else {
   const gw=profile.runtime.nativePolicy?.gwin;
   if(profile.capabilities?.nativePolicy!==true||profile.runtime.nativePolicy?.version!==1||!Number.isSafeInteger(gw)||gw+8>buffer.byteLength||p<0x50000000||p+n>0x7ffe0000)throw Error('guest-window');
   const low=view.getUint32(gw,true),high=view.getUint32(gw+4,true);if(low!==0x50000000||high!==0x7ffe0000)throw Error('guest-window');
   if(window&&(window.gw!==gw||window.low!==low||window.high!==high))throw Error('window-changed');window={gw,low,high};
  }
  for(let q=Math.floor(p/LIMITS.page);q*LIMITS.page<p+n;q++){if(!((view.getUint8(bitmap+(q>>>3))>>>(q&7))&1))throw Error('uncommitted');pages.add(q);}
 }
 function take(p,n){span(p,n);size+=n;if(size>LIMITS.bytes)throw Error('read-budget');const bytes=Uint8Array.from(new Uint8Array(buffer,p,n));records.push({p,bytes});return new DataView(bytes.buffer);}
 const u=p=>take(p,4).getUint32(0,true),s=p=>take(p,2).getInt16(0,true),f=p=>take(p,4).getFloat32(0,true);
 function finishFrom(from=0){
  if(!Number.isInteger(from)||from<0||from>records.length)throw Error('read-checkpoint');
  if(memory.buffer!==buffer)throw Error('memory-changed');
  if(window&&(view.getUint32(window.gw,true)!==window.low||view.getUint32(window.gw+4,true)!==window.high))throw Error('window-changed');
  for(const q of pages)if(!((view.getUint8(bitmap+(q>>>3))>>>(q&7))&1))throw Error('commit-changed');
  for(const item of records.slice(from)){const live=new Uint8Array(buffer,item.p,item.bytes.length);for(let i=0;i<live.length;i++)if(live[i]!==item.bytes[i])throw Error('snapshot-changed');}
  return{readBytes:size,checkedPages:pages.size,doubleRead:true,atomicSnapshot:false};
 }
 return{take,u,s,f,span,finish:()=>finishFrom(),finishFrom,mark:()=>records.length,buffer};
}
function resolveProfile(moduleHash,verified){const p=Profiles?.select?.(moduleHash);if(verified!==true||!p||p.runtime?.moduleHash!==moduleHash)throw Error('exact-profile');return p;}
function readContext(r){
 if(r.u(ADDR.flow)!==6||r.u(ADDR.type)!==0||r.u(ADDR.track)!==4000||r.u(0xd00030)!==1)throw Error('city-free-roam');
 const player=r.u(ADDR.player),pv=r.take(player,0x254),car=pv.getUint32(4,true),race=r.u(ADDR.race),rv=r.take(race,0x28),cv=r.take(car,0x450);
 if(player%4||car%4||race%4||pv.getUint32(16,true)!==0||rv.getUint32(0,true)!==4||rv.getUint32(0x24,true)!==1)throw Error('single-player-context');
 const kind=cv.getUint32(0x24,true),position={x:cv.getFloat32(0x60,true),y:cv.getFloat32(0x64,true),z:cv.getFloat32(0x68,true)},heading={x:cv.getFloat32(0x90,true),y:cv.getFloat32(0x94,true)},velocity={x:cv.getFloat32(0x70,true),y:cv.getFloat32(0x74,true),z:cv.getFloat32(0x78,true)},speed=Math.hypot(...Object.values(velocity));
 if(![...Object.values(position),...Object.values(heading),...Object.values(velocity),speed].every(Number.isFinite)||Object.values(position).some(n=>Math.abs(n)>100000)||speed>150||Math.hypot(heading.x,heading.y)<.5||Math.hypot(heading.x,heading.y)>1.5)throw Error('physical-sample');
 return{player,car,race,kind,position,heading,velocity,speed,marker:r.u(player+0x9ac),tick:r.u(ADDR.tick),identity:[player,car,race].join(':')};
}
function capture(memory,{moduleHash,verified=false}={}){
 try{
  const profile=resolveProfile(moduleHash,verified),r=reader(memory,profile),context=readContext(r),geometryFrom=r.mark(),table=r.take(ADDR.groups,LIMITS.groups*4),linkBase=r.u(ADDR.links),linkCount=r.u(ADDR.links+4);
  if(linkCount>LIMITS.links||linkBase%4)throw Error('link-count');const links=linkCount?r.take(linkBase,linkCount*32):null,groups=[],nodes=[],byPointer=new Map();
  for(let g=0;g<LIMITS.groups;g++){
   const p=table.getUint32(g*4,true);if(!p)continue;if(p%4)throw Error('road-alignment');const h=r.take(p,140),count=h.getInt16(52,true);
   const owner=h.getInt16(10,true);
   if(owner<0||owner>=LIMITS.groups||table.getUint32(owner*4,true)!==p||count<1||count>LIMITS.roads)throw Error('road-group');
   // The native road table can name a road in more than one slot. Only its
   // canonical owner contributes nodes; a duplicate must resolve to that
   // exact canonical pointer before it can be skipped.
   if(owner!==g)continue;
   if(nodes.length+count>LIMITS.roads)throw Error('road-group');
   const body=r.take(p+140,count*56),row=[];
   for(let i=0;i<count;i++){
    const at=i*56,ptr=p+140+at,flags=body.getUint32(at+12,true),point={x:body.getFloat32(at,true),y:body.getFloat32(at+4,true),z:body.getInt16(at+18,true)/8},tangent={x:body.getInt16(at+24,true)/32767,y:body.getInt16(at+26,true)/32767},ids=[body.getUint16(at+28,true),body.getUint16(at+30,true)];
    if((flags&2047)!==g||!Object.values(point).every(Number.isFinite)||Object.values(point).some(n=>Math.abs(n)>100000)||ids.some(id=>id!==65535&&id>=linkCount))throw Error('road-record');
    const node={id:nodes.length,pointer:ptr,group:g,index:i,point,tangent,links:ids};if(byPointer.has(ptr))throw Error('duplicate-road');nodes.push(node);row.push(node.id);byPointer.set(ptr,node.id);
   }
   groups[g]=row;
  }
  if(!nodes.length)throw Error('no-roads');
  const linkRows=[];for(let i=0;i<linkCount;i++){const at=i*32,flags=links.getUint32(at+12,true),off=(flags&15)===3?2:0,group=links.getInt16(at+8+off,true),index=links.getInt16(at+4+off,true),id=groups[group]?.[index];linkRows.push({flags,type:flags&15,to:id??null});}
  // The resident graph is a snapshot, checked against all bytes read above.
  const edges=nodes.map(()=>[[],[]]);
  for(const n of nodes)for(const dir of[0,1]){
   let forced=false;
   for(const id of n.links){if(id===65535)continue;const l=linkRows[id];if(l.to===null)throw Error('link-endpoint');if(((l.flags>>>18)&1)===dir){if(l.type===3)break;continue;}if([7,5,10].includes(l.type))continue;
    const nextDir=dir^((l.flags>>>23)&1),to=nodes[l.to],d=distance(n.point,to.point);if(d>250)throw Error('road-gap');edges[n.id][dir].push({id:to.id,dir:nextDir,cost:Math.max(d,.01),link:id});
    if([2,8].includes(l.type)){forced=true;break;}
   }
   if(!forced){const id=groups[n.group]?.[n.index+(dir?1:-1)];if(id!==undefined){const d=distance(n.point,nodes[id].point);if(d>.01&&d<=250)edges[n.id][dir].push({id,dir,cost:d,link:null});}}
  }
  const consistency=r.finish(),validate=()=>{try{r.finishFrom(geometryFrom);return true;}catch{return false;}};return{ok:true,moduleHash,context,nodes,edges,groups,linkBase,linkCount,consistency,validate,liveVerified:false};
 }catch(e){return{ok:false,reason:String(e.message||'road-read-failed'),liveVerified:false};}
}
function plan(graph,destination,{maximumStartDistance=100,maximumEndDistance=60}={}){
 if(!graph?.ok||!destination||![destination.x,destination.y,destination.z].every(Number.isFinite))return{ok:false,reason:'route-input'};
 const {nodes,edges,context}=graph;let start=null,end=null,ds=Infinity,de=Infinity;
 for(const n of nodes){const a=distance(n.point,context.position),b=distance(n.point,destination);if(a<ds){ds=a;start=n;}if(b<de){de=b;end=n;}}
 if(ds>maximumStartDistance||de>maximumEndDistance||Math.abs(start.point.z-context.position.z)>8||Math.abs(end.point.z-destination.z)>8)return{ok:false,reason:'destination-off-road'};
 const count=nodes.length*2,cost=new Float64Array(count).fill(Infinity),previous=new Int32Array(count).fill(-1),closed=new Uint8Array(count),heap=[];
 const push=(key,value)=>{let i=heap.length;heap.push({key,value});while(i){const p=(i-1)>>>1;if(heap[p].value<=value)break;heap[i]=heap[p];i=p;}heap[i]={key,value};};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].value<heap[j].value)j++;if(heap[j].value>=last.value)break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;};
 for(const dir of[0,1]){const t=start.tangent,alignment=(t.x*context.heading.x+t.y*context.heading.y)*(dir?1:-1),k=start.id*2+dir;cost[k]=ds+(alignment<0?40:0);push(k,cost[k]+distance(start.point,end.point));}
 let target=-1,expanded=0;
 while(heap.length){const {key}=pop();if(closed[key])continue;closed[key]=1;if(++expanded>LIMITS.states)return{ok:false,reason:'route-budget'};const id=key>>>1,dir=key&1;if(id===end.id){target=key;break;}
  for(const edge of edges[id][dir]){const k=edge.id*2+edge.dir,value=cost[key]+edge.cost;if(value<cost[k]){cost[k]=value;previous[k]=key;push(k,value+distance(nodes[edge.id].point,end.point));}}
 }
 if(target<0)return{ok:false,reason:'no-city-route'};const route=[];for(let k=target;k>=0;k=previous[k]){route.push({node:k>>>1,direction:k&1,...nodes[k>>>1].point});if(route.length>LIMITS.route)return{ok:false,reason:'route-too-long'};}route.reverse();
 const onSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy,t=n?((p.x-a.x)*dx+(p.y-a.y)*dy)/n:0;return t>=0&&t<=1&&Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<=20;};
 // Do not drive backward to a sampled road reference already behind the car,
 // or overshoot the marker merely to visit its nearest reference point.
 if(route.length>1&&onSegment(context.position,route[0],route[1]))route.shift();
 if(route.length>1&&onSegment(destination,route.at(-2),route.at(-1)))route.pop();
 route.unshift({...context.position,node:null,direction:null});
 if(flat(route.at(-1),destination)>.5)route.push({...destination,node:null,direction:null});
 return{ok:true,identity:context.identity,moduleHash:graph.moduleHash,waypoints:route,length:cost[target]+de,expanded,validate:graph.validate,liveVerified:false};
}
const api=Object.freeze({capture,plan,reader,readContext,LIMITS,ADDR,distance,flat});if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_AUTONOMY_ROAD__=api;
})(globalThis);
