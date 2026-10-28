import { expect, test } from '@playwright/test';
import { accounts, loginAdmin } from './helpers';

// What a regional admin's members page loads: only their region (the
// production permission schemas, read from the copy). The rows are checked
// on the response the page itself received, not on the rendered table.

test('a CLOA admin only gets the members of their own region', async ({ page }) => {
  const { cloaAdmin, region } = await accounts();
  await loginAdmin(page, cloaAdmin);

  const list = page.waitForResponse((r) => /\/api\/users\?/.test(r.url()) && r.request().method() === 'GET');
  await page.goto('/dash/allMembers');
  const body = await (await list).json();
  const rows = body.data?.data ?? body.data ?? [];
  expect(rows.length).toBeGreaterThan(0);
  expect([...new Set(rows.map((u) => u.region))]).toEqual([region]);
});

test('a CLOA admin opens a member of their region, not one of another region', async ({ page }) => {
  const { cloaAdmin, synthetic, outsider } = await accounts();
  await loginAdmin(page, cloaAdmin);

  const own = page.waitForResponse((r) => r.url().endsWith(`/api/users/${synthetic.id}`));
  await page.goto(`/dash/adminUser/${synthetic.id}`);
  expect((await own).status()).toBe(200);
  await expect(page.getByText('Benali').first()).toBeVisible();

  const other = page.waitForResponse((r) => r.url().endsWith(`/api/users/${outsider.id}`));
  await page.goto(`/dash/adminUser/${outsider.id}`);
  expect((await other).status()).toBe(403);
});
