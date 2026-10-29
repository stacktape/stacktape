import { validateArgs } from './validator';
import { describe, expect, test } from 'bun:test';
import { cliCommands, type StacktapeCommand } from '../config/cli/commands';
import { argAliases } from '../config/cli/options';
import {
  commandPositionals,
  publicCommandName,
  publicFlag,
  shortFlags,
  publicCommandLine
} from '../config/cli/public-names';
import { getAllowedArgs, getArgInfo } from '../config/cli/utils';
import { parseCliInput } from './cli';

const overrides: Record<string, string> = {
  'info:stack': 'status',
  'info:stacks': 'stack list',
  'info:operations': 'stack history',
  'info:whoami': 'whoami',
  'cf:rollback': 'stack recover',
  'cf-module:update': 'stack update-modules',
  incidents: 'incident list',
  alarms: 'alarm list',
  'alarms:export': 'alarm export',
  'container:session': 'container shell',
  'bastion:session': 'bastion shell',
  'defaults:configure': 'defaults set'
};

describe('public CLI compatibility table', () => {
  for (const id of cliCommands) {
    const name =
      overrides[id] ??
      id
        .replace(/^incidents:/, 'incident:')
        .replace(/^errors:/, 'error:')
        .replaceAll(':', ' ');
    test(`${name} and ${id} resolve to ${id}`, () => {
      expect(publicCommandName(id)).toBe(name);
      for (const spelling of [name.split(' '), [id]])
        expect(parseCliInput(spelling)).toEqual({ commands: [id], options: {}, additionalArgs: {} });
    });
    for (const arg of getAllowedArgs(id).filter((arg) => arg !== 'help')) {
      const aliases = argAliases[arg as keyof typeof argAliases];
      const types = getArgInfo(id, arg).allowedTypes;
      const value = types.includes('boolean')
        ? true
        : types.includes('array')
          ? ['example']
          : types.includes('number')
            ? 42
            : '123';
      const values = value === true ? [] : Array.isArray(value) ? value : [String(value)];
      const spellings = [
        ...new Set([
          arg,
          publicFlag(arg),
          ...(aliases ? (Array.isArray(aliases) ? aliases : [aliases]) : []),
          ...(shortFlags[arg] ? [shortFlags[arg]] : [])
        ])
      ];
      for (const spelling of spellings) {
        // metrics has two historical --st candidates; it selects the statistic, while logs selects since.
        if (id === 'metrics' && arg === 'startTime' && spelling === 'st') continue;
        test(`${id} --${spelling} maps to ${arg}`, () => {
          expect(parseCliInput([id, `--${spelling}`, ...values]).options).toEqual({ [arg]: value });
        });
      }
    }
  }
});

test.each([
  ['logs', ['--raw', '001'], { raw: true, resourceName: '001' }],
  ['metrics', ['api', 'Duration', '--st', 'p99'], { resourceName: 'api', metric: 'Duration', stat: 'p99' }],
  ['logs', ['api', '--st', '1h'], { resourceName: 'api', startTime: '1h' }],
  ['init', ['--sp'], { starterProject: true }],
  ['bucket:sync', ['--sp', './assets'], { sourcePath: './assets' }],
  ['container:exec', ['web', 'ls -la'], { resourceName: 'web', command: 'ls -la' }],
  ['secret:set', ['token', '--value', '123'], { secretName: 'token', secretValue: '123' }],
  ['defaults:configure', ['region', 'eu-west-1'], { key: 'region', value: 'eu-west-1' }],
  [
    'deploy',
    ['--no-cache', '--auto-rollback', '--no-remote-cache', '--no-layer-optimization'],
    { noCache: true, autoRollback: true, disableDockerRemoteCache: true, disableLayerOptimization: true }
  ],
  ['dev', ['--no-tunnel', '--no-emulation'], { noTunnel: true, disableEmulation: true }],
  ['init', ['--no-browser'], { noBrowser: true }],
  ['logs', ['--limit', '-10'], { limit: -10 }],
  ['deploy', ['--json'], { outputFormat: 'jsonl' }],
  ['deploy', ['--debug', '--logLevel', 'info', '--quiet', '--debug'], { logLevel: 'debug', quiet: true }],
  ['defaults:list', ['--logLevel', 'error'], { logLevel: 'error' }],
  ['deploy', ['--json', '--output-format', 'plain'], { outputFormat: 'plain' }]
] as const)('%s types options and positionals', (id, tokens, options) => {
  expect(parseCliInput([id, ...tokens]).options).toEqual(options);
});

