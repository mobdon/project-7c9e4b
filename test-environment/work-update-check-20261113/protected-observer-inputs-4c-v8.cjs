'use strict';
// Data-only protection including the successful, history-only ordering unit.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), previous = require('./protected-observer-inputs-4c-v7.cjs');
const ROOT = path.resolve(__dirname, '..'), pins = { ...previous.pins };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const condition = 'work-update-check-20261113/current-native-ordered-world-history-4c-v2/';
const manifest = 'work-update-check-20261113/native-ordered-world-history-output-4c-v2/frozen-output-manifest.json';
const expected = 'a6dfc058d52a34128f58e8bbd82dd7d95de551021278e1e08def15297814757b';
const bytes = fs.readFileSync(path.resolve(ROOT, manifest)); assert.equal(sha(bytes), expected); pins[manifest] = expected;
for (const [name, hash] of Object.entries(JSON.parse(bytes).pins)) {
  const key = condition + name; if (pins[key]) assert.equal(pins[key], hash); pins[key] = hash;
}
function verify() {
  for (const [file, hash] of Object.entries(pins)) assert.equal(sha(fs.readFileSync(path.resolve(ROOT, file))), hash, file);
  return { files: Object.keys(pins).length, productionFiles: Object.keys(pins).filter(p => p.startsWith('nfsu2-extension')).length, latestInventories: 16, unchanged: true };
}
module.exports = { pins, verify }; if (require.main === module) console.log(JSON.stringify(verify()));
