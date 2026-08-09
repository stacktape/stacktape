import assert from 'node:assert/strict';
import test from 'node:test';
import { guardrailDefinitionInputSchema, guardrailDefinitionSchema } from './guardrails.js';

test('accepts the new recovery and availability guardrails', () => {
  for (const type of [
    'require-stack-termination-protection',
    'require-data-backups',
    'require-multiple-container-instances'
  ]) {
    assert.equal(guardrailDefinitionInputSchema.safeParse({ type, properties: { enabled: true } }).success, true, type);
  }
});

test('keeps structurally valid legacy no-op definitions readable but does not allow creating them', () => {
  const definition = { type: 'stage-restriction', properties: {} };
  assert.equal(guardrailDefinitionSchema.safeParse(definition).success, true);
  assert.equal(guardrailDefinitionInputSchema.safeParse(definition).success, false);
});

test('rejects command names the CLI cannot enforce', () => {
  const result = guardrailDefinitionInputSchema.safeParse({
    type: 'command-restriction',
    properties: { blockedCommands: ['preview-changes'] }
  });
  assert.equal(result.success, false);
});

test('supports the database instance allowlist while retaining the legacy blocklist', () => {
  assert.equal(
    guardrailDefinitionInputSchema.safeParse({
      type: 'database-instance-restriction',
      properties: { allowedInstanceSizes: ['db.t4g.medium'] }
    }).success,
    true
  );
  assert.equal(
    guardrailDefinitionSchema.safeParse({
      type: 'database-instance-restriction',
      properties: { blockedInstanceSizes: ['db.r5.4xlarge'] }
    }).success,
    true
  );
});
