# Hooks and Scripts

Stacktape hooks and scripts automate tasks around your deployment lifecycle — compiling assets before deploy, running database migrations after deploy, exporting data before deletion. Scripts are reusable commands defined in your config; hooks wire them to lifecycle events so they run automatically.

## Scripts

A Stacktape script is a named task in the `scripts` section of your config. Scripts can run shell commands or JS/TS/Python files. Use [`connectTo`](/configuration/connecting-resources) to auto-inject resource connection details as environment variables. Run scripts manually with [`stacktape script:run`](/cli/script-run) or attach them to [hooks](#hooks) for automatic execution.

Stacktape supports three script types, each suited to different execution and network requirements:

| Type | Runs on | Best for |
|------|---------|----------|
| `local-script` | Your machine or CI runner | Builds, migrations using local tools, seeding, linting |
| `local-script-with-bastion-tunneling` | Your machine, tunneled through a [bastion host](/resources/security/bastion-host) | Running local tools against private VPC resources (databases, Redis) |
| `bastion-script` | The bastion EC2 instance in your VPC | Direct VPC network access without local tool requirements |

**`local-script` is the right default** for most tasks. Use bastion tunneling when your resources have no public endpoint and you need local CLI tools like `prisma` or `psql`. Use bastion scripts when you need direct VPC access and only need basic shell commands.

### Local script

A local script runs wherever the Stacktape CLI runs — your laptop during development, or the CI runner in a pipeline. This is the most common script type, covering builds, database migrations, linting, and data seeding.

Scripts can run shell commands or JS/TS/Python files. The examples below use `executeCommand`; see the configuration reference for the full set of execution properties.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging, Bucket } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: ['uploads']
  });

  const uploads = new Bucket({});

  return {
    resources: { api, uploads },
    scripts: {
      seedBucket: {
        type: 'local-script',
        properties: {
          executeCommand: 'node scripts/seed-data.js',
          connectTo: ['uploads']
        }
      },
      buildFrontend: {
        type: 'local-script',
        properties: {
          executeCommand: 'npm run build',
          cwd: './frontend'
        }
      }
    }
  };
});
```


The `seedBucket` script uses `connectTo` to receive the same bucket connection details as the `api` function — injected as environment variables like `STP_UPLOADS_NAME`. See [connecting resources](/configuration/connecting-resources) for the full list of variables injected per resource type. The `buildFrontend` script runs in a subdirectory using `cwd`. Local scripts include a `pipeStdio` property that controls whether script output is piped to your terminal.

### Local script with bastion tunneling

When your database or Redis cluster has no public endpoint, `local-script-with-bastion-tunneling` runs locally and tunnels connections to VPC-only resources through a [bastion host](/resources/security/bastion-host). This lets you keep using local CLI tools (Prisma, `psql`, `redis-cli`) against resources that aren't publicly reachable.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, Bastion } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({});
  const bastion = new Bastion({});

  return {
    resources: { cache, bastion },
    scripts: {
      warmCache: {
        type: 'local-script-with-bastion-tunneling',
        properties: {
          bastionResource: 'bastion',
          executeCommand: 'node scripts/warm-cache.js',
          connectTo: ['cache']
        }
      }
    }
  };
});
```


Stacktape runs the script locally while routing network traffic to connected resources through the bastion host.

### Bastion script

