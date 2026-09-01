import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const PORT = 9333, PROF = OUT + '/cdp-prof';
const edge = spawn(EDGE, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--allow-file-access-from-files',`--user-data-dir=${PROF}`,`--remote-debugging-port=${PORT}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some(t => t.type === 'page')) break; } catch {} await sleep(250); }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const js = expr => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }).then(r => r.result?.result?.value);
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
async function session(width, height, prefix) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  await send('Page.navigate', { url: 'file:///C:/rex/mario-site/index.html' });
  await sleep(4000);
  await js(`document.documentElement.style.scrollBehavior='auto'`);
  await shot(prefix + 'top');
  for (const sec of ['about', 'work']) { await js(`window.scrollTo(0, document.getElementById('${sec}').offsetTop)`); await sleep(2000); await shot(prefix + sec); }
  await js(`window.scrollTo(0, document.getElementById('contact').offsetTop - 40)`); await sleep(700); await shot(prefix + 'contact-toon'); await sleep(3200); await shot(prefix + 'contact-real');
  await js(`window.scrollTo(0, document.getElementById('work').offsetTop)`); await sleep(600);
  await js(`document.getElementById('next').click()`); await sleep(1400); await shot(prefix + 'work-next');
  await js(`document.querySelector('.card.is-active [data-open]').click()`); await sleep(900); await shot(prefix + 'sheet');
  await js(`document.getElementById('dclose').click()`); await sleep(500);
  await js(`document.getElementById('menuBtn').click()`); await sleep(700); await shot(prefix + 'menu');
  await js(`document.getElementById('menuClose').click()`); await sleep(300);
  console.log(prefix, 'overflow check', await js(`JSON.stringify({docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, cw: document.documentElement.clientWidth})`));
}
await session(1440, 900, 'd-');
await session(430, 900, 'm-');
const logErrs = events.filter(e => e.method === 'Log.entryAdded' && e.params.entry.level === 'error').map(e => e.params.entry.text);
const exc = events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description || ''));
console.log('console errors:', JSON.stringify(logErrs)); console.log('exceptions:', JSON.stringify(exc));
ws.close(); edge.kill(); process.exit(0);
