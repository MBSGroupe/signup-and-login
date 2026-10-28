import { expect, test } from '@playwright/test';
import { accounts, loginAdmin, loginMember } from './helpers';

// The regional secretary checks the synthetic member's documents and
// approves the first step of their Déclaration; the member then sees it.

test('a sec_cloa approves the first step and the member sees it approved', async ({ page, browser }) => {
  const { secCloa, synthetic } = await accounts();

  await loginAdmin(page, secCloa);
  await page.goto(`/dash/validation/requests/${synthetic.requestId}`);
  const conformes = page.getByRole('button', { name: 'Conforme', exact: true });
  await expect(conformes.first()).toBeVisible();
  for (const button of await conformes.all()) await button.click();
  await page.getByRole('button', { name: 'Approuver et envoyer' }).click();
  // The step is decided: no more approve button for it.
  await expect(page.getByRole('button', { name: 'Approuver et envoyer' })).toHaveCount(0);

  const member = await browser.newPage();
  await loginMember(member, synthetic);
  await member.getByRole('button', { name: 'Validation' }).click();
  await expect(member.getByText('1 / 4 étapes terminées')).toBeVisible();
  await member.getByRole('button', { name: 'Afficher les étapes' }).click();
  await expect(member.getByText('Vérification Sec CLOA', { exact: true })).toBeVisible();
  await expect(member.getByText('Approuvée', { exact: true })).toBeVisible();
  await member.close();
});