A bastion script runs directly on the bastion EC2 instance inside your VPC, with output streaming back to your terminal in real-time. Use this when you need direct network access to VPC resources without running any tools locally.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, Bastion } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({});
  const bastion = new Bastion({});

  return {
    resources: { cache, bastion },
    scripts: {
      checkRedis: {
        type: 'bastion-script',
        properties: {
          bastionResource: 'bastion',
          executeCommands: [
            'yum install -y redis6 2>/dev/null || yum install -y redis',
            'redis-cli -h $STP_CACHE_HOST -p $STP_CACHE_PORT PING'
          ],
          connectTo: ['cache']
        }
      }
    }
  };
});
```


A bastion script runs on the bastion host inside your VPC. If your command needs extra tools, make sure they are available on that host (as shown above with `yum install`) or use `local-script-with-bastion-tunneling` to keep using your local toolchain.

## Running scripts manually

Run any defined script with [`stacktape script:run`](/cli/script-run):

```bash
stacktape script:run --scriptName seedBucket
```

See the [`script:run` CLI reference](/cli/script-run) for the complete command options.

## Hooks

Hooks attach scripts to deployment lifecycle events so they run automatically. Define hooks in the top-level `hooks` section by referencing one or more script names from your `scripts` section.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HostingBucket
} from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    })
  });

  const website = new HostingBucket({
    uploadDirectoryPath: './frontend/dist'
  });

  return {
    resources: { api, website },
    scripts: {
      buildFrontend: {
        type: 'local-script',
        properties: {
          executeCommand: 'npm run build',
          cwd: './frontend'
        }
      },
      openDocs: {
        type: 'local-script',
        properties: {
          executeCommand: 'open https://my-app.example.com'
        }
      }
    },
    hooks: {
      beforeDeploy: [{ scriptName: 'buildFrontend' }],
      afterDeploy: [{ scriptName: 'openDocs', skipOnCI: true }]
    }
  };
});
```


The `buildFrontend` script runs before every deployment, compiling the frontend into `./frontend/dist` where the [hosting bucket](/resources/frontend/static-hosting) picks it up. The `openDocs` script opens the deployed URL after deploy but skips in CI environments (using `skipOnCI`). Note: the `open` command is macOS-specific — replace with `xdg-open` on Linux or `start` on Windows.

Hooks commonly attach migration scripts to `afterDeploy` so database changes apply automatically after infrastructure updates. Use `connectTo` in the migration script to inject the database connection details — see [connecting resources](/configuration/connecting-resources) for details.

### Lifecycle events

Hooks correspond to the before and after phases of the deploy, delete, dev, and bucket sync commands:

| Hook | When it fires | Common use |
|------|------|------|
| `beforeDeploy` | Before deployment starts | Builds, linting, tests, asset preparation |
| `afterDeploy` | After deployment completes | Migrations, seeding, cache warming, notifications |
| `beforeDelete` | Before stack deletion | Data exports, backups |
| `afterDelete` | After stack deletion | External cleanup, notifications |
| `beforeBucketSync` | Before syncing bucket contents | Pre-processing assets |
| `afterBucketSync` | After syncing bucket contents | Cache invalidation, notifications |
| `beforeDev` | Before dev mode starts | Dependency installation, local setup |
| `afterDev` | After dev mode exits | Cleanup |


> **Info:** Delete hook behavior depends on how the delete command is invoked. See the <a href="/cli/delete">delete CLI reference</a> for details.


> **Warning:** Post-deploy hooks (like database migrations) run after infrastructure changes are complete. If a script fails, re-run it manually with <code>stacktape script:run</code>. Check the CLI output for error details.


### Conditional execution

Hook entries can use `skipOnCI` and `skipOnLocal` to control where they run.

- **`skipOnCI: true`** — skips the hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI). Useful for interactive or local-only actions like opening a browser.
- **`skipOnLocal: true`** — skips the hook when running locally; runs only in CI/CD. Useful for CI-only tasks like uploading test reports or sending notifications.

The hooks example above demonstrates `skipOnCI` — the `openDocs` script runs locally after deploy but is skipped in CI pipelines.

## Environment variables in scripts

Scripts commonly receive environment variables from `connectTo` and `environment`, configured inside the script's `properties`.

**`connectTo`** auto-injects connection details for each listed resource as environment variables. The exact variables depend on the resource type — see [connecting resources](/configuration/connecting-resources) for the full per-resource injection table.

**`environment`** lets you define additional variables explicitly. Values support [directives](/configuration/directives) like `$Secret()`, `$ResourceParam()`, and `$Var()`, so you can inject secrets and computed values at execution time.

