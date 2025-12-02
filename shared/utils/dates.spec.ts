import { describe, expect, test } from 'bun:test';
import {
  getFirstDayOfLastMonth,
  getFirstDayOfMonth,
  getFirstDayOfNextMonth,
  getLastDayOfMonth,
  getMonthBoundaries,
  timeAgo
} from './dates';

describe('dates utilities', () => {
  describe('getFirstDayOfNextMonth', () => {
    test('should return first day of next month', () => {
      const result = getFirstDayOfNextMonth();
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    test('should return correct month', () => {
      const now = new Date();
      const result = getFirstDayOfNextMonth();
      const expectedMonth = (now.getMonth() + 1) % 12;
      expect(result.getMonth()).toBe(expectedMonth);
    });

    test('should handle year boundary', () => {
      const result = getFirstDayOfNextMonth();
      const now = new Date();
      if (now.getMonth() === 11) {
        expect(result.getFullYear()).toBe(now.getFullYear() + 1);
      } else {
        expect(result.getFullYear()).toBe(now.getFullYear());
      }
    });
  });

  describe('getFirstDayOfLastMonth', () => {
    test('should return first day of last month', () => {
      const result = getFirstDayOfLastMonth();
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    test('should return correct month', () => {
      const now = new Date();
      const result = getFirstDayOfLastMonth();
      const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      expect(result.getMonth()).toBe(expectedMonth);
    });

    test('should handle year boundary', () => {
      const result = getFirstDayOfLastMonth();
      const now = new Date();
      if (now.getMonth() === 0) {
        expect(result.getFullYear()).toBe(now.getFullYear() - 1);
      } else {
        expect(result.getFullYear()).toBe(now.getFullYear());
      }
    });
  });

  describe('getLastDayOfMonth', () => {
    test('should return last day of current month', () => {
      const result = getLastDayOfMonth();
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastDay = new Date(nextMonth.getTime() - 1);
      expect(result.getDate()).toBe(lastDay.getDate());
    });

    test('should return date with time at start of day', () => {
      const result = getLastDayOfMonth();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    test('should handle months with different day counts', () => {
      const result = getLastDayOfMonth();
      expect(result.getDate()).toBeGreaterThanOrEqual(28);
      expect(result.getDate()).toBeLessThanOrEqual(31);
    });
  });

  describe('getFirstDayOfMonth', () => {
    test('should return first day of current month', () => {
      const result = getFirstDayOfMonth();
      expect(result.getDate()).toBe(1);
    });

    test('should return correct month and year', () => {
      const now = new Date();
      const result = getFirstDayOfMonth();
      expect(result.getMonth()).toBe(now.getMonth());
      expect(result.getFullYear()).toBe(now.getFullYear());
    });

    test('should return time at start of day', () => {
      const result = getFirstDayOfMonth();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('getMonthBoundaries', () => {
    test('should parse valid month/year format', () => {
      const result = getMonthBoundaries('1/2024');
      expect(result.firstDay.getMonth()).toBe(0);
      expect(result.firstDay.getFullYear()).toBe(2024);
      expect(result.firstDay.getDate()).toBe(1);
    });

    test('should handle different months correctly', () => {
      const result = getMonthBoundaries('12/2023');
      expect(result.firstDay.getMonth()).toBe(11);
      expect(result.firstDay.getFullYear()).toBe(2023);
      expect(result.firstDay.getDate()).toBe(1);
      expect(result.lastDay.getDate()).toBe(31);
    });

    test('should set last day to end of day', () => {
      const result = getMonthBoundaries('6/2024');
      expect(result.lastDay.getHours()).toBe(23);
      expect(result.lastDay.getMinutes()).toBe(59);
      expect(result.lastDay.getSeconds()).toBe(59);
      expect(result.lastDay.getMilliseconds()).toBe(999);
    });

    test('should handle February correctly', () => {
      const result = getMonthBoundaries('2/2024');
      expect(result.lastDay.getDate()).toBe(29);

      const result2023 = getMonthBoundaries('2/2023');
      expect(result2023.lastDay.getDate()).toBe(28);
    });

    test('should handle month with extra spaces', () => {
      const result = getMonthBoundaries('3 / 2024');
      expect(result.firstDay.getMonth()).toBe(2);
      expect(result.firstDay.getFullYear()).toBe(2024);
    });

    test('should throw error for invalid month', () => {
      expect(() => getMonthBoundaries('13/2024')).toThrow("Invalid month-year format. Use 'M/YYYY'.");
      expect(() => getMonthBoundaries('0/2024')).toThrow("Invalid month-year format. Use 'M/YYYY'.");
    });

    test('should throw error for invalid format', () => {
      expect(() => getMonthBoundaries('invalid')).toThrow("Invalid month-year format. Use 'M/YYYY'.");
      expect(() => getMonthBoundaries('2024/1')).toThrow("Invalid month-year format. Use 'M/YYYY'.");
    });

    test('should handle single digit months', () => {
      const result = getMonthBoundaries('5/2024');
      expect(result.firstDay.getMonth()).toBe(4);
    });
  });

  describe('timeAgo', () => {
    test('should return "just now" for very recent dates', () => {
      const now = new Date();
      const result = timeAgo(now);
      expect(result).toBe('just now');
    });

    test('should return seconds ago', () => {
      const date = new Date(Date.now() - 30 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('second');
    });

    test('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('minute');
    });

    test('should return hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('hour');
    });

    test('should return days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('day');
    });

    test('should return weeks ago', () => {
      const date = new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('week');
    });

    test('should return months ago', () => {
      const date = new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('month');
    });

    test('should return years ago', () => {
      const date = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('year');
    });

    test('should handle future dates with "in" prefix', () => {
      const date = new Date(Date.now() + 5 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toContain('in');
    });

    test('should respect locale parameter', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      const result = timeAgo(date, 'en');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
