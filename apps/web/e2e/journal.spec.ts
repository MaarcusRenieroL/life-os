import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('journal', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('writes an entry with a mood, a prompt and free writing and sees it in the journal', async ({ page, baseURL }) => {
    const title = `E2E journal ${Date.now()}`;

    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/notes/journal');
    await page.getByRole('link', { name: 'Write an entry' }).click();
    await expect(page).toHaveURL(/\/notes\/journal\/new$/);

    await page.getByLabel('Title').fill(title);
    await page.getByRole('radio', { name: 'Good' }).click();
    await page.getByRole('radio', { name: 'Steady' }).click();

    // First suggested prompt, then answer it.
    await page.getByRole('button').filter({ hasText: /\?$/ }).first().click();
    await page.locator('textarea').first().fill('Finished the E2E suite');
    await page.getByLabel('Free writing').fill('A calm, productive day.');

    await page.getByRole('button', { name: 'Save entry' }).click();
    await expect(page).toHaveURL(/\/notes\/journal$/);
    await expect(page.getByRole('link', { name: title })).toBeVisible();

    // Clean up via the API directly - see tasks.spec.ts for why. Journal entries soft-delete to the
    // notes trash, so purge from there too.
    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const auth = { Authorization: `Bearer ${token}` };
    const listRes = await fetch(`${baseURL}/v1/notes/journal?q=${encodeURIComponent(title)}`, { headers: auth });
    const { data: entries } = await listRes.json();
    for (const entry of entries) {
      await fetch(`${baseURL}/v1/notes/journal/${entry.noteId}`, { method: 'DELETE', headers: auth });
      await fetch(`${baseURL}/v1/notes/${entry.noteId}/permanent`, { method: 'DELETE', headers: auth });
    }
  });
});
