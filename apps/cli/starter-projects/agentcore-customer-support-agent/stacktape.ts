import {
  AgentCoreGateway,
  AgentCoreMemory,
  AgentCoreRuntime,
  CustomDockerfilePackaging,
  DynamoDbTable,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const supportMemory = new AgentCoreMemory({
    description: 'Stores support preferences, prior issues, and handoff summaries.',
    expirationDays: 60
  });

  const tickets = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'ticketId',
        type: 'string'
      }
    }
  });

  const getCustomerProfile = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/get-customer-profile.ts'
    }),
    memory: 512,
    timeout: 30
  });

  const createSupportTicket = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/create-support-ticket.ts'
    }),
    memory: 512,
    timeout: 30,
    connectTo: [tickets]
  });

  const supportGateway = new AgentCoreGateway({
    description: 'Governed tool gateway for customer support operations.',
    instructions: 'Use these tools only for customer support lookup and ticket workflows.',
    supportedVersions: ['2025-03-26'],
    tools: [
      {
        name: 'customerProfile',
        description: "Looks up a customer's support tier and account status.",
        function: 'getCustomerProfile',
        toolSchema: [
          {
            name: 'get_customer_profile',
            description: 'Get customer status, plan, support tier, and recent cases.',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: {
                  type: 'string',
                  description: 'Customer account identifier.'
                }
              },
              required: ['customerId']
            }
          }
        ]
      },
      {
        name: 'supportTicket',
        description: 'Creates a support ticket for follow-up.',
        function: 'createSupportTicket',
        toolSchema: [
          {
            name: 'create_support_ticket',
            description: 'Create a customer support ticket with priority and summary.',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
                summary: { type: 'string' }
              },
              required: ['customerId', 'priority', 'summary']
            }
          }
        ]
      }
    ]
  });

  const supportAgent = new AgentCoreRuntime({
    description: 'Customer support agent with persistent memory and governed business tools.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'supportMemory',
    useGateway: 'supportGateway',
    endpoints: [{ name: 'production', description: 'Main customer support endpoint.' }],
    lifecycle: {
      idleRuntimeSessionTimeout: 1800,
      maxLifetime: 14400
    },
    environment: [
        { name: 'AI_MODEL', value: 'eu.amazon.nova-micro-v1:0' },
      { name: 'AGENT_NAME', value: 'customer-support' }
    ]
  });

  return {
    resources: {
      supportAgent,
      supportMemory,
      supportGateway,
      tickets,
      getCustomerProfile,
      createSupportTicket
    }
  };
});
