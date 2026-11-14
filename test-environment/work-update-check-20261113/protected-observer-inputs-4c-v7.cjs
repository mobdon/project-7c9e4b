'use strict';
// Data-only preservation guard, including the diagnostic-only failed sibling.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), previous = require('./protected-observer-inputs-4c-v6.cjs');
const ROOT = path.resolve(__dirname, '..'), pins = { ...previous.pins };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const condition = 'work-update-check-20261113/current-native-combined-observer-4c-v2/';
const manifest = 'work-update-check-20261113/native-combined-observer-output-4c-v2/frozen-output-manifest.json';
const expected = '3e95aa085395a912848274529b4a7c9f36ec6aa32d4ed9ae63bf42dfc8a7da26';
const bytes = fs.readFileSync(path.resolve(ROOT, manifest)); assert.equal(sha(bytes), expected); pins[manifest] = expected;
for (const [name, hash] of Object.entries(JSON.parse(bytes).pins)) {
  const key = condition + name; if (pins[key]) assert.equal(pins[key], hash); pins[key] = hash;
}
function verify() {
  for (const [file, hash] of Object.entries(pins)) assert.equal(sha(fs.readFileSync(path.resolve(ROOT, file))), hash, file);
  return { files: Object.keys(pins).length, productionFiles: Object.keys(pins).filter(p => p.startsWith('nfsu2-extension')).length, latestInventories: 15, unchanged: true };
}
module.exports = { pins, verify }; if (require.main === module) console.log(JSON.stringify(verify()));
