import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateArtifacts, writeArtifacts } from '../scripts/generate.ts';

const artifacts = generateArtifacts();

describe('CloudFormation type generation', () => {
  test('generates one stable module per pinned resource type', () => {
    expect(artifacts.size).toBe(1_723);
    expect(artifacts.has('resources/aws-lambda-function.ts')).toBe(true);
    expect(artifacts.has('resources/aws-iam-role.ts')).toBe(true);
    expect(artifacts.has('resources/aws-s3-bucket.ts')).toBe(true);
  });

  test('includes writable nested definitions but excludes read-only attributes', () => {
    const lambda = artifacts.get('resources/aws-lambda-function.ts')!;
    const lambdaProperties = lambda.slice(
      lambda.indexOf('export type FunctionProperties'),
      lambda.indexOf('\n};', lambda.indexOf('export type FunctionProperties'))
    );

    expect(lambda).toContain('export type Code = {');
    expect(lambda).not.toContain('export type SnapStartResponse = {');
    expect(lambdaProperties).not.toContain('\n  Arn');
    expect(lambdaProperties).not.toContain('\n  SnapStartResponse');
  });

  test('preserves CloudFormation property casing and enum values', () => {
    const lambda = artifacts.get('resources/aws-lambda-function.ts')!;
    expect(lambda).toContain('KmsKeyArn?: CloudFormationValue<string>;');
    expect(lambda).toContain('PackageType?: CloudFormationValue<"Image" | "Zip">;');
  });

  test('exports named nested property types without runtime classes', () => {
    const role = artifacts.get('resources/aws-iam-role.ts')!;
    const bucket = artifacts.get('resources/aws-s3-bucket.ts')!;
    expect(role).toContain('export type Policy = {');
    expect(bucket).toContain('export type CorsConfiguration = {');
    expect(bucket).toContain('export type Rule = {');
    expect(role).not.toContain('class ');
    expect(bucket).not.toContain('class ');
  });

  test('removes stale files when materializing generated output', () => {
    const directory = mkdtempSync(join(tmpdir(), 'stacktape-cloudformation-generation-'));
    try {
      writeFileSync(join(directory, 'stale.ts'), 'stale');
      writeArtifacts(new Map([['current.ts', 'current\n']]), directory);
      expect(existsSync(join(directory, 'stale.ts'))).toBe(false);
      expect(readFileSync(join(directory, 'current.ts'), 'utf8')).toBe('current\n');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
