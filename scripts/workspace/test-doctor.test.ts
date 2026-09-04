import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersions, parseDoctorArgs } from './test-doctor.ts';

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
