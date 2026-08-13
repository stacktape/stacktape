import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'bun:test';
import { deployArgs, deployCommandLine, startDeploy } from './run-deploy';

const request = {
  repositoryRoot: '/repo',
  configPath: 'stacktape.yml',
  stage: 'dev',
  region: 'eu-west-1',
  projectName: 'orders'
};

/** A child process that emits what we tell it to, then exits. */
const fakeChild = (stdout: string[], stderr: string[] = [], exitCode = 0) => {
  const child = new EventEmitter() as EventEmitter & { stdout: Readable; stderr: Readable; kill: () => void };
  child.stdout = Readable.from(stdout);
  child.stderr = Readable.from(stderr);
  child.kill = () => {};
  // Both streams are consumed before the process is said to have closed, which is the order Node
  // uses and the order the parser depends on.
  setTimeout(() => child.emit('close', exitCode), 10);
  return child;
};

describe('the deploy command line', () => {
  it('names everything the deploy needs, and asks for the machine-readable stream', () => {
    expect(deployArgs(request)).toEqual([
      'deploy',
      '--configPath',
      join('/repo', 'stacktape.yml'),
      // The working directory travels as a flag rather than as the spawn cwd, because in
      // development the wrapper that builds the CLI must keep its own.
      '--currentWorkingDirectory',
      '/repo',
      '--stage',
      'dev',
      '--region',
      'eu-west-1',
      '--projectName',
      'orders',
      '--agent'
    ]);
  });

  it('shows the user the same command without our own machine-readable flag', () => {
    // What is displayed has to be what a person would type; `--agent` would give them JSONL.
    expect(deployCommandLine(request)).toBe(
      'stacktape deploy --configPath stacktape.yml --stage dev --region eu-west-1 --projectName orders'
    );
  });
});

describe('reading what the deploy says', () => {
  it('parses the event stream and keeps unparseable output as log lines', async () => {
    const events: unknown[] = [];
    const lines: string[] = [];

    const handle = startDeploy({
      request,
      onEvent: (event) => events.push(event),
      onLine: (line) => lines.push(line),
      spawnChild: (() =>
        fakeChild(
          [
            `${JSON.stringify({ type: 'event', phase: 'DEPLOY', eventType: 'UPDATE_STACK', status: 'started', message: 'Creating' })}\n`,
            // Split across chunks mid-line: a stream does not respect line boundaries, and a parser
            // that assumes it does drops or corrupts whichever event happens to straddle a read.
            `${JSON.stringify({ type: 'result', ok: true, code: 'OK', message: 'Deployed' }).slice(0, 20)}`,
            `${JSON.stringify({ type: 'result', ok: true, code: 'OK', message: 'Deployed' }).slice(20)}\n`,
            'not json at all\n'
          ],
          ['a warning on stderr\n']
        )) as never
    });

    expect(await handle.finished).toBe(0);
    expect(events).toEqual([
      { type: 'event', phase: 'DEPLOY', eventType: 'UPDATE_STACK', status: 'started', message: 'Creating' },
      { type: 'result', ok: true, code: 'OK', message: 'Deployed' }
    ]);
    expect(lines).toEqual(['not json at all', 'a warning on stderr']);
  });

  it('reports a child that could not start rather than hanging', async () => {
    const lines: string[] = [];
    const child = new EventEmitter() as EventEmitter & { stdout: null; stderr: null; kill: () => void };
    child.stdout = null;
    child.stderr = null;
    child.kill = () => {};
    setTimeout(() => child.emit('error', new Error('spawn stacktape ENOENT')), 5);

    const handle = startDeploy({
      request,
      onEvent: () => {},
      onLine: (line) => lines.push(line),
      spawnChild: (() => child) as never
    });

    expect(await handle.finished).toBe(1);
    expect(lines[0]).toContain('ENOENT');
  });
});
