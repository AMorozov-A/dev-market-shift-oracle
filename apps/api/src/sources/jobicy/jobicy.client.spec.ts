import { ConfigService } from '@nestjs/config';
import { JobicyClient } from './jobicy.client';

function mockJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('JobicyClient', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        JOBICY_BASE_URL: 'https://jobicy.com',
        JOBICY_REQUEST_TIMEOUT_MS: 5000,
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const client = new JobicyClient(config);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('maps jobicy jobs with description and tags', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(200, {
        jobCount: 1,
        jobs: [
          {
            id: 7,
            url: 'https://jobicy.com/jobs/7',
            jobTitle: 'Backend Engineer',
            companyName: 'Acme',
            jobIndustry: ['Software Engineering'],
            jobDescription: '<p>Node.js APIs</p>',
            pubDate: '2026-01-03T00:00:00+00:00',
          },
        ],
      }),
    );
    global.fetch = fetchMock;

    const result = await client.search({
      text: 'backend',
      host: 'jobicy.com',
      page: 0,
      perPage: 20,
    });

    const firstCall = fetchMock.mock.calls[0] as
      [string, RequestInit] | undefined;
    expect(firstCall?.[0]).toContain('tag=backend');
    expect(result.items[0]?.externalId).toBe('7');
    expect(result.items[0]?.description).toBe('Node.js APIs');
  });
});
