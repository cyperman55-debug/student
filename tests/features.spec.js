import { test, expect } from '@playwright/test';
const screenshotRoot = process.env.SCREENSHOT_DIR || 'test-results';
const video = { id: 11, lessonId: 11, title: 'محاضرة الاختبار المحلية', url: 'https://player.mediadelivery.net/embed/1/local-fixture', grade: 'second-secondary', term: '', unitId: 1, purchased: true, packageKey: 'second-secondary:all:1' };
const student = { id: 9001, name: 'طالب تجريبي محلي', role: 'student', grade: 'second-secondary' };
async function setup(page, options = {}) {
  const requests = options.requests || [{ id: 'local-request', amount: 100, status: 'Pending', createdAt: '2026-11-23T12:00:00Z' }];
  await page.addInitScript(({ video, student, options }) => {
    localStorage.setItem('shefo-token', 'local-fixture');
    localStorage.setItem('shefo-last-activity', String(Date.now()));
    if (options.saved !== false && !localStorage.getItem(`shefo-progress-v1:${student.id}`)) localStorage.setItem(`shefo-progress-v1:${student.id}`, JSON.stringify({ [video.id]: { videoId: video.id, url: video.url, seconds: 125, duration: 900, updatedAt: Date.now() } }));
  }, { video, student, options });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.fulfill({ body: '' });
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/dashboard') return route.fulfill({ json: { role: 'student', user: student, balance: 0, videos: [{ ...video, ...(options.native ? { url: '/local-test.mp4' } : {}) }], quizzes: [], attempts: [], lessons: [{ id: 11, title: video.title, videos: [video], pdfs: [] }] } });
    if (url.pathname === '/api/recharge-requests/my') return route.fulfill({ json: { requests, balance: 75 } });
    return route.fulfill({ json: { success: true, units: [], messages: [], settings: { minimumAmount: 10 } } });
  });
  return requests;
}
test('mobile resume, Bunny protocol restore, save, restart and isolation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setup(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'استكمال المشاهدة' })).toBeVisible();
  await page.evaluate(() => { document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed')); });
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${screenshotRoot}/student-resume-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'استكمال المشاهدة' }).click();
  const frame = page.locator('iframe.lesson-video-frame');
  await expect(frame).toBeVisible();
  const embedded = await (await frame.elementHandle()).contentFrame();
  await embedded.evaluate(() => { window.__sent = []; window.addEventListener('message', (event) => { try { window.__sent.push(JSON.parse(event.data)); } catch {} }); });
  await frame.evaluate((iframe) => {
    window.dispatchEvent(new MessageEvent('message', { origin: 'https://player.mediadelivery.net', source: iframe.contentWindow, data: JSON.stringify({ context: 'player.js', event: 'ready' }) }));
  });
  await expect.poll(() => embedded.evaluate(() => window.__sent.some((item) => item.method === 'setCurrentTime' && item.value === 125))).toBe(true);
  await frame.evaluate((iframe) => window.dispatchEvent(new MessageEvent('message', { origin: 'https://player.mediadelivery.net', source: iframe.contentWindow, data: JSON.stringify({ context: 'player.js', event: 'timeupdate', value: { seconds: 240, duration: 900 } }) })));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('shefo-progress-v1:9001'))[11].seconds)).toBe(240);
  await expect(page.getByText('4:00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ من الأول' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('shefo-progress-v1:9001'))[11].seconds)).toBe(0);
  await page.evaluate(() => { document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed')); });
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${screenshotRoot}/student-player-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('recharge pending, live rejection reason, credited amount, retry and no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const requests = await setup(page, { saved: false });
  await page.goto('/');
  await page.getByText('حالة طلبات الشحن', { exact: false }).first().click();
  await expect(page.getByText('قيد المراجعة', { exact: true })).toBeVisible();
  requests[0] = { ...requests[0], status: 'Rejected', rejectionReason: 'رقم العملية غير صحيح', reviewedAt: '2026-11-23T13:00:00Z' };
  await page.getByRole('button', { name: 'تحديث الحالة', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('رقم العملية غير صحيح');
  requests.push({ id: 'local-approved', status: 'Approved', amount: 100, creditedAmount: 75, createdAt: '2026-11-23T12:00:00Z' });
  await page.getByRole('button', { name: 'تحديث الحالة', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('٧٥');
  await page.evaluate(() => { document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed')); });
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${screenshotRoot}/student-recharge-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.route('**/api/recharge-requests/my', (route) => route.fulfill({ status: 503, json: {} }));
  await page.getByRole('button', { name: 'تحديث الحالة', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('تعذر تحديث');
});
test('completed, changed-source and other-account progress are not offered', async ({ page }) => {
  await setup(page, { saved: false });
  await page.addInitScript(() => {
    localStorage.setItem('shefo-progress-v1:9999', JSON.stringify({ 11: { videoId: 11, url: 'other', seconds: 50, duration: 900 } }));
    localStorage.setItem('shefo-progress-v1:9001', JSON.stringify({ 11: { videoId: 11, url: 'changed-source', seconds: 50, duration: 900 } }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'كل خطوة تقرّبك من هدفك' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'استكمال المشاهدة' })).toHaveCount(0);
});

 test('native file restores and saves a simulated media timeline; completion restarts at zero', async ({ page }) => {
  await setup(page, { native: true, saved: false });
  await page.addInitScript(() => localStorage.setItem('shefo-progress-v1:9001', JSON.stringify({ 11: { videoId: 11, url: '/local-test.mp4', seconds: 125, duration: 900, updatedAt: Date.now() } })));
  await page.goto('/');
  await page.getByRole('button', { name: 'استكمال المشاهدة' }).click();
  const media = page.locator('video.lesson-video-native');
  await media.evaluate((video) => { Object.defineProperty(video, 'duration', { value: 900, configurable: true }); video.dispatchEvent(new Event('loadedmetadata', { bubbles: true })); });
  expect(await media.evaluate((video) => video.currentTime)).toBe(125);
  await media.evaluate((video) => { video.currentTime = 900; video.dispatchEvent(new Event('ended', { bubbles: true })); });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('shefo-progress-v1:9001'))[11].completed)).toBe(true);
  await page.getByRole('button', { name: 'إيقاف الشرح', exact: true }).click();
  await page.getByRole('button', { name: 'تشغيل شرح المحاضرة: محاضرة الاختبار المحلية', exact: true }).click();
  await media.evaluate((video) => { Object.defineProperty(video, 'duration', { value: 900, configurable: true }); video.dispatchEvent(new Event('loadedmetadata', { bubbles: true })); });
  expect(await media.evaluate((video) => video.currentTime)).toBe(0);
});

test('desktop layout and hostile message isolation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'استكمال المشاهدة' }).click();
  await page.locator('iframe.lesson-video-frame').evaluate((iframe) => window.dispatchEvent(new MessageEvent('message', { origin: 'https://wrong.invalid', source: iframe.contentWindow, data: JSON.stringify({ context: 'player.js', event: 'timeupdate', value: { seconds: 600, duration: 900 } }) })));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('shefo-progress-v1:9001'))[11].seconds)).toBe(125);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${screenshotRoot}/student-player-desktop.png`, fullPage: true });
});
