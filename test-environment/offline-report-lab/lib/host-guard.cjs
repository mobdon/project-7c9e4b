'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { compilePinnedLocalModule } = require('./local-loader.cjs');

const PINS = Object.freeze({
  'extension-ai.js': 'f407444e5e723ca9c0235cf981630354554e10aff01faa05fa19042f2f0122e6',
  'extension-current-profile.js': '4249fc980c6281cd790121aef68dc25d6ff50b901a1eaeff8c77a4b1c05b836f',
  'host-guard-source.js': 'be7b473848fa48ec7ca8c20dc3ad7e35906e2226e538f251a04ef70462ec399a',
  'empty-standalone.wasm': '93a44bbb96c751218e4c00d479e4c14358122a389acca16205b1e4d0dc5f9476',
  'provenance.json': '7f1becb3854e8e3a80bd546cfe4eff9d22a5d5c05bbd838688b02e767724fefd',
});
const LIMITATIONS = Object.freeze([
  'Synthetic Node VM cases are not a browser session or account record.',
  'No game module, game memory, network connection, or report delivery is supplied.',
  'Unrelated settings and module predicates remain false in both cases.',
  'Startup cases use harmless native callable stand-ins. The direct-loader case loads only a pinned empty standalone module outside the VM.',
  'A reporter input is not proof of a server decision, account ban, or multiplayer safety.',
]);

function integrityError(file, cause) {
  const error = new Error(`Host fixture integrity check failed: ${file}`);
  error.code = 'ERR_HOST_FIXTURE_INTEGRITY';
  if (cause) error.cause = cause;
  return error;
}

async function readFixtures(fixtureDir) {
  const entries = await Promise.all(Object.entries(PINS).map(async ([name, expected]) => {
    let bytes;
    try {
      bytes = await fs.readFile(path.join(fixtureDir, name));
    } catch (cause) {
      throw integrityError(name, cause);
    }
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== expected) throw integrityError(name);
    return [name, { source: bytes.toString('utf8'), content: bytes, sha256, bytes: bytes.length }];
  }));
  const fixtures = Object.fromEntries(entries);
  const provenance = JSON.parse(fixtures['provenance.json'].source);
  if (provenance.schema !== 1 || provenance.sourceGameRevision !== '60946132' ||
      provenance.extensionVersion !== '0.42.5') {
    throw integrityError('provenance.json');
  }
  return { fixtures, provenance };
}

function evaluate(context, source, filename) {
  return new vm.Script(source, { filename }).runInContext(context, { timeout: 1000 });
}

function makeSandbox(guardSource, nativeCompilerAPIs = null) {
  const globals = Object.assign(Object.create(null), { __fixtureNativeApis: nativeCompilerAPIs });
  const context = vm.createContext(globals, {
    name: 'synthetic-host-guard',
    codeGeneration: { strings: false, wasm: false },
  });
  evaluate(context, `
    // All constructors and the predicate's Object/Function are in this VM realm.
    // Startup compiler positions use harmless native callables; the direct-loader
    // case observes actual native compiler references. No compiler is invoked in
    // this VM, no module input is supplied, and WASM code generation is off.
    const originalWasm = WebAssembly;
    globalThis.WebAssembly = {
      Memory: originalWasm.Memory,
      Module: originalWasm.Module,
      Instance: originalWasm.Instance,
      compile: __fixtureNativeApis?.compile ?? Math.max,
      compileStreaming: __fixtureNativeApis?.compileStreaming ?? Math.max,
      instantiate: __fixtureNativeApis?.instantiate ?? Math.max,
      instantiateStreaming: __fixtureNativeApis?.instantiateStreaming ?? Math.max,
    };
    globalThis.location = Object.freeze({ origin: 'https://offline.invalid' });
    for (const name of ['process', 'require', 'fetch', 'Worker', 'MessagePort',
      'WebSocket', 'XMLHttpRequest', 'navigator', 'setTimeout', 'setInterval']) {
      Object.defineProperty(globalThis, name, { value: undefined, writable: false });
    }
    const initialCompileStreaming = WebAssembly.compileStreaming;
    const US = [];
  `, 'synthetic-sandbox.js');
  evaluate(context, guardSource + `
    globalThis.__offlineGuard = Object.freeze({
      read() { return wO(globalThis, () => false, () => false, () => false); },
      wrappedCategory: WK,
    });
  `, 'host-guard-source.js');
  return context;
}

