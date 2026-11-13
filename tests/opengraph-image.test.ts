import { describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(() => Promise.resolve('AAAA'));
vi.mock('node:fs/promises', () => ({ readFile, default: { readFile } }));

describe('root opengraph-image', () => {
  // Every page imports this module for its metadata; page functions on Vercel
  // do not carry public/, so reading the wordmark at load time broke them.
  it('does not touch the file system when the module is imported', async () => {
    const mod = await import('@/app/opengraph-image');
    expect(mod.size).toEqual({ width: 1200, height: 630 });
    expect(readFile).not.toHaveBeenCalled();
  });
});
