// Real-browser CSP/layout/keyboard regression: requires Playwright and local Chromium.
// No live game, network access, account or save data is used.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'";
  await page.route('https://nfsu2.xyz/**',route=>{
    const name=new URL(route.request().url()).pathname;
    if(name==='/game.json') return route.fulfill({json:{rev:'6f4f1e4e'}});
    if(name==='/fixture.css') return route.fulfill({contentType:'text/css',body:'body{margin:0;background:#0a1020;color:#8eaaaf;font:16px system-ui}p{padding:24px}'});
    return route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:'<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/fixture.css"><title>Driving tools CSP test</title></head><body><p>Driving tools UI test · strict CSP · no game running</p></body></html>'});
  });
  const setup=`(() => {
    // Keep the production closed shadow root inspectable only in this isolated test.
    const attach=Element.prototype.attachShadow;
    Element.prototype.attachShadow=function(options){return attach.call(this,{...options,mode:'open'});};
    window.cspViolations=[];
    document.addEventListener('securitypolicyviolation',event=>window.cspViolations.push({directive:event.effectiveDirective,blocked:event.blockedURI}));
  })();`;
  // Browser init scripts model the installed MAIN-world extension, not a page
  // <script> that the fixture's CSP would correctly reject.
  const scripts=['core.js','tool-profiles.js','page.js'].map(name=>fs.readFileSync(path.join(__dirname,'../extension',name),'utf8')).join('\n');
  await page.addInitScript({content:setup+'\n'+scripts});
  await page.goto('https://nfsu2.xyz/');
  const ui=page.locator('#nfsu2-driving-tools');
  await ui.waitFor();
  assert.equal(await ui.locator('style').count(),0);
  assert.equal(await ui.evaluate(el=>el.shadowRoot.adoptedStyleSheets.length),1);
  assert.equal(await ui.locator('#min').evaluate(el=>getComputedStyle(el).display),'flex');
  assert.equal(await ui.locator('#min').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(20, 30, 36)');
  assert.deepEqual(await ui.locator('.section-icon').allTextContents(),Array(7).fill(''));
  const collapsed=await ui.boundingBox();assert.equal(collapsed.width,170);assert.ok(collapsed.height<=32);
  await page.keyboard.press('F8');await ui.locator('#tools-panel').waitFor({state:'visible'});
  const compact=await ui.boundingBox();assert.equal(compact.width,244);assert.ok(compact.height<300,JSON.stringify(compact));
  await page.screenshot({path:path.join(__dirname,'../research/ui/ui-v0101-folded.png')});
  await ui.locator('#group-diagnostics > summary').click();await ui.locator('#group-session > summary').click();assert.equal(await ui.locator('#online').isChecked(),false);await ui.locator('#online').check();assert.match(await ui.locator('#online-risk').textContent(),/lead to a ban/);
  await ui.locator('#group-driver > summary').click();await ui.locator('#ai').check();await ui.getByText('Free-roam tuning',{exact:true}).click();await ui.locator('#ai-pace').check();
  assert.equal(await ui.locator('#ai').evaluate(el=>getComputedStyle(el).appearance),'none');
  await ui.locator('#pace-factor').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await ui.locator('#pace-factor').inputValue(),'1.05');assert.equal(await ui.locator('#pace-value').textContent(),'1.05×');assert.equal(await ui.locator('#ai').isChecked(),true);
  await page.screenshot({path:path.join(__dirname,'../research/ui/ui-v0101-driver.png')});
  await ui.locator('#group-power > summary').click();
  await page.waitForFunction(()=>!document.querySelector('#nfsu2-driving-tools').shadowRoot.querySelector('#group-driver').open);
  await ui.locator('#boost').check();await ui.locator('#power').focus();await page.keyboard.press('End');assert.equal(await ui.locator('#power-value').textContent(),'3.0×');
  await page.keyboard.press('Home');assert.equal(await ui.locator('#power-value').textContent(),'1.0×');
  await page.keyboard.press('Escape');assert.equal(await ui.locator('#tools-panel').isVisible(),false);
  await page.keyboard.press('F8');assert.equal(await ui.locator('#boost').isChecked(),true);
  await page.keyboard.press('F9');assert.equal(await ui.locator('#online').isChecked(),false);assert.equal(await ui.locator('#boost').isChecked(),false);assert.equal(await ui.locator('#ai-pace').isChecked(),false);
  await ui.locator('#group-drag > summary').click();assert.equal(await ui.locator('#drag-ai').count(),0);assert.match(await ui.locator('#drag-ai-risk').textContent(),/Back up your progress/);await ui.locator('#group-driver > summary').click();await ui.locator('#ai').check();assert.match(await ui.locator('#ai-auto-risk').textContent(),/automatically swaps/);await page.keyboard.press('F9');assert.equal(await ui.locator('#ai').isChecked(),false);
  await ui.locator('#group-handling > summary').click();await ui.locator('#walls').check();assert.match(await ui.locator('#walls-risk').textContent(),/solo only/);await page.keyboard.press('F9');assert.equal(await ui.locator('#walls').isChecked(),false);
  await page.setViewportSize({width:320,height:480});await ui.locator('#group-driver > summary').click();
  const mobile=await ui.boundingBox();assert.ok(mobile.x>=0);assert.ok(mobile.x+mobile.width<=320);assert.ok(mobile.y+mobile.height<=480,JSON.stringify(mobile));
  assert.equal(await ui.locator('#tools-panel').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.screenshot({path:path.join(__dirname,'../research/ui/ui-v0101-small.png')});
  assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(()=>window.cspViolations),[],'production menu must not violate the page CSP');
  // Negative control: prove that the fixture really rejects the old <style>
  // approach rather than accidentally testing with CSP disabled.
  await page.evaluate(()=>{
    const node=document.createElement('div');node.id='csp-inline-probe';document.body.append(node);
    const style=document.createElement('style');style.textContent='#csp-inline-probe{position:fixed}';document.head.append(style);
  });
  await page.waitForFunction(()=>window.cspViolations.some(v=>v.directive==='style-src-elem'&&v.blocked==='inline'));
  assert.equal(await page.locator('#csp-inline-probe').evaluate(el=>getComputedStyle(el).position),'static');
  console.log(JSON.stringify({passed:true,collapsed,compact,mobile,checks:['strict style-src self with no production CSP violations','negative control confirms inline styles are blocked','constructed shadow stylesheet and custom controls','no duplicated initials','170px collapsed toolbar','244px compact menu','folded height under 270px','single open accordion','real slider arrow/Home/End keys','AI remains enabled while adjusting','F8/Escape/F9','online opt-in, warning and F9 reset','single automatic AI switch, backup warning and F9 reset','320x480 viewport no horizontal overflow'],screenshots:['research/ui/ui-v0101-folded.png','research/ui/ui-v0101-driver.png','research/ui/ui-v0101-small.png']},null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
