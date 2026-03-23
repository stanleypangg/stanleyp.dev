import { describe, it, expect, vi, afterEach } from 'vitest';
import { esc, formatPlaycount, formatTimestamp } from './music-utils';

describe('esc', () => {
  it('escapes ampersands', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than and greater-than', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quotes', () => {
    expect(esc('"hello"')).toBe('&quot;hello&quot;');
  });

  it('handles a string with no special characters', () => {
    expect(esc('Radiohead')).toBe('Radiohead');
  });

  it('escapes multiple types in one string', () => {
    expect(esc('a & <b> "c"')).toBe('a &amp; &lt;b&gt; &quot;c&quot;');
  });
});

describe('formatPlaycount', () => {
  it('formats zero', () => {
    expect(formatPlaycount(0)).toBe('0 plays');
  });

  it('formats 1', () => {
    expect(formatPlaycount(1)).toBe('1 plays');
  });

  it('formats thousands with locale separator', () => {
    const result = formatPlaycount(1000);
    expect(result).toMatch(/1[,.]?000 plays/);
  });

  it('formats large numbers', () => {
    const result = formatPlaycount(1_234_567);
    expect(result).toContain('plays');
    expect(result).toContain('234');
  });
});

describe('formatTimestamp', () => {
  afterEach(() => vi.useRealTimers());

  it('returns "now playing" for null', () => {
    expect(formatTimestamp(null)).toBe('now playing');
  });

  it('returns minutes ago for recent timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:10:00Z'));
    const ts = new Date('2024-01-01T00:05:00Z').getTime() / 1000;
    expect(formatTimestamp(ts)).toBe('5m ago');
  });

  it('returns hours ago for older timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T03:00:00Z'));
    const ts = new Date('2024-01-01T01:00:00Z').getTime() / 1000;
    expect(formatTimestamp(ts)).toBe('2h ago');
  });

  it('returns days ago for very old timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-04T00:00:00Z'));
    const ts = new Date('2024-01-01T00:00:00Z').getTime() / 1000;
    expect(formatTimestamp(ts)).toBe('3d ago');
  });
});
