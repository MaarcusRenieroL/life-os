import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('subscriptions', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('adds a tracked subscription, shows its monthly cost, and can pause it', async ({ page, baseURL }) => {
    const name = `E2E sub ${Date.now()}`;

    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/finance/subscriptions');
    await page.getByRole('button', { name: 'Add' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('Amount (₹)').fill('1200');
    // No account in the test user's data, so automatic expenses must be off to save.
    await dialog.getByLabel('Create an expense each billing cycle').uncheck();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Pause ${name}` }).click();
    // Paused subscriptions leave the Active list and show under the "Paused & cancelled" saved filter.
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('button', { name: 'Paused & cancelled' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: `Resume ${name}` })).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const auth = { Authorization: `Bearer ${token}` };
    const { data: subs } = await (await fetch(`${baseURL}/v1/finance/subscriptions`, { headers: auth })).json();
    for (const s of subs.filter((x: { name: string }) => x.name === name)) {
      await fetch(`${baseURL}/v1/finance/subscriptions/${s.id}`, { method: 'DELETE', headers: auth });
    }
  });
});
