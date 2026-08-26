import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts, createProbeContext } from '../assemble';
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
    expect(composed.gaps.map((gap) => gap.message).join('\n')).toMatch(/local SQLite file.*not durable storage/i);
    expect(composed.gaps.map((gap) => gap.message).join('\n')).toMatch(
      /can apply migrations during the production build.*verify which database.*explicit migration command/is
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
      }),
      expect.objectContaining({
        kind: 'framework-analysis-incomplete',
        reasons: ['dynamic-config']
      })
    ]);
    expect(facts.deploymentRequirements[0]).not.toHaveProperty('databaseEngine');
    expect(composed.gaps.map((gap) => gap.message).join('\n')).not.toMatch(/selects SQLite/i);
    expect(composed.deployable).toBe(false);
  });

  for (const [name, path, code] of [
    ['line comments', 'server/api/items.ts', "// import { db } from 'hub:db'\nexport default () => 'ok'"],
    ['block comments', 'server/api/items.ts', "/* import('hub:db'); db.select(); */\nexport default () => 'ok'"],
    ['ordinary strings', 'server/api/items.ts', 'export const example = "import { db } from \'hub:db\'"'],
    ['type-only imports', 'server/api/items.ts', "import type { db } from 'hub:db'; export type Db = typeof db"],
    [
      'type-only named imports',
      'server/api/items.ts',
      "import { type schema } from 'hub:db'; export type Schema = typeof schema"
    ],
    [
      'type-only reexports',
      'server/api/items.ts',
      "export type { db } from 'hub:db'; export { type schema } from 'hub:db'"
    ],
    ['type import expressions', 'server/api/items.ts', "export type Db = typeof import('hub:db').db"],
    ['colocated test files', 'server/api/items.test.ts', "import { db } from 'hub:db'; db.select()"],
    ['colocated spec files', 'server/api/items.spec.ts', "import { db } from 'hub:db'; db.select()"],
    ['Vue comments', 'app/app.vue', "<!-- <script>import { db } from 'hub:db'</script> --><template>Hello</template>"]
  ]) {
    it(`does not treat ${name} as production storage usage`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
        [path!]: code!
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toEqual([]);
      expect(composeConfig({ facts }).deployable).toBe(true);
    });
  }

  for (const code of [
    'export default async () => (await import(`hub:db`)).db.select()',
    "export { db } from 'hub:db'",
    "import 'hub:db'",
    "const { db } = require('hub:db'); export default () => db.select()",
    "import { db } from '@nuxthub/db'; export default () => db.select()"
  ]) {
    it(`detects runtime syntax: ${code}`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'] })",
        'server/api/items.ts': code
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toEqual([expect.objectContaining({ bindings: ['database'] })]);
      expect(composeConfig({ facts }).deployable).toBe(false);
    });
  }

  for (const [binding, setting, code, advice] of [
    ['database', "db: 'sqlite'", 'export default () => db.select().from(schema.todos)', /hosted SQLite.*Turso\/libSQL/],
    ['database', "db: 'sqlite'", 'export default () => schema.todos', /production database/],
    ['blob', 'blob: true', 'export default () => blob.list()', /uploaded files.*object-storage.*S3/],
    ['kv', 'kv: true', "export default () => kv.getItem('key')", /key-value data.*AWS runtime.*Redis/],
    [
      'cache',
      'cache: true',
      "export default defineCachedEventHandler(() => 'cached')",
      /Nitro cache storage.*temporary cache/
    ],
    ['cache', 'cache: true', "export default () => useStorage('cache').getItem('key')", /Nitro cache storage/],
    [
      'cache',
      'cache: true',
      "import { cachedFunction as cached } from 'nitropack/runtime'; export const load = cached(() => 'value')",
      /Nitro cache storage/
    ],
    [
      'blob',
      'blob: true',
      "import { blob as uploads } from '#imports'; export default () => uploads.list()",
      /uploaded files/
    ]
  ] as const) {
    it(`detects configured ${binding} through ${code}`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts': `export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { ${setting} } })`,
        'server/api/items.ts': code
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      const composed = composeConfig({ facts });
      expect(facts.deploymentRequirements).toEqual([expect.objectContaining({ bindings: [binding] })]);
      expect(facts.dependencies).toEqual([]);
      expect(composed.deployable).toBe(false);
      expect(composed.gaps[0]?.message).toMatch(advice);
      if (binding !== 'database') expect(composed.gaps[0]?.message).not.toMatch(/database|SQLite|Turso|libSQL/);
    });
  }

  it('does not mistake local symbols or disabled server auto-imports for NuxtHub use', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts':
        "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite', blob: true, kv: true, cache: false } })",
      'server/api/items.ts': [
        "import { blob } from './local-blob'",
        "import { kv } from '#imports'",
        'function local(db, schema) { return db.select(schema.todos) }',
        "function shadowed(kv) { return kv.getItem('local') }",
        "export default () => ({ blob: blob.list(), db: 'label', schema: 'label', cached: defineCachedFunction(() => 1) })"
      ].join('\n'),
      'app/uses-client-names.ts': 'export default () => db.select()'
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([]);
    expect(composeConfig({ facts }).deployable).toBe(true);
  });

  it('finds custom SQLite migration directories and retains every exact SQL path', async () => {
    const migrations = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => [
        `apps/web/database/changes/${String(index).padStart(4, '0')}.sql`,
        'SELECT 1;'
      ])
    );
    root = await makeRepo({
      'apps/web/package.json': manifest(),
      'apps/web/nuxt.config.ts':
        "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: { dialect: 'sqlite', migrationsDirs: ['database/changes'] } } })",
      'apps/web/server/api/items.ts': 'export default () => db.select()',
      'apps/web/server/db/migrations/ignored.sql': 'SELECT 1;',
      'database/changes/wrong-service.sql': 'SELECT 1;',
      ...migrations
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([
      expect.objectContaining({
        bindings: ['database'],
        databaseEngine: 'sqlite',
        migrationPaths: Object.keys(migrations)
      })
    ]);
    const composed = composeConfig({ facts });
    expect(composed.gaps[1]?.message).toContain('apps/web/database/changes/0024.sql');
    expect(composed.config.scripts).toBeUndefined();
    expect(composed.deployable).toBe(false);
  });

  for (const directories of [
    "['../outside']",
    "['C:/outside']",
    "['/outside']",
    'migrationDirs',
    "['database/changes', ...extraDirs]"
  ]) {
    it(`fails closed on migration directory syntax ${directories}`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts': `export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: { dialect: 'sqlite', migrationsDirs: ${directories} } } })`,
        'server/api/items.ts': 'export default () => db.select()'
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toContainEqual(
        expect.objectContaining({
          kind: 'framework-analysis-incomplete',
          reasons: ['migration-paths']
        })
      );
      const composed = composeConfig({ facts });
      expect(composed.gaps.map((gap) => gap.message).join(' ')).toContain('migration directories are computed');
      expect(composed.deployable).toBe(false);
    });
  }

  it('cannot silently unlock a NuxtHub app when the production source scan is truncated', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      ...Object.fromEntries(
        Array.from({ length: 400 }, (_, index) => [
          `server/api/a${String(index).padStart(4, '0')}.ts`,
          'export default () => 1'
        ])
      ),
      'server/api/zzzz-items.ts': 'export default () => db.select()'
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([
      expect.objectContaining({
        kind: 'framework-analysis-incomplete',
        reasons: ['source-limit']
      })
    ]);
    const composed = composeConfig({ facts });
    expect(composed.gaps[0]?.message).toContain('exceeds the bounded source scan');
    expect(composed.deployable).toBe(false);
  });

  it('does not copy inline connection settings or env values into its findings', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts':
        "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: { dialect: 'sqlite', connection: { authToken: 'SENTINEL_INLINE_VALUE' } } } })",
      '.env.example': 'NUXT_SESSION_PASSWORD=SENTINEL_ENV_VALUE\nNUXT_OAUTH_GITHUB_CLIENT_SECRET=SENTINEL_OAUTH_VALUE',
      'server/api/items.ts':
        "export default () => { setUserSession({ token: 'SENTINEL_SOURCE_VALUE' }); return db.select() }",
      'server/api/auth.ts': 'export default defineOAuthGitHubEventHandler({})'
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.services[0]?.environmentVariables).toHaveLength(2);
    expect(JSON.stringify({ facts, composed: composeConfig({ facts }) })).not.toContain('SENTINEL_');
  });

  it('fails closed when one production source file is too large to read completely', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/large.ts': `${'// padding\n'.repeat(25_000)}export default () => db.select()`
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([
      expect.objectContaining({
        kind: 'framework-analysis-incomplete',
        reasons: ['unreadable-source']
      })
    ]);
    expect(composeConfig({ facts }).deployable).toBe(false);
  });

  it('also fails closed when the repository file listing stopped before reaching production source', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'] })",
      'server/api/not-listed.ts': "import { db } from 'hub:db'; export default () => db.select()"
    });
    const output = await nuxtHubProbe.run({
      ...createProbeContext(root, ['package.json', 'nuxt.config.ts']),
      filesTruncated: true
    });
    expect(output.deploymentRequirements).toEqual([
      expect.objectContaining({
        kind: 'framework-analysis-incomplete',
        reasons: ['source-limit']
      })
    ]);
    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, { name: 'truncated-nuxthub', run: async () => output }]
    });
    expect(composeConfig({ facts }).deployable).toBe(false);
  });

  it('blocks migration lifecycle for an active database without runtime database imports', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/health.ts': "export default defineEventHandler(() => 'ok')",
      'server/db/migrations/sqlite/0001_setup.sql': 'CREATE TABLE items (id integer primary key);'
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([
      expect.objectContaining({
        kind: 'framework-runtime-bindings',
        bindings: ['database'],
        databaseEngine: 'sqlite',
        migrationPaths: ['server/db/migrations/sqlite/0001_setup.sql']
      })
    ]);
    expect(facts.dependencies).toEqual([]);
    const composed = composeConfig({ facts });
    expect(composed.deployable).toBe(false);
    expect(composed.gaps).toContainEqual(
      expect.objectContaining({
        subject: 'todos.nuxthub-migrations',
        severity: 'blocking',
        message: expect.stringContaining('NuxtHub can apply migrations during the production build')
      })
    );
    expect(composed.config.scripts).toBeUndefined();
  });

  it('does not activate a disabled database merely because old migrations are committed', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: false } })",
      'server/db/migrations/sqlite/0001_old.sql': 'SELECT 1;'
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([]);
    expect(composeConfig({ facts }).deployable).toBe(true);
  });

  for (const hook of [
    "'hub:db:migrations:dirs': dirs => dirs.push('database/changes')",
    "'hub:db:migrations:dirs'(dirs) { dirs.push('database/changes') }"
  ]) {
    it(`fails closed instead of executing a migration-directory hook: ${hook}`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts': `export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' }, hooks: { ${hook} } })`,
        'server/api/health.ts': "export default defineEventHandler(() => 'ok')",
        'database/changes/0001_setup.sql': 'SELECT 1;'
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toEqual([
        expect.objectContaining({
          kind: 'framework-analysis-incomplete',
          reasons: ['migration-paths'],
          evidence: expect.arrayContaining([
            expect.objectContaining({ file: 'nuxt.config.ts', quote: "'hub:db:migrations:dirs'" })
          ])
        })
      ]);
      const composed = composeConfig({ facts });
      expect(composed.deployable).toBe(false);
      expect(composed.gaps[0]?.message).toContain('migration directories are computed');
    });
  }

  for (const expression of ['framework.db.select()', "framework['db'].select()", 'framework.schema.items']) {
    it(`recognizes a configured database through a namespace member: ${expression}`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
        'server/api/items.ts': `import * as framework from '#imports'; export default () => ${expression}`
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toEqual([expect.objectContaining({ bindings: ['database'] })]);
      expect(composeConfig({ facts }).deployable).toBe(false);
    });
  }

  for (const [path, registration] of [
    ['extensions/auth.ts', ", './extensions/auth.ts'"],
    ['extensions/auth/index.ts', ", './extensions/auth'"],
    ['modules/auth.ts', ''],
    ['modules/auth/index.ts', '']
  ] as const) {
    it(`blocks migration hook registration from the active local module ${path}`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts': `export default defineNuxtConfig({ modules: ['@nuxthub/core'${registration}], hub: { db: 'sqlite' } })`,
        [path]: [
          "import { createResolver, defineNuxtModule } from '@nuxt/kit'",
          'export default defineNuxtModule({ setup(options, nuxt) {',
          '  const { resolve } = createResolver(import.meta.url)',
          "  nuxt.hook(('hub:db:migrations:dirs' /* SENTINEL_MODULE_CREDENTIAL */), dirs => dirs.push(resolve('./auth-migrations')))",
          '} })'
        ].join('\n'),
        [path.replace(/\/[^/]+$/, '/auth-migrations/0001_auth.sql')]: 'CREATE TABLE users (id integer primary key);',
        'server/api/health.ts': "export default defineEventHandler(() => 'ok')"
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toEqual([
        expect.objectContaining({
          kind: 'framework-analysis-incomplete',
          reasons: ['migration-paths'],
          evidence: expect.arrayContaining([expect.objectContaining({ file: path, quote: "'hub:db:migrations:dirs'" })])
        })
      ]);
      expect(facts.dependencies).toEqual([]);
      const composed = composeConfig({ facts });
      expect(composed.deployable).toBe(false);
      expect(composed.gaps[0]?.message).toContain('changed by a hook');
      expect(composed.config.scripts).toBeUndefined();
      expect(JSON.stringify({ facts, composed })).not.toContain('SENTINEL_MODULE_CREDENTIAL');
    });
  }

  it('does not activate an unregistered local hook or comments in an unrelated auto-loaded module', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'extensions/inactive.ts':
        "export default defineNuxtModule({ setup(options, nuxt) { nuxt.hook('hub:db:migrations:dirs', dirs => dirs.push('unrelated')) } })",
      'modules/health.ts': [
        "import { defineNuxtModule } from '@nuxt/kit'",
        "// nuxt.hook('hub:db:migrations:dirs', dirs => dirs.push('example'))",
        "export default defineNuxtModule({ setup(options, nuxt) { nuxt.hook('ready', () => {}) } })"
      ].join('\n')
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([]);
    expect(composeConfig({ facts }).deployable).toBe(true);
  });

  for (const source of [
    undefined,
    "import { registerMigrations } from './hook-registration'; export default defineNuxtModule({ setup(options, nuxt) { registerMigrations(nuxt) } })"
  ]) {
    it(`keeps unresolved active local module code review-only (${source === undefined ? 'missing' : 'indirect'})`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts':
          "export default defineNuxtConfig({ modules: ['@nuxthub/core', './extensions/auth'], hub: { db: 'sqlite' } })",
        ...(source === undefined ? {} : { 'extensions/auth.ts': source }),
        'extensions/hook-registration.ts':
          "export const registerMigrations = nuxt => nuxt.hook('hub:db:migrations:dirs', dirs => dirs.push('auth-migrations'))"
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toContainEqual(
        expect.objectContaining({
          kind: 'framework-analysis-incomplete',
          reasons: ['migration-paths']
        })
      );
      expect(composeConfig({ facts }).deployable).toBe(false);
    });
  }

  it('does not apply local-module database hooks when the NuxtHub database is disabled', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: false } })",
      'modules/auth.ts':
        "export default defineNuxtModule({ setup(options, nuxt) { nuxt.hook('hub:db:migrations:dirs', dirs => dirs.push('auth-migrations')) } })"
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([]);
    expect(composeConfig({ facts }).deployable).toBe(true);
  });

  it('does not mistake shadowed, type-only, or unrelated namespace members for database usage', async () => {
    root = await makeRepo({
      'package.json': manifest(),
      'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxthub/core'], hub: { db: 'sqlite' } })",
      'server/api/local.ts':
        "import * as framework from '#imports'; export default function local(framework) { return framework.db.select() }",
      'server/api/types.ts': "import type * as framework from '#imports'; export type Database = typeof framework.db",
      'server/api/health.ts':
        "import * as framework from '#imports'; export default framework.defineEventHandler(() => 'ok')"
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    expect(facts.deploymentRequirements).toEqual([]);
    expect(composeConfig({ facts }).deployable).toBe(true);
  });

  for (const expression of [
    "import(('hub:db' /* SENTINEL_SOURCE_CREDENTIAL */))",
    'import((`hub:db` /* SENTINEL_SOURCE_CREDENTIAL */))',
    "require(('hub:db' /* SENTINEL_SOURCE_CREDENTIAL */))",
    "import(('hub:db' as 'hub:db' /* SENTINEL_SOURCE_CREDENTIAL */))"
  ]) {
    it(`cites only the recognized literal in ${expression}`, async () => {
      root = await makeRepo({
        'package.json': manifest(),
        'nuxt.config.ts':
          "export default defineNuxtConfig({ modules: [('@nuxthub/core' /* SENTINEL_CONFIG_CREDENTIAL */)], hub: { db: 'sqlite' } })",
        'server/api/items.ts': `export default async () => (await ${expression}).db.select()`
      });
      const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
      expect(facts.deploymentRequirements).toEqual([expect.objectContaining({ bindings: ['database'] })]);
      const citations = facts.deploymentRequirements[0]?.evidence.filter(
        (citation) => citation.file === 'server/api/items.ts'
      );
      expect(citations).toHaveLength(1);
      expect(citations?.[0]?.quote).toMatch(/^(?:'hub:db'|`hub:db`)$/);
      const composed = composeConfig({ facts });
      expect(composed.deployable).toBe(false);
      expect(JSON.stringify({ facts, composed })).not.toContain('SENTINEL_');
    });
  }

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
