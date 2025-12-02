import { describe, expect, test } from 'bun:test';
import { getAssumeRolePolicyDocumentForFunctionRole } from './roles';

describe('roles utilities', () => {
  describe('getAssumeRolePolicyDocumentForFunctionRole', () => {
    test('should return a policy document object', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(typeof policyDoc).toBe('object');
      expect(policyDoc).not.toBeNull();
    });

    test('should have Statement array', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(Array.isArray(policyDoc.Statement)).toBe(true);
      expect(policyDoc.Statement.length).toBeGreaterThan(0);
    });

    test('should have correct Version', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(policyDoc.Version).toBe('2012-10-17');
    });

    test('Statement should have Effect Allow', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(policyDoc.Statement[0].Effect).toBe('Allow');
    });

    test('Statement should have Principal with Service', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(policyDoc.Statement[0].Principal).toBeDefined();
      expect(policyDoc.Statement[0].Principal.Service).toBeDefined();
      expect(Array.isArray(policyDoc.Statement[0].Principal.Service)).toBe(true);
    });

    test('Principal Service should include lambda.amazonaws.com', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(policyDoc.Statement[0].Principal.Service).toContain('lambda.amazonaws.com');
    });

    test('Principal Service should include edgelambda.amazonaws.com', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(policyDoc.Statement[0].Principal.Service).toContain('edgelambda.amazonaws.com');
    });

    test('Statement should have Action sts:AssumeRole', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      expect(policyDoc.Statement[0].Action).toBe('sts:AssumeRole');
    });

    test('should return a new object on each call', () => {
      const policyDoc1 = getAssumeRolePolicyDocumentForFunctionRole();
      const policyDoc2 = getAssumeRolePolicyDocumentForFunctionRole();
      expect(policyDoc1).not.toBe(policyDoc2);
    });

    test('returned objects should be equal in structure', () => {
      const policyDoc1 = getAssumeRolePolicyDocumentForFunctionRole();
      const policyDoc2 = getAssumeRolePolicyDocumentForFunctionRole();
      expect(JSON.stringify(policyDoc1)).toBe(JSON.stringify(policyDoc2));
    });

    test('policy document should be valid JSON serializable', () => {
      const policyDoc = getAssumeRolePolicyDocumentForFunctionRole();
      const serialized = JSON.stringify(policyDoc);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.Version).toBe('2012-10-17');
      expect(deserialized.Statement[0].Effect).toBe('Allow');
    });
  });
});
