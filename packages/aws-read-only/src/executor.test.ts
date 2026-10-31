import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { executeAwsSdkCommand } from './executor';

// SQS answers an IAM denial with HTTP 400 and its JSON-protocol error type, as it did for the dev agent's `ListQueues`.
let server: Server;
let endpoint: string;
const requests: string[] = [];

const TOKEN = 'template_literal_not_a_real_secret';
/** Deployed templates by stack name: the places a literal value hides in, as the review of #394 found them. */
const TEMPLATES: Record<string, unknown> = {
  direct: {
    Resources: {
      Task: {
        Type: 'AWS::ECS::TaskDefinition',
        Properties: { ContainerDefinitions: [{ Name: 'app', Environment: [{ Name: 'API_TOKEN', Value: TOKEN }] }] }
      }
    }
  },
  conditionalEcs: {
    Conditions: { UseToken: { 'Fn::Equals': ['enabled', 'enabled'] } },
    Resources: {
      Task: {
        Type: 'AWS::ECS::TaskDefinition',
        Condition: 'UseToken',
        Properties: {
          ContainerDefinitions: [
            {
              Name: 'app',
              Environment: [{ 'Fn::If': ['UseToken', { Name: 'API_TOKEN', Value: TOKEN }, { Ref: 'AWS::NoValue' }] }]
            }
          ]
        }
      }
    }
  },
  conditionalBatch: {
    Conditions: { UseToken: { 'Fn::Equals': ['enabled', 'enabled'] } },
    Resources: {
      Job: {
        Type: 'AWS::Batch::JobDefinition',
        Properties: {
          ContainerProperties: {
            Environment: [{ 'Fn::If': ['UseToken', { Name: 'API_TOKEN', Value: TOKEN }, { Ref: 'AWS::NoValue' }] }]
          }
        }
      }
    }
  },
  parameter: {
    Parameters: { ApiToken: { Type: 'String', Default: TOKEN, NoEcho: true } },
    Resources: {
      Fn: {
        Type: 'AWS::Lambda::Function',
        Properties: { Environment: { Variables: { API_TOKEN: { Ref: 'ApiToken' } } } }
      }
    }
  },
  mapping: {
    Mappings: { Config: { prod: { Token: TOKEN } } },
    Resources: {
      Fn: {
        Type: 'AWS::Lambda::Function',
        Properties: { Environment: { Variables: { API_TOKEN: { 'Fn::FindInMap': ['Config', 'prod', 'Token'] } } } }
      }
    },
    Outputs: { Token: { Value: { 'Fn::FindInMap': ['Config', 'prod', 'Token'] }, Description: TOKEN } }
  },
  stateMachineSub: {
    Resources: {
      Machine: {
        Type: 'AWS::StepFunctions::StateMachine',
        DependsOn: ['Task'],
        Properties: {
          DefinitionString: {
            'Fn::Sub': JSON.stringify({
              StartAt: 'Run',
              States: {
                Run: {
                  Type: 'Task',
                  Parameters: {
                    Cluster: '${Cluster}',
                    TaskDefinition: '${Task.Arn}',
                    Overrides: {
                      ContainerOverrides: [{ Name: 'app', Environment: [{ Name: 'API_TOKEN', Value: TOKEN }] }]
                    }
                  },
                  End: true
                }
              }
            })
          }
        }
      }
    }
  }
};
/** A YAML template with CloudFormation's short-form tags, as a hand-written stack is often deployed. */
const YAML_TEMPLATE = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  UseToken: !Equals [enabled, enabled]
Resources:
  Fn:
    Type: AWS::Lambda::Function
    Properties:
      Role: !GetAtt FnRole.Arn
      Environment:
        Variables:
          API_TOKEN: !If [UseToken, ${TOKEN}, !Ref AWS::NoValue]
          URL: !Sub 'https://${TOKEN}.example.com/\${Api}'
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
        const stackName = new URLSearchParams(body).get('StackName') ?? '';
        const templateBody =
          stackName === 'yaml'
            ? YAML_TEMPLATE
            : stackName === 'garbage'
              ? '{: ['
              : JSON.stringify(TEMPLATES[stackName]);
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
test('Cognito client secrets and canary environments are masked', async () => {
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
});

/** The template structure a read returns (parsed from JSON, so the tests can read it by path), or the failed result. */
const getTemplate = async (stackName: string) => {
  const result = await executeAwsSdkCommand('cloudformation', 'GetTemplate', { StackName: stackName }, context());
  const text = JSON.stringify(result);
  expect(text).not.toContain(TOKEN);
  return result.ok ? JSON.parse(text).data.Template : result;
};

// r2af finding 3 and the review of #394: masking known places kept missing others (a conditional entry, a parameter
// default, a mapping, a state machine definition), so a template comes back as its structure, without any value.
test('a template comes back as its structure, references kept and every literal value left out', async () => {
  await Promise.all(Object.keys(TEMPLATES).map(getTemplate));

  expect((await getTemplate('conditionalEcs')).Resources.Task).toEqual({
    Type: 'AWS::ECS::TaskDefinition',
    Condition: 'UseToken',
    Properties: {
      ContainerDefinitions: [
        {
          Name: '[value]',
          Environment: [{ 'Fn::If': ['UseToken', { Name: '[value]', Value: '[value]' }, { Ref: 'AWS::NoValue' }] }]
        }
      ]
    }
  });
  const parameter = await getTemplate('parameter');
  expect(parameter.Parameters).toEqual({ ApiToken: { Type: 'String' } });
  expect(parameter.Resources.Fn.Properties.Environment.Variables).toEqual({ API_TOKEN: { Ref: 'ApiToken' } });
  const mapping = await getTemplate('mapping');
  expect(mapping.Mappings).toEqual({ Config: { prod: { Token: '[value]' } } });
  expect(mapping.Outputs).toEqual({
    Token: { Value: { 'Fn::FindInMap': ['Config', '[value]', '[value]'] }, Description: '[value]' }
  });
  // A substitution keeps what it references, not the text around it.
  expect((await getTemplate('stateMachineSub')).Resources.Machine).toEqual({
    Type: 'AWS::StepFunctions::StateMachine',
    DependsOn: ['Task'],
    Properties: { DefinitionString: { 'Fn::Sub': '${Cluster}[value]${Task.Arn}' } }
  });

  // YAML with short-form tags is read as the long form, and returned as JSON.
  expect(await getTemplate('yaml')).toEqual({
    AWSTemplateFormatVersion: '2010-09-09',
    Conditions: { UseToken: { 'Fn::Equals': ['[value]', '[value]'] } },
    Resources: {
      Fn: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Role: { 'Fn::GetAtt': 'FnRole.Arn' },
          Environment: {
            Variables: {
              API_TOKEN: { 'Fn::If': ['UseToken', '[value]', { Ref: 'AWS::NoValue' }] },
              URL: { 'Fn::Sub': '${Api}' }
            }
          }
        }
      }
    }
  });
  expect(await getTemplate('garbage')).toMatchObject({ ok: false, code: 'OPERATION_NOT_ALLOWED' });
});
