'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { compilePinnedLocalModule } = require('../lib/local-loader.cjs');

const emptyModule = Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0]);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('explicit local loader compiles and runs a minimal module without replacing WebAssembly APIs', async () => {
  const compile = WebAssembly.compile;
  const streaming = WebAssembly.compileStreaming;
  const instantiate = WebAssembly.instantiate;
  const result = await compilePinnedLocalModule({ bytes: emptyModule, expectedSha256: hash(emptyModule) });
  assert.equal(result.globalAPIsChanged, false);
  assert.equal(result.moduleSha256, hash(emptyModule));
  assert.deepEqual(result.transforms, []);
  assert.deepEqual(WebAssembly.Module.imports(result.module), []);
  const instance = await WebAssembly.instantiate(result.module, {});
  assert.deepEqual(Object.keys(instance.exports), []);
  assert.equal(WebAssembly.compile, compile);
  assert.equal(WebAssembly.compileStreaming, streaming);
  assert.equal(WebAssembly.instantiate, instantiate);
});

test('explicit transform chain pins both its input and output', async () => {
  // A harmless custom section demonstrates the adapter contract. No game code.
  const transformed = Uint8Array.from([...emptyModule, 0, 5, 3, 108, 97, 98, 1]);
  let calls = 0;
  const result = await compilePinnedLocalModule({
    bytes: emptyModule, expectedSha256: hash(emptyModule),
    transforms: [{ name: 'Fixture metadata', inputSha256: hash(emptyModule), outputSha256: hash(transformed), apply: bytes => {
      calls++;
      assert.deepEqual(bytes, emptyModule);
      return transformed;
    } }]
  });
  assert.equal(calls, 1);
  assert.equal(result.moduleSha256, hash(transformed));
  assert.equal(result.transforms.length, 1);
  assert.equal(result.globalAPIsChanged, false);
  assert.deepEqual(WebAssembly.Module.exports(result.module), []);
});

test('changed source and unpinned transform results are rejected', async () => {
  let applied = false;
  await assert.rejects(compilePinnedLocalModule({ bytes: emptyModule, expectedSha256: '0'.repeat(64) }), /input hash mismatch/);
  await assert.rejects(compilePinnedLocalModule({
    bytes: emptyModule, expectedSha256: hash(emptyModule),
    transforms: [{ name: 'Wrong source', inputSha256: '0'.repeat(64), outputSha256: hash(emptyModule), apply: () => {
      applied = true;
      return emptyModule;
    } }]
  }), /transform input hash mismatch/);
  assert.equal(applied, false);
  await assert.rejects(compilePinnedLocalModule({
    bytes: emptyModule, expectedSha256: hash(emptyModule),
    transforms: [{ name: 'Wrong output', inputSha256: hash(emptyModule), outputSha256: '0'.repeat(64), apply: () => emptyModule }]
  }), /transform output hash mismatch/);
  await assert.rejects(compilePinnedLocalModule({ bytes: emptyModule }), /complete lowercase SHA-256/);
});

test('a transform that changes a watched API is rejected instead of reporting unchanged APIs', async () => {
  const original = WebAssembly.Module;
  try {
    await assert.rejects(compilePinnedLocalModule({
      bytes: emptyModule, expectedSha256: hash(emptyModule),
      transforms: [{ name: 'Unexpected API mutation', inputSha256: hash(emptyModule), outputSha256: hash(emptyModule), apply: bytes => {
        WebAssembly.Module = function UnusedModuleReplacement() {};
        return bytes;
      } }]
    }), /API Module changed/);
  } finally {
    WebAssembly.Module = original;
  }
  assert.equal(WebAssembly.Module, original);
});
