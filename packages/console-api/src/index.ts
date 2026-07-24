import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

export const healthOutputSchema = z.object({ status: z.literal('ok'), apiVersion: z.literal(1) }).strict();
export const estimatePriceInputSchema = z.object({ units: z.number().int().positive() }).strict();
export const estimatePriceOutputSchema = z
  .object({ currency: z.literal('USD'), total: z.number().nonnegative() })
  .strict();
export const cliProfileOutputSchema = z
  .object({ organizationId: z.string().min(1), role: z.literal('deployer') })
  .strict();
export const startDeploymentInputSchema = z.object({ project: z.string().min(1), stage: z.string().min(1) }).strict();
export const startDeploymentOutputSchema = z
  .object({ operationId: z.string().min(1), accepted: z.literal(true) })
  .strict();
export const reportAlarmInputSchema = z
  .object({ alarmName: z.string().min(1), state: z.enum(['OK', 'ALARM']) })
  .strict();
export const reportAlarmOutputSchema = z.object({ recorded: z.literal(true) }).strict();

const contract = initTRPC.create();
const contractOnly = (): never => {
  throw new Error('Contract routers describe public types and must never handle requests.');
};

export const anonymousContractRouter = contract.router({
  health: contract.procedure.output(healthOutputSchema).query(contractOnly),
  estimatePrice: contract.procedure
    .input(estimatePriceInputSchema)
    .output(estimatePriceOutputSchema)
    .query(contractOnly)
});

export const apiKeyContractRouter = contract.router({
  cliProfile: contract.procedure.output(cliProfileOutputSchema).query(contractOnly),
  startDeployment: contract.procedure
    .input(startDeploymentInputSchema)
    .output(startDeploymentOutputSchema)
    .mutation(contractOnly)
});

export const awsIdentityContractRouter = contract.router({
  reportAlarm: contract.procedure.input(reportAlarmInputSchema).output(reportAlarmOutputSchema).mutation(contractOnly)
});

export const cliContractRouter = contract.mergeRouters(anonymousContractRouter, apiKeyContractRouter);

export type AnonymousRouter = typeof anonymousContractRouter;
export type ApiKeyRouter = typeof apiKeyContractRouter;
export type AwsIdentityRouter = typeof awsIdentityContractRouter;
export type CliRouter = typeof cliContractRouter;

export const createAnonymousClient = ({ endpoint }: { endpoint: string }) =>
  createTRPCClient<AnonymousRouter>({
    links: [httpBatchLink({ url: endpoint })]
  });

export const createCliClient = ({ endpoint, apiKey }: { endpoint: string; apiKey: string }) =>
  createTRPCClient<CliRouter>({
    links: [httpBatchLink({ headers: { 'stp-api-key': apiKey }, url: endpoint })]
  });

export const createAwsIdentityClient = ({
  endpoint,
  getSignedIdentityHeader
}: {
  endpoint: string;
  /**
   * Returns the base64-encoded, SigV4-presigned STS GetCallerIdentity request expected by the Console API.
   * Keeping signing behind a provider lets callers refresh temporary credentials for every HTTP batch.
   */
  getSignedIdentityHeader: () => Promise<string>;
}) =>
  createTRPCClient<AwsIdentityRouter>({
    links: [
      httpBatchLink({
        headers: async () => ({ aws_identity: await getSignedIdentityHeader() }),
        url: endpoint
      })
    ]
  });
