import assert from 'node:assert/strict';
import test from 'node:test';
import { guardrailDefinitionSchema } from './guardrails.js';
import {
  countSecurityFindingsBySeverity,
  getSecurityRule,
  recordSecurityReportInputSchema,
  SECURITY_RULE_IDS,
  SECURITY_RULES,
  securityReportFindingSchema
} from './security.js';

const finding = {
  kind: 'POSTURE' as const,
  ruleId: 'database-reachable-from-internet',
  fingerprint: 'database-reachable-from-internet:mainDatabase',
  severity: 'HIGH' as const,
  title: 'Database reachable from the internet',
  message: 'Database `mainDatabase` uses accessibility mode `internet`.',
  resourceName: 'mainDatabase',
  resourceType: 'relational-database'
};

test('a report needs the deployment it belongs to and the kinds it covered', () => {
  const parsed = recordSecurityReportInputSchema.parse({
    invocationId: 'inv-1',
    catalogVersion: 1,
    coveredKinds: ['POSTURE', 'SECRET'],
    findings: [finding]
  });
  assert.deepEqual(parsed.exposure, []);
  assert.equal(parsed.findings[0]?.fingerprint, finding.fingerprint);

  assert.equal(
    recordSecurityReportInputSchema.safeParse({ invocationId: 'inv-1', catalogVersion: 1, findings: [] }).success,
    false,
    'coveredKinds is required: without it the Console cannot tell a clean stack from an unevaluated kind'
  );
});

test('findings describe themselves, so an unknown rule id is still accepted', () => {
  assert.equal(securityReportFindingSchema.safeParse({ ...finding, ruleId: 'rule-from-a-newer-cli' }).success, true);
  for (const broken of [
    { ...finding, severity: 'SEVERE' },
    { ...finding, kind: 'VULNERABILITY' },
    { ...finding, fingerprint: '' },
    { ...finding, message: 'x'.repeat(2001) }
  ]) {
    assert.equal(securityReportFindingSchema.safeParse(broken).success, false, JSON.stringify(broken).slice(0, 80));
  }
});

test('rule lookup ignores inherited object properties, so every accepted rule id is safe to display', () => {
  for (const ruleId of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(securityReportFindingSchema.safeParse({ ...finding, ruleId }).success, true);
    assert.equal(getSecurityRule(ruleId), undefined);
  }
  assert.equal(getSecurityRule('database-reachable-from-internet')?.kind, 'POSTURE');
});

test('every guardrail mapping in the catalog names a guardrail that exists', () => {
  for (const ruleId of SECURITY_RULE_IDS) {
    const rule = SECURITY_RULES[ruleId];
    if (!('guardrailType' in rule) || !rule.guardrailType) continue;
    const parsed = guardrailDefinitionSchema.safeParse({ type: rule.guardrailType, properties: { enabled: true } });
    assert.equal(parsed.success, true, `${ruleId} maps to unknown guardrail ${rule.guardrailType}`);
  }
});

test('severity counts cover every severity even when nothing was found', () => {
  assert.deepEqual(countSecurityFindingsBySeverity([]), { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 });
  assert.deepEqual(countSecurityFindingsBySeverity([{ severity: 'HIGH' }, { severity: 'HIGH' }, { severity: 'LOW' }]), {
    CRITICAL: 0,
    HIGH: 2,
    MEDIUM: 0,
    LOW: 1,
    INFO: 0
  });
});
