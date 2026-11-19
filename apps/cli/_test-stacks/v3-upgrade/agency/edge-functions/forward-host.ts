// Viewer-request edge function: passes the viewer's host to the origin, which the CDN would otherwise replace.
type CloudFrontRequestEvent = {
  Records: { cf: { request: { headers: Record<string, { key?: string; value: string }[]> } } }[];
};

export default async (event: CloudFrontRequestEvent) => {
  const { request } = event.Records[0]!.cf;
  const host = request.headers.host?.[0]?.value;
  if (host) request.headers['x-forwarded-host'] = [{ key: 'X-Forwarded-Host', value: host }];
  return request;
};
