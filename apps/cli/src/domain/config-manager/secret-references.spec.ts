import { describe, expect, test } from 'bun:test';
import {
  getContainerSecretIamResources,
  getContainerSecretValueFrom,
  parseContainerSecretReference
} from './container-secrets';
import { getNestedSecretReferences, parseSecretReference } from './secret-references';

/**
 * `$Secret('name', 'key')` names the secret literally and selects a top-level JSON key. The Stacktape 3 form
 * `$Secret('name.key')` keeps its meaning: the text before the first dot is the secret, the next segment the key.
 */
describe('$Secret references', () => {
  test.each([
    [['database'], { secretName: 'database' }],
    [['database.password'], { secretName: 'database', jsonKey: 'password' }],
    // The legacy form reads the first two segments, exactly as Stacktape 3 did.
    [['billing.api.token'], { secretName: 'billing', jsonKey: 'api' }],
    [['database', 'password'], { secretName: 'database', jsonKey: 'password' }],
    [['billing.api', 'token'], { secretName: 'billing.api', jsonKey: 'token' }],
    [['billing.api', ''], { secretName: 'billing.api' }],
    [['billing.api', 'nested.key'], { secretName: 'billing.api', jsonKey: 'nested.key' }]
  ])('%j reads %j', (args, reference) => {
    expect(parseSecretReference(args)).toEqual(reference);
  });

  test('nested references are found in both forms', () => {
    expect(
      getNestedSecretReferences("$CfFormat('{}:{}', $Secret('billing.api', 'token'), $Secret('database.password'))")
    ).toEqual([
      { secretName: 'billing.api', jsonKey: 'token' },
      { secretName: 'database', jsonKey: 'password' }
    ]);
  });

  test('a container secret keeps the literal secret name for its selector and IAM scope', () => {
    const explicit = parseContainerSecretReference("$Secret('billing.api', 'token')");
    expect(explicit).toMatchObject({ service: 'secretsmanager', secretName: 'billing.api', jsonKey: 'token' });
    expect(getContainerSecretValueFrom(explicit!)).toBe('$ContainerSecret("billing.api", "token")');

    // The one-argument form produces the same internal directive as before.
    const legacy = parseContainerSecretReference("$Secret('database.password')");
    expect(legacy).toMatchObject({ secretName: 'database', jsonKey: 'password' });
    expect(getContainerSecretValueFrom(legacy!)).toBe('$ContainerSecret("database.password")');

    expect(
      JSON.stringify(getContainerSecretIamResources(["$Secret('billing.api', 'token')"]).secretResources)
    ).toContain('"SecretName":"billing.api"');
    expect(parseContainerSecretReference("$Secret('a', 'b', 'c')")).toBeNull();
    expect(parseContainerSecretReference("$SsmParam('/a', 'b')")).toBeNull();
  });
});
