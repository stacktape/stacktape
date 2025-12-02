import { describe, expect, test } from 'bun:test';
import { generateInvocationId, generateShortUuid } from './id-generation';

describe('id-generation utilities', () => {
  describe('generateShortUuid', () => {
    test('should generate a valid UUID', () => {
      const id = generateShortUuid();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    test('should generate unique IDs', () => {
      const id1 = generateShortUuid();
      const id2 = generateShortUuid();
      expect(id1).not.toBe(id2);
    });

    test('should generate multiple unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateShortUuid());
      }
      expect(ids.size).toBe(100);
    });

    test('should not contain invalid characters', () => {
      const id = generateShortUuid();
      // eslint-disable-next-line regexp/prefer-w, regexp/use-ignore-case
      expect(id).toMatch(/^[a-zA-Z0-9\-_]+$/);
    });
  });

  describe('generateInvocationId', () => {
    test('should generate a valid invocation ID', () => {
      const id = generateInvocationId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    test('should contain timestamp and UUID separated by underscore', () => {
      const id = generateInvocationId();
      const parts = id.split('_');
      expect(parts.length).toBe(2);
    });

    test('should have timestamp in correct format', () => {
      const id = generateInvocationId();
      const [timestamp] = id.split('_');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}$/);
    });

    test('should have UUID part', () => {
      const id = generateInvocationId();
      const [, uuid] = id.split('_');
      expect(uuid.length).toBeGreaterThan(0);
      expect(uuid).toMatch(/^[\w\-]+$/);
    });

    test('should generate unique invocation IDs', () => {
      const id1 = generateInvocationId();
      const id2 = generateInvocationId();
      expect(id1).not.toBe(id2);
    });

    test('should generate multiple unique invocation IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(generateInvocationId());
      }
      expect(ids.size).toBe(50);
    });

    test('should include current year in timestamp', () => {
      const id = generateInvocationId();
      const currentYear = new Date().getFullYear();
      expect(id).toContain(currentYear.toString());
    });

    test('should be sortable by time', async () => {
      const id1 = generateInvocationId();
      await new Promise((resolve) => setTimeout(resolve, 2));
      const id2 = generateInvocationId();
      expect(id2 >= id1).toBe(true);
    });

    test('should handle rapid successive calls', () => {
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) {
        ids.push(generateInvocationId());
      }
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
