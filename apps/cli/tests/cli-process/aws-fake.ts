/**
 * A CloudFormation wire observer for source-CLI scenarios. Healthy requests are forwarded to MiniStack unchanged.
 * The only synthetic state machine injects DELETE_FAILED / UPDATE_ROLLBACK_FAILED and a refused recovery, which the
 * emulator cannot produce reliably. Identity, artifacts and operation logs always use the real MiniStack services.
 * Unknown requests fail closed, so an injected scenario cannot silently gain another AWS stand-in.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import { createServer } from 'node:http';
import { MINISTACK_DEFAULT_ACCOUNT_ID } from '@stacktape/ministack/fixture';

export type FakeStackState = {
  stackName: string;
  status: string;
  terminationProtection?: boolean;
  rollbackFailure?: boolean;
  template: CloudFormationTemplate;
  /** Resolved output values as CloudFormation would report them. */
  outputs: Record<string, string>;
  /** Set to make the stack vanish on the next DescribeStacks after a DeleteStack. */
  deleteCompletesImmediately?: boolean;
  /** Physical IDs by logical ID where the CLI reads them (the deployment bucket); others are the lowercased logical ID. */
  physicalIds?: Record<string, string>;
};

export type AwsFake = {
  endpoint: string;
  region: string;
  stack: FakeStackState | undefined;
  /** CloudFormation actions that change state, in order, with their parameters. */
  mutations: { action: string; parameters: Record<string, string> }[];
  bucketsBeforeDelete: Array<{ deployment: string[]; customer: string[] }>;
  unexpectedRequests: string[];
  close: () => Promise<void>;
};

// Only these read operations belong to the command scenarios. Everything else must be an explicitly observed
// mutation or is refused before forwarding, including registry reads not needed by these stacks.
const reads = new Set([
  'DescribeStacks',
  'ListStackResources',
  'GetTemplate',
  'DescribeStackEvents',
  'ValidateTemplate'
]);
const writes = new Set([
  'CreateStack',
  'UpdateStack',
  'DeleteStack',
  'CreateChangeSet',
  'ExecuteChangeSet',
  'DeleteChangeSet',
  'UpdateTerminationProtection',
  'SetStackPolicy',
  'CancelUpdateStack',
  'RollbackStack',
  'ContinueUpdateRollback'
]);

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const readBody = (request: IncomingMessage) =>
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

const cloudFormationError = (code: string, message: string) => `<?xml version="1.0" encoding="UTF-8"?>
<ErrorResponse xmlns="http://cloudformation.amazonaws.com/doc/2010-05-15/">
  <Error><Type>Sender</Type><Code>${code}</Code><Message>${escapeXml(message)}</Message></Error>
  <RequestId>${randomUUID()}</RequestId>
</ErrorResponse>`;

const wrapResult = (action: string, inner: string) => `<?xml version="1.0" encoding="UTF-8"?>
<${action}Response xmlns="http://cloudformation.amazonaws.com/doc/2010-05-15/">
  <${action}Result>${inner}</${action}Result>
  <ResponseMetadata><RequestId>${randomUUID()}</RequestId></ResponseMetadata>
</${action}Response>`;

const stackId = (region: string, stackName: string) =>
  `arn:aws:cloudformation:${region}:${MINISTACK_DEFAULT_ACCOUNT_ID}:stack/${stackName}/${'11111111-2222-3333-4444-555555555555'}`;

const describeStacksXml = (region: string, stack: FakeStackState) => {
  const outputs = Object.entries(stack.outputs)
    .map(
      ([key, value]) =>
        `<member><OutputKey>${escapeXml(key)}</OutputKey><OutputValue>${escapeXml(value)}</OutputValue></member>`
    )
    .join('');
  return wrapResult(
    'DescribeStacks',
    `<Stacks><member>
      <StackId>${stackId(region, stack.stackName)}</StackId>
      <StackName>${stack.stackName}</StackName>
      <StackStatus>${stack.status}</StackStatus>
      <CreationTime>2026-10-01T10:00:00.000Z</CreationTime>
      <LastUpdatedTime>2026-10-02T10:00:00.000Z</LastUpdatedTime>
      <DisableRollback>false</DisableRollback>
      <EnableTerminationProtection>${Boolean(stack.terminationProtection)}</EnableTerminationProtection>
      <Outputs>${outputs}</Outputs>
      <Tags><member><Key>stacktape:managed</Key><Value>true</Value></member></Tags>
    </member></Stacks>`
  );
};

