import { describe, expect, test } from 'bun:test';
import { shortHash } from './short-hash';

describe('shortHash', () => {
  describe('basic functionality', () => {
    test('should produce consistent hash for same input', () => {
      const text = 'hello world';
      const hash1 = shortHash(text);
      const hash2 = shortHash(text);
      expect(hash1).toBe(hash2);
    });

    test('should produce different hashes for different inputs', () => {
      const hash1 = shortHash('hello');
      const hash2 = shortHash('world');
      expect(hash1).not.toBe(hash2);
    });

    test('should return a valid hex string', () => {
      const hash = shortHash('test');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('should return a non-empty string', () => {
      const hash = shortHash('test');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string', () => {
      const hash = shortHash('');
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should handle single character', () => {
      const hash = shortHash('a');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('should handle special characters', () => {
      const hash = shortHash('!@#$%^&*()_+-=[]{}|;:,.<>?');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('should handle unicode characters', () => {
      const hash = shortHash('こんにちは世界');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const hash = shortHash(longString);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('should handle newlines and whitespace', () => {
      const hash = shortHash('line1\nline2\tline3');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hash uniqueness', () => {
    test('should produce different hashes for strings with swapped characters', () => {
      const hash1 = shortHash('abc');
      const hash2 = shortHash('bac');
      expect(hash1).not.toBe(hash2);
    });

    test('should produce different hashes for strings with different casing', () => {
      const hash1 = shortHash('Test');
      const hash2 = shortHash('test');
      expect(hash1).not.toBe(hash2);
    });

    test('should produce different hashes for similar strings', () => {
      const hash1 = shortHash('test1');
      const hash2 = shortHash('test2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('deterministic behavior', () => {
    test('should always produce same hash for identical inputs across multiple calls', () => {
      const text = 'deterministic test';
      const hashes = Array.from({ length: 10 }, () => shortHash(text));
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });
  });

  describe('real-world usage examples', () => {
    test('should hash AWS region + stack name + account ID', () => {
      const input = 'us-east-1my-stacktape-stack123456789012';
      const hash = shortHash(input);
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should hash file paths', () => {
      const path = '/path/to/some/file.js';
      const hash = shortHash(path);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    test('should hash JSON strings', () => {
      const json = JSON.stringify({ key: 'value', nested: { data: 123 } });
      const hash = shortHash(json);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});
