import type { CloudFrontHeaders, CloudFrontResponseHandler } from 'aws-lambda';
import { stacktapeCloudfrontHeaders } from '@shared/naming/stacktape-cloudfront-headers';

export const handler: CloudFrontResponseHandler = async (event) => {
  const { request, response } = event.Records[0].cf;

  const originType: StpCdnAttachableResourceType = (request.origin.custom || request.origin.s3).customHeaders[
    stacktapeCloudfrontHeaders.originType().toLowerCase()
  ][0].value as StpCdnAttachableResourceType;
  // remove x-amz-meta prefix from all x-amz-meta headers taken from buckets
  if (originType === 'bucket') {
    const modifiedHeaders: CloudFrontHeaders = {};
    const searchPrefix = 'x-amz-meta-';
    Object.entries(response.headers).forEach(([headerName, [{ key, value }]]) => {
      if (headerName.startsWith(searchPrefix)) {
        modifiedHeaders[headerName.slice(searchPrefix.length)] = [{ key: key.slice(searchPrefix.length), value }];
      } else {
        modifiedHeaders[headerName] = [{ key, value }];
      }
    });
    response.headers = modifiedHeaders;
  }

  return response;
};

export default handler;
