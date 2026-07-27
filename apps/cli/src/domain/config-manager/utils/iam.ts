import { GetAtt, Join } from '@cloudform/functions';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getStacktapeOriginRequestLambdaIamStatement = (buckets: {
  [stpResourceNameOfTargetedResource: string]: string[];
}) => {
  return {
    Resource: Object.keys(buckets)
      .map((bucketStpName) => [
        Join('', [GetAtt(cfLogicalNames.bucket(bucketStpName), 'Arn'), '/*']) as unknown as string
      ])
      .flat(),
    Action: ['s3:GetObject']
  };
};