async function runDirectLoader(guardSource, emptyModuleBytes) {
  const identities = Object.freeze({
    compile: WebAssembly.compile,
    compileStreaming: WebAssembly.compileStreaming,
    instantiate: WebAssembly.instantiate,
    instantiateStreaming: WebAssembly.instantiateStreaming,
    Module: WebAssembly.Module,
    Instance: WebAssembly.Instance,
    Memory: WebAssembly.Memory,
  });
  // The guard observes real native compiler references, but never calls one
  // inside its restricted VM. Only the pinned empty module is loaded here.
  const context = makeSandbox(guardSource, identities);
  const before = readObservation(context);
  if (before.marks !== 0 || before.compilerNamespaceChanged) {
    throw new Error('Unexpected direct-loader baseline host state');
  }
  const loaded = await compilePinnedLocalModule({
    bytes: emptyModuleBytes,
    expectedSha256: PINS['empty-standalone.wasm'],
    label: 'Synthetic empty standalone architecture fixture',
    transforms: [],
  });
  const compiled = loaded.module;
  const instance = await WebAssembly.instantiate(compiled, {});
  const directCompileCompleted = compiled instanceof identities.Module;
  const directInstantiationCompleted = instance instanceof identities.Instance;
  const exportCount = WebAssembly.Module.exports(compiled).length;
  const nativeAPIIdentitiesUnchanged = Object.entries(identities)
    .every(([key, value]) => WebAssembly[key] === value);
  const after = readObservation(context);
  if (!directCompileCompleted || !directInstantiationCompleted || exportCount !== 0 ||
      loaded.globalAPIsChanged !== false ||
      !nativeAPIIdentitiesUnchanged || after.marks !== 0 ||
      after.compilerNamespaceChanged || after.moduleBytesObserved ||
      !after.externalCapabilitiesAbsent) {
    throw new Error('Unexpected direct-loader completion state');
  }
  return { directCompileCompleted, directInstantiationCompleted,
    nativeAPIIdentitiesUnchanged, exportCount, patchPhase: after.patchPhase };
}

function readObservation(context) {
  return evaluate(context, `({
    marks: __offlineGuard.read(),
    wrappedCategory: __offlineGuard.wrappedCategory,
    compilerNamespaceChanged: WebAssembly.compileStreaming !== initialCompileStreaming,
    patchPhase: globalThis.__NFSU2_AI__?.patchState.phase ?? 'absent',
    moduleBytesObserved: Number.isSafeInteger(globalThis.__NFSU2_AI__?.patchState.moduleBytes),
    externalCapabilitiesAbsent: [process, require, fetch, Worker, MessagePort,
      WebSocket, XMLHttpRequest, navigator, setTimeout, setInterval].every(x => x === undefined),
  })`, 'synthetic-observation.js');
}

