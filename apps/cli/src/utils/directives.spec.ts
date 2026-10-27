import { describe, expect, test } from 'bun:test';
import { getDirectiveParams, getNestedDirectiveReferences } from './directives';

/**
 * Directive argument parsing is a rule with many meaningful inputs: nesting, quoting, property paths and literal
 * escapes. The config-loading scenarios prove the resolver end to end; this table pins the parser's grammar.
 */
describe('getDirectiveParams', () => {
  describe('basic parameter parsing', () => {
    test('should parse empty parameters', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam()');
      expect(result).toEqual([]);
    });

    test('should parse single string parameter', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam('param1')");
      expect(result).toEqual([{ value: 'param1' }]);
    });

    test('should parse multiple string parameters', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam('param1', 'param2')");
      expect(result).toEqual([{ value: 'param1' }, { value: 'param2' }]);
    });

    test('should parse double-quoted strings', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam("param1", "param2")');
      expect(result).toEqual([{ value: 'param1' }, { value: 'param2' }]);
    });

    test('should parse boolean parameters', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam(true, false)');
      expect(result).toEqual([{ value: true }, { value: false }]);
    });

    test('should parse numeric parameters', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam(123, 456)');
      expect(result).toEqual([{ value: 123 }, { value: 456 }]);
    });

    test('should parse mixed parameter types', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam('text', 123, true, false)");
      expect(result).toEqual([{ value: 'text' }, { value: 123 }, { value: true }, { value: false }]);
    });

    test('should handle extra whitespace', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam(  'param1'  ,  'param2'  )");
      expect(result).toEqual([{ value: 'param1' }, { value: 'param2' }]);
    });
  });

  describe('strings with special characters', () => {
    test('should handle strings with commas', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam('text, with, commas', 'param2')");
      expect(result).toEqual([{ value: 'text, with, commas' }, { value: 'param2' }]);
    });

    test('should handle strings with parentheses', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam('text (with) parens', 'param2')");
      expect(result).toEqual([{ value: 'text (with) parens' }, { value: 'param2' }]);
    });

    test('should handle strings with quotes', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam("text with \'quotes\'", "param2")');
      expect(result).toEqual([{ value: "text with 'quotes'" }, { value: 'param2' }]);
    });
  });

  describe('nested directives - level 2', () => {
    test('should parse directive with nested directive parameter', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam($OtherDirective(), 'param2')");
      expect(result).toEqual([
        { isDirective: true, definition: '$OtherDirective()', name: 'OtherDirective', value: null },
        { value: 'param2' }
      ]);
    });

    test('should parse nested directive with parameters', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam($OtherDirective('nested'), 'param2')");
      expect(result).toEqual([
        { isDirective: true, definition: "$OtherDirective('nested')", name: 'OtherDirective', value: null },
        { value: 'param2' }
      ]);
    });

    test('should parse multiple nested directives', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam($First(), $Second(), 'param3')");
      expect(result).toEqual([
        { isDirective: true, definition: '$First()', name: 'First', value: null },
        { isDirective: true, definition: '$Second()', name: 'Second', value: null },
        { value: 'param3' }
      ]);
    });
  });

  describe('deep nesting - level 3+', () => {
    test('should parse 3-level nested directives', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam($Level2($Level3()), 'param2')");
      expect(result).toEqual([
        { isDirective: true, definition: '$Level2($Level3())', name: 'Level2', value: null },
        { value: 'param2' }
      ]);
    });

    test('should parse 4-level nested directives', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam($L2($L3($L4())), 'param2')");
      expect(result).toEqual([
        { isDirective: true, definition: '$L2($L3($L4()))', name: 'L2', value: null },
        { value: 'param2' }
      ]);
    });

    test('should parse very deep nesting with multiple parameters', () => {
      const result = getDirectiveParams('CfFormat', "$CfFormat($Outer($Middle($Inner('deep'))), 'param2', 'param3')");
      expect(result).toEqual([
        { isDirective: true, definition: "$Outer($Middle($Inner('deep')))", name: 'Outer', value: null },
        { value: 'param2' },
        { value: 'param3' }
      ]);
    });

    test('should parse complex nested structure', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam($A($B(), $C()), $D($E()))');
      expect(result).toEqual([
        { isDirective: true, definition: '$A($B(), $C())', name: 'A', value: null },
        { isDirective: true, definition: '$D($E())', name: 'D', value: null }
      ]);
    });
  });

  describe('property paths on nested directives', () => {
    test('should parse nested directive with property path', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam($OtherDirective().property, 'param2')");
      expect(result).toEqual([
        { isDirective: true, definition: '$OtherDirective().property', name: 'OtherDirective', value: null },
        { value: 'param2' }
      ]);
    });

    test('should parse nested directive with deep property path', () => {
      const result = getDirectiveParams(
        'ResourceParam',
        "$ResourceParam($OtherDirective().property.nested.deep, 'param2')"
      );
      expect(result).toEqual([
        {
          isDirective: true,
          definition: '$OtherDirective().property.nested.deep',
          name: 'OtherDirective',
          value: null
        },
        { value: 'param2' }
      ]);
    });

    test('should parse deeply nested directive with property path', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam($Level2($Level3()).property, 'param2')");
      expect(result).toEqual([
        { isDirective: true, definition: '$Level2($Level3()).property', name: 'Level2', value: null },
        { value: 'param2' }
      ]);
    });
  });

  describe('error cases', () => {
    test('should throw error when directive not found', () => {
      expect(() => {
        getDirectiveParams('ResourceParam', '$OtherDirective()');
      }).toThrow('Cannot find directive $ResourceParam');
    });

    test('should throw error when closing parenthesis missing', () => {
      expect(() => {
        getDirectiveParams('ResourceParam', "$ResourceParam('param1'");
      }).toThrow('Missing closing parenthesis');
    });

    test('should throw error for nested directive with missing closing paren', () => {
      expect(() => {
        getDirectiveParams('ResourceParam', '$ResourceParam($Other(');
      }).toThrow('Missing closing parenthesis');
    });
  });

  describe('real-world examples', () => {
    test('should parse CfFormat with nested directives', () => {
      const result = getDirectiveParams('CfFormat', "$CfFormat('arn:aws:s3:::{0}', $ResourceParam('bucketName'))");
      expect(result).toEqual([
        { value: 'arn:aws:s3:::{0}' },
        { isDirective: true, definition: "$ResourceParam('bucketName')", name: 'ResourceParam', value: null }
      ]);
    });

    test('should parse complex ResourceParam usage', () => {
      const result = getDirectiveParams(
        'ResourceParam',
        "$ResourceParam($GetResource('myResource').outputs.arn, 'fallback')"
      );
      expect(result).toEqual([
        {
          isDirective: true,
          definition: "$GetResource('myResource').outputs.arn",
          name: 'GetResource',
          value: null
        },
        { value: 'fallback' }
      ]);
    });

    test('should handle directive with many nested levels and property paths', () => {
      const result = getDirectiveParams(
        'Format',
        "$Format($Outer($Middle($Inner().prop1).prop2).prop3, 'separator', true)"
      );
      expect(result).toEqual([
        {
          isDirective: true,
          definition: '$Outer($Middle($Inner().prop1).prop2).prop3',
          name: 'Outer',
          value: null
        },
        { value: 'separator' },
        { value: true }
      ]);
    });
  });

  describe('edge cases', () => {
    test('should handle directive at end of string with path', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam($Other().prop).extraPath');
      expect(result).toEqual([{ isDirective: true, definition: '$Other().prop', name: 'Other', value: null }]);
    });

    test('should handle consecutive commas with whitespace', () => {
      const result = getDirectiveParams('ResourceParam', "$ResourceParam('a',  ,  'b')");
      // Empty param between commas is ignored
      expect(result).toEqual([{ value: 'a' }, { value: 'b' }]);
    });

    test('should handle parameters with underscores in property names', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam($Other()._private_prop)');
      expect(result).toEqual([{ isDirective: true, definition: '$Other()._private_prop', name: 'Other', value: null }]);
    });

    test('should parse directive with only nested directives', () => {
      const result = getDirectiveParams('ResourceParam', '$ResourceParam($A(), $B(), $C())');
      expect(result).toEqual([
        { isDirective: true, definition: '$A()', name: 'A', value: null },
        { isDirective: true, definition: '$B()', name: 'B', value: null },
        { isDirective: true, definition: '$C()', name: 'C', value: null }
      ]);
    });
  });
});

