'use strict';

const crypto = require('node:crypto');

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const pretty = value => escape(JSON.stringify(value, null, 2));
function hexDump(hex) {
  const bytes = Buffer.from(hex, 'hex');
  const lines = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const row = bytes.subarray(offset, offset + 16);
    const pairs = [...row].map(byte => byte.toString(16).padStart(2, '0')).join(' ');
    const ascii = [...row].map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.').join('');
    lines.push(`${offset.toString(16).padStart(4, '0')}  ${pairs.padEnd(47)}  ${ascii}`);
  }
  return lines.join('\n');
}

function renderReport(report) {
  const style = `
    :root{color-scheme:light;--ink:#202c35;--muted:#55636c;--line:#d9dfdf;--paper:#fff;--wash:#f3f5f2;--accent:#265d68;--tint:#eaf1f1;--note:#fff4d8}
    *{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}
    .wrap{max-width:1210px;margin:0 auto;padding:36px 30px 70px}.eyebrow{font-size:12px;letter-spacing:.12em;font-weight:750;text-transform:uppercase;color:var(--accent)}h1{font-size:clamp(30px,5vw,46px);line-height:1.12;letter-spacing:-.035em;margin:12px 0}h2{font-size:23px;line-height:1.3;margin:0 0 12px}h3{font-size:16px;margin:20px 0 8px}p{margin:10px 0}.lead{max-width:830px;color:var(--muted);font-size:18px}.banner{background:var(--note);padding:15px 18px;border-left:4px solid #b98221;border-radius:4px;margin:24px 0}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:25px 0}.stat{border:1px solid var(--line);padding:18px;background:var(--paper);border-radius:10px}.stat strong{display:block;font-size:27px;line-height:1.2}.stat span{font-size:13px;color:var(--muted)}.layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:25px}.nav{align-self:start;position:sticky;top:22px;font-size:13px}.nav ol{padding-left:21px}.nav li{margin:10px 0}.nav .small{font-size:12px}.case,.foot{background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:24px;margin-bottom:19px;scroll-margin-top:20px}.tag{display:inline-block;border-radius:4px;background:var(--tint);color:var(--accent);padding:3px 7px;font-size:11px;font-weight:700;letter-spacing:.035em;text-transform:uppercase;margin:0 5px 12px 0}.tag.fixture{background:#f4efdf;color:#775c18}.muted{color:var(--muted)}.explain{border-top:1px solid var(--line);padding-top:13px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}pre{margin:8px 0 0;padding:14px;border-radius:6px;background:#f3f5f5;border:1px solid #e4e8e8;font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:430px;overflow:auto}summary{cursor:pointer;font-weight:650;color:var(--accent)}details{margin-top:16px}ul{padding-left:22px}.small{font-size:13px;color:var(--muted)}.limits{font-size:14px;color:var(--muted)}.downloads{display:flex;gap:18px;flex-wrap:wrap}.foot{margin-top:24px}.foot h2{font-size:20px}
    @media(max-width:780px){.wrap{padding:24px 16px}.layout{grid-template-columns:1fr}.nav{position:static}.nav ol{display:flex;flex-wrap:wrap;gap:6px 24px}.nav li{margin:2px 0}.columns{grid-template-columns:1fr}.stats{gap:8px}.stat{padding:13px}.stat strong{font-size:23px}.case{padding:18px}}
  `;
  const styleHash = crypto.createHash('sha256').update(style).digest('base64');
  const captures = report.cases.flatMap(item => item.captures || []);
  const encodedCount = captures.filter(capture => capture.stage === 'encoded').length;
  const captureLabel = encodedCount ? `local captures · ${encodedCount} encoded outputs` : 'local captures before encoding';
  const captureNote = encodedCount
    ? 'Captures include separately labeled native inputs and encoded outputs. No transport or server receipt is part of this run.'
    : 'Captures are taken before encoding; no wire-report equivalence is claimed.';
  const caseHtml = report.cases.map(item => {
    const captureHtml = (item.captures || []).map((capture, index) => `
      <details><summary>Capture ${index + 1}: ${escape(capture.channel || capture.stage)}</summary>
        <p class="small">${escape(capture.description || '')}</p>
        <p class="small">${escape(capture.bytes)} bytes · ${escape(capture.stage)}${capture.file ? ` · <a href="${escape(capture.file)}">Binary copy</a>` : ''}</p>
        <pre>${escape(hexDump(capture.hex))}</pre>
      </details>`).join('');
    return `<article class="case" id="${escape(item.id)}">
      <span class="tag">${item.kind === 'host-guard' ? 'Original page check' : 'Isolated native helper'}</span><span class="tag fixture">Controlled fixture inputs</span>
      <h2>${escape(item.label)}</h2>
      <p>${escape(item.interpretation || '')}</p>
      <div class="columns"><section><h3>What was supplied</h3><pre>${pretty(item.input)}</pre></section><section><h3>What was observed</h3><pre>${pretty(item.observed)}</pre></section></div>
      ${captureHtml}
      ${(item.limitations || []).length ? `<ul class="limits">${item.limitations.map(text => `<li>${escape(text)}</li>`).join('')}</ul>` : ''}
      <details><summary>Source evidence</summary><pre>${pretty(item.evidence || {})}</pre></details>
    </article>`;
  }).join('');
  const nativeCount = report.cases.filter(item => item.kind === 'native-fixture').length;
  const csp = `default-src 'none'; style-src 'sha256-${styleHash}'; script-src 'none'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"><meta name="referrer" content="no-referrer"><title>Offline Report Lab</title><style>${style}</style></head><body><main class="wrap">
    <header><div class="eyebrow">Local artifacts · transport disabled</div><h1>Client report inspection</h1><p class="lead">Original reporting helpers and page checks, exercised with controlled inputs. Expand a case to inspect its observed values and labeled local captures.</p></header>
    <div class="banner"><strong>This is a fixture run, not a gameplay recording.</strong> It does not establish what was reported about your account, a ban decision, or multiplayer safety. ${escape(captureNote)}</div>
    <div class="stats"><div class="stat"><strong>${report.cases.length}</strong><span>controlled cases · ${nativeCount} native cases</span></div><div class="stat"><strong>${captures.length}</strong><span>${escape(captureLabel)}</span></div><div class="stat"><strong>${report.networkIsolation.attemptCount}</strong><span>attempted network/process calls · blocked if attempted</span></div></div>
    <div class="layout"><nav class="nav" aria-label="Report cases"><strong>Inspect a case</strong><ol>${report.cases.map(item => `<li><a href="#${escape(item.id)}">${escape(item.label)}</a></li>`).join('')}</ol><p class="small">Build ${escape(report.sourceBuild)}<br>${escape(report.generatedAt)}</p><div class="downloads"><a href="report.json">Complete JSON</a></div></nav><div>${caseHtml}</div></div>
    <section class="foot"><h2>What this run covers</h2><ul>${report.limitations.map(text => `<li>${escape(text)}</li>`).join('')}</ul><details><summary>Run provenance and isolation</summary><pre>${pretty({ run: report.run, networkIsolation: report.networkIsolation, evidence: report.evidence })}</pre></details></section>
  </main></body></html>`;
}

module.exports = { renderReport };
