import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileTemplatePreview, parseTemplatePreviewOutput } from './compile';
import { RESULT_MARKER } from './protocol';

/** The child module under Bun with the repository's network guard, as the wizard's fixture starts it. */
const CHILD = {
  command: process.execPath,
  args: [
    '--preload',
    join(import.meta.dir, '..', '..', '..', 'scripts', 'network-guard-preload.ts'),
    join(import.meta.dir, 'child.ts')
  ]
};

const config = {
  projectName: 'preview',
  resources: {
    mainDatabase: {
      type: 'relational-database',
      properties: {
        credentials: { masterUserName: 'stacktape', masterUserPassword: "$Secret('preview-db.password')" },
        engine: { type: 'postgres', properties: { primaryInstance: { instanceSize: 'db.t4g.micro' }, version: '18' } },
        deletionProtection: true
      }
    },
    api: {
      type: 'web-service',
      properties: {
        packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } },
        resources: { cpu: 0.25, memory: 512 },
        connectTo: ['mainDatabase']
      }
    }
  }
};

describe('compileTemplatePreview', () => {
  test('compiles the template offline, its resources grouped by the resource they are for', async () => {
    const workingDir = await mkdtemp(join(tmpdir(), 'stacktape-template-preview-'));
    try {
      await writeFile(join(workingDir, 'index.ts'), 'export {};\n');
      const result = await compileTemplatePreview(
        { config, projectName: 'preview', stage: 'dev', region: 'eu-west-1', workingDir, consoleConnected: false },
        CHILD
      );
      if ('error' in result) throw new Error(result.error);
      expect(result.text).toContain('AWS::RDS::DBInstance');
      // A secret is referenced, never read: the template has the reference a deploy resolves.
      expect(result.text).toContain('{{resolve:secretsmanager:preview-db:SecretString:password::}}');
      expect(result.owners.MainDatabaseDbInstance).toBe('mainDatabase');
      // Listed under the stack, but named for the database.
      expect(result.owners.MainDatabaseDeletionProtectionCustomResource).toBe('mainDatabase');
      // The database's resources come first, then the service's, then the stack's own.
      const resources = [...result.text.split('Outputs:')[0]!.matchAll(/^ {2}(\w+):$/gm)].map((match) => match[1]!);
      const owners = resources.map((logicalId) => result.owners[logicalId] ?? 'stack');
      expect(owners.indexOf('api')).toBeGreaterThan(owners.lastIndexOf('mainDatabase'));
      expect(owners.indexOf('stack')).toBeGreaterThan(owners.lastIndexOf('api'));
    } finally {
      await rm(workingDir, { recursive: true, force: true });
    }
  }, 60_000);

  test('a configuration that does not compile says why', async () => {
    const result = await compileTemplatePreview(
      {
        config: { resources: { api: { type: 'no-such-type', properties: {} } } },
        projectName: 'preview',
        stage: 'dev',
        region: 'eu-west-1',
        workingDir: tmpdir(),
        consoleConnected: false
      },
      CHILD
    );
    expect(result).toMatchObject({ ok: false, error: expect.any(String) });
  }, 60_000);

  test('only the marked line is the result, whatever else the child printed', () => {
    const stdout = `[!] a warning\n${RESULT_MARKER}${JSON.stringify({ ok: true, text: 'Resources: {}', owners: {} })}\n`;
    expect(parseTemplatePreviewOutput(stdout)).toEqual({ ok: true, text: 'Resources: {}', owners: {} });
    expect(parseTemplatePreviewOutput('no result')).toBeUndefined();
  });
});
