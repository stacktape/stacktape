import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { executeAwsSdkCommand } from './executor';

// SQS answers an IAM denial with HTTP 400 and its JSON-protocol error type, as it did for the dev agent's `ListQueues`.
let server: Server;
let endpoint: string;
const requests: string[] = [];

/** A deployed template with literal values: environment variables, a password and a stored connection string. */
const JSON_TEMPLATE = {
  Parameters: {
    ApiKey: { Type: 'String', NoEcho: true, Default: 'noecho_default_secret_value' },
    Tier: { Type: 'String', Default: 'standard' }
  },
  Resources: {
    ApiFunction: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        FunctionName: 'shop-dev-api',
        Environment: { Variables: { STRIPE_KEY: 'lambda_template_secret_value', TABLE: { Ref: 'Table' } } }
      }
    },
    TaskDefinition: {
      Type: 'AWS::ECS::TaskDefinition',
      Properties: {
        ContainerDefinitions: [{ Name: 'web', Environment: [{ Name: 'TOKEN', Value: 'ecs_template_secret_value' }] }]
      }
    },
    JobDefinition: {
      Type: 'AWS::Batch::JobDefinition',
      Properties: {
        ContainerProperties: { Environment: [{ Name: 'TOKEN', Value: 'batch_template_secret_value' }] },
        EksProperties: { PodProperties: { Containers: [{ Env: [{ Name: 'T', Value: 'eks_template_secret_value' }] }] } }
      }
    },
    Canary: {
      Type: 'AWS::Synthetics::Canary',
      Properties: { RunConfig: { EnvironmentVariables: { TOKEN: 'canary_template_secret_value' } } }
    },
    Database: {
      Type: 'AWS::RDS::DBInstance',
      Properties: { DBInstanceIdentifier: 'shop-dev-db', MasterUserPassword: 'rds_template_secret_value' }
    },
    StpSensitiveData: {
      Type: 'Custom::StacktapeServiceLambda',
      Properties: {
        sensitiveData: [{ ssmParameterName: '/stp/shop-dev/db', value: 'connection_secret_value' }]
      }
    }
  }
};
const YAML_TEMPLATE = `Resources:
  ApiFunction:
    Type: AWS::Lambda::Function
    Properties:
      Environment:
        Variables:
          STRIPE_KEY: yaml_template_secret_value
`;

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      const answer = (contentType: string, payload: string) => {
        response.writeHead(200, { 'content-type': contentType });
        response.end(payload);
      };
      const target = String(request.headers['x-amz-target'] ?? '');
      if (target.endsWith('.DescribeUserPoolClient')) {
        requests.push('cognito.DescribeUserPoolClient');
        return answer(
          'application/x-amz-json-1.1',
          JSON.stringify({
            UserPoolClient: {
              ClientId: 'shop-dev-client',
              ClientName: 'web',
              ClientSecret: 'cognito_client_secret_value'
            }
          })
        );
      }
      if (request.url?.startsWith('/canary/')) {
        requests.push('synthetics.GetCanary');
        return answer(
          'application/json',
          JSON.stringify({
            Canary: {
              Name: 'shop-dev-check',
              RunConfig: { TimeoutInSeconds: 60, EnvironmentVariables: { API_TOKEN: 'canary_secret_value' } }
            }
          })
        );
      }
      if (new URLSearchParams(body).get('Action') === 'GetTemplate') {
        requests.push('cloudformation.GetTemplate');
        const stackName = new URLSearchParams(body).get('StackName');
        const templateBody = stackName === 'shop-yaml' ? YAML_TEMPLATE : JSON.stringify(JSON_TEMPLATE);
        const escaped = templateBody.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        return answer(
          'text/xml',
          `<GetTemplateResponse xmlns="http://cloudformation.amazonaws.com/doc/2010-05-15/"><GetTemplateResult><TemplateBody>${escaped}</TemplateBody><StagesAvailable><member>Original</member></StagesAvailable></GetTemplateResult><ResponseMetadata><RequestId>r2ag</RequestId></ResponseMetadata></GetTemplateResponse>`
        );
      }
      if (request.url === '/v1/describejobs') {
        requests.push('batch.DescribeJobs');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            jobs: [
              {
                jobId: 'job-1',
                jobName: 'report',
                jobQueue: 'arn:aws:batch:us-west-1:123456789012:job-queue/shop-dev-queue',
                jobDefinition: 'arn:aws:batch:us-west-1:123456789012:job-definition/shop-dev-report-job-definition:3',
                status: 'RUNNING',
                startedAt: 1761660000000,
                container: { environment: [{ name: 'STP_TRIGGER_EVENT_DATA', value: 'override_secret_value' }] },
                eksProperties: {
                  podProperties: { containers: [{ env: [{ name: 'T', value: 'eks_job_secret_value' }] }] }
                }
              }
            ]
          })
        );
        return;
      }
      if (request.url === '/v1/describejobdefinitions') {
        requests.push('batch.DescribeJobDefinitions');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            jobDefinitions: [
              {
                jobDefinitionName: 'shop-dev-report-job-definition',
                jobDefinitionArn:
                  'arn:aws:batch:us-west-1:123456789012:job-definition/shop-dev-report-job-definition:3',
                revision: 3,
                type: 'container',
                containerProperties: {
                  image: '123456789012.dkr.ecr.us-west-1.amazonaws.com/shop:report',
                  environment: [{ name: 'PAYMENT_TOKEN', value: 'sk_live_batch_secret_value' }],
                  secrets: [
                    { name: 'DB_PASSWORD', valueFrom: 'arn:aws:secretsmanager:us-west-1:123456789012:secret:db' }
                  ]
                }
              },
              {
                jobDefinitionName: 'shop-dev-eks-job-definition',
                type: 'container',
                eksProperties: {
                  podProperties: {
                    containers: [{ name: 'app', env: [{ name: 'EKS_TOKEN', value: 'eks_container_secret_value' }] }],
                    initContainers: [{ name: 'init', env: [{ name: 'INIT_TOKEN', value: 'eks_init_secret_value' }] }]
                  }
                }
              },
              {
                jobDefinitionName: 'shop-dev-multinode-job-definition',
                type: 'multinode',
                nodeProperties: {
                  nodeRangeProperties: [
                    {
                      targetNodes: '0:',
                      container: { environment: [{ name: 'NODE_TOKEN', value: 'node_range_secret_value' }] },
                      eksProperties: {
                        podProperties: { containers: [{ env: [{ name: 'NODE_EKS', value: 'node_eks_secret_value' }] }] }
                      }
                    }
                  ]
                }
              }
            ]
          })
        );
        return;
      }
      requests.push(target);
      const [status, type, message] = target.endsWith('.ListQueues')
        ? [400, 'com.amazon.coral.service#AccessDeniedException', 'User is not authorized to perform: sqs:listqueues']
        : [400, 'com.amazonaws.sqs#QueueDoesNotExist', 'The specified queue does not exist.'];
      response.writeHead(status, {
        'content-type': 'application/x-amz-json-1.0',
        'x-amzn-query-error': `${type.split('#')[1]};Sender`
      });
      response.end(JSON.stringify({ __type: type, message }));
    });
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.AWS_ENDPOINT_URL = endpoint;
  delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
});

