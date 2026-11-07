import { afterEach, describe, it, expect, vi } from 'vitest';
import { fetchRawNews, processFeeds, type RawNewsItem } from '@/lib/news/aggregate';

/**
 * processFeeds is the pure core of the aggregator (the network fetch lives in
 * aggregate(), which is integration-level). It filters to F1, dedupes by
 * canonicalUrl keeping the newest, clusters near-duplicate titles, and sorts
 * newest-first. Fixtures use `/f1/` urls so isF1Related always passes.
 */

function raw(overrides: Partial<RawNewsItem>): RawNewsItem {
  return {
    title: 'Verstappen takes pole in qualifying',
    summary: 'Formula 1 qualifying report',
    url: 'https://example.com/f1/news/a',
    canonicalUrl: 'https://example.com/f1/news/a',
    sourceName: 'Test',
    image: '',
    publishedTs: 1_000,
    publishedISO: new Date(1_000).toISOString(),
    ...overrides,
  };
}

describe('processFeeds', () => {
  it('dedupes the same canonical URL to a single item (keeps newest)', () => {
    const items = processFeeds([
      raw({ canonicalUrl: 'https://x/f1/1', url: 'https://x/f1/1', publishedTs: 1_000, title: 'Hamilton wins the F1 race' }),
      raw({ canonicalUrl: 'https://x/f1/1', url: 'https://x/f1/1', publishedTs: 5_000, title: 'Hamilton wins the F1 race (updated)' }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].publishedTs).toBe(5_000);
  });

  it('returns [] for an empty feed', () => {
    expect(processFeeds([])).toEqual([]);
  });

  it('drops non-F1 items', () => {
    const items = processFeeds([
      raw({
        canonicalUrl: 'https://x/tennis/1',
        url: 'https://x/tennis/1',
        title: 'Wimbledon tennis final result',
        summary: 'A tennis match recap',
      }),
    ]);
    expect(items).toEqual([]);
  });

  it('drops "On This Day" retrospectives and keeps a normal title', () => {
    const items = processFeeds([
      raw({
        canonicalUrl: 'https://x/f1/otd',
        url: 'https://x/f1/otd',
        title: 'On This Day: Hamilton wins the United States Grand Prix',
      }),
      raw({ canonicalUrl: 'https://x/f1/live', url: 'https://x/f1/live', title: 'Hamilton wins the F1 race today' }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Hamilton wins the F1 race today');
  });

  it('sorts surviving items newest-first', () => {
    const items = processFeeds([
      raw({ canonicalUrl: 'https://x/f1/old', url: 'https://x/f1/old', publishedTs: 1_000, title: 'Leclerc qualifying lap in F1' }),
      raw({ canonicalUrl: 'https://x/f1/new', url: 'https://x/f1/new', publishedTs: 9_000, title: 'Norris fastest in F1 practice' }),
    ]);
    expect(items[0].publishedTs).toBe(9_000);
    expect(items[1].publishedTs).toBe(1_000);
  });
});

describe('fetchRawNews feed logging', () => {
  const RSS = `<?xml version="1.0"?><rss><channel><item>
    <title>Verstappen takes pole in Formula 1 qualifying</title>
    <link>https://example.com/f1/news/pole</link>
    <description>Formula 1 qualifying report</description>
    <pubDate>Sat, 07 Nov 2026 12:00:00 GMT</pubDate>
    <enclosure url="https://example.com/pole.jpg" type="image/jpeg"/>
  </item></channel></rss>`;

  afterEach(() => vi.restoreAllMocks());

  function stub(respond: () => Response) {
    const fetchMock = vi.fn(() => Promise.resolve(respond()));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    return { fetchMock, warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined) };
  }

  it('returns nothing and warns with the source and HTTP status on a 403', async () => {
    const { warn } = stub(() => new Response('denied', { status: 403 }));
    expect(await fetchRawNews()).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[news] feed failed', expect.objectContaining({ source: expect.stringMatching(/\S/) as string, reason: 'http', status: 403 }));
  });

  it('reports an HTML body as reason "html"', async () => {
    const { warn } = stub(() => new Response('<!DOCTYPE html><html></html>', { status: 200 }));
    expect(await fetchRawNews()).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[news] feed failed', expect.objectContaining({ reason: 'html' }));
  });

  it('identifies as the Apex bot and logs one count line per run', async () => {
    const { fetchMock } = stub(() => new Response(RSS, { status: 200 }));
    const info = vi.spyOn(console, 'info');
    const items = await fetchRawNews();
    expect(items.length).toBeGreaterThan(0);
    const calls = fetchMock.mock.calls as unknown as [string, { headers: Record<string, string> }][];
    expect(calls.length).toBeGreaterThan(0);
    for (const [, init] of calls) expect(init.headers['User-Agent']).toMatch(/^ApexF1FanArchive\//);
    const line = info.mock.calls.find((c) => c[0] === '[news] feed counts');
    expect(line).toBeDefined();
    expect(Object.values(line?.[1] as Record<string, number>).every((n) => n === 1)).toBe(true);
  });
});
