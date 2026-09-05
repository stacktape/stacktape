import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersions, parseDoctorArgs, summarizeDevLoginCheck } from './test-doctor.ts';

test('parses the default and explicit doctor scopes', () => {
  assert.deepEqual(parseDoctorArgs([]), { json: false, scope: 'workspace' });
  assert.deepEqual(parseDoctorArgs(['--', '--for=console', '--json']), { json: true, scope: 'console' });
});

test('rejects unknown doctor arguments and scopes', () => {
  assert.throws(() => parseDoctorArgs(['--for=production']), /Unknown doctor scope/);
  assert.throws(() => parseDoctorArgs(['--fix']), /Unknown argument/);
});

test('compares semantic tool versions without treating 24.9 as newer than 24.15', () => {
  assert.equal(compareVersions('v24.15.0', '24.15.0'), 0);
  assert.equal(compareVersions('24.16.1', '24.15.0'), 1);
  assert.equal(compareVersions('24.9.0', '24.15.0'), -6);
});

test('login preflight requires a successful CLI result and does not repeat identity data', () => {
  const stdout = JSON.stringify({ type: 'result', ok: true, data: { email: 'private-identity@example.test' } });
  assert.deepEqual(summarizeDevLoginCheck({ code: 0, stdout, stderr: '' }), {
    name: 'Stacktape dev login',
    status: 'pass',
    detail: 'authenticated against the dev API'
  });
  assert.equal(summarizeDevLoginCheck({ code: 1, stdout, stderr: '' }).status, 'fail');
  assert.equal(summarizeDevLoginCheck({ code: 0, stdout: 'build completed', stderr: '' }).status, 'fail');
});

test('login preflight distinguishes an authentication failure from a build or network failure', () => {
  const auth = summarizeDevLoginCheck({
    code: 1,
    stdout: JSON.stringify({ type: 'result', ok: false, code: 'API_KEY_MISSING' }),
    stderr: ''
  });
  assert.equal(auth.status, 'fail');
  assert.match(auth.detail, /login missing or rejected/);
  for (const stdout of ['build failed', JSON.stringify({ type: 'result', ok: false, code: 'NETWORK_ERROR' })]) {
    const failure = summarizeDevLoginCheck({ code: 1, stdout, stderr: 'raw diagnostic with private data' });
    assert.equal(failure.status, 'fail');
    assert.match(failure.detail, /CLI check did not complete/);
    assert.doesNotMatch(failure.detail, /login missing|private data/);
  }
});
