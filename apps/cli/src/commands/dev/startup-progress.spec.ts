import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { tuiManager } from '@application-services/tui-manager';
import {
  reportDevStartup,
  reportDevStartupHeartbeat,
  startDevStartupReporting,
  stopDevStartupReporting
} from './startup-progress';

let messages: string[];
let emit: ReturnType<typeof spyOn>;

beforeEach(() => {
  messages = [];
  emit = spyOn(tuiManager, 'emitEvent').mockImplementation((event) => void messages.push(event.message ?? ''));
  startDevStartupReporting();
});

afterEach(() => {
  stopDevStartupReporting();
  emit.mockRestore();
});

const workload = (name: string, status: 'started' | 'completed', message: string) =>
  reportDevStartup({ step: 'DEV_WORKLOAD', status, resource: name, message });

test('parallel starts: progress names every step still running, not the one that finished last', () => {
  workload('api', 'started', 'Workload api starting: Assuming role...');
  workload('cleanup', 'started', 'Workload cleanup starting: Deploying...');
  workload('web', 'started', 'Workload web starting: Starting dev server...');
  workload('cleanup', 'completed', 'Workload cleanup running');
  workload('web', 'completed', 'Workload web running at http://localhost:4321');
  expect(messages.at(-1)).toMatch(
    /^Still starting: Workload api starting: Assuming role\.\.\.; 2 of 3 workloads running \(\d+ s\)$/
  );
  reportDevStartupHeartbeat();
  expect(messages.at(-1)).toStartWith('Still starting: Workload api starting: Assuming role...; 2 of 3 workloads');
});

test('a setup step is replaced by its later messages and removed when it completes', () => {
  reportDevStartup({
    step: 'DEV_SESSION',
    key: 'env-inject',
    status: 'started',
    message: 'Injecting environment: running'
  });
  reportDevStartup({ step: 'DEV_BOX', key: 'dev-box', status: 'started', message: 'Dev box: Starting the dev box…' });
  reportDevStartup({ step: 'DEV_BOX', key: 'dev-box', status: 'running', message: 'Dev box: Connecting…' });
  reportDevStartup({
    step: 'DEV_SESSION',
    key: 'env-inject',
    status: 'completed',
    message: 'Injecting environment: done'
  });
  expect(messages.at(-1)).toMatch(/^Still starting: Dev box: Connecting… \(\d+ s\)$/);
  reportDevStartup({ step: 'DEV_BOX', key: 'dev-box', status: 'completed', message: 'Dev box: done' });
  expect(messages.at(-1)).toBe('Dev box: done');
  reportDevStartupHeartbeat();
  expect(messages.at(-1)).toMatch(/^Still starting \(\d+ s\)$/);
});
