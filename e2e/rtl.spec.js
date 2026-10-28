import { expect, test } from '@playwright/test';
import { accounts, loginAdmin, loginMember } from './helpers';

// Arabic text renders right to left, in the Arabic font, without breaking
// the layout. Screenshots only ever show the synthetic member (made-up
// names): nothing from the copy ends up in the committed snapshots.
// Snapshots are per platform (…-chromium-win32.png): regenerate them with
// `npm run test:e2e -- --update-snapshots` after a deliberate design change.

const ARABIC = /[؀-ۿ]/;

/** Every element showing Arabic text in `scope` is rtl. */
async function expectArabicRtl(scope) {
  const shown = await scope.locator('[dir]').evaluateAll((els, source) => {
    const arabic = new RegExp(source);
    return els
      .filter((el) => arabic.test(el.textContent || el.value || '') && el.children.length === 0)
      .map((el) => el.getAttribute('dir'));
  }, ARABIC.source);
  expect(shown.length).toBeGreaterThan(0);
  expect([...new Set(shown)]).toEqual(['rtl']);
}

test('member profile: the Arabic names and address render right to left', async ({ page }) => {
  const { synthetic } = await accounts();
  await loginMember(page, synthetic);
  await page.getByRole('button', { name: 'Informations' }).click();
  const panel = page.locator('main');
  await expect(page.getByText('أمينة')).toBeVisible();
  await expectArabicRtl(panel);
  await expect(page.getByText('بن علي').locator('xpath=ancestor::div[1]')).toHaveScreenshot('profile-arabic-name.png');
  await expect(page.getByText('12 شارع الزيتون، الجزائر').locator('xpath=ancestor::div[1]')).toHaveScreenshot(
    'profile-arabic-address.png',
  );
});

test("admin's view of the member: the Arabic fields render right to left", async ({ page }) => {
  const { cloaAdmin, synthetic } = await accounts();
  await loginAdmin(page, cloaAdmin);
  await page.goto(`/dash/adminUser/${synthetic.id}`);
  await expect(page.getByText('أمينة').first()).toBeVisible();
  await expectArabicRtl(page.locator('body'));
});

test('signup form: Arabic inputs type right to left', async ({ page }) => {
  await page.goto('/signup');
  const nom = page.locator('input[name="nomArabe"]');
  await nom.fill('بن علي');
  await page.locator('input[name="prenomArabe"]').fill('أمينة');
  await expect(nom).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('input[name="prenomArabe"]')).toHaveAttribute('dir', 'rtl');
  await expect(nom.locator('xpath=ancestor::div[contains(@class,"grid")][1]')).toHaveScreenshot('signup-identity.png', {
    maxDiffPixelRatio: 0.01,
  });
});
