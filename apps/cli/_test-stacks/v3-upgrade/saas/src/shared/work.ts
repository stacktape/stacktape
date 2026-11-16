// Shared by every function, so each bundle pulls in a common module as a real backend's functions do.
export type WorkEvent = { fail?: boolean; payload?: unknown };

export const doWork = async (name: string, event: WorkEvent | undefined) => {
  if (event?.fail) throw new Error(`${name} failed on purpose`);
  return { name, region: process.env.AWS_REGION, apiKeyConfigured: Boolean(process.env.PARTNER_API_KEY) };
};
