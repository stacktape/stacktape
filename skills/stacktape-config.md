# Stacktape Configuration (IaC)

Stacktape uses TypeScript (recommended) or YAML to define infrastructure.

## File Structure

- **Config file**: `stacktape.ts` (or `stacktape.yml`) in project root.
- **Format**: Export a default function `defineConfig`.

## Basic Template

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging, HttpApiGateway, HttpApiIntegration } from 'stacktape';

export default defineConfig(({ stage, region }) => {
  const api = new HttpApiGateway({ cors: { enabled: true } });

  const myFunc = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: api.resourceName,
        path: '/',
        method: 'GET'
      })
    ]
  });

  return {
    resources: { api, myFunc }
  };
});
```

## Common Resources

### Lambda Function

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

const func = new LambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({
    entryfilePath: './src/handler.ts'
  }),
  memory: 1024,
  timeout: 30,
  environment: [
    { name: 'DB_URL', value: $Secret('db-url') }
  ]
});
```

### Relational Database (RDS)

```typescript
import { RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

const db = new RelationalDatabase({
  engine: new RdsEnginePostgres({
    version: '15',
    primaryInstance: {
      instanceSize: 'db.t4g.micro'
    }
  }),
  credentials: {
    masterUserPassword: $Secret('db-password')
  }
});
```

### Container (Web Service)

```typescript
import { WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

const service = new WebService({
  packaging: new StacktapeImageBuildpackPackaging({
    entryfilePath: './src/main.ts'
  }),
  resources: {
    cpu: 0.5,
    memory: 1024
  },
  replicaCount: 1
});
```

## Directives

- **$Secret('name')**: Reference a secret from AWS Secrets Manager.
- **$ResourceParam('resName', 'param')**: Reference a parameter of another resource (e.g., `connectionString`, `arn`).
- **$Stage**: Current stage name.
- **$Region**: Current AWS region.

## Best Practices

1.  **Use TypeScript**: Provides type safety and autocompletion.
2.  **Define Resources as Variables**: Makes referencing them easier (e.g., `httpApiGatewayName: api.resourceName`).
3.  **Conditional Logic**: Use `if (stage === 'prod')` to vary config by stage.
