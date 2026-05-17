import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto('http://localhost:5175');
await page.waitForLoadState('networkidle');
await page.evaluate(() => {
  localStorage.setItem('earth-online-onboarding-done', 'true');
  localStorage.setItem('earth-online-scores', JSON.stringify({ physical: 65, energy: 70, career: 55, social: 0, finance: 0 }));
});

await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/earth-dashboard-hd.png' });

// Now click on "physical" dimension card to test transition + detail page
await page.click('text=PHYSICAL');
await page.waitForTimeout(5000);  // wait for transition
await page.screenshot({ path: '/tmp/earth-detail.png' });

await browser.close();
