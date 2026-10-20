import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/lib/yahoo.js', () => ({
  fetchChartData: vi.fn(),
  searchQuotes: vi.fn(),
}));

const { searchQuotes } = await import('../src/lib/yahoo.js');
const { searchEquities } = await import('../src/services/marketData.service.js');
const { clearCache } = await import('../src/lib/cache.js');

describe('marketData.searchEquities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  it('should return popular symbols when the query is empty', async () => {
    searchQuotes.mockResolvedValue([]);

    const results = await searchEquities('', 3);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Ltd',
      exchange: 'NSE',
      type: 'EQUITY',
    });
    expect(searchQuotes).not.toHaveBeenCalled();
  });

  it('should find listings that are absent from the local catalogue', async () => {
    searchQuotes.mockResolvedValue([
      { symbol: 'CUPID.NS', name: 'CUPID LIMITED', exchange: 'NSI', quoteType: 'EQUITY' },
      { symbol: 'CUPID.BO', name: 'CUPID LTD.', exchange: 'BSE', quoteType: 'EQUITY' },
    ]);

    const results = await searchEquities('cupid', 10);

    expect(results.map((r) => r.symbol)).toEqual(['CUPID.NS', 'CUPID.BO']);
    expect(results[0].exchange).toEqual('NSE');
  });

  it('should rank an exact catalogue symbol above remote matches', async () => {
    searchQuotes.mockResolvedValue([
      { symbol: 'RELINFRA.BO', name: 'RELIANCE INFRASTRUCTURE LTD.', exchange: 'BSE', quoteType: 'EQUITY' },
    ]);

    const results = await searchEquities('reliance', 10);

    expect(results[0].symbol).toEqual('RELIANCE.NS');
    expect(results.map((r) => r.symbol)).toContain('RELINFRA.BO');
  });

  it('should drop non-Indian listings and mutual funds', async () => {
    searchQuotes.mockResolvedValue([
      { symbol: 'RS', name: 'Reliance, Inc.', exchange: 'NYQ', quoteType: 'EQUITY' },
      { symbol: '0P0000XYZ.BO', name: 'Some Mutual Fund', exchange: 'BSE', quoteType: 'MUTUALFUND' },
      { symbol: 'CUPID.NS', name: 'CUPID LIMITED', exchange: 'NSI', quoteType: 'EQUITY' },
    ]);

    const results = await searchEquities('mixed', 10);

    expect(results.map((r) => r.symbol)).toEqual(['CUPID.NS']);
  });

  it('should still return catalogue matches when the remote search fails', async () => {
    searchQuotes.mockRejectedValue(new Error('Yahoo Finance is throttling requests'));

    const results = await searchEquities('tcs', 10);

    expect(results.map((r) => r.symbol)).toContain('TCS.NS');
  });

  it('should match every token of a multi-word query', async () => {
    searchQuotes.mockResolvedValue([]);

    const results = await searchEquities('hdfc bank', 10);

    expect(results.map((r) => r.symbol)).toContain('HDFCBANK.NS');
  });
});
