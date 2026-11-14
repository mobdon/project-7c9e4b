'use strict';
// Local strict-CSP visual/keyboard fixture, not live gameplay verification.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'research/ui');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'";
 await page.route('https://nfsu2.xyz/**',route=>{
  const name=new URL(route.request().url()).pathname;
  if(name==='/game.json')return route.fulfill({json:{rev:'93af6ccb'}});
  if(name==='/fixture.css')return route.fulfill({contentType:'text/css',body:'body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 40% 30%,#1d3439,#0c141c 70%);font:14px system-ui;color:#8ca59d}p{padding:30px}button#underlay{position:fixed;inset:0;opacity:0;width:100vw;height:100vh}'});
  return route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:'<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/fixture.css"><title>Info HUD local fixture</title></head><body><button id="underlay">Game canvas stand-in</button><p>INFO HUD · local fixture, not live telemetry</p></body></html>'});
 });
 const setup=`(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'});};window.cspViolations=[];document.addEventListener('securitypolicyviolation',e=>window.cspViolations.push(e.effectiveDirective));})();`;
 let source=fs.readFileSync(path.join(root,'extension/page.js'),'utf8');
 // Expose only the presentation seam in the fixture. Production has no test API.
 source=source.replace('  function renderInfoHud() {',`  window.__hudFixture=(sample,choices)=>{if(timer){clearInterval(timer);timer=null;}Object.assign(prefs,choices);infoHudSample={...sample,at:performance.now()};renderInfoHud();};\n  function renderInfoHud() {`);
 await page.addInitScript({content:setup+'\n'+fs.readFileSync(path.join(root,'extension/core.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'extension/tool-profiles.js'),'utf8')+'\n'+source});
 await page.goto('https://nfsu2.xyz/');const ui=page.locator('#nfsu2-driving-tools'),hud=ui.locator('#info-hud');await hud.waitFor({state:'visible'});
 assert.equal(await hud.evaluate(el=>getComputedStyle(el).pointerEvents),'none');assert.equal(await hud.getAttribute('aria-live'),'off');assert.equal(await ui.locator('#hud-speed').textContent(),'Unavailable');
 const initial=await hud.boundingBox();assert.equal(initial.width,226);assert.ok(initial.height<190);assert.ok(initial.x>=0&&initial.x+initial.width<=1280);assert.equal(await ui.evaluate(el=>el.shadowRoot.adoptedStyleSheets.length),1);
 await page.screenshot({path:path.join(out,'hud-waiting.png')});
 // Click passes through the HUD to the game's surface.
 await page.evaluate(()=>{document.querySelector('#underlay').addEventListener('click',()=>window.underlayClicks=(window.underlayClicks||0)+1);});
 await page.mouse.click(initial.x+20,initial.y+35);assert.equal(await page.evaluate(()=>window.underlayClicks),1);
 await page.keyboard.press('F6');assert.equal(await hud.isVisible(),false);await page.keyboard.press('F6');assert.equal(await hud.isVisible(),true);
 await page.keyboard.down('F6');await page.keyboard.down('F6');await page.keyboard.up('F6');assert.equal(await hud.isVisible(),false,'held key repeat must not flicker');await page.keyboard.press('F6');
 await page.keyboard.press('F8');assert.equal(await hud.isVisible(),false);assert.equal(await ui.locator('#tools-panel').isVisible(),true);assert.equal(await ui.locator('#info-hud-enable').isChecked(),true);
 await ui.locator('#info-hud-enable').uncheck();await page.keyboard.press('Escape');assert.equal(await hud.isVisible(),false);await page.reload();await ui.waitFor();assert.equal(await hud.isVisible(),false,'same-tab HUD preference persists');await page.keyboard.press('F6');assert.equal(await hud.isVisible(),true);
 const sample={data:{supported:true,ready:true,driving:true,focused:true,hud:2,nativeTelemetry:true,speedMps:36.1,raceType:0,aiActive:true,aiOwned:true,paceConfirmed:true,paceApplied:1.5,powerStatus:'applied',powerActive:true,effectivePower:1.5},context:{roam:true,paceAvailable:true}};
 await page.evaluate(sample=>window.__hudFixture(sample,{ai:true,aiPace:true,paceFactor:1.5,boost:true,power:1.5}),sample);
 assert.equal(await ui.locator('#hud-speed').textContent(),'130');assert.equal(await ui.locator('#hud-pace').textContent(),'1.50× req · 1.50× ack');assert.equal(await ui.locator('#hud-power').textContent(),'1.5× req · 1.5× set');
 await page.screenshot({path:path.join(out,'hud-live-fixture.png')});
 // Width, overflow and menu interaction at narrow viewports.
 for(const size of [{width:320,height:480},{width:280,height:240}]){
  await page.setViewportSize(size);await page.evaluate(sample=>window.__hudFixture(sample,{}),sample);const box=await hud.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height,JSON.stringify(box));assert.equal(await hud.evaluate(el=>el.scrollWidth<=el.clientWidth),true);await page.screenshot({path:path.join(out,'hud-'+size.width+'x'+size.height+'.png')});
 }
 await page.setViewportSize({width:1280,height:800});
 await page.keyboard.press('F8');const menu=await ui.boundingBox();assert.equal(menu.width,244);assert.ok(menu.height<320);await page.screenshot({path:path.join(out,'hud-menu-toggle.png')});await page.keyboard.press('F9');assert.equal(await ui.locator('#ai').isChecked(),false);assert.equal(await ui.locator('#boost').isChecked(),false);await page.keyboard.press('Escape');assert.doesNotMatch(await ui.locator('#hud-pace').textContent(),/ack/);
 // Fullscreen DOM migration must keep the single HUD attached to the active element.
 await page.evaluate(()=>{const el=document.createElement('div');el.id='fullscreen-fixture';document.body.append(el);Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>el});document.dispatchEvent(new Event('fullscreenchange'));});
 assert.equal(await ui.evaluate(el=>el.parentElement.id),'fullscreen-fixture');assert.equal(await page.locator('#nfsu2-driving-tools').count(),1);
 assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.cspViolations),[]);
 console.log(JSON.stringify({passed:true,initial,menu,checks:['strict CSP','click-through','F6 repeat suppression','F8/Escape/F9','same-tab display preference','true/unavailable speed','requested vs acknowledged pace','requested vs set power','320x480 and 280x240 bounds','fullscreen reparent','no page errors'],screenshots:fs.readdirSync(out).filter(x=>x.startsWith('hud-'))},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
