import { Readable } from 'node:stream';
import { describe, expect, test } from 'bun:test';
import {
  applyAll,
  areStringArraysContentsEqual,
  capitalizeFirstLetter,
  chunkArray,
  chunkString,
  definedValueOr,
  filterDuplicates,
  getByteSize,
  getFirstAndLastItem,
  getLastSplitPart,
  getRandomNumberFromInterval,
  getUniqueDuplicates,
  groupBy,
  hasDuplicates,
  hasProperties,
  isAlphanumeric,
  isJson,
  isMoreThanOneDefined,
  isNonNullObject,
  isNumeric,
  isOlderThanSeconds,
  isPromise,
  isSmallAlphanumericDashCase,
  isValidJson,
  lowerCaseFirstCharacter,
  notEmpty,
  removeColoringFromString,
  removeDuplicates,
  replaceAll,
  safeJsonParse,
  sortObjectKeys,
  streamToBuffer,
  streamToString,
  stringMatchesGlob,
  transformToCidr
} from './misc';

describe('misc', () => {
  describe('isPromise', () => {
    test('should return true for promises', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });

    test('should return false for non-promises', () => {
      expect(isPromise({})).toBe(false);
      expect(isPromise(null)).toBe(false);
      expect(isPromise('string')).toBe(false);
    });
  });

  describe('isNonNullObject', () => {
    test('should return true for objects', () => {
      expect(isNonNullObject({})).toBe(true);
      expect(isNonNullObject({ key: 'value' })).toBe(true);
      expect(isNonNullObject([])).toBe(true);
    });

    test('should return false for null and primitives', () => {
      expect(isNonNullObject(null)).toBe(false);
      expect(isNonNullObject(undefined)).toBe(false);
      expect(isNonNullObject('string')).toBe(false);
      expect(isNonNullObject(123)).toBe(false);
    });
  });

  describe('wait', () => {});

  describe('stringMatchesGlob', () => {
    test('should match glob patterns', () => {
      expect(stringMatchesGlob('file.ts', '*.ts')).toBe(true);
      expect(stringMatchesGlob('src/app.ts', 'src/**/*.ts')).toBe(true);
      expect(stringMatchesGlob('test.spec.ts', '*.spec.ts')).toBe(true);
    });

    test('should not match non-matching patterns', () => {
      expect(stringMatchesGlob('file.js', '*.ts')).toBe(false);
      expect(stringMatchesGlob('src/app.ts', 'dist/**/*.ts')).toBe(false);
    });
  });

  describe('sortObjectKeys', () => {
    test('should sort object keys alphabetically', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const sorted = sortObjectKeys(obj);
      expect(Object.keys(sorted)).toEqual(['a', 'm', 'z']);
    });
  });

  describe('safeJsonParse', () => {
    test('should parse valid JSON', () => {
      const result = safeJsonParse('{"key":"value"}');
      expect(result).toEqual({ key: 'value' });
    });

    test('should return empty object for invalid JSON', () => {
      const result = safeJsonParse('invalid json');
      expect(result).toEqual({});
    });
  });

  describe('areStringArraysContentsEqual', () => {
    test('should return true for equal arrays', () => {
      expect(areStringArraysContentsEqual(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(true);
    });

    test('should return false for different arrays', () => {
      expect(areStringArraysContentsEqual(['a', 'b'], ['a', 'c'])).toBe(false);
      expect(areStringArraysContentsEqual(['a'], ['a', 'b'])).toBe(false);
    });
  });

  describe('isJson', () => {
    test('should return true for JSON-like objects', () => {
      expect(isJson({ key: 'value' })).toBe(true);
      expect(isJson('{"key":"value"}')).toBe(true);
    });

    test('should return false for non-JSON', () => {
      expect(isJson('not json')).toBe(false);
      expect(isJson(null)).toBe(false);
    });
  });

  describe('isSmallAlphanumericDashCase', () => {
    test('should return true for valid strings', () => {
      expect(isSmallAlphanumericDashCase('test-string')).toBe(true);
      expect(isSmallAlphanumericDashCase('abc123')).toBe(true);
    });

    test('should return false for invalid strings', () => {
      expect(isSmallAlphanumericDashCase('Test-String')).toBe(false);
      expect(isSmallAlphanumericDashCase('test_string')).toBe(false);
    });
  });

  describe('isValidJson', () => {
    test('should validate JSON strings', () => {
      expect(isValidJson('{"key":"value"}')).toBe(true);
      expect(isValidJson({ key: 'value' })).toBe(true);
    });

    test('should return false for invalid JSON', () => {
      expect(isValidJson('invalid')).toBe(false);
    });
  });

  describe('serialize', () => {});

  describe('getUniqueDuplicates', () => {
    test('should return unique duplicate values', () => {
      expect(getUniqueDuplicates([1, 2, 2, 3, 3, 3])).toEqual([2, 3]);
    });

    test('should return empty array for unique values', () => {
      expect(getUniqueDuplicates([1, 2, 3])).toEqual([]);
    });
  });

  describe('hasDuplicates', () => {
    test('should detect duplicates', () => {
      expect(hasDuplicates([1, 2, 2, 3])).toBe(true);
    });

    test('should return false for unique values', () => {
      expect(hasDuplicates([1, 2, 3])).toBe(false);
    });
  });

  describe('isNumeric', () => {
    test('should return true for numbers', () => {
      expect(isNumeric(123)).toBe(true);
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('12.34')).toBe(true);
    });

    test('should return false for non-numeric', () => {
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric('')).toBe(false);
    });
  });

  describe('replaceAll', () => {
    test('should replace all occurrences', () => {
      expect(replaceAll('a', 'b', 'aaa')).toBe('bbb');
      expect(replaceAll('test', 'demo', 'test test')).toBe('demo demo');
    });
  });

  describe('isAlphanumeric', () => {
    test('should validate alphanumeric strings', () => {
      expect(isAlphanumeric('abc123')).toBe(true);
      expect(isAlphanumeric('ABC')).toBe(true);
    });

    test('should return false for non-alphanumeric', () => {
      expect(isAlphanumeric('abc-123')).toBe(false);
      expect(isAlphanumeric('abc_123')).toBe(false);
    });
  });

  describe('definedValueOr', () => {
    test('should return value if defined', () => {
      expect(definedValueOr('value', 'default')).toBe('value');
      expect(definedValueOr(0, 'default')).toBe(0);
    });

    test('should return default if undefined', () => {
      expect(definedValueOr(undefined, 'default')).toBe('default');
    });
  });

  describe('removeDuplicates', () => {
    test('should remove duplicate values', () => {
      expect(removeDuplicates([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4]);
    });
  });

  describe('isOlderThanSeconds', () => {
    test('should check if date is older than specified seconds', () => {
      const oldDate = new Date(Date.now() - 10000).toISOString();
      expect(isOlderThanSeconds(oldDate, 5)).toBe(true);
    });

    test('should return false for recent dates', () => {
      const recentDate = new Date().toISOString();
      expect(isOlderThanSeconds(recentDate, 100)).toBe(false);
    });
  });

  describe('capitalizeFirstLetter', () => {
    test('should capitalize first letter', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
      expect(capitalizeFirstLetter('test')).toBe('Test');
    });
  });

  describe('hasProperties', () => {
    test('should return true for objects with properties', () => {
      expect(hasProperties({ key: 'value' })).toBe(true);
    });

    test('should return false for empty objects', () => {
      expect(hasProperties({})).toBe(false);
      expect(hasProperties(null)).toBe(false);
    });
  });

  describe('getLastSplitPart', () => {
    test('should get last part of split string', () => {
      expect(getLastSplitPart('a-b-c', '-')).toBe('c');
      expect(getLastSplitPart('path/to/file', '/')).toBe('file');
    });
  });

  describe('chunkArray', () => {
    test('should chunk array into smaller arrays', () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe('getRandomNumberFromInterval', () => {
    test('should return number within interval', () => {
      const num = getRandomNumberFromInterval(1, 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });
  });

  describe('lowerCaseFirstCharacter', () => {
    test('should lowercase first character', () => {
      expect(lowerCaseFirstCharacter('Hello')).toBe('hello');
      expect(lowerCaseFirstCharacter('Test')).toBe('test');
    });
  });

  describe('chunkString', () => {
    test('should chunk string into smaller parts', () => {
      expect(chunkString('abcdefgh', 3)).toEqual(['abc', 'def', 'gh']);
    });
  });

  describe('removeColoringFromString', () => {
    test('should remove ANSI color codes', () => {
      const colored = '\u001B[31mRed Text\u001B[0m';
      expect(removeColoringFromString(colored)).toBe('Red Text');
    });
  });

  describe('transformToCidr', () => {
    test('should convert IP to CIDR', () => {
      expect(transformToCidr({ cidrOrIp: '192.168.1.1' })).toBe('192.168.1.1/32');
    });

    test('should keep existing CIDR', () => {
      expect(transformToCidr({ cidrOrIp: '192.168.1.0/24' })).toBe('192.168.1.0/24');
    });
  });

  describe('getByteSize', () => {
    test('should convert bytes to MB', () => {
      expect(getByteSize(1024 * 1024, 'MB')).toBe(1);
    });

    test('should convert bytes to KB', () => {
      expect(getByteSize(2048, 'KB')).toBe(2);
    });
  });

  describe('isMoreThanOneDefined', () => {
    test('should return true if more than one param is defined', () => {
      expect(isMoreThanOneDefined(1, 2)).toBe(true);
    });

    test('should return false if one or zero params defined', () => {
      expect(isMoreThanOneDefined(1, null, undefined)).toBe(false);
    });
  });

  describe('streamToBuffer', () => {
    test('should convert stream to buffer', async () => {
      const stream = Readable.from(['hello', ' ', 'world']);
      const buffer = await streamToBuffer(stream);
      expect(buffer.toString()).toBe('hello world');
    });
  });

  describe('streamToString', () => {
    test('should convert stream to string', async () => {
      const stream = Readable.from(['test', ' ', 'data']);
      const str = await streamToString(stream);
      expect(str).toBe('test data');
    });
  });

  describe('getFirstAndLastItem', () => {
    test('should get first and last items', () => {
      const result = getFirstAndLastItem([1, 2, 3, 4, 5]);
      expect(result).toEqual({ first: 1, last: 5 });
    });

    test('should handle empty array', () => {
      const result = getFirstAndLastItem([]);
      expect(result).toEqual({ first: null, last: null });
    });
  });

  describe('groupBy', () => {
    test('should group items by key', () => {
      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 }
      ];
      const grouped = groupBy(items, (item) => item.type);
      expect(grouped.a).toHaveLength(2);
      expect(grouped.b).toHaveLength(1);
    });
  });

  describe('applyAll', () => {
    test('should apply all functions in sequence', () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const result = applyAll([add1, multiply2], 5);
      expect(result).toBe(12); // (5 + 1) * 2
    });
  });

  describe('filterDuplicates', () => {
    test('should filter duplicate values', () => {
      const arr = [1, 2, 2, 3, 3, 4];
      const filtered = arr.filter(filterDuplicates);
      expect(filtered).toEqual([1, 2, 3, 4]);
    });
  });

  describe('notEmpty', () => {
    test('should filter null and undefined', () => {
      const arr = [1, null, 2, undefined, 3];
      const filtered = arr.filter(notEmpty);
      expect(filtered).toEqual([1, 2, 3]);
    });
  });
});
