import { describe, it, expect, afterEach } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCurrencyCompact,
  formatDate,
  formatRelativeTime,
  setFormatterOptions,
} from './formatters';

const DEFAULTS = { currency: 'INR', numberFormat: 'indian', dateFormat: 'dd/MM/yyyy' };

describe('formatters', () => {
  afterEach(() => {
    setFormatterOptions(DEFAULTS);
  });

  describe('formatCurrency', () => {
    it('should format INR by default', () => {
      expect(formatCurrency(1000)).toContain('1,000');
    });

    it('should follow the currency preference', () => {
      setFormatterOptions({ currency: 'USD', numberFormat: 'international' });

      expect(formatCurrency(1000)).toContain('$');
    });
  });

  describe('formatNumber', () => {
    it('should group lakhs in the Indian format', () => {
      expect(formatNumber(1234567, 0)).toBe('12,34,567');
    });

    it('should group thousands in the international format', () => {
      setFormatterOptions({ numberFormat: 'international' });

      expect(formatNumber(1234567, 0)).toBe('1,234,567');
    });

    it('should fall back to zero for non-numeric input', () => {
      expect(formatNumber(null)).toBe('0.00');
    });
  });

  describe('formatPercent', () => {
    it('should round to two decimals', () => {
      expect(formatPercent(12.345)).toContain('12.35');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should use crore for large rupee amounts', () => {
      expect(formatCurrencyCompact(35000000)).toBe('₹3.50Cr');
    });

    it('should use lakh for mid-size rupee amounts', () => {
      expect(formatCurrencyCompact(250000)).toBe('₹2.50L');
    });

    it('should use millions when the currency is USD', () => {
      setFormatterOptions({ currency: 'USD', numberFormat: 'international' });

      expect(formatCurrencyCompact(2500000)).toBe('$2.50M');
    });
  });

  describe('formatDate', () => {
    it('should use day-first order by default', () => {
      expect(formatDate('2026-03-09T00:00:00')).toBe('09/03/2026');
    });

    it('should follow the ISO date preference', () => {
      setFormatterOptions({ dateFormat: 'yyyy-MM-dd' });

      expect(formatDate('2026-03-09T00:00:00')).toBe('2026-03-09');
    });

    it('should return a dash for missing or invalid values', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate('not-a-date')).toBe('—');
    });
  });

  describe('formatRelativeTime', () => {
    it('should describe very recent timestamps as just now', () => {
      expect(formatRelativeTime(new Date())).toBe('just now');
    });

    it('should describe hours elapsed', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

      expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
    });

    it('should return an empty string for missing values', () => {
      expect(formatRelativeTime(null)).toBe('');
    });
  });
});
