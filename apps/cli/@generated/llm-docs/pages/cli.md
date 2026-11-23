# Command index

Every command runs as `stacktape <command>`, or `stp <command>` for short, and `stacktape help <command>` prints its flags. Commands that act on a stack use your local AWS credentials. The ones marked Console also need a Stacktape sign-in: [`stacktape login`](/cli/login), or a `STACKTAPE_API_KEY` in CI.


## Set up

- [`init`](/cli/init): Creates the Stacktape configuration for your project, or a new project from a starter, and guides you through the first deploy.
- [`aws-profile create`](/cli/aws-profile-create): Creates an AWS profile on your machine.
- [`aws-profile list`](/cli/aws-profile-list): Lists the AWS profiles on your machine.
- [`aws-profile update`](/cli/aws-profile-update): Updates an AWS profile.
- [`aws-profile delete`](/cli/aws-profile-delete): Deletes an AWS profile.
- [`defaults set`](/cli/defaults-set): Sets default values for flags such as the region, stage and AWS profile.
- [`defaults list`](/cli/defaults-list): Prints the defaults you set.
- [`domain add`](/cli/domain-add): Adds a registered domain to your AWS account, so Stacktape can manage its DNS records and certificates.
- [`upgrade`](/cli/upgrade): Upgrades the CLI to the latest version.
- [`version`](/cli/version): Prints the installed CLI version.
- [`help`](/cli/help): Prints the commands, or the flags of one command.

## Deploy and manage stacks

- [`validate`](/cli/validate): Checks your configuration without deploying anything.
- [`diff`](/cli/diff): Shows what a deploy would change in the stack.
- [`synth`](/cli/synth): Writes the CloudFormation template your configuration produces to a file.
- [`package`](/cli/package): Builds the deployment packages of your functions and containers.
- [`deploy`](/cli/deploy): Creates or updates a stage in your AWS account.
- [`status`](/cli/status) (Console): Shows a deployed stack's URLs, outputs and resources.
- [`stack list`](/cli/stack-list): Lists the stacks deployed in a region.
- [`stack history`](/cli/stack-history) (Console): Lists recent deploys and other operations with their result.
- [`rollback`](/cli/rollback): Returns the stack to a previous deployment version.
- [`stack recover`](/cli/stack-recover): Recovers a stack stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED`.
- [`stack update-modules`](/cli/stack-update-modules): Updates the CloudFormation modules the stack uses.
- [`deployment-script run`](/cli/deployment-script-run): Runs a deployment script of the stack in AWS.
- [`bucket sync`](/cli/bucket-sync): Mirrors a local directory into a bucket, removing files that no longer exist locally.
- [`delete`](/cli/delete): Deletes a stage and its resources.

## Develop locally

- [`dev`](/cli/dev): Runs your app on your machine, connected to its resources.
- [`dev stop`](/cli/dev-stop): Stops a dev session started with `dev --agent`, and cleans up containers left by crashed sessions.
- [`dev network`](/cli/dev-network): Shows the dev network of an AWS account and region.
- [`dev network delete`](/cli/dev-network-delete): Deletes the dev network of an AWS account and region.
- [`script run`](/cli/script-run): Runs a script from your configuration.

## Secrets and parameters

- [`secret set`](/cli/secret-set): Creates or updates a secret in AWS Secrets Manager.
- [`secret get`](/cli/secret-get): Prints a secret's details, and its value only when you ask.
- [`secret delete`](/cli/secret-delete): Deletes a secret.
- [`param get`](/cli/param-get): Prints one parameter of a deployed resource, such as a URL or ARN.

## Inspect and debug

- [`logs`](/cli/logs): Prints and filters the logs of a deployed resource.
- [`metrics`](/cli/metrics): Prints CloudWatch metrics of a deployed resource.
- [`alarm list`](/cli/alarm-list): Lists the alarms of the stack and their state.
- [`aws call`](/cli/aws-call): Runs a read-only AWS SDK call against the stack's resources.
- [`container shell`](/cli/container-shell): Opens a shell inside a running container.
- [`container exec`](/cli/container-exec): Runs one command in a running container and prints the output.
- [`bastion shell`](/cli/bastion-shell): Opens a shell on the stack's bastion host.
- [`bastion tunnel`](/cli/bastion-tunnel): Opens a tunnel from your machine to a private database or cache.
- [`query sql`](/cli/query-sql): Runs a read-only SQL query against a relational database.
- [`query dynamodb`](/cli/query-dynamodb): Reads items and the schema of a DynamoDB table.
- [`query redis`](/cli/query-redis): Reads keys, values and server info from a Redis cache.
- [`query opensearch`](/cli/query-opensearch): Searches an OpenSearch domain.

## Incidents and errors

- [`incident list`](/cli/incident-list) (Console): Lists incidents: downtime, failing checks, firing alarms and production errors.
- [`incident show`](/cli/incident-show) (Console): Prints everything known about one incident.
- [`incident ack`](/cli/incident-ack) (Console): Marks an incident as being handled.
- [`incident watch`](/cli/incident-watch) (Console): Waits until an incident recovers and stays recovered.
- [`incident resolve`](/cli/incident-resolve) (Console): Resolves an incident after you deployed and verified a fix.
- [`error list`](/cli/error-list) (Console): Lists runtime errors from your functions and containers.
- [`error resolve`](/cli/error-resolve) (Console): Marks an error as resolved. It reopens if the error comes back.
- [`error ignore`](/cli/error-ignore) (Console): Ignores an error, so it does not reopen or alert.
- [`error reopen`](/cli/error-reopen) (Console): Reopens a resolved or ignored error.

## Console and account

- [`login`](/cli/login): Signs this machine in to Stacktape.
- [`logout`](/cli/logout): Signs this machine out of Stacktape.
- [`connect`](/cli/connect): Connects the AWS account of your local credentials to the Console, without redeploying anything.
- [`whoami`](/cli/whoami) (Console): Shows your user, organization, connected AWS accounts and projects.
- [`org list`](/cli/org-list) (Console): Lists the organizations you can access.
- [`org create`](/cli/org-create) (Console): Creates an organization.
- [`org delete`](/cli/org-delete) (Console): Deletes the organization of your API key.
- [`project list`](/cli/project-list) (Console): Lists projects with their stages, status and costs.
- [`project create`](/cli/project-create) (Console): Creates a project.
- [`project delete`](/cli/project-delete) (Console): Deletes a project.
- [`alarm export`](/cli/alarm-export) (Console): Prints alarm rules created in the Console as configuration you can paste.

## Coding agents

- [`mcp`](/cli/mcp): Starts the Stacktape MCP server for coding agents.
- [`mcp add`](/cli/mcp-add): Registers the MCP server with Claude Code, Codex, Cursor, VS Code and other agents.
- [`mcp remove`](/cli/mcp-remove): Removes the MCP server registration.
- [`ai connect`](/cli/ai-connect) (Console): Connects your own AI subscription for the AI incident runs in the Console.
- [`ai disconnect`](/cli/ai-disconnect) (Console): Removes an AI subscription you connected.
