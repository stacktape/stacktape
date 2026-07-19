[Get started](/getting-started/configure-your-stack/)
    [Star on GitHub](https://github.com/stacktape/stacktape)
    [Browse examples](/getting-started/starter-projects/)


Stacktape is open source. Browse the source at https://github.com/stacktape/stacktape.


## Everything you need, in one framework


- **Containers & serverless:** Deploy Lambda functions and containers side by side — Fargate for steady workloads, Lambda for spiky ones, EC2 when you need raw control.
- **Full power of AWS:** SQL and NoSQL databases, load balancers, API gateways, Redis, MongoDB Atlas, queues, buckets and more — all first-class building blocks.
- **Risk-free:** Extend, override or eject anytime. Everything compiles to plain CloudFormation you can inspect and take with you.
- **Infrastructure as code:** TypeScript, YAML or JSON — about 97% shorter than writing the equivalent CloudFormation by hand.
- **Built-in CI/CD:** Push-to-deploy and isolated preview deployments for every pull request, straight out of the box.
- **Development mode:** Run services locally while connected to real cloud resources — test changes without redeploying every time.
- **Smart builds:** Zero-config, optimized parallel builds with advanced caching for every function and container.
- **Security built in:** Secret management, least-privilege permissions and private networking — configured by default.
- **Cost optimization:** A detailed cost breakdown across all your stacks and accounts. Billed by AWS, with no markup.


## A real Stacktape config

A complete HTTP API backed by DynamoDB, with CORS, a custom domain per stage, auto-generated IAM and environment variables:


Example (stacktape.ts):

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
  const database = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'id', type: 'string' } }
  });

  const api = new HttpApiGateway({
    cors: { enabled: true },
    customDomains: [{ domainName: stage === 'production' ? 'acme.com' : stage + '-acme.com' }]
  });

  const myFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    events: [new HttpApiIntegration({ httpApiGatewayName: api.resourceName, method: 'GET', path: '/' })],
    connectTo: [database],
    environment: { TABLE_NAME: database.name }
  });

  return { resources: { api, myFunction, database } };
});
```


Run `stacktape deploy` and you get a live API Gateway endpoint with your custom domain, a DynamoDB table, and a Lambda with the table name injected and IAM scoped to exactly what it needs — no console clicking, no IAM JSON.

## Quick start


### Install Stacktape


    Install globally, or locally to your project.


Example (npm (global)):

```bash
npm install -g stacktape
```


Example (npm (local)):

```bash
npm install stacktape
```


Example (bun (global)):

```bash
bun add -g stacktape
```


Example (bun (local)):

```bash
bun add stacktape
```


Example (pnpm (global)):

```bash
pnpm add -g stacktape
```


Example (pnpm (local)):

```bash
pnpm add stacktape
```


### Initialize a project


    Scaffold a starter, or drop a `stacktape.ts` into an existing repo.


Example (bash):

```bash
stacktape init
```


### Deploy to AWS


    Pick a stage and a region — Stacktape builds, packages and provisions everything into your account.


Example (bash):

```bash
stacktape deploy --stage dev --region us-east-1 --projectName {your-project-name}
```


That's it — your app is now running on AWS. 🎉

## Configuration in TypeScript, YAML or JSON

Stacktape supports three configuration formats. Use TypeScript for full type-safety and autocomplete, or YAML/JSON if you prefer.


Example (stacktape.ts (recommended)):

```typescript
import { defineConfig } from 'stacktape';

export default defineConfig(({ stage }) => ({
  resources: {
    // Your resources here
  }
}));
```


Example (stacktape.yml):

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
```


Example (stacktape.json):

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


## A development workflow built for speed

### Local development

Run your services in development mode to iterate faster — your code runs locally, connected to real cloud resources, so you can test changes without redeploying every time.


Example (bash):

```bash
stacktape dev --stage dev --region us-east-1
```


### Scripts & migrations

Define reusable scripts in your config — they run with the same connectivity and secrets your app has.


Example (stacktape.ts):

```typescript
import { defineConfig, LocalScript, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } }),
    credentials: { masterUserPassword: $Secret('database.password') }
  });

  return {
    resources: { database },
    scripts: {
      migrate: new LocalScript({
        executeCommand: 'npm run migrate',
        connectTo: [database],
        environment: { DATABASE_URL: database.connectionString }
      })
    }
  };
});
```


Example (bash):

```bash
stacktape script:run --scriptName migrate --stage dev --region us-east-1
```


## Private networking

Increase security by keeping your database private (VPC-only):


Example (stacktape.ts):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

export default defineConfig(({ stage }) => {
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
    accessibility: { accessibilityMode: 'vpc', forceDisablePublicIp: true }
  });

  return { resources: { mainDatabase } };
});
```


Then add a bastion resource, so you can perform management tasks through a secure tunnel:


Example (stacktape.ts):

```typescript
import { Bastion, LocalScriptWithBastionTunneling, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

const mainDatabase = new RelationalDatabase({
  engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } }),
  credentials: { masterUserPassword: $Secret('database.password') }
});

const bastion = new Bastion({});

const migrationScript = new LocalScriptWithBastionTunneling({
  executeCommand: 'prisma migrate',
  connectTo: [mainDatabase]
});
```


## Override & extend

Need more control? Override or transform any AWS resource:


Example (stacktape.ts):

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

const myFunction = new LambdaFunction({
    // ... standard config
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    overrides: {
      lambda: { Description: 'Overridden description' }
    },
    transforms: {
      lambda: (props: any) => ({ ...props, MemorySize: (props.MemorySize ?? 128) * 2 })
    }
});
```


Or drop in raw CloudFormation and AWS CDK constructs alongside your Stacktape resources:


Example (stacktape.ts):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const myFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' })
  });

  return {
    resources: { myFunction },
    cloudformationResources: {
      mySnsTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: { TopicName: 'my-test-topic', DisplayName: 'My Test Topic' }
      }
    }
  };
});
```


## Open-source core, paid Console

Use Stacktape core completely free, or add the hosted Console when you want CI/CD, GitOps and observability.


See current pricing at https://stacktape.com/pricing.


## Loved by teams shipping on AWS


  [Get started](/getting-started/configure-your-stack/)
  [Browse examples](/getting-started/starter-projects/)
