import { GetAtt, Join } from '@cloudform/functions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

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
