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
