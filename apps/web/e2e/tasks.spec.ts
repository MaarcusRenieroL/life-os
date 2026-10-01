import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('login and task creation', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('signs in, creates a task via the UI, and sees it in the list', async ({ page, baseURL }) => {
    const taskTitle = `E2E smoke test task ${Date.now()}`;

    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/tasks/list');
    await page.getByRole('button', { name: 'New task' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input').first().fill(taskTitle);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();

    // Clean up via the API directly (same pattern used for manual verification throughout this
    // project) rather than reverse-engineering the row-menu delete flow's exact selectors here -
    // keeps this spec focused on the create path, which is what it's actually testing.
    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const listRes = await fetch(`${baseURL}/v1/tasks?q=${encodeURIComponent(taskTitle)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data: tasks } = await listRes.json();
    for (const task of tasks) {
      await fetch(`${baseURL}/v1/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
