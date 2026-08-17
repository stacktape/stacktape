import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import type { AgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import { createInitTools, type InitTool, type InitToolContext } from './index';
import { Workspace } from './workspace';

let root: string;
let context: InitToolContext;
let submitted: AgentSubmission[];

const tools = new Map<string, InitTool>(createInitTools().map((tool) => [tool.name, tool]));
const run = async (name: string, args: unknown): Promise<any> => tools.get(name)!.execute(args, context);

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stp-tools-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'apps', 'web'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{"name":"demo","scripts":{"start":"node src/index.ts"}}', 'utf8');
  await writeFile(join(root, 'apps', 'web', 'package.json'), '{"name":"web"}', 'utf8');
  await writeFile(
    join(root, 'src', 'index.ts'),
    ['import express from "express";', 'const app = express();', 'app.listen(4000);'].join('\n'),
    'utf8'
  );
  await writeFile(
    join(root, 'src', 'big.ts'),
    Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n'),
    'utf8'
  );
  await writeFile(
    join(root, '.env'),
    'DATABASE_URL=postgres://\${DATABASE_USER}:\${DATABASE_PASSWORD}@host/db\nPORT=4000\n',
    'utf8'
  );

  const files = ['.env', 'apps/web/package.json', 'package.json', 'src/big.ts', 'src/index.ts'];

  submitted = [];
  context = {
    workspace: new Workspace(root),
    files,
    brief: projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION }),
    onSubmit: (submission) => submitted.push(submission)
  };
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

beforeEach(() => {
  submitted = [];
});

describe('read_file', () => {
  it('returns numbered lines so citations line up with what the agent saw', async () => {
    const result = await run('read_file', { path: 'src/index.ts' });

    expect(result.content).toContain('3\tapp.listen(4000);');
    expect(result.totalLines).toBe(3);
  });

  it('pages a long file and says how to continue', async () => {
    const first = await run('read_file', { path: 'src/big.ts', lineCount: 10 });

    expect(first.startLine).toBe(1);
    expect(first.endLine).toBe(10);
    expect(first.more).toContain('startLine: 11');

    const second = await run('read_file', { path: 'src/big.ts', startLine: 11, lineCount: 5 });
    expect(second.content).toContain('11\tline 11');
  });

  it('returns environment variable names and never a value', async () => {
    const result = await run('read_file', { path: '.env' });

    expect(result.environmentVariableNames).toEqual(['DATABASE_URL', 'PORT']);
    expect(JSON.stringify(result)).not.toContain('hunter2');
  });

  it('refuses to escape the project and says so plainly', async () => {
    const result = await run('read_file', { path: '../../etc/passwd' });

    expect(result.reason).toBe('escapes-repository');
  });
});

describe('grep', () => {
  it('returns matches already shaped like a citation', async () => {
    const result = await run('grep', { pattern: 'app\\.listen' });

    // file + line + quote is exactly the Citation shape, so citing costs the agent nothing extra.
    expect(result.matches[0]).toEqual({ file: 'src/index.ts', line: 3, quote: 'app.listen(4000);' });
  });

  it('never searches inside an environment file', async () => {
    // A regex is a perfectly good way to ask for a secret; this is the door it would come through.
    const result = await run('grep', { pattern: 'hunter2' });

    expect(result.matches).toEqual([]);
  });

  it('reports an invalid expression instead of throwing', async () => {
    expect((await run('grep', { pattern: '([' })).error).toContain('Invalid regular expression');
  });
});

describe('list_dir', () => {
  it('separates directories from files at one level', async () => {
    const result = await run('list_dir', { path: '.' });

    expect(result.directories).toEqual(['apps', 'src']);
    expect(result.files).toEqual(['.env', 'package.json']);
  });
});

