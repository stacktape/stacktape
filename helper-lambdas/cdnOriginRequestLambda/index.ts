import type { CloudFrontRequestHandler } from 'aws-lambda';
import { S3 } from '@aws-sdk/client-s3';
import { stacktapeCloudfrontHeaders } from '@shared/naming/stacktape-cloudfront-headers';

const hasExtensionRegex = /(.+)\.[a-z0-9]+$/i;

let s3Client: S3;

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;
  const url: string = removeTrailingSlash(request.uri);

  // based on customHeaders determine what modifications should be made to request
  const originType: StpCdnOriginTargetableByRouteRewrite = (request.origin.custom || request.origin.s3).customHeaders[
    stacktapeCloudfrontHeaders.originType().toLowerCase()
  ][0].value as StpCdnOriginTargetableByRouteRewrite;

  // the uri manipulation operations are only applicable for bucket origins
  // we only transform/modify paths which do NOT have extensions (i.e paths ending with ".json", ".jpg" are never transformed)
  if (originType === 'bucket' && !url.match(hasExtensionRegex)) {
    const isSpa =
      request.origin.s3.customHeaders[stacktapeCloudfrontHeaders.spaHeader().toLowerCase()][0].value === 'true';
    if (isSpa) {
      request.uri = '/index.html';
      // once we know it is SPA, there should be no more operations, therefore we can return(forward) request
      return request;
    }
    const optimizeUrl =
      request.method === 'GET' &&
      request.origin.s3.customHeaders[stacktapeCloudfrontHeaders.urlOptimization().toLowerCase()][0].value === 'true';
    if (optimizeUrl) {
      if (!s3Client) {
        s3Client = new S3({ region: request.origin.s3.region });
      }
      const bucketName: string = request.origin.s3.domainName.split('.')[0];
      if (await objectExistsInBucket(`${url}/index.html`, bucketName)) {
        request.uri = `${url}/index.html`;
      } else {
        request.uri = `${url}.html`;
      }
    }
    return request;
  }

  const rewriteHostHeaderExists = (request.origin.custom || request.origin.s3).customHeaders?.[
    stacktapeCloudfrontHeaders.rewriteHostHeader().toLowerCase()
  ]?.length;
  if (rewriteHostHeaderExists) {
    request.headers.host = [
      {
        value:
          request.origin.custom.customHeaders[stacktapeCloudfrontHeaders.rewriteHostHeader().toLowerCase()][0].value
      }
    ];
  }
  return request;
};

const removeTrailingSlash = (url: string) => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const objectExistsInBucket = async (objectKey: string, bucketName: string) => {
  try {
    await s3Client.headObject({ Bucket: bucketName, Key: objectKey.slice(1) });
  } catch {
    return false;
  }
  return true;
};

export default handler;
