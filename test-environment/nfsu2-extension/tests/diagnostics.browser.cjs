// Isolated Chromium fixture only. No live game, game files or user data.
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:800}}),requests=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://nfsu2.xyz/**',route=>{requests.push(route.request().url());const url=new URL(route.request().url());return url.pathname==='/game.json'?route.fulfill({json:{rev:'2f0ddd3b'}}):route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; object-src 'none'; base-uri 'none'"},body:'<!doctype html><html><head><title>Local crash logger test</title></head><body><p>Isolated diagnostic logger fixture</p></body></html>'});});
 const setup=`(() => {
 const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'});};
 window.fixtureWorkers=[];window.Worker=class extends EventTarget{constructor(){super();fixtureWorkers.push(this);}postMessage(){}};
 const caps={legacy:true,ai:true,pace:false,corner:false,walls:false,dyno:false,dragAI:false};
 window.__NFSU2_AI__={install(){},patchState:{phase:'ready',revision:'2f0ddd3b'},getModuleProfile:()=>({revision:'2f0ddd3b',capabilities:caps}),Controller:class{stop(){}update(v){return{active:v.enabled&&v.safe,owned:v.enabled&&v.safe,ready:true,available:true};}}};
 window.fixtureBoot=()=>{const memory=new WebAssembly.Memory({initial:256,maximum:300,shared:true}),d=new DataView(memory.buffer),put=(p,v)=>d.setUint32(p,v,true);const player=0xe00000,car=0xe01000,race=0xe04000,status=0xf00000;
 put(0x8654a4,6);put(0xd00000,player);put(player+4,car);put(0x890118,race);put(race,4);put(car+0x24,1);put(car+0x28,1);d.setFloat32(car+0x440,5000,true);put(car+0x434,3);put(status,0x31545453);put(status+8,1);new Uint8Array(memory.buffer,status+16,6).set([100,114,105,118,101,0]);d.setFloat64(status+32,2,true);
 const mod=new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0])),worker=new Worker('/host/game-worker.js');worker.postMessage({mod,memory,slot:0});worker.dispatchEvent(new MessageEvent('message',{data:{t:'register',kind:5,ptr:status}}));return true;};
})();`;
 const source=['diagnostics.js','core.js','page.js'].map(f=>fs.readFileSync(path.join(root,'extension',f),'utf8')).join('\n');await page.addInitScript({content:setup+'\n'+source});
 await page.goto('https://nfsu2.xyz/');await page.evaluate(()=>fixtureBoot());
 const ui=page.locator('#nfsu2-driving-tools');await ui.locator('#min').click();await ui.locator('#group-driver > summary').click();await ui.locator('#ai').check();
 await page.waitForTimeout(350);
 await page.evaluate(()=>{
 window.dispatchEvent(new ErrorEvent('error',{message:'TypeError SECRET_PASSWORD Alice@example.com https://private.test/?token=SECRET_TOKEN',error:new TypeError('SECRET_PASSWORD')}));
 fixtureWorkers[0].dispatchEvent(new MessageEvent('message',{data:{t:'trap',tid:0,msg:'RuntimeError: memory access out of bounds SECRET_PASSWORD',stack:'RuntimeError: SECRET_PASSWORD\n at SECRET_NAME (https://private.test/game.wasm?token=SECRET_TOKEN:wasm-function[21213]:0x123abc)\n at https://nfsu2.xyz/SECRET/page.js:59:2'}}));
 });
 await ui.locator('#group-diagnostics > summary').click();await ui.getByText('Crash log',{exact:true}).click();
 const download=async()=>{const pending=page.waitForEvent('download');await ui.locator('#diagnostic-export').click();const file=await pending;assert.equal(file.suggestedFilename(),'nfsu2-driving-tools-diagnostics.json');return JSON.parse(fs.readFileSync(await file.path(),'utf8'));};
 const first=await download();const trap=first.events.find(e=>e.event==='game-trap');assert.ok(trap);assert.equal(trap.data.errorKind,'memory-bounds');assert.deepEqual(trap.data.wasmFrames,['wasm-function[21213]:0x123abc']);assert.equal(trap.data.tools.ai,true);assert.equal(trap.data.raceType,0);assert.equal(trap.data.hud,2);assert.equal(trap.data.sessionCurrent,true);assert.ok(first.events.some(e=>e.event==='page-error'));
 assert.doesNotMatch(JSON.stringify(first),/SECRET_|Alice|private\.test|https:/);assert.ok(first.events.some(e=>e.event==='state'));assert.equal(first.persistence,'same-tab');
 await page.screenshot({path:path.join(root,'logger-menu.png')});
 // Reload without a new game. The previous trap must remain exportable from the menu.
 await page.reload();await ui.locator('#min').click();await ui.locator('#group-diagnostics > summary').click();await ui.getByText('Crash log',{exact:true}).click();
 const second=await download();assert.ok(second.events.some(e=>e.event==='game-trap'));assert.equal(second.events.filter(e=>e.event==='page-start').length,2);
 await ui.locator('#diagnostic-clear').click();const cleared=await download();assert.ok(cleared.events.some(e=>e.event==='clear'));assert.equal(cleared.events.some(e=>e.event==='game-trap'),false);
 await page.evaluate(()=>{URL.createObjectURL=()=>{throw Error('SECRET_DOWNLOAD_ERROR')};});await ui.locator('#diagnostic-export').click();assert.match(await ui.locator('#note').textContent(),/download failed/);
 assert.deepEqual(errors,[]);assert.ok(requests.every(url=>new URL(url).pathname==='/'||new URL(url).pathname==='/game.json'),'no diagnostic uploads or additional requests');
 console.log(JSON.stringify({passed:true,checks:['production logger/page in isolated Chromium','tool choices and free-roam state captured','classified trap and wasm location','raw text and URLs excluded','manual JSON download','previous crash survives reload','clear removes previous history','export failure handled','no extra network requests'],firstEventCount:first.events.length,requests:requests.length,screenshot:'logger-menu.png'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
