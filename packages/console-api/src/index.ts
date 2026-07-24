import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

export const publicPingInputSchema = z.object({ message: z.string().min(1) }).strict();
export const publicPingOutputSchema = z.object({ message: z.string().min(1) }).strict();

export type PublicPingInput = z.infer<typeof publicPingInputSchema>;
export type PublicPingOutput = z.infer<typeof publicPingOutputSchema>;

const contract = initTRPC.create();
const contractOnly = (): never => {
  throw new Error('Contract routers describe public types and must never handle requests.');
};

export const publicContractRouter = contract.router({
  publicPing: contract.procedure.input(publicPingInputSchema).output(publicPingOutputSchema).query(contractOnly)
});

export type PublicConsoleRouter = typeof publicContractRouter;

export const createPublicConsoleClient = ({ endpoint }: { endpoint: string }) =>
  createTRPCClient<PublicConsoleRouter>({
    links: [httpBatchLink({ url: endpoint })]
  });
