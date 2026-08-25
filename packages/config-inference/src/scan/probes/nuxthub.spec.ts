import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { manifestProbe } from './manifest';
import { nuxtHubProbe } from './nuxthub';

const PROBES = [manifestProbe, nuxtHubProbe];
let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-nuxthub-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

const manifest = (extraDependencies: Record<string, string> = {}): string =>
  JSON.stringify({
    name: 'todos',
    scripts: { build: 'nuxi build' },
    dependencies: {
      nuxt: '^4.0.0',
      '@nuxthub/core': '^0.10.0',
      'nuxt-auth-utils': '^0.5.0',
      ...extraDependencies
    }
  });

describe('NuxtHub runtime bindings', () => {
  it('keeps the Nuxt service for review but blocks unsupported SQLite bindings and migration lifecycle', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': [
        'export default defineNuxtConfig({',
        "  modules: ['@nuxthub/core', 'nuxt-auth-utils'],",
        "  hub: { db: 'sqlite' }",
        '})',
        ''
      ].join('\n'),
      '.env.example': [
        'NUXT_OAUTH_GITHUB_CLIENT_ID=',
        'NUXT_OAUTH_GITHUB_CLIENT_SECRET=',
        'NUXT_SESSION_PASSWORD=',
        'UNUSED_OPTIONAL_SECRET=',
        ''
      ].join('\n'),
      'server/api/todos.get.ts': "import { db } from 'hub:db'\nexport default defineEventHandler(() => db.select())\n",
      'server/api/auth/github.get.ts': [
        'export default defineOAuthGitHubEventHandler({',
        '  async onSuccess(event, { user }) {',
        '    await setUserSession(event, { user })',
        '  }',
        '})',
        ''
      ].join('\n'),
      'server/db/migrations/sqlite/0001_todos.sql': 'CREATE TABLE todos (id integer primary key);\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'eval' });

    expect(facts.services).toHaveLength(1);
    expect(facts.dependencies).toEqual([]);
    expect(facts.deploymentRequirements).toEqual([
      expect.objectContaining({
        kind: 'framework-runtime-bindings',
        serviceName: 'todos',
        provider: 'nuxthub',
        bindings: ['database'],
        databaseEngine: 'sqlite',
        migrationPaths: ['server/db/migrations/sqlite/0001_todos.sql']
      })
    ]);
    expect(facts.services[0]?.environmentVariables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'NUXT_SESSION_PASSWORD', role: 'generated-secret', required: true }),
        expect.objectContaining({ name: 'NUXT_OAUTH_GITHUB_CLIENT_ID', role: 'third-party-secret', required: true }),
        expect.objectContaining({ name: 'NUXT_OAUTH_GITHUB_CLIENT_SECRET', role: 'third-party-secret', required: true })
      ])
    );
    expect(facts.services[0]?.environmentVariables.map((variable) => variable.name)).not.toContain(
      'UNUSED_OPTIONAL_SECRET'
    );
    expect(composed.config.resources.todos).toMatchObject({
      type: 'nuxt-web',
      properties: {
        environment: expect.arrayContaining([
          { name: 'NUXT_SESSION_PASSWORD', value: "$Secret('eval-todos.generatedNuxtSessionPassword')" },
          { name: 'NUXT_OAUTH_GITHUB_CLIENT_ID', value: "$Secret('nuxt_oauth_github_client_id')" },
          { name: 'NUXT_OAUTH_GITHUB_CLIENT_SECRET', value: "$Secret('nuxt_oauth_github_client_secret')" }
        ])
      }
    });
    expect(composed.config.scripts).toBeUndefined();
    expect(composed.gaps.map((gap) => gap.message).join('\n')).toMatch(
      /no NuxtHub database binding or durable SQLite/i
    );
    expect(composed.gaps.map((gap) => gap.message).join('\n')).toMatch(
      /migrations will not run.*explicit migration command/is
    );
    expect(composed.gaps.filter((gap) => gap.severity === 'blocking')).toHaveLength(2);
    expect(composed.deployable).toBe(false);
  });

  it('leaves a plain Nuxt 4 application simple and deployable', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'nuxt-app',
        scripts: { build: 'nuxt build', preview: 'nuxt preview' },
        dependencies: { nuxt: '^4.0.0' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ compatibilityDate: '2025-07-15' })\n",
      'app/app.vue': '<template><p>Hello</p></template>\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts });

    expect(facts.deploymentRequirements).toEqual([]);
    expect(facts.services[0]?.environmentVariables).toEqual([]);
    expect(composed.config.resources.nuxtApp?.type).toBe('nuxt-web');
    expect(composed.gaps).toEqual([]);
    expect(composed.deployable).toBe(true);
  });

  it('does not turn an installed but unused module or a type-only virtual import into a runtime binding', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'] })\n",
      'shared/types/db.d.ts': "import type { schema } from 'hub:db'\nexport type Schema = typeof schema\n",
      'server/db/migrations/sqlite/0001_unused.sql': 'CREATE TABLE ignored (id integer);\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.deploymentRequirements).toEqual([]);
  });

  it('fails closed on a dynamic config when production source still imports the NuxtHub binding', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': [
        "const shared = { modules: ['@nuxthub/core'] }",
        'export default defineNuxtConfig({ ...shared, hub: runtimeHubConfig })',
        ''
      ].join('\n'),
      'server/api/items.get.ts': "import { db } from 'hub:db'\nexport default () => db.select()\n"
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts });

    expect(facts.deploymentRequirements).toEqual([
      expect.objectContaining({
        kind: 'framework-runtime-bindings',
        bindings: ['database'],
        migrationPaths: []
      })
    ]);
    expect(facts.deploymentRequirements[0]).not.toHaveProperty('databaseEngine');
    expect(composed.gaps.map((gap) => gap.message).join('\n')).not.toMatch(/selects SQLite/i);
    expect(composed.deployable).toBe(false);
  });

  it("does not let a workspace root claim a sibling package's binding or OAuth setup", async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'root-app',
        workspaces: ['apps/*'],
        scripts: { build: 'nuxt build' },
        dependencies: { nuxt: '^4.0.0', '@nuxthub/core': '^0.10.0', 'nuxt-auth-utils': '^0.5.0' }
      }),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'] })\n",
      'apps/admin/package.json': manifest(),
      'apps/admin/nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'] })\n",
      'apps/admin/.env.example': 'NUXT_OAUTH_GITHUB_CLIENT_ID=\nNUXT_OAUTH_GITHUB_CLIENT_SECRET=\n',
      'apps/admin/server/api/auth/github.get.ts': 'export default defineOAuthGitHubEventHandler({ onSuccess() {} })\n',
      'apps/admin/server/api/items.get.ts': "import { db } from 'hub:db'\nexport default () => db.select()\n"
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.deploymentRequirements).toHaveLength(1);
    expect(facts.deploymentRequirements[0]).toMatchObject({ serviceName: 'todos' });
    expect(facts.services.find((service) => service.name === 'root-app')?.environmentVariables).toEqual([]);
    expect(
      facts.services.find((service) => service.name === 'todos')?.environmentVariables.map((variable) => variable.name)
    ).toEqual(['NUXT_OAUTH_GITHUB_CLIENT_ID', 'NUXT_OAUTH_GITHUB_CLIENT_SECRET']);
  });
});
