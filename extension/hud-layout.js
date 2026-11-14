/* HUD presentation only. No game memory, driving commands or profile storage. */
(function(root){
  'use strict';
  const IDS=Object.freeze(['brand','driver','session','stats','road','footer','radar','pitwall']);
  const KEY='nfsu2-driving-tools-hud-layout-v1',MIN=.6,MAX=1.6;
  const PROPS=['position','left','top','right','bottom','transform','transformOrigin','pointerEvents','outline','userSelect','maxWidth','maxHeight','boxSizing','overflow'];
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const idOf=value=>{const id=String(value||'').replace(/^stream-/,'');return IDS.includes(id)?id:null;};
  function sanitize(value){
    const out={};
    if(!value||typeof value!=='object'||value.v!==1||!value.widgets||typeof value.widgets!=='object'||Array.isArray(value.widgets))return out;
    for(const id of IDS){const row=Object.hasOwn(value.widgets,id)?value.widgets[id]:null;if(row&&typeof row==='object'&&finite(row.x)&&finite(row.y)&&finite(row.scale))out[id]={x:clamp(row.x,0,1),y:clamp(row.y,0,1),scale:clamp(row.scale,MIN,MAX)};}
    return out;
  }
  function create(ui,options={}){
    if(!ui||typeof ui.querySelectorAll!=='function')throw new TypeError('HUD layout needs a DOM root.');
    const doc=ui.ownerDocument||root.document,win=doc?.defaultView||root;
    const key=typeof options.key==='string'&&options.key.length>0&&options.key.length<=128&&!/profile|prefs|settings/i.test(options.key)?options.key:KEY;
    let storage=options.storage;
    if(storage===undefined)try{storage=win.localStorage;}catch{storage=null;}
    let saved={};try{saved=sanitize(JSON.parse(storage?.getItem?.(key)||'null'));}catch{}
    let editing=false,disposed=false,drag=null;
    const entries=new Map();
    const viewport=()=>{
      const host=ui.matches?.('.stream-hud')?ui:ui.querySelector?.('.stream-hud');
      const r=host?.getBoundingClientRect?.();
      return {left:r&&finite(r.left)?r.left:0,top:r&&finite(r.top)?r.top:0,width:r?.width>0?r.width:Math.max(1,win.innerWidth||doc?.documentElement?.clientWidth||1),height:r?.height>0?r.height:Math.max(1,win.innerHeight||doc?.documentElement?.clientHeight||1)};
    };
    function persist(){try{storage?.setItem?.(key,JSON.stringify({v:1,widgets:saved}));}catch{}}
    function restore(entry){for(const p of PROPS)entry.el.style[p]=entry.original[p];}
    function geometry(entry,scale){
      // Re-measure responsive natural dimensions before applying a viewport cap.
      for(const p of ['maxWidth','maxHeight','boxSizing','overflow'])entry.el.style[p]=entry.original[p];
      const box=viewport(),rect=entry.el.getBoundingClientRect();
      let width=rect.width/(entry.scale||1)||entry.el.offsetWidth||0,height=rect.height/(entry.scale||1)||entry.el.offsetHeight||0;
      if(width*scale>box.width||height*scale>box.height){
        entry.el.style.boxSizing='border-box';
        entry.el.style.maxWidth=`${box.width/scale}px`;entry.el.style.maxHeight=`${box.height/scale}px`;
        entry.el.style.overflow='hidden';
        const capped=entry.el.getBoundingClientRect();
        width=Math.min(capped.width/(entry.scale||1)||entry.el.offsetWidth||width,box.width/scale);height=Math.min(capped.height/(entry.scale||1)||entry.el.offsetHeight||height,box.height/scale);
      }
      return {...box,width:Math.max(0,width*scale),height:Math.max(0,height*scale),travelX:Math.max(0,box.width-width*scale),travelY:Math.max(0,box.height-height*scale)};
    }
    function current(entry){
      if(saved[entry.id])return {...saved[entry.id]};
      const r=entry.el.getBoundingClientRect(),g=geometry(entry,1);
      return {x:g.travelX?clamp((r.left-g.left)/g.travelX,0,1):0,y:g.travelY?clamp((r.top-g.top)/g.travelY,0,1):0,scale:1};
    }
    function apply(entry,state){
      const s={x:clamp(state.x,0,1),y:clamp(state.y,0,1),scale:clamp(state.scale,MIN,MAX)},g=geometry(entry,s.scale),style=entry.el.style;
      style.position='absolute';style.left=`${s.x*g.travelX}px`;style.top=`${s.y*g.travelY}px`;style.right='auto';style.bottom='auto';style.transformOrigin='0 0';style.transform=`scale(${s.scale})`;
      entry.scale=s.scale;entry.size.textContent=`${Math.round(s.scale*100)}%`;
      return g;
    }
    function editEntry(entry){
      entry.bar.hidden=!editing;entry.bar.style.display=editing?'flex':'none';entry.bar.style.pointerEvents=editing?'auto':'none';
      entry.el.style.pointerEvents=editing?'auto':'none';entry.el.style.outline=editing?'1px dashed #63e4d0':entry.original.outline;entry.el.style.userSelect=editing?'none':entry.original.userSelect;
    }
    function relayout(){if(disposed)return;for(const entry of entries.values()){if(saved[entry.id])apply(entry,saved[entry.id]);editEntry(entry);}}
    function finish(){
      if(!drag)return;
      const old=drag;drag=null;
      try{old.entry.handle.releasePointerCapture?.(old.pointerId);}catch{}
      if(old.changed)persist();
    }
    function stopEvent(event){event.preventDefault?.();event.stopPropagation?.();}
    function detach(entry){
      if(drag?.entry===entry)finish();observer?.unobserve?.(entry.el);
      for(const [node,event,fn]of entry.listeners)node.removeEventListener(event,fn);
      entry.bar.remove();restore(entry);
    }
    function make(el,id){
      const original=Object.fromEntries(PROPS.map(p=>[p,el.style[p]||'']));
      const bar=doc.createElement('div');bar.setAttribute('data-hud-layout-controls','');
      Object.assign(bar.style,{position:'absolute',left:'0',top:'0',display:'flex',gap:'3px',alignItems:'center',zIndex:'3',padding:'3px',background:'#06111ff2',border:'1px solid #63e4d0',borderRadius:'3px',font:'11px/1.2 sans-serif',color:'#fff',pointerEvents:'none'});
      const button=(text,action,label)=>{const b=doc.createElement('button');b.type='button';b.textContent=text;b.setAttribute('data-hud-layout-action',action);b.setAttribute('aria-label',label);Object.assign(b.style,{font:'inherit',color:'inherit',background:'#173342',border:'1px solid #75a99e',borderRadius:'2px',padding:'3px 6px',cursor:'pointer',touchAction:'none'});bar.appendChild(b);return b;};
      const handle=button('Move','move',`Move ${id} HUD widget`);handle.style.cursor='grab';
      const smaller=button('−','smaller',`Make ${id} HUD widget smaller`),size=doc.createElement('span');size.textContent='100%';size.setAttribute('aria-live','off');bar.appendChild(size);
      const larger=button('+','larger',`Make ${id} HUD widget larger`),entry={id,el,bar,handle,size,original,listeners:[],scale:1};
      const on=(node,event,fn)=>{node.addEventListener(event,fn);entry.listeners.push([node,event,fn]);};
      on(bar,'pointerdown',event=>{if(editing)stopEvent(event);});
      on(handle,'pointerdown',event=>{
        if(!editing||disposed||event.isPrimary===false||(event.button!==undefined&&event.button!==0)||!finite(event.clientX)||!finite(event.clientY))return;
        stopEvent(event);finish();const state=current(entry),g=apply(entry,state);
        drag={entry,pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:state.x*g.travelX,top:state.y*g.travelY,state,changed:false};
        try{handle.setPointerCapture?.(event.pointerId);}catch{}
      });
      on(handle,'pointermove',event=>{
        if(!editing||!drag||drag.entry!==entry||drag.pointerId!==event.pointerId||!finite(event.clientX)||!finite(event.clientY))return;
        stopEvent(event);const g=geometry(entry,drag.state.scale),x=clamp(drag.left+event.clientX-drag.x,0,g.travelX),y=clamp(drag.top+event.clientY-drag.y,0,g.travelY);
        saved[id]={x:g.travelX?x/g.travelX:0,y:g.travelY?y/g.travelY:0,scale:drag.state.scale};drag.changed=true;apply(entry,saved[id]);
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture'])on(handle,type,event=>{if(drag?.entry===entry&&drag.pointerId===event.pointerId){stopEvent(event);finish();}});
      on(handle,'click',event=>{if(editing)stopEvent(event);});
      const scaleBy=(event,delta)=>{if(!editing||disposed)return;stopEvent(event);finish();const state=current(entry);state.scale=clamp(Math.round((state.scale+delta)*100)/100,MIN,MAX);saved[id]=state;apply(entry,state);persist();};
      on(smaller,'click',event=>scaleBy(event,-.1));on(larger,'click',event=>scaleBy(event,.1));
      el.appendChild(bar);editEntry(entry);return entry;
    }
    let observer=null;
    try{if(typeof win.ResizeObserver==='function')observer=new win.ResizeObserver(()=>relayout());}catch{}
    function attach(){
      if(disposed)return api;
      const wanted=new Map();
      for(const el of ui.querySelectorAll('[data-hud-widget]')){const id=idOf(el.getAttribute('data-hud-widget'));if(id&&!wanted.has(id))wanted.set(id,el);}
      for(const[id,entry]of entries)if(wanted.get(id)!==entry.el){detach(entry);entries.delete(id);}
      for(const[id,el]of wanted)if(!entries.has(id)){const entry=make(el,id);entries.set(id,entry);observer?.observe?.(el);}
      relayout();return api;
    }
    function setEditing(value){
      if(disposed)return false;
      finish();editing=value===true;
      for(const entry of entries.values()){if(!editing&&!saved[entry.id])restore(entry);editEntry(entry);}
      return editing;
    }
    function reset(){
      if(disposed)return;
      finish();saved={};try{storage?.removeItem?.(key);}catch{}
      for(const entry of entries.values()){restore(entry);entry.scale=1;entry.size.textContent='100%';editEntry(entry);}
    }
    function dispose(){
      if(disposed)return;
      finish();disposed=true;win.removeEventListener?.('resize',relayout);observer?.disconnect?.();
      for(const entry of entries.values())detach(entry);entries.clear();
    }
    const api=Object.freeze({attach,setEditing,reset,positions:()=>Object.fromEntries(Object.entries(saved).map(([id,s])=>[id,{...s}])),dispose,get editing(){return editing;},key});
    win.addEventListener?.('resize',relayout);attach();return api;
  }
  const api=Object.freeze({create,sanitize,ids:IDS,key:KEY,minScale:MIN,maxScale:MAX});
  root.__NFSU2_HUD_LAYOUT__=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
