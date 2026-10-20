export const safeNumber = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/**
 * Display options driven by the user's saved preferences. `PreferencesProvider`
 * calls `setFormatterOptions` so every existing `formatCurrency`/`formatDate`
 * call site across the app follows Settings without further changes.
 */
const options = {
  currency: 'INR',
  locale: 'en-IN',
  dateFormat: 'dd/MM/yyyy',
};

const LOCALE_BY_NUMBER_FORMAT = {
  indian: 'en-IN',
  international: 'en-US',
};

export function setFormatterOptions(next = {}) {
  if (next.currency) options.currency = next.currency;
  if (next.numberFormat) {
    options.locale = LOCALE_BY_NUMBER_FORMAT[next.numberFormat] ?? 'en-IN';
  }
  if (next.dateFormat) options.dateFormat = next.dateFormat;
}

export const getFormatterOptions = () => ({ ...options });

export const formatCurrency = (amount, currency = options.currency) =>
  new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeNumber(amount));

export const formatNumber = (num, digits = 2) =>
  new Intl.NumberFormat(options.locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(safeNumber(num));

export const formatPercent = (num, digits = 2) => `${formatNumber(num, digits)}%`;

/** Compact currency for tight mobile layouts: ₹1.2L, ₹3.4Cr. */
export const formatCurrencyCompact = (amount, currency = options.currency) => {
  const value = safeNumber(amount);
  const abs = Math.abs(value);
  const symbol = currency === 'INR' ? '₹' : '$';

  if (currency === 'INR' && abs >= 10000000) return `${symbol}${(value / 10000000).toFixed(2)}Cr`;
  if (currency === 'INR' && abs >= 100000) return `${symbol}${(value / 100000).toFixed(2)}L`;
  if (currency !== 'INR' && abs >= 1000000) return `${symbol}${(value / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${symbol}${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value, currency);
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  if (options.dateFormat === 'MM/dd/yyyy') return `${mm}/${dd}/${yyyy}`;
  if (options.dateFormat === 'yyyy-MM-dd') return `${yyyy}-${mm}-${dd}`;
  return `${dd}/${mm}/${yyyy}`;
};

/** "2 hours ago" style labels for notification lists. */
export const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const units = [
    ['minute', 60],
    ['hour', 60],
    ['day', 24],
    ['week', 7],
  ];

  let amount = seconds;
  let unit = 'second';
  for (const [name, size] of units) {
    if (amount < size) break;
    amount = Math.round(amount / size);
    unit = name;
  }

  if (unit === 'second' || amount > 4 * 7) return formatDate(date);
  return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
};
