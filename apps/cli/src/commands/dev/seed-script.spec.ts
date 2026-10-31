import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import {
  findDeployedIdentifier,
  findNonLocalReferences,
  getDeployedDatabaseIdentifiers,
  getSeedScriptRefusal,
  runSeedScript
} from './seed-script';

// A seed must never write to a deployed database. `db` runs locally in these cases; `mainDb` is the stage's deployed
// database, connected with remoteResources.
const local = ['db', 'cache'];
const localScript = (properties: Record<string, unknown>) => ({ type: 'local-script', properties });

describe('seed scripts that reference deployed resources are refused before they resolve', () => {
  const refused: Array<[string, Record<string, unknown>, string]> = [
    ['connectTo a deployed database', { connectTo: ['mainDb'], executeCommand: 'npm run seed' }, 'mainDb'],
    [
      'the Prisma $Format pattern',
      {
        environment: [
          { name: 'DATABASE_URL', value: "$Format('{}?schema=public', $ResourceParam('mainDb', 'connectionString'))" }
        ],
        executeCommand: 'npx prisma db seed'
      },
      "$ResourceParam('mainDb')"
    ],
    [
      'a directive inside the command',
      { executeCommand: "psql $ResourceParam('mainDb','connectionString') -f seed.sql" },
      "$ResourceParam('mainDb')"
    ],
    [
      'a directive in executeCommands',
      { executeCommands: ['echo start', 'psql "$ResourceParam("mainDb", "host")"'] },
      "$ResourceParam('mainDb')"
    ],
    [
      'CloudFormation attributes',
      { environment: [{ name: 'HOST', value: "$CfResourceParam('MainDbInstance', 'Endpoint.Address')" }] },
      '$CfResourceParam'
    ],
    [
      "another stack's outputs",
      { environment: [{ name: 'URL', value: "$StackOutput('prod-stack', 'DbUrl')" }] },
      '$StackOutput'
    ],
    [
      'a resource name that is itself a directive',
      { environment: [{ name: 'URL', value: "$ResourceParam($Var('target'), 'connectionString')" }] },
      '$ResourceParam(...)'
    ],
    [
      'a deployed workload',
      { environment: [{ name: 'API', value: "$ResourceParam('api', 'url')" }] },
      "$ResourceParam('api')"
    ],
    ['the role of a deployed workload', { assumeRoleOfResource: 'api', executeCommand: 'node seed.js' }, 'role of api']
  ];
  for (const [name, properties, mentioned] of refused) {
    test(name, () => {
      expect(getSeedScriptRefusal({ script: localScript(properties), localResourceNames: local })).toContain(mentioned);
    });
  }

  test('bastion scripts', () => {
    for (const type of ['bastion-script', 'local-script-with-bastion-tunneling']) {
      expect(
        getSeedScriptRefusal({ script: { type, properties: { connectTo: ['db'] } }, localResourceNames: local })
      ).toContain(type);
    }
  });

  test('references to local databases, also nested, are allowed', () => {
    const properties = {
      connectTo: ['db', 'cache'],
      environment: [
        { name: 'DATABASE_URL', value: "$Format('{}?schema=public', $ResourceParam('db', 'connectionString'))" },
        { name: 'REDIS', value: '$ResourceParam("cache", "host")' },
        { name: 'STAGE', value: '$Stage()' }
      ],
      executeCommand: "psql $ResourceParam('db','connectionString') -f seed.sql"
    };
    expect(getSeedScriptRefusal({ script: localScript(properties), localResourceNames: local })).toBeUndefined();
    expect(findNonLocalReferences(properties, local)).toEqual([]);
  });
});

