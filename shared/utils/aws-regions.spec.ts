import { describe, expect, test } from 'bun:test';
import { awsRegions } from './aws-regions';

describe('aws-regions', () => {
  describe('awsRegions array', () => {
    test('should be an array', () => {
      expect(Array.isArray(awsRegions)).toBe(true);
    });

    test('should not be empty', () => {
      expect(awsRegions.length).toBeGreaterThan(0);
    });

    test('should contain expected number of regions', () => {
      expect(awsRegions.length).toBeGreaterThanOrEqual(20);
    });

    test('all entries should have description and code', () => {
      awsRegions.forEach((region) => {
        expect(region).toHaveProperty('description');
        expect(region).toHaveProperty('code');
        expect(typeof region.description).toBe('string');
        expect(typeof region.code).toBe('string');
      });
    });

    test('all region codes should match AWS format', () => {
      awsRegions.forEach((region) => {
        expect(region.code).toMatch(/^[a-z]{2}-[a-z]+-\d+$/);
      });
    });

    test('all descriptions should be non-empty', () => {
      awsRegions.forEach((region) => {
        expect(region.description.length).toBeGreaterThan(0);
      });
    });

    test('should contain major US regions', () => {
      const regionCodes = awsRegions.map((r) => r.code);
      expect(regionCodes).toContain('us-east-1');
      expect(regionCodes).toContain('us-east-2');
      expect(regionCodes).toContain('us-west-1');
      expect(regionCodes).toContain('us-west-2');
    });

    test('should contain major EU regions', () => {
      const regionCodes = awsRegions.map((r) => r.code);
      expect(regionCodes).toContain('eu-west-1');
      expect(regionCodes).toContain('eu-west-2');
      expect(regionCodes).toContain('eu-central-1');
    });

    test('should contain major Asia Pacific regions', () => {
      const regionCodes = awsRegions.map((r) => r.code);
      expect(regionCodes).toContain('ap-southeast-1');
      expect(regionCodes).toContain('ap-southeast-2');
      expect(regionCodes).toContain('ap-northeast-1');
    });

    test('region codes should be unique', () => {
      const codes = awsRegions.map((r) => r.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    test('us-east-1 should have correct description', () => {
      const usEast1 = awsRegions.find((r) => r.code === 'us-east-1');
      expect(usEast1).toBeDefined();
      expect(usEast1?.description).toContain('Virginia');
    });

    test('eu-west-1 should have correct description', () => {
      const euWest1 = awsRegions.find((r) => r.code === 'eu-west-1');
      expect(euWest1).toBeDefined();
      expect(euWest1?.description).toContain('Ireland');
    });

    test('should contain Canada region', () => {
      const canadaRegion = awsRegions.find((r) => r.code === 'ca-central-1');
      expect(canadaRegion).toBeDefined();
      expect(canadaRegion?.description).toContain('Canada');
    });

    test('should contain South America region', () => {
      const saRegion = awsRegions.find((r) => r.code === 'sa-east-1');
      expect(saRegion).toBeDefined();
      expect(saRegion?.description).toContain('São Paulo');
    });

    test('should contain Africa region', () => {
      const africaRegion = awsRegions.find((r) => r.code === 'af-south-1');
      expect(africaRegion).toBeDefined();
      expect(africaRegion?.description).toContain('Africa');
    });

    test('should contain Middle East region', () => {
      const meRegion = awsRegions.find((r) => r.code === 'me-south-1');
      expect(meRegion).toBeDefined();
      expect(meRegion?.description).toContain('Middle East');
    });
  });
});
