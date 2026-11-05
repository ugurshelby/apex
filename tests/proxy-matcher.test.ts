import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// proxy.ts cannot be imported here (next-intl needs the Next runtime), and Next
// needs the matcher as a literal in that file. So the test keeps a literal copy
// and first proves it is the same string as in proxy.ts.
const MATCHER_SOURCE = String.raw`'/((?!(?:api|_next|monitoring|opengraph-image)(?:/|$)|.*\\..*).*)'`;
const matcher = /^\/((?!(?:api|_next|monitoring|opengraph-image)(?:\/|$)|.*\..*).*)$/;

describe('proxy matcher', () => {
  it('matches the literal in proxy.ts', () => {
    expect(readFileSync('proxy.ts', 'utf8')).toContain(`matcher: [${MATCHER_SOURCE}]`);
  });

  it.each(['/opengraph-image', '/api/news', '/api', '/_next/static/x.js', '/monitoring', '/favicon.ico', '/brand/apex-wordmark.png'])(
    'skips %s',
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );

  it.each(['/', '/tr', '/tr/season/2026', '/anthology/senna/opengraph-image', '/apiary', '/opengraph-images', '/monitoringx'])(
    'runs on %s',
    (path) => {
      expect(matcher.test(path)).toBe(true);
    },
  );
});
