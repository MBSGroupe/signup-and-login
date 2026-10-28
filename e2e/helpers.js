// Shared by the browser tests: the backend's control API (test accounts,
// recorded mail, session expiry — see test/e2e/serve.ts in the backend)
// and the two login forms.
import { expect } from '@playwright/test';

const CONTROL = 'http://127.0.0.1:3101';

const call = async (path, init) => {
  const res = await fetch(`${CONTROL}${path}`, init);
  if (!res.ok) throw new Error(`control ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

let cached;
/** { password, region, superAdmin, secCloa, cloaAdmin, member, synthetic } */
export const accounts = async () => (cached ??= await call('/accounts'));

export const mailsTo = (email) => call(`/mails?to=${encodeURIComponent(email)}`);

/** Ends every session of the account, as if it had expired. */
export const expireSessions = (email) =>
  call(`/expire-sessions?email=${encodeURIComponent(email)}`, { method: 'POST' });

/** Waits for a mail to `email` whose subject matches, returns it. */
export async function waitForMail(email, subject) {
  let found;
  await expect
    .poll(async () => (found = (await mailsTo(email)).find((m) => subject.test(m.subject || ''))), {
      timeout: 15_000,
    })
    .toBeTruthy();
  return found;
}

export async function loginMember(page, { email, password }) {
  await page.goto('/');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/auth\/profile/);
}

export async function loginAdmin(page, { email, password }) {
  await page.goto('/adminlogin');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dash/);
}
