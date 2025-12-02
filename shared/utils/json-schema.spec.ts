import type { Definition } from 'typescript-json-schema';
import { describe, expect, test } from 'bun:test';
import { getTypeDetailsFromNode, resolveRef } from './json-schema';

describe('json-schema utilities', () => {
  describe('resolveRef', () => {
    test('should resolve $ref to definition from schema', () => {
      const schema: Definition = {
        definitions: {
          MyType: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        }
      };

      const node: Definition = {
        $ref: '#/definitions/MyType',
        description: 'A reference'
      };

      const resolved = resolveRef(node, schema);
      expect(resolved.type).toBe('object');
      expect(resolved.properties).toBeDefined();
      expect(resolved.description).toBe('A reference');
    });

    test('should merge node properties with referenced definition', () => {
      const schema: Definition = {
        definitions: {
          BaseType: {
            type: 'string',
            minLength: 5
          }
        }
      };

      const node: Definition = {
        $ref: '#/definitions/BaseType',
        maxLength: 10
      };

      const resolved = resolveRef(node, schema);
      expect(resolved.type).toBe('string');
      expect(resolved.minLength).toBe(5);
      expect(resolved.maxLength).toBe(10);
    });

    test('should return node unchanged if no $ref present', () => {
      const schema: Definition = {
        definitions: {}
      };

      const node: Definition = {
        type: 'string',
        description: 'A string type'
      };

      const resolved = resolveRef(node, schema);
      expect(resolved).toEqual(node);
      expect(resolved).toBe(node);
    });

    test('should handle $ref with various definition names', () => {
      const schema: Definition = {
        definitions: {
          MyComplexType: {
            type: 'number'
          }
        }
      };

      const node: Definition = {
        $ref: '#/definitions/MyComplexType'
      };

      const resolved = resolveRef(node, schema);
      expect(resolved.type).toBe('number');
    });

    test('should preserve original node properties when resolving', () => {
      const schema: Definition = {
        definitions: {
          RefType: {
            type: 'object'
          }
        }
      };

      const node: Definition = {
        $ref: '#/definitions/RefType',
        required: ['field1'],
        additionalProperties: false
      };

      const resolved = resolveRef(node, schema);
      expect(resolved.type).toBe('object');
      expect(resolved.required).toEqual(['field1']);
      expect(resolved.additionalProperties).toBe(false);
    });
  });

  describe('getTypeDetailsFromNode', () => {
    test('should extract type and enum values when enum is present', () => {
      const node: Definition = {
        type: 'string',
        enum: ['red', 'green', 'blue']
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['string']);
      expect(result.allowedValues).toEqual(['red', 'green', 'blue']);
    });

    test('should handle numeric enums', () => {
      const node: Definition = {
        type: 'number',
        enum: [1, 2, 3, 5, 8]
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['number']);
      expect(result.allowedValues).toEqual([1, 2, 3, 5, 8]);
    });

    test('should handle mixed enum values', () => {
      const node: Definition = {
        type: 'string',
        enum: ['option1', 2, 'option3']
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['string']);
      expect(result.allowedValues).toEqual(['option1', 2, 'option3']);
    });

    test('should handle array of types', () => {
      const node: Definition = {
        type: ['string', 'number']
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['string', 'number']);
      expect(result.allowedValues).toBeUndefined();
    });

    test('should handle array of types with null', () => {
      const node: Definition = {
        type: ['string', 'null']
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['string', 'null']);
      expect(result.allowedValues).toBeUndefined();
    });

    test('should handle single type without enum', () => {
      const node: Definition = {
        type: 'string'
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['string']);
      expect(result.allowedValues).toBeUndefined();
    });

    test('should handle object type', () => {
      const node: Definition = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['object']);
      expect(result.allowedValues).toBeUndefined();
    });

    test('should handle array type', () => {
      const node: Definition = {
        type: 'array',
        items: { type: 'string' }
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['array']);
      expect(result.allowedValues).toBeUndefined();
    });

    test('should handle boolean type', () => {
      const node: Definition = {
        type: 'boolean'
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['boolean']);
      expect(result.allowedValues).toBeUndefined();
    });

    test('should handle null type', () => {
      const node: Definition = {
        type: 'null'
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['null']);
      expect(result.allowedValues).toBeUndefined();
    });

    test('should prioritize enum over simple type', () => {
      const node: Definition = {
        type: 'string',
        enum: ['value1', 'value2']
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedValues).toBeDefined();
      expect(result.allowedValues).toEqual(['value1', 'value2']);
    });

    test('should handle empty enum array', () => {
      const node: Definition = {
        type: 'string',
        enum: []
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['string']);
      expect(result.allowedValues).toEqual([]);
    });

    test('should handle multiple types (union types)', () => {
      const node: Definition = {
        type: ['string', 'number', 'boolean']
      };

      const result = getTypeDetailsFromNode(node);
      expect(result.allowedTypes).toEqual(['string', 'number', 'boolean']);
      expect(result.allowedTypes.length).toBe(3);
    });

    test('should always return allowedTypes property', () => {
      const node: Definition = {
        type: 'string'
      };

      const result = getTypeDetailsFromNode(node);
      expect(result).toHaveProperty('allowedTypes');
    });

    test('should return allowedValues only when enum is present', () => {
      const nodeWithoutEnum: Definition = {
        type: 'string'
      };
      const nodeWithEnum: Definition = {
        type: 'string',
        enum: ['a', 'b']
      };

      const resultWithoutEnum = getTypeDetailsFromNode(nodeWithoutEnum);
      const resultWithEnum = getTypeDetailsFromNode(nodeWithEnum);

      expect(resultWithoutEnum.allowedValues).toBeUndefined();
      expect(resultWithEnum.allowedValues).toBeDefined();
    });
  });
});
