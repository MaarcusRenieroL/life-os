import { expect, test } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD, ensureE2eUser } from './fixtures';

test.describe('calendar event creation', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensureE2eUser(baseURL!);
  });

  test('signs in, creates an event via the UI, and sees it in the month view', async ({ page, baseURL }) => {
    const eventTitle = `E2E smoke test event ${Date.now()}`;

    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL);
    await page.locator('#password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/calendar');
    await page.getByRole('button', { name: 'New event' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input').first().fill(eventTitle);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(eventTitle, { exact: true })).toBeVisible();

    // Clean up via the API directly - see tasks.spec.ts for why (keeps this spec focused on the
    // create path rather than the delete flow's own selectors).
    const token = await page.evaluate(() => localStorage.getItem('life_os_access_token'));
    const listRes = await fetch(`${baseURL}/v1/calendar/events?q=${encodeURIComponent(eventTitle)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data: events } = await listRes.json();
    for (const event of events) {
      await fetch(`${baseURL}/v1/calendar/events/${event.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