test.each(['-prj', '-st', '-cp'])('rejects %s with a public flag hint', (flag) => {
  expect(() => parseCliInput(['deploy', flag, 'value'])).toThrow('One-dash options');
  try {
    parseCliInput(['deploy', '-prj', 'shop']);
  } catch (error) {
    expect(error.hints.join(' ')).toContain('--project');
  }
});

test('leaves custom arguments after -- outside primary option parsing', () => {
  expect(parseCliInput(['deploy', '--json', '--', '--setting', '-prj', '--no-cache'])).toEqual({
    commands: ['deploy'],
    options: { outputFormat: 'jsonl' },
    additionalArgs: { setting: '-prj', 'no-cache': true }
  });
});

test('rejects surplus and duplicate positionals without echoing values', () => {
  expect(() => parseCliInput(['logs', 'api', 'extra'])).toThrow('Too many positional');
  expect(() => parseCliInput(['secret', 'set', 'token', '--secretName', 'token'])).toThrow('only once');
});

for (const tokens of [
  ['help', 'secret', 'set'],
  ['secret', 'set', '--help'],
  ['secret', '--help'],
  ['dev', '--help'],
  ['dev', 'stop', '--help'],
  ['mcp', 'add', '--help']
]) {
  test(`keeps the whole help path: ${tokens.join(' ')}`, () => {
    const expected = tokens.filter((token) => !['help', '--help'].includes(token)).join(' ');
    expect(parseCliInput(tokens).options.command).toBe(expected);
  });
}

test('every declared positional is an accepted internal argument', () => {
  for (const [command, args] of Object.entries(commandPositionals))
    for (const arg of args) expect(getAllowedArgs(command as StacktapeCommand)).toContain(arg);
});

test('copyable public commands shell-quote argument values', () => {
  expect(publicCommandLine('secret:set', { secretName: 'token', secretFile: "data/owner's key.txt" })).toBe(
    "stacktape secret set --secret-name token --file 'data/owner'\\''s key.txt'"
  );
});

test('legacy flags may precede the command and short forms remain accepted', () => {
  expect(parseCliInput(['--projectName', 'shop', '--stage', 'prod', 'deploy']).options).toEqual({
    projectName: 'shop',
    stage: 'prod'
  });
  for (const [tokens, expected] of [
    [['-help'], 'help'],
    [['-version'], 'version'],
    [['-v'], 'version'],
    [['deploy', '-c', 'stacktape.ts'], 'deploy'],
    [['logs', '-w', '-f', 'error', '-q', 'fields @message'], 'logs']
  ] as const)
    expect(parseCliInput([...tokens]).commands).toEqual([expected]);
});

test('v3 issues commands remain undocumented aliases of the error commands', () => {
  for (const action of ['list', 'resolve', 'ignore', 'reopen'] as const)
    expect(parseCliInput([`issues:${action}`]).commands).toEqual([`errors:${action}`]);
});

test('every public positional form is equivalent to the legacy command and internal flags', () => {
  for (const [id, positionals] of Object.entries(commandPositionals)) {
    const values = positionals.map((name) => (name === 'command' && id === 'help' ? 'secret set' : `001-${name}`));
    const legacy = parseCliInput([id, ...positionals.flatMap((name, index) => [`--${name}`, values[index]])]);
    expect(parseCliInput([...publicCommandName(id).split(' '), ...values]), id).toEqual(legacy);
  }
  expect(
    parseCliInput(['deploy', '-s', 'prod', '-r', 'eu-west-1', '-p', 'account', '-c', 'infra.ts', '-y']).options
  ).toMatchObject({
    stage: 'prod',
    region: 'eu-west-1',
    profile: 'account',
    configPath: 'infra.ts',
    autoConfirmOperation: true
  });
  expect(parseCliInput(['synth', '-o', 'out.yml']).options).toEqual({ outFile: 'out.yml' });
});

test('negative fractions remain numbers, legacy --v works, and help does not hide invalid one-dash options', () => {
  expect(parseCliInput(['metrics', '--period', '-.5']).options.period).toBe(-0.5);
  expect(parseCliInput(['--v']).commands).toEqual(['version']);
  expect(() => parseCliInput(['deploy', '-prj', 'shop', '--help'])).toThrow('One-dash options');
});

test('invalid numeric values remain invalid at the CLI validation boundary', () => {
  for (const value of ['oops', '', ' ', 'NaN', 'Infinity']) {
    const parsed = parseCliInput(['logs', '--stage', 'prod', '--region', 'eu-west-1', `--limit=${value}`]);
    expect(() => validateArgs({ command: 'logs', rawArgs: parsed.options, defaults: {}, fromEnv: {} })).toThrow(
      'Invalid type'
    );
  }
  expect(parseCliInput(['logs', '--since', '1e3']).options.startTime).toBe(1000);
});
