import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';
import { generateCloudFormationTypes } from './generate-cloudformation-types';

const tempDirs: string[] = [];

const generateFromSchema = (schema: Record<string, unknown>): string => {
  const dir = mkdtempSync(join(tmpdir(), 'stacktape-cf-types-'));
  tempDirs.push(dir);
  const schemaPath = join(dir, 'schema.json');
  const outputPath = join(dir, 'Generated.ts');
  writeFileSync(schemaPath, JSON.stringify(schema));
  generateCloudFormationTypes(schemaPath, outputPath);
  return readFileSync(outputPath, 'utf-8');
};

/** Parse-level diagnostics only; these generated modules declare types and reference nothing else. */
const syntaxErrorsIn = (generated: string): string[] =>
  ts
    .transpileModule(generated, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 } })
    .diagnostics!.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));

/**
 * Types and comments erased. A module that only declares types must emit nothing, so anything left here
 * is schema text that escaped its comment and became executable code.
 */
const emittedJavaScript = (generated: string): string =>
  ts.transpileModule(generated, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, removeComments: true }
  }).outputText;

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('CloudFormation type generation escapes hostile schema text', () => {
  test('keeps a regex pattern that ends a comment block from breaking the file', () => {
    // The real AWS::SageMaker::Domain pattern: `)*` followed by `/` is a comment terminator.
    const generated = generateFromSchema({
      typeName: 'AWS::SageMaker::Domain',
      properties: {
        DefaultImageVersionArn: {
          type: 'string',
          pattern: '^arn:aws(-[\\w]+)*:sagemaker:.+:[0-9]{12}:image-version/[a-z0-9]([-.]?[a-z0-9])*/[0-9]+$'
        }
      }
    });

    expect(syntaxErrorsIn(generated)).toEqual([]);
    expect(generated).toContain('*\\/[0-9]+$');
    expect(generated).toContain('export type AwsSagemakerDomain');
    // The unescaped terminator is what used to end the block and spill the pattern into the file.
    expect(generated).not.toContain(')*/[0-9]+$');
    // Only the empty-module marker survives: nothing from the pattern became executable.
    expect(emittedJavaScript(generated).trim()).toBe('export {};');
  });

  test('escapes comment terminators in descriptions, defaults and enums', () => {
    const generated = generateFromSchema({
      typeName: 'AWS::Hostile::Resource',
      description: 'Closes here */ and then export const oops = 1;',
      properties: {
        Documented: {
          type: 'string',
          description: 'A glob such as **/*.ts */ breaks the block',
          default: 'a*/b',
          enum: ['x*/y', 'plain']
        }
      }
    });

    expect(syntaxErrorsIn(generated)).toEqual([]);
    // The injected statement stays documentation instead of becoming a top-level declaration.
    expect(emittedJavaScript(generated)).not.toContain('oops');
    expect(generated).toContain('Closes here *\\/ and then');
    expect(generated).toContain('@default "a*\\/b"');
    expect(generated).toContain('@enum ["x*\\/y","plain"]');
    // The escaping is presentational only: the emitted literal union is untouched.
    expect(generated).toContain('Documented?: "x*/y" | "plain";');
  });

  test('folds line breaks so single-line JSDoc stays on one line', () => {
    const generated = generateFromSchema({
      typeName: 'AWS::Hostile::Multiline',
      properties: {
        Pattern: { type: 'string', pattern: '^a$\n^b$' }
      }
    });

    expect(syntaxErrorsIn(generated)).toEqual([]);
    expect(generated).toContain('/** @pattern ^a$ ^b$ */');
  });

  test('leaves ordinary schema text unchanged', () => {
    const generated = generateFromSchema({
      typeName: 'AWS::Lambda::Function',
      description: 'Resource Type definition for AWS::Lambda::Function',
      required: ['FunctionName'],
      properties: {
        FunctionName: { type: 'string', description: 'The name of the function.', minLength: 1 },
        MemorySize: { type: 'integer', minimum: 128, maximum: 10240 }
      }
    });

    expect(syntaxErrorsIn(generated)).toEqual([]);
    expect(generated).toContain('/** Resource Type definition for AWS::Lambda::Function */');
    expect(generated).toContain('FunctionName: string;');
    expect(generated).toContain('MemorySize?: number;');
    expect(generated).not.toContain('\\/');
  });
});
