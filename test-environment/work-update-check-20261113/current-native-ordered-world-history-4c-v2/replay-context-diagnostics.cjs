'use strict';
// Read-only evidence. This module calls no native API and authors no game memory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const GLOBALS = Object.freeze({ replay: 8802488, checksum: 8802512, eventManager: 8978648, eventPool: 8978652, extrapolatedStatePool: 8978732 });
const LENGTHS = Object.freeze({ replay: 160, checksum: 64, eventManager: 80, eventPool: 64, extrapolatedStatePool: 64 });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function create({ directory }) {
  const rawName = 'replay-context-diagnostics-raw.bin';
  const journalName = 'replay-context-diagnostics.jsonl';
  const receiptName = 'replay-context-diagnostics-receipt.json';
  for (const name of [rawName, journalName, receiptName]) assert(!fs.existsSync(path.join(directory, name)), name);
  const rawFd = fs.openSync(path.join(directory, rawName), 'wx');
  const journalFd = fs.openSync(path.join(directory, journalName), 'wx');
  let offset = 0;
  let count = 0;
  let closed = false;

  function snapshot({ f, cpu, label, context = {} }) {
    assert(!closed);
    const readable = (address, length) => Number.isSafeInteger(address) && address >= 0 && address + length <= f.memory.buffer.byteLength;
    const capture = (address, length, role) => {
      assert(readable(address, length));
      const bytes = Buffer.from(f.bytes(address, length));
      const span = { file: rawName, address, length, offset, sha256: sha(bytes), role };
      fs.writeSync(rawFd, bytes);
      offset += length;
      return span;
    };
    const row = { sequence: ++count, label, context, globals: {}, objects: {}, lowMemory: capture(0, 256, 'literal-low-memory-not-a-native-object') };
    for (const [name, address] of Object.entries(GLOBALS)) {
      const value = f.get(address);
      row.globals[name] = { address, value, raw: capture(address, 4, name + '-global') };
      const length = LENGTHS[name];
      const valid = value >= 0x10000 && !(value & 3) && readable(value, length);
      row.objects[name] = { address: value, validObjectRange: valid, raw: valid ? capture(value, length, name + '-pointed-header') : null };
    }
    const replay = row.objects.replay;
    if (replay.validObjectRange) {
      replay.fields = Object.fromEntries(Object.entries({ readMode: 0, writeMode: 4, unavailableOrExhausted: 8, mismatch: 12, stream: 140 }).map(([name, delta]) => [name, f.get(replay.address + delta)]));
      const stream = replay.fields.stream;
      const valid = stream >= 0x10000 && !(stream & 3) && readable(stream, 64);
      replay.stream = { address: stream, validObjectRange: valid, raw: valid ? capture(stream, 64, 'replay-stream-header') : null };
    }
    if (Number.isInteger(cpu) && readable(cpu, 344)) {
      const esp = f.get(cpu + 16);
      row.cpu = { address: cpu, raw: capture(cpu, 344, 'native-cpu'), esp, stack: readable(esp, 128) ? capture(esp, 128, 'native-guest-stack') : null };
    }
    fs.writeSync(journalFd, JSON.stringify(row) + '\n');
    return { sequence: row.sequence, label, globalValues: Object.fromEntries(Object.entries(row.globals).map(([name, item]) => [name, item.value])) };
  }

  function finalize() {
    assert(!closed);
    closed = true;
    fs.closeSync(rawFd);
    fs.closeSync(journalFd);
    const receipt = {
      kind: 'READ-ONLY-REPLAY-AND-EVENT-CONTEXT-DIAGNOSTICS', snapshots: count, rawBytes: offset,
      raw: { file: rawName, sha256: sha(fs.readFileSync(path.join(directory, rawName))) },
      journal: { file: journalName, sha256: sha(fs.readFileSync(path.join(directory, journalName))) },
      nativeFunctionsCalled: false, nativeMemoryAuthored: false,
      limits: ['Zero or invalid pointers are recorded as unavailable objects; low memory is captured separately and is never interpreted as a valid replay object.', 'No additional native hook is installed. Stage and caller boundaries do not expose the exact native112 return byte or internal branch execution.', 'Read-only diagnostics preserve native mismatches, events, failures and report availability. No client-report or online-clearance conclusion follows.']
    };
    fs.writeFileSync(path.join(directory, receiptName), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    return receipt;
  }
  return { snapshot, finalize };
}

module.exports = { GLOBALS, LENGTHS, create };
