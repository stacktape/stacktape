/**
 * The preflight engine, exercised against a scripted Docker.
 *
 * The properties under protection: a proven start command passes even when the app crashes dialing
 * its stubbed database; a crash naming a missing variable turns into that variable's name, not a
 * generic failure; machinery problems (no Docker, no listener yet) never read as the user's
 * failure; and the container is force-removed on every path.
 */

import { describe, expect, it } from 'bun:test';
import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import {
  analyseBootLogs,
  parseListeningPorts,
  preflightAllowsDeploy,
  runPreflight,
  stubEnvironmentFor,
  type CommandResult,
  type PreflightRunners
} from './preflight';

const PROC_LISTEN_8080 =
  '  sl  local_address rem_address   st\n' +
  '   0: 00000000:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 1 1\n' +
  '   1: 0100007F:A6D2 0100007F:1F90 01 00000000:00000000 00:00000000 00000000     0        0 1 1\n';

describe('parseListeningPorts', () => {
  it('reads listening sockets and ignores established ones', () => {
    expect(parseListeningPorts(PROC_LISTEN_8080)).toEqual([8080]);
  });

  it('reads nothing from an empty or malformed file', () => {
    expect(parseListeningPorts('')).toEqual([]);
    expect(parseListeningPorts('garbage\nlines')).toEqual([]);
  });
});

describe('analyseBootLogs', () => {
  it('extracts the variables the process itself asked for', () => {
    const analysis = analyseBootLogs(
      ['Error: environment variable STRIPE_SECRET_KEY is required', 'DATABASE_URL is not set', 'at main.js:1'].join(
        '\n'
      )
    );
    expect(analysis.missingEnvironmentVariables).toEqual(['DATABASE_URL', 'STRIPE_SECRET_KEY']);
  });

  it('recognizes a dependency dial and filters noise words', () => {
    const analysis = analyseBootLogs('connect ECONNREFUSED 127.0.0.1:9\nERROR is not set');
    expect(analysis.dialedDependency).toBe(true);
    expect(analysis.missingEnvironmentVariables).toEqual([]);
  });
});

describe('stubEnvironmentFor', () => {
  it('gives every declared variable a parseable stub, by dependency kind first', () => {
    const stubs = stubEnvironmentFor(
      {
        environmentVariables: [
          {
            name: 'DATABASE_URL',
            role: 'infra-dependency',
            dependencyName: 'mainDatabase',
            required: true,
            evidence: []
          },
          { name: 'WEBHOOK_ENDPOINT', role: 'runtime-config', required: true, evidence: [] },
          { name: 'STRIPE_SECRET_KEY', role: 'third-party-secret', required: true, evidence: [] },
          { name: 'NEXT_PUBLIC_X', role: 'build-time', required: true, evidence: [] }
        ]
      },
      {
        dependencies: [
          {
            name: 'mainDatabase',
            kind: 'postgres',
            extensions: [],
            consumedBy: [],
            addressedBy: [],
            evidence: [],
            source: 'probe'
          }
        ]
      }
    );

    const byName = Object.fromEntries(stubs.map((stub) => [stub.name, stub.value]));
    expect(byName.DATABASE_URL).toBe('postgres://preflight:preflight@127.0.0.1:9/preflight');
    expect(byName.WEBHOOK_ENDPOINT).toBe('http://127.0.0.1:9');
    expect(byName.STRIPE_SECRET_KEY).toBe('stp-preflight-stub');
    // Build-time values do not exist at runtime; stubbing one would mask exactly the bug we track.
    expect(byName.NEXT_PUBLIC_X).toBeUndefined();
  });
});

