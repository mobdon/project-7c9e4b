// Separate0.42.8 source verification; historical verification outputs stay frozen.
'use strict';
// Exact captured client checks against the actual manifest and page. Browser/DOM,
// storage and worker delivery are controlled local fixture boundaries. No game
// instance, real Worker, network request or report sender is created.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const ROOT = path.resolve(__dirname, '../../..');
const OUT = __dirname;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hostPath = path.join(ROOT, 'work-functions-20261112/host-review/main.js');
const hostBytes = fs.readFileSync(hostPath), hostSource = hostBytes.toString('utf8');
assert.equal(sha(hostBytes), '64700139309ee9d4f46a3f93d5b47c8f5d1b25434726d07e2f47923fdeef3510');
const helperStart = hostSource.indexOf('var lO=`');
const guardStart = hostSource.indexOf('var GK=1,WK=2');
const guardEnd = hostSource.indexOf('function vO(', guardStart);
assert(helperStart > 0 && guardStart > helperStart && guardEnd > guardStart);
const helperSource = hostSource.slice(helperStart, guardStart);
const guardSource = hostSource.slice(guardStart, guardEnd);
const settingsMatch = hostSource.match(/sS=(\[[^\]]+\])/);
assert(settingsMatch);
const settingsKeys = JSON.parse(settingsMatch[1]);
const makeGuard = new Function('globalThis', 'B', 'US', 'console', helperSource + guardSource + `
  gO(globalThis);
  globalThis.__nfsu2=bO({phase:()=> 'fixture-idle',lastExit:()=>null,
    fps:()=>({game:0,page:0,source:'fixture'}),displayHz:()=>60});
  return {
    read:()=>wO(globalThis), predicate:yO, helperFlags:()=>({publicHelper:pO(),moduleHelper:fO()}),
    categories:{memoryConstructor:GK,wrappedBrowserAPI:WK,knownGlobal:zK,
      knownSettings:KK,publicHelper:qK,moduleHelper:VK},knownGlobals:jK.slice()
  };
`);