describe('a resolved seed is refused when it contains the address of a deployed database', () => {
  const resources = {
    db: { resourceType: 'relational-database', referencableParams: { host: { value: 'localhost' } } },
    mainDb: {
      resourceType: 'relational-database',
      referencableParams: {
        host: { value: 'r2i-main.cxyz.ca-central-1.rds.amazonaws.com' },
        readerHost: { value: 'r2i-main.cluster-ro-cxyz.ca-central-1.rds.amazonaws.com' },
        port: { value: '5432' },
        dbName: { value: 'postgres' }
      }
    },
    events: {
      resourceType: 'dynamo-db-table',
      referencableParams: { name: { value: 'r2i-todos-r2i-events' }, arn: { value: 'arn:aws:dynamodb:x:1:table/t' } }
    },
    uploads: { resourceType: 'bucket', referencableParams: { name: { value: 'r2i-todos-r2i-uploads' } } }
  };
  const identifiers = getDeployedDatabaseIdentifiers(resources, ['db']);

  test('collects hosts and table identifiers of resources that do not run locally', () => {
    expect(identifiers.sort()).toEqual(
      [
        'arn:aws:dynamodb:x:1:table/t',
        'r2i-main.cluster-ro-cxyz.ca-central-1.rds.amazonaws.com',
        'r2i-main.cxyz.ca-central-1.rds.amazonaws.com',
        'r2i-todos-r2i-events'
      ].sort()
    );
  });

  const cases: Array<[string, unknown[], string | undefined]> = [
    [
      'a literal connection string',
      [['postgresql://R2I-MAIN.cxyz.ca-central-1.rds.amazonaws.com:5432/app'], []],
      'r2i-main.cxyz.ca-central-1.rds.amazonaws.com'
    ],
    [
      'a resolved command',
      [[], ['psql -h r2i-main.cxyz.ca-central-1.rds.amazonaws.com']],
      'r2i-main.cxyz.ca-central-1.rds.amazonaws.com'
    ],
    ['a deployed table name', [['r2i-todos-r2i-events'], []], 'r2i-todos-r2i-events'],
    ['local values only', [['postgresql://localhost:5432/postgres', '5432', 'postgres'], ['node seed.js']], undefined]
  ];
  for (const [name, values, expected] of cases) {
    test(name, () => expect(findDeployedIdentifier(values, identifiers)).toBe(expected));
  }
});

// r2l: after a seed script was added to the configuration file, seed answered "The config has no script" although the
// file had one; r2p: adding or editing a script then needed a restart. Scripts run only on request, so seed reads them
// from the file as it is now, while the session's workloads keep the configuration they started with.
describe('a script added or edited after dev mode started', () => {
  test('runs as the file defines it now, without a restart', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-seed-config-change-'));
    const configPath = join(directory, 'stacktape.js');
    const previous = {
      config: configManager.config,
      resolver: configManager.configResolver,
      configPath: globalStateManager.configPath,
      rawArgs: globalStateManager.rawArgs,
      rawCommands: globalStateManager.rawCommands
    };
    const writeScripts = (scripts: string) =>
      writeFile(configPath, `exports.default = () => ({ resources: {}, scripts: { ${scripts} } });\n`);
    try {
      await writeScripts('');
      const resolver = new ConfigResolver();
      await resolver.loadRawConfig({
        context: {
          configPath,
          workingDir: directory,
          authoringParams: { stage: 'dev', region: 'eu-north-1', cliArgs: {}, command: 'dev', awsProfile: '' },
          builtInDirectives: {}
        } as unknown as Parameters<ConfigResolver['loadRawConfig']>[0]['context']
      });
      configManager.config = resolver.rawConfig;
      configManager.configResolver = resolver;
      globalStateManager.configPath = configPath;
      globalStateManager.rawArgs = { currentWorkingDirectory: directory } as typeof globalStateManager.rawArgs;
      globalStateManager.rawCommands = ['dev'];
      expect(await runSeedScript('seed')).toMatchObject({ ok: false, code: 'NOT_FOUND' });

      await writeScripts("seed: { type: 'local-script', properties: { executeCommand: 'echo seeded' } }");
      expect(await runSeedScript('seed')).toMatchObject({ ok: true, output: ['seeded'] });

      await writeScripts("seed: { type: 'local-script', properties: { executeCommand: 'echo seeded twice' } }");
      expect(await runSeedScript('seed')).toMatchObject({ ok: true, output: ['seeded twice'] });

      // An added script is checked like any other: one for a deployed resource is still refused.
      await writeScripts("seed: { type: 'bastion-script', properties: { executeCommand: 'echo no' } }");
      expect(await runSeedScript('seed')).toMatchObject({ ok: false, code: 'NOT_LOCAL' });

      // A script the file does not define is still missing.
      expect(await runSeedScript('migrate')).toMatchObject({ ok: false, code: 'NOT_FOUND', available: ['seed'] });

      await writeFile(configPath, 'exports.default = (;');
      const broken = await runSeedScript('seed');
      expect(broken).toMatchObject({ ok: false, code: 'CONFIG_INVALID' });
      expect(broken.ok === false && broken.error).toStartWith('stacktape.js no longer loads');
      // The session's own configuration is never replaced.
      expect(configManager.config).toBe(resolver.rawConfig);
    } finally {
      configManager.config = previous.config;
      configManager.configResolver = previous.resolver;
      globalStateManager.configPath = previous.configPath;
      globalStateManager.rawArgs = previous.rawArgs;
      globalStateManager.rawCommands = previous.rawCommands;
      await rm(directory, { recursive: true, force: true });
    }
  });
});

