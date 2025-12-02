import { describe, expect, test } from 'bun:test';
import { isAuroraEngine } from './rds-engines';

describe('rds-engines', () => {
  describe('isAuroraEngine', () => {
    test('should return true for aurora-mysql', () => {
      expect(isAuroraEngine('aurora-mysql' as any)).toBe(true);
    });

    test('should return true for aurora-postgresql', () => {
      expect(isAuroraEngine('aurora-postgresql' as any)).toBe(true);
    });

    test('should return true for aurora-mysql-serverless', () => {
      expect(isAuroraEngine('aurora-mysql-serverless' as any)).toBe(true);
    });

    test('should return true for aurora-postgresql-serverless', () => {
      expect(isAuroraEngine('aurora-postgresql-serverless' as any)).toBe(true);
    });

    test('should return true for aurora-mysql-serverless-v2', () => {
      expect(isAuroraEngine('aurora-mysql-serverless-v2' as any)).toBe(true);
    });

    test('should return true for aurora-postgresql-serverless-v2', () => {
      expect(isAuroraEngine('aurora-postgresql-serverless-v2' as any)).toBe(true);
    });

    test('should return false for non-aurora engines', () => {
      expect(isAuroraEngine('postgres' as any)).toBe(false);
      expect(isAuroraEngine('mysql' as any)).toBe(false);
      expect(isAuroraEngine('mariadb' as any)).toBe(false);
    });
  });
});
