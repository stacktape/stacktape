import { describe, expect, test } from 'bun:test';
import { formatCommandLine, normalizeArgValue, toRecentCommandSuggestions } from '../data';
import type { RecentAction } from '../types';

const createActivity = (overrides: Partial<RecentAction>): RecentAction => ({
  id: 'activity-1',
  startTime: null,
  endTime: null,
  stackName: null,
  githubAvatarUrl: null,
  success: true,
  deploymentTrigger: 'CLI',
  createdAt: '2026-04-29T00:00:00.000Z',
  projectName: null,
  stage: null,
  region: null,
  command: null,
  gitCommit: null,
  inProgress: false,
  description: null,
  user: null,
  ...overrides
});

describe('interactive launcher data helpers', () => {
  test('builds recent command suggestions from recent actions', () => {
    const suggestions = toRecentCommandSuggestions([
      createActivity({
        command: 'deploy',
        projectName: 'api',
        stage: 'dev',
        region: 'eu-west-1',
        commandArgs: {
          stage: 'dev',
          region: 'eu-west-1',
          projectName: 'api',
          apiKey: 'secret-api-key',
          secretValue: 'secret-value',
          unknownArg: 'ignored'
        } as any
      })
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].command).toBe('deploy');
    expect(suggestions[0].args).toEqual({
      stage: 'dev',
      region: 'eu-west-1',
      projectName: 'api'
    });
    expect(suggestions[0].label).toBe('stacktape deploy --stage dev --region eu-west-1 --projectName api');
  });

  test('ignores unsupported recent operation commands', () => {
    const suggestions = toRecentCommandSuggestions([createActivity({ command: 'not-a-command' })]);

    expect(suggestions).toEqual([]);
  });

  test('formats boolean and array args', () => {
    expect(
      formatCommandLine('deploy', {
        stage: 'dev',
        region: 'eu-west-1',
        autoConfirmOperation: true,
        resourcesToSkip: ['a', 'b']
      })
    ).toBe(
      'stacktape deploy --stage dev --region eu-west-1 --autoConfirmOperation --resourcesToSkip a --resourcesToSkip b'
    );
  });

  test('normalizes primitive arg values', () => {
    expect(normalizeArgValue({ value: 'yes', allowedTypes: ['boolean'] })).toBe(true);
    expect(normalizeArgValue({ value: '15', allowedTypes: ['number'] })).toBe(15);
    expect(normalizeArgValue({ value: 'a, b', allowedTypes: ['array'] })).toEqual(['a', 'b']);
  });
});
