import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { join } from 'node:path';

const OFFLINE_ACCOUNT_ID = '111122223333';

type Environment = Record<string, string | undefined>;

export type OfflineAwsServer = {
  endpoint: string;
  unexpectedRequests: readonly string[];
  registerSecretReferences: (references: Iterable<string>) => void;
  close: () => Promise<void>;
};

const requestBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

const isGetCallerIdentity = (request: IncomingMessage, body: string) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const bodyParameters = new URLSearchParams(body);
  return (
    url.searchParams.get('Action') === 'GetCallerIdentity' ||
    bodyParameters.get('Action') === 'GetCallerIdentity' ||
    request.headers['x-amz-target'] === 'AWSSecurityTokenServiceV20110615.GetCallerIdentity'
  );
};

const queryAction = (request: IncomingMessage, body: string): string => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const bodyParameters = new URLSearchParams(body);
  const targetHeader = request.headers['x-amz-target'];
  const target = Array.isArray(targetHeader) ? targetHeader[0] : targetHeader;
  return url.searchParams.get('Action') ?? bodyParameters.get('Action') ?? target ?? 'UnknownAction';
};

const isMissingStackRead = (request: IncomingMessage, body: string) =>
  ['DescribeStacks', 'ListStackResources'].includes(queryAction(request, body).split('.').at(-1) ?? '');

const isGetTagKeys = (request: IncomingMessage, body: string) =>
  queryAction(request, body).split('.').at(-1) === 'GetTagKeys';

const emptyJsonReadResponse = (request: IncomingMessage, body: string): Record<string, unknown> | undefined => {
  const action = queryAction(request, body);
  if (action === 'AWSInsightsIndexService.GetTags') return { Tags: [] };
  if (action.endsWith('.DescribeBudgets')) return { Budgets: [] };
  return undefined;
};

const isGetSecretValue = (request: IncomingMessage, body: string) =>
  queryAction(request, body).split('.').at(-1) === 'GetSecretValue';

const requestedSecretName = (body: string) => {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const secretId = Reflect.get(parsed, 'SecretId');
      if (typeof secretId === 'string') return secretId;
    }
  } catch {}
  return 'offline-qualification-secret';
};

const missingStackResponse = (body: string) => {
  const stackName = new URLSearchParams(body).get('StackName') ?? 'offline-qualification-stack';
  return `<?xml version="1.0" encoding="UTF-8"?>
<ErrorResponse xmlns="http://cloudformation.amazonaws.com/doc/2010-05-15/">
  <Error>
    <Type>Sender</Type>
    <Code>ValidationError</Code>
    <Message>Stack with id ${stackName} does not exist</Message>
  </Error>
  <RequestId>${randomUUID()}</RequestId>
</ErrorResponse>`;
};

const callerIdentityResponse = () => `<?xml version="1.0" encoding="UTF-8"?>
<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult>
    <Arn>arn:aws:iam::${OFFLINE_ACCOUNT_ID}:user/stacktape-offline-qualification</Arn>
    <UserId>stacktape-offline-qualification</UserId>
    <Account>${OFFLINE_ACCOUNT_ID}</Account>
  </GetCallerIdentityResult>
  <ResponseMetadata><RequestId>${randomUUID()}</RequestId></ResponseMetadata>
</GetCallerIdentityResponse>`;

const listen = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