function freezeExtension(relative) {
  const directory = path.join(ROOT, relative);
  const manifestBytes = fs.readFileSync(path.join(directory, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  const sources = new Map(manifest.content_scripts[0].js.map(name => [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
  return {directory, manifest, manifestHash: sha(manifestBytes), sources,
    fileHashes: Object.fromEntries([...sources].map(([name, source]) => [name, sha(source)]))};
}
const updated = freezeExtension('nfsu2-extension/extension');
const baseline = freezeExtension('work-online-v0427/input/extension');
const metadataBytes = fs.readFileSync(path.join(ROOT, 'work-online-v0426/public-metadata.json'));
const metadata = JSON.parse(metadataBytes).data;
const rawBytes = fs.readFileSync(path.join(ROOT, 'work-functions-20261112/game-60946132.wasm'));
assert.equal(sha(rawBytes), '81d2e32d7ee67bb93a8fafee4dbc17570f8d4980be238d7434e15c791904b945');
assert.equal(metadata.rev, '60946132');
assert.equal(metadata.size, rawBytes.length);
const freeze = {
  at: new Date().toISOString(), host: {path: path.relative(ROOT, hostPath), sha256: sha(hostBytes),
    helpers: {startUTF16: helperStart, endUTF16: guardStart, sha256: sha(helperSource)},
    guard: {startUTF16: guardStart, endUTF16: guardEnd, sha256: sha(guardSource)}, settingsKeys},
  updated: {directory: path.relative(ROOT, updated.directory), version: updated.manifest.version,
    manifestSha256: updated.manifestHash, scripts: updated.fileHashes},
  baseline: {directory: path.relative(ROOT, baseline.directory), version: baseline.manifest.version,
    manifestSha256: baseline.manifestHash, scripts: baseline.fileHashes},
  rawModule: {bytes: rawBytes.length, sha256: sha(rawBytes)}, metadataSha256: sha(metadataBytes)
};
fs.writeFileSync(path.join(OUT, 'source-freeze.json'), JSON.stringify(freeze, null, 2) + '\n');

const coreFile = path.join(ROOT, 'nfsu2-extension/tests/core.test.cjs');
const baseRequire = createRequire(coreFile);
const fixtureFile = path.join(OUT, 'core-test-fixture.cjs');
let fixtureSource = fs.readFileSync(fixtureFile, 'utf8');
function replaceOnce(from, to) {
  assert.equal(fixtureSource.split(from).length, 2, 'DOM fixture seam: ' + from.slice(0, 90));
  fixtureSource = fixtureSource.replace(from, to);
}
replaceOnce('  const context={navigator:', '  let context={navigator:');
replaceOnce('  class El {', '  let doc;\n  class El {');
replaceOnce('this.handlers={};this.style={};', 'this.handlers={};this.style={};this.ownerDocument=doc;');
replaceOnce('  const doc={body:new El()', '  doc={body:new El()');
replaceOnce('  context.window=context;context.top=context;', `
  context=compatibility.bootstrap(context,{sessions,profileStorage});
  context.window=context;context.top=context;`);
replaceOnce("  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/page.js'),'utf8'),context);",
  '  compatibility.runPage(context);');
replaceOnce("  const worker=new context.Worker('https://nfsu2.xyz/host/game-worker.js');",
  "  compatibility.afterStartup(context);const worker=new context.Worker('https://nfsu2.xyz/host/game-worker.js');compatibility.afterWorker(context,worker);");
replaceOnce('  const gameModule=new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0]));',
  '  const gameModule=compatibility.originalModule;');
replaceOnce("  worker.postMessage({mod:gameModule,memory:f.memory,slot:0});worker.emit({t:'register',kind:5,ptr:status});", `
  const bootMessage={mod:gameModule,memory:f.memory,slot:0,cfg:{env:{NFSU2_PAGE_MARKS:String(compatibility.marks()),FIXTURE_INERT_VALUE:'unchanged'},pool:3}};
  worker.postMessage(bootMessage);
  await compatibility.afterBoot(context,worker,bootMessage);
  worker.emit({t:'register',kind:5,ptr:status});`);
replaceOnce('  return {...f,nodes,worker,status,physics,wheels,gameModule,',
  '  return {...f,nodes,worker,status,physics,wheels,gameModule,hostContext:context,');
const fixtureContext = {
  require: Object.assign(name => name === 'node:test' ? {test(){}} : name === '../extension/core.js' ? require(path.join(ROOT, 'work-online-v0427/input/extension/core.js')) : baseRequire(name), {resolve: baseRequire.resolve}),
  console, Buffer, WebAssembly, URL, Blob, setImmediate
};
vm.runInNewContext(fixtureSource + '\nthis.makeActualPageFixture=pageFixture;', fixtureContext, {filename: coreFile});

function browserStandIns() {
  const sent = [], workers = [];
  // Function#toString is never replaced. Native bound functions/proxies are
  // explicitly synthetic browser stand-ins, not claims about browser identity.
  const nativePost = new Proxy(Array.prototype.push.bind([]), {apply(_target, receiver, args) {
    const entry = {message: args[0], rest: args.slice(1)};
    receiver.sent.push(entry);sent.push(entry);return undefined;
  }});
  const nativeTerminate = new Proxy(Array.prototype.pop.bind([]), {apply(_target, receiver) {receiver.terminated = true;}});
  const prototype = {
    postMessage: nativePost, terminate: nativeTerminate,
    addEventListener(type, callback) {(this.handlers[type] ??= []).push(callback);},
    removeEventListener(type, callback) {this.handlers[type] = (this.handlers[type] || []).filter(fn => fn !== callback);},
    emit(data) {const event = {data, stopped: false, stopImmediatePropagation(){this.stopped = true;}};
      for (const callback of this.handlers.message || []) {callback(event);if (event.stopped) break;}}
  };
  const Worker = new Proxy(Array.bind(null), {
    get(target, key, receiver) {return key === 'prototype' ? prototype : Reflect.get(target, key, receiver);},
    construct(_target, args) {
      const worker = Object.assign(Object.create(prototype), {url: String(args[0]), handlers: {}, sent: []});
      workers.push(worker);return worker;
    }
  });
  const portPrototype = {postMessage: new Proxy(Array.prototype.push.bind([]), {apply(){}})};
  const MessagePort = new Proxy(Array.bind(null), {get(target, key, receiver) {
    return key === 'prototype' ? portPrototype : Reflect.get(target, key, receiver);
  }});
  return {Worker, MessagePort, sent, workers, prototype};
}
function storage(map) {
  return {getItem: key => map.get(String(key)) ?? null,
    setItem: (key, value) => map.set(String(key), String(value)), removeItem: key => map.delete(String(key))};
}
const hostAPIs = Object.fromEntries(['Memory', 'Module', 'Instance', 'instantiate', 'instantiateStreaming', 'compile', 'compileStreaming']
  .map(key => [key, WebAssembly[key]]));
const flush = () => new Promise(resolve => setImmediate(resolve));
function observation(state, context, worker) {
  const predicate = state.guard.predicate;
  const selected = {
    'WebAssembly.Memory': context.WebAssembly.Memory,
    'WebAssembly.Module': context.WebAssembly.Module, 'WebAssembly.Instance': context.WebAssembly.Instance,
    'WebAssembly.instantiate': context.WebAssembly.instantiate,
    'WebAssembly.instantiateStreaming': context.WebAssembly.instantiateStreaming,
    'WebAssembly.compileStreaming': context.WebAssembly.compileStreaming,
    Worker: context.Worker, 'Worker.prototype.postMessage': context.Worker?.prototype?.postMessage,
    SharedArrayBuffer: context.SharedArrayBuffer,
    'MessagePort.prototype.postMessage': context.MessagePort?.prototype?.postMessage
  };
  const marks = state.guard.read();
  return {
    marks, categories: Object.entries(state.guard.categories).filter(([, bit]) => marks & bit).map(([name]) => name),
    selectedAPI: Object.fromEntries(Object.entries(selected).map(([name, value]) => [name, {
      exists: typeof value !== 'undefined', type: typeof value, predicatePasses: predicate(value)
    }])),
    memoryPrototypeIsHostFunctionPrototype: Object.getPrototypeOf(context.WebAssembly.Memory) === Function.prototype,
    compileStreamingIdentityUnchanged: context.WebAssembly.compileStreaming === hostAPIs.compileStreaming,
    compileIdentityUnchanged: context.WebAssembly.compile === hostAPIs.compile,
    workerConstructorIdentityUnchanged: context.Worker === state.browser.Worker,
    instancePostMessage: worker ? {predicatePasses: predicate(worker.postMessage),
      ownProperty: Object.hasOwn(worker, 'postMessage'), checkedByCapturedGuard: false} : null,
    helperFlags: state.guard.helperFlags(),
    knownGlobals: state.guard.knownGlobals.filter(name => context[name] !== undefined),
    knownSettings: settingsKeys.filter(key => context.localStorage.getItem(key) !== null),
    extensionGlobalNames: Object.getOwnPropertyNames(context).filter(name => /^__NFSU2_|^__nfsu2DrivingTools$/.test(name)).sort(),
    patchPhase: context.__NFSU2_AI__?.patchState?.phase ?? 'absent'
  };
}

async function runCase(label, extension, originalModule) {
  const state = {label, stages: [], browser: browserStandIns(), fetches: [], logs: []};
  let context;
  const capture = (name, worker) => state.stages.push({name, ...observation(state, context, worker)});
  const compatibility = {
    originalModule,
    bootstrap(seed, stores) {
      // Discard only pre-evaluation DOM-fixture placeholders. Actual extension
      // globals are subsequently created and observed without removal.
      context = Object.fromEntries(Object.entries(seed).filter(([name]) => !name.startsWith('__NFSU2_')));
      context.window = context.top = context;
      context.WebAssembly = Object.create(Object.getPrototypeOf(WebAssembly), Object.getOwnPropertyDescriptors(WebAssembly));
      context.Worker = state.browser.Worker;context.MessagePort = state.browser.MessagePort;
      context.SharedArrayBuffer = SharedArrayBuffer;
      context.crypto = crypto.webcrypto;context.TextEncoder = TextEncoder;context.TextDecoder = TextDecoder;
      context.atob = atob;context.AbortController = AbortController;context.structuredClone = structuredClone;
      context.localStorage = storage(stores.profileStorage);context.sessionStorage = storage(stores.sessions);
      context.fetch = async (url, options) => {
        state.fetches.push({url: String(url), cache: options?.cache, credentials: options?.credentials});
        if (url === '/game.json') return {ok: true, json: async () => ({...metadata})};
        if (String(url).startsWith('/game.wasm')) return {ok: true,
          arrayBuffer: async () => rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength)};
        throw Error('Fixture denied nonlocal resource ' + url);
      };
      context.console = {log(){},error(){},warn(value){state.logs.push(String(value));}};
      state.guard = makeGuard(context, {get: key => context.localStorage.getItem(key)}, settingsKeys, context.console);
      capture('clean-browser-baseline');
      assert.equal(state.stages.at(-1).marks, 0, 'Clean baseline must be free of realm/stand-in artifacts');
      for (const [name, source] of extension.sources) if (name !== 'page.js')
        vm.runInNewContext(source, context, {filename: path.join(extension.directory, name), timeout: 3000});
      capture('all-manifest-scripts-before-page');
      return context;
    },
    runPage(context) {
      vm.runInNewContext(extension.sources.get('page.js'), context, {filename: path.join(extension.directory, 'page.js'), timeout: 3000});
    },
    afterStartup(_context) {capture('actual-page-startup');},
    afterWorker(_context, worker) {capture('actual-game-worker-created', worker);},
    marks: () => state.guard.read(),
    async afterBoot(_context, worker, originalMessage) {
      for (let attempts = 0; attempts < 500 && worker.sent.length === 0; attempts++)
        await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(worker.sent.length, 1, 'Actual worker postMessage eventually forwards once: ' +
        JSON.stringify({fetches: state.fetches, patchState: context.__NFSU2_AI__?.patchState}));
      const forwarded = worker.sent[0].message;
      assert.deepEqual(JSON.parse(JSON.stringify(forwarded.cfg)), JSON.parse(JSON.stringify(originalMessage.cfg)), 'Actual cfg.env including page report marker preserved');
      state.boot = {
        cfgBefore: originalMessage.cfg, cfgAfter: forwarded.cfg,
        originalModuleWasReplaced: forwarded.mod !== originalMessage.mod,
        compiledProfileRevision: context.__NFSU2_AI__?.getModuleProfile?.(forwarded.mod)?.revision ?? null,
        compiledProfileHash: context.__NFSU2_AI__?.getModuleProfile?.(forwarded.mod)?.hash ?? null,
        nativeSyntheticNearMiss: context.__NFSU2_AI__?.getModuleProfile?.(forwarded.mod)?.capabilities.nativeSyntheticNearMiss===true,
        patchState: JSON.parse(JSON.stringify(context.__NFSU2_AI__?.patchState || {})),
        cfgPreserved: true, reportMarkerPreserved: forwarded.cfg.env.NFSU2_PAGE_MARKS === originalMessage.cfg.env.NFSU2_PAGE_MARKS
      };
      capture('actual-boot-forwarded', worker);
    }
  };
  const f = await fixtureContext.makeActualPageFixture(null, false, false, compatibility);
  f.run(4);
  capture('four-page-ticks', f.worker);
  state.localStorageKeys = [...f.profileStorage.keys()];state.sessionStorageKeys = [...f.sessions.keys()];
  assert.deepEqual(Object.keys(hostAPIs).filter(key => WebAssembly[key] !== hostAPIs[key]), [], 'Host native APIs are unchanged');
  return {label, version: extension.manifest.version, manifestSha256: extension.manifestHash,
    stages: state.stages, boot: state.boot, fetches: state.fetches,
    storage: {local: state.localStorageKeys, session: state.sessionStorageKeys}, hostHelperWarnings: state.logs.length};
}

function calibrations() {
  const results = [];
  for (const name of ['known-global', 'known-setting', 'public-helper-getter', 'module-helper-getter', 'passive-helper-read']) {
    const browser = browserStandIns(), entries = new Map();
    const context = {WebAssembly, Worker: browser.Worker, MessagePort: browser.MessagePort,
      SharedArrayBuffer, localStorage: storage(entries)};
    const logs = [], guard = makeGuard(context, {get: key => context.localStorage.getItem(key)}, settingsKeys, {warn: value => logs.push(String(value))});
    assert.equal(guard.read(), 0);
    if (name === 'known-global') context.__nosCheat = true;
    if (name === 'known-setting') entries.set(settingsKeys[0], '{}');
    if (name === 'public-helper-getter') void context.__nfsu2.session;
    if (name === 'module-helper-getter') void context.Module;
    if (name === 'passive-helper-read') {void context.__nfsu2.phase;void context.__nfsu2.fps;context.__nfsu2.displayHz();}
    const expected = {'known-global': 4, 'known-setting': 8, 'public-helper-getter': 16, 'module-helper-getter': 32, 'passive-helper-read': 0}[name];
    assert.equal(guard.read(), expected);
    results.push({name, marks: guard.read(), helperFlags: guard.helperFlags(), warnings: logs.length,
      scope: 'Independent synthetic positive control using exact captured getter/predicate source; not extension behavior'});
  }
  return results;
}

async function main() {
  // Actual original module is compiled locally only, never instantiated.
  const originalModule = await WebAssembly.compile(rawBytes);
  const cases = [await runCase('updated-all-manifest-actual-page', updated, originalModule),
    await runCase('baseline0426-all-manifest-actual-page', baseline, originalModule)];
  const controls = calibrations();
  assert.equal(cases[0].boot.nativeSyntheticNearMiss,true,'Updated complete worker module must contain the verified synthetic award adapter');
  assert.equal(cases[1].boot.nativeSyntheticNearMiss,false,'Historical baseline retains its original capabilities');
  for (const extension of [updated, baseline]) {
    assert.equal(sha(fs.readFileSync(path.join(extension.directory, 'manifest.json'))), extension.manifestHash, 'Manifest changed during frozen check');
    for (const [name, expected] of Object.entries(extension.fileHashes))
      assert.equal(sha(fs.readFileSync(path.join(extension.directory, name))), expected, 'Source changed during frozen check: ' + name);
  }
  const receipt = {
    at: new Date().toISOString(), sourceFreeze: 'source-freeze.json', sourceFreezeSha256: sha(fs.readFileSync(path.join(OUT, 'source-freeze.json'))),
    runtime: process.version, fullGameInstantiated: false, realWorkerCreated: false, networkUsed: false,
    reportTransportAvailable: false, originalModuleCompileOnly: true, settingsKeys,
    harnessSourceSha256: sha(fs.readFileSync(__filename)),
    domFixtureSourceSha256: sha(fs.readFileSync(fixtureFile)), adaptedDOMFixtureSha256: sha(fixtureSource),
    exactCapturedSource: freeze.host, cases, controls,
    limitations: [
      'Controlled Node DOM/browser stand-ins are not an actual Chrome session or an account record.',
      'Worker and MessagePort constructors/prototype methods are explicitly native-callable proxy stand-ins. Function.prototype.toString and API toString methods are not overridden.',
      'The captured guard runs in the host Function realm so native Memory prototype comparison does not create a VM realm false positive.',
      'Known settings use the exact captured key list and default predicate; its B.get provider is a synthetic localStorage adapter.',
      'Actual captured helper getters set their own observational flags. No report markers are removed or rewritten.',
      'The current original WASM and actual transformed module are compiled and forwarded only. No game module instance or original sender exists.',
      'Tools remain at startup defaults. Four page ticks use synthetic16MiB fixture memory without an original game data image; this does not exercise active driving, user tool actions or JOIN.',
      'The synthetic memory would not satisfy the original full module memory import minimum if instantiated. The Worker stand-in only records forwarded arguments.',
      'Captured predicate observations do not establish server acceptance, an account sanction or multiplayer safety.'
    ]
  };
  fs.writeFileSync(path.join(OUT, 'updated-host-check-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({version: updated.manifest.version, scripts: updated.sources.size,
    cases: cases.map(item => ({label: item.label, stages: item.stages.map(stage => ({name: stage.name, marks: stage.marks, categories: stage.categories})), boot: item.boot})), controls}, null, 2));
}
if (require.main === module) main().catch(error => {console.error(error);process.exitCode = 1;});
