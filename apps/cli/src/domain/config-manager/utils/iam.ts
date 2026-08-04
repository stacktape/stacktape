import { getAtt, join } from '@stacktape/cloudformation/intrinsics';

import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const getStacktapeOriginRequestLambdaIamStatement = (buckets: {
  [stpResourceNameOfTargetedResource: string]: string[];
}) => {
  return {
    Resource: Object.keys(buckets)
      .map((bucketStpName) => [
        join('', [getAtt(cfLogicalNames.bucket(bucketStpName), 'Arn'), '/*']) as unknown as string
      ])
      .flat(),
    Action: ['s3:GetObject']
  };
};
