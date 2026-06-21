# Configure Your Stack

A `stacktape.ts` file defines your AWS infrastructure — APIs, functions, databases, containers — using typed TypeScript classes. Stacktape reads this file when you deploy, run dev mode, or manage resources, and creates the corresponding AWS resources in your account. Create one from scratch, bootstrap from a starter, or let the Console's AI analyze your repository.


> **Info:** Already have a `stacktape.ts`? Skip to [using dev mode](/getting-started/use-the-dev-mode) or [deploying your first stage](/getting-started/deploy-your-first-stage).


> **Tip:** **Recommended starting path:** Run `stacktape init` to initialize a new project from a starter template. If you already have a codebase, try [AI config generation](/using-with-ai/config-generation-from-repository) in the Console. Either way, understanding the config format below will help you customize what you get.


## Install the package

```bash
npm install stacktape --save-dev
```

Install the `stacktape` package for typed resource classes and directives such as [`$Secret`](/configuration/directives) and [`$ResourceParam`](/configuration/directives). You get full IDE autocompletion and type checking as you write your config.

## Your first stacktape.ts

Create a `stacktape.ts` file in your project root. This example deploys a [Lambda function](/resources/compute/lambda-function) behind an [HTTP API Gateway](/resources/networking/http-api-gateway) — a common starting point for REST APIs:


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiIntegration
} from 'stacktape';
export default defineConfig(() => {
  const api = new HttpApiGateway({});

  const myFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: 512,
    timeout: 30,
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'api',
        method: 'GET',
        path: '/hello'
      })
    ]
  });

  return {
    resources: { api, myFunction }
  };
});
```


Here's what each piece does:

- **`defineConfig`** wraps your config in a function Stacktape calls at command time. It provides a context object with deployment details — stage, region, project name — you can use for [dynamic configuration](#adapt-config-per-stage).
- **Resource classes** like `LambdaFunction` and `HttpApiGateway` define Stacktape resources. Stacktape creates and manages the corresponding AWS infrastructure. Each class accepts a typed configuration object with autocompletion in VS Code, WebStorm, and other TypeScript-capable editors.
- **`StacktapeLambdaBuildpackPackaging`** tells Stacktape to bundle the Lambda from a source entry file. See [function packaging](/packaging/function/stacktape-buildpack) for details.
- **`HttpApiIntegration`** routes HTTP requests through the API Gateway to the function. The `httpApiGatewayName` value (`'api'`) points the function at the `api` gateway created above.
- **The returned `resources` object** is required. The object keys name the resources that [`connectTo`](/configuration/connecting-resources) uses to wire up access between resources and that [`$ResourceParam()`](/configuration/directives) uses to reference outputs from other resources.

The handler at `./src/handler.ts` is standard application code:

```typescript
export default async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from Stacktape!' })
  };
};
```

## Adapt config per stage

The `defineConfig` callback receives a context object you can use to vary infrastructure per [stage](/configuration/stages-and-environments). Since the config is TypeScript, conditionals, loops, shared modules, and any npm package work naturally. This example adds a [relational database](/resources/databases/relational-database) and connects it to a Lambda function, using the `stage` parameter to vary the database instance size between production and development:


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  RelationalDatabase,
  RdsEnginePostgres,
  StacktapeLambdaBuildpackPackaging,
  HttpApiIntegration
} from 'stacktape';
export default defineConfig(({ stage }) => {
  const isProduction = stage === 'production';

  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: isProduction ? 'db.t4g.medium' : 'db.t4g.micro'
      }
    })
  });

  const api = new HttpApiGateway({});

  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: isProduction ? 1024 : 512,
    timeout: 30,
    connectTo: ['database'],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'api',
        method: '*',
        path: '/*'
      })
    ]
  });

  return {
    resources: { api, database, apiHandler }
  };
});
```


In this example, `connectTo: ['database']` grants `apiHandler` network access to the resource named `database` and injects connection details as environment variables — Stacktape injects names like `STP_DATABASE_CONNECTION_STRING` and `STP_DATABASE_HOST`. See [connecting resources](/configuration/connecting-resources) for the variables injected per resource type.

The `stage` parameter lets you write standard TypeScript conditionals to vary any property per stage. Use the [`$Secret`](/configuration/directives) directive for credentials like `masterUserPassword` to keep secrets out of your config file.

### Context properties

The context object passed to the `defineConfig` callback includes:

| Property      | Type                                             | Description                                                |
| ------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `stage`       | `string`                                         | Current stage name (e.g., `dev`, `production`)             |
| `region`      | `string`                                         | AWS region (e.g., `us-east-1`, `eu-west-1`)                |
| `projectName` | `string`                                         | Project name                                               |
| `command`     | `string`                                         | CLI command being run (`deploy`, `delete`, `dev`, etc.)     |
| `cliArgs`     | `Record<string, string \| number \| boolean>`    | Key-value arguments passed via the `--arg` CLI flag        |

See [configuration files](/configuration/configuration-files) for the complete config reference.

## Quick-start with stacktape init

[`stacktape init`](/cli/init) initializes a new project from a starter template:

```bash
npx stacktape@latest init
```

This is the fastest path from zero to a working project.

## Console alternatives

The [Stacktape Console](/stacktape-console/console-overview) offers two additional paths for creating your config.

### AI config generation

Choose a public or private Git repository and branch in the Console to start AI config generation for your project. This is the fastest path when you have an existing codebase and want Stacktape to determine the right infrastructure. See [AI config generation](/using-with-ai/config-generation-from-repository) for the full walkthrough.


> Screenshot: AI config generation in the Stacktape Console — select a repository and branch, then review the generated config Caption: Select a repository and branch to start AI config generation for your codebase.


### Config editor

When a selected template is editable, the Console config editor lets you modify and save config changes. Templates created for a Console stage are opened read-only and link to the stage configuration page for edits. See the [visual config editor](/stacktape-console/visual-config-editor) for details.


> Screenshot: The Stacktape Console config editor Caption: Select a saved template and edit config content in the Console config editor.


Both Console paths work well for exploration and getting started. For production workflows, prefer keeping `stacktape.ts` in version control alongside your application code so infrastructure changes can be reviewed with code changes.

## Beyond resources

The `resources` section is the only required part of a Stacktape config, but several optional sections are available as your project grows: [hooks](/configuration/hooks-and-scripts) for running scripts automatically before or after deploy, delete, dev, or bucket sync operations; [scripts](/configuration/hooks-and-scripts) for runnable tasks like database migrations (three types: `local-script`, `local-script-with-bastion-tunneling`, and `bastion-script`); [variables](/configuration/variables-and-reuse) for reusable values; [directives](/configuration/directives) for custom deploy-time logic; and [deployment settings](/deployment-and-lifecycle/deploying-stacks) for rollback behavior and termination protection. See [configuration files](/configuration/configuration-files) for the complete reference.

## Next step

You have a config that defines what to deploy. Next, use dev mode to iterate locally — edit your code and see changes without waiting for full deployments.

**Next →** [Use the dev mode](/getting-started/use-the-dev-mode)
