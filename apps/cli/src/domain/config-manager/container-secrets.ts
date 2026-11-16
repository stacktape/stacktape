import { sub } from '@stacktape/cloudformation/intrinsics';
import { getDirectiveName, getDirectiveParams, getDirectivePathToProp, getIsDirective } from '@utils/directives';
import { parseSecretReference } from './secret-references';

export type ContainerSecretReference =
  | { service: 'secretsmanager'; reference: string; secretName: string; jsonKey?: string; explicitKey: boolean }
  | { service: 'ssm'; reference: string; parameterName: string };

/** Parses the deliberately narrow syntax accepted by a container `secrets` entry. */
export const parseContainerSecretReference = (valueFrom: string): ContainerSecretReference | null => {
  if (!getIsDirective(valueFrom) || getDirectivePathToProp(valueFrom).length > 0) {
    return null;
  }

  const directiveName = getDirectiveName(valueFrom);
  if (directiveName !== 'Secret' && directiveName !== 'SsmParam') {
    return null;
  }

  const params = getDirectiveParams(directiveName, valueFrom);
  const maxParams = directiveName === 'Secret' ? 2 : 1;
  if (params.length < 1 || params.length > maxParams || params.some(({ value }) => typeof value !== 'string')) {
    return null;
  }

  const reference = params[0].value as string;
  if (directiveName === 'SsmParam') {
    return { service: 'ssm', reference, parameterName: reference };
  }

  const { secretName, jsonKey } = parseSecretReference(params.map(({ value }) => value));
  return {
    service: 'secretsmanager',
    reference,
    secretName,
    ...(jsonKey ? { jsonKey } : {}),
    explicitKey: params.length === 2
  };
};

const getSsmParameterArn = (parameterName: string) =>
  sub(
    `arn:\${AWS::Partition}:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter${
      parameterName.startsWith('/') ? parameterName : `/${parameterName}`
    }`
  );

/** The ARN/selector understood by ECS and Batch without ever resolving the sensitive value into CloudFormation. */
export const getContainerSecretValueFrom = (reference: ContainerSecretReference) => {
  if (reference.service === 'ssm') return getSsmParameterArn(reference.parameterName);
  // The two-argument form names the secret literally, so it reaches `$ContainerSecret` as two arguments too.
  return reference.explicitKey
    ? `$ContainerSecret(${JSON.stringify(reference.secretName)}, ${JSON.stringify(reference.jsonKey ?? '')})`
    : `$ContainerSecret(${JSON.stringify(reference.reference)})`;
};

/** Non-sensitive task metadata that makes an SSM parameter version change register a fresh task definition. */
export const getContainerSecretVersionLabels = (valueFromEntries: string[] | undefined) =>
  Object.fromEntries(
    (valueFromEntries || [])
      .map(parseContainerSecretReference)
      .filter((reference): reference is Extract<ContainerSecretReference, { service: 'ssm' }> =>
        Boolean(reference && reference.service === 'ssm')
      )
      .map((reference, index) => [
        `stacktape.ssm-secret-version.${index}`,
        `$ContainerSsmParameterVersion(${JSON.stringify(reference.parameterName)})`
      ])
  );

export const getContainerSecretIamResources = (valueFromEntries: string[] | undefined) => {
  const secretResources = new Set<unknown>();
  const parameterResources = new Set<unknown>();

  for (const valueFrom of valueFromEntries || []) {
    const reference = parseContainerSecretReference(valueFrom);
    if (reference?.service === 'ssm') {
      parameterResources.add(getSsmParameterArn(reference.parameterName));
    } else if (reference?.service === 'secretsmanager') {
      secretResources.add(
        reference.secretName.startsWith('arn:')
          ? reference.secretName
          : sub('arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${SecretName}-*', {
              SecretName: reference.secretName
            })
      );
    }
  }

  return { secretResources: [...secretResources], parameterResources: [...parameterResources] };
};