afterAll(() => {
  delete process.env.AWS_ENDPOINT_URL;
  server.close();
});

const context = () => ({
  region: 'us-west-1',
  credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'example-secret' }
});

test('a failed call says whether the catalog refused it, IAM denied it or AWS reported another error', async () => {
  const notAllowed = await executeAwsSdkCommand('lambda', 'Invoke', {}, context());
  expect(notAllowed).toMatchObject({ ok: false, code: 'OPERATION_NOT_ALLOWED' });
  // A refused operation is never sent.
  expect(requests).toEqual([]);

  const denied = await executeAwsSdkCommand('sqs', 'ListQueues', {}, context());
  expect(denied).toMatchObject({ ok: false, code: 'ACCESS_DENIED' });
  expect(denied.ok === false && denied.error).toContain('not authorized');

  const missing = await executeAwsSdkCommand('sqs', 'GetQueueUrl', { QueueName: 'r2ee-missing' }, context());
  expect(missing).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  expect(requests.map((target) => target.split('.').at(-1))).toEqual(['ListQueues', 'GetQueueUrl']);
});

// r2qq finding 8: a batch job's diagnostics read its job definition; its environment values stay out of the result.
test('Batch job definitions are readable with ECS, EKS and multi-node environment values redacted', async () => {
  const result = await executeAwsSdkCommand(
    'batch',
    'DescribeJobDefinitions',
    { jobDefinitionName: 'shop-dev-report-job-definition' },
    context()
  );
  expect(result.ok).toBeTrue();
  for (const secret of [
    'sk_live_batch_secret_value',
    'eks_container_secret_value',
    'eks_init_secret_value',
    'node_range_secret_value',
    'node_eks_secret_value'
  ]) {
    expect(JSON.stringify(result)).not.toContain(secret);
  }
  // A secret given by reference is an ARN; it stays readable.
  expect(JSON.stringify(result)).toContain('arn:aws:secretsmanager:us-west-1:123456789012:secret:db');
  const [definition] = (result.ok ? (result.data as { jobDefinitions: unknown[] }).jobDefinitions : []) as object[];
  expect(definition).toMatchObject({
    containerProperties: { environment: [{ name: 'PAYMENT_TOKEN', value: '[redacted]' }] }
  });
});

