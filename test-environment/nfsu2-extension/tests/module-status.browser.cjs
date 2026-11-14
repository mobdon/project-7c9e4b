// Isolated browser fixture. Never loads the live game, saves or account.
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('https://nfsu2.xyz/**',route=>new URL(route.request().url()).pathname==='/game.json'?route.fulfill({json:{rev:'78e2bb69'}}):route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated module mismatch fixture</title><body></body>'}));
  const setup=`(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'});};window.Worker=class{postMessage(){}addEventListener(){}};globalThis.__NFSU2_AI__={install(){},getModuleProfile(){return null;},patchState:{phase:'unavailable',patchCode:'module-size',moduleBytes:38170601}};})();`;
  const scripts=['core.js','page.js'].map(n=>fs.readFileSync(path.join(__dirname,'../extension',n),'utf8')).join('\n');
  await page.addInitScript({content:setup+scripts});await page.goto('https://nfsu2.xyz/');
  await page.evaluate(()=>{const worker=new Worker('https://nfsu2.xyz/host/game-worker.js');worker.postMessage({mod:new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0])),memory:new WebAssembly.Memory({initial:256,maximum:256,shared:true}),slot:0});});
  const ui=page.locator('#nfsu2-driving-tools');await ui.waitFor();await page.keyboard.press('F8');await ui.locator('#group-driver > summary').click();
  await ui.locator('#ai-state').filter({hasText:'78e2bb69'}).waitFor();
  const layout=await ui.locator('#ai-state').evaluate(el=>({whiteSpace:getComputedStyle(el).whiteSpace,overflow:getComputedStyle(el).overflow,client:el.clientHeight,scroll:el.scrollHeight,width:el.getBoundingClientRect().width,text:el.textContent}));
  assert.equal(layout.whiteSpace,'normal');assert.equal(layout.overflow,'visible');assert.equal(layout.client,layout.scroll);assert.ok(layout.client>30);assert.match(layout.text,/38170601/);assert.match(layout.text,/update is required/);
  await page.screenshot({path:path.join(__dirname,'../integration/module-status-ai.png')});
  await ui.locator('#group-dyno > summary').click();await ui.locator('#dyno-enable').check();
  assert.equal(await ui.locator('#dyno-find').isDisabled(),true);assert.match(await ui.locator('#dyno-state').textContent(),/Dyno unavailable.*78e2bb69/);
  await page.screenshot({path:path.join(__dirname,'../integration/module-status-dyno.png')});
  assert.deepEqual(errors,[]);console.log('PASS: isolated Chromium mismatch UI wraps full AI message, explains dyno block, retains disabled buttons.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
