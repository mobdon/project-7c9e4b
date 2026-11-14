'use strict';

const crypto = require('node:crypto');

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function checkedHash(value, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new TypeError(`${field} must be a complete lowercase SHA-256 hash.`);
  }
  return value;
}

function copyBytes(value, label) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (value instanceof Uint8Array) return Uint8Array.from(value);
  throw new TypeError(`${label} must be a Uint8Array or ArrayBuffer.`);
}

// Explicit, local compilation. No fetch, browser interception, automatic imports,
// game entry point, network transport, or module instantiation is supplied here.
async function compilePinnedLocalModule({ bytes, expectedSha256, label = 'Local module', transforms = [] } = {}) {
  checkedHash(expectedSha256, 'expectedSha256');
  if (!Array.isArray(transforms)) throw new TypeError('transforms must be an array.');
  const apiBefore = {
    Module: WebAssembly.Module,
    Instance: WebAssembly.Instance,
    compile: WebAssembly.compile,
    compileStreaming: WebAssembly.compileStreaming,
    instantiate: WebAssembly.instantiate,
    instantiateStreaming: WebAssembly.instantiateStreaming,
    Memory: WebAssembly.Memory
  };
  const otherAPIs = [
    [globalThis, 'WebAssembly', globalThis.WebAssembly],
    [globalThis, 'Worker', globalThis.Worker],
    [globalThis, 'SharedArrayBuffer', globalThis.SharedArrayBuffer],
    [globalThis, 'MessagePort', globalThis.MessagePort],
    [Function.prototype, 'toString', Function.prototype.toString]
  ];
  for (const constructor of [globalThis.Worker, globalThis.MessagePort]) {
    if (constructor?.prototype) otherAPIs.push([constructor.prototype, 'postMessage', constructor.prototype.postMessage]);
  }
  function assertAPIIdentity(stage) {
    for (const [name, original] of Object.entries(apiBefore)) {
      if (WebAssembly[name] !== original) throw new Error(`${label}: WebAssembly API ${name} changed ${stage}.`);
    }
    for (const [owner, name, original] of otherAPIs) {
      if (owner[name] !== original) throw new Error(`${label}: API ${name} changed ${stage}.`);
    }
  }
  let current = copyBytes(bytes, label);
  const inputSha256 = hash(current);
  if (inputSha256 !== expectedSha256) throw new Error(`${label}: input hash mismatch.`);
  const applied = [];

  for (const step of transforms) {
    if (!step || typeof step.name !== 'string' || !step.name.trim() || typeof step.apply !== 'function') {
      throw new TypeError('Each transform requires a name and an explicit apply function.');
    }
    checkedHash(step.inputSha256, `${step.name}.inputSha256`);
    checkedHash(step.outputSha256, `${step.name}.outputSha256`);
    if (hash(current) !== step.inputSha256) throw new Error(`${step.name}: transform input hash mismatch.`);
    current = copyBytes(await step.apply(Uint8Array.from(current)), step.name);
    const output = hash(current);
    if (output !== step.outputSha256) throw new Error(`${step.name}: transform output hash mismatch.`);
    assertAPIIdentity(`during transform ${step.name}`);
    applied.push({ name: step.name, inputSha256: step.inputSha256, outputSha256: output });
  }

  assertAPIIdentity('before compilation');
  const module = await WebAssembly.compile(current);
  assertAPIIdentity('during compilation');
  return {
    module,
    inputSha256,
    moduleSha256: hash(current),
    byteLength: current.byteLength,
    transforms: applied,
    globalAPIsChanged: false
  };
}

module.exports = { compilePinnedLocalModule };
