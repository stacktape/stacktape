import { describe, expect, it } from 'bun:test';
import type { WizardState } from './session';
import { stationsFor } from './stations';

const base: WizardState = {
  phase: 'ready',
  projectName: 'demo',
  timeline: [],
  answers: {},
  agents: [{ id: 'claude-code', label: 'Claude Code', description: '', models: [] }],
  choice: { agentId: 'claude-code', modelId: 'default' }
};

const reviewing: WizardState = {
  ...base,
  phase: 'reviewing',
  timeline: [
    { kind: 'tool', label: 'read_file package.json' },
    { kind: 'tool', label: 'list_dir app' },
    { kind: 'tool', label: 'read_file .env.example' }
  ],
  composition: {
    resources: {
      app: { type: 'nextjs-web', properties: {} },
      mainDatabase: { type: 'relational-database', properties: {} }
    },
    provenance: {},
    gaps: [],
    unsetSettings: [],
    deployable: true
  }
};

const saved: WizardState = {
  ...reviewing,
  configFile: { path: '/repo/stacktape.yml', filename: 'stacktape.yml', format: 'yaml', region: 'eu-west-1' }
};

const deployment = (status: NonNullable<WizardState['deployment']>['status']): WizardState => ({
  ...saved,
  deployment: { status, stage: 'dev', region: 'eu-west-1', commandLine: '', events: [], lines: [] }
});

const statuses = (state: WizardState) => stationsFor(state).map((station) => station.status);
const notes = (state: WizardState) =>
  Object.fromEntries(stationsFor(state).map((station) => [station.id, station.note]));

describe('the path across the top of the wizard', () => {
  it.each([
    ['nothing has started', base, ['pending', 'pending', 'pending', 'pending']],
    [
      'the agent is reading',
      { ...base, phase: 'analysing' } as WizardState,
      ['working', 'pending', 'pending', 'pending']
    ],
    ['reading failed', { ...base, phase: 'failed' } as WizardState, ['failed', 'pending', 'pending', 'pending']],
    ['the review waits for the user', reviewing, ['done', 'current', 'pending', 'pending']],
    ['the file is saved', saved, ['done', 'done', 'current', 'pending']],
    ['the deploy runs', deployment('running'), ['done', 'done', 'working', 'pending']],
    ['the agent repairs a failed deploy', deployment('repairing'), ['done', 'done', 'working', 'pending']],
    ['the deploy failed', deployment('failed'), ['done', 'done', 'failed', 'pending']],
    ['the deploy succeeded', deployment('succeeded'), ['done', 'done', 'done', 'done']]
  ] as const)('marks where the run is when %s', (_, state, expected) => {
    expect(statuses(state)).toEqual([...expected]);
  });

  it('says what each step will do before anything runs, including that deploying costs nothing until confirmed', () => {
    expect(notes(base)).toEqual({
      analyze: 'Reads your code on this machine. None of it goes to Stacktape.',
      review: 'The AWS setup it needs, its monthly price and one file.',
      deploy: 'Optional. Nothing is created or billed before you confirm.',
      live: 'A public address, with logs and metrics in the Console.'
    });
  });

  it('says what came of each finished step', () => {
    expect(notes(deployment('succeeded'))).toMatchObject({
      analyze: 'Claude Code read 2 files, on this machine.',
      review: 'Saved stacktape.yml with 2 resources.',
      deploy: 'Deployed dev to eu-west-1.'
    });
    expect(notes({ ...reviewing, choice: { agentId: 'none', modelId: 'default' } }).analyze).toBe(
      'Read your project files, without an agent.'
    );
  });
});