/** A scripted Docker: dispatches on subcommand, with per-scenario behavior. */
const scriptedRunners = (scenario: {
  versionFails?: boolean;
  inspectStates: string[];
  logs?: string;
  proc?: string;
}): { runners: PreflightRunners; calls: string[][] } => {
  const calls: string[][] = [];
  const inspectQueue = [...scenario.inspectStates];
  const ok = (stdout = ''): CommandResult => ({ stdout, stderr: '' });

  const docker = async (commands: string[]): Promise<CommandResult> => {
    calls.push(commands);
    const [subcommand] = commands;
    if (subcommand === 'version') {
      if (scenario.versionFails) throw new Error('docker daemon is not running');
      return ok('27.0.0');
    }
    if (subcommand === 'rm' || subcommand === 'run') return ok('container-id');
    if (subcommand === 'inspect') return ok(inspectQueue.shift() ?? 'false 1');
    if (subcommand === 'logs') return ok(scenario.logs ?? '');
    if (subcommand === 'exec') {
      if (scenario.proc === undefined) throw new Error('no sh in image');
      return ok(scenario.proc);
    }
    return ok();
  };

  return {
    runners: { docker, nixpacks: async () => ({}), sleep: async () => {} },
    calls
  };
};

const factsFor = (service: Record<string, unknown>) =>
  projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    services: [
      {
        name: 'app',
        path: '.',
        language: 'javascript',
        exposesHttp: true,
        executionModel: 'long-running',
        startCommand: 'npm start',
        environmentVariables: [],
        evidence: [],
        source: 'probe',
        ...service
      }
    ]
  });

const preflightFor = (service: Record<string, unknown>, scenario: Parameters<typeof scriptedRunners>[0]) => {
  const facts = factsFor(service);
  const composition = composeConfig({ facts });
  const { runners, calls } = scriptedRunners(scenario);
  return { run: () => runPreflight({ repositoryRoot: 'C:/repo', facts, composition, runners }), calls };
};

describe('runPreflight', () => {
  it('reports unavailable without touching anything when Docker is absent', async () => {
    const { run } = preflightFor({}, { versionFails: true, inspectStates: [] });
    const result = await run();
    expect(result.status).toBe('unavailable');
    expect(result.services).toEqual([]);
    expect(preflightAllowsDeploy(result)).toBe(true);
  });

  it('passes an HTTP service the moment it listens, and notes a port mismatch', async () => {
    const { run } = preflightFor({ port: 3000 }, { inspectStates: ['true 0'], proc: PROC_LISTEN_8080 });
    const result = await run();

    expect(result.services[0]?.status).toBe('passed');
    expect(result.services[0]?.observations.listeningPorts).toEqual([8080]);
    // The process ignored the configured port — that observation is the point of booting it.
    expect(result.services[0]?.reason).toContain('rather than the configured 3000');
  });

  it('treats a crash dialing the stubbed database as a proven start command', async () => {
    const { run } = preflightFor({}, { inspectStates: ['false 1'], logs: 'Error: connect ECONNREFUSED 127.0.0.1:9' });
    const result = await run();

    expect(result.services[0]?.status).toBe('passed');
    expect(result.services[0]?.observations.dialedDependency).toBe(true);
    expect(preflightAllowsDeploy(result)).toBe(true);
  });

  it('turns a crash naming its variables into those names', async () => {
    const { run } = preflightFor({}, { inspectStates: ['false 1'], logs: 'Fatal: STRIPE_SECRET_KEY is not set' });
    const result = await run();

    expect(result.services[0]?.status).toBe('failed');
    expect(result.services[0]?.observations.missingEnvironmentVariables).toEqual(['STRIPE_SECRET_KEY']);
    expect(result.services[0]?.reason).toContain('STRIPE_SECRET_KEY');
    expect(preflightAllowsDeploy(result)).toBe(false);
  });

  it('calls a slow HTTP boot inconclusive, never failed, and a steady worker passed', async () => {
    const alive = Array.from({ length: 40 }, () => 'true 0');
    const http = preflightFor({}, { inspectStates: [...alive] });
    const httpResult = await http.run();
    expect(httpResult.services[0]?.status).toBe('inconclusive');
    expect(preflightAllowsDeploy(httpResult)).toBe(true);

    const worker = preflightFor({ name: 'jobs', exposesHttp: false, port: undefined }, { inspectStates: [...alive] });
    const workerResult = await worker.run();
    expect(workerResult.services[0]?.status).toBe('passed');
  });

  it('force-removes the container on every path', async () => {
    const { run, calls } = preflightFor({}, { inspectStates: ['false 1'], logs: 'boom' });
    await run();

    const removals = calls.filter((commands) => commands[0] === 'rm' && commands.includes('--force'));
    expect(removals.length).toBeGreaterThanOrEqual(2);
  });
});
