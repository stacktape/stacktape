import { z } from "zod"

export const stacktapeConfigSchema = z.object({
  "serviceName": z.string().optional().describe("#### The name of this service.\n\n---\n\n> **Deprecated:** Use the `--projectName` option in the CLI instead.\n\nThe CloudFormation stack name will be in the format: `{serviceName}-{stage}`.\n\nMust be alphanumeric and can contain dashes. Must match the regex `[a-zA-Z][-a-zA-Z0-9]*`.").optional(),
  "providerConfig": z.object({
    "mongoDbAtlas": z.object({
      "publicKey": z.string().optional().describe("#### Your MongoDB Atlas public API key.\n\n---\n\nCreate API keys in the MongoDB Atlas console under Organization Settings > API Keys.").optional(),
      "privateKey": z.string().optional().describe("#### Your MongoDB Atlas private API key. Store as `$Secret()` for security.\n\n---\n\nCreate API keys in the MongoDB Atlas console under Organization Settings > API Keys.").optional(),
      "organizationId": z.string().optional().describe("#### Your MongoDB Atlas Organization ID.\n\n---\n\nFound in the MongoDB Atlas console under Organization Settings.").optional(),
      "accessibility": z.object({
        "accessibilityMode": z.enum(["internet","scoping-workloads-in-vpc","vpc","whitelisted-ips-only"]).describe("#### Network access mode.\n\n---\n\n- **`internet`**: Accessible from anywhere (credentials still required).\n- **`vpc`**: Only from resources in your VPC + any `whitelistedIps`.\n- **`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.\n- **`whitelisted-ips-only`**: Only from IP addresses listed in `whitelistedIps`.").default("internet"),
        "whitelistedIps": z.array(z.string()).optional().describe("#### IP addresses or CIDR ranges allowed to access the cluster (e.g., your office IP).\n\n---\n\nNo effect in `internet` mode. In `vpc`/`scoping-workloads-in-vpc`, adds access for IPs outside the VPC.\nIn `whitelisted-ips-only`, these are the only IPs that can connect.").optional() }).strict()
      .optional().describe("#### Network connectivity settings for all MongoDB Atlas clusters in this stack.\n\n---\n\nStacktape auto-creates a MongoDB Atlas Project for your clusters. These accessibility settings\napply at the project level — all clusters in the stack share the same network config.").optional() }).strict()
    .optional().describe("").optional(),
    "upstash": z.object({
      "accountEmail": z.string().describe("#### Email address of your Upstash account."),
      "apiKey": z.string().describe("#### API key for your Upstash account. Store as `$Secret()` for security.\n\n---\n\nCreate an API key in the Upstash console under Account > API Keys.") }).strict()
    .optional().describe("").optional() }).strict()
  .optional().describe("#### Credentials and settings for 3rd-party services (MongoDB Atlas, Upstash).\n\n---\n\nRequired only if you use `mongo-db-atlas-cluster` or `upstash-redis` resources in your stack.").optional(),
  "variables": z.record(z.string(), z.any()).optional().describe("#### Reusable values you can reference anywhere in the config with `$Var().variableName`.\n\n---\n\nUseful for avoiding repetition. For example, define a shared environment name\nand reference it in multiple resources.\n\n```yaml\nvariables:\n  appPort: 3000\n# Then use: $Var().appPort\n```").optional(),
  "budgetControl": z.object({
    "limit": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Monthly spending limit in USD.\n\n---\n\nNotification thresholds are calculated as a percentage of this amount.\nResets at the start of each calendar month."),
    "notifications": z.array(z.object({
      "budgetType": z.enum(["ACTUAL","FORECASTED"]).optional().describe("#### Whether to alert on actual or forecasted spend.\n\n---\n\n- `ACTUAL` — fires when you've already spent past the threshold.\n- `FORECASTED` — fires when AWS predicts you'll exceed the threshold by month-end.\n\nForecasts need ~5 weeks of usage data before they work."),
      "thresholdPercentage": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Percentage of the budget limit that triggers this alert.\n\n---\n\nExample: limit = $200, threshold = 80 → alert fires at $160.").default(100),
      "emails": z.array(z.string()).describe("#### Email addresses that receive the alert. Max 10.") }).strict()
    ).optional().describe("#### Email alerts when spending approaches the limit.\n\n---\n\nEach notification fires at a percentage threshold of the `limit`, based on\nactual or forecasted spend. Max 5 notifications.").optional() }).strict()
  .optional().describe("#### Set a monthly spending limit and get email alerts when costs approach it.\n\n---\n\nThe budget resets at the start of each calendar month. You can configure alerts\nbased on actual spend or AWS-forecasted spend.\n\n> Not available in all regions (e.g., `ap-east-1`, `af-south-1`).").optional(),
  "hooks": z.object({
    "beforeDeploy": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run before deploying. Common use: build frontend, lint code.").optional(),
    "afterDeploy": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run after deploying. Common use: run database migrations, seed data.").optional(),
    "beforeDelete": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run before deleting the stack. Common use: export data, clean up external resources.\n\n---\n\nOnly runs when `--configPath` and `--stage` are provided to the delete command.").optional(),
    "afterDelete": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run after deleting the stack.\n\n---\n\nOnly runs when `--configPath` and `--stage` are provided to the delete command.").optional(),
    "beforeBucketSync": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run before syncing bucket contents.").optional(),
    "afterBucketSync": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run after syncing bucket contents.").optional(),
    "beforeDev": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run before starting dev mode.").optional(),
    "afterDev": z.array(z.object({
      "scriptName": z.string().describe("#### Script Name\n\n---\n\nThe name of the script to execute. The script must be defined in the `scripts` section of your configuration."),
      "skipOnCI": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).\n\n---\n\nUseful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).").default(false),
      "skipOnLocal": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip this hook when running locally; only run in CI/CD.\n\n---\n\nUseful for CI-only tasks (e.g., uploading test reports, notifying Slack).").default(false) }).strict()
    ).optional().describe("#### Scripts to run after dev mode exits.").optional() }).strict()
  .optional().describe("#### Run scripts automatically before/after deploy, delete, or dev commands.\n\n---\n\nEach hook references a script defined in the `scripts` section.\nCommon uses: run database migrations after deploy, build frontend before deploy,\nclean up resources after delete.").optional(),
  "scripts": z.record(z.string(), z.union([z.object({
      "type": z.literal("local-script"),
      "properties": z.object({
        "executeScript": z.string().optional().describe("#### Execute Script\n\n---\n\nThe path to a script file to execute. The script can be written in JavaScript, TypeScript, or Python and runs in a separate process.\n\nThe executable is determined by `defaults:configure` or the system default (`node` for JS/TS, `python` for Python). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "executeCommand": z.string().optional().describe("#### Execute Command\n\n---\n\nA single terminal command to execute in a separate shell process.\n\nThe command runs on the machine executing the Stacktape command. Be aware of potential differences between local and CI environments (e.g., OS, shell). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "executeScripts": z.array(z.string()).optional().describe("#### Execute Scripts\n\n---\n\nA list of script files to execute sequentially. Each script runs in a separate process.\n\nThe script can be written in JavaScript, TypeScript, or Python. The executable is determined by `defaults:configure` or the system default. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "executeCommands": z.array(z.string()).optional().describe("#### Execute Commands\n\n---\n\nA list of terminal commands to execute sequentially. Each command runs in a separate shell process.\n\nThe commands run on the machine executing the Stacktape command. Be aware of potential differences between environments. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "cwd": z.string().optional().describe("#### Working Directory\n\n---\n\nThe directory where the script or command will be executed."),
        "pipeStdio": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Pipe Stdio\n\n---\n\nIf `true`, pipes the standard input/output (stdio) of the hook process to the main process. This allows you to see logs from your hook and interact with prompts.").default(true),
        "connectTo": z.array(z.string()).optional().describe("#### Connect To\n\n---\n\nA list of resources the script needs to interact with. Stacktape automatically injects environment variables with connection details for each specified resource.\n\nEnvironment variable names are in the format `STP_[RESOURCE_NAME]_[VARIABLE_NAME]` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`).\n\n**Injected Variables by Resource Type:**\n- **`Bucket`**: `NAME`, `ARN`\n- **`DynamoDbTable`**: `NAME`, `ARN`, `STREAM_ARN`\n- **`MongoDbAtlasCluster`**: `CONNECTION_STRING`\n- **`RelationalDatabase`**: `CONNECTION_STRING`, `JDBC_CONNECTION_STRING`, `HOST`, `PORT`. For Aurora clusters, `READER_CONNECTION_STRING`, `READER_JDBC_CONNECTION_STRING`, and `READER_HOST` are also included.\n- **`RedisCluster`**: `HOST`, `READER_HOST`, `PORT`\n- **`EventBus`**: `ARN`\n- **`Function`**: `ARN`\n- **`BatchJob`**: `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n- **`UserAuthPool`**: `ID`, `CLIENT_ID`, `ARN`\n- **`SnsTopic`**: `ARN`, `NAME`\n- **`SqsQueue`**: `ARN`, `NAME`, `URL`\n- **`UpstashKafkaTopic`**: `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL`\n- **`UpstashRedis`**: `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n- **`PrivateService`**: `ADDRESS`\n- **`WebService`**: `URL`").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment Variables\n\n---\n\nA list of environment variables to pass to the script or command.\n\nValues can be:\n- A static string, number, or boolean.\n- The result of a [custom directive](https://docs.stacktape.com/configuration/directives/#custom-directives).\n- A reference to another resource's parameter using the [`$ResourceParam` directive](https://docs.stacktape.com/configuration/referencing-parameters/).\n- A value from a [secret](https://docs.stacktape.com/resources/secrets/) using the [`$Secret` directive](https://docs.stacktape.com/configuration/directives/#secret).").optional(),
        "assumeRoleOfResource": z.string().optional().describe("#### Assume Role of Resource\n\n---\n\nThe name of a deployed resource whose IAM role the script should assume. This grants the script the same permissions as the specified resource.\n\nThe resource must be deployed before the script is executed. Stacktape injects temporary AWS credentials as environment variables, which are automatically used by most AWS SDKs and CLIs.\n\n**Supported Resource Types:**\n- `function`\n- `batch-job`\n- `worker-service`\n- `web-service`\n- `private-service`\n- `multi-container-workload`\n- `nextjs-web`\n- `astro-web`\n- `nuxt-web`\n- `sveltekit-web`\n- `solidstart-web`\n- `tanstack-web`\n- `remix-web`").optional() }).strict()
    }).strict()
    .describe("#### A script that runs on your local machine.\n\n---\n\nLocal scripts are executed on the same machine where the Stacktape command is run.\nThey are useful for tasks like building your application, running database migrations, or other automation.\n\nThe script must define one of the following: `executeCommand`, `executeScript`, `executeCommands`, or `executeScripts`."), z.object({
      "type": z.literal("bastion-script"),
      "properties": z.object({
        "bastionResource": z.string().optional().describe("#### Bastion Resource Name\n\n---\n\nThe name of the bastion resource on which the commands will be executed.").optional(),
        "executeCommand": z.string().optional().describe("#### Execute Command\n\n---\n\nA single terminal command to execute on the bastion host. Logs from the execution are streamed to your terminal.\n\nYou can use either `executeCommand` or `executeCommands`, but not both.").optional(),
        "executeCommands": z.array(z.string()).optional().describe("#### Execute Commands\n\n---\n\nA list of terminal commands to execute sequentially as a script on the bastion host. Logs from the execution are streamed to your terminal.\n\nYou can use either `executeCommand` or `executeCommands`, but not both.").optional(),
        "cwd": z.string().optional().describe("#### Working Directory\n\n---\n\nThe directory on the bastion host where the command will be executed."),
        "connectTo": z.array(z.string()).optional().describe("#### Connect To\n\n---\n\nA list of resources the script needs to interact with. Stacktape automatically injects environment variables with connection details for each specified resource.\n\nEnvironment variable names are in the format `STP_[RESOURCE_NAME]_[VARIABLE_NAME]` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`).\n\n**Injected Variables by Resource Type:**\n- **`Bucket`**: `NAME`, `ARN`\n- **`DynamoDbTable`**: `NAME`, `ARN`, `STREAM_ARN`\n- **`MongoDbAtlasCluster`**: `CONNECTION_STRING`\n- **`RelationalDatabase`**: `CONNECTION_STRING`, `JDBC_CONNECTION_STRING`, `HOST`, `PORT`. For Aurora clusters, `READER_CONNECTION_STRING`, `READER_JDBC_CONNECTION_STRING`, and `READER_HOST` are also included.\n- **`RedisCluster`**: `HOST`, `READER_HOST`, `PORT`\n- **`EventBus`**: `ARN`\n- **`Function`**: `ARN`\n- **`BatchJob`**: `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n- **`UserAuthPool`**: `ID`, `CLIENT_ID`, `ARN`\n- **`SnsTopic`**: `ARN`, `NAME`\n- **`SqsQueue`**: `ARN`, `NAME`, `URL`\n- **`UpstashKafkaTopic`**: `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL`\n- **`UpstashRedis`**: `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n- **`PrivateService`**: `ADDRESS`\n- **`WebService`**: `URL`").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment Variables\n\n---\n\nA list of environment variables to pass to the script or command.\n\nValues can be:\n- A static string, number, or boolean.\n- The result of a [custom directive](https://docs.stacktape.com/configuration/directives/#custom-directives).\n- A reference to another resource's parameter using the [`$ResourceParam` directive](https://docs.stacktape.com/configuration/referencing-parameters/).\n- A value from a [secret](https://docs.stacktape.com/resources/secrets/) using the [`$Secret` directive](https://docs.stacktape.com/configuration/directives/#secret).").optional(),
        "assumeRoleOfResource": z.string().optional().describe("#### Assume Role of Resource\n\n---\n\nThe name of a deployed resource whose IAM role the script should assume. This grants the script the same permissions as the specified resource.\n\nThe resource must be deployed before the script is executed. Stacktape injects temporary AWS credentials as environment variables, which are automatically used by most AWS SDKs and CLIs.\n\n**Supported Resource Types:**\n- `function`\n- `batch-job`\n- `worker-service`\n- `web-service`\n- `private-service`\n- `multi-container-workload`\n- `nextjs-web`\n- `astro-web`\n- `nuxt-web`\n- `sveltekit-web`\n- `solidstart-web`\n- `tanstack-web`\n- `remix-web`").optional() }).strict()
    }).strict()
    .describe("#### A script that runs remotely on a bastion server.\n\n---\n\nBastion scripts are executed on a bastion server within your VPC, not on your local machine.\nLogs from the script's execution are streamed in real-time to your terminal.\n\nThis is useful for running commands that need direct access to VPC resources\nor for ensuring consistent execution environments across different machines."), z.object({
      "type": z.literal("local-script-with-bastion-tunneling"),
      "properties": z.object({
        "bastionResource": z.string().optional().describe("#### Bastion Resource Name\n\n---\n\nThe name of the bastion resource to use for tunneling to protected resources.").optional(),
        "executeScript": z.string().optional().describe("#### Execute Script\n\n---\n\nThe path to a script file to execute. The script can be written in JavaScript, TypeScript, or Python and runs in a separate process.\n\nThe executable is determined by `defaults:configure` or the system default (`node` for JS/TS, `python` for Python). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "executeCommand": z.string().optional().describe("#### Execute Command\n\n---\n\nA single terminal command to execute in a separate shell process.\n\nThe command runs on the machine executing the Stacktape command. Be aware of potential differences between local and CI environments (e.g., OS, shell). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "executeScripts": z.array(z.string()).optional().describe("#### Execute Scripts\n\n---\n\nA list of script files to execute sequentially. Each script runs in a separate process.\n\nThe script can be written in JavaScript, TypeScript, or Python. The executable is determined by `defaults:configure` or the system default. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "executeCommands": z.array(z.string()).optional().describe("#### Execute Commands\n\n---\n\nA list of terminal commands to execute sequentially. Each command runs in a separate shell process.\n\nThe commands run on the machine executing the Stacktape command. Be aware of potential differences between environments. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.").optional(),
        "cwd": z.string().optional().describe("#### Working Directory\n\n---\n\nThe directory where the script or command will be executed."),
        "pipeStdio": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Pipe Stdio\n\n---\n\nIf `true`, pipes the standard input/output (stdio) of the hook process to the main process. This allows you to see logs from your hook and interact with prompts.").default(true),
        "connectTo": z.array(z.string()).optional().describe("#### Connect To\n\n---\n\nA list of resources the script needs to interact with. Stacktape automatically injects environment variables with connection details for each specified resource.\n\nEnvironment variable names are in the format `STP_[RESOURCE_NAME]_[VARIABLE_NAME]` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`).\n\n**Injected Variables by Resource Type:**\n- **`Bucket`**: `NAME`, `ARN`\n- **`DynamoDbTable`**: `NAME`, `ARN`, `STREAM_ARN`\n- **`MongoDbAtlasCluster`**: `CONNECTION_STRING`\n- **`RelationalDatabase`**: `CONNECTION_STRING`, `JDBC_CONNECTION_STRING`, `HOST`, `PORT`. For Aurora clusters, `READER_CONNECTION_STRING`, `READER_JDBC_CONNECTION_STRING`, and `READER_HOST` are also included.\n- **`RedisCluster`**: `HOST`, `READER_HOST`, `PORT`\n- **`EventBus`**: `ARN`\n- **`Function`**: `ARN`\n- **`BatchJob`**: `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n- **`UserAuthPool`**: `ID`, `CLIENT_ID`, `ARN`\n- **`SnsTopic`**: `ARN`, `NAME`\n- **`SqsQueue`**: `ARN`, `NAME`, `URL`\n- **`UpstashKafkaTopic`**: `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL`\n- **`UpstashRedis`**: `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n- **`PrivateService`**: `ADDRESS`\n- **`WebService`**: `URL`").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment Variables\n\n---\n\nA list of environment variables to pass to the script or command.\n\nValues can be:\n- A static string, number, or boolean.\n- The result of a [custom directive](https://docs.stacktape.com/configuration/directives/#custom-directives).\n- A reference to another resource's parameter using the [`$ResourceParam` directive](https://docs.stacktape.com/configuration/referencing-parameters/).\n- A value from a [secret](https://docs.stacktape.com/resources/secrets/) using the [`$Secret` directive](https://docs.stacktape.com/configuration/directives/#secret).").optional(),
        "assumeRoleOfResource": z.string().optional().describe("#### Assume Role of Resource\n\n---\n\nThe name of a deployed resource whose IAM role the script should assume. This grants the script the same permissions as the specified resource.\n\nThe resource must be deployed before the script is executed. Stacktape injects temporary AWS credentials as environment variables, which are automatically used by most AWS SDKs and CLIs.\n\n**Supported Resource Types:**\n- `function`\n- `batch-job`\n- `worker-service`\n- `web-service`\n- `private-service`\n- `multi-container-workload`\n- `nextjs-web`\n- `astro-web`\n- `nuxt-web`\n- `sveltekit-web`\n- `solidstart-web`\n- `tanstack-web`\n- `remix-web`").optional() }).strict()
    }).strict()
    .describe("#### A local script with secure tunneling through a bastion host.\n\n---\n\nThis script type runs locally but tunnels connections to resources through a bastion server.\nIt provides a secure, encrypted connection to resources that are only accessible within the VPC,\nsuch as private databases or Redis clusters.\n\nThe environment variables injected by `connectTo` are automatically adjusted to use the tunneled endpoints.")])).optional().describe("#### Custom shell commands or code you can run manually or as lifecycle hooks.\n\n---\n\nUse `connectTo` in a script to auto-inject database URLs, API keys, etc. as environment variables.\nRun scripts with `stacktape script:run --scriptName myScript` or attach them to `hooks`.\n\n**Script types:**\n- **`local-script`**: Runs on your machine (or CI). Good for migrations, builds, seed scripts.\n- **`local-script-with-bastion-tunneling`**: Runs locally but tunnels connections to VPC-only\n  resources (e.g., private databases) through a bastion host.\n- **`bastion-script`**: Runs remotely on the bastion host inside your VPC.\n\nScripts can be shell commands or JS/TS/Python files.").optional(),
  "directives": z.array(z.object({
    "name": z.string().describe("#### Directive Name\n\n---\n\nThe name of the custom directive."),
    "filePath": z.string().describe("#### File Path\n\n---\n\nThe path to the file where the directive is defined, in the format `{file-path}:{handler}`.\n\nIf the `{handler}` is omitted:\n- For `.js` and `.ts` files, the `default` export is used.\n- For `.py` files, the `main` function is used.") }).strict()
  ).optional().describe("#### Register custom functions that dynamically compute config values at deploy time.\n\n---\n\nDefine a directive by pointing to a JS/TS/Python file, then use it anywhere in the config\nlike a built-in directive (`$MyDirective()`). Useful for fetching external data,\ncomputing dynamic values, or conditional logic.").optional(),
  "deploymentConfig": z.object({
    "terminationProtection": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Prevents accidental stack deletion. Must be disabled before you can delete.\n\n---\n\nRecommended for production stacks. To delete a protected stack, first deploy with\n`terminationProtection: false`, then run the delete command.").default(false),
    "cloudformationRoleArn": z.string().optional().describe("#### IAM role for CloudFormation to assume during create/update/delete operations.\n\n---\n\nUse this when your deploy user has limited permissions and CloudFormation needs\na more privileged role to manage resources. The role is persisted across deployments\nand reused for delete/rollback even if removed from config later.").optional(),
    "triggerRollbackOnAlarms": z.array(z.string()).optional().describe("#### Alarms that trigger automatic rollback if they fire during deployment.\n\n---\n\nSpecify alarm names (from `alarms` section) or ARNs. The alarm must already exist -\na newly created alarm only takes effect on the *next* deployment.\n\nUse with `monitoringTimeAfterDeploymentInMinutes` to keep watching after deploy completes.").optional(),
    "monitoringTimeAfterDeploymentInMinutes": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long (in minutes) to monitor rollback alarms after deployment completes.\n\n---\n\nIf an alarm fires during this window, the stack rolls back automatically.\nOnly useful when `triggerRollbackOnAlarms` is configured.").default(0),
    "disableAutoRollback": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Keep the stack in a failed state instead of rolling back on deployment failure.\n\n---\n\nUseful for debugging: inspect what went wrong, then fix and redeploy\n(or run `stacktape rollback` manually). By default, failed deployments\nauto-rollback to the last working state.").default(false),
    "publishEventsToArn": z.array(z.string()).optional().describe("#### SNS topic ARNs to receive CloudFormation stack events during deployment.\n\n---\n\nUseful for monitoring deployments in external systems (Slack, PagerDuty, etc.).").optional(),
    "previousVersionsToKeep": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many old deployment artifacts (Lambda bundles, container images) to keep.\n\n---\n\nOlder versions are cleaned up automatically. Lower values save storage costs,\nhigher values make it easier to roll back to previous versions.").default(10),
    "disableS3TransferAcceleration": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable faster uploads via S3 Transfer Acceleration.\n\n---\n\nTransfer Acceleration routes uploads through the nearest AWS edge location\nfor faster deploys, especially from distant regions. Adds a small cost per GB.\nAutomatically disabled in regions where it's not available.").default(false) }).strict()
  .optional().describe("#### Advanced deployment settings: rollback behavior, termination protection, artifact retention.\n\n---\n\nMost projects don't need to change these. Useful for production stacks where you want\nextra safety (termination protection, rollback alarms) or cost control (artifact cleanup).").optional(),
  "stackConfig": z.object({
    "outputs": z.array(z.object({
      "name": z.string().describe("#### Name of the output (used as the key in terminal and stack info file)."),
      "value": z.string().describe("#### Value to output. Typically a directive like `$ResourceParam('myApi', 'url')`."),
      "description": z.string().optional().describe("#### Human-readable description shown alongside the output.").optional(),
      "export": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Make this output available to other CloudFormation stacks.\n\n---\n\nExported outputs can be referenced from other stacks using `$CfStackOutput()`.").default(false) }).strict()
    ).optional().describe("#### Custom values to display and save after each deployment.\n\n---\n\nUse outputs to surface dynamic values like API URLs, database endpoints, or resource ARNs\nthat are only known after deployment. Outputs are:\n- Printed in the terminal after deploy\n- Saved to the stack info JSON file\n- Optionally exported for cross-stack references (via `export: true`)").optional(),
    "tags": z.array(z.object({
      "name": z.string().describe("#### Tag name (1-128 characters)."),
      "value": z.string().describe("#### Tag value (1-256 characters).") }).strict()
    ).optional().describe("#### Tags applied to every AWS resource in this stack.\n\n---\n\nUseful for cost tracking, access control, and organization. Stacktape automatically\nadds `projectName`, `stage`, and `stackName` tags — your custom tags are merged on top.\n\nMax 45 tags.").optional(),
    "disableStackInfoSaving": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Stop saving stack info to a local file after each deployment.\n\n---\n\nBy default, Stacktape saves resource details and custom outputs to\n`.stacktape-stack-info/{stackName}.json` after every deploy.").default(false),
    "stackInfoDirectory": z.string().optional().describe("#### Directory for the stack info JSON file.\n\n---\n\nRelative to the project root."),
    "vpc": z.object({
      "reuseVpc": z.object({
        "projectName": z.string().optional().describe("#### Project name of the stack whose VPC you want to share.\n\n---\n\nMust be used together with `stage`. Cannot be combined with `vpcId`.").optional(),
        "stage": z.string().optional().describe("#### Stage of the stack whose VPC you want to share.\n\n---\n\nMust be used together with `projectName`. Cannot be combined with `vpcId`.").optional(),
        "vpcId": z.string().optional().describe("#### Direct VPC ID to reuse (e.g., `vpc-1234567890abcdef0`).\n\n---\n\nUse this to connect to a VPC not managed by Stacktape. Cannot be combined\nwith `projectName`/`stage`.\n\nThe VPC must use a private CIDR range (10.x, 172.16-31.x, or 192.168.x)\nand have at least 3 public subnets (subnets with a route to an Internet Gateway).").optional() }).strict()
      .optional().describe("#### Share a VPC with another Stacktape stack or use an existing VPC.\n\n---\n\nUseful when this stack needs to access VPC-protected resources (databases, Redis)\nfrom another stack. By default, each stack gets its own VPC.\n\n> **Important:** Set this when first creating the stack. Adding it to an already\n> deployed stack can cause resources to be replaced and **data to be lost**.").optional(),
      "nat": z.object({
        "availabilityZones": z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().describe("#### How many availability zones get a NAT Gateway (~$32/month each).\n\n---\n\n- **1**: Cheapest, but no redundancy if that AZ goes down.\n- **2**: Balanced cost and availability.\n- **3**: Highest availability.\n\nEach NAT Gateway gets a static Elastic IP that persists across deployments —\nuseful for IP whitelisting with external services.").default(2) }).strict()
      .optional().describe("#### NAT Gateway configuration for private subnets.\n\n---\n\nOnly applies when you have workloads using `usePrivateSubnetsWithNAT: true`.\nControls how many availability zones get a NAT Gateway (affects cost and redundancy).").optional() }).strict()
    .optional().describe("#### VPC configuration: reuse an existing VPC or configure NAT Gateways.").optional() }).strict()
  .optional().describe("#### Stack-wide settings: custom outputs, tags, VPC configuration, and stack info saving.").optional(),
  "resources": z.record(z.string(), z.union([z.object({
      "type": z.literal("multi-container-workload"),
      "properties": z.object({
        "containers": z.array(z.object({
          "events": z.array(z.union([z.object({
              "type": z.literal("application-load-balancer"),
              "properties": z.object({
                "containerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The container port that will receive traffic from the load balancer."),
                "loadBalancerName": z.string().describe("#### The name of the Application Load Balancer.\n\n---\n\nThis must reference a load balancer defined in your Stacktape configuration."),
                "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The port of the load balancer listener to attach to.\n\n---\n\nYou only need to specify this if the load balancer uses custom listeners.").optional(),
                "priority": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The priority of this integration rule.\n\n---\n\nLoad balancer rules are evaluated in order from the lowest priority to the highest.\nThe first rule that matches an incoming request will handle it."),
                "paths": z.array(z.string()).optional().describe("#### A list of URL paths that will trigger this integration.\n\n---\n\nThe request will be routed if its path matches any of the paths in this list.\nThe comparison is case-sensitive and supports `*` and `?` wildcards.\n\nExample: `/users`, `/articles/*`").optional(),
                "methods": z.array(z.string()).optional().describe("#### A list of HTTP methods that will trigger this integration.\n\n---\n\nExample: `GET`, `POST`, `DELETE`").optional(),
                "hosts": z.array(z.string()).optional().describe("#### A list of hostnames that will trigger this integration.\n\n---\n\nThe hostname is parsed from the `Host` header of the request.\nWildcards (`*` and `?`) are supported.\n\nExample: `api.example.com`, `*.myapp.com`").optional(),
                "headers": z.array(z.object({
                  "headerName": z.string().describe("#### The name of the HTTP header."),
                  "values": z.array(z.string()).describe("#### A list of allowed values for the header.\n\n---\n\nThe condition is met if the header's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.") }).strict()
                ).optional().describe("#### A list of header conditions that the request must match.\n\n---\n\nAll header conditions must be met for the request to be routed.").optional(),
                "queryParams": z.array(z.object({
                  "paramName": z.string().describe("#### The name of the query parameter."),
                  "values": z.array(z.string()).describe("#### A list of allowed values for the query parameter.\n\n---\n\nThe condition is met if the query parameter's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.") }).strict()
                ).optional().describe("#### A list of query parameter conditions that the request must match.\n\n---\n\nAll query parameter conditions must be met for the request to be routed.").optional(),
                "sourceIps": z.array(z.string()).optional().describe("#### A list of source IP addresses (in CIDR format) that are allowed to trigger this integration.\n\n---\n\n> **Note:** If the client is behind a proxy, this will be the IP address of the proxy.").optional() }).strict()
            }).strict()
            .describe("#### Triggers a container when a request matches the specified conditions on an Application Load Balancer.\n\n---\n\nYou can route requests based on HTTP method, path, headers, query parameters, and source IP address."), z.object({
              "type": z.literal("http-api-gateway"),
              "properties": z.object({
                "containerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The container port that will receive traffic from the API Gateway."),
                "httpApiGatewayName": z.string().describe("#### The name of the HTTP API Gateway."),
                "method": z.enum(["*","DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"]).describe("#### The HTTP method that will trigger this integration.\n\n---\n\nYou can specify an exact method (e.g., `GET`) or use `*` to match any method."),
                "path": z.string().describe("#### The URL path that will trigger this integration.\n\n---\n\n- **Exact path**: `/users`\n- **Path with parameter**: `/users/{id}`. The `id` will be available in `event.pathParameters.id`.\n- **Greedy path**: `/files/{proxy+}`. This will match any path starting with `/files/`."),
                "authorizer": z.union([z.object({
                    "type": z.literal("cognito").describe("#### Cognito JWT authorizer\n\n---\n\nConfigures an HTTP API authorizer that validates JSON Web Tokens (JWTs) issued by a Cognito user pool.\nThis is the simplest way to protect routes when your users sign in via `user-auth-pool`.\n\nStacktape turns this into an API Gateway v2 authorizer of type `JWT` that checks the token's issuer and audience."),
                    "properties": z.object({
                      "userPoolName": z.string().describe("#### Name of the user pool to protect the API\n\n---\n\nThe Stacktape name of the `user-auth-pool` resource whose tokens should be accepted by this HTTP API authorizer.\nStacktape uses this to:\n\n- Set the expected **audience** to the user pool client ID.\n- Build the expected **issuer** URL based on the user pool and AWS region.\n\nIn practice this means only JWTs issued by this pool (and its client) will be considered valid."),
                      "identitySources": z.array(z.string()).optional().describe("#### Where to read the JWT from in the request\n\n---\n\nA list of identity sources that tell API Gateway where to look for the bearer token, using the\n`$request.*` syntax from API Gateway (for example `'$request.header.Authorization'`).\n\nIf you omit this, Stacktape defaults to reading the token from the `Authorization` HTTP header,\nusing a JWT authorizer as described in the API Gateway v2 authorizer docs\n([AWS::ApiGatewayV2::Authorizer](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer)).").optional() }).strict()
                  }).strict()
                  , z.object({
                    "type": z.literal("lambda").describe("#### Lambda-based HTTP API authorizer\n\n---\n\nConfigures an API Gateway **request** authorizer that runs a Lambda function to decide whether a request is allowed.\nThis is useful when your authorization logic can't be expressed as simple JWT validation – for example when you\ncheck API keys, look up permissions in a database, or integrate with a non-JWT identity system.\n\nStacktape creates an `AWS::ApiGatewayV2::Authorizer` of type `REQUEST` and wires it up to your Lambda."),
                    "properties": z.object({
                      "functionName": z.string().describe("#### Name of the authorizer function\n\n---\n\nThe Stacktape name of a `function` resource that should run for each authorized request.\nAPI Gateway calls this Lambda, passes request details, and uses its response to allow or deny access."),
                      "iamResponse": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use IAM-style (v1) authorizer responses\n\n---\n\n- If `true`, your Lambda must return a full IAM policy document (the \"v1\" format).\n- If `false` or omitted, Stacktape enables **simple responses** (the HTTP API v2 payload format)\n  so your Lambda can return a small JSON object with an `isAuthorized` flag and optional context.\n\nThis flag is wired to `EnableSimpleResponses` on the underlying `AWS::ApiGatewayV2::Authorizer`.").optional(),
                      "identitySources": z.array(z.string()).optional().describe("#### Where to read identity data from\n\n---\n\nA list of request fields API Gateway should pass into your Lambda authorizer (for example headers, query parameters,\nor stage variables) using the `$request.*` syntax.\n\nWhen left empty, no specific identity sources are configured and your Lambda must inspect the incoming event directly.").optional(),
                      "cacheResultSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Cache authorizer results\n\n---\n\nNumber of seconds API Gateway should cache the result of the Lambda authorizer for a given identity.\nWhile cached, repeated requests skip calling your authorizer function and reuse the previous result.\n\nThis value is applied to `AuthorizerResultTtlInSeconds`. If omitted, Stacktape sets it to `0` (no caching).").optional() }).strict()
                  }).strict()
                ]).optional().describe("#### An authorizer to protect this route.\n\n---\n\nUnauthorized requests will be rejected with a `401 Unauthorized` response.").optional(),
                "payloadFormat": z.enum(["1.0","2.0"]).optional().describe("#### The payload format version for the Lambda integration.\n\n---\n\nFor details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).") }).strict()
            }).strict()
            .describe("#### Triggers a container when an HTTP API Gateway receives a matching request.\n\n---\n\nYou can route requests based on HTTP method and path."), z.object({
              "type": z.literal("workload-internal"),
              "properties": z.object({
                "containerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The container port to open for internal traffic.") }).strict()
            }).strict()
            .describe("#### Opens a container port for connections from other containers within the same workload."), z.object({
              "type": z.literal("service-connect"),
              "properties": z.object({
                "containerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The container port to open for service-to-service communication."),
                "alias": z.string().optional().describe("#### An alias for this service, used for service discovery.\n\n---\n\nOther resources in the stack can connect to this service using a URL like `protocol://alias:port` (e.g., `http://my-service:8080`).\nBy default, the alias is derived from the resource and container names (e.g., `my-resource-my-container`).").optional(),
                "protocol": z.enum(["grpc","http","http2"]).optional().describe("#### The protocol used for service-to-service communication.\n\n---\n\nSpecifying the protocol allows AWS to capture protocol-specific metrics, such as the number of HTTP 5xx errors.").optional() }).strict()
            }).strict()
            .describe("#### Opens a container port for connections from other compute resources in the same stack."), z.object({
              "type": z.literal("network-load-balancer"),
              "properties": z.object({
                "containerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The container port that will receive traffic from the load balancer."),
                "loadBalancerName": z.string().describe("#### The name of the Network Load Balancer.\n\n---\n\nThis must reference a load balancer defined in your Stacktape configuration."),
                "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The port of the listener that will forward traffic to this integration.") }).strict()
            }).strict()
            .describe("#### Triggers a container when a request is made to a Network Load Balancer.\n\n---\n\nA Network Load Balancer operates at the transport layer (Layer 4) and can handle TCP and TLS traffic.")])).optional().describe("#### How this container receives traffic (API Gateway, load balancer, or service-connect).").optional(),
          "loadBalancerHealthCheck": z.object({
            "healthcheckPath": z.string().optional().describe("#### Path the load balancer pings to check container health.").default("/"),
            "healthcheckInterval": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks.").default(5),
            "healthcheckTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a health check is considered failed.").default(4),
            "healthCheckProtocol": z.enum(["HTTP","TCP"]).optional().describe("#### Health check protocol. ALB defaults to `HTTP`, NLB defaults to `TCP`.").optional(),
            "healthCheckPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Health check port. Defaults to the traffic port.").optional() }).strict()
          .optional().describe("#### Load balancer health check settings. Only applies when integrated with an ALB or NLB.").optional(),
          "name": z.string().describe("#### Unique container name within this workload."),
          "packaging": z.union([z.object({
              "type": z.literal("stacktape-image-buildpack"),
              "properties": z.object({
                "languageSpecificConfig": z.union([z.object({
                    "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                    "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                    "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                    "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                    "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                    "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                    "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                    "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                  , z.object({
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                    "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                    "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                    "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                    "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                  , z.object({
                    "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                    "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                  , z.object({
                    "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                  , z.object({
                    "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                    "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                  , z.record(z.string(), z.never()), z.object({
                    "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
                ]).optional().describe("#### Language-specific packaging configuration.").optional(),
                "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
                "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
                "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
                "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
                "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
                "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
              .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
            .describe("#### A zero-config buildpack that creates a container image from your source code.\n\n---\n\nThe `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, and Go.\n\nFor JS/TS, your code is bundled into a single file with source maps.\nThe resulting image is uploaded to a managed ECR repository."), z.object({
              "type": z.literal("external-buildpack"),
              "properties": z.object({
                "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
                "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using an external buildpack.\n\n---\n\nExternal buildpacks (buildpacks.io) automatically detect your application type\nand build an optimized container image with zero configuration.\n\nThe default builder is `paketobuildpacks/builder-jammy-base`.\nYou can find buildpacks for almost any language or framework."), z.object({
              "type": z.literal("prebuilt-image"),
              "properties": z.object({
                "repositoryCredentialsSecretArn": z.string().optional().describe("#### The ARN of a secret containing credentials for a private container registry.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.").optional(),
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "image": z.string().describe("#### The name or URL of the container image."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures a pre-built container image.") }).strict()
            .describe("#### Uses a pre-built container image.\n\n---\n\nWith `prebuilt-image`, you provide a reference to an existing container image.\nThis can be a public image from Docker Hub or a private image from any container registry.\n\nFor private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager."), z.object({
              "type": z.literal("custom-dockerfile"),
              "properties": z.object({
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
                "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
                "buildArgs": z.array(z.object({
                  "argName": z.string().describe("#### Argument name"),
                  "value": z.string().describe("#### Argument value") }).strict()
                ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
            .describe("#### Builds a container image from your own Dockerfile.\n\n---\n\nWith `custom-dockerfile`, you provide a path to your Dockerfile and build context.\nStacktape builds the image and uploads it to a managed ECR repository.\n\nThis gives you full control over the container environment and is ideal for complex setups."), z.object({
              "type": z.literal("nixpacks"),
              "properties": z.object({
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
                "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
                "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
                "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
                "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
                "phases": z.array(z.object({
                  "name": z.string().describe("#### The name of the build phase."),
                  "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                  "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                  "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                  "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                  "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                  "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                  "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                  "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
                ).optional().describe("#### The build phases for the application.").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using Nixpacks.\n\n---\n\nNixpacks automatically detects your application type and builds an optimized container image.\nIn most cases, no configuration is required.\n\nIt supports a wide range of languages and frameworks out of the box.")]).describe("#### How to build or specify the container image."),
          "essential": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### If `true` (default), the entire workload restarts when this container fails.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.").optional(),
          "dependsOn": z.array(z.object({
            "containerName": z.string().describe("The name of the container that this container depends on."),
            "condition": z.enum(["COMPLETE","HEALTHY","START","SUCCESS"]).describe("#### The condition that the dependency container must meet.\n---\nAvailable conditions:\n- `START`: The dependency has started.\n- `COMPLETE`: The dependency has finished executing (regardless of success).\n- `SUCCESS`: The dependency has finished with an exit code of `0`.\n- `HEALTHY`: The dependency has passed its first health check.") }).strict()
          ).optional().describe("#### Start this container only after the listed containers reach a specific state.\n\n---\n\nE.g., wait for a database sidecar to be `HEALTHY` before starting the app container.").optional(),
          "environment": z.array(z.object({
            "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
            "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
          ).optional().describe("#### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
          "internalHealthCheck": z.object({
            "healthCheckCommand": z.array(z.string()).describe("#### Command to check health. E.g., `[\"CMD-SHELL\", \"curl -f http://localhost/ || exit 1\"]`. Exit 0 = healthy."),
            "intervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(30),
            "timeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a check is considered failed (2-60).").default(5),
            "retries": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Consecutive failures before marking unhealthy (1-10).").default(3),
            "startPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Grace period (seconds) before counting failures. Gives the container time to start (0-300).").optional() }).strict()
          .optional().describe("#### Command-based health check. If it fails on an essential container, the workload instance is replaced.").optional(),
          "stopTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait after SIGTERM before SIGKILL (2-120).").default(2),
          "volumeMounts": z.array(z.object({
            "type": z.literal("efs").describe("#### The type of the volume mount."),
            "properties": z.object({
              "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
              "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Restricts access to that directory."),
              "mountPath": z.string().describe("#### Absolute path inside the container where the volume is mounted (e.g., `/data`).") }).strict()
            .describe("#### Properties for the EFS volume mount.") }).strict()
          ).optional().describe("#### Mount EFS volumes for persistent, shared storage across containers.").optional() }).strict()
        ).describe("#### Containers in this workload. They share compute resources and scale together."),
        "resources": z.object({
          "cpu": z.union([z.literal(0.25), z.literal(0.5), z.literal(1), z.literal(16), z.literal(2), z.literal(4), z.literal(8)]).optional().describe("#### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.").optional(),
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB. Must be compatible with the vCPU count on Fargate.\n\n---\n\nFargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,\n4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.\nFor EC2: auto-detected from instance type if omitted.").optional(),
          "instanceTypes": z.array(z.string()).optional().describe("#### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.\n\n---\n\nFirst type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.\nTip: specify a single type and omit `cpu`/`memory` for optimal sizing.").optional(),
          "enableWarmPool": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.").optional(),
          "architecture": z.enum(["arm64","x86_64"]).optional().describe("#### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.") }).strict()
        .describe("#### CPU, memory, and compute engine (Fargate or EC2).\n\n---\n\n- **Fargate** (set `cpu` + `memory`): Serverless, no servers to manage.\n- **EC2** (set `instanceTypes`): Choose specific instance types for more control or GPU access."),
        "scaling": z.object({
          "minInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum running instances. Set to 0 is not supported — minimum is 1.").default(1),
          "maxInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum running instances. Traffic is distributed across all instances.").default(1),
          "scalingPolicy": z.object({
            "keepAvgCpuUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg CPU exceeds this %, scale in when it drops below.").default(80),
            "keepAvgMemoryUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg memory exceeds this %, scale in when it drops below.").default(80) }).strict()
          .optional().describe("#### When to scale: CPU and/or memory utilization targets.").optional() }).strict()
        .optional().describe("#### Auto-scaling: how many instances and when to add/remove them.").optional(),
        "deployment": z.object({
          "strategy": z.enum(["AllAtOnce","Canary10Percent15Minutes","Canary10Percent5Minutes","Linear10PercentEvery1Minutes","Linear10PercentEvery3Minutes"]).describe("#### How traffic shifts to the new version during deployment.\n\n---\n\n- `Canary10Percent5Minutes`: 10% first, then all after 5 min.\n- `Canary10Percent15Minutes`: 10% first, then all after 15 min.\n- `Linear10PercentEvery1Minutes`: 10% more every minute.\n- `Linear10PercentEvery3Minutes`: 10% more every 3 minutes.\n- `AllAtOnce`: Instant switch."),
          "beforeAllowTrafficFunction": z.string().optional().describe("#### Lambda function to run before traffic shifts to the new version (for validation/smoke tests).").optional(),
          "afterTrafficShiftFunction": z.string().optional().describe("#### Lambda function to run after all traffic has shifted (for post-deployment checks).").optional(),
          "testListenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### ALB listener port for test traffic. Only needed with `beforeAllowTrafficFunction` and custom listeners.").optional() }).strict()
        .optional().describe("#### Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration.").optional(),
        "enableRemoteSessions": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Enable `stacktape container:session` for interactive shell access to running containers.").optional(),
        "usePrivateSubnetsWithNAT": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP.\n\n---\n\nUseful for IP whitelisting with third-party APIs. NAT Gateway costs ~$32/month per AZ + data processing fees.").default(false),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Run multiple containers together as a single unit with shared compute resources.\n\n---\n\nFor advanced setups: sidecars, init containers, or services that need multiple processes.\nSupports Fargate (serverless) or EC2 (custom instances). Auto-scales horizontally."), z.object({
      "type": z.literal("batch-job"),
      "properties": z.object({
        "container": z.object({
          "packaging": z.union([z.object({
              "type": z.literal("stacktape-image-buildpack"),
              "properties": z.object({
                "languageSpecificConfig": z.union([z.object({
                    "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                    "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                    "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                    "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                    "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                    "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                    "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                    "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                  , z.object({
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                    "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                    "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                    "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                    "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                  , z.object({
                    "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                    "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                  , z.object({
                    "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                  , z.object({
                    "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                    "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                  , z.record(z.string(), z.never()), z.object({
                    "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
                ]).optional().describe("#### Language-specific packaging configuration.").optional(),
                "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
                "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
                "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
                "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
                "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
                "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
              .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
            , z.object({
              "type": z.literal("external-buildpack"),
              "properties": z.object({
                "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
                "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("prebuilt-image"),
              "properties": z.object({
                "image": z.string().describe("#### The name or URL of the container image."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures a pre-built container image.") }).strict()
            , z.object({
              "type": z.literal("custom-dockerfile"),
              "properties": z.object({
                "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
                "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
                "buildArgs": z.array(z.object({
                  "argName": z.string().describe("#### Argument name"),
                  "value": z.string().describe("#### Argument value") }).strict()
                ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
            , z.object({
              "type": z.literal("nixpacks"),
              "properties": z.object({
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
                "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
                "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
                "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
                "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
                "phases": z.array(z.object({
                  "name": z.string().describe("#### The name of the build phase."),
                  "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                  "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                  "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                  "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                  "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                  "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                  "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                  "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
                ).optional().describe("#### The build phases for the application.").optional() }).strict()
            }).strict()
          ]).describe("#### How to build or specify the container image for this job."),
          "environment": z.array(z.object({
            "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
            "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
          ).optional().describe("#### Environment variables injected into the container at runtime.\n\n---\n\nUse `$ResourceParam()` or `$Secret()` to inject database URLs, API keys, etc.").optional() }).strict()
        .describe("#### Docker container image and environment for the job."),
        "resources": z.object({
          "cpu": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Number of vCPUs for the job (e.g., 1, 2, 4)."),
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Memory in MB. Use slightly less than powers of 2 for efficient instance sizing.\n\n---\n\nAWS reserves some memory for system processes. Requesting exactly 8192 MB (8 GB) may provision\na larger instance than needed. Use 7680 MB instead to fit on a standard 8 GB instance."),
          "gpu": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Number of GPUs. The job will run on a GPU instance (NVIDIA A100, A10G, etc.).\n\n---\n\nOmit for CPU-only workloads.").optional() }).strict()
        .describe("#### CPU, memory, and GPU requirements. AWS auto-provisions a matching instance."),
        "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max run time in seconds. The job is killed if it exceeds this, then retried if `retryConfig` is set.").optional(),
        "useSpotInstances": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use discounted spare AWS capacity. Saves up to 90%, but jobs can be interrupted.\n\n---\n\n**Use this when:** Your job can safely be restarted from the beginning (e.g., data imports,\nimage processing, ML training with checkpoints). Combine with `retryConfig` to auto-retry\non interruption.\n\n**Don't use when:** Your job has side effects that can't be repeated (e.g., sending emails,\ncharging payments) or must finish within a strict deadline.\n\nIf interrupted, your container gets a `SIGTERM` and 120 seconds to shut down gracefully.").default(false),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.").optional(),
        "retryConfig": z.object({
          "attempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max retry attempts before the job is marked as failed.").default(1),
          "retryIntervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait between retries.").default(0),
          "retryIntervalMultiplier": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Multiply wait time by this factor after each retry (exponential backoff).\n\n---\n\nE.g., with `retryIntervalSeconds: 5` and `retryIntervalMultiplier: 2`, waits are 5s, 10s, 20s, etc.").default(1) }).strict()
        .optional().describe("#### Auto-retry on failure, timeout, or Spot interruption.").optional(),
        "events": z.array(z.union([z.object({
            "type": z.literal("application-load-balancer").describe("#### Triggers a function when an Application Load Balancer receives a matching HTTP request.\n\n---\n\nYou can route requests based on HTTP method, path, headers, query parameters, and source IP address."),
            "properties": z.object({
              "loadBalancerName": z.string().describe("#### The name of the Application Load Balancer.\n\n---\n\nThis must reference a load balancer defined in your Stacktape configuration."),
              "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The port of the load balancer listener to attach to.\n\n---\n\nYou only need to specify this if the load balancer uses custom listeners.").optional(),
              "priority": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The priority of this integration rule.\n\n---\n\nLoad balancer rules are evaluated in order from the lowest priority to the highest.\nThe first rule that matches an incoming request will handle it."),
              "paths": z.array(z.string()).optional().describe("#### A list of URL paths that will trigger this integration.\n\n---\n\nThe request will be routed if its path matches any of the paths in this list.\nThe comparison is case-sensitive and supports `*` and `?` wildcards.\n\nExample: `/users`, `/articles/*`").optional(),
              "methods": z.array(z.string()).optional().describe("#### A list of HTTP methods that will trigger this integration.\n\n---\n\nExample: `GET`, `POST`, `DELETE`").optional(),
              "hosts": z.array(z.string()).optional().describe("#### A list of hostnames that will trigger this integration.\n\n---\n\nThe hostname is parsed from the `Host` header of the request.\nWildcards (`*` and `?`) are supported.\n\nExample: `api.example.com`, `*.myapp.com`").optional(),
              "headers": z.array(z.object({
                "headerName": z.string().describe("#### The name of the HTTP header."),
                "values": z.array(z.string()).describe("#### A list of allowed values for the header.\n\n---\n\nThe condition is met if the header's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.") }).strict()
              ).optional().describe("#### A list of header conditions that the request must match.\n\n---\n\nAll header conditions must be met for the request to be routed.").optional(),
              "queryParams": z.array(z.object({
                "paramName": z.string().describe("#### The name of the query parameter."),
                "values": z.array(z.string()).describe("#### A list of allowed values for the query parameter.\n\n---\n\nThe condition is met if the query parameter's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.") }).strict()
              ).optional().describe("#### A list of query parameter conditions that the request must match.\n\n---\n\nAll query parameter conditions must be met for the request to be routed.").optional(),
              "sourceIps": z.array(z.string()).optional().describe("#### A list of source IP addresses (in CIDR format) that are allowed to trigger this integration.\n\n---\n\n> **Note:** If the client is behind a proxy, this will be the IP address of the proxy.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when an Application Load Balancer receives a matching HTTP request.\n\n---\n\nYou can route requests based on HTTP method, path, headers, query parameters, and source IP address."), z.object({
            "type": z.literal("sns"),
            "properties": z.object({
              "snsTopicName": z.string().optional().describe("#### The name of an SNS topic defined in your stack's resources.\n\n---\n\nYou must specify either `snsTopicName` or `snsTopicArn`.").optional(),
              "snsTopicArn": z.string().optional().describe("#### The ARN of an existing SNS topic.\n\n---\n\nUse this to subscribe to a topic that is not managed by your stack.\nYou must specify either `snsTopicName` or `snsTopicArn`.").optional(),
              "filterPolicy": z.any().optional().describe("#### Filter messages by attributes so only relevant ones trigger the function.\n\n---\n\nUses SNS subscription filter policy syntax. For content-based filtering, use EventBridge instead.").optional(),
              "onDeliveryFailure": z.object({
                "sqsQueueArn": z.string().optional().describe("#### The ARN of the SQS queue for failed messages.").optional(),
                "sqsQueueName": z.string().optional().describe("#### The name of an SQS queue (defined in your Stacktape configuration) for failed messages.").optional() }).strict()
              .optional().describe("#### A destination for messages that fail to be delivered to the target.\n\n---\n\nIn rare cases (e.g., if the target function cannot scale fast enough), a message might fail to be delivered.\nThis property specifies an SQS queue where failed messages will be sent.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when a new message is published to an SNS topic.\n\n---\n\nSNS is a pub/sub messaging service. Reference a topic from your stack's `snsTopics` or use an external ARN."), z.object({
            "type": z.literal("sqs"),
            "properties": z.object({
              "sqsQueueName": z.string().optional().describe("#### The name of an SQS queue defined in your stack's resources.\n\n---\n\nYou must specify either `sqsQueueName` or `sqsQueueArn`.").optional(),
              "sqsQueueArn": z.string().optional().describe("#### The ARN of an existing SQS queue.\n\n---\n\nUse this to consume messages from a queue that is not managed by your stack.\nYou must specify either `sqsQueueName` or `sqsQueueArn`.").optional(),
              "batchSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum number of records to process in a single batch.\n\n---\n\nMaximum is 10,000.").default(10),
              "maxBatchWindowSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time (in seconds) to wait before invoking the function with a batch of records.\n\n---\n\nMaximum is 300 seconds. If not set, the function is invoked as soon as messages are available.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when new messages are available in an SQS queue.\n\n---\n\nMessages are processed in batches. The function fires when `batchSize` is reached,\n`maxBatchWindowSeconds` expires, or the 6 MB payload limit is hit.\n\n**Important:** A single SQS queue should only have one consumer function. For fan-out (multiple\nconsumers for the same message), use an SNS topic or EventBridge event bus instead."), z.object({
            "type": z.literal("kinesis-stream"),
            "properties": z.object({
              "kinesisStreamName": z.string().optional().describe("#### The name of a Kinesis stream defined in your stack's resources.\n\n---\n\nYou must specify either `kinesisStreamName` or `streamArn`.").optional(),
              "streamArn": z.string().optional().describe("#### The ARN of an existing Kinesis stream to consume records from.\n\n---\n\nUse this to consume from a stream that is not managed by your stack.\nYou must specify either `kinesisStreamName` or `streamArn`.").optional(),
              "consumerArn": z.string().optional().describe("#### The ARN of a specific stream consumer to use.\n\n---\n\nThis cannot be used with `autoCreateConsumer`.").optional(),
              "autoCreateConsumer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Automatically creates a dedicated stream consumer for this integration.\n\n---\n\nThis is recommended for minimizing latency and maximizing throughput.\nFor more details, see the [AWS documentation on stream consumers](https://docs.aws.amazon.com/streams/latest/dev/amazon-kinesis-consumers.html).\nThis cannot be used with `consumerArn`.").optional(),
              "maxBatchWindowSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time (in seconds) to wait before invoking the function with a batch of records.\n\n---\n\nMaximum is 300 seconds.").optional(),
              "batchSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum number of records to process in a single batch.\n\n---\n\nMaximum is 10,000.").default(10),
              "startingPosition": z.enum(["LATEST","TRIM_HORIZON"]).optional().describe("#### The position in the stream from which to start reading records.\n\n---\n\n- `LATEST`: Read only new records.\n- `TRIM_HORIZON`: Read all available records from the beginning of the stream."),
              "maximumRetryAttempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of times to retry a failed batch of records.\n\n---\n\n> **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.").optional(),
              "onFailure": z.object({
                "arn": z.string().describe("#### The ARN of the SNS topic or SQS queue for failed batches."),
                "type": z.enum(["sns","sqs"]).describe("#### The type of the destination.") }).strict()
              .optional().describe("#### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.").optional(),
              "parallelizationFactor": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of batches to process concurrently from the same shard.").optional(),
              "bisectBatchOnFunctionError": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Splits a failed batch in two before retrying.\n\n---\n\nThis can be useful if a failure is caused by a batch being too large.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when new records are available in a Kinesis Data Stream.\n\n---\n\nRecords are processed in batches. Two consumption modes:\n- **Direct**: Polls each shard ~1/sec, throughput shared with other consumers.\n- **Stream Consumer** (`autoCreateConsumer`): Dedicated connection per shard — higher throughput, lower latency."), z.object({
            "type": z.literal("dynamo-db-stream"),
            "properties": z.object({
              "streamArn": z.string().describe("#### The ARN of the DynamoDB table stream."),
              "maxBatchWindowSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time (in seconds) to wait before invoking the function with a batch of records.\n\n---\n\nMaximum is 300 seconds.").optional(),
              "batchSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum number of records to process in a single batch.\n\n---\n\nMaximum is 1,000.").default(100),
              "startingPosition": z.string().optional().describe("#### The position in the stream from which to start reading records.\n\n---\n\n- `LATEST`: Read only new records.\n- `TRIM_HORIZON`: Read all available records from the beginning of the stream.").default("TRIM_HORIZON"),
              "maximumRetryAttempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of times to retry a failed batch of records.\n\n---\n\n> **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.").optional(),
              "onFailure": z.object({
                "arn": z.string().describe("#### The ARN of the SNS topic or SQS queue for failed batches."),
                "type": z.enum(["sns","sqs"]).describe("#### The type of the destination.") }).strict()
              .optional().describe("#### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.").optional(),
              "parallelizationFactor": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of batches to process concurrently from the same shard.").optional(),
              "bisectBatchOnFunctionError": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Splits a failed batch in two before retrying.\n\n---\n\nThis can be useful if a failure is caused by a batch being too large.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when items are created, updated, or deleted in a DynamoDB table.\n\n---\n\nRecords are processed in batches. You must enable streams on the DynamoDB table first\n(set `streaming` in your `dynamoDbTables` config)."), z.object({
            "type": z.literal("s3"),
            "properties": z.object({
              "bucketArn": z.string().describe("#### The ARN of the S3 bucket to monitor for events."),
              "s3EventType": z.enum(["s3:ObjectCreated:*","s3:ObjectCreated:CompleteMultipartUpload","s3:ObjectCreated:Copy","s3:ObjectCreated:Post","s3:ObjectCreated:Put","s3:ObjectRemoved:*","s3:ObjectRemoved:Delete","s3:ObjectRemoved:DeleteMarkerCreated","s3:ObjectRestore:*","s3:ObjectRestore:Completed","s3:ObjectRestore:Post","s3:ReducedRedundancyLostObject","s3:Replication:*","s3:Replication:OperationFailedReplication","s3:Replication:OperationMissedThreshold","s3:Replication:OperationNotTracked","s3:Replication:OperationReplicatedAfterThreshold"]).describe("#### The type of S3 event that will trigger the function."),
              "filterRule": z.object({
                "prefix": z.string().optional().describe("#### The prefix that an object's key must have to trigger the function.").optional(),
                "suffix": z.string().optional().describe("#### The suffix that an object's key must have to trigger the function.").optional() }).strict()
              .optional().describe("#### A filter to apply to objects, so the function is only triggered for relevant objects.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when files are created, deleted, or restored in an S3 bucket."), z.object({
            "type": z.literal("schedule"),
            "properties": z.object({
              "scheduleRate": z.string().describe("#### The schedule rate or cron expression.\n\n---\n\nExamples: `rate(2 hours)`, `cron(0 10 * * ? *)`"),
              "input": z.any().optional().describe("#### A fixed JSON object to be passed as the event payload.\n\n---\n\nIf you need to customize the payload based on the event, use `inputTransformer` instead.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninput:\n  source: 'my-scheduled-event'\n```").optional(),
              "inputPath": z.string().optional().describe("#### A JSONPath expression to extract a portion of the event to pass to the target.\n\n---\n\nThis is useful for forwarding only a specific part of the event payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputPath: '$.detail'\n```").optional(),
              "inputTransformer": z.object({
                "inputPathsMap": z.any().optional().describe("#### A map of key-value pairs to extract from the event payload.\n\n---\n\nEach value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.").optional(),
                "inputTemplate": z.any().describe("#### A template for constructing a new event payload.\n\n---\n\nUse placeholders (`<placeholder>`) to insert the values extracted with `inputPathsMap`.") }).strict()
              .optional().describe("#### Customizes the event payload sent to the target.\n\n---\n\nThis allows you to extract values from the original event and use them to construct a new payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputTransformer:\n  inputPathsMap:\n    eventTime: '$.time'\n  inputTemplate:\n    message: 'This event occurred at <eventTime>.'\n```").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function on a recurring schedule (cron jobs, periodic tasks).\n\n---\n\nTwo formats:\n- **Rate**: `rate(5 minutes)`, `rate(1 hour)`, `rate(7 days)`\n- **Cron**: `cron(0 18 ? * MON-FRI *)` (6-field AWS cron, all times UTC)"), z.object({
            "type": z.literal("cloudwatch-log"),
            "properties": z.object({
              "logGroupArn": z.string().describe("#### The ARN of the log group to watch for new records."),
              "filter": z.string().optional().describe("#### A filter pattern to apply to the log records.\n\n---\n\nOnly logs that match this pattern will trigger the function.\nFor details on the syntax, see the [AWS documentation on filter and pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when new log records appear in a CloudWatch log group.\n\n---\n\n**Note:** The event payload is base64-encoded and gzipped — you must decode and decompress it in your handler."), z.object({
            "type": z.literal("http-api-gateway"),
            "properties": z.object({
              "httpApiGatewayName": z.string().describe("#### The name of the HTTP API Gateway."),
              "method": z.enum(["*","DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"]).describe("#### The HTTP method that will trigger this integration.\n\n---\n\nYou can specify an exact method (e.g., `GET`) or use `*` to match any method."),
              "path": z.string().describe("#### The URL path that will trigger this integration.\n\n---\n\n- **Exact path**: `/users`\n- **Path with parameter**: `/users/{id}`. The `id` will be available in `event.pathParameters.id`.\n- **Greedy path**: `/files/{proxy+}`. This will match any path starting with `/files/`."),
              "authorizer": z.union([z.object({
                  "type": z.literal("cognito").describe("#### Cognito JWT authorizer\n\n---\n\nConfigures an HTTP API authorizer that validates JSON Web Tokens (JWTs) issued by a Cognito user pool.\nThis is the simplest way to protect routes when your users sign in via `user-auth-pool`.\n\nStacktape turns this into an API Gateway v2 authorizer of type `JWT` that checks the token's issuer and audience."),
                  "properties": z.object({
                    "userPoolName": z.string().describe("#### Name of the user pool to protect the API\n\n---\n\nThe Stacktape name of the `user-auth-pool` resource whose tokens should be accepted by this HTTP API authorizer.\nStacktape uses this to:\n\n- Set the expected **audience** to the user pool client ID.\n- Build the expected **issuer** URL based on the user pool and AWS region.\n\nIn practice this means only JWTs issued by this pool (and its client) will be considered valid."),
                    "identitySources": z.array(z.string()).optional().describe("#### Where to read the JWT from in the request\n\n---\n\nA list of identity sources that tell API Gateway where to look for the bearer token, using the\n`$request.*` syntax from API Gateway (for example `'$request.header.Authorization'`).\n\nIf you omit this, Stacktape defaults to reading the token from the `Authorization` HTTP header,\nusing a JWT authorizer as described in the API Gateway v2 authorizer docs\n([AWS::ApiGatewayV2::Authorizer](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer)).").optional() }).strict()
                }).strict()
                , z.object({
                  "type": z.literal("lambda").describe("#### Lambda-based HTTP API authorizer\n\n---\n\nConfigures an API Gateway **request** authorizer that runs a Lambda function to decide whether a request is allowed.\nThis is useful when your authorization logic can't be expressed as simple JWT validation – for example when you\ncheck API keys, look up permissions in a database, or integrate with a non-JWT identity system.\n\nStacktape creates an `AWS::ApiGatewayV2::Authorizer` of type `REQUEST` and wires it up to your Lambda."),
                  "properties": z.object({
                    "functionName": z.string().describe("#### Name of the authorizer function\n\n---\n\nThe Stacktape name of a `function` resource that should run for each authorized request.\nAPI Gateway calls this Lambda, passes request details, and uses its response to allow or deny access."),
                    "iamResponse": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use IAM-style (v1) authorizer responses\n\n---\n\n- If `true`, your Lambda must return a full IAM policy document (the \"v1\" format).\n- If `false` or omitted, Stacktape enables **simple responses** (the HTTP API v2 payload format)\n  so your Lambda can return a small JSON object with an `isAuthorized` flag and optional context.\n\nThis flag is wired to `EnableSimpleResponses` on the underlying `AWS::ApiGatewayV2::Authorizer`.").optional(),
                    "identitySources": z.array(z.string()).optional().describe("#### Where to read identity data from\n\n---\n\nA list of request fields API Gateway should pass into your Lambda authorizer (for example headers, query parameters,\nor stage variables) using the `$request.*` syntax.\n\nWhen left empty, no specific identity sources are configured and your Lambda must inspect the incoming event directly.").optional(),
                    "cacheResultSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Cache authorizer results\n\n---\n\nNumber of seconds API Gateway should cache the result of the Lambda authorizer for a given identity.\nWhile cached, repeated requests skip calling your authorizer function and reuse the previous result.\n\nThis value is applied to `AuthorizerResultTtlInSeconds`. If omitted, Stacktape sets it to `0` (no caching).").optional() }).strict()
                }).strict()
              ]).optional().describe("#### An authorizer to protect this route.\n\n---\n\nUnauthorized requests will be rejected with a `401 Unauthorized` response.").optional(),
              "payloadFormat": z.enum(["1.0","2.0"]).optional().describe("#### The payload format version for the Lambda integration.\n\n---\n\nFor details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).") }).strict()
          }).strict()
          .describe("#### Triggers a function when an HTTP API Gateway receives a matching request.\n\n---\n\nRoutes are matched by specificity — exact paths take priority over wildcard paths."), z.object({
            "type": z.literal("event-bus"),
            "properties": z.object({
              "eventBusArn": z.string().optional().describe("#### The ARN of an existing event bus.\n\n---\n\nUse this to subscribe to an event bus that is not managed by your stack.\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
              "eventBusName": z.string().optional().describe("#### The name of an event bus defined in your stack's resources.\n\n---\n\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
              "useDefaultBus": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Uses the default AWS event bus.\n\n---\n\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
              "eventPattern": z.object({
                "version": z.any().optional().describe("#### Filter by event version.").optional(), "detail-type": z.any().optional().describe("#### Filter by event detail-type (e.g., `[\"OrderPlaced\"]`). This is the primary field for routing custom events.").optional(),
                "source": z.any().optional().describe("#### Filter by event source (e.g., `[\"my-app\"]` or `[\"aws.ec2\"]` for AWS service events).").optional(),
                "account": z.any().optional().describe("#### Filter by AWS account ID.").optional(),
                "region": z.any().optional().describe("#### Filter by AWS region.").optional(),
                "resources": z.any().optional().describe("#### Filter by resource ARNs.").optional(),
                "detail": z.any().optional().describe("#### Filter by event payload content. Supports nested matching, prefix/suffix, numeric comparisons.").optional(), "replay-name": z.any().optional().describe("#### Filter by replay name (only present on replayed events).").optional() }).strict()
              .describe("#### A pattern to filter events from the event bus.\n\n---\n\nOnly events that match this pattern will trigger the target.\nFor details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)."),
              "onDeliveryFailure": z.object({
                "sqsQueueArn": z.string().optional().describe("#### The ARN of the SQS queue for failed events.").optional(),
                "sqsQueueName": z.string().optional().describe("#### The name of an SQS queue (defined in your Stacktape configuration) for failed events.").optional() }).strict()
              .optional().describe("#### A destination for events that fail to be delivered to the target.\n\n---\n\nIn rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.").optional(),
              "input": z.any().optional().describe("#### A fixed JSON object to be passed as the event payload.\n\n---\n\nIf you need to customize the payload based on the event, use `inputTransformer` instead.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninput:\n  source: 'my-custom-event'\n```").optional(),
              "inputPath": z.string().optional().describe("#### A JSONPath expression to extract a portion of the event to pass to the target.\n\n---\n\nThis is useful for forwarding only a specific part of the event payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputPath: '$.detail'\n```").optional(),
              "inputTransformer": z.object({
                "inputPathsMap": z.any().optional().describe("#### A map of key-value pairs to extract from the event payload.\n\n---\n\nEach value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.").optional(),
                "inputTemplate": z.any().describe("#### A template for constructing a new event payload.\n\n---\n\nUse placeholders (`<placeholder>`) to insert the values extracted with `inputPathsMap`.") }).strict()
              .optional().describe("#### Customizes the event payload sent to the target.\n\n---\n\nThis allows you to extract values from the original event and use them to construct a new payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputTransformer:\n  inputPathsMap:\n    instanceId: '$.detail.instance-id'\n    instanceState: '$.detail.state'\n  inputTemplate:\n    message: 'Instance <instanceId> is now in state <instanceState>.'\n```").optional() }).strict()
          }).strict()
          .describe("#### Triggers a batch job when an event matching a specified pattern is received by an event bus.\n\n---\n\nYou can use a custom event bus or the default AWS event bus.")])).optional().describe("#### Events that trigger this job (schedules, HTTP requests, S3 uploads, SQS messages, etc.).").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Run containerized tasks to completion — data processing, ML training, video encoding, etc.\n\n---\n\nPay only for the compute time used. Supports CPU and GPU workloads, retries on failure,\nand can be triggered by schedules, HTTP requests, S3 uploads, or queue messages."), z.object({
      "type": z.literal("web-service"),
      "properties": z.object({
        "cors": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CORS. With no other options, uses permissive defaults (`*` origins, common headers).").default(false),
          "allowedOrigins": z.array(z.string()).optional().describe("#### Allowed origins (e.g., `https://myapp.com`). Use `*` for any origin.").default(["*"]),
          "allowedHeaders": z.array(z.string()).optional().describe("#### Allowed request headers in CORS preflight.").optional(),
          "allowedMethods": z.array(z.enum(["*","DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### Allowed HTTP methods. Auto-detected from integrations if not set.").optional(),
          "allowCredentials": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow cookies/auth headers in cross-origin requests.").optional(),
          "exposedResponseHeaders": z.array(z.string()).optional().describe("#### Response headers accessible to browser JavaScript.").optional(),
          "maxAge": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long (seconds) browsers can cache preflight responses.").optional() }).strict()
        .optional().describe("#### CORS settings. Overrides any CORS headers from your application.\n\n---\n\nOnly works with `http-api-gateway` load balancing (the default).").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
        "loadBalancing": z.union([z.object({
            "type": z.literal("http-api-gateway") }).strict()
          , z.object({
            "type": z.literal("application-load-balancer"),
            "properties": z.object({
              "healthcheckPath": z.string().optional().describe("#### Path the load balancer pings to check container health."),
              "healthcheckInterval": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks.").default(5),
              "healthcheckTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a health check is considered failed.").default(4) }).strict()
            .optional().describe("").optional() }).strict()
          , z.object({
            "type": z.literal("network-load-balancer"),
            "properties": z.object({
              "healthcheckPath": z.string().optional().describe("#### Health check path (only used when `healthCheckProtocol` is `HTTP`).").default("/"),
              "healthcheckInterval": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(5),
              "healthcheckTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a health check is considered failed (2-120).").default(4),
              "healthCheckProtocol": z.enum(["HTTP","TCP"]).optional().describe("#### Health check protocol: `TCP` (port check) or `HTTP` (path check).").default("TCP"),
              "healthCheckPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Health check port. Defaults to the traffic port.").optional(),
              "ports": z.array(z.object({
                "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Public port exposed by the load balancer."),
                "protocol": z.enum(["TCP","TLS"]).optional().describe("#### Protocol: `TLS` (encrypted) or `TCP` (raw).").default("TLS"),
                "containerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port on the container that receives the traffic. Defaults to `port`.").optional() }).strict()
              ) }).strict()
          }).strict()
        ]).optional().describe("#### How traffic reaches your containers. Affects pricing, features, and protocol support.\n\n---\n\n- **`http-api-gateway`** (default): Pay-per-request (~$1/million requests). Best for most apps.\n  Cheapest at low traffic, but costs grow with volume.\n\n- **`application-load-balancer`**: Flat ~$18/month + usage. Required for gradual deployments\n  (`deployment`), firewalls (`useFirewall`), and WebSocket support.\n  More cost-effective above ~500k requests/day. AWS Free Tier eligible.\n\n- **`network-load-balancer`**: For non-HTTP traffic (TCP/TLS) like MQTT, game servers, or custom protocols.\n  Requires explicit `ports` configuration. Does not support CDN, firewall, or gradual deployments.").optional(),
        "cdn": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.\n\n---\n\nCaches responses at edge locations worldwide so users get content from the nearest server.\nThe CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.").default(false),
          "cachingOptions": z.object({
            "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
            "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
            "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
            "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
            "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
            "cacheKeyParameters": z.object({
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
            .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
            "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
          .optional().describe("#### Control how long and what gets cached at the CDN edge.\n\n---\n\nWhen the origin response has no `Cache-Control` header, defaults apply:\n- **Bucket origins**: cached for 6 months (or until invalidated on deploy).\n- **API Gateway / Load Balancer origins**: not cached.").optional(),
          "forwardingOptions": z.object({
            "customRequestHeaders": z.array(z.object({
              "headerName": z.string().describe("#### Name of the header"),
              "value": z.string().describe("#### Value of the header") }).strict()
            ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
            "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
            "cookies": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
            "headers": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
              "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
              "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
              "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
            .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
            "queryString": z.object({
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
            "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
          .optional().describe("#### Control which headers, cookies, and query params are forwarded to your origin.\n\n---\n\nBy default, all headers/cookies/query params are forwarded. Use this to restrict\nwhat reaches your app (e.g., strip cookies for static content).").optional(),
          "routeRewrites": z.array(z.object({
            "path": z.string().describe("#### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported."),
            "routePrefix": z.string().optional().describe("#### Prepend a path prefix to requests before forwarding to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.").optional(),
            "routeTo": z.union([z.object({
                "type": z.literal("application-load-balancer"),
                "properties": z.object({
                  "loadBalancerName": z.string().describe("#### Name of the `application-load-balancer` resource to route to."),
                  "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Listener port on the load balancer. Only needed if using custom listeners.").optional(),
                  "originDomainName": z.string().optional().describe("#### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("http-api-gateway"),
                "properties": z.object({
                  "httpApiGatewayName": z.string().describe("#### Name of the `http-api-gateway` resource to route to.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("function"),
                "properties": z.object({
                  "functionName": z.string().describe("#### Name of the `function` resource to route to. The function must have `url.enabled: true`.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("custom-origin"),
                "properties": z.object({
                  "domainName": z.string().describe("#### Domain name of the external origin (e.g., `api.example.com`)."),
                  "protocol": z.enum(["HTTP","HTTPS"]).optional().describe("#### Protocol for connecting to the origin."),
                  "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("bucket"),
                "properties": z.object({
                  "bucketName": z.string().describe("#### Name of the `bucket` resource to route to."),
                  "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable clean URL normalization (e.g., `/about` → `/about.html`).").default(false) }).strict()
              }).strict()
            ]).optional().describe("#### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.\n\n---\n\nIf not set, requests go to the default origin (the resource this CDN is attached to).").optional(),
            "cachingOptions": z.object({
              "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
              "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
              "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
              "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
              "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
              "cacheKeyParameters": z.object({
                "cookies": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                  "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
                "headers": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
                "queryString": z.object({
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
              .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
              "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
            .optional().describe("#### Override caching behavior for requests matching this route.").optional(),
            "forwardingOptions": z.object({
              "customRequestHeaders": z.array(z.object({
                "headerName": z.string().describe("#### Name of the header"),
                "value": z.string().describe("#### Value of the header") }).strict()
              ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
              "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
                "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
                "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
              .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
              "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
            .optional().describe("#### Override which headers, cookies, and query params are forwarded for this route.").optional(),
            "edgeFunctions": z.object({
              "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
              "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
              "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
              "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
            .optional().describe("#### Run edge functions on requests/responses matching this route.").optional() }).strict()
          ).optional().describe("#### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).\n\n---\n\nEvaluated in order; first match wins. Unmatched requests go to the default origin.\nEach route can have its own caching and forwarding settings.").optional(),
          "customDomains": z.array(z.object({
            "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
            "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
            "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
          ).optional().describe("#### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
          "edgeFunctions": z.object({
            "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
            "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
            "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
            "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
          .optional().describe("#### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).\n\n---\n\n- `onRequest`: Before cache lookup — modify the request, add auth, or return early.\n- `onResponse`: Before returning to the client — modify headers, add cookies.").optional(),
          "cloudfrontPriceClass": z.enum(["PriceClass_100","PriceClass_200","PriceClass_All"]).optional().describe("#### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.\n\n---\n\n- **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.\n- **`PriceClass_200`**: Adds Asia, Middle East, Africa.\n- **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.\n\nThe CDN itself has no monthly base cost - you only pay per request and per GB transferred.\nThe price class controls which edge locations are used, and some regions cost more per request."),
          "defaultRoutePrefix": z.string().optional().describe("#### Prepend a path prefix to all requests forwarded to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.").optional(),
          "errorDocument": z.string().optional().describe("#### Page to show for 404 errors (e.g., `/error.html`).").default("/404.html"),
          "indexDocument": z.string().optional().describe("#### Page served for requests to `/`.").default("/index.html"),
          "disableInvalidationAfterDeploy": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip clearing the CDN cache after each deploy.\n\n---\n\nBy default, all cached content is flushed on every deploy so users see the latest version.\nSet to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.").default(false),
          "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.").optional() }).strict()
        .optional().describe("#### Put a CDN (CloudFront) in front of this service for caching and lower latency worldwide.").optional(),
        "alarms": z.array(z.union([z.object({
            "trigger": z.union([z.object({
                "type": z.literal("application-load-balancer-custom"),
                "properties": z.object({
                  "metric": z.enum(["ActiveConnectionCount","AnomalousHostCount","ClientTLSNegotiationErrorCount","ConsumedLCUs","DesyncMitigationMode_NonCompliant_Request_Count","DroppedInvalidHeaderRequestCount","ELBAuthError","ELBAuthFailure","ELBAuthLatency","ELBAuthRefreshTokenSuccess","ELBAuthSuccess","ELBAuthUserClaimsSizeExceeded","ForwardedInvalidHeaderRequestCount","GrpcRequestCount","HTTPCode_ELB_3XX_Count","HTTPCode_ELB_4XX_Count","HTTPCode_ELB_500_Count","HTTPCode_ELB_502_Count","HTTPCode_ELB_503_Count","HTTPCode_ELB_504_Count","HTTPCode_ELB_5XX_Count","HTTPCode_Target_2XX_Count","HTTPCode_Target_3XX_Count","HTTPCode_Target_4XX_Count","HTTPCode_Target_5XX_Count","HTTP_Fixed_Response_Count","HTTP_Redirect_Count","HTTP_Redirect_Url_Limit_Exceeded_Count","HealthyHostCount","HealthyStateDNS","HealthyStateRouting","IPv6ProcessedBytes","IPv6RequestCount","LambdaInternalError","LambdaTargetProcessedBytes","LambdaUserError","MitigatedHostCount","NewConnectionCount","NonStickyRequestCount","ProcessedBytes","RejectedConnectionCount","RequestCount","RequestCountPerTarget","RuleEvaluations","TargetConnectionErrorCount","TargetResponseTime","TargetTLSNegotiationErrorCount","UnHealthyHostCount","UnhealthyRoutingRequestCount","UnhealthyStateDNS","UnhealthyStateRouting"]).describe("#### The metric to monitor on the Load Balancer.\n\n---\n\nThe threshold will be compared against the calculated value of `statistic(METRIC)`, where:\n- `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).\n- `METRIC` is the chosen metric.\n\n**Available Metrics:**\n\n- `ActiveConnectionCount`: The total number of concurrent TCP connections active from clients to the load balancer and from the load balancer to targets.\n- `AnomalousHostCount`: The number of hosts detected with anomalies.\n- `ClientTLSNegotiationErrorCount`: The number of TLS connections initiated by the client that did not establish a session with the load balancer due to a TLS error.\n- `ConsumedLCUs`: The number of load balancer capacity units (LCU) used by your load balancer.\n- `DesyncMitigationMode_NonCompliant_Request_Count`: The number of requests that do not comply with RFC 7230.\n- `DroppedInvalidHeaderRequestCount`: The number of requests where the load balancer removed HTTP headers with invalid fields before routing the request.\n- `MitigatedHostCount`: The number of targets under mitigation.\n- `ForwardedInvalidHeaderRequestCount`: The number of requests routed by the load balancer that had HTTP headers with invalid fields.\n- `GrpcRequestCount`: The number of gRPC requests processed over IPv4 and IPv6.\n- `HTTP_Fixed_Response_Count`: The number of successful fixed-response actions.\n- `HTTP_Redirect_Count`: The number of successful redirect actions.\n- `HTTP_Redirect_Url_Limit_Exceeded_Count`: The number of redirect actions that failed because the URL in the response location header exceeded 8K.\n- `HTTPCode_ELB_3XX_Count`: The number of HTTP 3XX redirection codes originating from the load balancer.\n- `HTTPCode_ELB_4XX_Count`: The number of HTTP 4XX client error codes originating from the load balancer.\n- `HTTPCode_ELB_5XX_Count`: The number of HTTP 5XX server error codes originating from the load balancer.\n- `HTTPCode_ELB_500_Count`: The number of HTTP 500 error codes originating from the load balancer.\n- `HTTPCode_ELB_502_Count`: The number of HTTP 502 error codes originating from the load balancer.\n- `HTTPCode_ELB_503_Count`: The number of HTTP 503 error codes originating from the load balancer.\n- `HTTPCode_ELB_504_Count`: The number of HTTP 504 error codes originating from the load balancer.\n- `IPv6ProcessedBytes`: The total number of bytes processed by the load balancer over IPv6.\n- `IPv6RequestCount`: The number of IPv6 requests received by the load balancer.\n- `NewConnectionCount`: The total number of new TCP connections established from clients to the load balancer and from the load balancer to targets.\n- `NonStickyRequestCount`: The number of requests where the load balancer chose a new target because it could not use an existing sticky session.\n- `ProcessedBytes`: The total number of bytes processed by the load balancer over IPv4 and IPv6.\n- `RejectedConnectionCount`: The number of connections rejected because the load balancer reached its maximum number of connections.\n- `RequestCount`: The number of requests processed over IPv4 and IPv6.\n- `RuleEvaluations`: The number of rules processed by the load balancer, averaged over an hour.\n- `HealthyHostCount`: The number of targets that are considered healthy.\n- `HTTPCode_Target_2XX_Count`: The number of HTTP 2XX response codes generated by the targets.\n- `HTTPCode_Target_3XX_Count`: The number of HTTP 3XX response codes generated by the targets.\n- `HTTPCode_Target_4XX_Count`: The number of HTTP 4XX response codes generated by the targets.\n- `HTTPCode_Target_5XX_Count`: The number of HTTP 5XX response codes generated by the targets.\n- `RequestCountPerTarget`: The average number of requests per target in a target group.\n- `TargetConnectionErrorCount`: The number of connections that were not successfully established between the load balancer and a target.\n- `TargetResponseTime`: The time elapsed (in seconds) from when a request leaves the load balancer until the target starts sending response headers.\n- `TargetTLSNegotiationErrorCount`: The number of TLS connections initiated by the load balancer that did not establish a session with the target.\n- `UnHealthyHostCount`: The number of targets that are considered unhealthy.\n- `HealthyStateDNS`: The number of zones that meet the DNS healthy state requirements.\n- `HealthyStateRouting`: The number of zones that meet the routing healthy state requirements.\n- `UnhealthyRoutingRequestCount`: The number of requests routed using the routing failover action (fail open).\n- `UnhealthyStateDNS`: The number of zones that do not meet the DNS healthy state requirements.\n- `UnhealthyStateRouting`: The number of zones that do not meet the routing healthy state requirements.\n- `LambdaInternalError`: The number of requests to a Lambda function that failed due to an issue internal to the load balancer or AWS Lambda.\n- `LambdaTargetProcessedBytes`: The total number of bytes processed by the load balancer for requests to and responses from a Lambda function.\n- `LambdaUserError`: The number of requests to a Lambda function that failed due to an issue with the Lambda function itself.\n- `ELBAuthError`: The number of user authentications that could not be completed due to an internal error.\n- `ELBAuthFailure`: The number of user authentications that could not be completed because the IdP denied access.\n- `ELBAuthLatency`: The time elapsed (in milliseconds) to query the IdP for the ID token and user info.\n- `ELBAuthRefreshTokenSuccess`: The number of times the load balancer successfully refreshed user claims using a refresh token.\n- `ELBAuthSuccess`: The number of successful authentication actions.\n- `ELBAuthUserClaimsSizeExceeded`: The number of times a configured IdP returned user claims that exceeded 11K bytes in size."),
                  "threshold": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The threshold that triggers the alarm.\n\n---\n\nThe threshold is compared against the calculated value of `statistic(METRIC)`, where:\n- `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).\n- `METRIC` is the chosen metric."),
                  "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg"),
                  "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("application-load-balancer-error-rate"),
                "properties": z.object({
                  "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when 4xx/5xx error rate exceeds this percentage.\n\n---\n\nExample: `5` fires the alarm if more than 5% of requests return errors."),
                  "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("application-load-balancer-unhealthy-targets"),
                "properties": z.object({
                  "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when the percentage of unhealthy targets exceeds this value.\n\n---\n\nIf the load balancer has multiple target groups, the alarm fires if *any* group breaches the threshold."),
                  "onlyIncludeTargets": z.array(z.string()).optional().describe("#### Only monitor health of these target container services. If omitted, monitors all targets.\n\n---\n\nOnly services actually targeted by the load balancer can be listed.").optional(),
                  "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.") }).strict()
              }).strict()
            ]),
            "evaluation": z.object({
              "period": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Duration of one evaluation period in seconds. Must be a multiple of 60.").default(60),
              "evaluationPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many recent periods to evaluate. Prevents alarms from firing on short spikes.\n\n---\n\nExample: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached\nin at least 3 of the last 5 periods.").default(1),
              "breachedPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.\n\n---\n\nMust be ≤ `evaluationPeriods`.").default(1) }).strict()
            .optional().describe("#### How long and how often to evaluate the metric before triggering.\n\n---\n\nControls the evaluation window (period), how many periods to look at, and how many must breach\nthe threshold to fire the alarm. Useful for filtering out short spikes.").optional(),
            "notificationTargets": z.array(z.union([z.object({
                "type": z.literal("ms-teams"),
                "properties": z.object({
                  "webhookUrl": z.string().describe("#### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.\n\n---\n\nCreate an Incoming Webhook connector in your Teams channel settings to get this URL.") }).strict()
                .optional().describe("").optional() }).strict()
              , z.object({
                "type": z.literal("slack"),
                "properties": z.object({
                  "conversationId": z.string().describe("#### The Slack channel or DM ID to send notifications to.\n\n---\n\nTo find the ID: open the channel, click its name, and look at the bottom of the **About** tab."),
                  "accessToken": z.string().describe("#### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.\n\n---\n\nCreate a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.") }).strict()
                .optional().describe("").optional() }).strict()
              , z.object({
                "type": z.literal("email"),
                "properties": z.object({
                  "sender": z.string().describe("#### The email address of the sender."),
                  "recipient": z.string().describe("#### The email address of the recipient.") }).strict()
              }).strict()
            ])).optional().describe("#### Where to send notifications when the alarm fires — Slack, MS Teams, or email.").optional(),
            "description": z.string().optional().describe("#### Custom alarm description used in notification messages and the AWS console.").optional() }).strict()
          , z.object({
            "trigger": z.union([z.object({
                "type": z.literal("http-api-gateway-error-rate"),
                "properties": z.object({
                  "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when 4xx/5xx error rate exceeds this percentage."),
                  "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("http-api-gateway-latency"),
                "properties": z.object({
                  "thresholdMilliseconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when request-to-response latency exceeds this value (ms).\n\n---\n\nDefault: fires if **average** latency > threshold. Customize with `statistic` and `comparisonOperator`."),
                  "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                  "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
              }).strict()
            ]),
            "evaluation": z.object({
              "period": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Duration of one evaluation period in seconds. Must be a multiple of 60.").default(60),
              "evaluationPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many recent periods to evaluate. Prevents alarms from firing on short spikes.\n\n---\n\nExample: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached\nin at least 3 of the last 5 periods.").default(1),
              "breachedPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.\n\n---\n\nMust be ≤ `evaluationPeriods`.").default(1) }).strict()
            .optional().describe("#### How long and how often to evaluate the metric before triggering.\n\n---\n\nControls the evaluation window (period), how many periods to look at, and how many must breach\nthe threshold to fire the alarm. Useful for filtering out short spikes.").optional(),
            "notificationTargets": z.array(z.union([z.object({
                "type": z.literal("ms-teams"),
                "properties": z.object({
                  "webhookUrl": z.string().describe("#### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.\n\n---\n\nCreate an Incoming Webhook connector in your Teams channel settings to get this URL.") }).strict()
                .optional().describe("").optional() }).strict()
              , z.object({
                "type": z.literal("slack"),
                "properties": z.object({
                  "conversationId": z.string().describe("#### The Slack channel or DM ID to send notifications to.\n\n---\n\nTo find the ID: open the channel, click its name, and look at the bottom of the **About** tab."),
                  "accessToken": z.string().describe("#### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.\n\n---\n\nCreate a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.") }).strict()
                .optional().describe("").optional() }).strict()
              , z.object({
                "type": z.literal("email"),
                "properties": z.object({
                  "sender": z.string().describe("#### The email address of the sender."),
                  "recipient": z.string().describe("#### The email address of the recipient.") }).strict()
              }).strict()
            ])).optional().describe("#### Where to send notifications when the alarm fires — Slack, MS Teams, or email.").optional(),
            "description": z.string().optional().describe("#### Custom alarm description used in notification messages and the AWS console.").optional() }).strict()
        ])).optional().describe("#### Alarms for this service (merged with global alarms from the Stacktape Console).").optional(),
        "disabledGlobalAlarms": z.array(z.string()).optional().describe("#### Global alarm names to exclude from this service.").optional(),
        "deployment": z.object({
          "strategy": z.enum(["AllAtOnce","Canary10Percent15Minutes","Canary10Percent5Minutes","Linear10PercentEvery1Minutes","Linear10PercentEvery3Minutes"]).describe("#### How traffic shifts to the new version during deployment.\n\n---\n\n- `Canary10Percent5Minutes`: 10% first, then all after 5 min.\n- `Canary10Percent15Minutes`: 10% first, then all after 15 min.\n- `Linear10PercentEvery1Minutes`: 10% more every minute.\n- `Linear10PercentEvery3Minutes`: 10% more every 3 minutes.\n- `AllAtOnce`: Instant switch."),
          "beforeAllowTrafficFunction": z.string().optional().describe("#### Lambda function to run before traffic shifts to the new version (for validation/smoke tests).").optional(),
          "afterTrafficShiftFunction": z.string().optional().describe("#### Lambda function to run after all traffic has shifted (for post-deployment checks).").optional(),
          "testListenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### ALB listener port for test traffic. Only needed with `beforeAllowTrafficFunction` and custom listeners.").optional() }).strict()
        .optional().describe("#### Gradual traffic shifting for safe deployments (canary, linear, or all-at-once).\n\n---\n\nRequires `loadBalancing` type `application-load-balancer`.").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this service from common web exploits.").optional(),
        "packaging": z.union([z.object({
            "type": z.literal("stacktape-image-buildpack"),
            "properties": z.object({
              "languageSpecificConfig": z.union([z.object({
                  "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                  "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                  "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                  "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                  "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                  "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                  "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                  "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                , z.object({
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                  "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                  "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                  "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                  "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                , z.object({
                  "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                  "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                , z.object({
                  "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                , z.object({
                  "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                  "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                , z.record(z.string(), z.never()), z.object({
                  "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
              ]).optional().describe("#### Language-specific packaging configuration.").optional(),
              "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
              "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
              "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
              "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
              "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
              "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
            .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
          .describe("#### A zero-config buildpack that creates a container image from your source code.\n\n---\n\nThe `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, and Go.\n\nFor JS/TS, your code is bundled into a single file with source maps.\nThe resulting image is uploaded to a managed ECR repository."), z.object({
            "type": z.literal("external-buildpack"),
            "properties": z.object({
              "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
              "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
              "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
          }).strict()
          .describe("#### Builds a container image using an external buildpack.\n\n---\n\nExternal buildpacks (buildpacks.io) automatically detect your application type\nand build an optimized container image with zero configuration.\n\nThe default builder is `paketobuildpacks/builder-jammy-base`.\nYou can find buildpacks for almost any language or framework."), z.object({
            "type": z.literal("prebuilt-image"),
            "properties": z.object({
              "repositoryCredentialsSecretArn": z.string().optional().describe("#### The ARN of a secret containing credentials for a private container registry.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.").optional(),
              "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
              "image": z.string().describe("#### The name or URL of the container image."),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
            .describe("#### Configures a pre-built container image.") }).strict()
          .describe("#### Uses a pre-built container image.\n\n---\n\nWith `prebuilt-image`, you provide a reference to an existing container image.\nThis can be a public image from Docker Hub or a private image from any container registry.\n\nFor private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager."), z.object({
            "type": z.literal("custom-dockerfile"),
            "properties": z.object({
              "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
              "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
              "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
              "buildArgs": z.array(z.object({
                "argName": z.string().describe("#### Argument name"),
                "value": z.string().describe("#### Argument value") }).strict()
              ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
            .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
          .describe("#### Builds a container image from your own Dockerfile.\n\n---\n\nWith `custom-dockerfile`, you provide a path to your Dockerfile and build context.\nStacktape builds the image and uploads it to a managed ECR repository.\n\nThis gives you full control over the container environment and is ideal for complex setups."), z.object({
            "type": z.literal("nixpacks"),
            "properties": z.object({
              "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
              "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
              "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
              "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
              "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
              "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
              "phases": z.array(z.object({
                "name": z.string().describe("#### The name of the build phase."),
                "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
              ).optional().describe("#### The build phases for the application.").optional() }).strict()
          }).strict()
          .describe("#### Builds a container image using Nixpacks.\n\n---\n\nNixpacks automatically detects your application type and builds an optimized container image.\nIn most cases, no configuration is required.\n\nIt supports a wide range of languages and frameworks out of the box.")]).describe("#### Configures the container image for the service."),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables injected into the container at runtime.\n\n---\n\nUse for configuration like API keys, feature flags, or secrets.\nVariables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.").optional(),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Logging configuration.\n\n---\n\nContainer output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.\nView logs with `stacktape logs` or in the Stacktape Console.").optional(),
        "resources": z.object({
          "cpu": z.union([z.literal(0.25), z.literal(0.5), z.literal(1), z.literal(16), z.literal(2), z.literal(4), z.literal(8)]).optional().describe("#### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.").optional(),
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB. Must be compatible with the vCPU count on Fargate.\n\n---\n\nFargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,\n4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.\nFor EC2: auto-detected from instance type if omitted.").optional(),
          "instanceTypes": z.array(z.string()).optional().describe("#### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.\n\n---\n\nFirst type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.\nTip: specify a single type and omit `cpu`/`memory` for optimal sizing.").optional(),
          "enableWarmPool": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.").optional(),
          "architecture": z.enum(["arm64","x86_64"]).optional().describe("#### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.") }).strict()
        .describe("#### CPU, memory, and compute engine for the container.\n\n---\n\nTwo compute engines:\n- **Fargate** (default): Serverless — just specify `cpu` and `memory`.\n- **EC2**: Specify `instanceTypes` for more control and potentially lower cost."),
        "scaling": z.object({
          "minInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum running instances. Set to 0 is not supported — minimum is 1.").default(1),
          "maxInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum running instances. Traffic is distributed across all instances.").default(1),
          "scalingPolicy": z.object({
            "keepAvgCpuUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg CPU exceeds this %, scale in when it drops below.").default(80),
            "keepAvgMemoryUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg memory exceeds this %, scale in when it drops below.").default(80) }).strict()
          .optional().describe("#### When to scale: CPU and/or memory utilization targets.").optional() }).strict()
        .optional().describe("#### Auto-scaling: add/remove container instances based on demand.\n\n---\n\nTraffic is automatically distributed across all running containers.").optional(),
        "internalHealthCheck": z.object({
          "healthCheckCommand": z.array(z.string()).describe("#### Command to check health. E.g., `[\"CMD-SHELL\", \"curl -f http://localhost/ || exit 1\"]`. Exit 0 = healthy."),
          "intervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(30),
          "timeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a check is considered failed (2-60).").default(5),
          "retries": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Consecutive failures before marking unhealthy (1-10).").default(3),
          "startPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Grace period (seconds) before counting failures. Gives the container time to start (0-300).").optional() }).strict()
        .optional().describe("#### Health check that auto-replaces unhealthy containers.\n\n---\n\nIf a container fails the health check, it's terminated and replaced automatically.").optional(),
        "stopTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait for graceful shutdown before force-killing the container.\n\n---\n\nThe container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.").default(2),
        "enableRemoteSessions": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow SSH-like access to running containers for debugging.\n\n---\n\nEnables `stacktape container:session` to open an interactive shell inside the container.\nAdds a small SSM agent that uses minimal CPU/memory.").default(false),
        "volumeMounts": z.array(z.object({
          "type": z.literal("efs").describe("#### The type of the volume mount."),
          "properties": z.object({
            "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
            "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Restricts access to that directory."),
            "mountPath": z.string().describe("#### Absolute path inside the container where the volume is mounted (e.g., `/data`).") }).strict()
          .describe("#### Properties for the EFS volume mount.") }).strict()
        ).optional().describe("#### Persistent EFS volumes shared across containers and restarts.\n\n---\n\nData stored in EFS volumes persists even when containers are replaced.\nMultiple containers can mount the same volume. All data is encrypted in transit.").optional(),
        "sideContainers": z.array(z.object({
          "containerType": z.enum(["always-running","run-on-init"]).describe("#### When and how this sidecar container runs.\n\n---\n\n- **`run-on-init`**: Must exit with code 0 before the main container starts. Use for migrations or setup.\n- **`always-running`**: Runs alongside the main container for its entire lifetime. If it crashes, the whole task fails."),
          "name": z.string().describe("#### Unique container name within this workload."),
          "packaging": z.union([z.object({
              "type": z.literal("stacktape-image-buildpack"),
              "properties": z.object({
                "languageSpecificConfig": z.union([z.object({
                    "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                    "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                    "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                    "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                    "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                    "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                    "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                    "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                  , z.object({
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                    "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                    "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                    "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                    "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                  , z.object({
                    "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                    "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                  , z.object({
                    "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                  , z.object({
                    "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                    "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                  , z.record(z.string(), z.never()), z.object({
                    "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
                ]).optional().describe("#### Language-specific packaging configuration.").optional(),
                "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
                "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
                "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
                "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
                "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
                "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
              .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
            .describe("#### A zero-config buildpack that creates a container image from your source code.\n\n---\n\nThe `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, and Go.\n\nFor JS/TS, your code is bundled into a single file with source maps.\nThe resulting image is uploaded to a managed ECR repository."), z.object({
              "type": z.literal("external-buildpack"),
              "properties": z.object({
                "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
                "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using an external buildpack.\n\n---\n\nExternal buildpacks (buildpacks.io) automatically detect your application type\nand build an optimized container image with zero configuration.\n\nThe default builder is `paketobuildpacks/builder-jammy-base`.\nYou can find buildpacks for almost any language or framework."), z.object({
              "type": z.literal("prebuilt-image"),
              "properties": z.object({
                "repositoryCredentialsSecretArn": z.string().optional().describe("#### The ARN of a secret containing credentials for a private container registry.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.").optional(),
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "image": z.string().describe("#### The name or URL of the container image."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures a pre-built container image.") }).strict()
            .describe("#### Uses a pre-built container image.\n\n---\n\nWith `prebuilt-image`, you provide a reference to an existing container image.\nThis can be a public image from Docker Hub or a private image from any container registry.\n\nFor private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager."), z.object({
              "type": z.literal("custom-dockerfile"),
              "properties": z.object({
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
                "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
                "buildArgs": z.array(z.object({
                  "argName": z.string().describe("#### Argument name"),
                  "value": z.string().describe("#### Argument value") }).strict()
                ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
            .describe("#### Builds a container image from your own Dockerfile.\n\n---\n\nWith `custom-dockerfile`, you provide a path to your Dockerfile and build context.\nStacktape builds the image and uploads it to a managed ECR repository.\n\nThis gives you full control over the container environment and is ideal for complex setups."), z.object({
              "type": z.literal("nixpacks"),
              "properties": z.object({
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
                "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
                "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
                "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
                "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
                "phases": z.array(z.object({
                  "name": z.string().describe("#### The name of the build phase."),
                  "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                  "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                  "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                  "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                  "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                  "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                  "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                  "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
                ).optional().describe("#### The build phases for the application.").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using Nixpacks.\n\n---\n\nNixpacks automatically detects your application type and builds an optimized container image.\nIn most cases, no configuration is required.\n\nIt supports a wide range of languages and frameworks out of the box.")]).describe("#### How to build or specify the container image."),
          "essential": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### If `true` (default), the entire workload restarts when this container fails.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.").optional(),
          "dependsOn": z.array(z.object({
            "containerName": z.string().describe("The name of the container that this container depends on."),
            "condition": z.enum(["COMPLETE","HEALTHY","START","SUCCESS"]).describe("#### The condition that the dependency container must meet.\n---\nAvailable conditions:\n- `START`: The dependency has started.\n- `COMPLETE`: The dependency has finished executing (regardless of success).\n- `SUCCESS`: The dependency has finished with an exit code of `0`.\n- `HEALTHY`: The dependency has passed its first health check.") }).strict()
          ).optional().describe("#### Start this container only after the listed containers reach a specific state.\n\n---\n\nE.g., wait for a database sidecar to be `HEALTHY` before starting the app container.").optional(),
          "environment": z.array(z.object({
            "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
            "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
          ).optional().describe("#### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
          "internalHealthCheck": z.object({
            "healthCheckCommand": z.array(z.string()).describe("#### Command to check health. E.g., `[\"CMD-SHELL\", \"curl -f http://localhost/ || exit 1\"]`. Exit 0 = healthy."),
            "intervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(30),
            "timeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a check is considered failed (2-60).").default(5),
            "retries": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Consecutive failures before marking unhealthy (1-10).").default(3),
            "startPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Grace period (seconds) before counting failures. Gives the container time to start (0-300).").optional() }).strict()
          .optional().describe("#### Command-based health check. If it fails on an essential container, the workload instance is replaced.").optional(),
          "stopTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait after SIGTERM before SIGKILL (2-120).").default(2),
          "volumeMounts": z.array(z.object({
            "type": z.literal("efs").describe("#### The type of the volume mount."),
            "properties": z.object({
              "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
              "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Restricts access to that directory."),
              "mountPath": z.string().describe("#### Absolute path inside the container where the volume is mounted (e.g., `/data`).") }).strict()
            .describe("#### Properties for the EFS volume mount.") }).strict()
          ).optional().describe("#### Mount EFS volumes for persistent, shared storage across containers.").optional() }).strict()
        ).optional().describe("#### Helper containers that run alongside the main container.\n\n---\n\n- **`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).\n- **`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).\n  Can reach the main container via `localhost`.").optional(),
        "usePrivateSubnetsWithNAT": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Deploy in private subnets with a static outbound IP via NAT Gateway.\n\n---\n\nThe container won't have a public IP. All outbound traffic routes through a NAT Gateway,\ngiving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).\n\nConfigure the number of NAT Gateways in `stackConfig.vpc.nat`.\n\n**Adds cost:** NAT Gateway ~$32/month + data processing fees.").default(false),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### A container running 24/7 with a public HTTPS URL.\n\n---\n\nUse for APIs, web apps, and any service that needs to be always-on and reachable from the internet.\nIncludes TLS/SSL, auto-scaling, health checks, and zero-downtime deployments."), z.object({
      "type": z.literal("private-service"),
      "properties": z.object({
        "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port this service listens on. Injected as the `PORT` env var.").default(3000),
        "protocol": z.enum(["grpc","http","http2"]).optional().describe("#### Protocol for metrics collection. Set to enable protocol-specific metrics (e.g., HTTP 5xx tracking).").optional(),
        "loadBalancing": z.object({
          "type": z.enum(["application-load-balancer","service-connect"]) }).strict()
        .optional().describe("#### How traffic reaches this service from other resources.\n\n---\n\n- **`service-connect`** (default, ~$0.50/mo): Direct container-to-container. Cheapest option.\n  Only reachable from other container-based resources in the stack.\n- **`application-load-balancer`** (~$18/mo): HTTP load balancer. Reachable from any VPC resource."),
        "packaging": z.union([z.object({
            "type": z.literal("stacktape-image-buildpack"),
            "properties": z.object({
              "languageSpecificConfig": z.union([z.object({
                  "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                  "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                  "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                  "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                  "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                  "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                  "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                  "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                , z.object({
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                  "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                  "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                  "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                  "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                , z.object({
                  "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                  "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                , z.object({
                  "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                , z.object({
                  "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                  "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                , z.record(z.string(), z.never()), z.object({
                  "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
              ]).optional().describe("#### Language-specific packaging configuration.").optional(),
              "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
              "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
              "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
              "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
              "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
              "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
            .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
          .describe("#### A zero-config buildpack that creates a container image from your source code.\n\n---\n\nThe `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, and Go.\n\nFor JS/TS, your code is bundled into a single file with source maps.\nThe resulting image is uploaded to a managed ECR repository."), z.object({
            "type": z.literal("external-buildpack"),
            "properties": z.object({
              "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
              "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
              "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
          }).strict()
          .describe("#### Builds a container image using an external buildpack.\n\n---\n\nExternal buildpacks (buildpacks.io) automatically detect your application type\nand build an optimized container image with zero configuration.\n\nThe default builder is `paketobuildpacks/builder-jammy-base`.\nYou can find buildpacks for almost any language or framework."), z.object({
            "type": z.literal("prebuilt-image"),
            "properties": z.object({
              "repositoryCredentialsSecretArn": z.string().optional().describe("#### The ARN of a secret containing credentials for a private container registry.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.").optional(),
              "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
              "image": z.string().describe("#### The name or URL of the container image."),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
            .describe("#### Configures a pre-built container image.") }).strict()
          .describe("#### Uses a pre-built container image.\n\n---\n\nWith `prebuilt-image`, you provide a reference to an existing container image.\nThis can be a public image from Docker Hub or a private image from any container registry.\n\nFor private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager."), z.object({
            "type": z.literal("custom-dockerfile"),
            "properties": z.object({
              "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
              "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
              "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
              "buildArgs": z.array(z.object({
                "argName": z.string().describe("#### Argument name"),
                "value": z.string().describe("#### Argument value") }).strict()
              ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
            .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
          .describe("#### Builds a container image from your own Dockerfile.\n\n---\n\nWith `custom-dockerfile`, you provide a path to your Dockerfile and build context.\nStacktape builds the image and uploads it to a managed ECR repository.\n\nThis gives you full control over the container environment and is ideal for complex setups."), z.object({
            "type": z.literal("nixpacks"),
            "properties": z.object({
              "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
              "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
              "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
              "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
              "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
              "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
              "phases": z.array(z.object({
                "name": z.string().describe("#### The name of the build phase."),
                "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
              ).optional().describe("#### The build phases for the application.").optional() }).strict()
          }).strict()
          .describe("#### Builds a container image using Nixpacks.\n\n---\n\nNixpacks automatically detects your application type and builds an optimized container image.\nIn most cases, no configuration is required.\n\nIt supports a wide range of languages and frameworks out of the box.")]).describe("#### Configures the container image for the service."),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables injected into the container at runtime.\n\n---\n\nUse for configuration like API keys, feature flags, or secrets.\nVariables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.").optional(),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Logging configuration.\n\n---\n\nContainer output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.\nView logs with `stacktape logs` or in the Stacktape Console.").optional(),
        "resources": z.object({
          "cpu": z.union([z.literal(0.25), z.literal(0.5), z.literal(1), z.literal(16), z.literal(2), z.literal(4), z.literal(8)]).optional().describe("#### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.").optional(),
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB. Must be compatible with the vCPU count on Fargate.\n\n---\n\nFargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,\n4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.\nFor EC2: auto-detected from instance type if omitted.").optional(),
          "instanceTypes": z.array(z.string()).optional().describe("#### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.\n\n---\n\nFirst type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.\nTip: specify a single type and omit `cpu`/`memory` for optimal sizing.").optional(),
          "enableWarmPool": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.").optional(),
          "architecture": z.enum(["arm64","x86_64"]).optional().describe("#### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.") }).strict()
        .describe("#### CPU, memory, and compute engine for the container.\n\n---\n\nTwo compute engines:\n- **Fargate** (default): Serverless — just specify `cpu` and `memory`.\n- **EC2**: Specify `instanceTypes` for more control and potentially lower cost."),
        "scaling": z.object({
          "minInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum running instances. Set to 0 is not supported — minimum is 1.").default(1),
          "maxInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum running instances. Traffic is distributed across all instances.").default(1),
          "scalingPolicy": z.object({
            "keepAvgCpuUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg CPU exceeds this %, scale in when it drops below.").default(80),
            "keepAvgMemoryUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg memory exceeds this %, scale in when it drops below.").default(80) }).strict()
          .optional().describe("#### When to scale: CPU and/or memory utilization targets.").optional() }).strict()
        .optional().describe("#### Auto-scaling: add/remove container instances based on demand.\n\n---\n\nTraffic is automatically distributed across all running containers.").optional(),
        "internalHealthCheck": z.object({
          "healthCheckCommand": z.array(z.string()).describe("#### Command to check health. E.g., `[\"CMD-SHELL\", \"curl -f http://localhost/ || exit 1\"]`. Exit 0 = healthy."),
          "intervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(30),
          "timeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a check is considered failed (2-60).").default(5),
          "retries": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Consecutive failures before marking unhealthy (1-10).").default(3),
          "startPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Grace period (seconds) before counting failures. Gives the container time to start (0-300).").optional() }).strict()
        .optional().describe("#### Health check that auto-replaces unhealthy containers.\n\n---\n\nIf a container fails the health check, it's terminated and replaced automatically.").optional(),
        "stopTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait for graceful shutdown before force-killing the container.\n\n---\n\nThe container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.").default(2),
        "enableRemoteSessions": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow SSH-like access to running containers for debugging.\n\n---\n\nEnables `stacktape container:session` to open an interactive shell inside the container.\nAdds a small SSM agent that uses minimal CPU/memory.").default(false),
        "volumeMounts": z.array(z.object({
          "type": z.literal("efs").describe("#### The type of the volume mount."),
          "properties": z.object({
            "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
            "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Restricts access to that directory."),
            "mountPath": z.string().describe("#### Absolute path inside the container where the volume is mounted (e.g., `/data`).") }).strict()
          .describe("#### Properties for the EFS volume mount.") }).strict()
        ).optional().describe("#### Persistent EFS volumes shared across containers and restarts.\n\n---\n\nData stored in EFS volumes persists even when containers are replaced.\nMultiple containers can mount the same volume. All data is encrypted in transit.").optional(),
        "sideContainers": z.array(z.object({
          "containerType": z.enum(["always-running","run-on-init"]).describe("#### When and how this sidecar container runs.\n\n---\n\n- **`run-on-init`**: Must exit with code 0 before the main container starts. Use for migrations or setup.\n- **`always-running`**: Runs alongside the main container for its entire lifetime. If it crashes, the whole task fails."),
          "name": z.string().describe("#### Unique container name within this workload."),
          "packaging": z.union([z.object({
              "type": z.literal("stacktape-image-buildpack"),
              "properties": z.object({
                "languageSpecificConfig": z.union([z.object({
                    "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                    "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                    "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                    "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                    "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                    "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                    "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                    "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                  , z.object({
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                    "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                    "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                    "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                    "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                  , z.object({
                    "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                    "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                  , z.object({
                    "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                  , z.object({
                    "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                    "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                  , z.record(z.string(), z.never()), z.object({
                    "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
                ]).optional().describe("#### Language-specific packaging configuration.").optional(),
                "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
                "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
                "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
                "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
                "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
                "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
              .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
            .describe("#### A zero-config buildpack that creates a container image from your source code.\n\n---\n\nThe `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, and Go.\n\nFor JS/TS, your code is bundled into a single file with source maps.\nThe resulting image is uploaded to a managed ECR repository."), z.object({
              "type": z.literal("external-buildpack"),
              "properties": z.object({
                "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
                "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using an external buildpack.\n\n---\n\nExternal buildpacks (buildpacks.io) automatically detect your application type\nand build an optimized container image with zero configuration.\n\nThe default builder is `paketobuildpacks/builder-jammy-base`.\nYou can find buildpacks for almost any language or framework."), z.object({
              "type": z.literal("prebuilt-image"),
              "properties": z.object({
                "repositoryCredentialsSecretArn": z.string().optional().describe("#### The ARN of a secret containing credentials for a private container registry.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.").optional(),
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "image": z.string().describe("#### The name or URL of the container image."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures a pre-built container image.") }).strict()
            .describe("#### Uses a pre-built container image.\n\n---\n\nWith `prebuilt-image`, you provide a reference to an existing container image.\nThis can be a public image from Docker Hub or a private image from any container registry.\n\nFor private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager."), z.object({
              "type": z.literal("custom-dockerfile"),
              "properties": z.object({
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
                "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
                "buildArgs": z.array(z.object({
                  "argName": z.string().describe("#### Argument name"),
                  "value": z.string().describe("#### Argument value") }).strict()
                ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
            .describe("#### Builds a container image from your own Dockerfile.\n\n---\n\nWith `custom-dockerfile`, you provide a path to your Dockerfile and build context.\nStacktape builds the image and uploads it to a managed ECR repository.\n\nThis gives you full control over the container environment and is ideal for complex setups."), z.object({
              "type": z.literal("nixpacks"),
              "properties": z.object({
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
                "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
                "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
                "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
                "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
                "phases": z.array(z.object({
                  "name": z.string().describe("#### The name of the build phase."),
                  "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                  "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                  "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                  "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                  "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                  "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                  "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                  "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
                ).optional().describe("#### The build phases for the application.").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using Nixpacks.\n\n---\n\nNixpacks automatically detects your application type and builds an optimized container image.\nIn most cases, no configuration is required.\n\nIt supports a wide range of languages and frameworks out of the box.")]).describe("#### How to build or specify the container image."),
          "essential": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### If `true` (default), the entire workload restarts when this container fails.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.").optional(),
          "dependsOn": z.array(z.object({
            "containerName": z.string().describe("The name of the container that this container depends on."),
            "condition": z.enum(["COMPLETE","HEALTHY","START","SUCCESS"]).describe("#### The condition that the dependency container must meet.\n---\nAvailable conditions:\n- `START`: The dependency has started.\n- `COMPLETE`: The dependency has finished executing (regardless of success).\n- `SUCCESS`: The dependency has finished with an exit code of `0`.\n- `HEALTHY`: The dependency has passed its first health check.") }).strict()
          ).optional().describe("#### Start this container only after the listed containers reach a specific state.\n\n---\n\nE.g., wait for a database sidecar to be `HEALTHY` before starting the app container.").optional(),
          "environment": z.array(z.object({
            "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
            "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
          ).optional().describe("#### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
          "internalHealthCheck": z.object({
            "healthCheckCommand": z.array(z.string()).describe("#### Command to check health. E.g., `[\"CMD-SHELL\", \"curl -f http://localhost/ || exit 1\"]`. Exit 0 = healthy."),
            "intervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(30),
            "timeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a check is considered failed (2-60).").default(5),
            "retries": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Consecutive failures before marking unhealthy (1-10).").default(3),
            "startPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Grace period (seconds) before counting failures. Gives the container time to start (0-300).").optional() }).strict()
          .optional().describe("#### Command-based health check. If it fails on an essential container, the workload instance is replaced.").optional(),
          "stopTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait after SIGTERM before SIGKILL (2-120).").default(2),
          "volumeMounts": z.array(z.object({
            "type": z.literal("efs").describe("#### The type of the volume mount."),
            "properties": z.object({
              "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
              "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Restricts access to that directory."),
              "mountPath": z.string().describe("#### Absolute path inside the container where the volume is mounted (e.g., `/data`).") }).strict()
            .describe("#### Properties for the EFS volume mount.") }).strict()
          ).optional().describe("#### Mount EFS volumes for persistent, shared storage across containers.").optional() }).strict()
        ).optional().describe("#### Helper containers that run alongside the main container.\n\n---\n\n- **`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).\n- **`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).\n  Can reach the main container via `localhost`.").optional(),
        "usePrivateSubnetsWithNAT": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Deploy in private subnets with a static outbound IP via NAT Gateway.\n\n---\n\nThe container won't have a public IP. All outbound traffic routes through a NAT Gateway,\ngiving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).\n\nConfigure the number of NAT Gateways in `stackConfig.vpc.nat`.\n\n**Adds cost:** NAT Gateway ~$32/month + data processing fees.").default(false),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Always-on container with a private endpoint, reachable only from other resources in your stack.\n\n---\n\nUse for internal APIs, microservices, or gRPC servers that shouldn't be publicly accessible.\nOther containers in the same stack can reach it by name (e.g., `http://myService:3000`)."), z.object({
      "type": z.literal("worker-service"),
      "properties": z.object({
        "packaging": z.union([z.object({
            "type": z.literal("stacktape-image-buildpack"),
            "properties": z.object({
              "languageSpecificConfig": z.union([z.object({
                  "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                  "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                  "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                  "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                  "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                  "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                  "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                  "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                , z.object({
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                  "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                  "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                  "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                  "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                , z.object({
                  "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                  "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                , z.object({
                  "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                , z.object({
                  "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                  "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                , z.record(z.string(), z.never()), z.object({
                  "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
              ]).optional().describe("#### Language-specific packaging configuration.").optional(),
              "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
              "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
              "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
              "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
              "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
              "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
            .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
          .describe("#### A zero-config buildpack that creates a container image from your source code.\n\n---\n\nThe `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, and Go.\n\nFor JS/TS, your code is bundled into a single file with source maps.\nThe resulting image is uploaded to a managed ECR repository."), z.object({
            "type": z.literal("external-buildpack"),
            "properties": z.object({
              "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
              "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
              "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
          }).strict()
          .describe("#### Builds a container image using an external buildpack.\n\n---\n\nExternal buildpacks (buildpacks.io) automatically detect your application type\nand build an optimized container image with zero configuration.\n\nThe default builder is `paketobuildpacks/builder-jammy-base`.\nYou can find buildpacks for almost any language or framework."), z.object({
            "type": z.literal("prebuilt-image"),
            "properties": z.object({
              "repositoryCredentialsSecretArn": z.string().optional().describe("#### The ARN of a secret containing credentials for a private container registry.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.").optional(),
              "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
              "image": z.string().describe("#### The name or URL of the container image."),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
            .describe("#### Configures a pre-built container image.") }).strict()
          .describe("#### Uses a pre-built container image.\n\n---\n\nWith `prebuilt-image`, you provide a reference to an existing container image.\nThis can be a public image from Docker Hub or a private image from any container registry.\n\nFor private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager."), z.object({
            "type": z.literal("custom-dockerfile"),
            "properties": z.object({
              "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
              "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
              "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
              "buildArgs": z.array(z.object({
                "argName": z.string().describe("#### Argument name"),
                "value": z.string().describe("#### Argument value") }).strict()
              ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
              "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
            .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
          .describe("#### Builds a container image from your own Dockerfile.\n\n---\n\nWith `custom-dockerfile`, you provide a path to your Dockerfile and build context.\nStacktape builds the image and uploads it to a managed ECR repository.\n\nThis gives you full control over the container environment and is ideal for complex setups."), z.object({
            "type": z.literal("nixpacks"),
            "properties": z.object({
              "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
              "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
              "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
              "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
              "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
              "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
              "phases": z.array(z.object({
                "name": z.string().describe("#### The name of the build phase."),
                "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
              ).optional().describe("#### The build phases for the application.").optional() }).strict()
          }).strict()
          .describe("#### Builds a container image using Nixpacks.\n\n---\n\nNixpacks automatically detects your application type and builds an optimized container image.\nIn most cases, no configuration is required.\n\nIt supports a wide range of languages and frameworks out of the box.")]).describe("#### Configures the container image for the service."),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables injected into the container at runtime.\n\n---\n\nUse for configuration like API keys, feature flags, or secrets.\nVariables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.").optional(),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Logging configuration.\n\n---\n\nContainer output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.\nView logs with `stacktape logs` or in the Stacktape Console.").optional(),
        "resources": z.object({
          "cpu": z.union([z.literal(0.25), z.literal(0.5), z.literal(1), z.literal(16), z.literal(2), z.literal(4), z.literal(8)]).optional().describe("#### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.").optional(),
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB. Must be compatible with the vCPU count on Fargate.\n\n---\n\nFargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,\n4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.\nFor EC2: auto-detected from instance type if omitted.").optional(),
          "instanceTypes": z.array(z.string()).optional().describe("#### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.\n\n---\n\nFirst type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.\nTip: specify a single type and omit `cpu`/`memory` for optimal sizing.").optional(),
          "enableWarmPool": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.").optional(),
          "architecture": z.enum(["arm64","x86_64"]).optional().describe("#### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.") }).strict()
        .describe("#### CPU, memory, and compute engine for the container.\n\n---\n\nTwo compute engines:\n- **Fargate** (default): Serverless — just specify `cpu` and `memory`.\n- **EC2**: Specify `instanceTypes` for more control and potentially lower cost."),
        "scaling": z.object({
          "minInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum running instances. Set to 0 is not supported — minimum is 1.").default(1),
          "maxInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum running instances. Traffic is distributed across all instances.").default(1),
          "scalingPolicy": z.object({
            "keepAvgCpuUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg CPU exceeds this %, scale in when it drops below.").default(80),
            "keepAvgMemoryUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Scale out when avg memory exceeds this %, scale in when it drops below.").default(80) }).strict()
          .optional().describe("#### When to scale: CPU and/or memory utilization targets.").optional() }).strict()
        .optional().describe("#### Auto-scaling: add/remove container instances based on demand.\n\n---\n\nTraffic is automatically distributed across all running containers.").optional(),
        "internalHealthCheck": z.object({
          "healthCheckCommand": z.array(z.string()).describe("#### Command to check health. E.g., `[\"CMD-SHELL\", \"curl -f http://localhost/ || exit 1\"]`. Exit 0 = healthy."),
          "intervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(30),
          "timeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a check is considered failed (2-60).").default(5),
          "retries": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Consecutive failures before marking unhealthy (1-10).").default(3),
          "startPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Grace period (seconds) before counting failures. Gives the container time to start (0-300).").optional() }).strict()
        .optional().describe("#### Health check that auto-replaces unhealthy containers.\n\n---\n\nIf a container fails the health check, it's terminated and replaced automatically.").optional(),
        "stopTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait for graceful shutdown before force-killing the container.\n\n---\n\nThe container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.").default(2),
        "enableRemoteSessions": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow SSH-like access to running containers for debugging.\n\n---\n\nEnables `stacktape container:session` to open an interactive shell inside the container.\nAdds a small SSM agent that uses minimal CPU/memory.").default(false),
        "volumeMounts": z.array(z.object({
          "type": z.literal("efs").describe("#### The type of the volume mount."),
          "properties": z.object({
            "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
            "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Restricts access to that directory."),
            "mountPath": z.string().describe("#### Absolute path inside the container where the volume is mounted (e.g., `/data`).") }).strict()
          .describe("#### Properties for the EFS volume mount.") }).strict()
        ).optional().describe("#### Persistent EFS volumes shared across containers and restarts.\n\n---\n\nData stored in EFS volumes persists even when containers are replaced.\nMultiple containers can mount the same volume. All data is encrypted in transit.").optional(),
        "sideContainers": z.array(z.object({
          "containerType": z.enum(["always-running","run-on-init"]).describe("#### When and how this sidecar container runs.\n\n---\n\n- **`run-on-init`**: Must exit with code 0 before the main container starts. Use for migrations or setup.\n- **`always-running`**: Runs alongside the main container for its entire lifetime. If it crashes, the whole task fails."),
          "name": z.string().describe("#### Unique container name within this workload."),
          "packaging": z.union([z.object({
              "type": z.literal("stacktape-image-buildpack"),
              "properties": z.object({
                "languageSpecificConfig": z.union([z.object({
                    "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                    "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                    "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                    "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                    "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                    "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                    "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                    "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                  , z.object({
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                    "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                    "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                    "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                    "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                  , z.object({
                    "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                    "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                    "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                  , z.object({
                    "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                  , z.object({
                    "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                    "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                  , z.record(z.string(), z.never()), z.object({
                    "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
                ]).optional().describe("#### Language-specific packaging configuration.").optional(),
                "requiresGlibcBinaries": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.\n\n---\n\nResults in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.").optional(),
                "customDockerBuildCommands": z.array(z.string()).optional().describe("#### A list of commands to be executed during the `docker build` process.\n\n---\n\nThese commands are executed using the `RUN` directive in the Dockerfile.\nThis is useful for installing additional system dependencies in your container.").optional(),
                "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
                "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
                "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
                "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional() }).strict()
              .describe("#### Configures an image to be built automatically by Stacktape from your source code.") }).strict()
            .describe("#### A zero-config buildpack that creates a container image from your source code.\n\n---\n\nThe `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, and Go.\n\nFor JS/TS, your code is bundled into a single file with source maps.\nThe resulting image is uploaded to a managed ECR repository."), z.object({
              "type": z.literal("external-buildpack"),
              "properties": z.object({
                "builder": z.string().optional().describe("#### The Buildpack Builder to use.\n\n---"),
                "buildpacks": z.array(z.string()).optional().describe("#### The specific Buildpack to use.\n\n---\n\nBy default, the buildpack is detected automatically.").optional(),
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nExample: `['/app/start.sh']`").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using an external buildpack.\n\n---\n\nExternal buildpacks (buildpacks.io) automatically detect your application type\nand build an optimized container image with zero configuration.\n\nThe default builder is `paketobuildpacks/builder-jammy-base`.\nYou can find buildpacks for almost any language or framework."), z.object({
              "type": z.literal("prebuilt-image"),
              "properties": z.object({
                "repositoryCredentialsSecretArn": z.string().optional().describe("#### The ARN of a secret containing credentials for a private container registry.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.").optional(),
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "image": z.string().describe("#### The name or URL of the container image."),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures a pre-built container image.") }).strict()
            .describe("#### Uses a pre-built container image.\n\n---\n\nWith `prebuilt-image`, you provide a reference to an existing container image.\nThis can be a public image from Docker Hub or a private image from any container registry.\n\nFor private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager."), z.object({
              "type": z.literal("custom-dockerfile"),
              "properties": z.object({
                "entryPoint": z.array(z.string()).optional().describe("#### A script to be executed when the container starts.\n\n---\n\nThis overrides the `ENTRYPOINT` instruction in the Dockerfile.").optional(),
                "dockerfilePath": z.string().optional().describe("#### The path to the Dockerfile, relative to `buildContextPath`.").optional(),
                "buildContextPath": z.string().describe("#### The path to the build context directory, relative to your Stacktape configuration file."),
                "buildArgs": z.array(z.object({
                  "argName": z.string().describe("#### Argument name"),
                  "value": z.string().describe("#### Argument value") }).strict()
                ).optional().describe("#### A list of arguments to pass to the `docker build` command.").optional(),
                "command": z.array(z.string()).optional().describe("#### A command to be executed when the container starts.\n\n---\n\nThis overrides the `CMD` instruction in the Dockerfile.\n\nExample: `['/app/start.sh']`").optional() }).strict()
              .describe("#### Configures an image to be built by Stacktape from a specified Dockerfile.") }).strict()
            .describe("#### Builds a container image from your own Dockerfile.\n\n---\n\nWith `custom-dockerfile`, you provide a path to your Dockerfile and build context.\nStacktape builds the image and uploads it to a managed ECR repository.\n\nThis gives you full control over the container environment and is ideal for complex setups."), z.object({
              "type": z.literal("nixpacks"),
              "properties": z.object({
                "sourceDirectoryPath": z.string().describe("#### The path to the source code directory."),
                "buildImage": z.string().optional().describe("#### The base image to use for building the application.\n\n---\n\nFor more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).").optional(),
                "providers": z.array(z.string()).optional().describe("#### A list of providers to use for determining the build and runtime environments.").optional(),
                "startCmd": z.string().optional().describe("#### The command to execute when starting the application.\n\n---\n\nThis overrides the default start command inferred by Nixpacks.").optional(),
                "startRunImage": z.string().optional().describe("#### The base image to use for running the application.").optional(),
                "startOnlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in the runtime environment; all other files will be excluded.").optional(),
                "phases": z.array(z.object({
                  "name": z.string().describe("#### The name of the build phase."),
                  "cmds": z.array(z.string()).optional().describe("#### A list of shell commands to execute in this phase.").optional(),
                  "nixPkgs": z.array(z.string()).optional().describe("#### A list of Nix packages to install in this phase.").optional(),
                  "nixLibs": z.array(z.string()).optional().describe("#### A list of Nix libraries to include in this phase.").optional(),
                  "nixOverlay": z.array(z.string()).optional().describe("#### A list of Nix overlay files to apply in this phase.").optional(),
                  "nixpkgsArchive": z.string().optional().describe("#### The Nixpkgs archive to use.").optional(),
                  "aptPkgs": z.array(z.string()).optional().describe("#### A list of APT packages to install in this phase.").optional(),
                  "cacheDirectories": z.array(z.string()).optional().describe("#### A list of directories to cache between builds to speed up subsequent builds.").optional(),
                  "onlyIncludeFiles": z.array(z.string()).optional().describe("#### A list of file paths to include in this phase; all other files will be excluded.").optional() }).strict()
                ).optional().describe("#### The build phases for the application.").optional() }).strict()
            }).strict()
            .describe("#### Builds a container image using Nixpacks.\n\n---\n\nNixpacks automatically detects your application type and builds an optimized container image.\nIn most cases, no configuration is required.\n\nIt supports a wide range of languages and frameworks out of the box.")]).describe("#### How to build or specify the container image."),
          "essential": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### If `true` (default), the entire workload restarts when this container fails.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable logging to CloudWatch.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.").optional(),
          "dependsOn": z.array(z.object({
            "containerName": z.string().describe("The name of the container that this container depends on."),
            "condition": z.enum(["COMPLETE","HEALTHY","START","SUCCESS"]).describe("#### The condition that the dependency container must meet.\n---\nAvailable conditions:\n- `START`: The dependency has started.\n- `COMPLETE`: The dependency has finished executing (regardless of success).\n- `SUCCESS`: The dependency has finished with an exit code of `0`.\n- `HEALTHY`: The dependency has passed its first health check.") }).strict()
          ).optional().describe("#### Start this container only after the listed containers reach a specific state.\n\n---\n\nE.g., wait for a database sidecar to be `HEALTHY` before starting the app container.").optional(),
          "environment": z.array(z.object({
            "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
            "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
          ).optional().describe("#### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
          "internalHealthCheck": z.object({
            "healthCheckCommand": z.array(z.string()).describe("#### Command to check health. E.g., `[\"CMD-SHELL\", \"curl -f http://localhost/ || exit 1\"]`. Exit 0 = healthy."),
            "intervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds between health checks (5-300).").default(30),
            "timeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds before a check is considered failed (2-60).").default(5),
            "retries": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Consecutive failures before marking unhealthy (1-10).").default(3),
            "startPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Grace period (seconds) before counting failures. Gives the container time to start (0-300).").optional() }).strict()
          .optional().describe("#### Command-based health check. If it fails on an essential container, the workload instance is replaced.").optional(),
          "stopTimeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds to wait after SIGTERM before SIGKILL (2-120).").default(2),
          "volumeMounts": z.array(z.object({
            "type": z.literal("efs").describe("#### The type of the volume mount."),
            "properties": z.object({
              "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
              "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Restricts access to that directory."),
              "mountPath": z.string().describe("#### Absolute path inside the container where the volume is mounted (e.g., `/data`).") }).strict()
            .describe("#### Properties for the EFS volume mount.") }).strict()
          ).optional().describe("#### Mount EFS volumes for persistent, shared storage across containers.").optional() }).strict()
        ).optional().describe("#### Helper containers that run alongside the main container.\n\n---\n\n- **`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).\n- **`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).\n  Can reach the main container via `localhost`.").optional(),
        "usePrivateSubnetsWithNAT": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Deploy in private subnets with a static outbound IP via NAT Gateway.\n\n---\n\nThe container won't have a public IP. All outbound traffic routes through a NAT Gateway,\ngiving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).\n\nConfigure the number of NAT Gateways in `stackConfig.vpc.nat`.\n\n**Adds cost:** NAT Gateway ~$32/month + data processing fees.").default(false),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Always-on container with no public URL. For background workers, queue processors, and internal tasks.\n\n---\n\nRuns 24/7 inside your VPC. Not reachable from the internet. Can connect to databases, queues, and other resources."), z.object({
      "type": z.literal("relational-database"),
      "properties": z.object({
        "credentials": z.object({
          "masterUserName": z.string().optional().describe("#### Admin username. Avoid special characters: `[]{}(),;?*=!@`.\n\n---\n\n> **Warning:** Changing this after creation **replaces the database and deletes all data**."),
          "masterUserPassword": z.string().describe("#### Admin password. Avoid special characters: `[]{}(),;?*=!@`.\n\n---\n\nUse `$Secret()` to store it securely instead of hardcoding:\n```yaml\nmasterUserPassword: $Secret('database.password')\n```") }).strict()
        .describe("#### Master user credentials (username and password).\n\n---\n\nIncluded in the auto-generated connection string. Store the password in a Stacktape secret\nto avoid exposing it in your config file."),
        "engine": z.union([z.object({
            "type": z.enum(["aurora-mysql","aurora-postgresql"]),
            "properties": z.object({
              "dbName": z.string().optional().describe("#### Name of the initial database.").default("defdb"),
              "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port. Defaults: aurora-mysql 3306, aurora-postgresql 5432.").optional(),
              "instances": z.array(z.object({
                "instanceSize": z.string().describe("#### Instance size (e.g., `db.t4g.medium`, `db.r6g.large`).\n\n---\n\n`t` family = burstable (dev/low-traffic). `r` family = memory-optimized (production).") }).strict()
              ).describe("#### Cluster instances. First = primary (writer), rest = read replicas.\n\n---\n\nReads are load-balanced across all instances. If the primary fails,\na replica is automatically promoted (usually within 30 seconds)."),
              "version": z.string().describe("#### Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL)."),
              "disableAutoMinorVersionUpgrade": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).").default(false) }).strict()
          }).strict()
          .describe("#### Aurora: high-performance clustered database with auto-failover.\n\n---\n\nUp to 5x faster than MySQL, 3x faster than PostgreSQL. Data is replicated across 3 AZs\nautomatically. If the primary instance fails, a read replica is promoted in seconds."), z.object({
            "type": z.enum(["aurora-mysql-serverless","aurora-postgresql-serverless"]),
            "properties": z.object({
              "version": z.string().optional().describe("#### Engine version. Usually managed by AWS automatically for serverless v1.").optional(),
              "dbName": z.string().optional().describe("#### Name of the initial database.").default("defdb"),
              "minCapacity": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum ACUs to scale down to (~1 ACU ≈ 2 GB RAM).\n\n---\n\nMySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).").default(2),
              "maxCapacity": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum ACUs to scale up to.\n\n---\n\nMySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).").default(4),
              "pauseAfterSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Pause the database after this many seconds of inactivity (no connections).\n\n---\n\nWhen paused, you only pay for storage. Range: 300 (5 min) - 86400 (24 hr).\nOmit to never pause.").optional(),
              "disableAutoMinorVersionUpgrade": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).").default(false) }).strict()
            .optional().describe("").optional() }).strict()
          .describe("#### Aurora Serverless v1: auto-scaling database that can pause when idle.\n\n---\n\nScales compute capacity automatically and pauses during inactivity (you only pay for storage).\n\n> **For new projects, use Aurora Serverless v2 instead** — it has faster scaling and more granular capacity control."), z.object({
            "type": z.enum(["aurora-mysql-serverless-v2","aurora-postgresql-serverless-v2"]),
            "properties": z.object({
              "dbName": z.string().optional().describe("#### Name of the initial database.").default("defdb"),
              "minCapacity": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum ACUs (0.5-128 in 0.5 increments). ~1 ACU ≈ 2 GB RAM.\n\n---\n\nSet low (0.5) for dev/staging to minimize cost. The database scales up instantly under load.").default(0.5),
              "maxCapacity": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum ACUs (0.5-128 in 0.5 increments). Caps your scaling and cost.").default(10),
              "version": z.string().describe("#### Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL)."),
              "disableAutoMinorVersionUpgrade": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).").default(false) }).strict()
          }).strict()
          .describe("#### Aurora Serverless v2: recommended for most new projects.\n\n---\n\nScales instantly from 0.5 to 128 ACUs in 0.5-ACU increments (~1 ACU ≈ 2 GB RAM).\nYou pay only for the capacity used, making it cost-effective for variable workloads."), z.object({
            "type": z.enum(["mariadb","mysql","oracle-ee","oracle-se2","postgres","sqlserver-ee","sqlserver-ex","sqlserver-se","sqlserver-web"]),
            "properties": z.object({
              "dbName": z.string().optional().describe("#### Name of the database created on initialization. For Oracle, this is the SID. Not applicable to SQL Server.").optional(),
              "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port the database listens on. Defaults: PostgreSQL 5432, MySQL/MariaDB 3306, Oracle 1521, SQL Server 1433.").optional(),
              "storage": z.object({
                "initialSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Initial storage in GB. Auto-scales up when free space is low.").default(20),
                "maxSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max storage in GB. The database won't auto-scale beyond this.").default(200) }).strict()
              .optional().describe("#### Storage configuration. Auto-scales up when free space is low.").optional(),
              "primaryInstance": z.object({
                "instanceSize": z.string().describe("#### Instance size (e.g., `db.t4g.micro`, `db.r6g.large`).\n\n---\n\nDetermines CPU, memory, and network capacity. Quick guide:\n- **db.t4g.micro** (~$12/mo): Dev/testing, 2 vCPU, 1 GB RAM\n- **db.t4g.medium** (~$50/mo): Small production, 2 vCPU, 4 GB RAM\n- **db.r6g.large** (~$180/mo): Production, 2 vCPU, 16 GB RAM\n\n`t` family instances are burstable (fine for low/variable load). Use `r` family for steady workloads."),
                "multiAz": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Create a standby replica in another availability zone for automatic failover.\n\n---\n\nIf the primary goes down, traffic fails over to the standby automatically.\nAlso reduces downtime during maintenance. Doubles the instance cost.").optional() }).strict()
              .describe("#### The primary (writer) instance. Handles all write operations."),
              "readReplicas": z.array(z.object({
                "instanceSize": z.string().describe("#### Instance size (e.g., `db.t4g.micro`, `db.r6g.large`).\n\n---\n\nDetermines CPU, memory, and network capacity. Quick guide:\n- **db.t4g.micro** (~$12/mo): Dev/testing, 2 vCPU, 1 GB RAM\n- **db.t4g.medium** (~$50/mo): Small production, 2 vCPU, 4 GB RAM\n- **db.r6g.large** (~$180/mo): Production, 2 vCPU, 16 GB RAM\n\n`t` family instances are burstable (fine for low/variable load). Use `r` family for steady workloads."),
                "multiAz": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Create a standby replica in another availability zone for automatic failover.\n\n---\n\nIf the primary goes down, traffic fails over to the standby automatically.\nAlso reduces downtime during maintenance. Doubles the instance cost.").optional() }).strict()
              ).optional().describe("#### Read replicas to offload read traffic from the primary instance.\n\n---\n\nEach replica gets its own endpoint. Data is replicated asynchronously from the primary.").optional(),
              "version": z.string().describe("#### Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL)."),
              "disableAutoMinorVersionUpgrade": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).").default(false) }).strict()
          }).strict()
          .describe("#### Standard RDS: single-instance database with predictable pricing.\n\n---\n\nChoose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.\nFor high availability, enable `multiAz` on the primary instance.")]).describe("#### Database engine: what type of database and how it runs.\n\n---\n\n- **RDS** (`postgres`, `mysql`, `mariadb`, etc.): Single-node, fixed-size. Simple and predictable pricing.\n- **Aurora** (`aurora-postgresql`, `aurora-mysql`): High-performance clustered DB with auto-failover.\n  Up to 5x faster than standard MySQL / 3x faster than standard PostgreSQL.\n- **Aurora Serverless v2** (`aurora-postgresql-serverless-v2`): Auto-scales from 0.5 to 128 ACUs.\n  **Recommended for most new projects** — pay only for what you use."),
        "accessibility": z.object({
          "accessibilityMode": z.enum(["internet","scoping-workloads-in-vpc","vpc","whitelisted-ips-only"]).describe("#### Controls who can connect to your database.\n\n---\n\n- **`internet`** (default): Anyone with the credentials can connect. Simplest setup, great for development.\n  The database is still protected by username/password.\n- **`vpc`**: Only your app's resources (and anything in the same VPC) can connect.\n  You can also whitelist specific IPs (e.g., your office) using `whitelistedIps`.\n- **`scoping-workloads-in-vpc`**: Most restrictive. Only resources that explicitly list this\n  database in their `connectTo` can reach it. Best for production.\n- **`whitelisted-ips-only`**: Only the IP addresses you list in `whitelistedIps` can connect.\n\n> Aurora Serverless engines only support `vpc` or `scoping-workloads-in-vpc`.").default("internet"),
          "forceDisablePublicIp": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Remove the database's public IP entirely (VPC-only access).\n\n---\n\n> For Aurora, this can only be set at creation time and cannot be changed later.").optional(),
          "whitelistedIps": z.array(z.string()).optional().describe("#### IP addresses or CIDR ranges allowed to connect (e.g., `203.0.113.50/32`).\n\n---\n\n- In `vpc`/`scoping-workloads-in-vpc`: adds external IPs on top of VPC access (e.g., your office).\n- In `whitelisted-ips-only`: only these IPs can connect.\n- No effect in `internet` mode.").optional() }).strict()
        .optional().describe("#### Who can connect to this database (network-level access control).\n\n---\n\nDefault is `internet` — anyone with credentials can connect (fine for development).\nFor production, use `scoping-workloads-in-vpc` to restrict access to only resources\nthat list this database in their `connectTo`.").optional(),
        "deletionProtection": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Prevent accidental deletion of the database. Must be disabled before deleting.").default(false),
        "automatedBackupRetentionDays": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Days to keep automated daily backups (0-35). Set to 0 to disable (RDS only).").default(1),
        "preferredMaintenanceWindow": z.string().optional().describe("#### When maintenance (patching, upgrades) happens. Format: `Sun:02:00-Sun:04:00` (UTC).\n\n---\n\nThe database may be briefly unavailable during this window.\nUse multi-AZ or Aurora to minimize downtime.").optional(),
        "alarms": z.array(z.object({
          "trigger": z.union([z.object({
              "type": z.literal("database-read-latency"),
              "properties": z.object({
                "thresholdSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when average read I/O latency exceeds this value (seconds)."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold."),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("database-write-latency"),
              "properties": z.object({
                "thresholdSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when average write I/O latency exceeds this value (seconds)."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("database-cpu-utilization"),
              "properties": z.object({
                "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when CPU utilization exceeds this percentage."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("database-free-storage"),
              "properties": z.object({
                "thresholdMB": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when free disk space drops below this value (MB).\n\n---\n\nDefault: fires if **minimum** free storage < threshold."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("database-free-memory"),
              "properties": z.object({
                "thresholdMB": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when free memory drops below this value (MB).\n\n---\n\nDefault: fires if **average** free memory < threshold. Customize with `statistic` and `comparisonOperator`."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("database-connection-count"),
              "properties": z.object({
                "thresholdCount": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when the number of active database connections exceeds this value."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
          ]),
          "evaluation": z.object({
            "period": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Duration of one evaluation period in seconds. Must be a multiple of 60.").default(60),
            "evaluationPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many recent periods to evaluate. Prevents alarms from firing on short spikes.\n\n---\n\nExample: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached\nin at least 3 of the last 5 periods.").default(1),
            "breachedPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.\n\n---\n\nMust be ≤ `evaluationPeriods`.").default(1) }).strict()
          .optional().describe("#### How long and how often to evaluate the metric before triggering.\n\n---\n\nControls the evaluation window (period), how many periods to look at, and how many must breach\nthe threshold to fire the alarm. Useful for filtering out short spikes.").optional(),
          "notificationTargets": z.array(z.union([z.object({
              "type": z.literal("ms-teams"),
              "properties": z.object({
                "webhookUrl": z.string().describe("#### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.\n\n---\n\nCreate an Incoming Webhook connector in your Teams channel settings to get this URL.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("slack"),
              "properties": z.object({
                "conversationId": z.string().describe("#### The Slack channel or DM ID to send notifications to.\n\n---\n\nTo find the ID: open the channel, click its name, and look at the bottom of the **About** tab."),
                "accessToken": z.string().describe("#### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.\n\n---\n\nCreate a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("email"),
              "properties": z.object({
                "sender": z.string().describe("#### The email address of the sender."),
                "recipient": z.string().describe("#### The email address of the recipient.") }).strict()
            }).strict()
          ])).optional().describe("#### Where to send notifications when the alarm fires — Slack, MS Teams, or email.").optional(),
          "description": z.string().optional().describe("#### Custom alarm description used in notification messages and the AWS console.").optional() }).strict()
        ).optional().describe("#### Alarms for this database (merged with global alarms from the Stacktape Console).").optional(),
        "disabledGlobalAlarms": z.array(z.string()).optional().describe("#### Global alarm names to exclude from this database.").optional(),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
          "logTypes": z.array(z.string()).optional().describe("#### Which log types to export. Depends on engine:\n\n- **PostgreSQL**: `postgresql`\n- **MySQL/MariaDB**: `audit`, `error`, `general`, `slowquery`\n- **Oracle**: `alert`, `audit`, `listener`, `trace`\n- **SQL Server**: `agent`, `error`").optional(),
          "engineSpecificOptions": z.union([z.object({
              "log_connections": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Log new client connections.").default(false),
              "log_disconnections": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Log client disconnections.").default(false),
              "log_lock_waits": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Log sessions waiting for locks (helps find lock contention issues).").default(false),
              "log_min_duration_statement": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Log queries slower than this (ms). `-1` = disabled, `0` = log all. Great for finding slow queries.").default(10000),
              "log_statement": z.enum(["all","ddl","mod","none"]).optional().describe("#### Which SQL statements to log: `none`, `ddl` (CREATE/ALTER), `mod` (ddl + INSERT/UPDATE/DELETE), `all`.") }).strict()
            , z.object({
              "server_audit_events": z.array(z.enum(["CONNECT","QUERY","QUERY_DCL","QUERY_DDL","QUERY_DML","QUERY_DML_NO_SELECT"])).optional().describe("#### What to record in the audit log: connections, all queries, DDL only, DML only, etc.").default(["QUERY_DDL"]),
              "long_query_time": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Queries slower than this (seconds) are logged as \"slow queries\". `-1` to disable.").default(10) }).strict()
          ]).optional().describe("#### Fine-grained logging settings (PostgreSQL: slow queries, statements; MySQL: audit events).").optional(),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Database logging (connections, slow queries, errors).\n\n---\n\nLogs are sent to CloudWatch and retained for 90 days by default.\nAvailable log types vary by engine.").optional(),
        "dev": z.object({
          "remote": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use the deployed AWS resource instead of a local emulation.\n\n---\n\nBy default, databases, Redis, and DynamoDB run locally in Docker during dev mode.\nSet to `true` to connect to the real deployed resource instead (must be deployed first).\n\nUseful when local emulation doesn't match production behavior closely enough,\nor when you need to work with real data.").default(false) }).strict()
        .optional().describe("#### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed database.").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### A fully managed relational (SQL) database resource.\n\n---\n\nSupports various database engines like PostgreSQL, MySQL, and MariaDB, with features like clustering and high availability."), z.object({
      "type": z.literal("application-load-balancer"),
      "properties": z.object({
        "interface": z.enum(["internal","internet"]).optional().describe("#### `internet` (public) or `internal` (VPC-only). Internal ALBs are not reachable from the internet.").default("internet"),
        "customDomains": z.union([z.array(z.string()), z.array(z.object({
            "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
            "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
            "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
          )]).optional().describe("#### Custom domains.\n\n---\n\nBy default, Stacktape creates DNS records and TLS certificates for each domain.\nIf you manage DNS yourself, set `disableDnsRecordCreation` and provide `customCertificateArn`.\n\nBackward compatible format `string[]` is still supported.").optional(),
        "listeners": z.array(z.object({
          "protocol": z.enum(["HTTP","HTTPS"]).describe("#### Listener protocol. `HTTPS` requires a TLS certificate (auto-created with `customDomains` or via `customCertificateArns`)."),
          "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Port this listener accepts traffic on (e.g., 443 for HTTPS, 80 for HTTP)."),
          "customCertificateArns": z.array(z.string()).optional().describe("#### ARNs of your own ACM certificates. Not needed if using `customDomains` (Stacktape creates certs automatically).").optional(),
          "whitelistIps": z.array(z.string()).optional().describe("#### Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.").optional(),
          "defaultAction": z.object({
            "type": z.literal("redirect").describe("#### The type of the default action."),
            "properties": z.object({
              "path": z.string().optional().describe("#### Redirect path (must start with `/`). Use `#{path}` to reuse the original path.").optional(),
              "query": z.string().optional().describe("#### Query string for the redirect (without leading `?`). Use `#{query}` to preserve the original.").optional(),
              "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Redirect port (1-65535). Use `#{port}` to keep the original.").optional(),
              "host": z.string().optional().describe("#### Redirect hostname. Use `#{host}` to keep the original.").optional(),
              "protocol": z.enum(["HTTP","HTTPS"]).optional().describe("#### Redirect protocol. Cannot redirect HTTPS to HTTP.").optional(),
              "statusCode": z.enum(["HTTP_301","HTTP_302"]).describe("#### `HTTP_301` (permanent) or `HTTP_302` (temporary) redirect.") }).strict()
            .describe("#### Configures where to redirect the request.\n\n---\n\nA redirect changes the URI, which has the format: `protocol://hostname:port/path?query`.\nUnmodified URI components will retain their original values.\n\nTo avoid redirect loops, ensure that you sufficiently modify the URI.\nYou can reuse URI components with the following keywords: `#{protocol}`, `#{host}`, `#{port}`, `#{path}` (the leading `/` is removed), and `#{query}`.\n\nFor example, you can change the path to `/new/#{path}`, the hostname to `example.#{host}`, or the query to `#{query}&value=xyz`.") }).strict()
          .optional().describe("#### Action for requests that don't match any integration. Currently supports `redirect` only.").optional() }).strict()
        ).optional().describe("#### Custom listeners (port + protocol). Defaults to HTTPS on 443 + HTTP on 80 (redirecting to HTTPS).").optional(),
        "cdn": z.object({
          "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Listener port for CDN traffic. Only needed if using custom listeners.").optional(),
          "originDomainName": z.string().optional().describe("#### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.").optional(),
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.\n\n---\n\nCaches responses at edge locations worldwide so users get content from the nearest server.\nThe CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.").default(false),
          "cachingOptions": z.object({
            "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
            "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
            "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
            "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
            "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
            "cacheKeyParameters": z.object({
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
            .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
            "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
          .optional().describe("#### Control how long and what gets cached at the CDN edge.\n\n---\n\nWhen the origin response has no `Cache-Control` header, defaults apply:\n- **Bucket origins**: cached for 6 months (or until invalidated on deploy).\n- **API Gateway / Load Balancer origins**: not cached.").optional(),
          "forwardingOptions": z.object({
            "customRequestHeaders": z.array(z.object({
              "headerName": z.string().describe("#### Name of the header"),
              "value": z.string().describe("#### Value of the header") }).strict()
            ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
            "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
            "cookies": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
            "headers": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
              "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
              "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
              "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
            .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
            "queryString": z.object({
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
            "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
          .optional().describe("#### Control which headers, cookies, and query params are forwarded to your origin.\n\n---\n\nBy default, all headers/cookies/query params are forwarded. Use this to restrict\nwhat reaches your app (e.g., strip cookies for static content).").optional(),
          "routeRewrites": z.array(z.object({
            "path": z.string().describe("#### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported."),
            "routePrefix": z.string().optional().describe("#### Prepend a path prefix to requests before forwarding to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.").optional(),
            "routeTo": z.union([z.object({
                "type": z.literal("application-load-balancer"),
                "properties": z.object({
                  "loadBalancerName": z.string().describe("#### Name of the `application-load-balancer` resource to route to."),
                  "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Listener port on the load balancer. Only needed if using custom listeners.").optional(),
                  "originDomainName": z.string().optional().describe("#### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("http-api-gateway"),
                "properties": z.object({
                  "httpApiGatewayName": z.string().describe("#### Name of the `http-api-gateway` resource to route to.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("function"),
                "properties": z.object({
                  "functionName": z.string().describe("#### Name of the `function` resource to route to. The function must have `url.enabled: true`.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("custom-origin"),
                "properties": z.object({
                  "domainName": z.string().describe("#### Domain name of the external origin (e.g., `api.example.com`)."),
                  "protocol": z.enum(["HTTP","HTTPS"]).optional().describe("#### Protocol for connecting to the origin."),
                  "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("bucket"),
                "properties": z.object({
                  "bucketName": z.string().describe("#### Name of the `bucket` resource to route to."),
                  "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable clean URL normalization (e.g., `/about` → `/about.html`).").default(false) }).strict()
              }).strict()
            ]).optional().describe("#### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.\n\n---\n\nIf not set, requests go to the default origin (the resource this CDN is attached to).").optional(),
            "cachingOptions": z.object({
              "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
              "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
              "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
              "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
              "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
              "cacheKeyParameters": z.object({
                "cookies": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                  "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
                "headers": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
                "queryString": z.object({
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
              .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
              "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
            .optional().describe("#### Override caching behavior for requests matching this route.").optional(),
            "forwardingOptions": z.object({
              "customRequestHeaders": z.array(z.object({
                "headerName": z.string().describe("#### Name of the header"),
                "value": z.string().describe("#### Value of the header") }).strict()
              ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
              "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
                "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
                "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
              .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
              "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
            .optional().describe("#### Override which headers, cookies, and query params are forwarded for this route.").optional(),
            "edgeFunctions": z.object({
              "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
              "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
              "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
              "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
            .optional().describe("#### Run edge functions on requests/responses matching this route.").optional() }).strict()
          ).optional().describe("#### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).\n\n---\n\nEvaluated in order; first match wins. Unmatched requests go to the default origin.\nEach route can have its own caching and forwarding settings.").optional(),
          "customDomains": z.array(z.object({
            "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
            "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
            "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
          ).optional().describe("#### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
          "edgeFunctions": z.object({
            "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
            "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
            "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
            "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
          .optional().describe("#### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).\n\n---\n\n- `onRequest`: Before cache lookup — modify the request, add auth, or return early.\n- `onResponse`: Before returning to the client — modify headers, add cookies.").optional(),
          "cloudfrontPriceClass": z.enum(["PriceClass_100","PriceClass_200","PriceClass_All"]).optional().describe("#### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.\n\n---\n\n- **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.\n- **`PriceClass_200`**: Adds Asia, Middle East, Africa.\n- **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.\n\nThe CDN itself has no monthly base cost - you only pay per request and per GB transferred.\nThe price class controls which edge locations are used, and some regions cost more per request."),
          "defaultRoutePrefix": z.string().optional().describe("#### Prepend a path prefix to all requests forwarded to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.").optional(),
          "errorDocument": z.string().optional().describe("#### Page to show for 404 errors (e.g., `/error.html`).").default("/404.html"),
          "indexDocument": z.string().optional().describe("#### Page served for requests to `/`.").default("/index.html"),
          "disableInvalidationAfterDeploy": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip clearing the CDN cache after each deploy.\n\n---\n\nBy default, all cached content is flushed on every deploy so users see the latest version.\nSet to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.").default(false),
          "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.").optional() }).strict()
        .optional().describe("#### Put a CDN (CloudFront) in front of this load balancer for caching and lower latency worldwide.").optional(),
        "alarms": z.array(z.object({
          "trigger": z.union([z.object({
              "type": z.literal("application-load-balancer-custom"),
              "properties": z.object({
                "metric": z.enum(["ActiveConnectionCount","AnomalousHostCount","ClientTLSNegotiationErrorCount","ConsumedLCUs","DesyncMitigationMode_NonCompliant_Request_Count","DroppedInvalidHeaderRequestCount","ELBAuthError","ELBAuthFailure","ELBAuthLatency","ELBAuthRefreshTokenSuccess","ELBAuthSuccess","ELBAuthUserClaimsSizeExceeded","ForwardedInvalidHeaderRequestCount","GrpcRequestCount","HTTPCode_ELB_3XX_Count","HTTPCode_ELB_4XX_Count","HTTPCode_ELB_500_Count","HTTPCode_ELB_502_Count","HTTPCode_ELB_503_Count","HTTPCode_ELB_504_Count","HTTPCode_ELB_5XX_Count","HTTPCode_Target_2XX_Count","HTTPCode_Target_3XX_Count","HTTPCode_Target_4XX_Count","HTTPCode_Target_5XX_Count","HTTP_Fixed_Response_Count","HTTP_Redirect_Count","HTTP_Redirect_Url_Limit_Exceeded_Count","HealthyHostCount","HealthyStateDNS","HealthyStateRouting","IPv6ProcessedBytes","IPv6RequestCount","LambdaInternalError","LambdaTargetProcessedBytes","LambdaUserError","MitigatedHostCount","NewConnectionCount","NonStickyRequestCount","ProcessedBytes","RejectedConnectionCount","RequestCount","RequestCountPerTarget","RuleEvaluations","TargetConnectionErrorCount","TargetResponseTime","TargetTLSNegotiationErrorCount","UnHealthyHostCount","UnhealthyRoutingRequestCount","UnhealthyStateDNS","UnhealthyStateRouting"]).describe("#### The metric to monitor on the Load Balancer.\n\n---\n\nThe threshold will be compared against the calculated value of `statistic(METRIC)`, where:\n- `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).\n- `METRIC` is the chosen metric.\n\n**Available Metrics:**\n\n- `ActiveConnectionCount`: The total number of concurrent TCP connections active from clients to the load balancer and from the load balancer to targets.\n- `AnomalousHostCount`: The number of hosts detected with anomalies.\n- `ClientTLSNegotiationErrorCount`: The number of TLS connections initiated by the client that did not establish a session with the load balancer due to a TLS error.\n- `ConsumedLCUs`: The number of load balancer capacity units (LCU) used by your load balancer.\n- `DesyncMitigationMode_NonCompliant_Request_Count`: The number of requests that do not comply with RFC 7230.\n- `DroppedInvalidHeaderRequestCount`: The number of requests where the load balancer removed HTTP headers with invalid fields before routing the request.\n- `MitigatedHostCount`: The number of targets under mitigation.\n- `ForwardedInvalidHeaderRequestCount`: The number of requests routed by the load balancer that had HTTP headers with invalid fields.\n- `GrpcRequestCount`: The number of gRPC requests processed over IPv4 and IPv6.\n- `HTTP_Fixed_Response_Count`: The number of successful fixed-response actions.\n- `HTTP_Redirect_Count`: The number of successful redirect actions.\n- `HTTP_Redirect_Url_Limit_Exceeded_Count`: The number of redirect actions that failed because the URL in the response location header exceeded 8K.\n- `HTTPCode_ELB_3XX_Count`: The number of HTTP 3XX redirection codes originating from the load balancer.\n- `HTTPCode_ELB_4XX_Count`: The number of HTTP 4XX client error codes originating from the load balancer.\n- `HTTPCode_ELB_5XX_Count`: The number of HTTP 5XX server error codes originating from the load balancer.\n- `HTTPCode_ELB_500_Count`: The number of HTTP 500 error codes originating from the load balancer.\n- `HTTPCode_ELB_502_Count`: The number of HTTP 502 error codes originating from the load balancer.\n- `HTTPCode_ELB_503_Count`: The number of HTTP 503 error codes originating from the load balancer.\n- `HTTPCode_ELB_504_Count`: The number of HTTP 504 error codes originating from the load balancer.\n- `IPv6ProcessedBytes`: The total number of bytes processed by the load balancer over IPv6.\n- `IPv6RequestCount`: The number of IPv6 requests received by the load balancer.\n- `NewConnectionCount`: The total number of new TCP connections established from clients to the load balancer and from the load balancer to targets.\n- `NonStickyRequestCount`: The number of requests where the load balancer chose a new target because it could not use an existing sticky session.\n- `ProcessedBytes`: The total number of bytes processed by the load balancer over IPv4 and IPv6.\n- `RejectedConnectionCount`: The number of connections rejected because the load balancer reached its maximum number of connections.\n- `RequestCount`: The number of requests processed over IPv4 and IPv6.\n- `RuleEvaluations`: The number of rules processed by the load balancer, averaged over an hour.\n- `HealthyHostCount`: The number of targets that are considered healthy.\n- `HTTPCode_Target_2XX_Count`: The number of HTTP 2XX response codes generated by the targets.\n- `HTTPCode_Target_3XX_Count`: The number of HTTP 3XX response codes generated by the targets.\n- `HTTPCode_Target_4XX_Count`: The number of HTTP 4XX response codes generated by the targets.\n- `HTTPCode_Target_5XX_Count`: The number of HTTP 5XX response codes generated by the targets.\n- `RequestCountPerTarget`: The average number of requests per target in a target group.\n- `TargetConnectionErrorCount`: The number of connections that were not successfully established between the load balancer and a target.\n- `TargetResponseTime`: The time elapsed (in seconds) from when a request leaves the load balancer until the target starts sending response headers.\n- `TargetTLSNegotiationErrorCount`: The number of TLS connections initiated by the load balancer that did not establish a session with the target.\n- `UnHealthyHostCount`: The number of targets that are considered unhealthy.\n- `HealthyStateDNS`: The number of zones that meet the DNS healthy state requirements.\n- `HealthyStateRouting`: The number of zones that meet the routing healthy state requirements.\n- `UnhealthyRoutingRequestCount`: The number of requests routed using the routing failover action (fail open).\n- `UnhealthyStateDNS`: The number of zones that do not meet the DNS healthy state requirements.\n- `UnhealthyStateRouting`: The number of zones that do not meet the routing healthy state requirements.\n- `LambdaInternalError`: The number of requests to a Lambda function that failed due to an issue internal to the load balancer or AWS Lambda.\n- `LambdaTargetProcessedBytes`: The total number of bytes processed by the load balancer for requests to and responses from a Lambda function.\n- `LambdaUserError`: The number of requests to a Lambda function that failed due to an issue with the Lambda function itself.\n- `ELBAuthError`: The number of user authentications that could not be completed due to an internal error.\n- `ELBAuthFailure`: The number of user authentications that could not be completed because the IdP denied access.\n- `ELBAuthLatency`: The time elapsed (in milliseconds) to query the IdP for the ID token and user info.\n- `ELBAuthRefreshTokenSuccess`: The number of times the load balancer successfully refreshed user claims using a refresh token.\n- `ELBAuthSuccess`: The number of successful authentication actions.\n- `ELBAuthUserClaimsSizeExceeded`: The number of times a configured IdP returned user claims that exceeded 11K bytes in size."),
                "threshold": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The threshold that triggers the alarm.\n\n---\n\nThe threshold is compared against the calculated value of `statistic(METRIC)`, where:\n- `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).\n- `METRIC` is the chosen metric."),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg"),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("application-load-balancer-error-rate"),
              "properties": z.object({
                "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when 4xx/5xx error rate exceeds this percentage.\n\n---\n\nExample: `5` fires the alarm if more than 5% of requests return errors."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("application-load-balancer-unhealthy-targets"),
              "properties": z.object({
                "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when the percentage of unhealthy targets exceeds this value.\n\n---\n\nIf the load balancer has multiple target groups, the alarm fires if *any* group breaches the threshold."),
                "onlyIncludeTargets": z.array(z.string()).optional().describe("#### Only monitor health of these target container services. If omitted, monitors all targets.\n\n---\n\nOnly services actually targeted by the load balancer can be listed.").optional(),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.") }).strict()
            }).strict()
          ]),
          "evaluation": z.object({
            "period": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Duration of one evaluation period in seconds. Must be a multiple of 60.").default(60),
            "evaluationPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many recent periods to evaluate. Prevents alarms from firing on short spikes.\n\n---\n\nExample: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached\nin at least 3 of the last 5 periods.").default(1),
            "breachedPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.\n\n---\n\nMust be ≤ `evaluationPeriods`.").default(1) }).strict()
          .optional().describe("#### How long and how often to evaluate the metric before triggering.\n\n---\n\nControls the evaluation window (period), how many periods to look at, and how many must breach\nthe threshold to fire the alarm. Useful for filtering out short spikes.").optional(),
          "notificationTargets": z.array(z.union([z.object({
              "type": z.literal("ms-teams"),
              "properties": z.object({
                "webhookUrl": z.string().describe("#### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.\n\n---\n\nCreate an Incoming Webhook connector in your Teams channel settings to get this URL.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("slack"),
              "properties": z.object({
                "conversationId": z.string().describe("#### The Slack channel or DM ID to send notifications to.\n\n---\n\nTo find the ID: open the channel, click its name, and look at the bottom of the **About** tab."),
                "accessToken": z.string().describe("#### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.\n\n---\n\nCreate a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("email"),
              "properties": z.object({
                "sender": z.string().describe("#### The email address of the sender."),
                "recipient": z.string().describe("#### The email address of the recipient.") }).strict()
            }).strict()
          ])).optional().describe("#### Where to send notifications when the alarm fires — Slack, MS Teams, or email.").optional(),
          "description": z.string().optional().describe("#### Custom alarm description used in notification messages and the AWS console.").optional() }).strict()
        ).optional().describe("#### Alarms for this load balancer (merged with global alarms from the Stacktape Console).").optional(),
        "disabledGlobalAlarms": z.array(z.string()).optional().describe("#### Global alarm names to exclude from this load balancer.").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this load balancer from common web exploits.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### HTTP/HTTPS load balancer with flat ~$18/month pricing. Required for WebSockets, firewalls, and gradual deployments.\n\n---\n\nRoutes requests to containers or Lambda functions based on path, host, headers, or query params.\nMore cost-effective than API Gateway above ~500k requests/day. AWS Free Tier eligible."), z.object({
      "type": z.literal("network-load-balancer"),
      "properties": z.object({
        "interface": z.enum(["internal","internet"]).optional().describe("#### `internet` (public) or `internal` (VPC-only)."),
        "customDomains": z.union([z.array(z.string()), z.array(z.object({
            "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
            "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
            "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
          )]).optional().describe("#### Custom domains.\n\n---\n\nBy default, Stacktape creates DNS records and TLS certificates for each domain.\nIf you manage DNS yourself, set `disableDnsRecordCreation` and provide `customCertificateArn`.\n\nBackward compatible format `string[]` is still supported.").optional(),
        "listeners": z.array(z.object({
          "protocol": z.enum(["TCP","TLS"]).describe("#### `TCP` (raw) or `TLS` (encrypted). TLS requires a certificate (auto-created with `customDomains` or via `customCertificateArns`)."),
          "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Port this listener accepts traffic on."),
          "customCertificateArns": z.array(z.string()).optional().describe("#### ARNs of your own ACM certificates. Not needed if using `customDomains` or TCP protocol.").optional(),
          "whitelistIps": z.array(z.string()).optional().describe("#### Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.").optional() }).strict()
        ).describe("#### Listeners define which ports and protocols (TCP/TLS) this load balancer accepts traffic on.") }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### TCP/TLS load balancer for non-HTTP traffic (MQTT, game servers, custom protocols).\n\n---\n\nHandles millions of connections with ultra-low latency. Use when you need raw TCP/TLS\ninstead of HTTP routing. Does not support CDN, firewall, or gradual deployments."), z.object({
      "type": z.literal("http-api-gateway"),
      "properties": z.object({
        "payloadFormat": z.enum(["1.0","2.0"]).optional().describe("#### Lambda event payload format. `2.0` is simpler and recommended for new projects.\n\n---\n\nOnly used if not overridden at the integration level.").optional(),
        "cors": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CORS. With no other options, uses permissive defaults (`*` origins, common headers).").default(false),
          "allowedOrigins": z.array(z.string()).optional().describe("#### Allowed origins (e.g., `https://myapp.com`). Use `*` for any origin.").default(["*"]),
          "allowedHeaders": z.array(z.string()).optional().describe("#### Allowed request headers in CORS preflight.").optional(),
          "allowedMethods": z.array(z.enum(["*","DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### Allowed HTTP methods. Auto-detected from integrations if not set.").optional(),
          "allowCredentials": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow cookies/auth headers in cross-origin requests.").optional(),
          "exposedResponseHeaders": z.array(z.string()).optional().describe("#### Response headers accessible to browser JavaScript.").optional(),
          "maxAge": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long (seconds) browsers can cache preflight responses.").optional() }).strict()
        .optional().describe("#### CORS settings. Overrides any CORS headers from your application code.").optional(),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable access logging.").default(false),
          "format": z.enum(["CLF","CSV","JSON","XML"]).optional().describe("#### Log format. Logs include: requestId, IP, method, status, protocol, responseLength."),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(30),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Access logging (request ID, IP, method, status, etc.). Viewable with `stacktape logs`.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
        "cdn": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.\n\n---\n\nCaches responses at edge locations worldwide so users get content from the nearest server.\nThe CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.").default(false),
          "cachingOptions": z.object({
            "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
            "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
            "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
            "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
            "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
            "cacheKeyParameters": z.object({
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
            .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
            "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
          .optional().describe("#### Control how long and what gets cached at the CDN edge.\n\n---\n\nWhen the origin response has no `Cache-Control` header, defaults apply:\n- **Bucket origins**: cached for 6 months (or until invalidated on deploy).\n- **API Gateway / Load Balancer origins**: not cached.").optional(),
          "forwardingOptions": z.object({
            "customRequestHeaders": z.array(z.object({
              "headerName": z.string().describe("#### Name of the header"),
              "value": z.string().describe("#### Value of the header") }).strict()
            ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
            "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
            "cookies": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
            "headers": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
              "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
              "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
              "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
            .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
            "queryString": z.object({
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
            "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
          .optional().describe("#### Control which headers, cookies, and query params are forwarded to your origin.\n\n---\n\nBy default, all headers/cookies/query params are forwarded. Use this to restrict\nwhat reaches your app (e.g., strip cookies for static content).").optional(),
          "routeRewrites": z.array(z.object({
            "path": z.string().describe("#### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported."),
            "routePrefix": z.string().optional().describe("#### Prepend a path prefix to requests before forwarding to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.").optional(),
            "routeTo": z.union([z.object({
                "type": z.literal("application-load-balancer"),
                "properties": z.object({
                  "loadBalancerName": z.string().describe("#### Name of the `application-load-balancer` resource to route to."),
                  "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Listener port on the load balancer. Only needed if using custom listeners.").optional(),
                  "originDomainName": z.string().optional().describe("#### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("http-api-gateway"),
                "properties": z.object({
                  "httpApiGatewayName": z.string().describe("#### Name of the `http-api-gateway` resource to route to.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("function"),
                "properties": z.object({
                  "functionName": z.string().describe("#### Name of the `function` resource to route to. The function must have `url.enabled: true`.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("custom-origin"),
                "properties": z.object({
                  "domainName": z.string().describe("#### Domain name of the external origin (e.g., `api.example.com`)."),
                  "protocol": z.enum(["HTTP","HTTPS"]).optional().describe("#### Protocol for connecting to the origin."),
                  "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("bucket"),
                "properties": z.object({
                  "bucketName": z.string().describe("#### Name of the `bucket` resource to route to."),
                  "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable clean URL normalization (e.g., `/about` → `/about.html`).").default(false) }).strict()
              }).strict()
            ]).optional().describe("#### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.\n\n---\n\nIf not set, requests go to the default origin (the resource this CDN is attached to).").optional(),
            "cachingOptions": z.object({
              "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
              "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
              "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
              "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
              "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
              "cacheKeyParameters": z.object({
                "cookies": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                  "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
                "headers": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
                "queryString": z.object({
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
              .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
              "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
            .optional().describe("#### Override caching behavior for requests matching this route.").optional(),
            "forwardingOptions": z.object({
              "customRequestHeaders": z.array(z.object({
                "headerName": z.string().describe("#### Name of the header"),
                "value": z.string().describe("#### Value of the header") }).strict()
              ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
              "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
                "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
                "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
              .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
              "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
            .optional().describe("#### Override which headers, cookies, and query params are forwarded for this route.").optional(),
            "edgeFunctions": z.object({
              "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
              "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
              "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
              "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
            .optional().describe("#### Run edge functions on requests/responses matching this route.").optional() }).strict()
          ).optional().describe("#### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).\n\n---\n\nEvaluated in order; first match wins. Unmatched requests go to the default origin.\nEach route can have its own caching and forwarding settings.").optional(),
          "customDomains": z.array(z.object({
            "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
            "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
            "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
          ).optional().describe("#### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
          "edgeFunctions": z.object({
            "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
            "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
            "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
            "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
          .optional().describe("#### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).\n\n---\n\n- `onRequest`: Before cache lookup — modify the request, add auth, or return early.\n- `onResponse`: Before returning to the client — modify headers, add cookies.").optional(),
          "cloudfrontPriceClass": z.enum(["PriceClass_100","PriceClass_200","PriceClass_All"]).optional().describe("#### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.\n\n---\n\n- **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.\n- **`PriceClass_200`**: Adds Asia, Middle East, Africa.\n- **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.\n\nThe CDN itself has no monthly base cost - you only pay per request and per GB transferred.\nThe price class controls which edge locations are used, and some regions cost more per request."),
          "defaultRoutePrefix": z.string().optional().describe("#### Prepend a path prefix to all requests forwarded to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.").optional(),
          "errorDocument": z.string().optional().describe("#### Page to show for 404 errors (e.g., `/error.html`).").default("/404.html"),
          "indexDocument": z.string().optional().describe("#### Page served for requests to `/`.").default("/index.html"),
          "disableInvalidationAfterDeploy": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip clearing the CDN cache after each deploy.\n\n---\n\nBy default, all cached content is flushed on every deploy so users see the latest version.\nSet to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.").default(false),
          "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.").optional() }).strict()
        .optional().describe("#### Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide.").optional(),
        "alarms": z.array(z.object({
          "trigger": z.union([z.object({
              "type": z.literal("http-api-gateway-error-rate"),
              "properties": z.object({
                "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when 4xx/5xx error rate exceeds this percentage."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("http-api-gateway-latency"),
              "properties": z.object({
                "thresholdMilliseconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when request-to-response latency exceeds this value (ms).\n\n---\n\nDefault: fires if **average** latency > threshold. Customize with `statistic` and `comparisonOperator`."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
          ]),
          "evaluation": z.object({
            "period": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Duration of one evaluation period in seconds. Must be a multiple of 60.").default(60),
            "evaluationPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many recent periods to evaluate. Prevents alarms from firing on short spikes.\n\n---\n\nExample: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached\nin at least 3 of the last 5 periods.").default(1),
            "breachedPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.\n\n---\n\nMust be ≤ `evaluationPeriods`.").default(1) }).strict()
          .optional().describe("#### How long and how often to evaluate the metric before triggering.\n\n---\n\nControls the evaluation window (period), how many periods to look at, and how many must breach\nthe threshold to fire the alarm. Useful for filtering out short spikes.").optional(),
          "notificationTargets": z.array(z.union([z.object({
              "type": z.literal("ms-teams"),
              "properties": z.object({
                "webhookUrl": z.string().describe("#### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.\n\n---\n\nCreate an Incoming Webhook connector in your Teams channel settings to get this URL.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("slack"),
              "properties": z.object({
                "conversationId": z.string().describe("#### The Slack channel or DM ID to send notifications to.\n\n---\n\nTo find the ID: open the channel, click its name, and look at the bottom of the **About** tab."),
                "accessToken": z.string().describe("#### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.\n\n---\n\nCreate a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("email"),
              "properties": z.object({
                "sender": z.string().describe("#### The email address of the sender."),
                "recipient": z.string().describe("#### The email address of the recipient.") }).strict()
            }).strict()
          ])).optional().describe("#### Where to send notifications when the alarm fires — Slack, MS Teams, or email.").optional(),
          "description": z.string().optional().describe("#### Custom alarm description used in notification messages and the AWS console.").optional() }).strict()
        ).optional().describe("#### Alarms for this API Gateway (merged with global alarms from the Stacktape Console).").optional(),
        "disabledGlobalAlarms": z.array(z.string()).optional().describe("#### Global alarm names to exclude from this API Gateway.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Serverless HTTP API with pay-per-request pricing (~$1/million requests).\n\n---\n\nRoutes HTTP requests to Lambda functions, containers, or other backends.\nNo servers to manage. Includes built-in throttling, CORS, and TLS."), z.object({
      "type": z.literal("bucket"),
      "properties": z.object({
        "directoryUpload": z.object({
          "directoryPath": z.string().describe("#### Path to the local directory to upload (relative to project root).\n\n---\n\nThe bucket will mirror this directory exactly — existing files not in the directory are deleted."),
          "fileOptions": z.array(z.object({
            "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
            "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
            "headers": z.array(z.object({
              "key": z.string().describe("#### Key"),
              "value": z.string().describe("#### Value") }).strict()
            ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
            "tags": z.array(z.object({
              "key": z.string().describe("#### Key"),
              "value": z.string().describe("#### Value") }).strict()
            ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
          ).optional().describe("#### Set HTTP headers or tags on files matching specific patterns.").optional(),
          "excludeFilesPatterns": z.array(z.string()).optional().describe("#### Glob patterns for files to skip during upload (relative to `directoryPath`).").optional(),
          "headersPreset": z.enum(["astro-static-website","gatsby-static-website","nuxt-static-website","single-page-app","static-website","sveltekit-static-website"]).optional().describe("#### Preset for HTTP caching headers, optimized for your frontend framework.\n\n---\n\n- **`single-page-app`**: HTML never cached, hashed assets cached forever. For React/Vue/Angular SPAs.\n- **`static-website`**: CDN-cached, never browser-cached. For generic static sites.\n- **`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**: Framework-specific\n  caching (hashed build assets cached forever, HTML always fresh).\n\nOverride individual files with `fileOptions`.").optional(),
          "disableS3TransferAcceleration": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable faster uploads via S3 Transfer Acceleration. Saves a small per-GB cost.").default(false) }).strict()
        .optional().describe("#### Sync a local directory to this bucket on every deploy.\n\n---\n\n> **Warning:** Replaces all existing bucket contents. Don't use for buckets\n> with user-uploaded or application-generated files.").optional(),
        "accessibility": z.object({
          "accessibilityMode": z.enum(["private","public-read","public-read-write"]).describe("#### Configures pre-defined accessibility modes for the bucket.\n\n---\n\nThis allows you to easily configure the most common access patterns.\n\nAvailable modes:\n- `public-read-write`: Everyone can read from and write to the bucket.\n- `public-read`: Everyone can read from the bucket. Only compute resources and entities with sufficient IAM permissions can write to it.\n- `private` (default): Only compute resources and entities with sufficient IAM permissions can read from or write to the bucket.\n\nFor functions, batch jobs, and container workloads, you can grant the required IAM permissions using the `allowsAccessTo` or `iamRoleStatements` properties in their respective configurations."),
          "accessPolicyStatements": z.array(z.object({
            "Principal": z.any(),
            "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
            "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions.").default("Allow"),
            "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
            "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
            "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
          ).optional().describe("#### Advanced access configuration that leverages IAM policy statements.\n\n---\n\nThis gives you fine-grained access control over the bucket.").optional() }).strict()
        .optional().describe("#### Who can read/write to this bucket: `private` (default), `public-read`, or `public-read-write`.").optional(),
        "cors": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CORS. When `true` with no rules, uses permissive defaults (`*` origins, all methods)."),
          "corsRules": z.array(z.object({
            "allowedOrigins": z.array(z.string()).optional().describe("#### Allowed origins (e.g., `https://example.com`). Use `*` for any.").optional(),
            "allowedHeaders": z.array(z.string()).optional().describe("#### Allowed request headers.").optional(),
            "allowedMethods": z.array(z.enum(["*","DELETE","GET","HEAD","PATCH","POST","PUT"])).optional().describe("#### Allowed HTTP methods.").optional(),
            "exposedResponseHeaders": z.array(z.string()).optional().describe("#### Response headers accessible to browser JavaScript.").optional(),
            "maxAge": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long (seconds) browsers can cache preflight responses.").optional() }).strict()
          ).optional().describe("#### Custom CORS rules. First matching rule wins for each preflight request.").optional() }).strict()
        .optional().describe("#### CORS settings for browser-based access to the bucket.").optional(),
        "versioning": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Keep previous versions of overwritten/deleted objects. Helps recover from mistakes.").optional(),
        "encryption": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Encrypt stored objects at rest (AES-256).").optional(),
        "lifecycleRules": z.array(z.union([z.object({
            "type": z.literal("expiration"),
            "properties": z.object({
              "daysAfterUpload": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Delete objects this many days after upload."),
              "prefix": z.string().optional().describe("#### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).").optional(),
              "tags": z.array(z.object({
                "key": z.string().describe("#### Key"),
                "value": z.string().describe("#### Value") }).strict()
              ).optional().describe("#### Only apply this rule to objects with these tags.").optional() }).strict()
          }).strict()
          , z.object({
            "type": z.literal("non-current-version-expiration"),
            "properties": z.object({
              "daysAfterVersioned": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Delete old versions this many days after they become non-current. Requires `versioning: true`."),
              "prefix": z.string().optional().describe("#### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).").optional(),
              "tags": z.array(z.object({
                "key": z.string().describe("#### Key"),
                "value": z.string().describe("#### Value") }).strict()
              ).optional().describe("#### Only apply this rule to objects with these tags.").optional() }).strict()
          }).strict()
          , z.object({
            "type": z.literal("class-transition"),
            "properties": z.object({
              "daysAfterUpload": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Move objects to a cheaper storage class this many days after upload."),
              "storageClass": z.enum(["DEEP_ARCHIVE","GLACIER","INTELLIGENT_TIERING","ONEZONE_IA","STANDARD_IA"]).describe("#### Target storage class. Cheaper classes have higher retrieval costs/latency.\n\n---\n\n- `STANDARD_IA` / `ONEZONE_IA`: Infrequent access, instant retrieval.\n- `INTELLIGENT_TIERING`: AWS auto-moves between tiers based on access patterns.\n- `GLACIER`: Archive, minutes to hours for retrieval.\n- `DEEP_ARCHIVE`: Cheapest, 12+ hours for retrieval."),
              "prefix": z.string().optional().describe("#### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).").optional(),
              "tags": z.array(z.object({
                "key": z.string().describe("#### Key"),
                "value": z.string().describe("#### Value") }).strict()
              ).optional().describe("#### Only apply this rule to objects with these tags.").optional() }).strict()
          }).strict()
          , z.object({
            "type": z.literal("non-current-version-class-transition"),
            "properties": z.object({
              "daysAfterVersioned": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Move old versions to a cheaper storage class this many days after becoming non-current."),
              "storageClass": z.enum(["DEEP_ARCHIVE","GLACIER","INTELLIGENT_TIERING","ONEZONE_IA","STANDARD_IA"]).describe("#### Target storage class for non-current versions."),
              "prefix": z.string().optional().describe("#### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).").optional(),
              "tags": z.array(z.object({
                "key": z.string().describe("#### Key"),
                "value": z.string().describe("#### Value") }).strict()
              ).optional().describe("#### Only apply this rule to objects with these tags.").optional() }).strict()
          }).strict()
          , z.object({
            "type": z.literal("abort-incomplete-multipart-upload"),
            "properties": z.object({
              "daysAfterInitiation": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Clean up incomplete multipart uploads after this many days. Prevents storage waste."),
              "prefix": z.string().optional().describe("#### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).").optional(),
              "tags": z.array(z.object({
                "key": z.string().describe("#### Key"),
                "value": z.string().describe("#### Value") }).strict()
              ).optional().describe("#### Only apply this rule to objects with these tags.").optional() }).strict()
          }).strict()
        ])).optional().describe("#### Auto-delete or move objects to cheaper storage classes over time.\n\n---\n\nUse to control storage costs: expire old files, archive infrequently accessed data,\nor clean up incomplete uploads.").optional(),
        "enableEventBusNotifications": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Send events (object created, deleted, etc.) to EventBridge for event-driven workflows.").default(false),
        "cdn": z.object({
          "rewriteRoutesForSinglePageApp": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Rewrites incoming requests to work for a single-page application.\n\n---\n\nThe routing works as follows:\n- If the path has an extension (e.g., `.css`, `.js`, `.png`), the request is not rewritten, and the appropriate file is returned.\n- If the path does not have an extension, the request is routed to `index.html`.\n\nThis allows single-page applications to handle routing on the client side.").optional(),
          "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disables URL normalization.\n\n---\n\nURL normalization is enabled by default and is useful for serving HTML files from the bucket with clean URLs.").default(false),
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.\n\n---\n\nCaches responses at edge locations worldwide so users get content from the nearest server.\nThe CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.").default(false),
          "cachingOptions": z.object({
            "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
            "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
            "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
            "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
            "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
            "cacheKeyParameters": z.object({
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
            .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
            "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
          .optional().describe("#### Control how long and what gets cached at the CDN edge.\n\n---\n\nWhen the origin response has no `Cache-Control` header, defaults apply:\n- **Bucket origins**: cached for 6 months (or until invalidated on deploy).\n- **API Gateway / Load Balancer origins**: not cached.").optional(),
          "forwardingOptions": z.object({
            "customRequestHeaders": z.array(z.object({
              "headerName": z.string().describe("#### Name of the header"),
              "value": z.string().describe("#### Value of the header") }).strict()
            ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
            "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
            "cookies": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
            "headers": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
              "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
              "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
              "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
            .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
            "queryString": z.object({
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
            "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
          .optional().describe("#### Control which headers, cookies, and query params are forwarded to your origin.\n\n---\n\nBy default, all headers/cookies/query params are forwarded. Use this to restrict\nwhat reaches your app (e.g., strip cookies for static content).").optional(),
          "routeRewrites": z.array(z.object({
            "path": z.string().describe("#### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported."),
            "routePrefix": z.string().optional().describe("#### Prepend a path prefix to requests before forwarding to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.").optional(),
            "routeTo": z.union([z.object({
                "type": z.literal("application-load-balancer"),
                "properties": z.object({
                  "loadBalancerName": z.string().describe("#### Name of the `application-load-balancer` resource to route to."),
                  "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Listener port on the load balancer. Only needed if using custom listeners.").optional(),
                  "originDomainName": z.string().optional().describe("#### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("http-api-gateway"),
                "properties": z.object({
                  "httpApiGatewayName": z.string().describe("#### Name of the `http-api-gateway` resource to route to.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("function"),
                "properties": z.object({
                  "functionName": z.string().describe("#### Name of the `function` resource to route to. The function must have `url.enabled: true`.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("custom-origin"),
                "properties": z.object({
                  "domainName": z.string().describe("#### Domain name of the external origin (e.g., `api.example.com`)."),
                  "protocol": z.enum(["HTTP","HTTPS"]).optional().describe("#### Protocol for connecting to the origin."),
                  "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("bucket"),
                "properties": z.object({
                  "bucketName": z.string().describe("#### Name of the `bucket` resource to route to."),
                  "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable clean URL normalization (e.g., `/about` → `/about.html`).").default(false) }).strict()
              }).strict()
            ]).optional().describe("#### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.\n\n---\n\nIf not set, requests go to the default origin (the resource this CDN is attached to).").optional(),
            "cachingOptions": z.object({
              "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
              "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
              "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
              "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
              "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
              "cacheKeyParameters": z.object({
                "cookies": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                  "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
                "headers": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
                "queryString": z.object({
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
              .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
              "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
            .optional().describe("#### Override caching behavior for requests matching this route.").optional(),
            "forwardingOptions": z.object({
              "customRequestHeaders": z.array(z.object({
                "headerName": z.string().describe("#### Name of the header"),
                "value": z.string().describe("#### Value of the header") }).strict()
              ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
              "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
                "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
                "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
              .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
              "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
            .optional().describe("#### Override which headers, cookies, and query params are forwarded for this route.").optional(),
            "edgeFunctions": z.object({
              "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
              "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
              "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
              "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
            .optional().describe("#### Run edge functions on requests/responses matching this route.").optional() }).strict()
          ).optional().describe("#### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).\n\n---\n\nEvaluated in order; first match wins. Unmatched requests go to the default origin.\nEach route can have its own caching and forwarding settings.").optional(),
          "customDomains": z.array(z.object({
            "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
            "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
            "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
          ).optional().describe("#### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
          "edgeFunctions": z.object({
            "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
            "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
            "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
            "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
          .optional().describe("#### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).\n\n---\n\n- `onRequest`: Before cache lookup — modify the request, add auth, or return early.\n- `onResponse`: Before returning to the client — modify headers, add cookies.").optional(),
          "cloudfrontPriceClass": z.enum(["PriceClass_100","PriceClass_200","PriceClass_All"]).optional().describe("#### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.\n\n---\n\n- **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.\n- **`PriceClass_200`**: Adds Asia, Middle East, Africa.\n- **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.\n\nThe CDN itself has no monthly base cost - you only pay per request and per GB transferred.\nThe price class controls which edge locations are used, and some regions cost more per request."),
          "defaultRoutePrefix": z.string().optional().describe("#### Prepend a path prefix to all requests forwarded to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.").optional(),
          "errorDocument": z.string().optional().describe("#### Page to show for 404 errors (e.g., `/error.html`).").default("/404.html"),
          "indexDocument": z.string().optional().describe("#### Page served for requests to `/`.").default("/index.html"),
          "disableInvalidationAfterDeploy": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip clearing the CDN cache after each deploy.\n\n---\n\nBy default, all cached content is flushed on every deploy so users see the latest version.\nSet to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.").default(false),
          "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.").optional() }).strict()
        .optional().describe("#### Put a CDN (CloudFront) in front of this bucket for faster downloads and lower bandwidth costs.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### S3 storage bucket for files, images, backups, or any binary data.\n\n---\n\nPay only for what you store and transfer. Highly durable (99.999999999%)."), z.object({
      "type": z.literal("user-auth-pool"),
      "properties": z.object({
        "allowOnlyAdminsToCreateAccount": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Restrict account creation to administrators\n\n---\n\nIf enabled, new users can't sign up themselves. Accounts must be created through an admin flow (for example from an internal admin tool or script),\nwhich helps prevent unwanted self-registrations.\n\nInternally this controls `AdminCreateUserConfig.AllowAdminCreateUserOnly` on the Cognito user pool\n([AWS::Cognito::UserPool](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).").default(false),
        "unusedAccountValidityDays": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Expire unused admin-created accounts\n\n---\n\nWhen an admin creates a user account, Cognito issues a temporary password. This setting controls how many days that temporary password\n(and the corresponding account) stays valid if the user never signs in.\n\nInternally this maps to `AdminCreateUserConfig.UnusedAccountValidityDays`.").default(31),
        "requireEmailVerification": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### (Reserved) Require verified emails\n\n---\n\nPresent for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,\nnot from this flag directly.\n\nTo require email-based verification today, use `userVerificationType: 'email-link' | 'email-code'` instead.").optional(),
        "requirePhoneNumberVerification": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### (Reserved) Require verified phone numbers\n\n---\n\nPresent for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,\nnot from this flag directly.\n\nTo require SMS-based verification today, use `userVerificationType: 'sms'`.").optional(),
        "enableHostedUi": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Enable the Cognito Hosted UI\n\n---\n\nTurns on Cognito's Hosted UI – a pre-built, hosted login and registration page – so you don't have to build your own auth screens.\nThis is useful when you want to get started quickly or keep authentication logic outside of your main app.").default(false),
        "hostedUiDomainPrefix": z.string().optional().describe("#### Hosted UI domain prefix\n\n---\n\nSets the first part of your Hosted UI URL: `https://<prefix>.auth.<region>.amazoncognito.com`.\nPick something that matches your project or company name.").optional(),
        "hostedUiCSS": z.string().optional().describe("#### Custom CSS for the Hosted UI\n\n---\n\nLets you override the default Cognito Hosted UI styling with your own CSS (colors, fonts, layouts, etc.),\nso the login experience matches the rest of your application.\n\nBehind the scenes this is applied using the `AWS::Cognito::UserPoolUICustomizationAttachment` resource.").optional(),
        "hooks": z.object({
          "customMessage": z.string().optional().describe("#### Custom message hook\n\nTriggered whenever Cognito is about to send an email or SMS (sign‑up, verification, password reset, etc.).\nLets you fully customize message contents or dynamically choose language/branding.\n\nValue must be the ARN of a Lambda function configured to handle the \"Custom Message\" trigger.").optional(),
          "postAuthentication": z.string().optional().describe("#### Post-authentication hook\n\nRuns after a user has successfully authenticated. You can use this to record analytics, update last‑login timestamps,\nor block access based on additional checks.").optional(),
          "postConfirmation": z.string().optional().describe("#### Post-confirmation hook\n\nRuns right after a user confirms their account (for example via email link or admin confirmation).\nThis is often used to create user records in your own database or to provision resources.").optional(),
          "preAuthentication": z.string().optional().describe("#### Pre-authentication hook\n\nInvoked just before Cognito validates a user's credentials. You can use this to block sign‑in attempts\nbased on IP, device, or user state (for example, soft‑deleting an account).").optional(),
          "preSignUp": z.string().optional().describe("#### Pre-sign-up hook\n\nCalled before a new user is created. Useful for validating input, auto‑confirming trusted users,\nor blocking sign‑ups that don't meet your business rules.").optional(),
          "preTokenGeneration": z.string().optional().describe("#### Pre-token-generation hook\n\nRuns right before Cognito issues tokens. Lets you customize token claims (for example, adding roles or flags)\nbased on external systems or additional logic.").optional(),
          "userMigration": z.string().optional().describe("#### User migration hook\n\nLets you migrate users on‑the‑fly from another user store. When someone tries to sign in but doesn't exist in Cognito,\nthis trigger can look them up elsewhere, import them, and let the sign‑in continue.").optional(),
          "createAuthChallenge": z.string().optional().describe("#### Create auth challenge hook\n\nPart of Cognito's custom auth flow. This trigger is used to generate a challenge (for example sending a custom OTP)\nafter `DefineAuthChallenge` decides a challenge is needed.").optional(),
          "defineAuthChallenge": z.string().optional().describe("#### Define auth challenge hook\n\nAlso part of the custom auth flow. It decides whether a user needs another challenge, has passed, or has failed,\nbased on previous challenges and responses.").optional(),
          "verifyAuthChallengeResponse": z.string().optional().describe("#### Verify auth challenge response hook\n\nValidates the user's response to a custom challenge (for example, checking an OTP the user provides).").optional() }).strict()
        .optional().describe("#### Lambda triggers for the user pool\n\n---\n\nConnects AWS Lambda functions to Cognito \"hooks\" (triggers) such as pre-sign-up, post-confirmation, or token generation.\nYou can use these to enforce additional validation, enrich user profiles, migrate users from another system, and more.\n\nInternally this maps to the Cognito user pool `LambdaConfig`.").optional(),
        "emailConfiguration": z.object({
          "sesAddressArn": z.string().optional().describe("#### SES identity to send emails from\n\n---\n\nARN of an SES verified identity (email address or domain) that Cognito should use when sending emails.\nRequired when you want full control over sending (for example for MFA via `EMAIL_OTP`), because Cognito\nmust switch into `DEVELOPER` email sending mode.").optional(),
          "from": z.string().optional().describe("#### From address\n\n---\n\nThe email address that appears in the \"From\" field of messages sent by Cognito (if you're using SES).\nThis address must be verified in SES if you're sending through your own identity.").optional(),
          "replyToEmailAddress": z.string().optional().describe("#### Reply-to address\n\n---\n\nOptional address where replies to Cognito emails should be delivered.\nIf not set, replies go to the `from` address (or the default Cognito sender).").optional() }).strict()
        .optional().describe("#### Email delivery settings\n\n---\n\nControls how Cognito sends emails (verification messages, password reset codes, admin invitations, etc.).\nYou can either use Cognito's built-in email service or plug in your own SES identity for full control over the sender.\n\nThis config is used to build the Cognito `EmailConfiguration` block\n([AWS docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).").optional(),
        "inviteMessageConfig": z.object({
          "emailMessage": z.string().optional().describe("#### Invitation email body\n\n---\n\nThe text of the email sent when an administrator creates a new user.\nYou can reference placeholders like `{username}` and `{####}` (temporary password or code) in the message.").optional(),
          "emailSubject": z.string().optional().describe("#### Invitation email subject").optional(),
          "smsMessage": z.string().optional().describe("#### Invitation SMS body\n\n---\n\nThe content of the SMS message sent when new users are created with a phone number.\nAs with email, you can include placeholders such as `{username}` and `{####}`.").optional() }).strict()
        .optional().describe("#### Invite message overrides\n\n---\n\nCustomizes the contents of the \"invitation\" message that users receive when an administrator creates their account\n(for example, when sending a temporary password and sign-in instructions).\n\nIf you want to send custom emails through SES, you must also configure `emailConfiguration.sesAddressArn`.").optional(),
        "userVerificationType": z.enum(["email-code","email-link","none","sms"]).optional().describe("#### Verification strategy\n\n---\n\nChooses how new users prove that they own their contact information:\n\n- `email-link`: Cognito emails a clickable link.\n- `email-code`: Cognito emails a short numeric code.\n- `sms`: Cognito sends a code via SMS to the user's phone number.\n- `none`: Users aren't required to verify email or phone during sign-up.\n\nStacktape uses this value to configure `AutoVerifiedAttributes` and `VerificationMessageTemplate`\non the underlying Cognito user pool.").optional(),
        "userVerificationMessageConfig": z.object({
          "emailMessageUsingCode": z.string().optional().describe("#### Email body when verifying with a code\n\nUsed when `userVerificationType` is `email-code`. The message typically contains a `{####}` placeholder\nthat Cognito replaces with a one‑time verification code.").optional(),
          "emailMessageUsingLink": z.string().optional().describe("#### Email body when verifying with a link\n\nUsed when `userVerificationType` is `email-link`. Cognito replaces special markers like `{##verify your email##}`\nwith a clickable URL.").optional(),
          "emailSubjectUsingCode": z.string().optional().describe("#### Email subject when verifying with a code").optional(),
          "emailSubjectUsingLink": z.string().optional().describe("#### Email subject when verifying with a link").optional(),
          "smsMessage": z.string().optional().describe("#### SMS verification message\n\n---\n\nText of the SMS Cognito sends when verifying a phone number (for example containing `{####}`).").optional() }).strict()
        .optional().describe("#### Verification message text\n\n---\n\nLets you customize the exact email and SMS texts that Cognito sends when asking users to verify their email / phone.\nFor example, you can change subjects, body text, or the message that contains the `{####}` verification code.").optional(),
        "mfaConfiguration": z.object({
          "status": z.enum(["OFF","ON","OPTIONAL"]).optional().describe("#### MFA requirement\n\n- `OFF`: MFA is completely disabled.\n- `ON`: All users must complete MFA during sign‑in.\n- `OPTIONAL`: Users can opt in to MFA; it's recommended but not strictly required.\n\nThis value configures the Cognito `MfaConfiguration` property.").optional(),
          "enabledTypes": z.array(z.enum(["EMAIL_OTP","SMS","SOFTWARE_TOKEN"])).optional().describe("#### Enabled MFA factor types\n\n---\n\nChooses which MFA methods users can use:\n\n- `SMS`: One‑time codes are sent via text message. Requires an SNS role so Cognito can send SMS.\n- `SOFTWARE_TOKEN`: Time‑based one‑time codes from an authenticator app.\n- `EMAIL_OTP`: Codes are sent by email. AWS requires that you configure a developer email sending identity\n  (which Stacktape does when you provide `emailConfiguration.sesAddressArn`).\n\nThese values are mapped to Cognito's `EnabledMfas` setting (`SMS_MFA`, `SOFTWARE_TOKEN_MFA`, `EMAIL_OTP`),\nwhose behavior is described in\n[EnabledMfas in the AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool).").optional() }).strict()
        .optional().describe("#### Multi-factor authentication\n\n---\n\nControls whether you use Multi‑Factor Authentication (MFA) and which second factors are allowed.\nMFA makes it much harder for attackers to access accounts even if they know a user's password.\n\nUnder the hood this config drives both the `MfaConfiguration` and `EnabledMfas` properties in Cognito\n(see \"MFA configuration\" in the\n[AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).").optional(),
        "passwordPolicy": z.object({
          "minimumLength": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum password length\n\nThe fewest characters a password can have. Longer passwords are generally more secure.").optional(),
          "requireLowercase": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Require at least one lowercase letter").optional(),
          "requireNumbers": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Require at least one number").optional(),
          "requireSymbols": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Require at least one symbol\n\nSymbols are non‑alphanumeric characters such as `!`, `@`, or `#`.").optional(),
          "requireUppercase": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Require at least one uppercase letter").optional(),
          "temporaryPasswordValidityDays": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Temporary password validity (days)\n\nHow long a temporary password issued to a new user is valid before it must be changed on first sign‑in.").optional() }).strict()
        .optional().describe("#### Password strength rules\n\n---\n\nDefines how strong user passwords must be – minimum length and whether they must include lowercase, uppercase,\nnumbers, and/or symbols – plus how long temporary passwords issued to new users remain valid.\n\nThis is applied to the Cognito `Policies.PasswordPolicy` block.").optional(),
        "schema": z.array(z.object({
          "name": z.string().optional().describe("#### Attribute name\n\nThe logical name of the attribute as it appears on the user (for example `given_name`, `plan`, or `tenantId`).").optional(),
          "attributeDataType": z.string().optional().describe("#### Attribute data type\n\nThe value type stored for this attribute (`String`, `Number`, etc.).\nThis is passed to Cognito's `AttributeDataType`.").optional(),
          "developerOnlyAttribute": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Developer-only attribute\n\nIf true, the attribute is only readable/writable by privileged backend code and not exposed to end users directly.").optional(),
          "mutable": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Mutable after sign-up\n\nControls whether the attribute can be changed after it has been initially set.").optional(),
          "required": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Required at sign-up\n\nIf true, users must supply this attribute when creating an account.").optional(),
          "numberMaxValue": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum numeric value").optional(),
          "numberMinValue": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum numeric value").optional(),
          "stringMaxLength": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum string length").optional(),
          "stringMinLength": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum string length").optional() }).strict()
        ).optional().describe("#### Custom attributes schema\n\n---\n\nLets you define additional attributes (like `role`, `plan`, `companyId`, etc.) that are stored on each user,\nincluding their data type and validation constraints.\n\nThese translate into the Cognito user pool `Schema` entries\n([schema docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).").optional(),
        "allowPhoneNumberAsUserName": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow phone numbers as usernames\n\n---\n\nIf enabled (the default), users can sign in using their phone number in addition to any traditional username.\nTurning this off means phone numbers can still be stored, but can't be used to log in.\n\nThis is implemented via Cognito's `UsernameAttributes` configuration.").default(true),
        "allowEmailAsUserName": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow email addresses as usernames\n\n---\n\nIf enabled (the default), users can sign in using their email address instead of a dedicated username.\nTurning this off means emails can still be stored, but can't be used to log in directly.\n\nThis is also controlled through Cognito `UsernameAttributes`.").default(true),
        "accessTokenValiditySeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Access token lifetime\n\n---\n\nControls how long an access token issued by Cognito stays valid after login. Shorter lifetimes reduce the window\nin which a stolen token can be abused, at the cost of more frequent refreshes.\n\nThis value is passed to the user pool client as `AccessTokenValidity`.").optional(),
        "idTokenValiditySeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### ID token lifetime\n\n---\n\nControls how long an ID token (which contains user profile and claims) is accepted before clients must obtain a new one.\n\nThis is set on the user pool client as `IdTokenValidity`.").optional(),
        "refreshTokenValidityDays": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Refresh token lifetime\n\n---\n\nSets for how many days a refresh token can be used to obtain new access / ID tokens without requiring the user to sign in again.\nLonger lifetimes mean fewer re-authentications, but keep sessions alive for longer.\n\nThis value is used as `RefreshTokenValidity` on the Cognito user pool client.").optional(),
        "allowedOAuthFlows": z.array(z.enum(["client_credentials","code","implicit"])).optional().describe("#### OAuth flows\n\n---\n\nSpecifies which OAuth 2.0 flows the user pool client is allowed to use:\n\n- `code`: Authorization Code flow (recommended for web apps and backends).\n- `implicit`: Implicit flow (legacy browser-only flow).\n- `client_credentials`: Server‑to‑server (no end user) machine credentials.\n\nThese values populate `AllowedOAuthFlows` on the Cognito user pool client\n([AWS::Cognito::UserPoolClient](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient)).").optional(),
        "allowedOAuthScopes": z.array(z.string()).optional().describe("#### OAuth scopes\n\n---\n\nLists which scopes clients can request when using OAuth (for example `email`, `openid`, `profile`).\nScopes control which user information and permissions your app receives in tokens.\n\nThese values are passed to the user pool client as `AllowedOAuthScopes`.").optional(),
        "callbackURLs": z.array(z.string()).optional().describe("#### OAuth callback URLs\n\n---\n\nThe allowed URLs where Cognito is permitted to redirect users after successful authentication.\nThese must exactly match the URLs registered with your frontend / backend, otherwise the redirect will fail.\n\nMapped into `CallbackURLs` and `DefaultRedirectURI` on the user pool client.").optional(),
        "logoutURLs": z.array(z.string()).optional().describe("#### OAuth logout URLs\n\n---\n\nThe URLs Cognito can redirect users to after they log out of the Hosted UI or end their session.\nMust also be explicitly configured so that sign-out redirects don't fail.\n\nThese populate the `LogoutURLs` list on the user pool client.").optional(),
        "identityProviders": z.array(z.object({
          "type": z.enum(["Facebook","Google","LoginWithAmazon","OIDC","SAML","SignInWithApple"]).describe("#### Provider type\n\n---\n\nThe kind of external identity provider you want to integrate:\n\n- `Facebook`, `Google`, `LoginWithAmazon`, `SignInWithApple`: social identity providers.\n- `OIDC`: a generic OpenID Connect provider.\n- `SAML`: a SAML 2.0 identity provider (often used for enterprise SSO)."),
          "clientId": z.string().describe("#### OAuth / OIDC client ID\n\n---\n\nThe client ID (sometimes called app ID) that you obtained from the external provider's console.\nCognito presents this ID when redirecting users to the provider."),
          "clientSecret": z.string().describe("#### OAuth / OIDC client secret\n\n---\n\nThe client secret associated with the `clientId`, used by Cognito when exchanging authorization codes for tokens.\nThis value should be kept confidential and only configured from secure sources."),
          "attributeMapping": z.record(z.string(), z.string()).optional().describe("#### Attribute mapping\n\n---\n\nMaps attributes from the external provider (for example `email`, `given_name`) to Cognito user pool attributes.\nKeys are Cognito attribute names, values are attribute names from the identity provider.\n\nIf not provided, Stacktape defaults to mapping `email -> email`.").optional(),
          "authorizeScopes": z.array(z.string()).optional().describe("#### Requested scopes\n\n---\n\nAdditional OAuth scopes to request from the identity provider (for example `openid`, `email`, `profile`).\nThese control which pieces of user information and permissions your app receives in the provider's tokens.\n\nIf omitted, Stacktape uses a reasonable default per provider (see\n[AWS::Cognito::UserPoolIdentityProvider](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolidentityprovider)).").optional(),
          "providerDetails": z.record(z.string(), z.never()).optional().describe("#### Advanced provider options\n\n---\n\nLow‑level configuration passed directly into Cognito's `ProviderDetails` map.\nYou can use this to override endpoints or supply provider‑specific keys as documented by AWS,\nfor example `authorize_url`, `token_url`, `attributes_request_method`, `oidc_issuer`, and others.\n\nIn most cases you don't need to set this – Stacktape configures sensible defaults for common providers.").optional() }).strict()
        ).optional().describe("#### External identity providers\n\n---\n\nAllows users to sign in with third‑party identity providers like Google, Facebook, Login with Amazon, OIDC, SAML, or Sign in with Apple.\nEach entry configures one external provider (client ID/secret, attribute mapping, requested scopes, and advanced provider‑specific options).\n\nUnder the hood Stacktape creates separate `AWS::Cognito::UserPoolIdentityProvider` resources and registers them\nin the user pool client's `SupportedIdentityProviders`.").optional(),
        "useFirewall": z.string().optional().describe("#### Associate a WAF\n\n---\n\nLinks the user pool to a `web-app-firewall` resource, so requests to the Hosted UI and token endpoints are inspected\nby AWS WAF rules you configure in Stacktape.\n\nStacktape does this by creating a `WebACLAssociation` between the user pool and the referenced firewall.").optional(),
        "customDomain": z.object({
          "domainName": z.string().describe("#### Domain Name\n\n---\n\nFully qualified domain name for the Cognito Hosted UI (e.g., `auth.example.com`)."),
          "customCertificateArn": z.string().optional().describe("#### Custom Certificate ARN\n\n---\n\nARN of an ACM certificate in **us-east-1** to use for this domain.\nBy default, Stacktape uses the certificate associated with your domain in us-east-1.\n\nThe certificate must be in us-east-1 because Cognito uses CloudFront for custom domains.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable DNS Record Creation\n\n---\n\nIf `true`, Stacktape will not create a DNS record for this domain.").default(false) }).strict()
        .optional().describe("#### Custom Domain\n\n---\n\nConfigures a custom domain for the Cognito Hosted UI (e.g., `auth.example.com`).\n\nWhen configured, Cognito creates a CloudFront distribution to serve your custom domain.\nStacktape automatically:\n- Configures the user pool domain with your custom domain and an ACM certificate from us-east-1\n- Creates a DNS record pointing to the CloudFront distribution\n\nThe domain must be registered and verified in your Stacktape account with a valid ACM certificate in us-east-1.").optional(),
        "generateClientSecret": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Generate a client secret\n\n---\n\nAsks Cognito to generate a secret for the user pool client. Use this when you have trusted backends (like APIs or server‑side apps)\nthat can safely store a client secret and use confidential OAuth flows.\n\nThis flag controls the `GenerateSecret` property on the user pool client.").default(false),
        "allowOnlyExternalIdentityProviders": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Force external identity providers\n\n---\n\nIf `true`, users can't sign in with a username/password against the Cognito user directory at all.\nInstead, they must always use one of the configured external identity providers (Google, SAML, etc.).\n\nInternally this removes `COGNITO` from `SupportedIdentityProviders` on the user pool client.").default(false) }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### A resource for managing user authentication and authorization.\n\n---\n\nA user pool is a fully managed identity provider that handles user sign-up, sign-in, and access control.\nIt provides a secure and scalable way to manage user identities for your applications."), z.object({
      "type": z.literal("event-bus"),
      "properties": z.object({
        "eventSourceName": z.string().optional().describe("#### Partner event source name. Only needed for receiving events from third-party SaaS integrations.").optional(),
        "archivation": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable event archiving. Disabling deletes the archive.").default(false),
          "retentionDays": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Days to keep archived events. Omit to keep indefinitely.").optional() }).strict()
        .optional().describe("#### Archive events to store and replay them later. Useful for debugging, testing, or error recovery.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Central event bus for decoupling services. Publish events and trigger functions, queues, or batch jobs.\n\n---\n\nUse to build event-driven architectures where producers and consumers are independent.\nFunctions, batch jobs, and other resources can subscribe to specific event patterns."), z.object({
      "type": z.literal("bastion"),
      "properties": z.object({
        "instanceSize": z.string().optional().describe("#### EC2 instance type. `t3.micro` is sufficient for SSH tunneling and basic admin tasks."),
        "runCommandsAtLaunch": z.array(z.string()).optional().describe("#### Shell commands to run when the instance starts (as root — no `sudo` needed).\n\n---\n\nUse to install CLI tools, database clients, or other dependencies.\n**Warning:** changing this list after creation replaces the instance — any data on the old instance is lost.").optional(),
        "logging": z.object({
          "messages": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable this log type. Stops sending to CloudWatch.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### Days to keep logs in CloudWatch before automatic deletion.").optional(),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### System messages (`/var/log/messages`) — startup info, kernel messages, service logs."),
          "secure": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable this log type. Stops sending to CloudWatch.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### Days to keep logs in CloudWatch before automatic deletion.").optional(),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Auth logs (`/var/log/secure`) — SSH login attempts, authentication events."),
          "audit": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable this log type. Stops sending to CloudWatch.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### Days to keep logs in CloudWatch before automatic deletion.").optional(),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Audit logs (`/var/log/audit/audit.log`) — detailed security events from the Linux audit system.") }).strict()
        .optional().describe("#### Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Secure jump box for accessing private resources (databases, Redis, OpenSearch) in your VPC.\n\n---\n\nUses keyless SSH via AWS Systems Manager — no SSH keys to manage. Connect with `stacktape bastion:ssh`\nor create port-forwarding tunnels with `stacktape bastion:tunnel`. Costs ~$4/month (t3.micro)."), z.object({
      "type": z.literal("dynamo-db-table"),
      "properties": z.object({
        "primaryKey": z.object({
          "partitionKey": z.object({
            "name": z.string().describe("#### Attribute name (e.g., `userId`, `email`, `createdAt`)."),
            "type": z.enum(["binary","number","string"]).describe("#### Attribute data type: `string`, `number`, or `binary`.") }).strict()
          .describe("#### The main key attribute (e.g., `userId`, `orderId`). Must be unique if no sort key is used."),
          "sortKey": z.object({
            "name": z.string().describe("#### Attribute name (e.g., `userId`, `email`, `createdAt`)."),
            "type": z.enum(["binary","number","string"]).describe("#### Attribute data type: `string`, `number`, or `binary`.") }).strict()
          .optional().describe("#### Optional second key for composite keys. Enables range queries and multiple items per partition key.\n\n---\n\nE.g., partition key `userId` + sort key `createdAt` lets you query all items for a user sorted by date.").optional() }).strict()
        .describe("#### The primary key that uniquely identifies each item.\n\n---\n\n- **Simple key**: Just a `partitionKey` (e.g., `userId`).\n- **Composite key**: `partitionKey` + `sortKey` (e.g., `userId` + `createdAt`).\n\n> **Cannot be changed after creation.** Every item must include the primary key attribute(s)."),
        "provisionedThroughput": z.object({
          "readUnits": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Read capacity units per second. 1 unit = one 4 KB strongly consistent read (or two eventually consistent).\n\n---\n\nRequests exceeding this limit get throttled. Use `readScaling` to auto-adjust."),
          "writeUnits": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Write capacity units per second. 1 unit = one 1 KB write.\n\n---\n\nRequests exceeding this limit get throttled. Use `writeScaling` to auto-adjust."),
          "writeScaling": z.object({
            "minUnits": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Minimum write units. Capacity never scales below this."),
            "maxUnits": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Maximum write units. Capacity never scales above this."),
            "keepUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.") }).strict()
          .optional().describe("#### Auto-scale write capacity based on actual usage. Scales up/down between min and max units.").optional(),
          "readScaling": z.object({
            "minUnits": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Minimum read units. Capacity never scales below this."),
            "maxUnits": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Maximum read units. Capacity never scales above this."),
            "keepUtilizationUnder": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.") }).strict()
          .optional().describe("#### Auto-scale read capacity based on actual usage. Scales up/down between min and max units.").optional() }).strict()
        .optional().describe("#### Fixed-capacity mode with predictable pricing. Omit for on-demand (pay-per-request) mode.\n\n---\n\n- **On-demand** (default, no config): Pay per read/write. Best for unpredictable or variable traffic.\n- **Provisioned**: Set fixed read/write capacity. Cheaper at steady, predictable load. Can auto-scale.").optional(),
        "enablePointInTimeRecovery": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Enable continuous backups with point-in-time recovery (restore to any second in the last 35 days).\n\n---\n\nRestores always create a new table. Adds ~20% to storage cost.").optional(),
        "streamType": z.enum(["KEYS_ONLY","NEW_AND_OLD_IMAGES","NEW_IMAGE","OLD_IMAGE"]).optional().describe("#### Stream item changes to trigger functions or batch jobs in real time.\n\n---\n\n- `KEYS_ONLY`: Only key attributes of the changed item.\n- `NEW_IMAGE`: The full item after the change.\n- `OLD_IMAGE`: The full item before the change.\n- `NEW_AND_OLD_IMAGES`: Both before and after — useful for change tracking and auditing.").optional(),
        "secondaryIndexes": z.array(z.object({
          "name": z.string().describe("#### Name of the index (used when querying)."),
          "partitionKey": z.object({
            "name": z.string().describe("#### Attribute name (e.g., `userId`, `email`, `createdAt`)."),
            "type": z.enum(["binary","number","string"]).describe("#### Attribute data type: `string`, `number`, or `binary`.") }).strict()
          .describe("#### Partition key for this index — the attribute you'll query by."),
          "sortKey": z.object({
            "name": z.string().describe("#### Attribute name (e.g., `userId`, `email`, `createdAt`)."),
            "type": z.enum(["binary","number","string"]).describe("#### Attribute data type: `string`, `number`, or `binary`.") }).strict()
          .optional().describe("#### Optional sort key for range queries within a partition.").optional(),
          "projections": z.array(z.string()).optional().describe("#### Extra attributes to copy into the index. Only projected attributes are available when querying.\n\n---\n\nThe table's primary key is always projected. List additional attributes you need in query results.").optional() }).strict()
        ).optional().describe("#### Additional indexes for querying by attributes other than the primary key.\n\n---\n\nWithout indexes, you can only query by primary key. Add a secondary index to query by\nany attribute (e.g., query orders by `status` or users by `email`).").optional(),
        "dev": z.object({
          "remote": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use the deployed AWS resource instead of a local emulation.\n\n---\n\nBy default, databases, Redis, and DynamoDB run locally in Docker during dev mode.\nSet to `true` to connect to the real deployed resource instead (must be deployed first).\n\nUseful when local emulation doesn't match production behavior closely enough,\nor when you need to work with real data.").default(false) }).strict()
        .optional().describe("#### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed table.").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Serverless NoSQL database with single-digit millisecond reads/writes at any scale.\n\n---\n\nNo servers to manage, no capacity planning needed (in on-demand mode). Pay per read/write.\nGreat for user profiles, session data, IoT data, and any key-value or document workload."), z.object({
      "type": z.literal("state-machine"),
      "properties": z.object({
        "definition": z.object({
          "Comment": z.string().optional().describe("#### A human-readable description of the state machine.").optional(),
          "StartAt": z.string().describe("#### The name of the state to start the execution at."),
          "States": z.record(z.string(), z.union([z.object({
              "Type": z.string(),
              "Next": z.string().optional().describe("").optional(),
              "End": z.literal(true).optional().describe("").optional(),
              "Comment": z.string().optional().describe("").optional(),
              "OutputPath": z.string().optional().describe("").optional(),
              "InputPath": z.string().optional().describe("").optional(),
              "Choices": z.array(z.object({
                "Variable": z.string().optional().describe("").optional(),
                "Next": z.string().optional().describe("").optional(),
                "And": z.array(z.any()).optional().describe("").optional(),
                "Or": z.array(z.any()).optional().describe("").optional(),
                "Not": z.any().optional(),
                "BooleanEquals": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("").optional(),
                "NumericEquals": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "NumericGreaterThan": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "NumericGreaterThanEquals": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "NumericLessThan": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "NumericLessThanEquals": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "StringEquals": z.string().optional().describe("").optional(),
                "StringGreaterThan": z.string().optional().describe("").optional(),
                "StringGreaterThanEquals": z.string().optional().describe("").optional(),
                "StringLessThan": z.string().optional().describe("").optional(),
                "StringLessThanEquals": z.string().optional().describe("").optional(),
                "TimestampEquals": z.string().optional().describe("").optional(),
                "TimestampGreaterThan": z.string().optional().describe("").optional(),
                "TimestampGreaterThanEquals": z.string().optional().describe("").optional(),
                "TimestampLessThan": z.string().optional().describe("").optional(),
                "TimestampLessThanEquals": z.string().optional().describe("").optional() }).catchall(z.any())),
              "Default": z.string().optional().describe("").optional() }).strict()
            , z.object({
              "Type": z.string(),
              "Comment": z.string().optional().describe("").optional(),
              "OutputPath": z.string().optional().describe("").optional(),
              "InputPath": z.string().optional().describe("").optional(),
              "Cause": z.string().optional().describe("").optional(),
              "Error": z.string().optional().describe("").optional() }).strict()
            , z.object({
              "Type": z.string(),
              "Next": z.string().optional().describe("").optional(),
              "End": z.literal(true).optional().describe("").optional(),
              "Comment": z.string().optional().describe("").optional(),
              "OutputPath": z.string().optional().describe("").optional(),
              "InputPath": z.string().optional().describe("").optional(),
              "ResultPath": z.string().optional().describe("").optional(),
              "ItemsPath": z.string().optional().describe("").optional(),
              "MaxConcurrency": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
              "Iterator": z.object({
                "name": z.string(),
                "type": z.literal("state-machine"),
                "configParentResourceType": z.literal("state-machine"),
                "nameChain": z.array(z.string()) }).strict()
              ,
              "Parameters": z.record(z.string(), z.any()).optional().describe("").optional(),
              "Retry": z.array(z.object({
                "ErrorEquals": z.array(z.string()),
                "IntervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "MaxAttempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "BackoffRate": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional() }).catchall(z.any())).optional().describe("").optional(),
              "Catch": z.array(z.object({
                "ErrorEquals": z.array(z.string()),
                "Next": z.string() }).catchall(z.any())).optional().describe("").optional() }).strict()
            , z.object({
              "Type": z.string(),
              "Next": z.string().optional().describe("").optional(),
              "End": z.literal(true).optional().describe("").optional(),
              "Comment": z.string().optional().describe("").optional(),
              "OutputPath": z.string().optional().describe("").optional(),
              "InputPath": z.string().optional().describe("").optional(),
              "ResultPath": z.string().optional().describe("").optional(),
              "Branches": z.array(z.object({
                "name": z.string(),
                "type": z.literal("state-machine"),
                "configParentResourceType": z.literal("state-machine"),
                "nameChain": z.array(z.string()) }).strict()
              ),
              "Retry": z.array(z.object({
                "ErrorEquals": z.array(z.string()),
                "IntervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "MaxAttempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "BackoffRate": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional() }).catchall(z.any())).optional().describe("").optional(),
              "Catch": z.array(z.object({
                "ErrorEquals": z.array(z.string()),
                "Next": z.string() }).catchall(z.any())).optional().describe("").optional() }).strict()
            , z.object({
              "Type": z.string(),
              "Next": z.string().optional().describe("").optional(),
              "End": z.literal(true).optional().describe("").optional(),
              "Comment": z.string().optional().describe("").optional(),
              "OutputPath": z.string().optional().describe("").optional(),
              "InputPath": z.string().optional().describe("").optional(),
              "ResultPath": z.string().optional().describe("").optional(),
              "Parameters": z.record(z.string(), z.any()).optional().describe("").optional(),
              "Result": z.any().optional().describe("").optional() }).strict()
            , z.object({
              "Type": z.string(),
              "Comment": z.string().optional().describe("").optional() }).strict()
            , z.object({
              "Type": z.string(),
              "Next": z.string().optional().describe("").optional(),
              "End": z.literal(true).optional().describe("").optional(),
              "Comment": z.string().optional().describe("").optional(),
              "OutputPath": z.string().optional().describe("").optional(),
              "InputPath": z.string().optional().describe("").optional(),
              "Resource": z.union([z.record(z.string(), z.any()), z.string()]),
              "ResultPath": z.string().optional().describe("").optional(),
              "Retry": z.array(z.object({
                "ErrorEquals": z.array(z.string()),
                "IntervalSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "MaxAttempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
                "BackoffRate": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional() }).catchall(z.any())).optional().describe("").optional(),
              "Catch": z.array(z.object({
                "ErrorEquals": z.array(z.string()),
                "Next": z.string() }).catchall(z.any())).optional().describe("").optional(),
              "TimeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
              "HeartbeatSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
              "Parameters": z.record(z.string(), z.any()).optional().describe("").optional() }).strict()
            , z.object({
              "Type": z.string(),
              "Next": z.string().optional().describe("").optional(),
              "End": z.literal(true).optional().describe("").optional(),
              "Comment": z.string().optional().describe("").optional(),
              "OutputPath": z.string().optional().describe("").optional(),
              "InputPath": z.string().optional().describe("").optional(),
              "Seconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("").optional(),
              "Timestamp": z.string().optional().describe("").optional(),
              "SecondsPath": z.string().optional().describe("").optional(),
              "TimestampPath": z.string().optional().describe("").optional() }).strict()
          ])).describe("#### An object containing the states of the state machine."),
          "Version": z.string().optional().describe("#### The version of the Amazon States Language.").optional(),
          "TimeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time, in seconds, that a state machine can run.").optional() }).strict()
        .describe("#### The workflow definition in [Amazon States Language (ASL)](https://states-language.net/spec.html).") }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Visual workflow engine for orchestrating Lambda functions, API calls, and other AWS services.\n\n---\n\nDefine multi-step workflows with branching, retries, parallel execution, and error handling —\nall without writing orchestration code. Pay per state transition (~$0.025/1,000 transitions).\nDefined using [Amazon States Language (ASL)](https://states-language.net/spec.html)."), z.object({
      "type": z.literal("mongo-db-atlas-cluster"),
      "properties": z.object({
        "diskSizeGB": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Disk size in GB. Not available for shared tiers (M2/M5). M10+ auto-scales storage by default.").optional(),
        "clusterTier": z.enum(["M10","M100","M140","M2","M20","M200","M200 Low-CPU (R200)","M200_NVME","M30","M300","M300 Low-CPU (R300)","M40","M40 Low-CPU (R40)","M400","M400 Low-CPU (R400)","M400_NVME","M40_NVME","M5","M50","M50 Low-CPU (R50)","M50_NVME","M60","M60 Low-CPU (R60)","M60_NVME","M700","M700 Low-CPU (R700)","M80","M80 Low-CPU (R80)","M80_NVME"]).describe("#### Instance size. M2/M5 = shared (cheapest). M10+ = dedicated (more features, auto-scaling, backups)."),
        "version": z.enum(["5.0","6.0","7.0"]).optional().describe("#### MongoDB engine version."),
        "numShards": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Number of shards. More than 1 enables sharded mode for horizontal scaling. Requires M30+.").default(1),
        "replication": z.object({
          "numAnalyticsNodes": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Read-only nodes for long-running analytics queries. Prevents impact on primary workload performance.").optional(),
          "numElectableNodes": z.union([z.literal(3), z.literal(5), z.literal(7)]).optional().describe("#### Nodes that can become primary. More = better redundancy. Must be odd.").default(3),
          "numReadOnlyNodes": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Read-only replica nodes for scaling read throughput.").optional() }).strict()
        .optional().describe("#### Node count configuration: electable, read-only, and analytics nodes. Default: 3 electable nodes.").optional(),
        "enableBackups": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Enable daily snapshots (18:00 UTC). M10+ only — M2/M5 get automatic snapshots with different rules.").optional(),
        "enablePointInTimeRecovery": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Restore to any second within the last 7 days. Requires `enableBackups: true` and M10+.").optional(),
        "biConnector": z.object({
          "readPreference": z.enum(["analytics","primary","secondary"]).optional().describe("#### Which node type the BI Connector reads from. Use `analytics` to avoid impacting production queries.").optional(),
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable the BI Connector for SQL-based access.").default(false) }).strict()
        .optional().describe("#### BI Connector for SQL-based access to MongoDB data. CPU-intensive — may degrade M10/M20 performance.").optional(),
        "autoScaling": z.object({
          "minClusterTier": z.enum(["M10","M100","M140","M20","M200","M200 Low-CPU (R200)","M200_NVME","M30","M300","M300 Low-CPU (R300)","M40","M40 Low-CPU (R40)","M400 Low-CPU (R400)","M400_NVME","M40_NVME","M50","M50 Low-CPU (R50)","M50_NVME","M60","M60 Low-CPU (R60)","M60_NVME","M700 Low-CPU (R700)","M80","M80 Low-CPU (R80)","M80_NVME"]).optional().describe("#### Lowest tier the cluster can scale down to. Prevents unexpected cost increases from always scaling up.").optional(),
          "maxClusterTier": z.enum(["M10","M100","M140","M20","M200","M200 Low-CPU (R200)","M200_NVME","M30","M300","M300 Low-CPU (R300)","M40","M40 Low-CPU (R40)","M400 Low-CPU (R400)","M400_NVME","M40_NVME","M50","M50 Low-CPU (R50)","M50_NVME","M60","M60 Low-CPU (R60)","M60_NVME","M700 Low-CPU (R700)","M80","M80 Low-CPU (R80)","M80_NVME"]).optional().describe("#### Highest tier the cluster can scale up to. Set a ceiling to control maximum costs.").optional(),
          "disableDiskScaling": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Prevent automatic disk expansion. By default, storage grows when usage hits 90%. Storage never scales down.").optional(),
          "disableScaleDown": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Prevent automatic scale-down. The cluster can only scale up, never back down to a smaller tier.").optional() }).strict()
        .optional().describe("#### Auto-scale tier and/or storage based on CPU/memory usage. Set min/max tier to control costs.\n\n---\n\nScales up when CPU or memory exceeds 75% for 1 hour. Scales down when both are below 50% for 24 hours.").optional(),
        "adminUserCredentials": z.object({
          "userName": z.string().describe("#### Name of the admin user"),
          "password": z.string().describe("#### Password for the admin user") }).strict()
        .optional().describe("#### Admin user for direct database access (e.g., from your local machine or admin tools).\n\n---\n\nNot required for app-to-database access via `connectTo` — that's handled automatically.").optional() }).strict()
    }).strict()
    .describe("#### Managed MongoDB database (Atlas) deployed into your AWS account and managed within your stack.\n\n---\n\nDocument database with flexible schemas — great for content management, user profiles, catalogs, and apps\nwhere your data model evolves. Starts at M2 (shared, ~$9/month) or M10 (dedicated, ~$57/month)."), z.object({
      "type": z.literal("redis-cluster"),
      "properties": z.object({
        "enableSharding": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Split data across multiple shards for horizontal scaling.\n\n---\n\nEach shard has its own primary + replicas. Routing is automatic.\n\n> **Must be set at creation time** — can't be added later.\n> Requires `numReplicaNodes >= 1`. Replica count can't be changed after creation.").optional(),
        "numShards": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Number of shards (only with `enableSharding: true`).").default(1),
        "numReplicaNodes": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Read replicas per shard. Increases read throughput and availability.\n\n---\n\nIf the primary fails and `enableAutomaticFailover` is on, a replica takes over.\nCan't be changed after creation for sharded clusters.").default(0),
        "enableAutomaticFailover": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Auto-promote a replica to primary if the primary node fails.\n\n---\n\nRequires `numReplicaNodes >= 1`. Always enabled for sharded clusters.\n\n> Deploy replicas first, then enable failover in a separate deployment.").optional(),
        "instanceSize": z.enum(["cache.m4.10xlarge","cache.m4.2xlarge","cache.m4.4xlarge","cache.m4.large","cache.m4.xlarge","cache.m5.12xlarge","cache.m5.24xlarge","cache.m5.2xlarge","cache.m5.4xlarge","cache.m5.large","cache.m5.xlarge","cache.m6g.12xlarge","cache.m6g.16xlarge","cache.m6g.2xlarge","cache.m6g.4xlarge","cache.m6g.8xlarge","cache.m6g.large","cache.m6g.xlarge","cache.m7g.12xlarge","cache.m7g.16xlarge","cache.m7g.2xlarge","cache.m7g.4xlarge","cache.m7g.8xlarge","cache.m7g.large","cache.m7g.xlarge","cache.r4.16xlarge","cache.r4.2xlarge","cache.r4.4xlarge","cache.r4.8xlarge","cache.r4.large","cache.r4.xlarge","cache.r5.12xlarge","cache.r5.24xlarge","cache.r5.2xlarge","cache.r5.4xlarge","cache.r5.large","cache.r5.xlarge","cache.r6g.12xlarge","cache.r6g.16xlarge","cache.r6g.2xlarge","cache.r6g.4xlarge","cache.r6g.8xlarge","cache.r6g.large","cache.r6g.xlarge","cache.r7g.12xlarge","cache.r7g.16xlarge","cache.r7g.2xlarge","cache.r7g.4xlarge","cache.r7g.8xlarge","cache.r7g.large","cache.r7g.xlarge","cache.t2.medium","cache.t2.micro","cache.t2.small","cache.t3.medium","cache.t3.micro","cache.t3.small","cache.t4g.medium","cache.t4g.micro","cache.t4g.small"]).describe("#### The size of each Redis node. Affects memory, performance, and cost.\n\n---\n\n**Quick guide:**\n- **`cache.t4g.micro`** (~$0.016/hr, 0.5 GB): Development, testing, low-traffic apps.\n- **`cache.t4g.small`** (~$0.032/hr, 1.37 GB): Small production apps, session stores.\n- **`cache.m7g.large`** (~$0.15/hr, 6.38 GB): Production workloads with moderate data.\n- **`cache.r7g.large`** (~$0.20/hr, 13.07 GB): Large datasets, memory-heavy caching.\n\n**Families:** `t` = burstable (cheap, variable). `m` = general purpose. `r` = memory-optimized.\nSuffix `g` = ARM/Graviton (better price-performance).\n\nThis size applies to every node (primary + replicas). You can change it later without data loss."),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable slow query logging.").default(false),
          "format": z.enum(["json","text"]).optional().describe("#### Log format.").default("json"),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs.").default(90),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Slow query logging. Sent to CloudWatch; view with `stacktape logs`.").optional(),
        "automatedBackupRetentionDays": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Days to keep automated daily backups. Set to 0 to disable.").default(0),
        "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port the cluster listens on.").default(6379),
        "defaultUserPassword": z.string().describe("#### Cluster password. 16-128 chars, printable ASCII only. Cannot contain `/`, `\"`, or `@`.\n\n---\n\nAll traffic is encrypted in transit. Use `$Secret()` instead of hardcoding:\n```yaml\ndefaultUserPassword: $Secret('redis.password')\n```"),
        "accessibility": z.object({
          "accessibilityMode": z.enum(["scoping-workloads-in-vpc","vpc"]).describe("#### Who can connect to this cluster.\n\n---\n\n- **`vpc`** (default): Any resource in the same VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).\n- **`scoping-workloads-in-vpc`**: Only resources that list this cluster in their `connectTo`.\n\nRedis clusters don't have public IPs — you can't connect from your local machine directly.\nUse a bastion host for local access.").default("vpc") }).strict()
        .optional().describe("#### Network access control: `vpc` (default) or `scoping-workloads-in-vpc` (most restrictive).").optional(),
        "engineVersion": z.enum(["6.0","6.2","7.0","7.1"]).optional().describe("#### Redis engine version.").default("6.2"),
        "dev": z.object({
          "remote": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use the deployed AWS resource instead of a local emulation.\n\n---\n\nBy default, databases, Redis, and DynamoDB run locally in Docker during dev mode.\nSet to `true` to connect to the real deployed resource instead (must be deployed first).\n\nUseful when local emulation doesn't match production behavior closely enough,\nor when you need to work with real data.").default(false) }).strict()
        .optional().describe("#### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cluster.").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### In-memory data store for caching, sessions, queues, and real-time data. Sub-millisecond latency."), z.object({
      "type": z.literal("custom-resource-instance"),
      "properties": z.object({
        "definitionName": z.string().describe("#### Name of the `custom-resource-definition` in your config that provides the backing Lambda."),
        "resourceProperties": z.record(z.string(), z.any()).describe("#### Key-value pairs passed to the Lambda function during create/update/delete events.") }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### An instance of a `custom-resource-definition`. Pass properties to the backing Lambda function."), z.object({
      "type": z.literal("custom-resource-definition"),
      "properties": z.object({
        "packaging": z.union([z.object({
            "type": z.literal("stacktape-lambda-buildpack"),
            "properties": z.object({
              "handlerFunction": z.string().optional().describe("#### The name of the handler function to be executed when the Lambda is invoked.").optional(),
              "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
              "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
              "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
              "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional(),
              "languageSpecificConfig": z.union([z.object({
                  "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                  "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                  "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                  "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                  "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                  "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                  "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                  "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                , z.object({
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                  "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                  "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                  "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                  "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                , z.object({
                  "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                  "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                , z.object({
                  "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                , z.object({
                  "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                  "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                , z.record(z.string(), z.never()), z.object({
                  "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
              ]).optional().describe("#### Language-specific packaging configuration.").optional() }).strict()
          }).strict()
          .describe("#### A zero-config buildpack that packages your code for AWS Lambda.\n\n---\n\nThe `stacktape-lambda-buildpack` automatically bundles your code and dependencies into an optimized Lambda deployment package.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.\n\nFor JS/TS, your code is bundled into a single file. Source maps are automatically generated.\nPackages are cached based on a checksum, so unchanged code is not re-packaged."), z.object({
            "type": z.literal("custom-artifact"),
            "properties": z.object({
              "packagePath": z.string().describe("#### The path to a pre-built deployment package.\n\n---\n\nIf the path points to a directory or a non-zip file, Stacktape will automatically zip it for you."),
              "handler": z.string().optional().describe("#### The handler function to be executed when the Lambda is invoked.\n\n---\n\nThe syntax is `{{filepath}}:{{functionName}}`.\n\nExample: `my-lambda/index.js:default`").optional() }).strict()
          }).strict()
          .describe("#### Uses a pre-built artifact for Lambda deployment.\n\n---\n\nWith `custom-artifact`, you provide a path to your own pre-built deployment package.\nIf the specified path is a directory or an unzipped file, Stacktape will automatically zip it.\n\nThis is useful when you have custom build processes or need full control over the packaging.")]).describe("#### How the Lambda function code is packaged and deployed."),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables injected into the Lambda function. Use `$ResourceParam()` for dynamic values.").optional(),
        "runtime": z.enum(["dotnet6","dotnet7","dotnet8","java11","java17","java8","java8.al2","nodejs18.x","nodejs20.x","nodejs22.x","nodejs24.x","provided.al2","provided.al2023","python3.10","python3.11","python3.12","python3.13","python3.8","python3.9","ruby3.3"]).optional().describe("#### Lambda runtime. Auto-detected from file extension if not specified.").optional(),
        "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 900.").default(10),
        "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Lambda-backed provisioning logic for resources not natively supported by Stacktape/CloudFormation.\n\n---\n\nYour Lambda function runs on stack create, update, and delete events to manage external resources\n(third-party APIs, SaaS services, custom infrastructure). Pair with `custom-resource-instance` to use."), z.object({
      "type": z.literal("upstash-redis"),
      "properties": z.object({
        "enableEviction": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases.\n\n---\n\nWithout eviction, writes fail once the memory limit is reached. Enable this for caching workloads.").default(false) }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Serverless Redis by Upstash — pay-per-request with no idle costs.\n\n---\n\nPerfect for Lambda-based apps where a traditional Redis cluster would be wasteful.\nAccessible over HTTPS (REST API) or standard Redis protocol. Great for caching, sessions, rate limiting."), z.object({
      "type": z.literal("deployment-script"),
      "properties": z.object({
        "trigger": z.enum(["after:deploy","before:delete"]).describe("#### When to run: `after:deploy` (fails → rollback) or `before:delete` (fails → deletion continues)."),
        "packaging": z.union([z.object({
            "type": z.literal("stacktape-lambda-buildpack"),
            "properties": z.object({
              "handlerFunction": z.string().optional().describe("#### The name of the handler function to be executed when the Lambda is invoked.").optional(),
              "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
              "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
              "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
              "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional(),
              "languageSpecificConfig": z.union([z.object({
                  "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                  "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                  "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                  "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                  "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                  "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                  "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                  "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                , z.object({
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                  "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                  "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                  "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                  "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                , z.object({
                  "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                  "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                , z.object({
                  "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                , z.object({
                  "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                  "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                , z.record(z.string(), z.never()), z.object({
                  "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
              ]).optional().describe("#### Language-specific packaging configuration.").optional() }).strict()
          }).strict()
          .describe("#### A zero-config buildpack that packages your code for AWS Lambda.\n\n---\n\nThe `stacktape-lambda-buildpack` automatically bundles your code and dependencies into an optimized Lambda deployment package.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.\n\nFor JS/TS, your code is bundled into a single file. Source maps are automatically generated.\nPackages are cached based on a checksum, so unchanged code is not re-packaged."), z.object({
            "type": z.literal("custom-artifact"),
            "properties": z.object({
              "packagePath": z.string().describe("#### The path to a pre-built deployment package.\n\n---\n\nIf the path points to a directory or a non-zip file, Stacktape will automatically zip it for you."),
              "handler": z.string().optional().describe("#### The handler function to be executed when the Lambda is invoked.\n\n---\n\nThe syntax is `{{filepath}}:{{functionName}}`.\n\nExample: `my-lambda/index.js:default`").optional() }).strict()
          }).strict()
          .describe("#### Uses a pre-built artifact for Lambda deployment.\n\n---\n\nWith `custom-artifact`, you provide a path to your own pre-built deployment package.\nIf the specified path is a directory or an unzipped file, Stacktape will automatically zip it.\n\nThis is useful when you have custom build processes or need full control over the packaging.")]).describe("#### How the script code is packaged. Use `stacktape-lambda-buildpack` for auto-bundling."),
        "runtime": z.enum(["dotnet6","dotnet7","dotnet8","java11","java17","java8","java8.al2","nodejs18.x","nodejs20.x","nodejs22.x","nodejs24.x","provided.al2","provided.al2023","python3.10","python3.11","python3.12","python3.13","python3.8","python3.9","ruby3.3"]).optional().describe("#### Lambda runtime. Auto-detected from file extension if not specified.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "parameters": z.record(z.string(), z.any()).optional().describe("#### Structured data passed to the handler function as the event payload. Not for secrets — use `environment`.").optional(),
        "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").optional(),
        "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 900 (15 minutes).").default(10),
        "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.").optional(),
        "storage": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Ephemeral `/tmp` storage in MB (512–10,240).").default(512),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Run a script during deploy or delete — database migrations, seed data, cleanup tasks.\n\n---\n\nExecutes as a Lambda function. Use `after:deploy` to run migrations after resources are ready,\nor `before:delete` for cleanup. Can also be triggered manually with `stacktape deployment-script:run`."), z.object({
      "type": z.literal("aws-cdk-construct"),
      "properties": z.object({
        "entryfilePath": z.string().describe("#### Path to the file containing your CDK construct class.\n\n---\n\nSupports `.js` and `.ts` files. The file must export a class that extends `Construct` from `aws-cdk-lib`."),
        "exportName": z.string().optional().describe("#### Name of the exported construct class from the entry file.\n\n---\n\nMust match the exact export name. Use this when the file has multiple exports or uses named exports."),
        "constructProperties": z.any().optional().describe("#### Custom props passed to the construct's constructor.\n\n---\n\nThis object is forwarded as the third argument (`props`) to your construct class. Use `$ResourceParam()` and `$Secret()`\ndirectives here to pass dynamic values from other resources in your stack.").optional() }).strict()
      .optional().describe("").optional() }).strict()
    .describe("#### Embed an AWS CDK construct directly in your Stacktape stack.\n\n---\n\nEscape hatch for resources not natively supported by Stacktape. Write a CDK construct class\nin TypeScript/JavaScript and Stacktape will synthesize and deploy it as part of your stack."), z.object({
      "type": z.literal("sqs-queue"),
      "properties": z.object({
        "delayMessagesSecond": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Delay (in seconds) before new messages become visible to consumers. Range: 0–900.\n\n---\n\nUseful for introducing a buffer, e.g., waiting for related data to be available before processing.").default(0),
        "maxMessageSizeBytes": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum message size in bytes. Range: 1,024 (1 KB) to 262,144 (256 KB).\n\n---\n\nMessages larger than this limit are rejected. For payloads over 256 KB, store the data in S3 and send the reference.").default(262144),
        "messageRetentionPeriodSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long unprocessed messages stay in the queue before being deleted. Range: 60s to 1,209,600s (14 days).\n\n---\n\nDefault is 4 days (345,600s). Increase if consumers might fall behind or be temporarily offline.").default(345600),
        "longPollingSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds the queue waits for messages before returning an empty response. Range: 0–20.\n\n---\n\nSet to `1`–`20` to enable long polling, which reduces costs by making fewer API calls.\nWith short polling (`0`), the consumer gets an immediate (often empty) response and must poll again.\n\nRecommended: `20` for most workloads — it's the most cost-effective.").default(0),
        "visibilityTimeoutSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long (seconds) a message is hidden from other consumers after being received. Range: 0–43,200 (12 hours).\n\n---\n\nAfter a consumer picks up a message, it must delete it before this timeout expires — otherwise it becomes\nvisible again and can be processed by another consumer (duplicate processing).\n\nSet this higher than your expected processing time. If your tasks take 2 minutes, use at least 150 seconds.").default(30),
        "fifoEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Creates a FIFO queue that guarantees message order and exactly-once delivery.\n\n---\n\nUse when processing order matters (e.g., financial transactions, sequential workflows).\nFIFO queues have lower throughput (~300 msg/s without batching, ~3,000 with) compared to standard queues.\n\nRequires either `contentBasedDeduplication: true` or a `MessageDeduplicationId` on each message.").default(false),
        "fifoHighThroughput": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Enables high-throughput mode for FIFO queues (up to ~70,000 msg/s per queue).\n\n---\n\nMessages are partitioned by `MessageGroupId` — order is guaranteed within each group but not across groups.\nRequires `fifoEnabled: true`.").optional(),
        "contentBasedDeduplication": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Automatically deduplicates messages based on their content (SHA-256 hash of the body).\n\n---\n\nWithin the 5-minute deduplication window, identical messages are delivered only once.\nSaves you from having to generate a unique `MessageDeduplicationId` for each message.\nRequires `fifoEnabled: true`.").optional(),
        "redrivePolicy": z.object({
          "targetSqsQueueName": z.string().optional().describe("#### Name of another `sqs-queue` in your config to use as the dead-letter queue.").optional(),
          "targetSqsQueueArn": z.string().optional().describe("#### ARN of an external SQS queue to use as the dead-letter queue. Use when the DLQ is in another stack or account.").optional(),
          "maxReceiveCount": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### How many times a message can be received (and fail) before being moved to the dead-letter queue.\n\n---\n\nA typical starting value is `3`–`5`. Set lower for fast-failing workloads, higher for retryable transient errors.") }).strict()
        .optional().describe("#### Moves messages that fail processing too many times to a dead-letter queue for inspection.\n\n---\n\nAfter `maxReceiveCount` failed attempts, the message is automatically moved to a separate queue\nso you can investigate and reprocess it. Prevents poison messages from blocking the queue.").optional(),
        "alarms": z.array(z.object({
          "trigger": z.union([z.object({
              "type": z.literal("sqs-queue-received-messages-count"),
              "properties": z.object({
                "thresholdCount": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when received message count crosses this threshold.\n\n---\n\nDefault: fires if **average** messages received per period > `thresholdCount`.\nCustomize with `statistic` and `comparisonOperator`."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("sqs-queue-not-empty").describe("#### Fires when the SQS queue has unprocessed messages.\n\n---\n\nThe queue is considered \"not empty\" if any of these are non-zero: visible messages,\nin-flight messages, messages received, or messages sent.") }).strict()
          ]),
          "evaluation": z.object({
            "period": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Duration of one evaluation period in seconds. Must be a multiple of 60.").default(60),
            "evaluationPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many recent periods to evaluate. Prevents alarms from firing on short spikes.\n\n---\n\nExample: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached\nin at least 3 of the last 5 periods.").default(1),
            "breachedPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.\n\n---\n\nMust be ≤ `evaluationPeriods`.").default(1) }).strict()
          .optional().describe("#### How long and how often to evaluate the metric before triggering.\n\n---\n\nControls the evaluation window (period), how many periods to look at, and how many must breach\nthe threshold to fire the alarm. Useful for filtering out short spikes.").optional(),
          "notificationTargets": z.array(z.union([z.object({
              "type": z.literal("ms-teams"),
              "properties": z.object({
                "webhookUrl": z.string().describe("#### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.\n\n---\n\nCreate an Incoming Webhook connector in your Teams channel settings to get this URL.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("slack"),
              "properties": z.object({
                "conversationId": z.string().describe("#### The Slack channel or DM ID to send notifications to.\n\n---\n\nTo find the ID: open the channel, click its name, and look at the bottom of the **About** tab."),
                "accessToken": z.string().describe("#### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.\n\n---\n\nCreate a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("email"),
              "properties": z.object({
                "sender": z.string().describe("#### The email address of the sender."),
                "recipient": z.string().describe("#### The email address of the recipient.") }).strict()
            }).strict()
          ])).optional().describe("#### Where to send notifications when the alarm fires — Slack, MS Teams, or email.").optional(),
          "description": z.string().optional().describe("#### Custom alarm description used in notification messages and the AWS console.").optional() }).strict()
        ).optional().describe("#### Additional alarms associated with this resource.\n\n---\n\nThese alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).").optional(),
        "disabledGlobalAlarms": z.array(z.string()).optional().describe("#### Disables globally configured alarms for this resource.\n\n---\n\nProvide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).").optional(),
        "policyStatements": z.array(z.object({
          "Effect": z.string().describe("#### `Allow` or `Deny` access for the specified actions and principal."),
          "Action": z.array(z.string()).describe("#### SQS actions to allow or deny. E.g., `[\"sqs:SendMessage\"]` or `[\"sqs:*\"]`."),
          "Condition": z.any().optional().describe("#### Optional conditions for when this statement applies (e.g., restrict by source ARN or IP range).").optional(),
          "Principal": z.any().describe("#### Who gets access: AWS account ID, IAM ARN, or `\"*\"` for everyone. E.g., `{ \"Service\": \"sns.amazonaws.com\" }`.") }).strict()
        ).optional().describe("#### Custom access-control statements added to the queue's resource policy.\n\n---\n\nThese are merged with policies Stacktape auto-generates. Use to grant cross-account access or allow\nspecific AWS services (e.g., SNS) to send messages to this queue.").optional(),
        "events": z.array(z.object({
          "type": z.literal("event-bus"),
          "properties": z.object({
            "messageGroupId": z.string().optional().describe("#### Message group ID for FIFO queues. Required when the target queue has `fifoEnabled: true`.\n\n---\n\nMessages in the same group are processed in strict order. Different groups can be processed in parallel.").optional(),
            "eventBusArn": z.string().optional().describe("#### The ARN of an existing event bus.\n\n---\n\nUse this to subscribe to an event bus that is not managed by your stack.\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
            "eventBusName": z.string().optional().describe("#### The name of an event bus defined in your stack's resources.\n\n---\n\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
            "useDefaultBus": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Uses the default AWS event bus.\n\n---\n\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
            "eventPattern": z.object({
              "version": z.any().optional().describe("#### Filter by event version.").optional(), "detail-type": z.any().optional().describe("#### Filter by event detail-type (e.g., `[\"OrderPlaced\"]`). This is the primary field for routing custom events.").optional(),
              "source": z.any().optional().describe("#### Filter by event source (e.g., `[\"my-app\"]` or `[\"aws.ec2\"]` for AWS service events).").optional(),
              "account": z.any().optional().describe("#### Filter by AWS account ID.").optional(),
              "region": z.any().optional().describe("#### Filter by AWS region.").optional(),
              "resources": z.any().optional().describe("#### Filter by resource ARNs.").optional(),
              "detail": z.any().optional().describe("#### Filter by event payload content. Supports nested matching, prefix/suffix, numeric comparisons.").optional(), "replay-name": z.any().optional().describe("#### Filter by replay name (only present on replayed events).").optional() }).strict()
            .describe("#### A pattern to filter events from the event bus.\n\n---\n\nOnly events that match this pattern will trigger the target.\nFor details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)."),
            "onDeliveryFailure": z.object({
              "sqsQueueArn": z.string().optional().describe("#### The ARN of the SQS queue for failed events.").optional(),
              "sqsQueueName": z.string().optional().describe("#### The name of an SQS queue (defined in your Stacktape configuration) for failed events.").optional() }).strict()
            .optional().describe("#### A destination for events that fail to be delivered to the target.\n\n---\n\nIn rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.").optional(),
            "input": z.any().optional().describe("#### A fixed JSON object to be passed as the event payload.\n\n---\n\nIf you need to customize the payload based on the event, use `inputTransformer` instead.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninput:\n  source: 'my-custom-event'\n```").optional(),
            "inputPath": z.string().optional().describe("#### A JSONPath expression to extract a portion of the event to pass to the target.\n\n---\n\nThis is useful for forwarding only a specific part of the event payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputPath: '$.detail'\n```").optional(),
            "inputTransformer": z.object({
              "inputPathsMap": z.any().optional().describe("#### A map of key-value pairs to extract from the event payload.\n\n---\n\nEach value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.").optional(),
              "inputTemplate": z.any().describe("#### A template for constructing a new event payload.\n\n---\n\nUse placeholders (`<placeholder>`) to insert the values extracted with `inputPathsMap`.") }).strict()
            .optional().describe("#### Customizes the event payload sent to the target.\n\n---\n\nThis allows you to extract values from the original event and use them to construct a new payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputTransformer:\n  inputPathsMap:\n    instanceId: '$.detail.instance-id'\n    instanceState: '$.detail.state'\n  inputTemplate:\n    message: 'Instance <instanceId> is now in state <instanceState>.'\n```").optional() }).strict()
          .describe("#### Properties of the integration") }).strict()
        .describe("#### Routes events from an EventBridge event bus to this queue when they match a specified pattern.")).optional().describe("#### A list of event sources that trigger message delivery to this queue.\n\n---\n\nCurrently supports EventBridge event bus integration for delivering events directly to the queue.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Message queue for decoupling services. Producers send messages, consumers process them at their own pace.\n\n---\n\nFully managed, serverless, pay-per-message. Use for background processing, task queues, or buffering between services."), z.object({
      "type": z.literal("sns-topic"),
      "properties": z.object({
        "smsDisplayName": z.string().optional().describe("#### Sender name shown on SMS messages sent to subscribers (e.g., \"MyApp\"). Max 11 characters.").optional(),
        "fifoEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Guarantees message order and exactly-once delivery. Use for financial transactions, sequential workflows.\n\n---\n\nFIFO topics can only deliver to FIFO SQS queues (not email, SMS, or HTTP).\nRequires either `contentBasedDeduplication: true` or a unique `MessageDeduplicationId` per message.").default(false),
        "contentBasedDeduplication": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Automatically deduplicates messages based on content (SHA-256 hash) within a 5-minute window.\n\n---\n\nSaves you from generating a unique deduplication ID for each message. Requires `fifoEnabled: true`.").default(false) }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Pub/sub messaging: publish once, deliver to many subscribers (Lambda, SQS, email, SMS, HTTP).\n\n---\n\nServerless, pay-per-message. Use when one event needs to trigger multiple actions — e.g., order placed\ntriggers email confirmation + inventory update + analytics. Subscribers are configured on the subscriber side."), z.object({
      "type": z.literal("hosting-bucket"),
      "properties": z.object({
        "uploadDirectoryPath": z.string().describe("#### Path to the build output directory (e.g., `dist`, `build`, `out`).\n\n---\n\nThis folder's contents are uploaded to the bucket on every deploy."),
        "build": z.object({
          "command": z.string().describe("#### Command to run (e.g., `npm run build`, `vite build`, `npm run dev`)."),
          "workingDirectory": z.string().optional().describe("#### Working directory for the command (relative to project root).") }).strict()
        .optional().describe("#### Build command that produces the files to upload (e.g., `npm run build`).\n\n---\n\nRuns during the packaging phase, in parallel with other resources. Bundle size is shown in deploy logs.").optional(),
        "dev": z.object({
          "command": z.string().describe("#### Command to run (e.g., `npm run build`, `vite build`, `npm run dev`)."),
          "workingDirectory": z.string().optional().describe("#### Working directory for the command (relative to project root).").default(".") }).strict()
        .optional().describe("#### Dev server command for local development (e.g., `npm run dev`, `vite`).\n\n---\n\nUsed by `stacktape dev`.").optional(),
        "excludeFilesPatterns": z.array(z.string()).optional().describe("#### Glob patterns for files to skip during upload (relative to `uploadDirectoryPath`).").optional(),
        "hostingContentType": z.enum(["astro-static-website","gatsby-static-website","nuxt-static-website","single-page-app","static-website","sveltekit-static-website"]).optional().describe("#### Optimizes caching and routing for your type of frontend app.\n\n---\n\n- **`single-page-app`**: For React, Vue, Angular, or any SPA built with Vite/Webpack.\n  Enables client-side routing (e.g., `/about` serves `index.html`). HTML is never browser-cached;\n  hashed assets (`.js`, `.css`) are cached forever.\n\n- **`static-website`** (default): For multi-page static sites. All files are CDN-cached\n  but never browser-cached, so users always see the latest content after a deploy.\n\n- **`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**:\n  Framework-specific presets that cache hashed build assets (`_astro/`, `_app/`, `_nuxt/`)\n  indefinitely while keeping HTML fresh.\n\n- **`gatsby-static-website`**: Gatsby-specific caching following their recommendations.\n\nYou can override any preset's behavior using `fileOptions`."),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Custom domains (e.g., `www.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
        "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable clean URL normalization (e.g., `/about` → `/about.html`).").default(false),
        "edgeFunctions": z.object({
          "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
          "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
          "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
          "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
        .optional().describe("#### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).\n\n---\n\n- `onRequest`: Before cache lookup and before forwarding to the bucket.\n- `onResponse`: Before returning the response to the client.").optional(),
        "errorDocument": z.string().optional().describe("#### Page to show for 404 errors (e.g., `/error.html`).").optional(),
        "indexDocument": z.string().optional().describe("#### Page served for requests to `/`.").default("/index.html"),
        "injectEnvironment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Inject deploy-time values into HTML files as `window.STP_INJECTED_ENV.VARIABLE_NAME`.\n\n---\n\nUseful for making API URLs, User Pool IDs, and other dynamic values\navailable to your frontend JavaScript without rebuilding.").optional(),
        "writeDotenvFilesTo": z.string().optional().describe("#### Write deploy-time values to a `.env` file in the specified directory.\n\n---\n\nMerges with existing `.env` content if the file already exists.").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this site. Must have `scope: cdn`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set HTTP headers (e.g., `Cache-Control`) for files matching specific patterns.").optional(),
        "routeRewrites": z.array(z.object({
          "path": z.string().describe("#### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported."),
          "routePrefix": z.string().optional().describe("#### Prepend a path prefix to requests before forwarding to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.").optional(),
          "routeTo": z.union([z.object({
              "type": z.literal("application-load-balancer"),
              "properties": z.object({
                "loadBalancerName": z.string().describe("#### Name of the `application-load-balancer` resource to route to."),
                "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Listener port on the load balancer. Only needed if using custom listeners.").optional(),
                "originDomainName": z.string().optional().describe("#### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("http-api-gateway"),
              "properties": z.object({
                "httpApiGatewayName": z.string().describe("#### Name of the `http-api-gateway` resource to route to.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("function"),
              "properties": z.object({
                "functionName": z.string().describe("#### Name of the `function` resource to route to. The function must have `url.enabled: true`.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("custom-origin"),
              "properties": z.object({
                "domainName": z.string().describe("#### Domain name of the external origin (e.g., `api.example.com`)."),
                "protocol": z.enum(["HTTP","HTTPS"]).optional().describe("#### Protocol for connecting to the origin.").default("HTTPS"),
                "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("bucket"),
              "properties": z.object({
                "bucketName": z.string().describe("#### Name of the `bucket` resource to route to."),
                "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable clean URL normalization (e.g., `/about` → `/about.html`).").default(false) }).strict()
            }).strict()
          ]).optional().describe("#### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.\n\n---\n\nIf not set, requests go to the default origin (the resource this CDN is attached to).").optional(),
          "cachingOptions": z.object({
            "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
            "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
            "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
            "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
            "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
            "cacheKeyParameters": z.object({
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
            .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
            "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
          .optional().describe("#### Override caching behavior for requests matching this route.").optional(),
          "forwardingOptions": z.object({
            "customRequestHeaders": z.array(z.object({
              "headerName": z.string().describe("#### Name of the header"),
              "value": z.string().describe("#### Value of the header") }).strict()
            ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
            "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
            "cookies": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
            "headers": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
              "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
              "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
              "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
            .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
            "queryString": z.object({
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
            "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
          .optional().describe("#### Override which headers, cookies, and query params are forwarded for this route.").optional(),
          "edgeFunctions": z.object({
            "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
            "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
            "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
            "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
          .optional().describe("#### Run edge functions on requests/responses matching this route.").optional() }).strict()
        ).optional().describe("#### Route specific URL patterns to different origins (e.g., `/api/*` → a Lambda function).\n\n---\n\nEvaluated in order; first match wins. Unmatched requests go to the bucket.").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Host a static website (React, Vue, Astro, etc.) on S3 + CloudFront CDN.\n\n---\n\nCombines S3 storage with a global CDN for fast, cheap, and scalable static site hosting.\nIncludes build step, custom domains, caching presets, and environment injection."), z.object({
      "type": z.literal("web-app-firewall"),
      "properties": z.object({
        "scope": z.enum(["cdn","regional"]).describe("#### `cdn` for CloudFront-attached resources, `regional` for ALBs, User Pools, or direct API Gateways."),
        "defaultAction": z.enum(["Allow","Block"]).optional().describe("#### What happens when no rule matches a request.\n\n---\n\n- **`Allow`** (recommended): Allow all traffic, block only what rules catch.\n- **`Block`**: Block all traffic, allow only what rules explicitly permit (returns 403)."),
        "rules": z.array(z.union([z.object({
            "type": z.literal("managed-rule-group"),
            "properties": z.object({
              "vendorName": z.string().describe("#### Vendor name (e.g., `AWS` for AWS-managed rules)."),
              "excludedRules": z.array(z.string()).optional().describe("#### Rules within this group to skip (by rule name). Useful for disabling false positives.").optional(),
              "overrideAction": z.enum(["Count","None"]).optional().describe("#### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).").optional(),
              "priority": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Evaluation order. Lower = evaluated first. Must be unique across all rules."),
              "name": z.string(),
              "disableMetrics": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch metrics for this rule.").default(false),
              "sampledRequestsEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Save samples of requests matching this rule for inspection in the WAF console.").default(false) }).strict()
          }).strict()
          , z.object({
            "type": z.literal("custom-rule-group"),
            "properties": z.object({
              "arn": z.string().describe("#### ARN of the custom WAF rule group."),
              "overrideAction": z.enum(["Count","None"]).optional().describe("#### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).").optional(),
              "priority": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Evaluation order. Lower = evaluated first. Must be unique across all rules."),
              "name": z.string(),
              "disableMetrics": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch metrics for this rule.").default(false),
              "sampledRequestsEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Save samples of requests matching this rule for inspection in the WAF console.").default(false) }).strict()
          }).strict()
          , z.object({
            "type": z.literal("rate-based-rule"),
            "properties": z.object({
              "limit": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Max requests per IP in a 5-minute window. Range: 100–20,000,000. Exceeding triggers the `action`."),
              "aggregateBasedOn": z.enum(["FORWARDED_IP","IP"]).optional().describe("#### `IP` = direct client IP, `FORWARDED_IP` = IP from a header (e.g., `X-Forwarded-For` behind a proxy).").optional(),
              "forwardedIPConfig": z.object({
                "fallbackBehavior": z.enum(["MATCH","NO_MATCH"]).describe("#### What to do when the header is missing. `MATCH` = apply rule action, `NO_MATCH` = skip."),
                "headerName": z.string().describe("#### HTTP header containing the client IP (e.g., `X-Forwarded-For`).") }).strict()
              .optional().describe("#### Header and fallback settings when using `FORWARDED_IP` aggregation.").optional(),
              "action": z.enum(["Allow","Block","Captcha","Challenge","Count"]).optional().describe("#### What to do when the rate limit is exceeded.\n\n---\n\n- `Block`: Return 403 (most common for rate limiting).\n- `Count`: Log only, don't block (useful for testing thresholds).\n- `Captcha`/`Challenge`: Verify the client is human."),
              "priority": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Evaluation order. Lower = evaluated first. Must be unique across all rules."),
              "name": z.string(),
              "disableMetrics": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch metrics for this rule.").default(false),
              "sampledRequestsEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Save samples of requests matching this rule for inspection in the WAF console.").default(false) }).strict()
          }).strict()
        ])).optional().describe("#### Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules.\n\n---\n\nIf omitted, Stacktape uses `AWSManagedRulesCommonRuleSet` + `AWSManagedRulesKnownBadInputsRuleSet` by default.").optional(),
        "customResponseBodies": z.record(z.string(), z.object({
          "contentType": z.string().describe("#### MIME type: `application/json`, `text/plain`, or `text/html`."),
          "content": z.string().describe("#### Response body content.") }).strict()
        ).optional().describe("#### Custom response bodies for `Block` actions. Map of key → content type + body.").optional(),
        "captchaImmunityTime": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds a solved CAPTCHA stays valid before requiring re-verification.").default(300),
        "challengeImmunityTime": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Seconds a solved challenge stays valid before requiring re-verification.").default(300),
        "tokenDomains": z.array(z.string()).optional().describe("#### Domains accepted in WAF tokens. Enables token sharing across multiple protected websites.").optional(),
        "disableMetrics": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch metrics for the firewall.").default(false),
        "sampledRequestsEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Save samples of matched requests for inspection in the AWS WAF console.").default(false) }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Protects your APIs and websites from common attacks (SQL injection, XSS, bots, DDoS).\n\n---\n\nAttach to an HTTP API Gateway, Application Load Balancer, or CDN. Comes with AWS-managed rule sets\nby default. Costs ~$5/month base + $1/million requests inspected."), z.object({
      "type": z.literal("nextjs-web"),
      "properties": z.object({
        "appDirectory": z.string().describe("#### Directory containing your `next.config.js`. For monorepos, point to the Next.js workspace."),
        "serverLambda": z.object({
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").default(1024),
          "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 30.").default(30),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.").optional(),
          "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.\n\n---\n\nS3 and DynamoDB remain accessible via auto-created VPC endpoints.").optional() }).strict()
        .optional().describe("#### Customize the SSR Lambda function (memory, timeout, VPC, logging).").optional(),
        "warmServerInstances": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Number of Lambda instances to keep warm (pre-initialized) to reduce cold starts.\n\n---\n\nA separate \"warmer\" function periodically pings the SSR Lambda. Not available with `useEdgeLambda: true`.").default(0),
        "useEdgeLambda": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Run SSR at CloudFront edge locations for lower latency worldwide.\n\n---\n\n**Trade-offs:** Slower deploys, no `warmServerInstances`, no response streaming.").default(false),
        "buildCommand": z.string().optional().describe("#### Override the default `next build` command.").optional(),
        "dev": z.object({
          "command": z.string().optional().describe("#### Dev server command (e.g., `npm run dev`).").default("next dev") }).strict()
        .optional().describe("#### Dev server config for `stacktape dev`. Defaults to `next dev`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Attach custom domains with auto-managed DNS records and TLS certificates.\n\n---\n\n**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.").optional(),
        "streamingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Stream SSR responses for faster Time to First Byte and up to 20 MB response size (vs 6 MB default).\n\n---\n\nNot compatible with `useEdgeLambda: true`.").default(false),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Deploy a Next.js app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN.\n\n---\n\nHandles ISR (Incremental Static Regeneration), image optimization, and middleware out of the box.\nOptionally deploy to Lambda@Edge for lower latency or enable response streaming."), z.object({
      "type": z.literal("open-search-domain"),
      "properties": z.object({
        "version": z.enum(["1.0","1.1","1.2","1.3","2.11","2.13","2.15","2.17","2.3","2.5","2.7","2.9"]).optional().describe("#### OpenSearch engine version. Pin this to avoid surprises when the default changes."),
        "clusterConfig": z.object({
          "instanceType": z.string().describe("#### Instance type for data nodes (e.g., `t3.medium.search`, `r6g.large.search`).\n\n---\n\nData nodes store data and handle queries. For production, pair with dedicated master nodes."),
          "instanceCount": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Number of data nodes. More nodes = more storage capacity and query throughput."),
          "dedicatedMasterType": z.string().optional().describe("#### Instance type for dedicated master nodes (e.g., `m5.large.search`). Manages cluster state, not data.\n\n---\n\nRecommended for clusters with 3+ data nodes to prevent split-brain. Use an odd count (3, 5, or 7).").optional(),
          "dedicatedMasterCount": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Number of dedicated master nodes. Must be odd (3, 5, or 7) for quorum.").optional(),
          "warmType": z.string().optional().describe("#### Instance type for warm (UltraWarm) nodes — cheaper storage for infrequently accessed data.\n\n---\n\nData on warm nodes is still searchable but with higher query latency. Great for retaining old logs\nor time-series data at lower cost.").optional(),
          "warmCount": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Number of warm (UltraWarm) nodes for lower-cost storage of older data.").optional(),
          "multiAzDisabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable Multi-AZ replication. Not recommended — reduces availability and data durability.\n\n---\n\nMulti-AZ is auto-enabled for clusters with 2+ nodes. It distributes nodes across availability zones\nso the cluster survives an AZ outage.").default(false),
          "standbyEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Enable Multi-AZ with a standby AZ for highest availability (99.99% SLA).\n\n---\n\nDistributes nodes across 3 AZs with one as standby. The standby takes over instantly during failures\nwithout re-balancing. Requires: version 1.3+, 3 dedicated master + data nodes, GP3/SSD instances.").default(false) }).strict()
        .optional().describe("#### Instance types, counts, and cluster topology (data nodes, master nodes, warm storage).\n\n---\n\nDefaults to a single `m4.large.search` node if not specified.").optional(),
        "storage": z.object({
          "size": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### EBS volume size per data node in GiB. Min/max depends on instance type (typically 10–16,384 GiB)."),
          "iops": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Provisioned IOPS per data node. GP3 volumes only.").default(3000),
          "throughput": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Provisioned throughput per data node in MiB/s. GP3 volumes only.").default(125) }).strict()
        .optional().describe("#### EBS volume size, IOPS, and throughput per data node. Only for EBS-backed instance types.\n\n---\n\n`iops` and `throughput` settings only apply to GP3 volumes.").optional(),
        "userPool": z.string().optional().describe("#### Name of a `user-pool` resource in your config. Enables login to OpenSearch Dashboards via Cognito.").optional(),
        "logging": z.object({
          "errorLogs": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable this log type.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### Days to keep logs in CloudWatch before automatic deletion.").default(14) }).strict()
          .optional().describe("#### Error logs — script compilation errors, invalid queries, indexing issues, snapshot failures.").optional(),
          "searchSlowLogs": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable this log type.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### Days to keep logs in CloudWatch before automatic deletion.").default(14) }).strict()
          .optional().describe("#### Search slow logs — queries exceeding thresholds you configure in OpenSearch index settings.").optional(),
          "indexSlowLogs": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable this log type.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### Days to keep logs in CloudWatch before automatic deletion.").default(14) }).strict()
          .optional().describe("#### Indexing slow logs — indexing operations exceeding thresholds you configure in OpenSearch index settings.").optional() }).strict()
        .optional().describe("#### Error logs, search slow logs, and indexing slow logs. Sent to CloudWatch automatically.").optional(),
        "accessibility": z.object({
          "accessibilityMode": z.enum(["internet","scoping-workloads-in-vpc","vpc"]).describe("#### How the domain can be reached.\n\n---\n\n- **`internet`**: Accessible from anywhere (still requires IAM credentials).\n- **`vpc`**: Only accessible from resources inside your VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).\n- **`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.\n\n**Cannot be changed after creation** — switching between internet and VPC modes requires a new domain.").default("internet") }).strict()
        .optional().describe("#### Network access mode: public internet (default), VPC-only, or VPC with security-group scoping.\n\n---\n\nEven in `internet` mode, access requires IAM credentials. VPC modes add network-level isolation.\n**Warning:** you cannot switch between `internet` and `vpc`/`scoping-workloads-in-vpc` after creation.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Managed search and analytics engine (OpenSearch/Elasticsearch compatible).\n\n---\n\nFull-text search, log analytics, and real-time dashboards. Use for search features in your app,\ncentralized logging, or time-series data analysis. Costs start at ~$50/month (single small node)."), z.object({
      "type": z.literal("efs-filesystem"),
      "properties": z.object({
        "backupEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Enable daily automatic backups with 35-day retention. Incremental (only changes are copied).").optional(),
        "throughputMode": z.enum(["bursting","elastic","provisioned"]).optional().describe("#### How throughput scales with your workload.\n\n---\n\n- **`elastic`** (recommended): Auto-scales throughput. Best for spiky workloads (web apps, CI/CD).\n- **`provisioned`**: Fixed throughput you set via `provisionedThroughputInMibps`. Best for steady high-throughput workloads.\n- **`bursting`**: Throughput scales with storage size (50 KiB/s per GiB). Can run out of burst credits.").default("elastic"),
        "provisionedThroughputInMibps": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Guaranteed throughput in MiB/s. Required when `throughputMode` is `provisioned`.\n\n---\n\nE.g., `100` = 100 MiB/s. Additional fees apply based on the provisioned amount. Can be changed anytime.").optional() }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Shared file storage that multiple containers can read/write simultaneously.\n\n---\n\nPersistent, elastic (grows/shrinks automatically), and accessible from any container in your stack\nvia `volumeMounts`. Use for shared uploads, CMS media, ML model files, or anything that needs to\nsurvive container restarts. Pay only for storage used (~$0.30/GB/month for standard access)."), z.object({
      "type": z.literal("kinesis-stream"),
      "properties": z.object({
        "capacityMode": z.enum(["ON_DEMAND","PROVISIONED"]).optional().describe("#### How the stream scales.\n\n---\n\n- **`ON_DEMAND`**: Auto-scales, pay per GB. Recommended for most use cases.\n- **`PROVISIONED`**: You choose a fixed number of shards (1 MB/s write, 2 MB/s read each). More predictable costs.").default("ON_DEMAND"),
        "shardCount": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Number of shards. Only used when `capacityMode` is `PROVISIONED`.\n\n---\n\nEach shard: 1 MB/s write (1,000 records/s), 2 MB/s read (shared across consumers).").default(1),
        "retentionPeriodHours": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long records stay in the stream (hours). Range: 24–8,760 (365 days). Beyond 24h costs extra.").default(24),
        "encryption": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable server-side encryption.").default(false),
          "kmsKeyArn": z.string().optional().describe("#### ARN of your own KMS key. If omitted, uses the AWS-managed `alias/aws/kinesis` key (no extra cost).").optional() }).strict()
        .optional().describe("#### Encrypt data at rest using a KMS key.").optional(),
        "enableEnhancedFanOut": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Give each consumer its own dedicated 2 MB/s read throughput (instead of sharing).\n\n---\n\nUse when you have multiple consumers reading from the same stream and need low latency.\nEnhanced fan-out consumers are auto-created when a Lambda uses `autoCreateConsumer: true`.").default(false) }).strict()
      .optional().describe("").optional(),
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Real-time data stream for ingesting high-volume events (logs, clickstreams, IoT, analytics).\n\n---\n\nContinuously captures data from many producers. Consumers (Lambda functions, etc.) process records in order.\nUse when you need real-time processing with sub-second latency, not just async messaging (use SQS for that)."), z.object({
      "type": z.literal("function"),
      "properties": z.object({
        "packaging": z.union([z.object({
            "type": z.literal("stacktape-lambda-buildpack"),
            "properties": z.object({
              "handlerFunction": z.string().optional().describe("#### The name of the handler function to be executed when the Lambda is invoked.").optional(),
              "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
              "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
              "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
              "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional(),
              "languageSpecificConfig": z.union([z.object({
                  "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                  "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                  "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                  "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                  "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                  "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                  "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                  "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                , z.object({
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                  "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                  "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                  "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                  "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                , z.object({
                  "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                  "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                , z.object({
                  "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                , z.object({
                  "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                  "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                , z.record(z.string(), z.never()), z.object({
                  "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
              ]).optional().describe("#### Language-specific packaging configuration.").optional() }).strict()
          }).strict()
          .describe("#### A zero-config buildpack that packages your code for AWS Lambda.\n\n---\n\nThe `stacktape-lambda-buildpack` automatically bundles your code and dependencies into an optimized Lambda deployment package.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.\n\nFor JS/TS, your code is bundled into a single file. Source maps are automatically generated.\nPackages are cached based on a checksum, so unchanged code is not re-packaged."), z.object({
            "type": z.literal("custom-artifact"),
            "properties": z.object({
              "packagePath": z.string().describe("#### The path to a pre-built deployment package.\n\n---\n\nIf the path points to a directory or a non-zip file, Stacktape will automatically zip it for you."),
              "handler": z.string().optional().describe("#### The handler function to be executed when the Lambda is invoked.\n\n---\n\nThe syntax is `{{filepath}}:{{functionName}}`.\n\nExample: `my-lambda/index.js:default`").optional() }).strict()
          }).strict()
          .describe("#### Uses a pre-built artifact for Lambda deployment.\n\n---\n\nWith `custom-artifact`, you provide a path to your own pre-built deployment package.\nIf the specified path is a directory or an unzipped file, Stacktape will automatically zip it.\n\nThis is useful when you have custom build processes or need full control over the packaging.")]).describe("#### How your code is built and packaged for deployment.\n\n---\n\n- **`stacktape-lambda-buildpack`** (recommended): Point to your source file and Stacktape builds,\n  bundles, and uploads it automatically.\n- **`custom-artifact`**: Provide a pre-built zip file. Stacktape handles the upload."),
        "events": z.array(z.union([z.object({
            "type": z.literal("application-load-balancer").describe("#### Triggers a function when an Application Load Balancer receives a matching HTTP request.\n\n---\n\nYou can route requests based on HTTP method, path, headers, query parameters, and source IP address."),
            "properties": z.object({
              "loadBalancerName": z.string().describe("#### The name of the Application Load Balancer.\n\n---\n\nThis must reference a load balancer defined in your Stacktape configuration."),
              "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The port of the load balancer listener to attach to.\n\n---\n\nYou only need to specify this if the load balancer uses custom listeners.").optional(),
              "priority": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### The priority of this integration rule.\n\n---\n\nLoad balancer rules are evaluated in order from the lowest priority to the highest.\nThe first rule that matches an incoming request will handle it."),
              "paths": z.array(z.string()).optional().describe("#### A list of URL paths that will trigger this integration.\n\n---\n\nThe request will be routed if its path matches any of the paths in this list.\nThe comparison is case-sensitive and supports `*` and `?` wildcards.\n\nExample: `/users`, `/articles/*`").optional(),
              "methods": z.array(z.string()).optional().describe("#### A list of HTTP methods that will trigger this integration.\n\n---\n\nExample: `GET`, `POST`, `DELETE`").optional(),
              "hosts": z.array(z.string()).optional().describe("#### A list of hostnames that will trigger this integration.\n\n---\n\nThe hostname is parsed from the `Host` header of the request.\nWildcards (`*` and `?`) are supported.\n\nExample: `api.example.com`, `*.myapp.com`").optional(),
              "headers": z.array(z.object({
                "headerName": z.string().describe("#### The name of the HTTP header."),
                "values": z.array(z.string()).describe("#### A list of allowed values for the header.\n\n---\n\nThe condition is met if the header's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.") }).strict()
              ).optional().describe("#### A list of header conditions that the request must match.\n\n---\n\nAll header conditions must be met for the request to be routed.").optional(),
              "queryParams": z.array(z.object({
                "paramName": z.string().describe("#### The name of the query parameter."),
                "values": z.array(z.string()).describe("#### A list of allowed values for the query parameter.\n\n---\n\nThe condition is met if the query parameter's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.") }).strict()
              ).optional().describe("#### A list of query parameter conditions that the request must match.\n\n---\n\nAll query parameter conditions must be met for the request to be routed.").optional(),
              "sourceIps": z.array(z.string()).optional().describe("#### A list of source IP addresses (in CIDR format) that are allowed to trigger this integration.\n\n---\n\n> **Note:** If the client is behind a proxy, this will be the IP address of the proxy.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when an Application Load Balancer receives a matching HTTP request.\n\n---\n\nYou can route requests based on HTTP method, path, headers, query parameters, and source IP address."), z.object({
            "type": z.literal("kafka-topic"),
            "properties": z.object({
              "customKafkaConfiguration": z.object({
                "bootstrapServers": z.array(z.string()).describe("#### A list of `host:port` addresses for your Kafka brokers."),
                "topicName": z.string().describe("#### The name of the Kafka topic to consume messages from."),
                "authentication": z.union([z.object({
                    "type": z.enum(["BASIC_AUTH","SASL_SCRAM_256_AUTH","SASL_SCRAM_512_AUTH"]).describe("#### The SASL authentication protocol.\n\n---\n\n- `BASIC_AUTH`: SASL/PLAIN\n- `SASL_SCRAM_256_AUTH`: SASL SCRAM-256\n- `SASL_SCRAM_512_AUTH`: SASL SCRAM-512"),
                    "properties": z.object({
                      "authenticationSecretArn": z.string().describe("#### The ARN of a secret containing the Kafka credentials.\n\n---\n\nThe secret must be a JSON object with `username` and `password` keys.\nYou can create secrets using the `stacktape secret:create` command.") }).strict()
                    .describe("#### Properties of authentication method") }).strict()
                  , z.object({
                    "type": z.literal("MTLS").describe("#### The authentication protocol.\n\n---\n\n`MTLS`: Mutual TLS authentication."),
                    "properties": z.object({
                      "clientCertificate": z.string().describe("#### The ARN of a secret containing the client certificate.\n\n---\n\nThis secret should contain the certificate chain (X.509 PEM), private key (PKCS#8 PEM), and an optional private key password.\nYou can create secrets using the `stacktape secret:create` command."),
                      "serverRootCaCertificate": z.string().optional().describe("#### The ARN of a secret containing the server's root CA certificate.\n\n---\n\nYou can create secrets using the `stacktape secret:create` command.").optional() }).strict()
                    .describe("#### Properties of authentication method") }).strict()
                ]).describe("#### The authentication method for connecting to the Kafka cluster.\n\n---\n\n- `SASL`: Authenticate using a username and password (PLAIN or SCRAM).\n- `MTLS`: Authenticate using a client-side TLS certificate.") }).strict()
              .optional().describe("#### The details of your Kafka cluster.\n\n---\n\nSpecifies the bootstrap servers and topic name.").optional(),
              "batchSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum number of records to process in a single batch.\n\n---\n\nThe function will be invoked with up to this many records. Maximum is 10,000.").default(100),
              "maxBatchWindowSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time (in seconds) to wait before invoking the function with a batch of records.\n\n---\n\nThe function will be triggered when either the `batchSize` is reached or this time window expires.\nMaximum is 300 seconds.").default(0.5) }).strict()
          }).strict()
          .describe("#### Triggers a function when new messages are available in a Kafka topic."), z.object({
            "type": z.literal("sns"),
            "properties": z.object({
              "snsTopicName": z.string().optional().describe("#### The name of an SNS topic defined in your stack's resources.\n\n---\n\nYou must specify either `snsTopicName` or `snsTopicArn`.").optional(),
              "snsTopicArn": z.string().optional().describe("#### The ARN of an existing SNS topic.\n\n---\n\nUse this to subscribe to a topic that is not managed by your stack.\nYou must specify either `snsTopicName` or `snsTopicArn`.").optional(),
              "filterPolicy": z.any().optional().describe("#### Filter messages by attributes so only relevant ones trigger the function.\n\n---\n\nUses SNS subscription filter policy syntax. For content-based filtering, use EventBridge instead.").optional(),
              "onDeliveryFailure": z.object({
                "sqsQueueArn": z.string().optional().describe("#### The ARN of the SQS queue for failed messages.").optional(),
                "sqsQueueName": z.string().optional().describe("#### The name of an SQS queue (defined in your Stacktape configuration) for failed messages.").optional() }).strict()
              .optional().describe("#### A destination for messages that fail to be delivered to the target.\n\n---\n\nIn rare cases (e.g., if the target function cannot scale fast enough), a message might fail to be delivered.\nThis property specifies an SQS queue where failed messages will be sent.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when a new message is published to an SNS topic.\n\n---\n\nSNS is a pub/sub messaging service. Reference a topic from your stack's `snsTopics` or use an external ARN."), z.object({
            "type": z.literal("sqs"),
            "properties": z.object({
              "sqsQueueName": z.string().optional().describe("#### The name of an SQS queue defined in your stack's resources.\n\n---\n\nYou must specify either `sqsQueueName` or `sqsQueueArn`.").optional(),
              "sqsQueueArn": z.string().optional().describe("#### The ARN of an existing SQS queue.\n\n---\n\nUse this to consume messages from a queue that is not managed by your stack.\nYou must specify either `sqsQueueName` or `sqsQueueArn`.").optional(),
              "batchSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum number of records to process in a single batch.\n\n---\n\nMaximum is 10,000.").default(10),
              "maxBatchWindowSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time (in seconds) to wait before invoking the function with a batch of records.\n\n---\n\nMaximum is 300 seconds. If not set, the function is invoked as soon as messages are available.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when new messages are available in an SQS queue.\n\n---\n\nMessages are processed in batches. The function fires when `batchSize` is reached,\n`maxBatchWindowSeconds` expires, or the 6 MB payload limit is hit.\n\n**Important:** A single SQS queue should only have one consumer function. For fan-out (multiple\nconsumers for the same message), use an SNS topic or EventBridge event bus instead."), z.object({
            "type": z.literal("kinesis-stream"),
            "properties": z.object({
              "kinesisStreamName": z.string().optional().describe("#### The name of a Kinesis stream defined in your stack's resources.\n\n---\n\nYou must specify either `kinesisStreamName` or `streamArn`.").optional(),
              "streamArn": z.string().optional().describe("#### The ARN of an existing Kinesis stream to consume records from.\n\n---\n\nUse this to consume from a stream that is not managed by your stack.\nYou must specify either `kinesisStreamName` or `streamArn`.").optional(),
              "consumerArn": z.string().optional().describe("#### The ARN of a specific stream consumer to use.\n\n---\n\nThis cannot be used with `autoCreateConsumer`.").optional(),
              "autoCreateConsumer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Automatically creates a dedicated stream consumer for this integration.\n\n---\n\nThis is recommended for minimizing latency and maximizing throughput.\nFor more details, see the [AWS documentation on stream consumers](https://docs.aws.amazon.com/streams/latest/dev/amazon-kinesis-consumers.html).\nThis cannot be used with `consumerArn`.").optional(),
              "maxBatchWindowSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time (in seconds) to wait before invoking the function with a batch of records.\n\n---\n\nMaximum is 300 seconds.").optional(),
              "batchSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum number of records to process in a single batch.\n\n---\n\nMaximum is 10,000.").default(10),
              "startingPosition": z.enum(["LATEST","TRIM_HORIZON"]).optional().describe("#### The position in the stream from which to start reading records.\n\n---\n\n- `LATEST`: Read only new records.\n- `TRIM_HORIZON`: Read all available records from the beginning of the stream."),
              "maximumRetryAttempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of times to retry a failed batch of records.\n\n---\n\n> **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.").optional(),
              "onFailure": z.object({
                "arn": z.string().describe("#### The ARN of the SNS topic or SQS queue for failed batches."),
                "type": z.enum(["sns","sqs"]).describe("#### The type of the destination.") }).strict()
              .optional().describe("#### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.").optional(),
              "parallelizationFactor": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of batches to process concurrently from the same shard.").optional(),
              "bisectBatchOnFunctionError": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Splits a failed batch in two before retrying.\n\n---\n\nThis can be useful if a failure is caused by a batch being too large.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when new records are available in a Kinesis Data Stream.\n\n---\n\nRecords are processed in batches. Two consumption modes:\n- **Direct**: Polls each shard ~1/sec, throughput shared with other consumers.\n- **Stream Consumer** (`autoCreateConsumer`): Dedicated connection per shard — higher throughput, lower latency."), z.object({
            "type": z.literal("dynamo-db-stream"),
            "properties": z.object({
              "streamArn": z.string().describe("#### The ARN of the DynamoDB table stream."),
              "maxBatchWindowSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum time (in seconds) to wait before invoking the function with a batch of records.\n\n---\n\nMaximum is 300 seconds.").optional(),
              "batchSize": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The maximum number of records to process in a single batch.\n\n---\n\nMaximum is 1,000.").default(100),
              "startingPosition": z.string().optional().describe("#### The position in the stream from which to start reading records.\n\n---\n\n- `LATEST`: Read only new records.\n- `TRIM_HORIZON`: Read all available records from the beginning of the stream.").default("TRIM_HORIZON"),
              "maximumRetryAttempts": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of times to retry a failed batch of records.\n\n---\n\n> **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.").optional(),
              "onFailure": z.object({
                "arn": z.string().describe("#### The ARN of the SNS topic or SQS queue for failed batches."),
                "type": z.enum(["sns","sqs"]).describe("#### The type of the destination.") }).strict()
              .optional().describe("#### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.").optional(),
              "parallelizationFactor": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### The number of batches to process concurrently from the same shard.").optional(),
              "bisectBatchOnFunctionError": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Splits a failed batch in two before retrying.\n\n---\n\nThis can be useful if a failure is caused by a batch being too large.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when items are created, updated, or deleted in a DynamoDB table.\n\n---\n\nRecords are processed in batches. You must enable streams on the DynamoDB table first\n(set `streaming` in your `dynamoDbTables` config)."), z.object({
            "type": z.literal("s3"),
            "properties": z.object({
              "bucketArn": z.string().describe("#### The ARN of the S3 bucket to monitor for events."),
              "s3EventType": z.enum(["s3:ObjectCreated:*","s3:ObjectCreated:CompleteMultipartUpload","s3:ObjectCreated:Copy","s3:ObjectCreated:Post","s3:ObjectCreated:Put","s3:ObjectRemoved:*","s3:ObjectRemoved:Delete","s3:ObjectRemoved:DeleteMarkerCreated","s3:ObjectRestore:*","s3:ObjectRestore:Completed","s3:ObjectRestore:Post","s3:ReducedRedundancyLostObject","s3:Replication:*","s3:Replication:OperationFailedReplication","s3:Replication:OperationMissedThreshold","s3:Replication:OperationNotTracked","s3:Replication:OperationReplicatedAfterThreshold"]).describe("#### The type of S3 event that will trigger the function."),
              "filterRule": z.object({
                "prefix": z.string().optional().describe("#### The prefix that an object's key must have to trigger the function.").optional(),
                "suffix": z.string().optional().describe("#### The suffix that an object's key must have to trigger the function.").optional() }).strict()
              .optional().describe("#### A filter to apply to objects, so the function is only triggered for relevant objects.").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when files are created, deleted, or restored in an S3 bucket."), z.object({
            "type": z.literal("schedule"),
            "properties": z.object({
              "scheduleRate": z.string().describe("#### The schedule rate or cron expression.\n\n---\n\nExamples: `rate(2 hours)`, `cron(0 10 * * ? *)`"),
              "input": z.any().optional().describe("#### A fixed JSON object to be passed as the event payload.\n\n---\n\nIf you need to customize the payload based on the event, use `inputTransformer` instead.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninput:\n  source: 'my-scheduled-event'\n```").optional(),
              "inputPath": z.string().optional().describe("#### A JSONPath expression to extract a portion of the event to pass to the target.\n\n---\n\nThis is useful for forwarding only a specific part of the event payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputPath: '$.detail'\n```").optional(),
              "inputTransformer": z.object({
                "inputPathsMap": z.any().optional().describe("#### A map of key-value pairs to extract from the event payload.\n\n---\n\nEach value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.").optional(),
                "inputTemplate": z.any().describe("#### A template for constructing a new event payload.\n\n---\n\nUse placeholders (`<placeholder>`) to insert the values extracted with `inputPathsMap`.") }).strict()
              .optional().describe("#### Customizes the event payload sent to the target.\n\n---\n\nThis allows you to extract values from the original event and use them to construct a new payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputTransformer:\n  inputPathsMap:\n    eventTime: '$.time'\n  inputTemplate:\n    message: 'This event occurred at <eventTime>.'\n```").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function on a recurring schedule (cron jobs, periodic tasks).\n\n---\n\nTwo formats:\n- **Rate**: `rate(5 minutes)`, `rate(1 hour)`, `rate(7 days)`\n- **Cron**: `cron(0 18 ? * MON-FRI *)` (6-field AWS cron, all times UTC)"), z.object({
            "type": z.literal("cloudwatch-alarm"),
            "properties": z.object({
              "alarmName": z.string().describe("#### The name of the alarm (defined in the `alarms` section) that will trigger the function.") }).strict()
          }).strict()
          , z.object({
            "type": z.literal("cloudwatch-log"),
            "properties": z.object({
              "logGroupArn": z.string().describe("#### The ARN of the log group to watch for new records."),
              "filter": z.string().optional().describe("#### A filter pattern to apply to the log records.\n\n---\n\nOnly logs that match this pattern will trigger the function.\nFor details on the syntax, see the [AWS documentation on filter and pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).").optional() }).strict()
          }).strict()
          .describe("#### Triggers a function when new log records appear in a CloudWatch log group.\n\n---\n\n**Note:** The event payload is base64-encoded and gzipped — you must decode and decompress it in your handler."), z.object({
            "type": z.literal("http-api-gateway"),
            "properties": z.object({
              "httpApiGatewayName": z.string().describe("#### The name of the HTTP API Gateway."),
              "method": z.enum(["*","DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"]).describe("#### The HTTP method that will trigger this integration.\n\n---\n\nYou can specify an exact method (e.g., `GET`) or use `*` to match any method."),
              "path": z.string().describe("#### The URL path that will trigger this integration.\n\n---\n\n- **Exact path**: `/users`\n- **Path with parameter**: `/users/{id}`. The `id` will be available in `event.pathParameters.id`.\n- **Greedy path**: `/files/{proxy+}`. This will match any path starting with `/files/`."),
              "authorizer": z.union([z.object({
                  "type": z.literal("cognito").describe("#### Cognito JWT authorizer\n\n---\n\nConfigures an HTTP API authorizer that validates JSON Web Tokens (JWTs) issued by a Cognito user pool.\nThis is the simplest way to protect routes when your users sign in via `user-auth-pool`.\n\nStacktape turns this into an API Gateway v2 authorizer of type `JWT` that checks the token's issuer and audience."),
                  "properties": z.object({
                    "userPoolName": z.string().describe("#### Name of the user pool to protect the API\n\n---\n\nThe Stacktape name of the `user-auth-pool` resource whose tokens should be accepted by this HTTP API authorizer.\nStacktape uses this to:\n\n- Set the expected **audience** to the user pool client ID.\n- Build the expected **issuer** URL based on the user pool and AWS region.\n\nIn practice this means only JWTs issued by this pool (and its client) will be considered valid."),
                    "identitySources": z.array(z.string()).optional().describe("#### Where to read the JWT from in the request\n\n---\n\nA list of identity sources that tell API Gateway where to look for the bearer token, using the\n`$request.*` syntax from API Gateway (for example `'$request.header.Authorization'`).\n\nIf you omit this, Stacktape defaults to reading the token from the `Authorization` HTTP header,\nusing a JWT authorizer as described in the API Gateway v2 authorizer docs\n([AWS::ApiGatewayV2::Authorizer](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer)).").optional() }).strict()
                }).strict()
                , z.object({
                  "type": z.literal("lambda").describe("#### Lambda-based HTTP API authorizer\n\n---\n\nConfigures an API Gateway **request** authorizer that runs a Lambda function to decide whether a request is allowed.\nThis is useful when your authorization logic can't be expressed as simple JWT validation – for example when you\ncheck API keys, look up permissions in a database, or integrate with a non-JWT identity system.\n\nStacktape creates an `AWS::ApiGatewayV2::Authorizer` of type `REQUEST` and wires it up to your Lambda."),
                  "properties": z.object({
                    "functionName": z.string().describe("#### Name of the authorizer function\n\n---\n\nThe Stacktape name of a `function` resource that should run for each authorized request.\nAPI Gateway calls this Lambda, passes request details, and uses its response to allow or deny access."),
                    "iamResponse": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Use IAM-style (v1) authorizer responses\n\n---\n\n- If `true`, your Lambda must return a full IAM policy document (the \"v1\" format).\n- If `false` or omitted, Stacktape enables **simple responses** (the HTTP API v2 payload format)\n  so your Lambda can return a small JSON object with an `isAuthorized` flag and optional context.\n\nThis flag is wired to `EnableSimpleResponses` on the underlying `AWS::ApiGatewayV2::Authorizer`.").optional(),
                    "identitySources": z.array(z.string()).optional().describe("#### Where to read identity data from\n\n---\n\nA list of request fields API Gateway should pass into your Lambda authorizer (for example headers, query parameters,\nor stage variables) using the `$request.*` syntax.\n\nWhen left empty, no specific identity sources are configured and your Lambda must inspect the incoming event directly.").optional(),
                    "cacheResultSeconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Cache authorizer results\n\n---\n\nNumber of seconds API Gateway should cache the result of the Lambda authorizer for a given identity.\nWhile cached, repeated requests skip calling your authorizer function and reuse the previous result.\n\nThis value is applied to `AuthorizerResultTtlInSeconds`. If omitted, Stacktape sets it to `0` (no caching).").optional() }).strict()
                }).strict()
              ]).optional().describe("#### An authorizer to protect this route.\n\n---\n\nUnauthorized requests will be rejected with a `401 Unauthorized` response.").optional(),
              "payloadFormat": z.enum(["1.0","2.0"]).optional().describe("#### The payload format version for the Lambda integration.\n\n---\n\nFor details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).") }).strict()
          }).strict()
          .describe("#### Triggers a function when an HTTP API Gateway receives a matching request.\n\n---\n\nRoutes are matched by specificity — exact paths take priority over wildcard paths."), z.object({
            "type": z.literal("event-bus"),
            "properties": z.object({
              "eventBusArn": z.string().optional().describe("#### The ARN of an existing event bus.\n\n---\n\nUse this to subscribe to an event bus that is not managed by your stack.\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
              "eventBusName": z.string().optional().describe("#### The name of an event bus defined in your stack's resources.\n\n---\n\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
              "useDefaultBus": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Uses the default AWS event bus.\n\n---\n\nYou must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.").optional(),
              "eventPattern": z.object({
                "version": z.any().optional().describe("#### Filter by event version.").optional(), "detail-type": z.any().optional().describe("#### Filter by event detail-type (e.g., `[\"OrderPlaced\"]`). This is the primary field for routing custom events.").optional(),
                "source": z.any().optional().describe("#### Filter by event source (e.g., `[\"my-app\"]` or `[\"aws.ec2\"]` for AWS service events).").optional(),
                "account": z.any().optional().describe("#### Filter by AWS account ID.").optional(),
                "region": z.any().optional().describe("#### Filter by AWS region.").optional(),
                "resources": z.any().optional().describe("#### Filter by resource ARNs.").optional(),
                "detail": z.any().optional().describe("#### Filter by event payload content. Supports nested matching, prefix/suffix, numeric comparisons.").optional(), "replay-name": z.any().optional().describe("#### Filter by replay name (only present on replayed events).").optional() }).strict()
              .describe("#### A pattern to filter events from the event bus.\n\n---\n\nOnly events that match this pattern will trigger the target.\nFor details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)."),
              "onDeliveryFailure": z.object({
                "sqsQueueArn": z.string().optional().describe("#### The ARN of the SQS queue for failed events.").optional(),
                "sqsQueueName": z.string().optional().describe("#### The name of an SQS queue (defined in your Stacktape configuration) for failed events.").optional() }).strict()
              .optional().describe("#### A destination for events that fail to be delivered to the target.\n\n---\n\nIn rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.").optional(),
              "input": z.any().optional().describe("#### A fixed JSON object to be passed as the event payload.\n\n---\n\nIf you need to customize the payload based on the event, use `inputTransformer` instead.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninput:\n  source: 'my-custom-event'\n```").optional(),
              "inputPath": z.string().optional().describe("#### A JSONPath expression to extract a portion of the event to pass to the target.\n\n---\n\nThis is useful for forwarding only a specific part of the event payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputPath: '$.detail'\n```").optional(),
              "inputTransformer": z.object({
                "inputPathsMap": z.any().optional().describe("#### A map of key-value pairs to extract from the event payload.\n\n---\n\nEach value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.").optional(),
                "inputTemplate": z.any().describe("#### A template for constructing a new event payload.\n\n---\n\nUse placeholders (`<placeholder>`) to insert the values extracted with `inputPathsMap`.") }).strict()
              .optional().describe("#### Customizes the event payload sent to the target.\n\n---\n\nThis allows you to extract values from the original event and use them to construct a new payload.\nYou can only use one of `input`, `inputPath`, or `inputTransformer`.\n\nExample:\n\n```yaml\ninputTransformer:\n  inputPathsMap:\n    instanceId: '$.detail.instance-id'\n    instanceState: '$.detail.state'\n  inputTemplate:\n    message: 'Instance <instanceId> is now in state <instanceState>.'\n```").optional() }).strict()
          }).strict()
          .describe("#### Triggers a batch job when an event matching a specified pattern is received by an event bus.\n\n---\n\nYou can use a custom event bus or the default AWS event bus.")])).optional().describe("#### What triggers this function: HTTP requests, file uploads, queues, schedules, etc.\n\n---\n\nStacktape auto-configures permissions for each trigger.\nThe event payload your function receives depends on the trigger type.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables available to the function at runtime.\n\n---\n\nVariables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.").optional(),
        "runtime": z.enum(["dotnet6","dotnet7","dotnet8","java11","java17","java8","java8.al2","nodejs18.x","nodejs20.x","nodejs22.x","nodejs24.x","provided.al2","provided.al2023","python3.10","python3.11","python3.12","python3.13","python3.8","python3.9","ruby3.3"]).optional().describe("#### The language runtime (e.g., `nodejs22.x`, `python3.13`).\n\n---\n\nAuto-detected from your source file extension when using `stacktape-lambda-buildpack`.\nOverride only if you need a specific version.").optional(),
        "architecture": z.enum(["arm64","x86_64"]).optional().describe("#### Processor architecture: `x86_64` (default) or `arm64` (Graviton, ~20% cheaper).\n\n---\n\n`arm64` is cheaper per GB-second and often faster. Works with most code out of the box.\nIf using `stacktape-lambda-buildpack`, Stacktape builds for the selected architecture automatically.\nWith `custom-artifact`, you must pre-compile for the target architecture.").default("x86_64"),
        "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128 - 10,240). Also determines CPU power.\n\n---\n\nLambda scales CPU proportionally to memory: 1,769 MB = 1 vCPU, 3,538 MB = 2 vCPUs, etc.\nIf your function is slow, increasing memory gives it more CPU, which often makes it faster\nand cheaper overall (less execution time).").optional(),
        "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Function is killed if it exceeds this.\n\n---\n\nMaximum: 900 seconds (15 minutes). For longer tasks, use a `batch-job` or `worker-service`.").default(10),
        "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connects the function to your VPC so it can reach databases, Redis, and other VPC-only resources.\n\n---\n\n**You usually don't need to set this manually.** Stacktape will tell you if a resource in your `connectTo`\nrequires it (e.g., a database with `accessibilityMode: 'vpc'`, or any Redis cluster).\n\n**Tradeoff:** The function loses direct internet access. It can still reach S3 and DynamoDB\n(Stacktape auto-creates VPC endpoints), but calls to external APIs (Stripe, OpenAI, etc.) will fail.\nIf you need both VPC access and internet, use a `web-service` or `worker-service` instead.\n\nRequired when using `volumeMounts` (EFS).").default(false),
        "tags": z.array(z.object({
          "name": z.string().describe("#### Tag name (1-128 characters)."),
          "value": z.string().describe("#### Tag value (1-256 characters).") }).strict()
        ).optional().describe("#### Additional tags for this function (on top of stack-level tags). Max 50.").optional(),
        "destinations": z.object({
          "onSuccess": z.string().optional().describe("#### ARN to receive the result when the function succeeds (SQS, SNS, EventBus, or Lambda ARN).").optional(),
          "onFailure": z.string().optional().describe("#### ARN to receive error details when the function fails. Useful for dead-letter processing.").optional() }).strict()
        .optional().describe("#### Route async invocation results to another service (SQS, SNS, EventBus, or another function).\n\n---\n\nUseful for building event-driven workflows: send successful results to one destination\nand failures to another for error handling.").optional(),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Logging configuration (retention, forwarding).\n\n---\n\nLogs (`stdout`/`stderr`) are auto-sent to CloudWatch. View with `stacktape logs` or in the Stacktape Console.").optional(),
        "provisionedConcurrency": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Eliminates cold starts by keeping function instances warm and ready.\n\n---\n\nWhen a function hasn't been called recently, the first request can take 1-5+ seconds (\"cold start\").\nThis setting pre-warms the specified number of instances so they respond instantly.\n\n**When to use:** User-facing APIs, web/mobile backends, or any function where response time matters.\nSkip this for background jobs, cron tasks, or data pipelines.\n\n**Cost:** You pay for each provisioned instance even when idle. Also increases deploy time by ~2-5 minutes.").optional(),
        "reservedConcurrency": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Cap the maximum number of concurrent instances for this function.\n\n---\n\nReserves this many execution slots exclusively for this function — other functions can't use them,\nand this function can't scale beyond it. **No additional cost.**\n\nCommon uses:\n- Prevent overwhelming a database with too many connections\n- Guarantee capacity for critical functions\n- Throttle expensive downstream API calls").optional(),
        "layers": z.array(z.string()).optional().describe("#### Lambda Layer ARNs to attach (shared libraries, custom runtimes, etc.).\n\n---\n\nLayers are zip archives with additional code/data mounted into the function.\nProvide the layer ARN (e.g., from AWS console or another stack). Max 5 layers per function.").optional(),
        "deployment": z.object({
          "strategy": z.enum(["AllAtOnce","Canary10Percent10Minutes","Canary10Percent15Minutes","Canary10Percent30Minutes","Canary10Percent5Minutes","Linear10PercentEvery10Minutes","Linear10PercentEvery1Minute","Linear10PercentEvery2Minutes","Linear10PercentEvery3Minutes"]).describe("#### How traffic shifts from the old version to the new one.\n\n---\n\n- **Canary**: Send 10% of traffic first, then all traffic after a wait period.\n- **Linear**: Shift 10% of traffic at regular intervals.\n- **AllAtOnce**: Instant switch (no gradual rollout)."),
          "beforeAllowTrafficFunction": z.string().optional().describe("#### Function to run before traffic shifting begins (e.g., smoke tests).\n\n---\n\nMust signal success/failure to CodeDeploy. If it fails, the deployment rolls back.").optional(),
          "afterTrafficShiftFunction": z.string().optional().describe("#### Function to run after all traffic has shifted (e.g., post-deploy validation).\n\n---\n\nMust signal success/failure to CodeDeploy.").optional() }).strict()
        .optional().describe("#### Gradual traffic shifting for safe deployments.\n\n---\n\nInstead of switching all traffic to the new version instantly, shift it gradually\n(canary or linear). If issues arise, traffic rolls back automatically.").optional(),
        "alarms": z.array(z.object({
          "trigger": z.union([z.object({
              "type": z.literal("lambda-error-rate"),
              "properties": z.object({
                "thresholdPercent": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when the percentage of failed Lambda invocations exceeds this value."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("lambda-duration"),
              "properties": z.object({
                "thresholdMilliseconds": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Fires when Lambda execution time exceeds this value (ms).\n\n---\n\nDefault: fires if **average** duration > threshold. Customize with `statistic` and `comparisonOperator`."),
                "comparisonOperator": z.enum(["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanOrEqualToThreshold","LessThanThreshold"]).optional().describe("#### How to compare the metric value against the threshold.").default("GreaterThanThreshold"),
                "statistic": z.enum(["avg","max","min","p90","p95","p99","sum"]).optional().describe("#### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.").default("avg") }).strict()
            }).strict()
          ]),
          "evaluation": z.object({
            "period": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Duration of one evaluation period in seconds. Must be a multiple of 60.").default(60),
            "evaluationPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many recent periods to evaluate. Prevents alarms from firing on short spikes.\n\n---\n\nExample: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached\nin at least 3 of the last 5 periods.").default(1),
            "breachedPeriods": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.\n\n---\n\nMust be ≤ `evaluationPeriods`.").default(1) }).strict()
          .optional().describe("#### How long and how often to evaluate the metric before triggering.\n\n---\n\nControls the evaluation window (period), how many periods to look at, and how many must breach\nthe threshold to fire the alarm. Useful for filtering out short spikes.").optional(),
          "notificationTargets": z.array(z.union([z.object({
              "type": z.literal("ms-teams"),
              "properties": z.object({
                "webhookUrl": z.string().describe("#### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.\n\n---\n\nCreate an Incoming Webhook connector in your Teams channel settings to get this URL.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("slack"),
              "properties": z.object({
                "conversationId": z.string().describe("#### The Slack channel or DM ID to send notifications to.\n\n---\n\nTo find the ID: open the channel, click its name, and look at the bottom of the **About** tab."),
                "accessToken": z.string().describe("#### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.\n\n---\n\nCreate a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.") }).strict()
              .optional().describe("").optional() }).strict()
            , z.object({
              "type": z.literal("email"),
              "properties": z.object({
                "sender": z.string().describe("#### The email address of the sender."),
                "recipient": z.string().describe("#### The email address of the recipient.") }).strict()
            }).strict()
          ])).optional().describe("#### Where to send notifications when the alarm fires — Slack, MS Teams, or email.").optional(),
          "description": z.string().optional().describe("#### Custom alarm description used in notification messages and the AWS console.").optional() }).strict()
        ).optional().describe("#### Alarms for this function (merged with global alarms from the Stacktape Console).").optional(),
        "disabledGlobalAlarms": z.array(z.string()).optional().describe("#### Global alarm names to exclude from this function.").optional(),
        "url": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable the function URL."),
          "cors": z.object({
            "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CORS. When `true` with no other settings, uses permissive defaults (`*` for origins and methods)."),
            "allowedOrigins": z.array(z.string()).optional().describe("#### Allowed origins (e.g., `https://example.com`). Use `*` for any origin.").default(["*"]),
            "allowedHeaders": z.array(z.string()).optional().describe("#### Allowed request headers (e.g., `Content-Type`, `Authorization`).").optional(),
            "allowedMethods": z.array(z.enum(["*","DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### Allowed HTTP methods (e.g., `GET`, `POST`).").optional(),
            "allowCredentials": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Allow cookies and credentials in cross-origin requests.").optional(),
            "exposedResponseHeaders": z.array(z.string()).optional().describe("#### Response headers accessible to browser JavaScript.").optional(),
            "maxAge": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### How long (seconds) browsers can cache preflight responses.").optional() }).strict()
          .optional().describe("#### CORS settings for the function URL. Overrides any CORS headers from the function itself.").optional(),
          "authMode": z.enum(["AWS_IAM","NONE"]).optional().describe("#### Who can call this URL.\n\n---\n\n- `NONE` — public, anyone can call it.\n- `AWS_IAM` — only authenticated AWS users/roles with invoke permission."),
          "responseStreamEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Stream the response progressively instead of buffering the entire response.\n\n---\n\nImproves Time to First Byte and increases max response size from 6 MB to 20 MB.\nRequires using the AWS streaming handler pattern in your code.").optional() }).strict()
        .optional().describe("#### Give this function its own HTTPS URL (no API Gateway needed).\n\n---\n\nSimpler and cheaper than an API Gateway for single-function endpoints.\nURL format: `https://{id}.lambda-url.{region}.on.aws`").optional(),
        "cdn": z.object({
          "enabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.\n\n---\n\nCaches responses at edge locations worldwide so users get content from the nearest server.\nThe CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.").default(false),
          "cachingOptions": z.object({
            "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
            "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
            "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
            "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
            "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
            "cacheKeyParameters": z.object({
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
              .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
            .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
            "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
          .optional().describe("#### Control how long and what gets cached at the CDN edge.\n\n---\n\nWhen the origin response has no `Cache-Control` header, defaults apply:\n- **Bucket origins**: cached for 6 months (or until invalidated on deploy).\n- **API Gateway / Load Balancer origins**: not cached.").optional(),
          "forwardingOptions": z.object({
            "customRequestHeaders": z.array(z.object({
              "headerName": z.string().describe("#### Name of the header"),
              "value": z.string().describe("#### Value of the header") }).strict()
            ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
            "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
            "cookies": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
            "headers": z.object({
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
              "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
              "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
              "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
            .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
            "queryString": z.object({
              "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
              "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
              "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
            .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
            "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
          .optional().describe("#### Control which headers, cookies, and query params are forwarded to your origin.\n\n---\n\nBy default, all headers/cookies/query params are forwarded. Use this to restrict\nwhat reaches your app (e.g., strip cookies for static content).").optional(),
          "routeRewrites": z.array(z.object({
            "path": z.string().describe("#### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported."),
            "routePrefix": z.string().optional().describe("#### Prepend a path prefix to requests before forwarding to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.").optional(),
            "routeTo": z.union([z.object({
                "type": z.literal("application-load-balancer"),
                "properties": z.object({
                  "loadBalancerName": z.string().describe("#### Name of the `application-load-balancer` resource to route to."),
                  "listenerPort": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Listener port on the load balancer. Only needed if using custom listeners.").optional(),
                  "originDomainName": z.string().optional().describe("#### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("http-api-gateway"),
                "properties": z.object({
                  "httpApiGatewayName": z.string().describe("#### Name of the `http-api-gateway` resource to route to.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("function"),
                "properties": z.object({
                  "functionName": z.string().describe("#### Name of the `function` resource to route to. The function must have `url.enabled: true`.") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("custom-origin"),
                "properties": z.object({
                  "domainName": z.string().describe("#### Domain name of the external origin (e.g., `api.example.com`)."),
                  "protocol": z.enum(["HTTP","HTTPS"]).optional().describe("#### Protocol for connecting to the origin."),
                  "port": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("bucket"),
                "properties": z.object({
                  "bucketName": z.string().describe("#### Name of the `bucket` resource to route to."),
                  "disableUrlNormalization": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable clean URL normalization (e.g., `/about` → `/about.html`).").default(false) }).strict()
              }).strict()
            ]).optional().describe("#### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.\n\n---\n\nIf not set, requests go to the default origin (the resource this CDN is attached to).").optional(),
            "cachingOptions": z.object({
              "cacheMethods": z.array(z.enum(["GET","HEAD","OPTIONS"])).optional().describe("#### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.").optional(),
              "minTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.").optional(),
              "maxTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.").optional(),
              "defaultTTL": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.").optional(),
              "disableCompression": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.").default(false),
              "cacheKeyParameters": z.object({
                "cookies": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are included in the cache key.").optional(),
                  "allExcept": z.array(z.string()).optional().describe("#### All cookies except the listed ones are included in the cache key.").optional(),
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which cookies to include in the cache key. Different cookie values = different cached responses.").optional(),
                "headers": z.object({
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which headers to include in the cache key. Different header values = different cached responses.").optional(),
                "queryString": z.object({
                  "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are included in the cache key.").optional(),
                  "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are included in the cache key.").optional(),
                  "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are included in the cache key.").optional() }).strict()
                .optional().describe("#### Which query params to include in the cache key. Different param values = different cached responses.").optional() }).strict()
              .optional().describe("#### Which headers, cookies, and query params make responses unique in the cache.\n\n---\n\nDefaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.\nValues included in the cache key are always forwarded to the origin.").optional(),
              "cachePolicyId": z.string().optional().describe("#### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.").optional() }).strict()
            .optional().describe("#### Override caching behavior for requests matching this route.").optional(),
            "forwardingOptions": z.object({
              "customRequestHeaders": z.array(z.object({
                "headerName": z.string().describe("#### Name of the header"),
                "value": z.string().describe("#### Value of the header") }).strict()
              ).optional().describe("#### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).").optional(),
              "allowedMethods": z.array(z.enum(["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"])).optional().describe("#### HTTP methods forwarded to the origin. Default: all methods.").optional(),
              "cookies": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No cookies are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed cookies are forwarded to the origin.").optional(),
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All cookies are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which cookies to forward to the origin. Default: all cookies.\n\n---\n\nCookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.").optional(),
              "headers": z.object({
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No headers are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed headers are forwarded to the origin.").optional(),
                "allViewer": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Forward all headers from the viewer's request.").optional(),
                "allViewerAndWhitelistCloudFront": z.array(z.string()).optional().describe("#### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).").optional(),
                "allExcept": z.array(z.string()).optional().describe("#### Forward all viewer headers except the listed ones.").optional() }).strict()
              .optional().describe("#### Which headers to forward to the origin. Default: all headers.\n\n---\n\n> The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.").optional(),
              "queryString": z.object({
                "all": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### All query parameters are forwarded to the origin.").optional(),
                "none": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### No query parameters are forwarded to the origin.").optional(),
                "whitelist": z.array(z.string()).optional().describe("#### Only the listed query parameters are forwarded to the origin.").optional() }).strict()
              .optional().describe("#### Which query params to forward to the origin. Default: all query params.").optional(),
              "originRequestPolicyId": z.string().optional().describe("#### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.").optional() }).strict()
            .optional().describe("#### Override which headers, cookies, and query params are forwarded for this route.").optional(),
            "edgeFunctions": z.object({
              "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
              "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
              "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
              "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
            .optional().describe("#### Run edge functions on requests/responses matching this route.").optional() }).strict()
          ).optional().describe("#### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).\n\n---\n\nEvaluated in order; first match wins. Unmatched requests go to the default origin.\nEach route can have its own caching and forwarding settings.").optional(),
          "customDomains": z.array(z.object({
            "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
            "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
            "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
          ).optional().describe("#### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.\n\n---\n\nYour domain must be added as a Route53 hosted zone in your AWS account first.").optional(),
          "edgeFunctions": z.object({
            "onRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).\n\n---\n\nUse to modify the request, add auth checks, or return an immediate response without hitting the origin.").optional(),
            "onResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before returning the response to the client.\n\n---\n\nUse to modify response headers, add security headers, or set cookies.\nDoes not run if the origin returned a 400+ error or if `onRequest` already generated a response.").optional(),
            "onOriginRequest": z.string().optional().describe("#### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).\n\n---\n\nOnly runs on cache misses. Use to modify the request before it reaches your origin.\n\n> **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.\n> Overriding it may break default behavior. Only use if you know what you're doing.").optional(),
            "onOriginResponse": z.string().optional().describe("#### Name of an `edge-lambda-function` to run after the origin responds (before caching).\n\n---\n\nModify the response before it's cached and returned. Changes are cached as if they came from the origin.").optional() }).strict()
          .optional().describe("#### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).\n\n---\n\n- `onRequest`: Before cache lookup — modify the request, add auth, or return early.\n- `onResponse`: Before returning to the client — modify headers, add cookies.").optional(),
          "cloudfrontPriceClass": z.enum(["PriceClass_100","PriceClass_200","PriceClass_All"]).optional().describe("#### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.\n\n---\n\n- **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.\n- **`PriceClass_200`**: Adds Asia, Middle East, Africa.\n- **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.\n\nThe CDN itself has no monthly base cost - you only pay per request and per GB transferred.\nThe price class controls which edge locations are used, and some regions cost more per request."),
          "defaultRoutePrefix": z.string().optional().describe("#### Prepend a path prefix to all requests forwarded to the origin.\n\n---\n\nE.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.").optional(),
          "errorDocument": z.string().optional().describe("#### Page to show for 404 errors (e.g., `/error.html`).").default("/404.html"),
          "indexDocument": z.string().optional().describe("#### Page served for requests to `/`.").default("/index.html"),
          "disableInvalidationAfterDeploy": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip clearing the CDN cache after each deploy.\n\n---\n\nBy default, all cached content is flushed on every deploy so users see the latest version.\nSet to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.").default(false),
          "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.").optional() }).strict()
        .optional().describe("#### Put a CDN (CloudFront) in front of this function for caching and lower latency.\n\n---\n\nCaches responses at edge locations worldwide. Reduces function invocations and bandwidth costs.").optional(),
        "storage": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Size of the `/tmp` directory in MB (512 - 10,240). Ephemeral per invocation.\n\n---\n\nIncrease if your function downloads/processes large files temporarily.").default(512),
        "volumeMounts": z.array(z.object({
          "type": z.literal("efs").describe("#### The type of the volume mount."),
          "properties": z.object({
            "efsFilesystemName": z.string().describe("#### Name of the `efs-filesystem` resource defined in your config."),
            "rootDirectory": z.string().optional().describe("#### Subdirectory within the EFS filesystem to mount. Omit for full access.").default("/"),
            "mountPath": z.string().describe("#### Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/data`).") }).strict()
          .describe("#### Properties for the EFS volume mount.") }).strict()
        ).optional().describe("#### Persistent EFS storage shared across invocations and functions.\n\n---\n\nUnlike `/tmp`, EFS data persists indefinitely and can be shared across multiple functions.\nRequires `joinDefaultVpc: true` (Stacktape will remind you if you forget).").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### A serverless compute resource that runs your code in response to events.\n\n---\n\nLambda functions are short-lived, stateless, and scale automatically. You only pay for the compute time you consume."), z.object({
      "type": z.literal("edge-lambda-function"),
      "properties": z.object({
        "packaging": z.union([z.object({
            "type": z.literal("stacktape-lambda-buildpack"),
            "properties": z.object({
              "handlerFunction": z.string().optional().describe("#### The name of the handler function to be executed when the Lambda is invoked.").optional(),
              "entryfilePath": z.string().describe("#### Path to your app's entry point, relative to the Stacktape config file.\n\n---\n\nFor JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.\nFor Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI)."),
              "includeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly include in the deployment package.\n\n---\n\nThe path is relative to your Stacktape configuration file.").optional(),
              "excludeFiles": z.array(z.string()).optional().describe("#### A glob pattern of files to explicitly exclude from the deployment package.\n\n---").optional(),
              "excludeDependencies": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.").optional(),
              "languageSpecificConfig": z.union([z.object({
                  "tsConfigPath": z.string().optional().describe("#### The path to the `tsconfig.json` file.\n\n---\n\nThis is primarily used to resolve path aliases during the build process.").optional(),
                  "emitTsDecoratorMetadata": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.").optional(),
                  "dependenciesToExcludeFromBundle": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the main bundle.\n\n---\n\nThese dependencies will be treated as \"external\" and will not be bundled directly into your application's code.\nInstead, they will be installed separately in the deployment package.\nUse `*` to exclude all dependencies from the bundle.").optional(),
                  "outputModuleFormat": z.enum(["cjs","esm"]).optional().describe("#### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).\n\n---\n\n**Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces."),
                  "nodeVersion": z.union([z.literal(16), z.literal(17), z.literal(18), z.literal(19), z.literal(20), z.literal(21), z.literal(22), z.literal(23), z.literal(24)]).optional().describe("#### The major version of Node.js to use.").default(18),
                  "disableSourceMaps": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip generating source maps. Reduces package size but makes production errors harder to debug.").optional(),
                  "outputSourceMapsTo": z.string().optional().describe("#### Save source maps to a local directory instead of uploading them to AWS.\n\n---\n\nUseful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.").optional(),
                  "dependenciesToExcludeFromDeploymentPackage": z.array(z.string()).optional().describe("#### A list of dependencies to exclude from the deployment package.\n\n---\n\nThis only applies to dependencies that are not statically bundled.\nTo exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.\nUse `*` to exclude all non-bundled dependencies.").optional() }).strict()
                , z.object({
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's dependency file.\n\n---\n\nThis can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.").optional(),
                  "packageManager": z.literal("uv").optional().describe("#### The Python package manager to use.\n\n---\n\nStacktape uses `uv` for dependency resolution and installation. This option is kept\nfor compatibility and must be set to `uv` if provided.").optional(),
                  "pythonVersion": z.union([z.literal(2.7), z.literal(3.11), z.literal(3.12), z.literal(3.13), z.literal(3.14), z.literal(3.6), z.literal(3.7), z.literal(3.8), z.literal(3.9)]).optional().describe("#### The version of Python to use.").default(3.9),
                  "runAppAs": z.enum(["ASGI","WSGI"]).optional().describe("#### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).\n\n---\n\nOnly for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.\nSet `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).").optional(),
                  "minify": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Minify Python code to reduce package size. Makes production stack traces harder to read.").default(true) }).strict()
                , z.object({
                  "useMaven": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Specifies whether to use Maven instead of Gradle.\n\n---\n\nBy default, Stacktape uses Gradle to build Java projects.").optional(),
                  "packageManagerFile": z.string().optional().describe("#### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).").optional(),
                  "javaVersion": z.union([z.literal(11), z.literal(17), z.literal(19), z.literal(8)]).optional().describe("#### The version of Java to use.").default(11) }).strict()
                , z.object({
                  "phpVersion": z.union([z.literal(8.2), z.literal(8.3)]).optional().describe("#### The version of PHP to use.").default(8.3) }).strict()
                , z.object({
                  "projectFile": z.string().optional().describe("#### The path to your .NET project file (.csproj).").optional(),
                  "dotnetVersion": z.union([z.literal(6), z.literal(8)]).optional().describe("#### The version of .NET to use.").default(8) }).strict()
                , z.record(z.string(), z.never()), z.object({
                  "rubyVersion": z.union([z.literal(3.2), z.literal(3.3)]).optional().describe("#### The version of Ruby to use.").default(3.3) }).strict()
              ]).optional().describe("#### Language-specific packaging configuration.").optional() }).strict()
          }).strict()
          .describe("#### A zero-config buildpack that packages your code for AWS Lambda.\n\n---\n\nThe `stacktape-lambda-buildpack` automatically bundles your code and dependencies into an optimized Lambda deployment package.\n\n**Supported languages:** JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.\n\nFor JS/TS, your code is bundled into a single file. Source maps are automatically generated.\nPackages are cached based on a checksum, so unchanged code is not re-packaged."), z.object({
            "type": z.literal("custom-artifact"),
            "properties": z.object({
              "packagePath": z.string().describe("#### The path to a pre-built deployment package.\n\n---\n\nIf the path points to a directory or a non-zip file, Stacktape will automatically zip it for you."),
              "handler": z.string().optional().describe("#### The handler function to be executed when the Lambda is invoked.\n\n---\n\nThe syntax is `{{filepath}}:{{functionName}}`.\n\nExample: `my-lambda/index.js:default`").optional() }).strict()
          }).strict()
          .describe("#### Uses a pre-built artifact for Lambda deployment.\n\n---\n\nWith `custom-artifact`, you provide a path to your own pre-built deployment package.\nIf the specified path is a directory or an unzipped file, Stacktape will automatically zip it.\n\nThis is useful when you have custom build processes or need full control over the packaging.")]).describe("#### How the function code is packaged and deployed."),
        "runtime": z.enum(["nodejs18.x","nodejs20.x","nodejs22.x","nodejs24.x","python3.10","python3.11","python3.12","python3.13","python3.8","python3.9"]).optional().describe("#### Lambda runtime. Auto-detected from file extension. Edge functions support Node.js and Python only.").optional(),
        "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB. Max depends on event type: viewer events = 128 MB, origin events = 10,240 MB.").default(128),
        "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Viewer events: max 5s. Origin events: max 30s.").default(3),
        "connectTo": z.array(z.string()).optional().describe("#### Grant access to other resources in your stack (IAM permissions only — no env vars or VPC access).\n\n---\n\nEdge Lambda functions **cannot** use environment variables or connect to VPC resources.\n`connectTo` only sets up IAM permissions (e.g., S3 bucket access, DynamoDB, SES).").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Custom IAM policy statements for fine-grained AWS permissions beyond what `connectTo` provides.").optional(),
        "logging": z.object({
          "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
          "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
          "logForwarding": z.union([z.object({
              "type": z.literal("http-endpoint"),
              "properties": z.object({
                "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
            }).strict()
            , z.object({
              "type": z.literal("highlight"),
              "properties": z.object({
                "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.") }).strict()
            }).strict()
            , z.object({
              "type": z.literal("datadog"),
              "properties": z.object({
                "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
            }).strict()
          ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
        .optional().describe("#### Logging config. Logs are sent to CloudWatch **in the region where the function executed** (not your stack region).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Lambda function that runs at CDN edge locations for request/response manipulation.\n\n---\n\nRuns on CloudFront events (viewer request, origin request, etc.) to modify headers, rewrite URLs,\nimplement A/B testing, or add auth checks at the edge. Referenced from CDN `edgeFunctions` config."), z.object({
      "type": z.literal("astro-web"),
      "properties": z.object({
        "appDirectory": z.string().optional().describe("#### Directory containing your `astro.config.mjs`. For monorepos, point to the Astro workspace.").default("."),
        "buildCommand": z.string().optional().describe("#### Override the default `astro build` command.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Attach custom domains with auto-managed DNS records and TLS certificates.\n\n---\n\n**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.").optional(),
        "serverLambda": z.object({
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").default(1024),
          "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 30.").default(30),
          "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.").optional() }).strict()
        .optional().describe("#### Customize the SSR Lambda function (memory, timeout, VPC, logging).").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.").optional(),
        "dev": z.object({
          "command": z.string().optional().describe("#### Override the default `astro dev` command (e.g., `npm run dev`).").optional(),
          "workingDirectory": z.string().optional().describe("#### Working directory for the dev command, relative to project root.").optional() }).strict()
        .optional().describe("#### Dev server config for `stacktape dev`. Defaults to `astro dev`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Deploy an Astro SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.\n\n---\n\nFor static-only Astro sites, use `hosting-bucket` with `hostingContentType: 'astro-static-website'` instead."), z.object({
      "type": z.literal("nuxt-web"),
      "properties": z.object({
        "appDirectory": z.string().optional().describe("#### Directory containing your `nuxt.config.ts`. For monorepos, point to the Nuxt workspace."),
        "buildCommand": z.string().optional().describe("#### Override the default `nuxt build` command.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Attach custom domains with auto-managed DNS records and TLS certificates.\n\n---\n\n**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.").optional(),
        "serverLambda": z.object({
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").default(1024),
          "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 30.").default(30),
          "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.").optional() }).strict()
        .optional().describe("#### Customize the SSR Lambda function (memory, timeout, VPC, logging).").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.").optional(),
        "dev": z.object({
          "command": z.string().optional().describe("#### Override the default dev server command (e.g., `npm run dev`).").optional(),
          "workingDirectory": z.string().optional().describe("#### Working directory for the dev command, relative to project root.").optional() }).strict()
        .optional().describe("#### Dev server config for `stacktape dev`. Defaults to `nuxt dev`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Deploy a Nuxt SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.\n\n---\n\nFor static-only Nuxt sites, use `hosting-bucket` with `hostingContentType: 'nuxt-static-website'` instead."), z.object({
      "type": z.literal("sveltekit-web"),
      "properties": z.object({
        "appDirectory": z.string().optional().describe("#### Directory containing your `svelte.config.js`. For monorepos, point to the SvelteKit workspace."),
        "buildCommand": z.string().optional().describe("#### Override the default `vite build` command.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Attach custom domains with auto-managed DNS records and TLS certificates.\n\n---\n\n**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.").optional(),
        "serverLambda": z.object({
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").default(1024),
          "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 30.").default(30),
          "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.").optional() }).strict()
        .optional().describe("#### Customize the SSR Lambda function (memory, timeout, VPC, logging).").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.").optional(),
        "dev": z.object({
          "command": z.string().optional().describe("#### Override the default dev server command (e.g., `npm run dev`).").optional(),
          "workingDirectory": z.string().optional().describe("#### Working directory for the dev command, relative to project root.").optional() }).strict()
        .optional().describe("#### Dev server config for `stacktape dev`. Defaults to `vite dev`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Deploy a SvelteKit SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.\n\n---\n\nFor static-only SvelteKit sites, use `hosting-bucket` with `hostingContentType: 'sveltekit-static-website'` instead."), z.object({
      "type": z.literal("solidstart-web"),
      "properties": z.object({
        "appDirectory": z.string().optional().describe("#### Directory containing your `app.config.ts`. For monorepos, point to the SolidStart workspace."),
        "buildCommand": z.string().optional().describe("#### Override the default `vinxi build` command.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Attach custom domains with auto-managed DNS records and TLS certificates.\n\n---\n\n**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.").optional(),
        "serverLambda": z.object({
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").default(1024),
          "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 30.").default(30),
          "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.").optional() }).strict()
        .optional().describe("#### Customize the SSR Lambda function (memory, timeout, VPC, logging).").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.").optional(),
        "dev": z.object({
          "command": z.string().optional().describe("#### Override the default dev server command (e.g., `npm run dev`).").optional(),
          "workingDirectory": z.string().optional().describe("#### Working directory for the dev command, relative to project root.").optional() }).strict()
        .optional().describe("#### Dev server config for `stacktape dev`. Defaults to `vinxi dev`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Deploy a SolidStart SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN."), z.object({
      "type": z.literal("tanstack-web"),
      "properties": z.object({
        "appDirectory": z.string().optional().describe("#### Directory containing your `app.config.ts`. For monorepos, point to the TanStack Start workspace."),
        "buildCommand": z.string().optional().describe("#### Override the default `vinxi build` command.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Attach custom domains with auto-managed DNS records and TLS certificates.\n\n---\n\n**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.").optional(),
        "serverLambda": z.object({
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").default(1024),
          "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 30.").default(30),
          "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.").optional() }).strict()
        .optional().describe("#### Customize the SSR Lambda function (memory, timeout, VPC, logging).").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.").optional(),
        "dev": z.object({
          "command": z.string().optional().describe("#### Override the default dev server command (e.g., `npm run dev`).").optional(),
          "workingDirectory": z.string().optional().describe("#### Working directory for the dev command, relative to project root.").optional() }).strict()
        .optional().describe("#### Dev server config for `stacktape dev`. Defaults to `vinxi dev`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Deploy a TanStack Start SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN."), z.object({
      "type": z.literal("remix-web"),
      "properties": z.object({
        "appDirectory": z.string().optional().describe("#### Directory containing your `vite.config.ts` (or `remix.config.js`). For monorepos, point to the Remix workspace."),
        "buildCommand": z.string().optional().describe("#### Override the default `remix vite:build` command.").optional(),
        "environment": z.array(z.object({
          "name": z.string().describe("#### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`)."),
          "value": z.union([z.string().describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).describe("#### Environment variable value. Numbers and booleans are converted to strings."), z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).describe("#### Environment variable value. Numbers and booleans are converted to strings.")]).describe("#### Environment variable value. Numbers and booleans are converted to strings.") }).strict()
        ).optional().describe("#### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.").optional(),
        "customDomains": z.array(z.object({
          "domainName": z.string().describe("#### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).\n\n---\n\nDon't include the protocol (`https://`). The domain must have a Route53 hosted zone\nin your AWS account, with your registrar's nameservers pointing to it.\n\nStacktape automatically creates a DNS record and provisions a free TLS certificate."),
          "customCertificateArn": z.string().optional().describe("#### Use your own TLS certificate instead of the auto-generated one.\n\n---\n\nProvide the ARN of an ACM certificate from your AWS account.\nOnly needed if you have specific certificate requirements (e.g., EV/OV certs).\nBy default, Stacktape provisions and renews free certificates automatically.").optional(),
          "disableDnsRecordCreation": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Skip DNS record creation for this domain.\n\n---\n\nSet to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).\nStacktape will still provision the TLS certificate but won't touch your DNS.").default(false) }).strict()
        ).optional().describe("#### Attach custom domains with auto-managed DNS records and TLS certificates.\n\n---\n\n**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.").optional(),
        "serverLambda": z.object({
          "memory": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.").default(1024),
          "timeout": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Max execution time in seconds. Max: 30.").default(30),
          "joinDefaultVpc": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.").optional(),
          "logging": z.object({
            "disabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Disable CloudWatch logging entirely.").default(false),
            "retentionDays": z.union([z.literal(1), z.literal(120), z.literal(14), z.literal(150), z.literal(180), z.literal(1827), z.literal(3), z.literal(30), z.literal(365), z.literal(3653), z.literal(400), z.literal(5), z.literal(545), z.literal(60), z.literal(7), z.literal(731), z.literal(90)]).optional().describe("#### How many days to keep logs. Longer retention = higher storage cost.").default(180),
            "logForwarding": z.union([z.object({
                "type": z.literal("http-endpoint"),
                "properties": z.object({
                  "endpointUrl": z.string().describe("#### HTTPS endpoint URL where logs are sent."),
                  "gzipEncodingEnabled": z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean()).optional().describe("#### Compress request body with GZIP to reduce transfer costs.").default(false),
                  "parameters": z.record(z.string(), z.string()).optional().describe("#### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.").optional(),
                  "retryDuration": z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number()).optional().describe("#### Total retry time (seconds) before sending failed logs to a backup S3 bucket.").default(300),
                  "accessKey": z.string().optional().describe("#### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.").optional() }).strict()
              }).strict()
              , z.object({
                "type": z.literal("highlight"),
                "properties": z.object({
                  "projectId": z.string().describe("#### Your Highlight.io project ID (from the Highlight console)."),
                  "endpointUrl": z.string().optional().describe("#### Highlight.io endpoint. Override for self-hosted or regional endpoints.").default("https://pub.highlight.io/v1/logs/firehose") }).strict()
              }).strict()
              , z.object({
                "type": z.literal("datadog"),
                "properties": z.object({
                  "apiKey": z.string().describe("#### Your Datadog API key. Store as `$Secret()` for security."),
                  "endpointUrl": z.string().optional().describe("#### Datadog endpoint. Use the EU URL if your account is in the EU region.").default("https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input") }).strict()
              }).strict()
            ]).optional().describe("#### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).\n\n---\n\nUses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.").optional() }).strict()
          .optional().describe("#### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.").optional() }).strict()
        .optional().describe("#### Customize the SSR Lambda function (memory, timeout, VPC, logging).").optional(),
        "useFirewall": z.string().optional().describe("#### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.").optional(),
        "dev": z.object({
          "command": z.string().optional().describe("#### Override the default dev server command (e.g., `npm run dev`).").optional(),
          "workingDirectory": z.string().optional().describe("#### Working directory for the dev command, relative to project root.").optional() }).strict()
        .optional().describe("#### Dev server config for `stacktape dev`. Defaults to `remix vite:dev`.").optional(),
        "fileOptions": z.array(z.object({
          "includePattern": z.string().describe("#### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`)."),
          "excludePattern": z.string().optional().describe("#### Glob pattern for files to exclude even if they match `includePattern`.").optional(),
          "headers": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.").optional(),
          "tags": z.array(z.object({
            "key": z.string().describe("#### Key"),
            "value": z.string().describe("#### Value") }).strict()
          ).optional().describe("#### Tags for matching files. Can be used to target files with `lifecycleRules`.").optional() }).strict()
        ).optional().describe("#### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.").optional(),
        "connectTo": z.array(z.string()).optional().describe("#### Give this resource access to other resources in your stack.\n\n---\n\nList the names of resources this workload needs to communicate with. Stacktape automatically:\n- **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)\n- **Opens network access** (security group rules for databases, Redis)\n- **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`\n\nExample: `connectTo: [\"myDatabase\", \"myBucket\"]` gives this workload full access to both\nresources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.\n\n---\n\n#### What each resource type provides:\n\n**`Bucket`** — read/write/delete objects → `NAME`, `ARN`\n\n**`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`\n\n**`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.\nAurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.\n\n**`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`\n\n**`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`\n\n**`Function`** — invoke permission → `ARN`\n\n**`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`\n\n**`EventBus`** — publish events → `ARN`\n\n**`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`\n\n**`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`\n\n**`SnsTopic`** — publish/subscribe → `ARN`, `NAME`\n\n**`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`\n\n**`PrivateService`** → `ADDRESS`\n\n**`aws:ses`** — full SES email sending permissions").optional(),
        "iamRoleStatements": z.array(z.object({
          "Sid": z.string().optional().describe("#### Optional identifier for this statement (for readability).").optional(),
          "Effect": z.string().optional().describe("#### Whether to allow or deny the specified actions."),
          "Action": z.array(z.string()).optional().describe("#### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).").optional(),
          "Condition": z.any().optional().describe("#### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).").optional(),
          "Resource": z.array(z.string()).describe("#### ARNs of the AWS resources this statement applies to. Use `\"*\"` for all resources.") }).strict()
        ).optional().describe("#### Raw IAM policy statements for permissions not covered by `connectTo`.\n\n---\n\nAdded as a separate policy alongside auto-generated permissions. Use this for\naccessing AWS services directly (e.g., Rekognition, Textract, Bedrock).").optional() }).strict()
      ,
      "overrides": z.record(z.string(), z.record(z.string(), z.any())).optional().describe("#### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.\n\n---\n\nUse dot-notation paths to override specific properties on any child resource.\nFind resource logical IDs with `stacktape stack-info --detailed`.\n\n```yaml\noverrides:\n  MyDbInstance:\n    Properties.StorageEncrypted: true\n```").optional() }).strict()
    .describe("#### Deploy a Remix SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.")])).describe("#### Your app's infrastructure: APIs, databases, containers, functions, buckets, and more.\n\n---\n\nEach entry is a named resource (e.g., `myApi`, `myDatabase`). Stacktape creates and manages\nthe underlying AWS resources for you. Use `stacktape stack-info --detailed` to inspect them."),
  "cloudformationResources": z.record(z.string(), z.object({
    "Type": z.string(),
    "DependsOn": z.union([z.array(z.string()), z.object({
        "name": z.string(),
        "payload": z.any() }).strict()
      , z.string()]).optional().describe("").optional(),
    "Properties": z.record(z.string(), z.any()).optional().describe("").optional(),
    "Metadata": z.record(z.string(), z.any()).optional().describe("").optional(),
    "CreationPolicy": z.object({
      "AutoScalingCreationPolicy": z.object({
        "MinSuccessfulInstancesPercent": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number())]).optional().describe("").optional() }).strict()
      .optional().describe("").optional(),
      "ResourceSignal": z.object({
        "Count": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number())]).optional().describe("").optional(),
        "Timeout": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.string()]).optional().describe("").optional() }).strict()
      .optional().describe("").optional() }).strict()
    .optional().describe("").optional(),
    "DeletionPolicy": z.enum(["Delete","Retain","Snapshot"]).optional().describe("").optional(),
    "UpdatePolicy": z.object({
      "AutoScalingReplacingUpdate": z.object({
        "WillReplace": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean())]).optional().describe("").optional() }).strict()
      .optional().describe("").optional(),
      "AutoScalingRollingUpdate": z.object({
        "MaxBatchSize": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number())]).optional().describe("").optional(),
        "MinInstancesInService": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number())]).optional().describe("").optional(),
        "MinSuccessfulInstancesPercent": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "number" ? val : typeof val === "string" ? Number(val) : val, z.number())]).optional().describe("").optional(),
        "PauseTime": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.string()]).optional().describe("").optional(),
        "SuspendProcesses": z.union([z.array(z.string()), z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
        ]).optional().describe("").optional(),
        "WaitOnResourceSignals": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean())]).optional().describe("").optional() }).strict()
      .optional().describe("").optional(),
      "AutoScalingScheduledAction": z.object({
        "IgnoreUnmodifiedGroupSizeProperties": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.preprocess((val) => typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : val, z.boolean())]).optional().describe("").optional() }).strict()
      .optional().describe("").optional(),
      "CodeDeployLambdaAliasUpdate": z.object({
        "AfterAllowTrafficHook": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.string()]),
        "ApplicationName": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.string()]),
        "BeforeAllowTrafficHook": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.string()]),
        "DeploymentGroupName": z.union([z.object({
            "name": z.string(),
            "payload": z.any() }).strict()
          , z.string()]) }).strict()
      .optional().describe("").optional() }).strict()
    .optional().describe("").optional(),
    "Condition": z.union([z.object({
        "name": z.string(),
        "payload": z.any() }).strict()
      , z.string()]).optional().describe("").optional() }).strict()
  ).optional().describe("#### Escape hatch: add raw AWS CloudFormation resources alongside Stacktape-managed ones.\n\n---\n\nFor advanced use cases where Stacktape doesn't have a built-in resource type.\nThese are merged into the CloudFormation template as-is. Use `stacktape stack-info --detailed`\nto check existing logical names and avoid conflicts.\n\nDoes not count towards your resource limit.").optional() }).strict()

export type StacktapeConfigSchema = z.infer<typeof stacktapeConfigSchema>
