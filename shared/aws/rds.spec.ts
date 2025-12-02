import { describe, expect, test } from 'bun:test';
import { normalizeEngineType } from './rds';

describe('rds', () => {
  describe('normalizeEngineType', () => {
    test('should normalize aurora-postgresql variants to aurora-postgresql', () => {
      const result = normalizeEngineType('aurora-postgresql' as any);
      expect(result).toBe('aurora-postgresql');
    });

    test('should normalize aurora-postgresql with version to aurora-postgresql', () => {
      const result = normalizeEngineType('aurora-postgresql-11' as any);
      expect(result).toBe('aurora-postgresql');
    });

    test('should normalize aurora-mysql variants to aurora-mysql', () => {
      const result = normalizeEngineType('aurora-mysql' as any);
      expect(result).toBe('aurora-mysql');
    });

    test('should normalize aurora-mysql with version to aurora-mysql', () => {
      const result = normalizeEngineType('aurora-mysql-5.7' as any);
      expect(result).toBe('aurora-mysql');
    });

    test('should keep postgres as-is', () => {
      const result = normalizeEngineType('postgres' as any);
      expect(result).toBe('postgres');
    });

    test('should keep mysql as-is', () => {
      const result = normalizeEngineType('mysql' as any);
      expect(result).toBe('mysql');
    });

    test('should keep mariadb as-is', () => {
      const result = normalizeEngineType('mariadb' as any);
      expect(result).toBe('mariadb');
    });

    test('should distinguish between aurora-postgresql and aurora-mysql', () => {
      const pg = normalizeEngineType('aurora-postgresql-13' as any);
      const mysql = normalizeEngineType('aurora-mysql-8' as any);
      expect(pg).not.toBe(mysql);
      expect(pg).toBe('aurora-postgresql');
      expect(mysql).toBe('aurora-mysql');
    });

    test('should handle aurora without suffix as aurora-mysql', () => {
      const result = normalizeEngineType('aurora' as any);
      expect(result).toBe('aurora-mysql');
    });

    test('should be consistent for same input', () => {
      const result1 = normalizeEngineType('aurora-postgresql-14' as any);
      const result2 = normalizeEngineType('aurora-postgresql-14' as any);
      expect(result1).toBe(result2);
    });

    test('should handle all aurora variations correctly', () => {
      const postgresqlVariants = [
        'aurora-postgresql',
        'aurora-postgresql-11',
        'aurora-postgresql-12',
        'aurora-postgresql-13'
      ];

      postgresqlVariants.forEach((variant) => {
        const result = normalizeEngineType(variant as any);
        expect(result).toBe('aurora-postgresql');
      });
    });

    test('should handle all non-aurora engines as passthrough', () => {
      const engines: Array<any> = ['postgres', 'mysql', 'mariadb'];

      engines.forEach((engine) => {
        const result = normalizeEngineType(engine);
        expect(result).toBe(engine);
      });
    });
  });
});
