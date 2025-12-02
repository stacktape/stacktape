import { describe, expect, test } from 'bun:test';
import {
  dereferenceJsonSchemaObject,
  getDefinitionNameFromRefPath,
  getPrettyResourceName,
  getResourceCategory,
  isAnyOfObject,
  isRefObject
} from './schema-parsing';

describe('schema-parsing', () => {
  describe('getDefinitionNameFromRefPath', () => {
    test('should extract definition name from ref path', () => {
      const name = getDefinitionNameFromRefPath('#/definitions/FunctionDefinition');
      expect(name).toBe('FunctionDefinition');
    });

    test('should return last segment of path', () => {
      const name = getDefinitionNameFromRefPath('components/schemas/WebService');
      expect(name).toBe('WebService');
    });
  });

  describe('isRefObject', () => {
    test('should return true for ref objects', () => {
      expect(isRefObject({ $ref: '#/definitions/Test' })).toBe(true);
    });
  });

  describe('isAnyOfObject', () => {
    test('should return true for anyOf objects', () => {
      expect(isAnyOfObject({ anyOf: [{ type: 'string' }] })).toBe(true);
    });
  });

  describe('dereferenceJsonSchemaObject', () => {
    test('should return empty object for null input', () => {
      expect(dereferenceJsonSchemaObject(null)).toEqual({});
    });

    test('should return object as-is if not a ref', () => {
      const obj = { type: 'string', minLength: 1 };
      expect(dereferenceJsonSchemaObject(obj)).toEqual(obj);
    });
  });

  describe('getResourceCategory', () => {
    test('should categorize compute resources', () => {
      expect(getResourceCategory('function')).toBe('compute-resource');
      expect(getResourceCategory('web-service')).toBe('compute-resource');
      expect(getResourceCategory('batch-job')).toBe('compute-resource');
    });

    test('should categorize database resources', () => {
      expect(getResourceCategory('relational-database')).toBe('database-resource');
      expect(getResourceCategory('dynamo-db-table')).toBe('database-resource');
      expect(getResourceCategory('redis-cluster')).toBe('database-resource');
    });

    test('should categorize security resources', () => {
      expect(getResourceCategory('web-app-firewall')).toBe('security-resource');
      expect(getResourceCategory('user-auth-pool')).toBe('security-resource');
      expect(getResourceCategory('bastion')).toBe('security-resource');
    });

    test('should categorize 3rd party resources', () => {
      expect(getResourceCategory('mongo-db-atlas-cluster')).toBe('3rd-party-resource');
      expect(getResourceCategory('upstash-redis')).toBe('3rd-party-resource');
    });

    test('should categorize other resources', () => {
      expect(getResourceCategory('bucket')).toBe('other-resource');
      expect(getResourceCategory('event-bus')).toBe('other-resource');
    });
  });

  describe('getPrettyResourceName', () => {
    test('should prettify resource names', () => {
      expect(getPrettyResourceName('web-service')).toContain('Web');
    });

    test('should handle SQS special case', () => {
      expect(getPrettyResourceName('sqs-queue')).toContain('SQS');
    });

    test('should handle SNS special case', () => {
      expect(getPrettyResourceName('sns-topic')).toContain('SNS');
    });

    test('should replace Relational Database with SQL database', () => {
      expect(getPrettyResourceName('relational-database')).toContain('SQL database');
    });

    test('should replace Event Bus with EventBridge', () => {
      expect(getPrettyResourceName('event-bus')).toContain('EventBridge');
    });
  });
});