test('Batch jobs keep the container overrides and EKS environment of the run redacted', async () => {
  const result = await executeAwsSdkCommand('batch', 'DescribeJobs', { jobs: ['job-1'] }, context());
  expect(result.ok).toBeTrue();
  for (const secret of ['override_secret_value', 'eks_job_secret_value']) {
    expect(JSON.stringify(result)).not.toContain(secret);
  }
  expect(result).toMatchObject({
    data: { jobs: [{ container: { environment: [{ name: 'STP_TRIGGER_EVENT_DATA', value: '[redacted]' }] } }] }
  });
});

// r2af finding 3: reads the catalog accepts returned a Cognito client secret, a canary's environment and the literal
// values of a template, which `aws call` and the dev agent pass on to the caller's transcript.
test('Cognito client secrets, canary environments and literal template values are masked', async () => {
  const client = await executeAwsSdkCommand(
    'cognito',
    'DescribeUserPoolClient',
    { UserPoolId: 'us-west-1_pool', ClientId: 'shop-dev-client' },
    context()
  );
  expect(client).toEqual({
    ok: true,
    data: { UserPoolClient: { ClientId: 'shop-dev-client', ClientName: 'web', ClientSecret: '[redacted]' } }
  });

  // The SDK's model of a canary's run configuration leaves its environment out; the executor masks it all the same.
  const canary = await executeAwsSdkCommand('synthetics', 'GetCanary', { Name: 'shop-dev-check' }, context());
  expect(canary).toMatchObject({ ok: true, data: { Canary: { RunConfig: { TimeoutInSeconds: 60 } } } });
  expect(JSON.stringify(canary)).not.toContain('canary_secret_value');

  const result = await executeAwsSdkCommand('cloudformation', 'GetTemplate', { StackName: 'shop-dev' }, context());
  expect(result.ok).toBeTrue();
  const body = result.ok ? (result.data as { TemplateBody: string }).TemplateBody : '';
  for (const secret of [
    'noecho_default_secret_value',
    'lambda_template_secret_value',
    'ecs_template_secret_value',
    'batch_template_secret_value',
    'eks_template_secret_value',
    'canary_template_secret_value',
    'rds_template_secret_value',
    'connection_secret_value'
  ]) {
    expect(body).not.toContain(secret);
  }
  // The rest of the template stays readable.
  const template = JSON.parse(body);
  expect(template.Parameters.Tier.Default).toBe('standard');
  expect(template.Resources.ApiFunction.Properties).toEqual({
    FunctionName: 'shop-dev-api',
    Environment: { Variables: { STRIPE_KEY: '[redacted]', TABLE: '[redacted]' } }
  });
  expect(template.Resources.TaskDefinition.Properties.ContainerDefinitions[0].Environment).toEqual([
    { Name: 'TOKEN', Value: '[redacted]' }
  ]);
  expect(template.Resources.StpSensitiveData.Properties.sensitiveData).toEqual([
    { ssmParameterName: '/stp/shop-dev/db', value: '[redacted]' }
  ]);

  // A YAML template is not parsed for masking; it is refused instead.
  const yaml = await executeAwsSdkCommand('cloudformation', 'GetTemplate', { StackName: 'shop-yaml' }, context());
  expect(yaml).toMatchObject({ ok: false, code: 'OPERATION_NOT_ALLOWED' });
  expect(JSON.stringify(yaml)).not.toContain('yaml_template_secret_value');
});
