import referenceableParams from '../../@generated/cloudformation-resource-referenceable-params.json' with { type: 'json' };

const referencablePrivateTypes = {
  'MongoDB::StpAtlasV1::Cluster': {
    Ref: ['ClusterCfnIdentifier'],
    GetAtt: ['ConnectionString', 'SrvConnectionString', 'StateName']
  },
  'MongoDB::StpAtlasV1::DatabaseUser': {
    Ref: ['UserCfnIdentifier'],
    GetAtt: []
  },
  'MongoDB::StpAtlasV1::Project': {
    Ref: ['Id'],
    GetAtt: []
  },
  'Stacktape::ECSBlueGreenV1::Service': { Ref: ['Arn'], GetAtt: ['Name'] }
};

export const referenceableTypes: { [resourceType: string]: { GetAtt: string[]; Ref: string[] } } = {
  ...referenceableParams,
  ...referencablePrivateTypes
};

export const getAllReferencableParams = (cloudformationType: string) => {
  return [
    ...(referenceableTypes[cloudformationType]?.Ref || []),
    ...(referenceableTypes[cloudformationType]?.GetAtt || [])
  ];
};

/**
 * Attributes of CloudFormation resource types whose value is a credential. A `$CfResourceParam` of one never becomes a
 * stack output: outputs are readable by anyone allowed `cloudformation:DescribeStacks`. Attributes that name a secret
 * (an ARN or ID) are not secrets themselves.
 */
const SECRET_ATTRIBUTES: Record<string, RegExp> = {
  'AWS::IAM::AccessKey': /^SecretAccessKey$/,
  'AWS::Cognito::UserPoolClient': /^ClientSecret$/,
  'AWS::AppSync::ApiKey': /^ApiKey$/,
  'AWS::MediaPackage::Channel': /Password$/,
  'AWS::ManagedBlockchain::Accessor': /^BillingToken$/
};
/** What a custom resource returns is unknown; an attribute named like a credential is treated as one. */
const SECRET_LIKE_ATTRIBUTE = /secret|password|passwd|token|private.?key|api.?key|credential|auth.?key/i;
const REFERENCE_TO_SECRET = /(Arn|Id|Name)$/;

export const isSecretCfAttribute = (cloudformationType: string, attribute: string): boolean => {
  if (SECRET_ATTRIBUTES[cloudformationType]?.test(attribute)) return true;
  const isCustomResource =
    cloudformationType === 'AWS::CloudFormation::CustomResource' || cloudformationType.startsWith('Custom::');
  return isCustomResource && SECRET_LIKE_ATTRIBUTE.test(attribute) && !REFERENCE_TO_SECRET.test(attribute);
};
