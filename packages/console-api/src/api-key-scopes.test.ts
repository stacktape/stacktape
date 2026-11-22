import assert from 'node:assert/strict';
import test from 'node:test';
import {
  API_KEY_PROCEDURE_SCOPES,
  API_KEY_SCOPE_PRESETS,
  apiKeyScopePresetOf,
  apiKeyScopeRefusalMessage,
  apiKeyScopesAllow,
  apiKeyScopesSchema,
  capApiKeyScopes,
  fullApiKeyScopes,
  maxApiKeyScopeLevel,
  summarizeApiKeyScopes,
  type ApiKeyScopes
} from './api-key-scopes.js';

const ciDeploys: ApiKeyScopes = { deploys: 'WRITE', incidents: 'NONE', organization: 'NONE' };
const readOnly: ApiKeyScopes = { deploys: 'READ', incidents: 'READ', organization: 'READ' };

test('a key without scopes reaches every procedure, as keys did before scopes', () => {
  for (const procedure of Object.keys(API_KEY_PROCEDURE_SCOPES)) assert.equal(apiKeyScopesAllow(null, procedure), true);
});

test('scopes decide each procedure by its area and level; write includes read', () => {
  const cases: Array<[ApiKeyScopes, string, boolean]> = [
    [ciDeploys, 'canDeploy', true],
    [ciDeploys, 'awsAccountCredentials', true],
    [ciDeploys, 'recordStackOperation', true],
    [ciDeploys, 'reportEvent', true],
    [ciDeploys, 'stackDetails', true],
    [ciDeploys, 'currentUserAndOrgData', true],
    [ciDeploys, 'globalConfig', true],
    [ciDeploys, 'incidentsFromCli', false],
    [ciDeploys, 'createOrganizationFromCli', false],
    [ciDeploys, 'listOrganizationsFromCli', false],
    [readOnly, 'projectsWithStages', true],
    [readOnly, 'incidentsFromCli', true],
    [readOnly, 'listOrganizationsFromCli', true],
    [readOnly, 'canDeploy', false],
    [readOnly, 'recordStackOperation', false],
    [readOnly, 'resolveIncidentFromCli', false],
    [readOnly, 'initAwsConnectionForCli', false],
    [readOnly, 'connectAiSubscriptionFromCli', false],
    // A name outside the contract is never reachable with scopes.
    [readOnly, 'toString', false],
    [readOnly, 'template', false]
  ];
  for (const [scopes, procedure, allowed] of cases) {
    assert.equal(apiKeyScopesAllow(scopes, procedure), allowed, `${procedure} with ${JSON.stringify(scopes)}`);
  }
});

test('the stored shape is exactly the three areas with a known level', () => {
  assert.equal(apiKeyScopesSchema.safeParse(ciDeploys).success, true);
  assert.equal(apiKeyScopesSchema.safeParse({ ...ciDeploys, billing: 'READ' }).success, false);
  assert.equal(
    apiKeyScopesSchema.safeParse({ deploys: 'ADMIN', incidents: 'NONE', organization: 'NONE' }).success,
    false
  );
  assert.equal(apiKeyScopesSchema.safeParse({ deploys: 'WRITE' }).success, false);
});

test('scopes never offer more than the role: Viewers read, organization keys do not manage organizations', () => {
  assert.deepEqual(fullApiKeyScopes({ role: 'VIEWER', owner: 'personal' }), {
    deploys: 'READ',
    incidents: 'READ',
    organization: 'WRITE'
  });
  assert.deepEqual(fullApiKeyScopes({ role: 'DEVELOPER', owner: 'organization' }), {
    deploys: 'WRITE',
    incidents: 'WRITE',
    organization: 'READ'
  });
  assert.deepEqual(fullApiKeyScopes({ role: 'ADMIN', owner: 'organization' }), {
    deploys: 'WRITE',
    incidents: 'WRITE',
    organization: 'WRITE'
  });
  assert.equal(maxApiKeyScopeLevel({ area: 'organization', role: 'DEVELOPER', owner: 'personal' }), 'WRITE');
  assert.deepEqual(capApiKeyScopes(ciDeploys, { role: 'VIEWER', owner: 'personal' }), {
    deploys: 'READ',
    incidents: 'NONE',
    organization: 'NONE'
  });
});

test('presets match their scopes back, and everything else is custom', () => {
  for (const preset of API_KEY_SCOPE_PRESETS) assert.equal(apiKeyScopePresetOf(preset.scopes), preset.id);
  assert.equal(apiKeyScopePresetOf({ deploys: 'WRITE', incidents: 'READ', organization: 'NONE' }), 'custom');
});

test('the summary says what a key can do and names what it cannot reach', () => {
  assert.equal(summarizeApiKeyScopes(null), 'Can do everything its role allows.');
  assert.equal(
    summarizeApiKeyScopes(ciDeploys),
    'Can deploy and delete stages. No access to incidents and errors, and the organization and AWS accounts.'
  );
  assert.equal(
    summarizeApiKeyScopes({ deploys: 'READ', incidents: 'WRITE', organization: 'NONE' }),
    'Can read deploys, and resolve incidents and errors. No access to the organization and AWS accounts.'
  );
  assert.equal(
    summarizeApiKeyScopes({ deploys: 'NONE', incidents: 'NONE', organization: 'NONE' }),
    'Can only check who it is. It reaches no area.'
  );
});

test('a refusal says what the key has, what the request needs and where to make a key that can', () => {
  assert.equal(
    apiKeyScopeRefusalMessage(readOnly, 'recordStackOperation'),
    'This API key has read access to deploys and stages, and this request needs write access. Create a key with Write for "Deploys and stages" on the API keys page of the Stacktape Console.'
  );
  assert.equal(
    apiKeyScopeRefusalMessage(ciDeploys, 'incidentsFromCli'),
    'This API key has no access to incidents and errors, and this request needs read access. Create a key with Read for "Incidents and errors" on the API keys page of the Stacktape Console.'
  );
});
