import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('habit creation', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('signs in, creates a habit via the UI, and sees it in the list', async ({ page, baseURL }) => {
    const habitName = `E2E smoke test habit ${Date.now()}`;

    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/habits/list');
    await page.getByRole('button', { name: 'New habit' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input').first().fill(habitName);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(habitName, { exact: true })).toBeVisible();

    // Clean up via the API directly - see tasks.spec.ts for why.
    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const listRes = await fetch(`${baseURL}/v1/habits`, { headers: { Authorization: `Bearer ${token}` } });
    const { data: habits } = await listRes.json();
    for (const habit of habits.filter((h: { name: string }) => h.name === habitName)) {
      await fetch(`${baseURL}/v1/habits/${habit.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
