import {
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  AgentCoreGateway,
  AgentCoreMemory,
  AgentCoreRuntime,
  Bucket,
  CustomDockerfilePackaging,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const persistentMemoryWithEventExpiry = new AgentCoreMemory({
    description: 'AgentCore memory test with event expiry duration and tags.',
    eventExpiryDuration: 30,
    tags: [{ name: 'scenario', value: 'all-linked-resources' }]
  });

  const reportsBucket = new Bucket({
    versioning: true,
    encryption: true
  });

  const browserRecordingBucket = new Bucket({
    versioning: true,
    encryption: true
  });

  const managedBrowserWithRecording = new AgentCoreBrowser({
    description: 'AgentCore browser test with S3 recording configuration.',
    recording: {
      enabled: true,
      bucketName: browserRecordingBucket.name as any,
      prefix: 'agentcore-recordings/'
    }
  });

  const codeInterpreterSandbox = new AgentCoreCodeInterpreter({
    description: 'AgentCore code interpreter test.'
  });

  const describeToolFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/describe-tool.ts'
    }),
    memory: 512,
    timeout: 30
  });

  const writeReportToolFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/write-report-tool.ts'
    }),
    memory: 512,
    timeout: 30,
    connectTo: [reportsBucket]
  });

  const gatewayWithLongNamesAndSchemaEdges = new AgentCoreGateway({
    description: 'AgentCore gateway test with long names, multiple targets, and schema pruning.',
    instructions: 'Exercise schema conversion, target naming, and Lambda target wiring.',
    supportedVersions: ['2025-03-26'],
    exceptionLevel: 'DEBUG',
    tools: [
      {
        name: 'describeCustomerProfileWithAnExcessivelyVerboseTargetName',
        description: 'Echoes nested input for schema conversion validation.',
        function: 'describeToolFunction',
        toolSchema: [
          {
            name: 'describe_customer_profile',
            description: 'Describe a customer profile with nested attributes.',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string', minLength: 1 },
                priority: { type: 'string', enum: ['low', 'normal', 'high'] },
                attributes: {
                  type: 'object',
                  properties: {
                    plan: { type: 'string' },
                    flags: {
                      type: 'array',
                      items: { type: 'string', enum: ['vip', 'delinquent', 'trial'] }
                    }
                  },
                  additionalProperties: false
                }
              },
              required: ['customerId', 'priority'],
              additionalProperties: false
            },
            outputSchema: {
              type: 'object',
              properties: {
                summary: { type: 'string' }
              }
            }
          }
        ]
      },
      {
        name: 'writeReportWithNestedRows',
        description: 'Exercises second gateway target and function access to a connected bucket.',
        function: 'writeReportToolFunction',
        toolSchema: [
          {
            name: 'write_report',
            description: 'Write a report payload.',
            inputSchema: {
              type: 'object',
              properties: {
                reportId: { type: 'string' },
                rows: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string' },
                      value: { type: 'string' }
                    },
                    required: ['key', 'value']
                  }
                }
              },
              required: ['reportId', 'rows']
            }
          }
        ]
      }
    ]
  });

  const everythingAgentWithLongRuntimeName = new AgentCoreRuntime({
    description: 'AgentCore runtime test linking memory, gateway, browser, code interpreter, and S3.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'persistentMemoryWithEventExpiry',
    useGateway: 'gatewayWithLongNamesAndSchemaEdges',
    useBrowser: 'managedBrowserWithRecording',
    useCodeInterpreter: 'codeInterpreterSandbox',
    connectTo: [reportsBucket],
    endpoints: [{ name: 'production', description: 'All linked resources endpoint.' }],
    lifecycle: {
      idleRuntimeSessionTimeout: 900,
      maxLifetime: 7200
    },
    environment: [{ name: 'STP_TEST_MARKER', value: 'all-linked-v1' }],
    tags: [
      { name: 'suite', value: 'agentcore-edge' },
      { name: 'scenario', value: 'all-linked-resources' }
    ]
  });

  return {
    resources: {
      everythingAgentWithLongRuntimeName,
      persistentMemoryWithEventExpiry,
      gatewayWithLongNamesAndSchemaEdges,
      managedBrowserWithRecording,
      codeInterpreterSandbox,
      reportsBucket,
      browserRecordingBucket,
      describeToolFunction,
      writeReportToolFunction
    }
  };
});
