/**
 * The Terraform importer: concepts and sizes, never a 1:1 translation.
 *
 * Properties under protection: a declared database arrives with its engine, version, and instance
 * class; everything stateful is marked live-on-AWS so composition asks before creating a copy; and
 * `var.`-driven values read as absent, never as guesses.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { readTerraformBlocks, terraformProbe } from './terraform';

describe('readTerraformBlocks', () => {
  it('reads flat literal attributes and skips nested blocks and expressions', () => {
    const blocks = readTerraformBlocks(
      [
        'resource "aws_db_instance" "main" {',
        '  engine         = "postgres"',
        '  engine_version = "16.3"',
        '  instance_class = "db.t4g.small"',
        '  allocated_storage = 50',
        '  username       = var.db_user',
        '  tags = {',
        '    Name = "main"',
        '  }',
        '}',
        ''
      ].join('\n')
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'aws_db_instance',
      name: 'main',
      attributes: {
        engine: 'postgres',
        engine_version: '16.3',
        instance_class: 'db.t4g.small',
        allocated_storage: '50'
      }
    });
    // The `var.` reference resolved to nothing rather than to a guess.
    expect(blocks[0]?.attributes.username).toBeUndefined();
    // The nested tags block did not leak its attributes into the resource.
    expect(blocks[0]?.attributes.Name).toBeUndefined();
  });

  it('ignores heredoc braces and resolves only supplied literal references', () => {
    const blocks = readTerraformBlocks(
      [
        'resource "aws_db_instance" "main" {',
        '  engine = var.db_engine',
        '  engine_version = local.db_version',
        '  user_data = <<-SCRIPT',
        '    echo "object={not_hcl}"',
        '  SCRIPT',
        '  instance_class = "db.t4g.small"',
        '}',
        ''
      ].join('\n'),
      { 'var.db_engine': 'postgres', 'local.db_version': '16.4' }
    );

    expect(blocks[0]?.attributes).toMatchObject({
      engine: 'postgres',
      engine_version: '16.4',
      instance_class: 'db.t4g.small'
    });
  });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-terraform-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the terraform probe, end to end', () => {
  let root: string;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('imports the concepts with their sizes and cautious deployment-manifest evidence', async () => {
    root = await makeRepo({
      'infra/main.tf': [
        'resource "aws_db_instance" "main" { # password = "inline-secret-must-not-travel"',
        '  engine         = "postgres"',
        '  engine_version = "16.3"',
        '  instance_class = "db.t4g.small"',
        '}',
        '',
        'resource "aws_elasticache_cluster" "cache" {',
        '  engine    = "redis"',
        '  node_type = "cache.t4g.micro"',
        '}',
        '',
        'resource "aws_sqs_queue" "jobs" {',
        '  name = "jobs"',
        '}',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [terraformProbe] });
    const byKind = Object.fromEntries(facts.dependencies.map((entry) => [entry.kind, entry]));

    expect(byKind.postgres).toMatchObject({
      engineVersion: '16.3',
      sizeHint: { instance: 'db.t4g.small' },
      hostingEvidence: 'deployment-manifest'
    });
    expect(byKind.redis?.sizeHint).toEqual({ instance: 'cache.t4g.micro' });
    expect(byKind.postgres?.currentlyHostedOn).toBeUndefined();
    expect(byKind.queue).toMatchObject({ hostingEvidence: 'deployment-manifest' });
    expect(byKind.queue?.currentlyHostedOn).toBeUndefined();
    expect(JSON.stringify(facts)).not.toContain('inline-secret-must-not-travel');
  });

  it('lets the declared size override the mode profile when the user chooses a new copy', async () => {
    root = await makeRepo({
      'main.tf': [
        'resource "aws_db_instance" "main" {',
        '  engine         = "postgres"',
        '  instance_class = "db.r6g.large"',
        '}',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [terraformProbe] });
    // A declaration is not a live resource claim, but its explicit size still beats a generic
    // profile when composing the declared topology.
    const { config } = composeConfig({
      facts,
      decisions: { 'external-database:mainDatabase': 'create-new' }
    });

    const database = config.resources.mainDatabase?.properties as {
      engine: { properties: { primaryInstance: { instanceSize: string } } };
    };
    expect(database.engine.properties.primaryInstance.instanceSize).toBe('db.r6g.large');
  });

  it('reads nothing from deeper module directories', async () => {
    root = await makeRepo({
      'modules/network/deep/main.tf': 'resource "aws_db_instance" "hidden" {\n  engine = "postgres"\n}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [terraformProbe] });
    expect(facts.dependencies).toEqual([]);
  });

  it('resolves literal variable defaults across files and refuses incompatible engines', async () => {
    root = await makeRepo({
      'infra/variables.tf': [
        'variable "db_engine" {',
        '  default = "postgres"',
        '}',
        'variable "db_size" {',
        '  default = "db.m6g.large"',
        '}',
        ''
      ].join('\n'),
      'infra/main.tf': [
        'resource "aws_db_instance" "main" {',
        '  engine = var.db_engine',
        '  instance_class = var.db_size',
        '}',
        'resource "aws_db_instance" "oracle" {',
        '  engine = "oracle-ee"',
        '}',
        'resource "aws_elasticache_cluster" "sessions" {',
        '  engine = "memcached"',
        '}',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [terraformProbe] });

    expect(facts.dependencies).toHaveLength(1);
    expect(facts.dependencies[0]).toMatchObject({
      kind: 'postgres',
      sizeHint: { instance: 'db.m6g.large' },
      hostingEvidence: 'deployment-manifest'
    });
  });

  it('imports a Lambda HTTP route and variable-to-table wiring without the artifact bucket', async () => {
    root = await makeRepo({
      'src/app.py': 'def lambda_handler(event, context):\n    return {"statusCode": 200}\n',
      'variables.tf': ['variable "dynamodb_table" {', '  default = "Movies"', '}', ''].join('\n'),
      'main.tf': [
        'resource "aws_dynamodb_table" "movie_table" {',
        '  name = var.dynamodb_table',
        '}',
        'resource "aws_s3_bucket" "lambda_bucket" {',
        '  bucket_prefix = "artifacts"',
        '}',
        'resource "aws_lambda_function" "movies" {',
        '  s3_bucket = aws_s3_bucket.lambda_bucket.id',
        '  runtime = "python3.14"',
        '  handler = "app.lambda_handler"',
        '  environment {',
        '    variables = {',
        '      DDB_TABLE = var.dynamodb_table',
        '    }',
        '  }',
        '}',
        'resource "aws_apigatewayv2_integration" "movies" {',
        '  integration_uri = aws_lambda_function.movies.invoke_arn',
        '}',
        'resource "aws_apigatewayv2_route" "post" {',
        '  route_key = "POST /movies"',
        '  target = "integrations/${aws_apigatewayv2_integration.movies.id}"',
        '}',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [terraformProbe] });

    expect(facts.services).toEqual([
      expect.objectContaining({
        name: 'movies',
        functionEntrypoint: 'src/app.py',
        functionTriggers: [{ type: 'http', method: 'POST', path: '/movies' }],
        environmentVariables: [
          expect.objectContaining({ name: 'DDB_TABLE', role: 'infra-dependency', dependencyName: 'mainTable' })
        ]
      })
    ]);
    expect(facts.dependencies).toEqual([
      expect.objectContaining({
        name: 'mainTable',
        kind: 'dynamodb',
        consumedBy: ['movies'],
        addressedBy: ['DDB_TABLE']
      })
    ]);
  });
});
