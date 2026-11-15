'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Reuse the existing complete UI fixture, suppressing its unrelated tests.
const coreFile = require.resolve('./core.test.cjs');
const baseRequire = createRequire(coreFile);
let source = fs.readFileSync(coreFile, 'utf8');
const marker = '  context.window=context;context.top=context;';
assert.equal(source.split(marker).length - 1, 1);
source = source.replace(marker, `
  const startupEvents=[];
  context.__NFSU2_DIAGNOSTICS__={create:()=>({
    record(event,data){startupEvents.push({event,data});},snapshot(){},trace(){},
    status(){return {events:startupEvents.length,traceSamples:0,persistence:'memory'};}
  })};
  if(compatibility.failInstall)context.__NFSU2_AI__.install=()=>{
    aiLog.installed++;throw compatibility.failInstall;
  };
  if(compatibility.prohibitedAssignment){
    context.WebAssembly=Object.create(Object.getPrototypeOf(WebAssembly),
      Object.getOwnPropertyDescriptors(WebAssembly));
    Object.defineProperty(context.WebAssembly,'compileStreaming',{writable:false});
    context.__NFSU2_AI__.install=()=>{
      'use strict';
      aiLog.installed++;context.WebAssembly.compileStreaming=()=>{};
    };
  }
  ${marker}`);
const returnMarker = '  return {...f,nodes,worker,status,physics,wheels,gameModule,';
assert.equal(source.split(returnMarker).length - 1, 1);
source = source.replace(returnMarker,
  '  return {...f,nodes,worker,status,physics,wheels,gameModule,startupEvents,compileStreaming:context.WebAssembly.compileStreaming,');
const context = {
  require: Object.assign(name => name === 'node:test' ? { test() {} } : baseRequire(name),
    { resolve: baseRequire.resolve }),
  console, Buffer, WebAssembly, URL, setImmediate,
};
vm.runInNewContext(source + '\nthis.makeStartupFixture=pageFixture;', context, { filename: coreFile });

async function checkContainedFailure(compatibility) {
  const originalCompileStreaming = WebAssembly.compileStreaming;
  // A synthetic verified profile deliberately remains available. The page must
  // still refuse control after failed startup instead of trusting this profile.
  const f = await context.makeStartupFixture(null, true, true, compatibility);
  assert.equal(f.aiLog.installed, 1);
  assert.match(f.html(), /id="tools-panel"/);
  f.click('min');
  assert.equal(f.nodes['tools-panel'].hidden, false);
  assert.equal(f.nodes.nos, undefined);
  assert.equal(f.nodes['nos-state'], undefined);
  assert.equal(f.prefs().nos, undefined);
  const before = Buffer.from(f.memory.buffer);
  for (const id of ['ai', 'unlimit', 'boost', 'grip', 'drag', 'dyno-enable']) f.change(id, true);
  f.run(6);
  assert.equal(f.aiLog.updates.at(-1).safe, false);
  assert.deepEqual(Buffer.from(f.memory.buffer), before);
  assert.equal(f.aiLog.keyEvents.length, 0);
  assert.match(f.nodes['ai-state'].textContent, /AI unavailable.*Native loader could not initialize/);
  assert.match(f.nodes['dyno-state'].textContent, /Native loader could not initialize/);
  assert.equal(f.nodes['ai-state'].dataset.unavailable, 'true');
  assert.equal(f.nodes['dyno-find'].disabled, true);
  assert.equal(f.nodes['dyno-apply'].disabled, true);
  assert.doesNotMatch(f.nodes['ai-state'].textContent, /SECRET/);
  assert.equal(f.startupEvents.filter(x => x.event === 'page-error').length, 1);
  assert.equal(f.compileStreaming, originalCompileStreaming);
  assert.equal(WebAssembly.compileStreaming, originalCompileStreaming);
  f.press('F9');
  assert.equal(f.nodes.ai.checked, false);
  assert.equal(f.nodes.unlimit.checked, false);
  assert.equal(f.nodes.nos, undefined);
  return f;
}

test('a throwing native loader leaves the menu usable and tools disabled', async () => {
  await checkContainedFailure({ failInstall: new TypeError('SECRET startup failure') });
});

test('a prohibited compileStreaming assignment is contained without changing the API', async () => {
  await checkContainedFailure({ prohibitedAssignment: true });
});

test('ordinary successful startup retains the supported control path', async () => {
  const f = await context.makeStartupFixture(null, true);
  f.change('ai', true);
  f.run(2);
  assert.equal(f.aiLog.installed, 1);
  assert.equal(f.aiLog.updates.at(-1).safe, true);
  assert.equal(f.nodes['ai-state'].dataset.unavailable, 'false');
  assert.equal(f.startupEvents.filter(x => x.event === 'page-error').length, 0);
});
