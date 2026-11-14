'use strict';
// Authored offline HUD only. Headless Chrome has an isolated temporary profile;
// no game page, game assets, external URLs or user's browser session are opened.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..'),VERIFY=path.join(ROOT,'verification'),OUT=path.resolve(ROOT,process.argv[2]||'verification'),CHROME=process.env.CHROMIUM_EXECUTABLE_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
assert(OUT===VERIFY||OUT.startsWith(VERIFY+path.sep),'HUD proof output must stay in candidate verification');
assert(!fs.existsSync(path.join(OUT,'hud-labels-browser-v0388.json')),'Preserve the existing HUD proof; choose a fresh verification output directory');
const INPUTS=['extension/race-catalog.js','extension/stream-hud.js','extension/hud-layout.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),sourceHashes=Object.fromEntries(INPUTS.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));
const Catalog=require('../extension/race-catalog.js'),Stream=require('../extension/stream-hud.js');
const CASES=[{key:'circuit4014',trackId:4014,raceType:1,type:'circuit',mode:'Circuit'},{key:'sprint4101',trackId:4101,raceType:1,type:'sprint',mode:'Sprint'},{key:'url4715',trackId:4715,raceType:1,type:'url',mode:'URL race'},{key:'free4000',trackId:4000,raceType:0,type:'free-roam',mode:'Free roam'},
 {key:'reverse4163',trackId:4163,raceType:1,type:'sprint',mode:'Sprint',reverse:true},...[4201,4401,4402,4404].map(trackId=>({key:'reverse'+trackId,trackId,raceType:1,type:'drag',mode:'Drag',reverse:true}))].map(row=>({...row,name:Catalog.displayName(row.trackId,{reverse:row.reverse===true})}));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nfsu2-hud-labels-v0388-')),profile=path.join(temporary,'isolated-profile');
const script=String.raw`
window.fixtureReady=false;
const profiles=new Map([['driving-profiles','preserve-existing-profiles']]);
const storage={getItem:k=>profiles.get(k)||null,setItem:(k,v)=>profiles.set(k,v),removeItem:k=>profiles.delete(k)};
const host=document.querySelector('.stream-hud');host.hidden=false;
const layout=__NFSU2_HUD_LAYOUT__.create(document,{storage,key:'offline-hud-label-layout'});
const input=row=>{
 const meter=__NFSU2_STREAM_HUD__.createSession(),data={generation:1,supported:true,ready:true,driving:true,nativeTelemetry:true,hidden:false,focused:true,network:true,trackId:row.trackId,trackReverse:row.reverse===true,raceType:row.raceType,speedMps:64,carRpm:6500,carGear:5},context={menu:false,drag:row.type==='drag',drift:false};
 for(let at=0;at<=123000;at+=500)meter.observe({at,data:{...data,speedMps:at===0?87:64,trackId:at<2000?[4014,4101,4715,4000][at/500]:row.trackId},context},at);
 return{now:123000,sample:{at:123000,data,context},session:meter.snapshot(),stats:{observedRuns:999,peakNativeSpeed:500,byTrack:[{trackId:1}],runs:[{trackId:4014,raceType:'circuit',startedAt:0,lastObservedAt:86400000}]}};
};
window.renderFixture=row=>{window.currentCase=row;return __NFSU2_STREAM_HUD__.render(document,input(row));};
const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
window.measureFixture=()=>{
 const ids=['stream-driver','stream-context','stream-turns','stream-speed','stream-gear','stream-rpm','stream-pace','stream-driving-time'],labels=ids.map(id=>{const node=document.getElementById(id),tile=node.closest('[data-hud-widget]'),range=document.createRange();range.selectNodeContents(node);const bounds=tile.getBoundingClientRect(),glyphs=[...range.getClientRects()].filter(r=>r.width&&r.height),style=getComputedStyle(node);return{id,text:node.textContent,fontPixels:parseFloat(style.fontSize),lines:glyphs.length,rect:rect(node.getBoundingClientRect()),glyphOverflow:glyphs.some(r=>r.left<bounds.left-.5||r.right>bounds.right+.5||r.top<bounds.top-.5||r.bottom>bounds.bottom+.5),scrollOverflow:node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1};});
 const widgets=[...document.querySelectorAll('[data-hud-widget]')].filter(el=>!el.hidden).map(el=>({id:el.dataset.hudWidget,rect:rect(el.getBoundingClientRect())}));
 const outside=widgets.filter(({rect:r})=>r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5).map(x=>x.id),overlaps=[];
 for(let i=0;i<widgets.length;i++)for(let j=i+1;j<widgets.length;j++){const a=widgets[i],b=widgets[j],w=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.x,b.rect.x),h=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.y,b.rect.y);if(w>.5&&h>.5)overlaps.push({a:a.id,b:b.id,width:w,height:h});}
 return{viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},labels,widgets,outside,overlaps,pageOverflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,editing:layout.editing,pointerEvents:getComputedStyle(host).pointerEvents};
};
window.checkDragging=async row=>{
 const checks=[],check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
 document.getElementById('stream-widget-radar').hidden=false;layout.setEditing(true);
 const widgets=[...document.querySelectorAll('[data-hud-widget]')];check(widgets.length===7,'seven widget handles retained');
 for(const widget of widgets){
  widget.querySelector('[data-hud-layout-action="larger"]').click();const handle=widget.querySelector('[data-hud-layout-action="move"]'),send=(type,x,y)=>handle.dispatchEvent(new PointerEvent(type,{pointerId:9,isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true}));
  send('pointerdown',0,0);send('pointermove',9000,9000);send('pointerup',9000,9000);const r=widget.getBoundingClientRect();check(r.left>=-.5&&r.top>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,widget.dataset.hudWidget+' drag clamps to viewport');
 }
 const saved=JSON.stringify(layout.positions());window.renderFixture(row);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));check(JSON.stringify(layout.positions())===saved,'rendering human labels preserves saved positions and scales');
 layout.setEditing(false);check(widgets.every(widget=>getComputedStyle(widget).pointerEvents==='none'),'edit off preserves click through');check(widgets.every(widget=>getComputedStyle(widget.querySelector('[data-hud-layout-controls]')).display==='none'),'edit controls hidden after drag');check(profiles.get('driving-profiles')==='preserve-existing-profiles','driving-profile storage untouched');
 const positions=layout.positions();layout.reset();document.getElementById('stream-widget-radar').hidden=true;check(!profiles.has('offline-hud-label-layout')&&profiles.has('driving-profiles'),'reset removes layout key only');return{checks,positions};
};
window.fixtureReady=true;
`;
const embed=source=>source.replace(/<\/script/gi,'<\\/script');
const html='<!doctype html><html><head><meta charset="utf-8"><title>Authored HUD label proof</title><style>*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;overflow:hidden;background:radial-gradient(ellipse at 50% 35%,#152b3b,#07111d 72%);min-height:100vh}'+Stream.styles+'</style></head><body>'+Stream.markup()+INPUTS.map(file=>'<script>'+embed(fs.readFileSync(path.join(ROOT,file),'utf8'))+'</script>').join('')+'<script>'+script+'</script></body></html>';
class CDP{
 constructor(url){this.id=0;this.pending=new Map();this.events=[];this.socket=new WebSocket(url);this.ready=new Promise((resolve,reject)=>{this.socket.addEventListener('open',resolve,{once:true});this.socket.addEventListener('error',reject,{once:true});});this.socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const pending=this.pending.get(message.id);this.pending.delete(message.id);message.error?pending?.reject(Error(JSON.stringify(message.error))):pending?.resolve(message.result);}else this.events.push(message);});}
 async send(method,params={},sessionId){await this.ready;const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
 close(){this.socket.close();}
}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const file=path.join(temporary,'fixture.html');fs.writeFileSync(file,html);
 const child=spawn(CHROME,['--headless=new','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 let cdp;
 try{
  const url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Headless Chrome did not expose its isolated endpoint')),15000);child.once('error',reject);child.stderr.on('data',data=>{output+=data;const match=/DevTools listening on (ws:\/\/[^\s]+)/.exec(output);if(match){clearTimeout(timer);resolve(match[1]);}});child.once('exit',code=>{clearTimeout(timer);reject(Error('Headless Chrome exited before ready: '+code+' '+output));});});
  cdp=new CDP(url);const created=await cdp.send('Target.createTarget',{url:'about:blank'}),{sessionId}=await cdp.send('Target.attachToTarget',{targetId:created.targetId,flatten:true});
  const call=(method,params)=>cdp.send(method,params,sessionId),evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setBlockedURLs',{urls:['http://*','https://*','ws://*','wss://*']});await call('Page.navigate',{url:pathToFileURL(file).href});
  const deadline=Date.now()+10000;while(!await evaluate('window.fixtureReady===true')){if(Date.now()>deadline)throw Error('Authored HUD fixture failed to load');await new Promise(resolve=>setTimeout(resolve,20));}
  const report={schema:'nfsu2-offline-hud-label-browser-proof-v1',version:'0.38.8',passed:true,sourceHashes,sourceUnchanged:true,browser:await evaluate('navigator.userAgent'),offlineAuthoredDOM:true,isolatedTemporaryProfile:true,gameAssetsLoaded:false,liveGameTested:false,cases:[],dragChecks:[],limits:['Authored offline samples and browser layout only; no live game HUD, race completion or driving behavior verified','Screenshots use an authored plain background without game assets']};
  for(const viewport of[{width:320,height:480},{width:1280,height:800}]){
   await call('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:false});
   for(const row of CASES){
    const value=await evaluate('window.renderFixture('+JSON.stringify(row)+')');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');const measured=await evaluate('window.measureFixture()');assert.deepEqual(measured.viewport,{...viewport,devicePixelRatio:1});assert.equal(value.driver,row.mode);assert.equal(value.context,row.name);assert.equal(value.speed,'143');assert.equal(value.gear,'4');assert.equal(value.rpm,'6500');assert.equal(value.time,'2:03');assert.equal(value.pace,'194 MPH');assert(measured.labels.every(label=>!label.text.includes(String(row.trackId))));assert(measured.labels.every(label=>!label.glyphOverflow&&!label.scrollOverflow),'Text clipping '+row.key+' '+JSON.stringify(measured.labels));assert.equal(measured.outside.length,0,'HUD outside viewport '+row.key);assert.equal(measured.overlaps.length,0,'Overlapping HUD widgets '+row.key+' '+JSON.stringify(measured.overlaps));assert.equal(measured.pageOverflow,false);assert.equal(measured.pointerEvents,'none');
    const screenshot='hud-labels-v0388-'+viewport.width+'x'+viewport.height+'-'+row.key+'.png',capture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});fs.writeFileSync(path.join(OUT,screenshot),Buffer.from(capture.data,'base64'));report.cases.push({case:row.key,trackId:row.trackId,mode:row.mode,name:row.name,value,...measured,screenshot,sha256:sha(Buffer.from(capture.data,'base64'))});
   }
   report.dragChecks.push({viewport,...await evaluate('window.checkDragging('+JSON.stringify(CASES[2])+')')});
  }
  report.externalRequests=cdp.events.filter(event=>event.method==='Network.requestWillBeSent'&&/^https?:|^wss?:/.test(event.params.request.url)).map(event=>event.params.request.url);assert.equal(report.externalRequests.length,0);for(const[file,pin]of Object.entries(sourceHashes))assert.equal(sha(fs.readFileSync(path.join(ROOT,file))),pin,'Frozen HUD source '+file);
  report.hudLayoutEqualsDeliveredV0387=sourceHashes['extension/hud-layout.js']===sha(fs.readFileSync(path.join(ROOT,'../nfsu2-extension/extension/hud-layout.js')));assert(report.hudLayoutEqualsDeliveredV0387);const output=path.join(OUT,'hud-labels-browser-v0388.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,report:output,cases:report.cases.length,dragChecks:report.dragChecks.map(x=>x.checks.length),overlaps:report.cases.filter(x=>x.overlaps.length).map(x=>({case:x.case,viewport:x.viewport,overlaps:x.overlaps})),screenshots:report.cases.map(x=>x.screenshot),liveGameTested:false}));
 }finally{
  if(cdp)try{await cdp.send('Browser.close');}catch{}cdp?.close();if(child.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});
  const resolved=path.resolve(temporary),parent=path.resolve(os.tmpdir());assert(path.dirname(resolved)===parent&&path.basename(resolved).startsWith('nfsu2-hud-labels-v0388-'));try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
