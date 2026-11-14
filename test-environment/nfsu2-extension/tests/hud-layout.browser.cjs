'use strict';
// Offline browser proof using an isolated temporary profile and authored DOM only.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const executable=process.env.CHROMIUM_EXECUTABLE_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nfsu2-hud-layout-'));
const source=fs.readFileSync(path.join(__dirname,'../extension/hud-layout.js'),'utf8');
const Stream=require('../extension/stream-hud.js');
const script=`
(async()=>{let checks=0;const check=(ok,message)=>{if(!ok)throw Error(message);checks++;};
 const host=document.querySelector('.stream-hud'),widget=document.querySelector('[data-hud-widget]'),data=new Map([['driving-profiles','preserve']]);
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const layout=__NFSU2_HUD_LAYOUT__.create(document,{storage,key:'browser-hud-layout'});
 const button=action=>widget.querySelector('[data-hud-layout-action="'+action+'"]');
 const inside=()=>{const r=widget.getBoundingClientRect(),b=host.getBoundingClientRect();return r.left>=b.left-.01&&r.top>=b.top-.01&&r.right<=b.right+.01&&r.bottom<=b.bottom+.01;};
 check(getComputedStyle(widget.querySelector('[data-hud-layout-controls]')).display==='none','editing controls must be hidden');
 check(getComputedStyle(widget).pointerEvents==='none'&&getComputedStyle(host).pointerEvents==='none','initial click through');
 layout.setEditing(true);check(getComputedStyle(widget.querySelector('[data-hud-layout-controls]')).display==='flex','editing controls visible');
 check(getComputedStyle(host).pointerEvents==='none','editing cannot block the whole screen');
 const move=(type,x,y)=>button('move').dispatchEvent(new PointerEvent(type,{pointerId:7,isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true}));
 move('pointerdown',100,100);move('pointermove',200,150);move('pointerup',200,150);
 let rect=widget.getBoundingClientRect();check(Math.abs(rect.left-120)<.1&&Math.abs(rect.top-70)<.1,'drag uses physical CSS pixels');
 for(let i=0;i<12;i++)button('larger').click();check(layout.positions().driver.scale===1.6,'upper scale bound');
 move('pointerdown',0,0);move('pointermove',9000,9000);move('pointerup',9000,9000);check(inside(),'drag stays inside viewport');
 host.style.width='160px';host.style.height='100px';window.dispatchEvent(new Event('resize'));
 await new Promise(resolve=>setTimeout(resolve,50));check(inside(),'small viewport clamps the entire scaled widget');
 layout.setEditing(false);check(getComputedStyle(widget.querySelector('[data-hud-layout-controls]')).display==='none'&&getComputedStyle(widget).pointerEvents==='none','edit off restores click through');
 const before=JSON.stringify(layout.positions());button('larger').click();check(JSON.stringify(layout.positions())===before,'hidden controls do not change layout');
 layout.reset();check(!data.has('browser-hud-layout')&&data.get('driving-profiles')==='preserve','reset removes only layout storage');
 layout.dispose();check(widget.querySelector('[data-hud-layout-controls]')===null,'dispose removes controls');host.remove();
 const actual=document.getElementById('actual'),actualHud=actual.querySelector('.stream-hud');actualHud.hidden=false;
 const actualLayout=__NFSU2_HUD_LAYOUT__.create(actual,{storage,key:'actual-hud-layout'});actualLayout.setEditing(true);
 const widgets=[...actual.querySelectorAll('[data-hud-widget]')];check(widgets.length===7,'actual streaming HUD has seven editable widgets');
 for(const item of widgets){
   item.querySelector('[data-hud-layout-action="larger"]').click();
   const handle=item.querySelector('[data-hud-layout-action="move"]'),pointer=(type,x,y)=>handle.dispatchEvent(new PointerEvent(type,{pointerId:9,isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true}));
   pointer('pointerdown',0,0);pointer('pointermove',9000,9000);pointer('pointerup',9000,9000);
   const r=item.getBoundingClientRect(),b=actualHud.getBoundingClientRect();check(r.left>=b.left-.01&&r.top>=b.top-.01&&r.right<=b.right+.01&&r.bottom<=b.bottom+.01,'actual '+item.dataset.hudWidget+' widget bounds');
 }
 actualLayout.dispose();
 document.getElementById('result').textContent=JSON.stringify({ok:true,checks,engine:navigator.userAgent});
})().catch(error=>document.getElementById('result').textContent=JSON.stringify({ok:false,error:String(error),stack:error.stack}));
`;
const html='<!doctype html><meta charset="utf-8"><style>body{margin:0}.stream-hud{position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none}.tile{position:absolute;left:20px;top:20px;width:220px;height:100px;padding:8px;box-sizing:content-box;background:#123;color:white}'+Stream.styles+'</style><div class="stream-hud"><div class="tile" data-hud-widget="driver">Driver</div></div><div id="actual">'+Stream.markup()+'</div><pre id="result">pending</pre><script>'+source+'</script><script>'+script+'</script>';
try{
 const file=path.join(temporary,'fixture.html');fs.writeFileSync(file,html);
 const run=spawnSync(executable,['--headless=new','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--user-data-dir='+path.join(temporary,'profile'),'--window-size=640,480','--virtual-time-budget=1000','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:30000,maxBuffer:2e6,windowsHide:true});
 if(run.error)throw run.error;assert.equal(run.status,0,run.stderr);
 const raw=/<pre id="result">([^<]+)<\/pre>/.exec(run.stdout)?.[1];assert.ok(raw,'Browser result missing');const report=JSON.parse(raw.replace(/&amp;/g,'&').replace(/&gt;/g,'>').replace(/&lt;/g,'<'));assert.equal(report.ok,true,JSON.stringify(report));assert.equal(report.checks,20);console.log(JSON.stringify(report));
}finally{
 const resolved=path.resolve(temporary),parent=path.resolve(os.tmpdir());
 if(path.dirname(resolved)===parent&&path.basename(resolved).startsWith('nfsu2-hud-layout-'))try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}
}
