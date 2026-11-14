'use strict';
// Isolated UI/controller fixture. No game, account, server or network race.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('https://nfsu2.xyz/**',r=>new URL(r.request().url()).pathname==='/game.json'?r.fulfill({json:{rev:'93af6ccb'}}):r.fulfill({contentType:'text/html',headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'},body:'<!doctype html><title>Isolated online race control test</title><body style="background:#101820"></body>'}));
  const setup=`(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'});};window.Worker=class{constructor(){this.listeners=[];}postMessage(){}addEventListener(k,f){if(k==='message')this.listeners.push(f);}emit(data){for(const f of this.listeners)f({data});}};window.__NFSU2_AI__={install(){},getModuleProfile(){return window.__NFSU2_NEXT_PROFILE__;},Controller:class{constructor(memory){this.v=new DataView(memory.buffer);}stop(){this.v.setUint32(0xd0d154,0,true);}read(o){return this.v.getUint32(0xd0d100+o,true);}update(o){this.v.setUint32(0xd0d154,o.allowNetwork===true?1:0,true);return {available:true,ready:true,active:false,owned:false};}}};})();`;
  const scripts=['next-profile.js','core.js','cars.js','page.js'].map(n=>fs.readFileSync(path.join(__dirname,'../extension',n),'utf8')).join('\n');
  await page.addInitScript({content:setup+scripts});await page.goto('https://nfsu2.xyz/');
  await page.evaluate(()=>{
   const memory=window.fixtureMemory=new WebAssembly.Memory({initial:10800,maximum:65536,shared:true}),v=window.fixtureView=new DataView(memory.buffer);const put=(a,n)=>v.setUint32(a,n,true),p=0xe00000,car=0xe01000,race=0xe04000,status=0xf00000;
   for(const [a,n]of [[0x8654a4,6],[0x850078,8],[0xd00000,p],[0xd00030,1],[p+4,car],[0x890118,race],[race,4],[0x89e7b0,1],[0xd0d100,0x3749414e],[0xd0d11c,0x3749414e],[0xd0d104,2],[status,0x31545453],[status+4,2],[status+8,1]])put(a,n);
   v.setFloat32(car+0x440,6000,true);v.setFloat64(status+32,1,true);new Uint8Array(memory.buffer,status+16,16).set(new TextEncoder().encode('drive'));
   const worker=new Worker('https://nfsu2.xyz/host/game-worker.js');worker.postMessage({mod:new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0])),memory,slot:0});worker.emit({t:'register',kind:5,ptr:status});
  });
  const ui=page.locator('#nfsu2-driving-tools');await ui.waitFor();await page.keyboard.press('F8');await ui.locator('#group-handling > summary').click();await ui.locator('#players').check();
  await ui.locator('#players-state').filter({hasText:'enable Allow network tools'}).waitFor();
  await ui.locator('#group-session > summary').click();await ui.locator('#online').check();await ui.locator('#group-handling > summary').click();
  await ui.locator('#players-state').filter({hasText:'Armed · online race cars · local contacts only'}).waitFor();
  assert.equal(await page.evaluate(()=>fixtureView.getUint32(0xd0d1c0+36,true)),4);
  await page.screenshot({path:path.join(__dirname,'../verification/online-race-ui.png')});
  await page.evaluate(()=>fixtureView.setUint32(0xd0d1c0+32,3,true));await ui.locator('#players-state').filter({hasText:'3 race-car contacts skipped locally'}).waitFor();
  await page.setViewportSize({width:320,height:480});assert.equal(await ui.locator('#tools-panel').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  await page.keyboard.press('F9');await page.waitForFunction(()=>fixtureView.getUint32(0xd0d1c0+8,true)===0);assert.equal(await ui.locator('#players').isChecked(),false);assert.equal(await ui.locator('#online').isChecked(),false);
  assert.deepEqual(errors,[]);console.log('PASS: isolated Chromium with real page and Cars controller: permission off, race arming, mode 4, local-only text, synthetic counter label, 320px layout and F9 reset. No live game or native contacts ran.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
