/**
 * A loopback AWS endpoint for CLI-process tests: STS identity, one CloudFormation stack whose state the test chooses,
 * an empty deployment bucket, and empty answers for the read-only lookups a stack operation makes. Every mutation
 * (DeleteStack, UpdateStack, ...) is recorded; anything unknown is refused with HTTP 501 and recorded, so the test can
 * assert both what the CLI did and that it did nothing else.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import { createServer } from 'node:http';
import { FAKE_AWS_ACCOUNT_ID } from './control-plane-fake';

export type FakeStackState = {
  stackName: string;
  status: string;
  template: CloudFormationTemplate;
  /** Resolved output values as CloudFormation would report them. */
  outputs: Record<string, string>;
  /** Set to make the stack vanish on the next DescribeStacks after a DeleteStack. */
  deleteCompletesImmediately?: boolean;
};

export type AwsFake = {
  endpoint: string;
  region: string;
  stack: FakeStackState | undefined;
  /** CloudFormation actions that change state, in order, with their parameters. */
  mutations: { action: string; parameters: Record<string, string> }[];
  actions: string[];
  unexpectedRequests: string[];
  close: () => Promise<void>;
};

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
  `arn:aws:cloudformation:${region}:${FAKE_AWS_ACCOUNT_ID}:stack/${stackName}/${'11111111-2222-3333-4444-555555555555'}`;

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
      <EnableTerminationProtection>false</EnableTerminationProtection>
      <Outputs>${outputs}</Outputs>
      <Tags><member><Key>stacktape:managed</Key><Value>true</Value></member></Tags>
    </member></Stacks>`
  );
};

const listStackResourcesXml = (stack: FakeStackState) => {
  const members = Object.entries(stack.template.Resources)
    .map(
      ([logicalId, resource]) =>
        `<member><LogicalResourceId>${logicalId}</LogicalResourceId><PhysicalResourceId>${logicalId.toLowerCase()}</PhysicalResourceId><ResourceType>${resource.Type}</ResourceType><ResourceStatus>${
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
  stack
}: {
  region?: string;
  stack?: FakeStackState;
}): Promise<AwsFake> => {
  const state: { stack: FakeStackState | undefined } = { stack };
  const mutations: AwsFake['mutations'] = [];
  const actions: string[] = [];
  const unexpectedRequests: string[] = [];
  const logGroups = new Set<string>();
  let deleteObserved = 0;

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
    actions.push(action);
    const parameters = Object.fromEntries(form.entries());
    const xml = (status: number, document: string) => {
      response.writeHead(status, { 'content-type': 'text/xml; charset=utf-8' });
      response.end(document);
    };
    const json = (status: number, value: unknown) => {
      response.writeHead(status, { 'content-type': 'application/x-amz-json-1.1' });
      response.end(JSON.stringify(value));
    };

    switch (action) {
      case 'GetCallerIdentity':
        return xml(
          200,
          `<?xml version="1.0" encoding="UTF-8"?>
<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult><Arn>arn:aws:iam::${FAKE_AWS_ACCOUNT_ID}:user/cli-process</Arn><UserId>cli-process</UserId><Account>${FAKE_AWS_ACCOUNT_ID}</Account></GetCallerIdentityResult>
  <ResponseMetadata><RequestId>${randomUUID()}</RequestId></ResponseMetadata>
</GetCallerIdentityResponse>`
        );
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
        mutations.push({ action, parameters });
        if (state.stack) {
          state.stack.status = 'DELETE_IN_PROGRESS';
        }
        return xml(200, wrapResult('DeleteStack', ''));
      case 'UpdateStack':
      case 'CreateStack':
      case 'CreateChangeSet':
      case 'RollbackStack':
      case 'ContinueUpdateRollback':
      case 'CancelUpdateStack':
        mutations.push({ action, parameters });
        return xml(400, cloudFormationError('ValidationError', `The CLI-process fake does not execute ${action}.`));
      case 'GetTagKeys':
        return json(200, { TagKeys: [] });
      // The operation recorder writes the CLI's own log to CloudWatch Logs; accepted, not a stack mutation.
      case 'DescribeLogGroups': {
        const prefix = (JSON.parse(body || '{}') as { logGroupNamePrefix?: string }).logGroupNamePrefix ?? '';
        return json(200, {
          logGroups: [...logGroups]
            .filter((name) => name.startsWith(prefix))
            .map((name) => ({
              logGroupName: name,
              arn: `arn:aws:logs:${region}:${FAKE_AWS_ACCOUNT_ID}:log-group:${name}:*`
            }))
        });
      }
      case 'CreateLogGroup':
        logGroups.add(String((JSON.parse(body || '{}') as { logGroupName?: string }).logGroupName ?? ''));
        return json(200, {});
      case 'CreateLogStream':
      case 'PutRetentionPolicy':
        return json(200, {});
      case 'PutLogEvents':
        return json(200, { nextSequenceToken: '1' });
      case 'DeleteLogGroup':
        mutations.push({
          action,
          parameters: {
            logGroupName: String((JSON.parse(body || '{}') as { logGroupName?: string }).logGroupName ?? '')
          }
        });
        return json(200, {});
      case 'GetTags':
        return json(200, { Tags: [] });
      // The deployment registry is empty; deleting artifacts lists and removes nothing.
      case 'ListImages':
        return json(200, { imageIds: [] });
      case 'DescribeRepositories':
        return json(200, { repositories: [] });
      case 'BatchDeleteImage':
        mutations.push({ action, parameters: {} });
        return json(200, { imageIds: [], failures: [] });
      case 'DescribeBudgets':
        return json(200, { Budgets: [] });
      default:
        break;
    }
    // Lambda function tags are read while the stack's deployed workloads are inventoried.
    if (request.method === 'GET' && url.pathname.startsWith('/2017-03-31/tags/')) {
      return json(200, { Tags: {} });
    }
    // S3 on the deployment bucket: always empty, deletions succeed.
    if (request.method === 'GET' && url.searchParams.has('list-type')) {
      return xml(
        200,
        `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>bucket</Name><KeyCount>0</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>`
      );
    }
    if (request.method === 'GET' && url.searchParams.has('versions')) {
      return xml(
        200,
        `<?xml version="1.0" encoding="UTF-8"?><ListVersionsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>bucket</Name><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated></ListVersionsResult>`
      );
    }
    if (request.method === 'HEAD') {
      response.writeHead(200);
      return response.end();
    }
    if (request.method === 'DELETE' || (request.method === 'POST' && url.searchParams.has('delete'))) {
      mutations.push({ action: `S3 ${request.method} ${url.pathname}`, parameters: {} });
      response.writeHead(request.method === 'DELETE' ? 204 : 200, { 'content-type': 'text/xml' });
      return response.end(
        request.method === 'DELETE'
          ? ''
          : `<?xml version="1.0" encoding="UTF-8"?><DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"></DeleteResult>`
      );
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
    actions,
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
