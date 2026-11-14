'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { runHostGuardScenarios } = require('../lib/host-guard.cjs');

const fixtureDir = path.resolve(__dirname, '../fixtures/host');
const workspaceRoot = path.resolve(__dirname, '../..');
const fixtureNames = ['host-guard-source.js', 'extension-ai.js',
  'extension-current-profile.js', 'empty-standalone.wasm', 'provenance.json'];

async function hashes(paths) {
  return Promise.all(paths.map(async file => [file,
    crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')]));
}

async function temporaryFixtures(t) {
  const tmpRoot = path.resolve(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'offline-host-guard-'));
  t.after(async () => {
    const resolved = path.resolve(dir);
    assert.equal(path.dirname(resolved), tmpRoot);
    assert.ok(path.basename(resolved).startsWith('offline-host-guard-'));
    await fs.rm(resolved, { recursive: true, force: true });
  });
  await Promise.all(fixtureNames.map(name => fs.copyFile(
    path.join(fixtureDir, name), path.join(dir, name))));
  return dir;
}

test('exact pinned guard accepts the clean baseline and records the installed wrapper before module loading', async () => {
  const report = await runHostGuardScenarios({ workspaceRoot });
  assert.equal(report.cases.length, 3);
  const [clean, installed] = report.cases;
  assert.deepEqual(clean.observed.guardCategories, []);
  assert.equal(clean.observed.wrappedApiReported, false);
  assert.equal(clean.observed.patchPhase, 'absent');
  assert.deepEqual(installed.observed.guardCategories, ['wrapped-browser-api']);
  assert.equal(installed.observed.wrappedApiReported, true);
  assert.equal(installed.observed.patchPhase, 'idle');
  for (const sample of report.cases) {
    assert.equal(sample.kind, 'host-guard');
    assert.equal(sample.input.synthetic, true);
    assert.equal(sample.observed.gameBytesSupplied, false);
    assert.equal(sample.observed.gameMemorySupplied, false);
    assert.equal(sample.observed.moduleBytesObserved, false);
    assert.equal(sample.observed.externalCapabilitiesAbsent, true);
    assert.deepEqual(sample.captures, []);
    assert.equal(sample.evidence.integrityVerified, true);
    assert.equal(sample.evidence.sourceGameRevision, '60946132');
    assert.equal(sample.evidence.extensionVersion, '0.42.5');
    assert.equal(sample.evidence.sourceFiles.length, 5);
    assert.ok(sample.limitations.some(x => x.includes('account ban')));
    assert.equal(Object.hasOwn(sample.observed, 'marks'), false);
  }
});

test('explicit local loader loads the pinned empty module with native identities and guard output unchanged', async () => {
  const report = await runHostGuardScenarios({ workspaceRoot });
  const direct = report.cases.find(x => x.id === 'host-explicit-local-loader');
  assert.equal(direct.input.fixtureBytes, 8);
  assert.deepEqual(await fs.readFile(path.join(fixtureDir, 'empty-standalone.wasm')),
    Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]));
  assert.equal(direct.observed.directCompileCompleted, true);
  assert.equal(direct.observed.directInstantiationCompleted, true);
  assert.equal(direct.observed.nativeAPIIdentitiesUnchanged, true);
  assert.equal(direct.observed.standaloneExportCount, 0);
  assert.deepEqual(direct.observed.guardCategoriesBefore, []);
  assert.deepEqual(direct.observed.guardCategoriesAfter, []);
  assert.match(direct.interpretation, /not a patched-game proof/);
});

test('startup evaluation leaves host APIs and fixture files untouched', async () => {
  const originalWasm = Object.getOwnPropertyDescriptors(WebAssembly);
  const originalFunctionToString = Function.prototype.toString;
  const originalWorker = globalThis.Worker;
  const paths = fixtureNames.map(name => path.join(fixtureDir, name));
  const before = await hashes(paths);
  const first = await runHostGuardScenarios({ workspaceRoot });
  const second = await runHostGuardScenarios({ workspaceRoot });
  assert.deepEqual(first, second);
  const afterWasm = Object.getOwnPropertyDescriptors(WebAssembly);
  assert.deepEqual(Reflect.ownKeys(afterWasm), Reflect.ownKeys(originalWasm));
  for (const key of Reflect.ownKeys(originalWasm)) {
    for (const property of ['value', 'get', 'set', 'writable', 'enumerable', 'configurable']) {
      assert.equal(afterWasm[key][property], originalWasm[key][property],
        `${String(key)} descriptor ${property} changed`);
    }
  }
  assert.equal(Function.prototype.toString, originalFunctionToString);
  assert.equal(globalThis.Worker, originalWorker);
  assert.deepEqual(await hashes(paths), before);
});

test('each corrupted fixture is refused before scenarios run', async t => {
  const dir = await temporaryFixtures(t);
  for (const name of fixtureNames) {
    const file = path.join(dir, name);
    const original = await fs.readFile(file);
    await fs.appendFile(file, '\n/* changed fixture */\n');
    await assert.rejects(runHostGuardScenarios({ workspaceRoot, fixtureDir: dir }), {
      code: 'ERR_HOST_FIXTURE_INTEGRITY',
      message: `Host fixture integrity check failed: ${name}`,
    });
    await fs.writeFile(file, original);
  }
});

test('missing source is refused and altered provenance cannot authorize modified source', async t => {
  const dir = await temporaryFixtures(t);
  await fs.unlink(path.join(dir, 'extension-ai.js'));
  await assert.rejects(runHostGuardScenarios({ fixtureDir: dir }), {
    code: 'ERR_HOST_FIXTURE_INTEGRITY',
  });
  const changed = Buffer.from('globalThis.__NFSU2_AI__={install(){}};');
  await fs.writeFile(path.join(dir, 'extension-ai.js'), changed);
  const manifestPath = path.join(dir, 'provenance.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.files.find(x => x.file === 'extension-ai.js').sha256 =
    crypto.createHash('sha256').update(changed).digest('hex');
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(runHostGuardScenarios({ fixtureDir: dir }), {
    code: 'ERR_HOST_FIXTURE_INTEGRITY',
  });
});

test('a corrupted tiny module is refused before the native compiler is called', async t => {
  const dir = await temporaryFixtures(t);
  await fs.appendFile(path.join(dir, 'empty-standalone.wasm'), Buffer.from([0]));
  const originalCompile = WebAssembly.compile;
  let compilerCalls = 0;
  WebAssembly.compile = async () => { compilerCalls++; throw new Error('Compiler must not run'); };
  try {
    await assert.rejects(runHostGuardScenarios({ fixtureDir: dir }), {
      code: 'ERR_HOST_FIXTURE_INTEGRITY',
      message: 'Host fixture integrity check failed: empty-standalone.wasm',
    });
    assert.equal(compilerCalls, 0);
  } finally {
    WebAssembly.compile = originalCompile;
  }
});
