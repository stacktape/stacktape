import { describe, expect, test } from 'bun:test';
import {
  IGNORE_LINE_MARK,
  isJsonDockerErrorString,
  removeAllLines,
  removeDockerDaemonErrors,
  removeErrorLines
} from './streams';

describe('streams utilities', () => {
  describe('IGNORE_LINE_MARK constant', () => {
    test('should be defined', () => {
      expect(IGNORE_LINE_MARK).toBeDefined();
      expect(typeof IGNORE_LINE_MARK).toBe('string');
    });

    test('should have expected value', () => {
      expect(IGNORE_LINE_MARK).toBe('__IGNORE_LINE_MARK__');
    });
  });

  describe('isJsonDockerErrorString', () => {
    test('should return true for JSON docker error strings', () => {
      expect(isJsonDockerErrorString('{"errorType": "RuntimeError"}')).toBe(true);
      expect(isJsonDockerErrorString('Some text {"errorType": "Error"} more text')).toBe(true);
    });

    test('should return false for non-error strings', () => {
      expect(isJsonDockerErrorString('Normal log line')).toBe(false);
      expect(isJsonDockerErrorString('{"status": "ok"}')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isJsonDockerErrorString('')).toBe(false);
    });

    test('should be case sensitive', () => {
      expect(isJsonDockerErrorString('{"ErrorType": "RuntimeError"}')).toBe(false);
      expect(isJsonDockerErrorString('{"ERRORTYPE": "RuntimeError"}')).toBe(false);
    });

    test('should handle partial matches', () => {
      expect(isJsonDockerErrorString('{errorType')).toBe(false);
      expect(isJsonDockerErrorString('errorType"')).toBe(false);
    });
  });

  describe('removeDockerDaemonErrors', () => {
    test('should mark docker daemon error lines for ignoring', () => {
      const line = 'docker: Error response from daemon: some error message';
      const result = removeDockerDaemonErrors(line);
      expect(result).toContain(IGNORE_LINE_MARK);
      expect(result).toContain(line);
    });

    test('should return unmodified line for non-error lines', () => {
      const line = 'Normal log line';
      const result = removeDockerDaemonErrors(line);
      expect(result).toBe(line);
      expect(result).not.toContain(IGNORE_LINE_MARK);
    });

    test('should only match lines starting with docker error', () => {
      const line = 'Some text docker: Error response from daemon: error';
      const result = removeDockerDaemonErrors(line);
      expect(result).toBe(line);
      expect(result).not.toContain(IGNORE_LINE_MARK);
    });

    test('should handle empty string', () => {
      const result = removeDockerDaemonErrors('');
      expect(result).toBe('');
    });

    test('should preserve original line in marked output', () => {
      const line = 'docker: Error response from daemon: test error';
      const result = removeDockerDaemonErrors(line);
      expect(result).toContain(line);
    });
  });

  describe('removeErrorLines', () => {
    test('should mark JSON error lines for ignoring', () => {
      const line = '{"errorType": "RuntimeError", "message": "test"}';
      const result = removeErrorLines(line);
      expect(result).toContain(IGNORE_LINE_MARK);
      expect(result).toContain(line);
    });

    test('should return unmodified line for non-error lines', () => {
      const line = 'Normal log line';
      const result = removeErrorLines(line);
      expect(result).toBe(line);
      expect(result).not.toContain(IGNORE_LINE_MARK);
    });

    test('should handle lines with errorType in middle', () => {
      const line = 'prefix {"errorType": "Error"} suffix';
      const result = removeErrorLines(line);
      expect(result).toContain(IGNORE_LINE_MARK);
    });

    test('should handle empty string', () => {
      const result = removeErrorLines('');
      expect(result).toBe('');
    });

    test('should preserve original line in marked output', () => {
      const line = '{"errorType": "test"}';
      const result = removeErrorLines(line);
      expect(result).toContain(line);
    });
  });

  describe('removeAllLines', () => {
    test('should mark any line for ignoring', () => {
      const line = 'Any text content';
      const result = removeAllLines(line);
      expect(result).toContain(IGNORE_LINE_MARK);
      expect(result).toContain(line);
    });

    test('should handle empty string', () => {
      const result = removeAllLines('');
      expect(result).toContain(IGNORE_LINE_MARK);
    });

    test('should handle lines with special characters', () => {
      const line = 'Line with !@#$%^&*() special chars';
      const result = removeAllLines(line);
      expect(result).toContain(IGNORE_LINE_MARK);
      expect(result).toContain(line);
    });

    test('should preserve original line in marked output', () => {
      const line = 'Test line';
      const result = removeAllLines(line);
      expect(result).toContain(line);
    });

    test('should handle multiline strings', () => {
      const line = 'Line 1\nLine 2';
      const result = removeAllLines(line);
      expect(result).toContain(IGNORE_LINE_MARK);
      expect(result).toContain(line);
    });
  });
});
