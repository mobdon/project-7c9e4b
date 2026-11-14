#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { installNetworkIsolation } = require('./lib/network-isolation.cjs');
const { renderReport } = require('./lib/render-report.cjs');

function parseArgs(argv) {
  const options = { json: false, help: false, encode: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') options.json = true;
    else if (argv[i] === '--encode') options.encode = true;
    else if (argv[i] === '--help' || argv[i] === '-h') options.help = true;
    else if (argv[i] === '--out') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('--out requires a directory.');
      options.out = path.resolve(argv[++i]);
    } else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return options;
}

function checkProviderOutput(result, provider) {
  if (!result || !Array.isArray(result.cases) || result.cases.length === 0) {
    throw new Error(`${provider} returned no cases.`);
  }
  for (const item of result.cases) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(item.id || '')) throw new Error(`${provider} returned an invalid case ID.`);
    if (!['native-fixture', 'host-guard'].includes(item.kind)) throw new Error(`Invalid case kind for ${item.id}.`);
    if (!item.label || !item.input || !item.observed) throw new Error(`Incomplete case ${item.id}.`);
    for (const capture of item.captures || []) {
      if (!Number.isSafeInteger(capture.bytes) || capture.bytes < 0 || capture.bytes > 1024 * 1024) {
        throw new Error(`Invalid capture size for ${item.id}.`);
      }
      if (typeof capture.hex !== 'string' || !/^(?:[0-9a-fA-F]{2})*$/.test(capture.hex) || capture.hex.length !== capture.bytes * 2) {
        throw new Error(`Invalid capture bytes for ${item.id}.`);
      }
    }
  }
}

async function run(options) {
  const generatedAt = new Date().toISOString();
  const id = generatedAt.replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  const outputDir = options.out || path.join(__dirname, 'runs', id);
  if (fs.existsSync(outputDir) && (!fs.statSync(outputDir).isDirectory() || fs.readdirSync(outputDir).length)) {
    throw new Error(`Output directory must be new or empty: ${outputDir}`);
  }

  const isolation = installNetworkIsolation();
  try {
    // Loading providers after installing the guard also covers their startup.
    const { runNativeScenarios } = require('./lib/native-fixtures.cjs');
    const { runHostGuardScenarios } = require('./lib/host-guard.cjs');
    const workspaceRoot = path.dirname(__dirname);
    const native = await runNativeScenarios({ workspaceRoot });
    const encoder = options.encode
      ? await require('./lib/encoder-fixtures.cjs').runEncoderScenarios({ sourceCases: native.cases })
      : { cases: [], evidence: [], limitations: [] };
    const host = await runHostGuardScenarios({ workspaceRoot });
    checkProviderOutput(native, 'Native fixtures');
    if (options.encode) checkProviderOutput(encoder, 'Encoder fixtures');
    checkProviderOutput(host, 'Host guard');
    const cases = [...native.cases, ...encoder.cases, ...host.cases];
    if (new Set(cases.map(item => item.id)).size !== cases.length) throw new Error('Duplicate case IDs.');
    if (isolation.attempts.length) throw new Error('A provider attempted a network or process operation; run rejected.');

    const report = {
      schemaVersion: 1,
      name: 'Offline Report Lab',
      generatedAt,
      sourceBuild: '60946132',
      run: {
        id,
        node: process.version,
        kind: 'controlled-offline-fixtures',
        fullGameStarted: false,
        accountQueried: false,
        installedExtensionModified: false,
        encoderExecuted: Boolean(options.encode),
        inputs: 'Locally constructed scenarios, pinned isolated native helpers and pinned page/extension source.'
      },
      networkIsolation: {
        activeDuringRun: true,
        attemptCount: isolation.attempts.length,
        attempts: isolation.attempts,
        transport: options.encode
          ? 'Envelope builders stop at the encoder boundary. Captured inputs are replayed through the isolated encoder with no sender present.'
          : 'Native encoder boundary records locally and returns without sending.',
        scope: 'Process-local API guard, deny-by-default fixture imports, and restricted VM contexts; no OS firewall changes.'
      },
      cases,
      evidence: [...(native.evidence || []), ...(encoder.evidence || []), ...(host.evidence || [])],
      limitations: [...new Set([
        'Controlled fixture inputs are not observations of your gameplay or account.',
        'Only selected helpers execute. This is not the complete client or all reporting paths.',
        'Native envelope captures are before encoding. Optional encoded captures are separately labeled; no server-response equivalence is claimed.',
        'A clean fixture result does not establish multiplayer safety or absence of enforcement.',
        'Historical server reports and private ban rules are unavailable here.',
        ...(native.limitations || []), ...(encoder.limitations || []), ...(host.limitations || [])
      ])]
    };

    fs.mkdirSync(outputDir, { recursive: true });
    for (const item of cases) {
      for (const [index, capture] of (item.captures || []).entries()) {
        const relative = `captures/${item.id}-${index + 1}.bin`;
        fs.mkdirSync(path.join(outputDir, 'captures'), { recursive: true });
        fs.writeFileSync(path.join(outputDir, relative), Buffer.from(capture.hex, 'hex'), { flag: 'wx' });
        capture.file = relative;
      }
    }
    const reportPath = path.join(outputDir, 'report.json');
    const htmlPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(htmlPath, renderReport(report), { flag: 'wx' });
    return {
      status: 'complete', outputDir, reportPath, htmlPath,
      caseCount: cases.length,
      captureCount: cases.reduce((count, item) => count + (item.captures || []).length, 0),
      encodedCaptureCount: cases.reduce((count, item) => count + (item.captures || []).filter(capture => capture.stage === 'encoded').length, 0),
      networkAttempts: isolation.attempts.length,
      simulatedInputs: true,
      fullGameStarted: false
    };
  } finally {
    isolation.restore();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Offline Report Lab\n\nUsage: node lab.cjs [--encode] [--out NEW_DIRECTORY] [--json]\n\nRuns pinned, isolated reporting helpers with controlled inputs.\nWrites report.json, a local HTML viewer, and pre-encoding binary captures.\n--encode also runs the isolated original encoder and saves its binary output.\nNo live game, account or network transport is started.\n');
    return;
  }
  const summary = await run(options);
  if (options.json) process.stdout.write(JSON.stringify(summary) + '\n');
  else process.stdout.write(`Offline fixture run complete: ${summary.caseCount} cases, ${summary.captureCount} local captures (${summary.encodedCaptureCount} encoded).\nAttempted network/process calls: ${summary.networkAttempts}\nOpen: ${summary.htmlPath}\nJSON: ${summary.reportPath}\nThese are controlled inputs, not a gameplay or account recording.\n`);
}

if (require.main === module) main().catch(error => {
  process.stderr.write(`Report Lab: ${error.message}\n`);
  process.exitCode = 1;
});

module.exports = { parseArgs, checkProviderOutput, run };
