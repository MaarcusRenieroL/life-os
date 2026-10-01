export const E2E_EMAIL = 'e2e-test@lifeos.local';
export const E2E_PASSWORD = 'E2eTestPassword!23';

/** Registers the fixed E2E test account if it doesn't already exist (auth's /register 400s with
 * "email already in use" on a repeat run - that's expected and fine, not a failure). Called from
 * each spec's own beforeAll rather than a global-setup file, so a single spec still works when
 * run in isolation (`playwright test tasks.spec.ts`) without needing a separate setup pass. */
export async function ensureE2eUser(baseURL: string): Promise<void> {
  await fetch(`${baseURL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_EMAIL, rawPassword: E2E_PASSWORD }),
  });
}
