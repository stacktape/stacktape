import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./console-dev-reservation.ts', import.meta.url));
const env = { ...process.env, STP_CONSOLE_DEV_RESERVATION: '', AWS_EC2_METADATA_DISABLED: 'true' };

test('the actual reservation check refuses a missing task ID without starting AWS or a deployment', () => {
  const result = spawnSync(process.execPath, [script, 'check'], { env, encoding: 'utf8', timeout: 5_000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /First run: pnpm console:dev:reservation acquire/);
  assert.equal(result.stdout, '');
});

test('the actual entrypoint rejects ambiguous or unsupported commands before AWS access', () => {
  for (const args of [[], ['acquire'], ['release', 'somebody-else'], ['force'], ['status', '--production']]) {
    const result = spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', timeout: 5_000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  }
});
