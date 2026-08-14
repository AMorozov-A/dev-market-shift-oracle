import { ConfigService } from '@nestjs/config';
import { RemoteOkClient } from './remoteok.client';

function mockJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('RemoteOkClient', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        REMOTEOK_BASE_URL: 'https://remoteok.com',
        REMOTEOK_REQUEST_TIMEOUT_MS: 5000,
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const client = new RemoteOkClient(config);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('skips legal banner item and maps jobs', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(200, [
        { legal: 'terms' },
        {
          id: '42',
          url: 'https://remoteok.com/remote-jobs/42',
          position: 'React Engineer',
          company: 'Acme',
          tags: ['react', 'typescript'],
          description: '<p>Build UI</p>',
          date: '2026-01-02T00:00:00+00:00',
        },
      ]),
    );
    global.fetch = fetchMock;

    const result = await client.search({
      text: 'react',
      host: 'remoteok.com',
      page: 0,
      perPage: 20,
    });

    const firstCall = fetchMock.mock.calls[0] as
      [string, RequestInit] | undefined;
    expect(firstCall?.[0]).toContain('tags=react');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.externalId).toBe('42');
    expect(result.items[0]?.description).toBe('Build UI');
  });
});