/** Runs `scripts` as the session's configuration, in a fresh project directory. */
const withScripts = async (
  scripts: (directory: string) => Record<string, unknown>,
  run: (directory: string) => Promise<void>
) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-seed-run-'));
  const previous = {
    config: configManager.config,
    rawArgs: globalStateManager.rawArgs,
    rawCommands: globalStateManager.rawCommands
  };
  try {
    configManager.config = { resources: {}, scripts: scripts(directory) } as unknown as typeof configManager.config;
    globalStateManager.rawArgs = { currentWorkingDirectory: directory } as typeof globalStateManager.rawArgs;
    globalStateManager.rawCommands = ['dev'];
    await run(directory);
  } finally {
    configManager.config = previous.config;
    globalStateManager.rawArgs = previous.rawArgs;
    globalStateManager.rawCommands = previous.rawCommands;
    await rm(directory, { recursive: true, force: true });
  }
};

/** Whether `pid` runs; a zombie has exited and waits only to be reaped by whichever process adopted it. */
const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  if (process.platform !== 'linux') return true;
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
  } catch {
    return false;
  }
};

// r2xx: seed output and errors reached the agent with the script's database password in them.
describe('seed output and errors are masked before they reach an agent', () => {
  const canary = 'r2zz-fabricated-Xk29fQ7v';
  const script = (executeCommand: string) =>
    localScript({ environment: [{ name: 'DB_PASSWORD', value: canary }], executeCommand });

  test('a successful seed', async () => {
    await withScripts(
      () => ({
        seed: script(
          'echo "connecting with $DB_PASSWORD"; echo "Authorization: Bearer $DB_PASSWORD"; echo "{\\"password\\":\\"$DB_PASSWORD\\"}"'
        )
      }),
      async () => {
        const result = await runSeedScript('seed');
        expect(result).toMatchObject({ ok: true });
        expect(result.ok && result.output.length).toBe(3);
        expect(JSON.stringify(result)).not.toContain(canary);
      }
    );
  });

  test('a failing seed', async () => {
    await withScripts(
      () => ({ seed: script('echo "password=$DB_PASSWORD rejected" >&2; exit 3') }),
      async () => {
        const result = await runSeedScript('seed');
        expect(result).toMatchObject({ ok: false, code: 'SCRIPT_FAILED' });
        expect(JSON.stringify(result)).not.toContain(canary);
      }
    );
  });
});

