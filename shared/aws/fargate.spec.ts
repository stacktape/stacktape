import { describe, expect, test } from 'bun:test';
import { ALLOWED_MEMORY_VALUES_FOR_CPU } from './fargate';

describe('fargate', () => {
  describe('ALLOWED_MEMORY_VALUES_FOR_CPU', () => {
    test('should define memory values for 0.25 vCPU', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['0.25'];
      expect(values).toEqual([512, 1024, 2048]);
    });

    test('should define memory values for 0.5 vCPU', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['0.5'];
      expect(values).toEqual([1024, 2048, 3072, 4096]);
    });

    test('should define memory values for 1 vCPU', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['1'];
      expect(values).toEqual([2048, 3072, 4096, 5120, 6144, 7168, 8192]);
    });

    test('should define memory values for 2 vCPU', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['2'];
      expect(values).toHaveLength(13);
      expect(values[0]).toBe(4096);
      expect(values[values.length - 1]).toBe(16384);
    });

    test('should define memory values for 4 vCPU', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['4'];
      expect(values).toHaveLength(23);
      expect(values[0]).toBe(8192);
      expect(values[values.length - 1]).toBe(30720);
    });

    test('should define memory values for 8 vCPU', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['8'];
      expect(values).toHaveLength(12);
      expect(values[0]).toBe(16384); // 4 * 4096
      expect(values[values.length - 1]).toBe(61440); // 15 * 4096
    });

    test('should define memory values for 16 vCPU', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['16'];
      expect(values).toHaveLength(12);
      expect(values[0]).toBe(32768); // 4 * 8192
      expect(values[values.length - 1]).toBe(122880); // 15 * 8192
    });

    test('should have all CPU configurations', () => {
      const cpuValues = Object.keys(ALLOWED_MEMORY_VALUES_FOR_CPU);
      expect(cpuValues).toHaveLength(7);
      expect(cpuValues).toContain('0.25');
      expect(cpuValues).toContain('0.5');
      expect(cpuValues).toContain('1');
      expect(cpuValues).toContain('2');
      expect(cpuValues).toContain('4');
      expect(cpuValues).toContain('8');
      expect(cpuValues).toContain('16');
    });

    test('minimum memory should increase with CPU', () => {
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['0.25'][0]).toBe(512);
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['0.5'][0]).toBe(1024);
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['1'][0]).toBe(2048);
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['2'][0]).toBe(4096);
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['4'][0]).toBe(8192);
    });

    test('memory values should be in ascending order', () => {
      Object.values(ALLOWED_MEMORY_VALUES_FOR_CPU).forEach((values) => {
        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBeGreaterThan(values[i - 1]);
        }
      });
    });

    test('should have overlapping memory ranges', () => {
      // 0.5 vCPU can use 2048, same as 1 vCPU minimum
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['0.5']).toContain(2048);
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['1']).toContain(2048);
    });

    test('should allow 8GB (8192 MB) for 1 vCPU', () => {
      expect(ALLOWED_MEMORY_VALUES_FOR_CPU['1']).toContain(8192);
    });

    test('8 vCPU values should be multiples of 4096', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['8'];
      values.forEach((value) => {
        expect(value % 4096).toBe(0);
      });
    });

    test('16 vCPU values should be multiples of 8192', () => {
      const values = ALLOWED_MEMORY_VALUES_FOR_CPU['16'];
      values.forEach((value) => {
        expect(value % 8192).toBe(0);
      });
    });

    test('should define maximum memory for each CPU tier', () => {
      const maxMemory = {
        '0.25': 2048,
        '0.5': 4096,
        '1': 8192,
        '2': 16384,
        '4': 30720,
        '8': 61440,
        '16': 122880
      };

      Object.entries(maxMemory).forEach(([cpu, expectedMax]) => {
        const values = ALLOWED_MEMORY_VALUES_FOR_CPU[cpu];
        expect(values[values.length - 1]).toBe(expectedMax);
      });
    });
  });
});