**`assumeRoleOfResource`** injects temporary AWS credentials matching the IAM role of a deployed resource, granting the script the same permissions as that resource. The resource must be deployed before the script runs. Most AWS SDKs and CLIs automatically pick up the injected credentials.

## Deployment scripts

[Deployment scripts](/resources/advanced/deployment-scripts) are a separate Stacktape resource that runs as an AWS Lambda function in your stack, rather than on your local machine. Consider deployment scripts when you need cloud-based execution independent of the developer's machine. See the [deployment script resource page](/resources/advanced/deployment-scripts) for VPC and networking behavior. For most tasks — builds, migrations with local tools, seeding — hooks with local scripts are simpler and more flexible.

## FAQ

### How do I run a database migration after deploy?

Define a `local-script` that runs your migration tool (Prisma, Drizzle, raw SQL) and use `connectTo` to inject the database connection details as environment variables — see [connecting resources](/configuration/connecting-resources) for the variable names. Attach the script to the `afterDeploy` hook so it runs automatically. If your database has no public endpoint, use `local-script-with-bastion-tunneling` instead.

### Can I run multiple scripts in a single hook?

Yes. Each hook (`beforeDeploy`, `afterDeploy`, etc.) accepts an array of script references. Define them in the execution order you need — for example, run tests before building.

### Do hooks run during `stacktape dev`?

Yes. The `beforeDev` hook fires before [dev mode](/local-development/dev-mode-overview) starts and `afterDev` fires after dev mode exits. Use `beforeDev` for setup tasks like installing dependencies or seeding a local database.

### What happens if my afterDeploy hook fails?

Your infrastructure is deployed and running, but the post-deploy task needs attention. Re-run the script with [`stacktape script:run`](/cli/script-run) to address the issue. Check the CLI output for error details and confirm the fix before the next deployment.

### When should I use hooks vs deployment scripts?

Use hooks with local scripts when you need local tooling (npm, Prisma CLI, psql), filesystem access, or flexibility in execution time. Use [deployment scripts](/resources/advanced/deployment-scripts) when you need direct VPC access without bastion setup, or when you want consistent cloud execution independent of the developer's machine. Most teams use hooks for the majority of their automation.

### Can scripts execute TypeScript or Python files directly?

Local scripts and `local-script-with-bastion-tunneling` can execute JS, TS, or Python files via the script execution properties. Bastion scripts are intended for commands that run on the bastion host; use `local-script-with-bastion-tunneling` when you need your local toolchain.

### How do I access a private database from a script?

Use `local-script-with-bastion-tunneling`. It runs your script locally while routing connections to the private resource through your [bastion host](/resources/security/bastion-host). You need a `bastion` resource defined in your config. Alternatively, use a [deployment script](/resources/advanced/deployment-scripts) for direct VPC access without bastion setup.

### When should I use bastion tunneling vs a bastion script?

Use `local-script-with-bastion-tunneling` when you need local tools — it runs your machine's toolchain while tunneling network access through the bastion. Use `bastion-script` when you only need basic shell commands and want to avoid running anything locally. For most development workflows, bastion tunneling is the better choice.

### Can I use hooks in CI/CD pipelines?

Yes. Hooks run wherever the Stacktape CLI runs. In a CI pipeline, the same hooks fire during [`stacktape deploy`](/cli/deploy) as locally. Use `skipOnCI` and `skipOnLocal` to differentiate — skip browser-opening in CI, or skip notification scripts when running on your machine. See [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for pipeline integration patterns.

### What environment variables do scripts receive?

Scripts receive variables from `connectTo` (auto-injected connection details per resource — see [connecting resources](/configuration/connecting-resources)) and from the `environment` property in the script configuration. Environment values support [directives](/configuration/directives) like `$Secret()` for injecting secrets and `$ResourceParam()` for referencing resource parameters.
