import puppeteer from 'puppeteer-core';

const CHROME =
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE ?? 'http://localhost:5210';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
await new Promise((r) => setTimeout(r, 700));

const state = await page.evaluate(() => {
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const orb = document.getElementById('orb');
  const texts = [...document.querySelectorAll('body *')]
    .filter((el) => el.children.length === 0 && el.textContent.trim() && visible(el))
    .map((el) => `${el.tagName.toLowerCase()}.${el.className || '-'}:${el.textContent.trim()}`);
  return {
    stage: document.getElementById('app').dataset.stage,
    introPanel: Boolean(document.getElementById('panel-intro')),
    typeInstead: Boolean(document.getElementById('type-instead')),
    beginTextMode: typeof window.__nextStep?.beginTextMode,
    orbVisible: visible(orb),
    orbSize: Math.round(orb.getBoundingClientRect().width),
    canvas: Boolean(orb.querySelector('canvas')),
    visibleTexts: texts,
  };
});

console.log(JSON.stringify(state, null, 2));
console.log('consoleErrors:', JSON.stringify(errors));

await page.evaluate(() => window.__nextStep.beginTextMode());
await new Promise((r) => setTimeout(r, 600));
const after = await page.evaluate(() => ({
  stage: document.getElementById('app').dataset.stage,
  discoverVisible: getComputedStyle(document.getElementById('panel-discover')).display,
}));
console.log('afterBeginTextMode:', JSON.stringify(after));
console.log('postErrors:', JSON.stringify(errors));

await browser.close();
