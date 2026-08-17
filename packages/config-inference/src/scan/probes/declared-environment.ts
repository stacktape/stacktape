import type { EnvironmentVariableUse } from '../../facts/service';

const SECRETISH_NAME = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CREDENTIAL|_KEY$/;

/**
 * Classifies an environment entry that an infrastructure declaration assigns a value to.
 * CDK and Terraform expose different object syntaxes, but once a name and dependency binding
 * have been extracted they carry the same inference semantics.
 */
export const declaredEnvironmentVariable = ({
  name,
  dependencyName,
  evidence
}: {
  name: string;
  dependencyName: string | undefined;
  evidence: EnvironmentVariableUse['evidence'] | undefined;
}): EnvironmentVariableUse => ({
  name,
  role:
    dependencyName !== undefined
      ? 'infra-dependency'
      : SECRETISH_NAME.test(name)
        ? 'third-party-secret'
        : 'runtime-config',
  ...(dependencyName === undefined ? {} : { dependencyName }),
  hasDeclaredValue: true,
  required: true,
  evidence: evidence ?? []
});
