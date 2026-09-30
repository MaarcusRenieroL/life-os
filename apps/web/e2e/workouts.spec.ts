import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('workouts', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('runs a workout: start blank, log a set, finish, see it in history', async ({ page, baseURL }) => {
    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const auth = { Authorization: `Bearer ${token}` };

    // A workout left in progress by an earlier failed run would block starting this one.
    const leftover = await fetch(`${baseURL}/v1/workouts/sessions/current`, { headers: auth });
    const { data: current } = await leftover.json();
    if (current) await fetch(`${baseURL}/v1/workouts/sessions/${current.session.id}`, { method: 'DELETE', headers: auth });

    await page.goto('/workouts');
    await page.getByRole('button', { name: 'Start workout' }).click();
    const startDialog = page.getByRole('dialog');
    await startDialog.getByLabel('Name').fill('E2E push session');
    await startDialog.getByRole('button', { name: 'Start' }).click();
    await expect(page).toHaveURL(/\/workouts\/session\//);
    await expect(page.getByRole('heading', { name: 'E2E push session' })).toBeVisible();

    await page.getByRole('button', { name: /Add an exercise/ }).click();
    await page.getByRole('option', { name: 'Barbell Bench Press' }).click();

    await page.getByLabel('Set 1 reps').fill('8');
    await page.getByLabel('Set 1 weight').fill('60');
    await page.getByRole('button', { name: 'Complete set 1' }).click();
    await expect(page.getByRole('button', { name: 'Mark set 1 not done' })).toBeVisible();

    await page.getByRole('button', { name: 'Finish workout' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();

    await page.goto('/workouts/history');
    await expect(page.getByRole('link', { name: 'E2E push session' })).toBeVisible();

    // Clean up via the API directly - see tasks.spec.ts for why. Deleting the session also takes
    // back the personal record it set.
    const listRes = await fetch(`${baseURL}/v1/workouts/sessions?status=COMPLETED`, { headers: auth });
    const { data: sessions } = await listRes.json();
    for (const session of sessions.filter((s: { name: string }) => s.name === 'E2E push session')) {
      await fetch(`${baseURL}/v1/workouts/sessions/${session.id}`, { method: 'DELETE', headers: auth });
    }
  });
});