// Review of #391: a grandchild that left the process group with setsid() and ignored SIGTERM kept running after the
// seed answered that every process had stopped.
const hasPython = Bun.which('python3') !== null;
describe.skipIf(process.platform === 'win32' || !hasPython)('a seed whose grandchild leaves its process group', () => {
  test('is stopped too, with SIGKILL when it ignores SIGTERM', async () => {
    await withScripts(
      (directory) => ({
        seed: localScript({
          executeCommand: `${JSON.stringify(process.execPath)} ${JSON.stringify(join(directory, 'parent.js'))}`
        })
      }),
      async (directory) => {
        const pidFile = join(directory, 'grandchild.pid');
        const mutation = join(directory, 'mutation-after-timeout');
        await writeFile(
          join(directory, 'grandchild.py'),
          `import os, pathlib, signal, time
os.setsid()
signal.signal(signal.SIGTERM, signal.SIG_IGN)
pathlib.Path(${JSON.stringify(pidFile)}).write_text(str(os.getpid()))
time.sleep(3)
pathlib.Path(${JSON.stringify(mutation)}).write_text('late')
time.sleep(8)
`
        );
        await writeFile(
          join(directory, 'parent.js'),
          `const child = require('child_process').spawn('python3', [${JSON.stringify(join(directory, 'grandchild.py'))}], { stdio: 'ignore' });
child.on('exit', () => process.exit(0));\n`
        );
        // The grandchild must have left the group before the deadline for this to test anything.
        const result = await runSeedScript('seed', { timeoutSeconds: 0.8 });
        expect(result).toMatchObject({ ok: false, code: 'SCRIPT_TIMEOUT' });
        expect(result.ok === false && result.error).toContain('with every process it started');
        const grandchildPid = Number(await Bun.file(pidFile).text());
        expect(isRunning(grandchildPid)).toBe(false);
        await Bun.sleep(3000);
        expect(await Bun.file(mutation).exists()).toBe(false);
      }
    );
  });
});

// r2xx: a timed-out seed reported that it was stopped while a process it started kept running and wrote afterwards.
describe.skipIf(process.platform === 'win32')('a seed that times out', () => {
  // With `inherit`, the child holds the script's output pipes open, which kept the answer waiting for the child.
  test.each(['ignore', 'inherit'])(
    'stops every process it started before it answers (child stdio %s)',
    async (stdio) => {
      await withScripts(
        (directory) => ({
          seed: localScript({
            // The parent waits for an ordinary child whose output is detached from the script's pipes.
            executeCommand: `${JSON.stringify(process.execPath)} ${JSON.stringify(join(directory, 'parent.js'))}`
          })
        }),
        async (directory) => {
          const pidFile = join(directory, 'child.pid');
          const mutation = join(directory, 'mutation-after-timeout');
          await writeFile(
            join(directory, 'child.js'),
            `require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
setTimeout(() => require('fs').writeFileSync(${JSON.stringify(mutation)}, 'late'), 1500);
setTimeout(() => {}, 5000);\n`
          );
          await writeFile(
            join(directory, 'parent.js'),
            `const child = require('child_process').spawn(process.execPath, [${JSON.stringify(join(directory, 'child.js'))}], { stdio: '${stdio}' });
child.on('exit', () => process.exit(0));\n`
          );
          const startedAt = Date.now();
          const result = await runSeedScript('seed', { timeoutSeconds: 0.5 });
          expect(Date.now() - startedAt).toBeLessThan(2500);
          expect(result).toMatchObject({ ok: false, code: 'SCRIPT_TIMEOUT' });
          expect(result.ok === false && result.error).toContain('with every process it started');
          const childPid = Number(await Bun.file(pidFile).text());
          expect(isRunning(childPid)).toBe(false);
          await Bun.sleep(1800);
          expect(await Bun.file(mutation).exists()).toBe(false);
        }
      );
    }
  );
});
