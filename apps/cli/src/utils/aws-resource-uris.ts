import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { sub } from '@stacktape/cloudformation/intrinsics';

import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';

export const resourceURIs = {
  lambdaApiGatewayIntegration({
    lambdaEndpointArn,
    region
  }: {
    region: AWSRegion;
    lambdaEndpointArn: string | Intrinsic;
  }) {
    return sub(`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/\${lambdaEndpointArn}/invocations`, {
      lambdaEndpointArn
    });
  },
  lambdaAuthorizer({ lambdaEndpointArn, region }: { region: AWSRegion; lambdaEndpointArn: string | Intrinsic }) {
    return sub(`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/\${lambdaEndpointArn}/invocations`, {
      lambdaEndpointArn
    });
  },
  bucket({ bucketName, region }: { bucketName: string; region: AWSRegion }) {
    return `${bucketName}.s3.${region}.amazonaws.com`;
  }
};
