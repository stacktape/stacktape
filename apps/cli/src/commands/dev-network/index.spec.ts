import { describe, expect, test } from 'bun:test';
import { createDeletionProgressReporter, formatStageHolders, readStageHolders } from './index';

const alice = {
  stack: 'shop-dev',
  session: 's-1',
  owner: 'u-1',
  label: 'Alice (alice-laptop, ~/shop)',
  since: 1_700_000_000
};
const bob = { stack: 'api-dev', session: 's-2', owner: 'u-2', label: 'Bob (bob-pc, ~/api)', since: 1_700_003_600 };

describe('dev network stage holders', () => {
  test('lists who runs each stage and since when, from the relay of a running box', async () => {
    const result = await readStageHolders({ boxState: 'running', listSessions: async () => [alice, bob] });
    expect(result).toEqual({
      holders: [
        { stack: 'api-dev', holder: bob.label, since: '2023-11-14T23:13:20.000Z' },
        { stack: 'shop-dev', holder: alice.label, since: '2023-11-14T22:13:20.000Z' }
      ]
    });
    const lines = formatStageHolders(result, 'running', Date.parse('2023-11-15T00:18:20.000Z'));
    expect(lines[0]).toBe('  Dev sessions (stage: who runs it, since when):');
    expect(lines[1]).toStartWith(`    api-dev: ${bob.label}, since `);
    expect(lines[1]).toEndWith('(1 h 5 min)');
    expect(lines[2]).toEndWith('(2 h 5 min)');
  });

  test('a stopped box has no sessions and is not asked', async () => {
    let asked = false;
    const result = await readStageHolders({
      boxState: 'stopped',
      listSessions: async () => {
        asked = true;
        return [alice];
      }
    });
    expect({ result, asked }).toEqual({ result: { holders: [] }, asked: false });
    expect(formatStageHolders(result, 'stopped')).toEqual([
      '  Dev sessions: none (a running session keeps the dev box running)'
    ]);
  });

  test('a box whose relay does not answer reports the sessions as unknown, with the reason', async () => {
    const result = await readStageHolders({
      boxState: 'pending',
      listSessions: async () => {
        throw new Error('the dev box relay did not answer');
      }
    });
    expect(result).toEqual({ holders: undefined, reason: 'the dev box relay did not answer' });
    expect(formatStageHolders(result, 'pending')).toEqual([
      '  Dev sessions: unknown (the dev box relay did not answer)'
    ]);
  });
});

// r2p dogfood: the deletion announced "about 2 minutes", took 1,207 s waiting for Lambda's network interfaces, and said
// nothing meanwhile.
test('a long network deletion is reported when it starts waiting for Lambda and once a minute after that', () => {
  const lines: string[] = [];
  const report = createDeletionProgressReporter({ report: (line) => lines.push(line) });
  const waiting = (elapsedMs: number, lambda: boolean) =>
    report({
      elapsedMs,
      deleting: lambda ? ['LambdaSecurityGroup'] : ['Box'],
      waitingForLambdaNetworkInterfaces: lambda
    });
  waiting(5_000, false);
  waiting(40_000, false);
  waiting(45_000, true);
  waiting(80_000, true);
  waiting(106_000, true);
  waiting(1_207_000, true);
  expect(lines).toEqual([
    'Still deleting the dev network (45 s): waiting for AWS to release the network interfaces of deleted Lambda functions, which can take up to about 20 minutes.',
    'Still deleting the dev network (1 min): waiting for AWS to release the network interfaces of deleted Lambda functions, which can take up to about 20 minutes.',
    'Still deleting the dev network (20 min): waiting for AWS to release the network interfaces of deleted Lambda functions, which can take up to about 20 minutes.'
  ]);
});
