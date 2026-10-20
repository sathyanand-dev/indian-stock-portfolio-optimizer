import apiClient from './client';

export async function getMarketIndices() {
  const response = await apiClient.get('/api/v1/data/indices');
  return response.data;
}

export async function getStockQuote(symbol) {
  const response = await apiClient.get(
    `/api/v1/data/stocks/${encodeURIComponent(symbol)}`
  );
  return response.data;
}

export async function getStockData(symbol, period = '1y') {
  try {
    const response = await apiClient.get(`/api/v1/data/historical/${symbol}`, {
      params: { period },
    });

    const data = response.data;
    if (!data.dates || !data.prices || !data.volumes) {
      return [];
    }

    return data.dates.map((date, index) => ({
      symbol: data.symbol || symbol,
      date,
      close: data.prices[index] || 0,
      open: data.prices[index] || 0,
      high: data.prices[index] || 0,
      low: data.prices[index] || 0,
      volume: data.volumes[index] || 0,
    }));
  } catch {
    return [];
  }
}

export async function getMultipleStockData(symbols, period = '1y') {
  try {
    const response = await apiClient.post('/api/v1/data/historical/batch', {
      symbols,
      period,
    });
    return response.data;
  } catch {
    return {};
  }
}

export async function searchSymbols(query, limit = 20) {
  try {
    const response = await apiClient.get('/api/v1/data/search/symbols', {
      params: { query, limit },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}