/** Compare fixed synthetic API states. There are no detector controls. */
async function runHostGuardScenarios({ workspaceRoot, fixtureDir } = {}) {
  if (workspaceRoot !== undefined && typeof workspaceRoot !== 'string') {
    throw new TypeError('workspaceRoot must be a path string');
  }
  if (fixtureDir !== undefined && typeof fixtureDir !== 'string') {
    throw new TypeError('fixtureDir must be a path string');
  }
  const resolvedDir = fixtureDir === undefined
    ? path.resolve(__dirname, '../fixtures/host') : path.resolve(fixtureDir);
  // Verify every source, including provenance, before executing any fixture.
  const { fixtures, provenance } = await readFixtures(resolvedDir);
  const context = makeSandbox(fixtures['host-guard-source.js'].source);
  const baseline = readObservation(context);
  if (baseline.marks !== 0 || !baseline.externalCapabilitiesAbsent ||
      baseline.compilerNamespaceChanged || baseline.moduleBytesObserved) {
    throw new Error('Unexpected clean synthetic host state');
  }
  evaluate(context, fixtures['extension-current-profile.js'].source, 'extension-current-profile.js');
  evaluate(context, fixtures['extension-ai.js'].source, 'extension-ai.js');
  evaluate(context, '__NFSU2_AI__.install();', 'synthetic-extension-install.js');
  const installed = readObservation(context);
  if (installed.marks !== installed.wrappedCategory || !installed.compilerNamespaceChanged ||
      installed.patchPhase !== 'idle' || installed.moduleBytesObserved ||
      !installed.externalCapabilitiesAbsent) {
    throw new Error('Unexpected wrapped synthetic host state');
  }
  const direct = await runDirectLoader(fixtures['host-guard-source.js'].source,
    fixtures['empty-standalone.wasm'].content);
  const sourceFiles = Object.entries(fixtures).map(([file, value]) => ({
    file: `fixtures/host/${file}`, sha256: value.sha256, bytes: value.bytes,
  }));
  const evidence = {
    fixtureId: provenance.fixtureId,
    sourceGameRevision: provenance.sourceGameRevision,
    extensionVersion: provenance.extensionVersion,
    integrityVerified: true,
    sourceFiles,
    hostSource: provenance.hostSource,
    harness: 'Same VM realm for native constructors and exact guard; string/WASM code generation disabled. The direct-loader fixture is compiled/instantiated outside the VM through unchanged native APIs.',
  };
  const common = {
    kind: 'host-guard', captures: [], evidence,
    limitations: [...LIMITATIONS],
  };
  return {
    cases: [
      {
        ...common,
        id: 'host-clean-native-apis', label: 'Clean synthetic browser APIs',
        input: { synthetic: true, scenario: 'native-api-baseline', extensionInstalled: false },
        observed: {
          guardCategories: [], wrappedApiReported: false,
          patchPhase: baseline.patchPhase, gameBytesSupplied: false,
          gameMemorySupplied: false, moduleBytesObserved: false,
          externalCapabilitiesAbsent: true,
        },
        interpretation: 'The pinned host guard records no category for this clean synthetic API surface.',
      },
      {
        ...common,
        id: 'host-extension-wrapper-before-load', label: 'Extension wrapper before a module load',
        input: { synthetic: true, scenario: 'actual-extension-startup', extensionInstalled: true },
        observed: {
          guardCategories: ['wrapped-browser-api'], wrappedApiReported: true,
          patchPhase: installed.patchPhase, gameBytesSupplied: false,
          gameMemorySupplied: false, moduleBytesObserved: false,
          externalCapabilitiesAbsent: true,
        },
        interpretation: 'The actual pinned AI.install assignment adds the wrapped-browser-API category while module preparation remains idle.',
      },
      {
        ...common,
        id: 'host-explicit-local-loader', label: 'Explicit local loader with unchanged native APIs',
        input: {
          synthetic: true, scenario: 'empty-standalone-direct-loader',
          extensionInstalled: false, fixture: 'empty-standalone.wasm', fixtureBytes: 8,
        },
        observed: {
          guardCategoriesBefore: [], guardCategoriesAfter: [], guardCategories: [],
          wrappedApiReported: false,
          nativeAPIIdentitiesUnchanged: direct.nativeAPIIdentitiesUnchanged,
          directCompileCompleted: direct.directCompileCompleted,
          directInstantiationCompleted: direct.directInstantiationCompleted,
          standaloneExportCount: direct.exportCount,
          patchPhase: direct.patchPhase, gameBytesSupplied: false,
          gameMemorySupplied: false, moduleBytesObserved: false,
          externalCapabilitiesAbsent: true,
        },
        interpretation: 'An explicit local loader compiles and instantiates the pinned empty standalone module without replacing native APIs; the unmodified guard records no category before or after. This is an architecture demonstration, not a patched-game proof or a site fix.',
        limitations: [...LIMITATIONS,
          'Only an empty standalone module was loaded. No game hooks, edited game module, browser site, or online behavior was tested.'],
      },
    ],
    evidence: [evidence], limitations: [...LIMITATIONS],
  };
}

module.exports = { runHostGuardScenarios };
