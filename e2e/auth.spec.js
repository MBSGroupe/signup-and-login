import { expect, test } from '@playwright/test';
import { accounts, expireSessions, loginAdmin, loginMember } from './helpers';

// Logging in, and what happens when the session ends under the user.

test('a member logs in and lands on their profile', async ({ page }) => {
  const { synthetic } = await accounts();
  await loginMember(page, synthetic);
  await expect(page.getByText('Amina').first()).toBeVisible();
});

test('a wrong password is refused, the member stays on the login page', async ({ page }) => {
  const { synthetic } = await accounts();
  await page.goto('/');
  await page.locator('input[name="email"]').fill(synthetic.email);
  await page.locator('input[name="password"]').fill('Not-the-password1!');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(/identifiants|incorrect|invalid/i).first()).toBeVisible();
  await expect(page).not.toHaveURL(/\/auth\/profile/);
});

test('an admin logs in to the dashboard; a member cannot open it', async ({ page, browser }) => {
  const { superAdmin, synthetic } = await accounts();
  await loginAdmin(page, superAdmin);

  const member = await browser.newPage();
  await loginMember(member, synthetic);
  await member.goto('/dash');
  await expect(member).not.toHaveURL(/\/dash/);
  await member.close();
});

test('an expired session sends the member back to the login page, with the reason', async ({ page }) => {
  const { synthetic } = await accounts();
  await loginMember(page, synthetic);
  await expireSessions(synthetic.email);

  // Any API call now fails, the refresh too: back to the login page.
  await page.reload();
  await expect(page).toHaveURL(/reason=session-expired/);
  await expect(page.getByText('Votre session a expiré. Veuillez vous reconnecter.')).toBeVisible();
});

test('an expired admin session sends the admin back to the admin login', async ({ page }) => {
  const { cloaAdmin } = await accounts();
  await loginAdmin(page, cloaAdmin);
  await expireSessions(cloaAdmin.email);
  await page.reload();
  await expect(page).toHaveURL(/adminlogin.*reason=session-expired/);
});