const listStackResourcesXml = (stack: FakeStackState) => {
  const members = Object.entries(stack.template.Resources)
    .map(
      ([logicalId, resource]) =>
        `<member><LogicalResourceId>${logicalId}</LogicalResourceId><PhysicalResourceId>${stack.physicalIds?.[logicalId] ?? logicalId.toLowerCase()}</PhysicalResourceId><ResourceType>${resource.Type}</ResourceType><ResourceStatus>${
          stack.status.startsWith('DELETE') ? 'DELETE_IN_PROGRESS' : 'CREATE_COMPLETE'
        }</ResourceStatus><LastUpdatedTimestamp>2026-10-02T10:00:00.000Z</LastUpdatedTimestamp></member>`
    )
    .join('');
  return wrapResult('ListStackResources', `<StackResourceSummaries>${members}</StackResourceSummaries>`);
};

const stackEventsXml = (region: string, stack: FakeStackState) =>
  wrapResult(
    'DescribeStackEvents',
    `<StackEvents><member>
      <StackId>${stackId(region, stack.stackName)}</StackId>
      <EventId>${randomUUID()}</EventId>
      <StackName>${stack.stackName}</StackName>
      <LogicalResourceId>${stack.stackName}</LogicalResourceId>
      <PhysicalResourceId>${stackId(region, stack.stackName)}</PhysicalResourceId>
      <ResourceType>AWS::CloudFormation::Stack</ResourceType>
      <Timestamp>${new Date().toISOString()}</Timestamp>
      <ResourceStatus>${stack.status}</ResourceStatus>
    </member></StackEvents>`
  );

