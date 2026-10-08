/**
 * A loopback stand-in for the Stacktape control plane, speaking the tRPC HTTP batch protocol the CLI's API-key client
 * uses. It answers the few procedures a stack operation needs, records every call, and refuses anything else with a
 * tRPC `NOT_FOUND` error so an unexpected dependency on the Console shows up in the test instead of hanging.
 */
import type { Server } from 'node:http';
import { createServer } from 'node:http';

export const FAKE_AWS_ACCOUNT_ID = '123456789012';

export type ControlPlaneCall = { procedure: string; input: unknown };

export type ControlPlaneFake = {
  endpoint: string;
  calls: ControlPlaneCall[];
  unexpectedProcedures: string[];
  close: () => Promise<void>;
};

const readBody = (request: import('node:http').IncomingMessage) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

const listen = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

export const startControlPlaneFake = async ({
  projectName,
  permissions = ['deployments:delete-non-production', 'deployments:delete-production', 'deployments:deploy']
}: {
  projectName: string;
  permissions?: string[];
}): Promise<ControlPlaneFake> => {
  const calls: ControlPlaneCall[] = [];
  const unexpectedProcedures: string[] = [];

  const answers: Record<string, (input: unknown) => unknown> = {
    currentUserAndOrgData: () => ({
      user: { id: 'user-cli-process', name: 'CLI Process Test', email: 'cli-process@example.com' },
      organization: {
        id: 'org-cli-process',
        name: 'CLI process organization',
        role: 'OWNER',
        securityScanningEnabled: false,
        issuesEnabled: false
      },
      connectedAwsAccounts: [
        {
          id: 'aws-connection-cli-process',
          organizationId: 'org-cli-process',
          name: 'cli-process-account',
          awsAccountId: FAKE_AWS_ACCOUNT_ID,
          state: 'ACTIVE',
          primaryRegions: ['eu-west-1'],
          defaultRegion: 'eu-west-1',
          connectionMode: 'BASIC'
        }
      ],
      projects: [
        {
          id: 'project-cli-process',
          organizationId: 'org-cli-process',
          name: projectName,
          configPath: null,
          defaultRegion: 'eu-west-1'
        }
      ],
      permissions,
      isProjectScoped: false
    }),
    recordStackOperation: () => ({ recorded: true }),
    recordSecurityReport: () => ({ accepted: true }),
    globalConfig: () => ({ alarms: [], notificationChannels: [], deploymentNotifications: [], guardrails: [] }),
    syncUptimeChecks: () => ({ missingChannelNames: [] }),
    defaultDomainsInfo: () => ({
      suffix: '-00000000.stacktape-app.com',
      certDomainSuffix: '.stacktape-app.com',
      version: 1
    }),
    canDeploy: () => ({ canDeploy: true }),
    reportEvent: () => ({ accepted: true }),
    deleteUndeployedStageFromCli: () => ({ deleted: true })
  };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const procedures = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
      .split(',')
      .filter(Boolean);
    const body = request.method === 'POST' ? await readBody(request) : (url.searchParams.get('input') ?? '{}');
    let inputs: Record<string, unknown> = {};
    try {
      inputs = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    } catch {
      inputs = {};
    }
    const isBatch = url.searchParams.get('batch') === '1';
    const results = procedures.map((procedure, index) => {
      const input = isBatch ? inputs[String(index)] : inputs;
      calls.push({ procedure, input });
      const answer = answers[procedure];
      if (!answer) {
        unexpectedProcedures.push(procedure);
        return {
          error: {
            message: `The control-plane fake has no answer for ${procedure}.`,
            code: -32004,
            data: { code: 'NOT_FOUND', httpStatus: 404, path: procedure }
          }
        };
      }
      return { result: { data: answer(input) } };
    });
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(isBatch ? results : results[0]));
  });

  await listen(server);
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The control-plane fake did not bind a TCP port.');
  }
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    calls,
    unexpectedProcedures,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      })
  };
};
