import { describe, expect, test } from 'bun:test';
import { isEmailValid, validateEnvVariableValue } from './validation';

describe('validation utilities', () => {
  describe('isEmailValid', () => {
    test('should return true for valid email addresses', () => {
      expect(isEmailValid('test@example.com')).toBe(true);
      expect(isEmailValid('user.name@example.com')).toBe(true);
      expect(isEmailValid('user+tag@example.co.uk')).toBe(true);
      expect(isEmailValid('test123@test-domain.com')).toBe(true);
      expect(isEmailValid('a@b.c')).toBe(true);
    });

    test('should return true for email with numbers', () => {
      expect(isEmailValid('user123@example.com')).toBe(true);
      expect(isEmailValid('123user@example.com')).toBe(true);
    });

    test('should return true for email with special characters', () => {
      expect(isEmailValid('user+filter@example.com')).toBe(true);
      expect(isEmailValid('user_name@example.com')).toBe(true);
      expect(isEmailValid('user-name@example.com')).toBe(true);
    });

    test('should return true for email with subdomain', () => {
      expect(isEmailValid('user@subdomain.example.com')).toBe(true);
      expect(isEmailValid('user@mail.example.co.uk')).toBe(true);
    });

    test('should return false for invalid email addresses', () => {
      expect(isEmailValid('invalid')).toBe(false);
      expect(isEmailValid('@example.com')).toBe(false);
      expect(isEmailValid('user@')).toBe(false);
      expect(isEmailValid('user@.com')).toBe(false);
    });

    test('should return false for email without @', () => {
      expect(isEmailValid('example.com')).toBe(false);
    });

    test('should return false for email with spaces in domain', () => {
      expect(isEmailValid('user@exam ple.com')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isEmailValid('')).toBe(false);
    });

    test('should handle email with multiple dots in domain', () => {
      expect(isEmailValid('user@sub.domain.example.com')).toBe(true);
    });
  });

  describe('validateEnvVariableValue', () => {
    test('should not throw for string values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', 'string value')).not.toThrow();
    });

    test('should not throw for number values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', 123)).not.toThrow();
      expect(() => validateEnvVariableValue('TEST_VAR', 0)).not.toThrow();
      expect(() => validateEnvVariableValue('TEST_VAR', -5.5)).not.toThrow();
    });

    test('should not throw for boolean values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', true)).not.toThrow();
      expect(() => validateEnvVariableValue('TEST_VAR', false)).not.toThrow();
    });

    test('should throw for object values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', { key: 'value' })).toThrow();
    });

    test('should throw for array values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', [1, 2, 3])).toThrow();
    });

    test('should throw for function values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', () => {})).toThrow();
    });

    test('should throw for null values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', null)).toThrow();
    });

    test('should throw for undefined values', () => {
      expect(() => validateEnvVariableValue('TEST_VAR', undefined)).toThrow();
    });

    test('error message should contain property name', () => {
      try {
        validateEnvVariableValue('MY_CUSTOM_VAR', {});
      } catch (error) {
        expect(error.message).toContain('MY_CUSTOM_VAR');
      }
    });

    test('error message should mention unsupported type', () => {
      try {
        validateEnvVariableValue('TEST_VAR', {});
      } catch (error) {
        expect(error.message).toContain('unsupported');
        expect(error.message).toContain('type');
      }
    });
  });
});
