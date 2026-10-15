/** True for an http(s) URL on localhost, 127.0.0.0/8 or [::1]: an AWS emulator on this machine, never real AWS. */
export const isLoopbackEndpoint = (value: string | undefined): boolean => {
  if (!value) return false;
  try {
    const endpoint = new URL(value);
    return (
      ['http:', 'https:'].includes(endpoint.protocol) &&
      (endpoint.hostname === 'localhost' ||
        endpoint.hostname === '[::1]' ||
        /^127(?:\.\d{1,3}){3}$/.test(endpoint.hostname))
    );
  } catch {
    return false;
  }
};

const configuredEndpointsIgnored = () => process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS?.toLowerCase() === 'true';

/** True when the global endpoint and every service override point at a local emulator. */
export const allAwsEndpointsAreLoopback = (): boolean => {
  if (configuredEndpointsIgnored()) return false;
  const overrides = Object.entries(process.env)
    .filter(([name, value]) => name.startsWith('AWS_ENDPOINT_URL_') && value)
    .map(([, value]) => value);
  return [process.env.AWS_ENDPOINT_URL, ...overrides].every(isLoopbackEndpoint);
};

/**
 * The S3 endpoint of a local emulator, if one is configured. CloudFormation downloads templates itself, so an override
 * that is not loopback (a proxy or VPC endpoint used with real AWS) must not end up in a template URL.
 */
export const getLocalS3Endpoint = (): string | undefined => {
  if (configuredEndpointsIgnored()) return undefined;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL;
  return isLoopbackEndpoint(endpoint) ? endpoint.replace(/\/$/, '') : undefined;
};