describe('submit_facts', () => {
  it('accepts a well-formed submission and hands it to the harness', async () => {
    const result = await run('submit_facts', {
      schemaVersion: 1,
      services: [
        {
          name: 'demo',
          path: '.',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'node src/index.ts',
          evidence: [
            { file: 'src/index.ts', line: 3, quote: 'app.listen(4000);' },
            { file: 'package.json', line: 1, quote: '"start":"node src/index.ts"' }
          ]
        }
      ]
    });

    expect(result).toEqual({ accepted: true });
    expect(submitted).toHaveLength(1);
  });

  it('rejects a cited static page claimed as an HTTP server while the agent can repair it', async () => {
    await writeFile(join(root, 'index.html'), '<!doctype html><html><body>Hello</body></html>', 'utf8');
    context.files = [...context.files, 'index.html'];

    const result = await run('submit_facts', {
      schemaVersion: 1,
      services: [
        {
          name: 'site',
          path: '.',
          language: 'html',
          exposesHttp: true,
          executionModel: 'long-running',
          evidence: [{ file: 'index.html', line: 1, quote: '<!doctype html><html><body>Hello</body></html>' }]
        }
      ]
    });

    expect(result).toMatchObject({ accepted: false });
    expect(JSON.stringify(result)).toContain('exposesHttp');
    expect(submitted).toHaveLength(0);
  });

  it('rejects a container entrypoint that does not implement its claimed HTTP service', async () => {
    await writeFile(
      join(root, 'src', 'context.ts'),
      'import { NestFactory } from "@nestjs/core";\nawait NestFactory.createApplicationContext(class AppModule {});',
      'utf8'
    );
    context.files = [...context.files, 'src/context.ts'];

    const result = await run('submit_facts', {
      schemaVersion: 1,
      services: [
        {
          name: 'api',
          path: '.',
          language: 'typescript',
          exposesHttp: true,
          executionModel: 'long-running',
          containerEntrypoint: 'src/context.ts',
          evidence: [
            {
              file: 'src/context.ts',
              line: 2,
              quote: 'await NestFactory.createApplicationContext(class AppModule {});'
            }
          ]
        }
      ]
    });

    expect(result).toMatchObject({ accepted: false });
    expect(JSON.stringify(result)).toContain('entrypoint file itself');
    expect(submitted).toHaveLength(0);
  });

  it('rejects an unsupported queue claim backed only by an SNS topic', async () => {
    await writeFile(join(root, 'template.yml'), 'Notifications:\n  Type: AWS::SNS::Topic\n', 'utf8');
    context.files = [...context.files, 'template.yml'];

    const result = await run('submit_facts', {
      schemaVersion: 1,
      dependencies: [
        {
          name: 'notifications',
          kind: 'queue',
          evidence: [{ file: 'template.yml', line: 2, quote: 'Type: AWS::SNS::Topic' }]
        }
      ]
    });

    expect(result).toMatchObject({ accepted: false });
    expect(JSON.stringify(result)).toContain('SQS client');
    expect(submitted).toHaveLength(0);
  });

  it('rejects an invented Lambda route even when the handler type is real', async () => {
    await writeFile(
      join(root, 'src', 'handler.ts'),
      'import type { APIGatewayProxyEvent } from "aws-lambda";\nexport const handler = async (_event: APIGatewayProxyEvent) => ({ statusCode: 200 });',
      'utf8'
    );
    context.files = [...context.files, 'src/handler.ts'];

    const result = await run('submit_facts', {
      schemaVersion: 1,
      services: [
        {
          name: 'handler',
          path: 'src',
          language: 'typescript',
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: 'src/handler.ts',
          functionTriggers: [{ type: 'http', method: 'GET', path: '/invented' }],
          evidence: [
            {
              file: 'src/handler.ts',
              line: 1,
              quote: 'import type { APIGatewayProxyEvent } from "aws-lambda";'
            }
          ]
        }
      ]
    });

    expect(result).toMatchObject({ accepted: false });
    expect(JSON.stringify(result)).toContain('/invented');
    expect(submitted).toHaveLength(0);
  });

  it('rejects with specific problems while the model can still fix them', async () => {
    const result = await run('submit_facts', {
      schemaVersion: 1,
      services: [
        { name: 'bad', path: '../escape', language: 'javascript', exposesHttp: true, executionModel: 'long-running' }
      ]
    });

    expect(result.accepted).toBe(false);
    expect(JSON.stringify(result.problems)).toContain('path');
  });

  it('gives the agent no way to claim probe provenance', async () => {
    await run('submit_facts', {
      schemaVersion: 1,
      services: [
        {
          name: 'demo',
          path: '.',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          startCommand: 'node src/index.ts',
          evidence: [
            { file: 'src/index.ts', line: 3, quote: 'app.listen(4000);' },
            { file: 'package.json', line: 1, quote: '"start":"node src/index.ts"' }
          ],
          source: 'probe'
        }
      ]
    });

    expect(JSON.stringify(submitted.at(-1))).not.toContain('probe');
  });
});
