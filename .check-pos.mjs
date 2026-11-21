import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto('http://localhost:5210', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 900));
  const out = await page.evaluate(() => {
    const r = document.getElementById('orb').getBoundingClientRect();
    const s = document.getElementById('surface').getBoundingClientRect();
    return {
      orb: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) },
      surface: { x: Math.round(s.x), w: Math.round(s.width), h: Math.round(s.height) },
      vw: innerWidth,
    };
  });
  console.log(vp.width, JSON.stringify(out));
  await page.close();
}
await browser.close();
