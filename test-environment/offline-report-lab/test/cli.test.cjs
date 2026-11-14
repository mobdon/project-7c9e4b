'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { crc32 } = require('node:zlib');

const lab = path.resolve(__dirname, '..');
const workspace = path.dirname(lab);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const execute = args => spawnSync(process.execPath, [path.join(lab, 'lab.cjs'), ...args], {
  cwd: lab, encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024,
});

test('CLI help describes the local fixture workflow without creating output', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'report-lab-help-'));
  const target = path.join(temp, 'unused');
  try {
    const child = execute(['--help', '--out', target]);
    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stdout, /Usage: node lab\.cjs/);
    assert.match(child.stdout, /pre-encoding binary captures/);
    assert.match(child.stdout, /No live game, account or network/);
    assert.equal(fs.existsSync(target), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('CLI produces a self-contained report and exact local capture files without altering source', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'report-lab-cli-'));
  const target = path.join(temp, 'inspection');
  const protectedFiles = [
    path.join(workspace, 'nfsu2-extension/extension/manifest.json'),
    path.join(workspace, 'nfsu2-extension/extension/ai.js'),
    path.join(workspace, 'nfsu2-extension/extension/core.js'),
    path.join(workspace, 'nfsu2-extension/extension/page.js'),
    path.join(lab, 'fixtures/native/manifest.json'),
    path.join(lab, 'fixtures/host/provenance.json'),
  ].filter(file => fs.existsSync(file));
  const before = protectedFiles.map(file => [file, digest(file)]);
  try {
    const child = execute(['--out', target, '--json']);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stderr, '');
    const summary = JSON.parse(child.stdout);
    assert.equal(summary.status, 'complete');
    assert.equal(summary.outputDir, target);
    assert.equal(summary.networkAttempts, 0);
    assert.equal(summary.fullGameStarted, false);
    assert.equal(summary.simulatedInputs, true);

    const report = JSON.parse(fs.readFileSync(summary.reportPath, 'utf8'));
    const html = fs.readFileSync(summary.htmlPath, 'utf8');
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.cases.length, summary.caseCount);
    assert.equal(report.cases.length, 13);
    assert.equal(report.cases.filter(item => item.kind === 'native-fixture').length, 10);
    assert.equal(report.cases.filter(item => item.kind === 'host-guard').length, 3);
    assert.equal(new Set(report.cases.map(item => item.id)).size, report.cases.length);
    assert.equal(report.run.fullGameStarted, false);
    assert.equal(report.run.accountQueried, false);
    assert.equal(report.run.installedExtensionModified, false);
    assert.equal(report.networkIsolation.activeDuringRun, true);
    assert.deepEqual(report.networkIsolation.attempts, []);
    assert.match(report.limitations.join(' '), /before encoding|pre-encoding/);
    assert.match(report.limitations.join(' '), /not observations|not.*gameplay/i);

    let captureCount = 0;
    for (const item of report.cases) {
      assert.ok(html.includes(`id="${item.id}"`), item.id + ' appears in the viewer');
      assert.ok(item.limitations.length > 0, item.id + ' includes its limits');
      for (const capture of item.captures) {
        captureCount++;
        assert.equal(capture.stage, 'pre-encoding');
        assert.match(capture.file, /^captures\/[a-z0-9-]+-\d+\.bin$/);
        const bytes = fs.readFileSync(path.join(target, capture.file));
        assert.equal(bytes.length, capture.bytes);
        assert.equal(bytes.toString('hex'), capture.hex);
        assert.ok(bytes.some(byte => byte !== 0));
      }
    }
    assert.equal(captureCount, 2);
    assert.equal(captureCount, summary.captureCount);
    const byId = Object.fromEntries(report.cases.map(item => [item.id, item]));
    assert.equal(byId['native-clean'].observed.race.changedFrames, 0);
    assert.equal(byId['native-race-change'].observed.race.changedFrames, 1);
    assert.equal(byId['host-clean-native-apis'].observed.wrappedApiReported, false);
    assert.equal(byId['host-extension-wrapper-before-load'].observed.wrappedApiReported, true);
    const direct = byId['host-explicit-local-loader'];
    assert.equal(direct.input.fixtureBytes, 8);
    assert.equal(direct.observed.directCompileCompleted, true);
    assert.equal(direct.observed.directInstantiationCompleted, true);
    assert.equal(direct.observed.nativeAPIIdentitiesUnchanged, true);
    assert.equal(direct.observed.standaloneExportCount, 0);
    assert.equal(direct.observed.wrappedApiReported, false);
    assert.deepEqual(direct.observed.guardCategoriesBefore, []);
    assert.deepEqual(direct.observed.guardCategoriesAfter, []);
    assert.equal(direct.observed.gameBytesSupplied, false);
    assert.equal(direct.observed.gameMemorySupplied, false);
    assert.match(direct.interpretation, /not a patched-game proof/);

    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /connect-src &#39;none&#39;/);
    assert.match(html, /script-src &#39;none&#39;/);
    assert.doesNotMatch(html, /<script\b|<iframe\b|<object\b|<embed\b/i);
    assert.doesNotMatch(html, /\b(?:src|href|action)\s*=\s*["'](?:https?:|wss?:|\/\/)/i);
    const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
    assert.ok(style);
    const styleHash = crypto.createHash('sha256').update(style).digest('base64');
    assert.ok(html.includes(`style-src &#39;sha256-${styleHash}&#39;`), 'Only the authored inline style hash is permitted');

    for (const [file, expected] of before) assert.equal(digest(file), expected, file + ' remains unchanged');
    const reportBefore = digest(summary.reportPath);
    const refused = execute(['--out', target, '--json']);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /must be new or empty/);
    assert.equal(digest(summary.reportPath), reportBefore, 'Existing output is never overwritten');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('optional encoder run preserves the default scenarios and writes independently valid encoded frames', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'report-lab-cli-encode-'));
  const target = path.join(temp, 'encoded-inspection');
  try {
    const child = execute(['--encode', '--out', target, '--json']);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stderr, '');
    const summary = JSON.parse(child.stdout);
    const report = JSON.parse(fs.readFileSync(summary.reportPath, 'utf8'));
    assert.equal(summary.networkAttempts, 0);
    assert.equal(summary.fullGameStarted, false);
    assert.equal(report.run.encoderExecuted, true);
    assert.equal(report.run.accountQueried, false);
    assert.deepEqual(report.networkIsolation.attempts, []);
    assert.equal(report.cases.length, summary.caseCount);
    const byId = Object.fromEntries(report.cases.map(item => [item.id, item]));
    for (const id of ['native-clean', 'native-race-capture', 'native-freeroam-capture',
      'host-explicit-local-loader', 'encoder-race', 'encoder-freeroam',
      'encoder-short-buffer', 'encoder-exact-capacity']) assert.ok(byId[id], id);
    const captures = report.cases.flatMap(item => item.captures);
    assert.equal(captures.length, summary.captureCount);
    const encoded = captures.filter(capture => capture.stage === 'encoded');
    assert.ok(encoded.length >= 2);
    assert.equal(encoded.length, summary.encodedCaptureCount);
    assert.equal(captures.filter(capture => capture.stage === 'pre-encoding').length, 2);
    for (const capture of encoded) {
      assert.match(capture.file, /^captures\/[a-z0-9-]+-\d+\.bin$/);
      const bytes = fs.readFileSync(path.join(target, capture.file));
      assert.equal(bytes.length, capture.bytes);
      assert.equal(bytes.toString('hex'), capture.hex);
      assert.equal(bytes.toString('ascii', 0, 4), 'N2FR');
      assert.equal(bytes.readUInt16LE(6), bytes.length);
      assert.equal(bytes.readUInt32LE(bytes.length - 4), crc32(bytes.subarray(0, -4)));
    }
    const html = fs.readFileSync(summary.htmlPath, 'utf8');
    for (const item of report.cases) assert.ok(html.includes(`id="${item.id}"`));
    assert.match(html, /encoded/i);
    assert.match(html, /connect-src &#39;none&#39;/);
    assert.match(html, /script-src &#39;none&#39;/);
    assert.doesNotMatch(html, /<script\b|<iframe\b|<object\b|<embed\b/i);
    assert.doesNotMatch(html, /\b(?:src|href|action)\s*=\s*["'](?:https?:|wss?:|\/\/)/i);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
