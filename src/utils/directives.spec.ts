import { describe, expect, test } from 'bun:test';
import {
  getDirectiveName,
  getDirectiveParams,
  getDirectivePathToProp,
  getDirectiveWithoutPath,
  getIsDirective,
  getIsValidDirectiveName,
  startsLikeDirective,
  startsLikeDirectiveNotUsableInSub,
  startsLikeGetParamDirective
} from './directives';

describe('startsLikeDirective', () => {
  test('should return true for valid directive syntax', () => {
    expect(startsLikeDirective('$ResourceParam(')).toBe(true);
    expect(startsLikeDirective('$CfFormat(')).toBe(true);
    expect(startsLikeDirective('$OtherDirective(')).toBe(true);
  });

  test('should return false for non-directive strings', () => {
    expect(startsLikeDirective('ResourceParam')).toBe(false);
    expect(startsLikeDirective('$ResourceParam')).toBe(false);
    expect(startsLikeDirective('test')).toBe(false);
  });
});

describe('startsLikeDirectiveNotUsableInSub', () => {
  test('should return true for CfFormat directive', () => {
    expect(startsLikeDirectiveNotUsableInSub('$CfFormat(')).toBe(true);
    expect(startsLikeDirectiveNotUsableInSub('$CfFormat()')).toBe(true);
  });

  test('should return false for other directives', () => {
    expect(startsLikeDirectiveNotUsableInSub('$ResourceParam(')).toBe(false);
    expect(startsLikeDirectiveNotUsableInSub('$OtherDirective(')).toBe(false);
  });
});

describe('startsLikeGetParamDirective', () => {
  test('should return true for ResourceParam directive', () => {
    expect(startsLikeGetParamDirective('$ResourceParam(')).toBe(true);
    expect(startsLikeGetParamDirective('$ResourceParam()')).toBe(true);
  });

  test('should return false for other directives', () => {
    expect(startsLikeGetParamDirective('$CfFormat(')).toBe(false);
    expect(startsLikeGetParamDirective('$OtherDirective(')).toBe(false);
  });
});

describe('getIsDirective', () => {
  test('should return true for valid directives', () => {
    expect(getIsDirective('$ResourceParam()')).toBe(true);
    expect(getIsDirective('$CfFormat()')).toBe(true);
    expect(getIsDirective("$ResourceParam('param')")).toBe(true);
  });

  test('should return true for directives with property paths', () => {
    expect(getIsDirective('$ResourceParam().property')).toBe(true);
    expect(getIsDirective('$ResourceParam().property.nested')).toBe(true);
  });

  test('should return false for non-string values', () => {
    expect(getIsDirective(123)).toBe(false);
    expect(getIsDirective(null)).toBe(false);
    expect(getIsDirective(undefined)).toBe(false);
    expect(getIsDirective({})).toBe(false);
  });

  test('should return false for invalid directive syntax', () => {
    expect(getIsDirective('$ResourceParam')).toBe(false);
    expect(getIsDirective('$ResourceParam(')).toBe(false);
    expect(getIsDirective('ResourceParam()')).toBe(false);
    expect(getIsDirective('$ResourceParam()invalid')).toBe(false);
  });
});

describe('getDirectivePathToProp', () => {
  test('should extract property path from directive', () => {
    expect(getDirectivePathToProp('$ResourceParam().property')).toEqual(['property']);
    expect(getDirectivePathToProp('$ResourceParam().property.nested')).toEqual(['property', 'nested']);
    expect(getDirectivePathToProp('$ResourceParam().a.b.c')).toEqual(['a', 'b', 'c']);
  });

  test('should return empty array for directives without path', () => {
    expect(getDirectivePathToProp('$ResourceParam()')).toEqual([]);
    expect(getDirectivePathToProp("$ResourceParam('param')")).toEqual([]);
  });
});

describe('getDirectiveWithoutPath', () => {
  test('should remove property path from directive', () => {
    expect(getDirectiveWithoutPath('$ResourceParam().property')).toBe('$ResourceParam()');
    expect(getDirectiveWithoutPath('$ResourceParam().property.nested')).toBe('$ResourceParam()');
  });

  test('should return directive as-is if no path', () => {
    expect(getDirectiveWithoutPath('$ResourceParam()')).toBe('$ResourceParam()');
    expect(getDirectiveWithoutPath("$ResourceParam('param')")).toBe("$ResourceParam('param')");
  });
});

describe('getDirectiveName', () => {
  test('should extract directive name', () => {
    expect(getDirectiveName('$ResourceParam(')).toBe('ResourceParam');
    expect(getDirectiveName('$CfFormat(')).toBe('CfFormat');
    expect(getDirectiveName('$OtherDirective()')).toBe('OtherDirective');
  });
});

describe('getIsValidDirectiveName', () => {
  test('should return true for valid directive names', () => {
    expect(getIsValidDirectiveName('ResourceParam')).toBe(true);
    expect(getIsValidDirectiveName('CfFormat')).toBe(true);
    expect(getIsValidDirectiveName('_privateDirective')).toBe(true);
    expect(getIsValidDirectiveName('$dollarDirective')).toBe(true);
    expect(getIsValidDirectiveName('Directive123')).toBe(true);
  });

  test('should return false for invalid directive names', () => {
    expect(getIsValidDirectiveName('123Invalid')).toBe(false);
    expect(getIsValidDirectiveName('invalid-name')).toBe(false);
    expect(getIsValidDirectiveName('invalid.name')).toBe(false);
  });
});

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
