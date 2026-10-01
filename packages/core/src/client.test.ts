import { describe, expect, it, vi } from 'vitest';

import { createClient, parseSetupLink, type StoredSession, type TokenStorage } from './client';

const envelope = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, message: 'ok', data, timestamp: '' }), { status, headers: { 'Content-Type': 'application/json' } });

function memoryStorage(initial: StoredSession | null): TokenStorage & { current: StoredSession | null } {
  const box = { current: initial };
  return {
    get current() {
      return box.current;
    },
    async get() {
      return box.current;
    },
    async set(session) {
      box.current = session;
    },
  };
}

const session: StoredSession = { accessToken: 'old', refreshToken: 'r1', deviceSessionId: 'd1' };

describe('createClient', () => {
  it('sends the bearer token and unwraps the envelope', async () => {
    const fetchImpl = vi.fn(async () => envelope([1, 2]));
    const client = createClient({ baseUrl: 'http://x/', storage: memoryStorage(session), fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(await client.get<number[]>('/v1/tasks', { view: 'today', skip: undefined })).toEqual([1, 2]);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://x/v1/tasks?view=today');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer old');
  });

  it('refreshes once on 403 and retries with the new token', async () => {
    const storage = memoryStorage(session);
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/auth/refresh')) return envelope({ accessToken: 'new', refreshToken: 'r2', deviceSessionId: 'd1' });
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer new' ? envelope('ok') : new Response('{}', { status: 403 });
    });
    const client = createClient({ baseUrl: 'http://x', storage, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(await client.get<string>('/v1/tasks')).toBe('ok');
    expect(storage.current?.accessToken).toBe('new');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('shares one refresh between concurrent requests', async () => {
    let refreshes = 0;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/auth/refresh')) {
        refreshes++;
        return envelope({ accessToken: 'new', refreshToken: 'r2', deviceSessionId: 'd1' });
      }
      return (init?.headers as Record<string, string>).Authorization === 'Bearer new' ? envelope('ok') : new Response('{}', { status: 403 });
    });
    const client = createClient({ baseUrl: 'http://x', storage: memoryStorage(session), fetchImpl: fetchImpl as unknown as typeof fetch });

    await Promise.all([client.get('/v1/a'), client.get('/v1/b'), client.get('/v1/c')]);
    expect(refreshes).toBe(1);
  });

  it('signs out when the refresh itself fails', async () => {
    const storage = memoryStorage(session);
    const onSignedOut = vi.fn();
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 403 }));
    const client = createClient({ baseUrl: 'http://x', storage, onSignedOut, fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.get('/v1/tasks')).rejects.toMatchObject({ status: 401 });
    expect(storage.current).toBeNull();
    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  it('does not try to refresh a failed login', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 403 }));
    const client = createClient({ baseUrl: 'http://x', storage: memoryStorage(null), fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.signIn('a@b.c', 'bad', 'dev', 'DESKTOP')).rejects.toThrow('Wrong email or password');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('surfaces the server message on other errors', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message: 'Title is required' }), { status: 400 }));
    const client = createClient({ baseUrl: 'http://x', storage: memoryStorage(session), fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.post('/v1/tasks', {})).rejects.toThrow('Title is required');
  });
});

describe('parseSetupLink', () => {
  it('reads server and token from a setup link', () => {
    expect(parseSetupLink('lifeos://setup?server=https%3A%2F%2Flife-os.example.dev%2F&id=abc.access&secret=s3cr3t')).toEqual({ baseUrl: 'https://life-os.example.dev', cfClientId: 'abc.access', cfClientSecret: 's3cr3t' });
  });
  it('rejects other links', () => {
    expect(parseSetupLink('https://example.com')).toBeNull();
    expect(parseSetupLink('lifeos://other?server=x')).toBeNull();
    expect(parseSetupLink('not a url')).toBeNull();
  });
});
