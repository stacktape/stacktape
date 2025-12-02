## Stacktape - PaaS 2.0 that deploys to your own AWS account

<div align="center">

[![npm version](https://img.shields.io/npm/v/stacktape.svg)](https://www.npmjs.com/package/stacktape)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-stacktape.com-blue)](https://docs.stacktape.com)
[![Discord](https://img.shields.io/badge/discord-join-7289da.svg)](https://discord.gg/stacktape)

[Website](https://stacktape.com) • [Documentation](https://docs.stacktape.com) • [Discord](https://discord.gg/stacktape) • [Examples](https://docs.stacktape.com/starter-projects/)

</div>

---

## 🎉 Now Open Source!

Stacktape is now open source after being a closed-source product for several years. We're excited to share our DevOps-free cloud development framework with the community!

## From scratch to production-grade AWS infra in a day. No DevOps knowledge required

- **Containers & Serverless**: Deploy both containers and Lambda functions
- **30+ AWS Resources**: SQL/NoSQL databases, load balancers, API gateways, Redis, MongoDB Atlas, and more
- **Risk-free**: extend, override or eject anytime
- **Infrastructure as Code**: TypeScript, YAML, or JSON. 97% shorter than writing it yourself.
- **Built-in CI/CD**: Supports both Push-to-deploy and Preview deployments.
- **Development Mode**: Run services locally while connected to cloud resources
- **Smart Builds**: Zero-config, optimized parallel builds with advanced caching
- **Security Built-in**: Secret management, least privilege permissions, private networking
- **Cost Optimization**: Detailed cost breakdown across all stacks and accounts
- **Easy Debugging**: Connect to running containers, access logs and metrics instantly
- **Production-grade**: Configured according to all of the AWS well-architected best practices

## Quick Start

### Installation

Install Stacktape globally via npm:

```bash
npm install -g stacktape
```

Or use it directly with npx:

```bash
npx stacktape --version
```

### Create Your First Project

1. **Initialize a new project:**

```bash
stacktape init
```

2. **Configure your infrastructure** using TypeScript:

```typescript
import {
  defineConfig,
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(({ stage }) => {
  const database = new DynamoDbTable('myDatabase', {
    primaryKey: {
      partitionKey: { name: 'id', type: 'string' }
    }
  });

  const api = new HttpApiGateway('api', {
    cors: { enabled: true },
    customDomains: [{ domainName: stage === 'production' ? 'acme.com' : `${stage}-acme.com` }]
  });

  const myFunction = new LambdaFunction('myFunction', {
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: api.resourceName,
        method: 'GET',
        path: '/'
      })
    ],
    connectTo: [database],
    environment: {
      TABLE_NAME: database.name
    }
  });

  return {
    resources: { api, myFunction, database }
  };
});
```

3. **Deploy to AWS:**

```bash
stacktape deploy --stage dev --region us-east-1
```

That's it! Your app is now running on AWS. 🎉

## Configuration Options

Stacktape supports three configuration formats:

### TypeScript (Recommended)
```typescript
// stacktape.ts
import { defineConfig } from 'stacktape';

export default defineConfig(({ stage }) => ({
  resources: {
    // Your resources here
  }
}));
```

### YAML
```yaml
# stacktape.yml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
```

### JSON
```json
{
  "resources": {
    "myFunction": {
      "type": "function",
      "properties": {}
    }
  }
}
```

## Supported Resources

Stacktape supports 30+ AWS resource types out of the box:

**Compute:**
- Lambda Functions
- Web Services (ECS Fargate)
- Multi-Container Workloads
- Batch Jobs
- Worker Services
- Edge Lambda Functions

**Databases:**
- PostgreSQL, MySQL (RDS)
- DynamoDB Tables
- MongoDB Atlas Clusters
- Redis Clusters (ElastiCache & Upstash)

**Networking:**
- HTTP API Gateway
- REST API Gateway
- Load Balancers
- Network Load Balancers

**Storage & CDN:**
- S3 Buckets
- Hosting Buckets (with CloudFront)

**Other:**
- User Auth Pools (Cognito)
- Event Bus (EventBridge)
- SQS Queues
- SNS Topics
- State Machines (Step Functions)
- Bastion Hosts (Jump Hosts)
- Web Application Firewall
- And more...

## Development Workflow

### Local Development

Run your services in development mode to iterate faster:

```bash
stacktape dev
```

This allows you to test changes without redeploying every time.

### Access Logs & Metrics

Logs and metrics are available in [stacktape console](https://console.stacktape.com)

```bash
stacktape logs:tail --resource myFunction
```

### Run Scripts & Migrations

Define reusable scripts in your config:

```typescript
import { LocalScript } from 'stacktape';

export default defineConfig(() => ({
  scripts: {
    migrate: new LocalScript({
      executeCommand: 'npm run migrate',
      connectTo: [database],
      environment: { DATABASE_URL: database.connectionString }
    })
  }
}));
```

Run them with:

```bash
stacktape script:run --scriptName migrate
```

## Stacktape console

Stacktape offers a console that allows you to deploy and manage your stacks.

https://www.stacktape.com/videos/2-manage.mp4

## Advanced Features

### Private Networking

Increase security by keeping your database private (VPC-only):

```typescript
const mainDatabase = new RelationalDatabase({
  engine: new RdsEnginePostgres({
    primaryInstance: {
      instanceSize: stage === 'production' ? 'db.t4g.medium' : 'db.t4g.micro',
      multiAz: stage === 'production'
    },
    version: '18.1'
  }),
  credentials: {
    masterUserName: 'master-user',
    masterUserPassword: $Secret('my-secret-password')
  },
  accessibility: {
    accessibilityMode: 'vpc',
    forceDisablePublicIp: true
  }
});
```

Then, add a bastion resource, so you can perform management tasks.

```typescript
const bastion = new Bastion('bastion', {})

const migrationScript = new LocalScriptWithBastionTunnelingCommand({
  executeCommand: 'prisma migrate',
  connectTo: [mainDatabase]
})
```

### Override & Extend

Need more control? Override any AWS resource:

```typescript
const myFunction = new LambdaFunction('myFunction', {
  // ... standard config
  overrides: {
    lambda: {
      description: 'Overridden description'
    }
  },
  transforms: {
    lambda: (props) => {
      return {
        ...props,
        MemorySize: (props.MemorySize ?? 128) * 2
      };
    }
  }
});
```

Or extend with raw CloudFormation or AWS CDK constructs.

```typescript
export default defineConfig(() => {
  const myFunction = new LambdaFunction({
    // lambda config
  });

  return {
    resources: { myFunction },
    cloudformationResources: {
      mySnsTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: {
          TopicName: 'my-test-topic',
          DisplayName: 'My Test Topic'
        }
      }
    }
  };
});
```

## Pricing

If you don't want to use Stacktape console, you can use Stacktape core **completely free**. We're currently working on a build that doesn't require you to be logged in to Stacktape.

Paid versions of Stacktape include:

- CI/CD pipeline (Github, Gitlab, Bitbucket)
- Web-based console for managing your stack
- Browse logs, metrics, costs and more
- Remote session to deployed containers
- Secrets management
- Guardrails and alarms
- Notifications
- Premium support **with 8 minutes average response time**

## VS Code Extension

If you want to use YAML-based configuration, we recommend installing [Stacktape editor extension](https://marketplace.visualstudio.com/items?itemName=stacktape.stacktape):

- Validation and error checking
- Intelligent autocompletion
- Inline documentation

## Contributing

We welcome contributions!

For QA, we use our own CI/CD pipeline which is not yet a part of this repository. For the time being, feel free to submit a PR, and we'll run it through our pipeline.

## License

Stacktape is released under the [MIT License](LICENSE).

## Testimonials

> "Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration."
>
> — **Henry Garrett**, Founding Engineer, Recipts.xyz

> "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.."
>
> — **Rhys Williams**, CTO & Frounder, Lastmyle

---

<div align="center">

**Ready to simplify your AWS deployments?**

[Get Started](https://docs.stacktape.com/getting-started/basics) • [Join Slack](https://join.slack.com/t/stacktape-community/shared_invite/zt-16st4nmgl-B8adf0YnZWSMEbuz9Ih6vg) • [Starter Projects](https://github.com/stacktape/stacktape/tree/master/starter-projects)

Made with ❤️ by the Stacktape team in EU

</div>
