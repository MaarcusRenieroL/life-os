import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('goals', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('creates a goal, adds milestones, and progress follows the ticked ones', async ({ page, baseURL }) => {
    const goalName = `E2E goal ${Date.now()}`;

    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/goals');
    await page.getByRole('button', { name: 'New goal' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill(goalName);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByRole('link', { name: goalName }).click();
    await expect(page.getByRole('heading', { name: goalName })).toBeVisible();

    // Two milestones, one ticked -> the milestone component (and so overall progress) is 50%.
    for (const title of ['First checkpoint', 'Second checkpoint']) {
      await page.getByRole('button', { name: 'Add milestone' }).click();
      const milestoneDialog = page.getByRole('dialog');
      await milestoneDialog.getByLabel('Title').fill(title);
      await milestoneDialog.getByRole('button', { name: 'Save' }).click();
      await expect(milestoneDialog).not.toBeVisible();
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Complete “First checkpoint”' }).click();
    await expect(page.getByRole('img', { name: 'Overall progress 50%' })).toBeVisible();

    // Clean up via the API directly - see tasks.spec.ts for why.
    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const listRes = await fetch(`${baseURL}/v1/goals?q=${encodeURIComponent(goalName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data: goals } = await listRes.json();
    for (const goal of goals) {
      await fetch(`${baseURL}/v1/goals/${goal.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }
  });
});