describe('JSON-quoted directive arguments', () => {
  test.each([
    ['$Format("it\'s \\"ready\\"")', 'it\'s "ready"'],
    ['$Format("first\\nsecond")', 'first\nsecond'],
    ['$Format("C:\\\\workspace\\\\app")', 'C:\\workspace\\app'],
    ['$Format("\\u00e9")', 'é'],
    ['$Format("C:\\\\workspace\\\\")', 'C:\\workspace\\'],
    ['$Format("C:\\legacy")', 'C:\\legacy']
  ])('decodes %s as its literal value', (definition, value) => {
    expect(getDirectiveParams('Format', definition)).toEqual([{ value }]);
  });
});

// Secret and SSM preflights read these references from the raw config, so a nested one must not be missed.
describe('getNestedDirectiveReferences', () => {
  test.each([
    ["$Secret('cache.password')", ['cache.password']],
    ["$Format('redis://:{}@{}', $Secret('cache.password'), $ResourceParam('cache', 'host'))", ['cache.password']],
    ["$Format('{}-{}', $Secret('a'), $Join(',', $Secret('b.key'), 'x'))", ['a', 'b.key']],
    ['$CfFormat(\'{}\', $Secret("quoted"))', ['quoted']],
    ["$Format('$Secret(not-a-directive)')", []],
    ["$Secret($Format('{}-db', $Stage()))", []],
    ['plain string', []],
    [42, []]
  ])('finds the secrets in %p', (node, references) => {
    expect(getNestedDirectiveReferences(node, 'Secret')).toEqual(references);
  });

  test('reads another directive by name', () => {
    expect(getNestedDirectiveReferences("$Format('{}:{}', $SsmParam('/app/host'), $Secret('x'))", 'SsmParam')).toEqual([
      '/app/host'
    ]);
  });
});
