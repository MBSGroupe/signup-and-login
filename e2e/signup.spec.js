import { expect, test } from '@playwright/test';
import { waitForMail } from './helpers';

// A new member signs up through the real form (files included), confirms
// their address from the mail, logs in and finds their Déclaration in
// progress. Signup is closed in production today: the e2e backend reopens
// the latest Déclaration, as for a new campaign.

// A minimal valid PDF, for every required document.
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

test('a new member signs up, confirms their email, logs in and sees their Déclaration in progress', async ({ page }) => {
  test.setTimeout(120_000);
  const email = `nadia.signup.${Date.now()}@example.test`;
  const password = 'E2e#Signup1';
  // Unique per run: both must not exist yet in the copy.
  const n = String(Date.now()).slice(-5);

  await page.goto('/signup');
  const form = page.locator('form');

  // The choices that decide which fields show: a woman (no national
  // service), single (no children), "Classique" diploma, salaried (no map).
  const choices = {
    region: '16',
    sexe: 'F',
    maritalStatus: 'Célibataire',
    diplomaType: 'Classique',
    professionalMode: 'Salarié',
  };
  const values = {
    nin: `1999${n}${n}0000`,
    name: 'Nadia',
    lastname: 'Essai',
    nomArabe: 'تجربة',
    prenomArabe: 'نادية',
    email,
    phone: '0550123456',
    fixe: '021000000',
    registrationNumber: `${n}/16/24L`,
    anneeClassique: '2018',
    password,
    secondPassword: password,
  };

  for (const [name, value] of Object.entries(choices)) {
    const select = form.locator(`select[name="${name}"]`);
    await select.selectOption(value).catch(() => select.selectOption({ index: 1 }));
  }
  for (const [name, value] of Object.entries(values)) await form.locator(`[name="${name}"]`).fill(value);

  // Everything else: any plausible value (choices reveal fields, so repeat).
  for (let round = 0; round < 3; round++) {
    for (const field of await form.locator('input[name], select[name], textarea[name]').all()) {
      if (!(await field.isVisible())) continue;
      const [tag, type, name, current] = await field.evaluate((el) => [el.tagName, el.type, el.name, el.value]);
      if (current || ['file', 'checkbox', 'radio', 'hidden'].includes(type)) continue;
      if (tag === 'SELECT') await field.selectOption({ index: 1 });
      else if (type === 'date') await field.fill('2015-06-01');
      else if (type === 'number') await field.fill('1');
      else await field.fill(name.endsWith('Arabe') ? 'نص تجريبي' : 'Valeur E2E');
    }
  }

  // A chosen file replaces its input: collect the ids first.
  const fileIds = await page
    .locator('input[type="file"][id^="file-"]')
    .evaluateAll((els) => els.map((el) => el.id));
  for (const id of fileIds) {
    await page.locator(`#${id}`).setInputFiles({ name: `${id.slice(5)}.pdf`, mimeType: 'application/pdf', buffer: PDF });
  }

  await form.locator('input[name="loi"]').check();
  await form.locator('button[type="submit"]').click();
  await page.getByRole('button', { name: "Confirmer l'inscription" }).click();
  await expect(page).toHaveURL(/verify-pending/, { timeout: 20_000 });

  // The verification mail (recorded by the e2e backend), then its link.
  const mail = await waitForMail(email, /v[ée]rifi/i);
  const link = /href="([^"]*\/verify\?[^"]*)"/.exec(mail.html)[1].replace(/&amp;/g, '&');
  await page.goto(link);
  await expect(page).toHaveURL(/verified=true/, { timeout: 15_000 });

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/auth\/profile/);

  await page.getByRole('button', { name: 'Validation' }).click();
  await expect(page.getByText('Déclaration').first()).toBeVisible();
  await expect(page.getByText('En cours').first()).toBeVisible();
});
