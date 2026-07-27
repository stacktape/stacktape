import { Sub } from '@cloudform/functions';

export const resourceURIs = {
  lambdaAuthorizer({
    lambdaEndpointArn,
    region
  }: {
    region: AWSRegion;
    lambdaEndpointArn: string | IntrinsicFunction;
  }) {
    return Sub(`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/\${lambdaEndpointArn}/invocations`, {
      lambdaEndpointArn
    });
  },
  bucket({ bucketName, region }: { bucketName: string; region: AWSRegion }) {
    return `${bucketName}.s3.${region}.amazonaws.com`;
  }
};
