import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('analytics and automation', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('shows the analytics overview, adds a template rule, tests it and removes it', async ({ page, baseURL }) => {
    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const auth = { Authorization: `Bearer ${token}` };

    await page.goto('/analytics');
    // the dashboard aggregates across every service, which is slow on a cold stack
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('worth a look')).toBeVisible();

    await page.goto('/analytics/weekly');
    await expect(page.getByRole('heading', { name: 'Weekly summary' })).toBeVisible();
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(page.getByRole('heading', { name: 'Weekly summary' })).toBeVisible();

    await page.goto('/analytics/templates');
    const card = page.locator('div', { has: page.getByText('Daily planning nudge', { exact: true }) }).last();
    await card.getByRole('button', { name: 'Add rule' }).click();
    await expect(page.getByText('Added', { exact: true }).first()).toBeVisible();

    await page.goto('/analytics/automation');
    await expect(page.getByText('Daily planning nudge', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Test Daily planning nudge' }).click();

    await page.goto('/analytics/history');
    await expect(page.getByText('Manual test run')).toBeVisible();

    const { data: rules } = await (await fetch(`${baseURL}/v1/core/automation/rules`, { headers: auth })).json();
    for (const rule of rules.filter((r: { templateKey: string }) => r.templateKey === 'daily-planning')) {
      await fetch(`${baseURL}/v1/core/automation/rules/${rule.id}`, { method: 'DELETE', headers: auth });
    }
  });
});
