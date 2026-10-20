export const TRADING_DAYS = 252;

export const POPULAR_STOCKS = [
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'ICICIBANK.NS',
  'HINDUNILVR.NS',
  'ITC.NS',
  'SBIN.NS',
  'BHARTIARTL.NS',
  'KOTAKBANK.NS',
  'LT.NS',
];

export const POPULAR_ETFS = [
  'NIFTYBEES.NS',
  'JUNIORBEES.NS',
  'GOLDBEES.NS',
  'SILVERBEES.NS',
  'BANKBEES.NS',
];

export const INDIAN_INDICES = [
  { key: 'NIFTY_50', name: 'Nifty 50', symbol: '^NSEI' },
  { key: 'SENSEX', name: 'Sensex', symbol: '^BSESN' },
  { key: 'BANK_NIFTY', name: 'Bank Nifty', symbol: '^NSEBANK' },
  { key: 'FINNIFTY', name: 'Fin Nifty', symbol: 'NIFTY_FIN_SERVICE.NS' },
  { key: 'NIFTY_IT', name: 'Nifty IT', symbol: '^CNXIT' },
  { key: 'NIFTY_PHARMA', name: 'Nifty Pharma', symbol: '^CNXPHARMA' },
  { key: 'NIFTY_AUTO', name: 'Nifty Auto', symbol: '^CNXAUTO' },
  { key: 'NIFTY_METAL', name: 'Nifty Metal', symbol: '^CNXMETAL' },
  { key: 'NIFTY_MIDCAP_50', name: 'Nifty Midcap 50', symbol: '^NSEMDCP50' },
  { key: 'INDIA_VIX', name: 'India VIX', symbol: '^INDIAVIX' },
];

export const RISK_TOLERANCE_DELTA = {
  conservative: 4.0,
  moderate: 2.5,
  aggressive: 1.0,
};
