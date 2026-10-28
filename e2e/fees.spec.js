import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { accounts, loginMember } from './helpers';

// The synthetic member has a 2027 fee half paid (fixture).

test('a member sees their fee, their payment and what they still owe', async ({ page }) => {
  const { synthetic } = await accounts();
  await loginMember(page, synthetic);
  // Header counters: one fee, 10000 DA still owed (half of 20000).
  await expect(page.getByText('10000').first()).toBeVisible();

  await page.getByRole('button', { name: 'Cotisations' }).click();
  await expect(page.getByText('2027').first()).toBeVisible();
  await page.getByRole('button', { name: 'Paiements' }).click();
  await expect(page.getByRole('button', { name: 'Télécharger' })).toHaveCount(1);
});

// KNOWN FAILURE — the Pdf permission schema (production, 2026-10-28) grants
// preview only to super admins and cnoa_it: a member's "Télécharger" gets
// 403 "Insufficient permissions for preview.Pdf" and the page shows "error".
// PDF code and its rights belong to the documents work; turns green once a
// member may render the receipt of their own payment.
test.fail('KNOWN: a member downloads the receipt of their payment as a PDF', async ({ page }) => {
  test.setTimeout(60_000);
  const { synthetic } = await accounts();
  await loginMember(page, synthetic);
  await page.getByRole('button', { name: 'Paiements' }).click();

  const download = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Télécharger' }).first().click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`recu_paiement_${synthetic.paymentId}.pdf`);
  const bytes = await readFile(await file.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});
