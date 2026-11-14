import { test, expect } from '@playwright/test';

/**
 * End-to-end happy path in LOCAL PLACEHOLDER mode:
 *   browse → add → dev sign-in → mock pay → see the order on the admin board.
 * Requires `pnpm setup:local` to have run (local Supabase + seeded SAMPLE menu).
 */
test('customer orders momos and staff sees it on the board', async ({ page }) => {
  // Browse
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible();

  // Add the first available item
  const addButtons = page.getByRole('button', { name: /Add to cart/i });
  await addButtons.first().click();

  // Item sheet: add to cart (defaults satisfy required options)
  await page.getByRole('button', { name: /^Add \d+ ·/ }).click();

  // Go to cart, then checkout
  await page.goto('/cart');
  await page.getByRole('link', { name: /Go to checkout/i }).click();

  // Not signed in -> dev sign-in. Click Google (opens dev screen in local mode).
  await page.getByRole('button', { name: /Continue with Google/i }).click();
  await page.getByRole('button', { name: /Sign in as Customer/i }).click();

  // Fill contact + pay
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await page.getByLabel('Phone number').fill('021 555 0101');
  await page.getByRole('button', { name: /^Pay \$/ }).click();

  // Mock payment sheet
  await expect(page.getByText(/Test payment — no real money/i)).toBeVisible();
  await page.getByRole('button', { name: /^Pay \$/ }).click();

  // Order confirmation
  await expect(page).toHaveURL(/\/order\//);
  const orderNumber = await page.locator('h1').first().innerText();
  expect(orderNumber).toMatch(/DM-/);

  // Staff: sign in as staff and confirm the order is on the board.
  await page.goto('/account');
  // Sign out customer first if signed in
  const signOut = page.getByRole('button', { name: /^Sign out$/ });
  if (await signOut.isVisible().catch(() => false)) {
    await signOut.click();
  }
  await page.goto('/admin');
  await page.getByRole('button', { name: /Continue with Google/i }).click();
  await page.getByRole('button', { name: /Sign in as Staff/i }).click();

  await expect(page.getByRole('heading', { name: 'Live orders' })).toBeVisible();
  await expect(page.getByText(orderNumber.trim())).toBeVisible();
});
