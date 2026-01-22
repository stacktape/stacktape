import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

export default async (event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  const hostHeader = headers.host?.[0]?.value;

  if (hostHeader) {
    headers['viewer-host'] = [
      {
        key: 'viewer-host',
        value: hostHeader
      }
    ];
  }

  return request;
};
