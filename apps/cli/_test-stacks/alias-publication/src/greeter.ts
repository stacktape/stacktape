/** Returns the configured value and the function version that served the call, so the caller can tell which ran. */
export const handler = async () => ({
  value: process.env.CANARY_VALUE ?? null,
  version: process.env.AWS_LAMBDA_FUNCTION_VERSION ?? null
});