export const startAwsFake = async ({
  region = 'eu-west-1',
  stack,
  forwardEndpoint,
  beforeDelete
}: {
  region?: string;
  /** Healthy stacks use MiniStack; this endpoint only observes the wire requests. */
  forwardEndpoint?: string;
  stack?: FakeStackState;
  beforeDelete: () => Promise<{ deployment: string[]; customer: string[] }>;
}): Promise<AwsFake> => {
  const state: { stack: FakeStackState | undefined } = { stack };
  const mutations: AwsFake['mutations'] = [];
  const bucketsBeforeDelete: AwsFake['bucketsBeforeDelete'] = [];
  const unexpectedRequests: string[] = [];
  let deleteObserved = 0;
  let updateObserved = 0;

  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const form = new URLSearchParams(body);
    const target = request.headers['x-amz-target'];
    const action =
      url.searchParams.get('Action') ??
      form.get('Action') ??
      (Array.isArray(target) ? target[0] : target)?.split('.').at(-1) ??
      (url.searchParams.has('list-type') ? 'S3ListObjects' : `${request.method} ${url.pathname}`);
    if (action === 'DeleteStack') bucketsBeforeDelete.push(await beforeDelete());
    const parameters = Object.fromEntries(form.entries());
    const xml = (status: number, document: string) => {
      response.writeHead(status, { 'content-type': 'text/xml; charset=utf-8' });
      response.end(document);
    };
    if (writes.has(action)) mutations.push({ action, parameters });
    if (!reads.has(action) && !writes.has(action)) {
      const requestName = `${request.method} ${url.pathname}${url.search} (${action})`;
      unexpectedRequests.push(requestName);
      return xml(501, cloudFormationError('CLI_PROCESS_FAKE_REFUSED', `The observer refuses ${requestName}.`));
    }
    if (forwardEndpoint) {
      const forwarded = await fetch(`${forwardEndpoint}${request.url ?? '/'}`, {
        method: request.method,
        headers: {
          'content-type': String(request.headers['content-type'] ?? ''),
          authorization: String(request.headers.authorization ?? '')
        },
        ...(request.method !== 'GET' && request.method !== 'HEAD' ? { body } : {})
      });
      const document = await forwarded.text();
      const status = /<StackStatus>([^<]+)<\/StackStatus>/.exec(document)?.[1];
      if (state.stack && status) state.stack.status = status;
      response.writeHead(forwarded.status, { 'content-type': forwarded.headers.get('content-type') ?? 'text/xml' });
      response.end(document);
      return;
    }
    switch (action) {
      case 'DescribeStacks': {
        const current = state.stack;
        if (!current) {
          return xml(
            400,
            cloudFormationError('ValidationError', `Stack with id ${form.get('StackName') ?? 'unknown'} does not exist`)
          );
        }
        if (current.status === 'DELETE_IN_PROGRESS') {
          deleteObserved += 1;
          if (current.deleteCompletesImmediately || deleteObserved >= 2) {
            current.status = 'DELETE_COMPLETE';
          }
        }
        if (current.status === 'UPDATE_IN_PROGRESS') {
          updateObserved += 1;
          if (updateObserved >= 2) {
            current.status = 'UPDATE_COMPLETE';
          }
        }
        if (current.status === 'UPDATE_ROLLBACK_IN_PROGRESS') {
          updateObserved += 1;
          if (updateObserved >= 2) current.status = 'UPDATE_ROLLBACK_COMPLETE';
        }
        return xml(200, describeStacksXml(region, current));
      }
      case 'ListStackResources':
        return state.stack
          ? xml(200, listStackResourcesXml(state.stack))
          : xml(400, cloudFormationError('ValidationError', `Stack with id ${form.get('StackName')} does not exist`));
      case 'GetTemplate':
        return state.stack
          ? xml(
              200,
              wrapResult(
                'GetTemplate',
                `<TemplateBody>${escapeXml(JSON.stringify(state.stack.template))}</TemplateBody>`
              )
            )
          : xml(400, cloudFormationError('ValidationError', `Stack with id ${form.get('StackName')} does not exist`));
      case 'DescribeStackEvents':
        return state.stack
          ? xml(200, stackEventsXml(region, state.stack))
          : xml(400, cloudFormationError('ValidationError', `Stack with id ${form.get('StackName')} does not exist`));
      case 'DeleteStack':
        if (state.stack) {
          state.stack.status = 'DELETE_IN_PROGRESS';
        }
        return xml(200, wrapResult('DeleteStack', ''));
      case 'RollbackStack':
      case 'ContinueUpdateRollback':
        if (!state.stack || state.stack.rollbackFailure) {
          return xml(400, cloudFormationError('ValidationError', 'Injected rollback refusal.'));
        }
        state.stack.status = 'UPDATE_ROLLBACK_IN_PROGRESS';
        updateObserved = 0;
        return xml(200, wrapResult(action, ''));
      case 'UpdateStack':
      case 'CreateStack':
      case 'CancelUpdateStack':
        return xml(400, cloudFormationError('ValidationError', `The CLI-process fake does not execute ${action}.`));
      default:
        break;
    }
    const requestName = `${request.method} ${url.pathname}${url.search} (${action})`;
    unexpectedRequests.push(requestName);
    response.writeHead(501, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ code: 'CLI_PROCESS_FAKE_REFUSED', message: `The AWS fake refuses ${requestName}.` }));
  });

  await listen(server);
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The AWS fake did not bind a TCP port.');
  }
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    region,
    get stack() {
      return state.stack;
    },
    mutations,
    bucketsBeforeDelete,
    unexpectedRequests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      })
  };
};

/**
 * The outputs a deployed stack reports for a synthesized template. `Fn::Sub` placeholders stand in for the values
 * CloudFormation would resolve; the stack-info map keeps its structure, which is all the CLI reads offline.
 */
export const outputsFromTemplate = (template: CloudFormationTemplate) =>
  Object.fromEntries(
    Object.entries(template.Outputs ?? {}).map(([name, output]) => {
      const value = (output as { Value: unknown }).Value;
      if (typeof value === 'string') return [name, value];
      const sub = (value as { 'Fn::Sub'?: string | [string, unknown] })['Fn::Sub'];
      if (sub) {
        const text = Array.isArray(sub) ? sub[0] : sub;
        return [name, text.replace(/\$\{[^}]+\}/g, 'resolved-value')];
      }
      return [name, 'resolved-value'];
    })
  );