export const startOfflineAwsServer = async (): Promise<OfflineAwsServer> => {
  const unexpectedRequests: string[] = [];
  const secrets = new Map<string, Set<string>>();
  const server = createServer(async (request, response) => {
    try {
      const body = await requestBody(request);
      if (isGetCallerIdentity(request, body)) {
        response.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' });
        response.end(callerIdentityResponse());
        return;
      }
      if (isMissingStackRead(request, body)) {
        response.writeHead(400, { 'content-type': 'text/xml; charset=utf-8' });
        response.end(missingStackResponse(body));
        return;
      }
      if (isGetTagKeys(request, body)) {
        response.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' });
        response.end(JSON.stringify({ TagKeys: [] }));
        return;
      }
      const emptyRead = emptyJsonReadResponse(request, body);
      if (emptyRead !== undefined) {
        response.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' });
        response.end(JSON.stringify(emptyRead));
        return;
      }
      if (isGetSecretValue(request, body)) {
        const name = requestedSecretName(body);
        const secretKeys = secrets.get(name);
        if (secretKeys === undefined) {
          const requestName = `${request.method ?? 'UNKNOWN'} ${request.url ?? '/'} (GetSecretValue:${name})`;
          unexpectedRequests.push(requestName);
          response.writeHead(404, { 'content-type': 'application/x-amz-json-1.1' });
          response.end(
            JSON.stringify({ __type: 'ResourceNotFoundException', message: `Unknown offline secret ${name}.` })
          );
          return;
        }
        response.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' });
        response.end(
          JSON.stringify({
            ARN: `arn:aws:secretsmanager:eu-west-1:${OFFLINE_ACCOUNT_ID}:secret:${name}`,
            Name: name,
            VersionId: '00000000000000000000000000000000',
            SecretString:
              secretKeys.size === 0
                ? 'offline-value'
                : JSON.stringify(Object.fromEntries([...secretKeys].map((key) => [key, 'offline-value'])))
          })
        );
        return;
      }

      const requestName = `${request.method ?? 'UNKNOWN'} ${request.url ?? '/'} (${queryAction(request, body)})`;
      unexpectedRequests.push(requestName);
      response.writeHead(501, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          code: 'OFFLINE_QUALIFICATION_BLOCKED_NETWORK',
          message: `The offline qualification server refuses ${requestName}.`
        })
      );
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ code: 'OFFLINE_QUALIFICATION_SERVER_ERROR', message: String(error) }));
    }
  });

  await listen(server);
  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('The offline AWS server did not bind a TCP port.');
  }
  const endpoint = `http://127.0.0.1:${address.port}`;

  return {
    endpoint,
    unexpectedRequests,
    registerSecretReferences: (references) => {
      for (const reference of references) {
        const separatorIndex = reference.indexOf('.');
        const secretName = separatorIndex === -1 ? reference : reference.slice(0, separatorIndex);
        const jsonKey = separatorIndex === -1 ? undefined : reference.slice(separatorIndex + 1);
        const keys = secrets.get(secretName) ?? new Set<string>();
        if (jsonKey !== undefined && jsonKey !== '') keys.add(jsonKey);
        secrets.set(secretName, keys);
      }
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      })
  };
};

export const buildOfflineQualificationEnvironment = ({
  endpoint,
  invocationId,
  homeDirectory,
  inheritedEnvironment = process.env
}: {
  endpoint: string;
  invocationId: string;
  homeDirectory: string;
  inheritedEnvironment?: Environment;
}): Environment => {
  const inheritedPath = inheritedEnvironment.PATH ?? inheritedEnvironment.Path;
  const environment: Environment = {
    PATH: inheritedPath,
    PATHEXT: inheritedEnvironment.PATHEXT,
    SystemRoot: inheritedEnvironment.SystemRoot,
    WINDIR: inheritedEnvironment.WINDIR,
    ComSpec: inheritedEnvironment.ComSpec,
    NUMBER_OF_PROCESSORS: inheritedEnvironment.NUMBER_OF_PROCESSORS,
    PROCESSOR_ARCHITECTURE: inheritedEnvironment.PROCESSOR_ARCHITECTURE,
    OS: inheritedEnvironment.OS
  };
  const temporaryDirectory = join(homeDirectory, 'tmp');

  return {
    ...environment,
    HOME: homeDirectory,
    USERPROFILE: homeDirectory,
    APPDATA: join(homeDirectory, 'appdata'),
    LOCALAPPDATA: join(homeDirectory, 'localappdata'),
    XDG_CONFIG_HOME: join(homeDirectory, '.config'),
    XDG_CACHE_HOME: join(homeDirectory, '.cache'),
    TEMP: temporaryDirectory,
    TMP: temporaryDirectory,
    TMPDIR: temporaryDirectory,
    DOCKER_CONFIG: join(homeDirectory, '.docker'),
    NPM_CONFIG_USERCONFIG: join(homeDirectory, '.npmrc'),
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    CI: '1',
    NO_COLOR: '1',
    AWS_ACCESS_KEY_ID: 'offline-qualification',
    AWS_SECRET_ACCESS_KEY: 'offline-qualification',
    AWS_REGION: 'eu-west-1',
    AWS_DEFAULT_REGION: 'eu-west-1',
    AWS_EC2_METADATA_DISABLED: 'true',
    AWS_SDK_LOAD_CONFIG: '0',
    AWS_ENDPOINT_URL: endpoint,
    AWS_ENDPOINT_URL_STS: endpoint,
    // Prevent the CLI from falling back to a persisted user session while still routing every
    // Stacktape request to the loopback guard below.
    STACKTAPE_API_KEY: 'offline-qualification-do-not-use',
    SKIP_LOADING_ENV: '1',
    STP_CUSTOM_TRPC_API_ENDPOINT: `${endpoint}/stacktape-api`,
    STP_DISABLE_TELEMETRY: '1',
    STP_INVOCATION_ID: invocationId
  };
};
