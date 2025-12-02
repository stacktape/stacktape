# Stacktape Documentation

This is the official documentation for Stacktape - a deployment platform for AWS.

## How to use this documentation

- Each category below contains links to topic directories
- Each topic directory has an `index.md` with a table of contents
- Files are numbered (01-, 02-, etc.) to indicate reading order
- Most resource topics include an `api-reference.md` with TypeScript type definitions
- Links between documents use relative paths

## Quick reference

- **Getting started**: Start with `getting-started/basics` for initial setup
- **Resources**: Compute, database, and other AWS resources are in their respective categories
- **Configuration**: Packaging, scripts, hooks, and other config options
- **CLI**: Command reference for the Stacktape CLI
- **Extending**: How to use custom CloudFormation resources and CDK constructs

## Getting Started

- [Basics](./getting-started/basics.md)
- [Configuring Stack](./getting-started/configuring-stack.md)
- [Deploying Using 3rd Party CI](./getting-started/deploying-using-3rd-party-CI.md)
- [Deploying Using CLI](./getting-started/deploying-using-CLI.md)
- [Deploying Using GitOps](./getting-started/deploying-using-GitOps.md)
- [Deploying Using Console](./getting-started/deploying-using-console.md)
- [Under The Hood](./getting-started/under-the-hood.md)

## Configuration

- [Alarms](./configuration/alarms.md)
- [Budget Control](./configuration/budget-control.md)
- [Directives](./configuration/directives.md)
- [Hooks](./configuration/hooks.md)
- [Log Forwarding](./configuration/log-forwarding.md)
- [Overrides](./configuration/overrides.md)
- [Packaging](./configuration/packaging.md)
- [Progress Notifications](./configuration/progress-notifications.md)
- [Referencing Parameters](./configuration/referencing-parameters.md)
- [Scripts](./configuration/scripts.md)

## Compute Resources

- [Batch Jobs](./compute-resources/batch-jobs/index.md)
- [Edge Lambda Functions](./compute-resources/edge-lambda-functions/index.md)
- [Functions](./compute-resources/functions/index.md)
- [Multi Container Workloads](./compute-resources/multi-container-workloads/index.md)
- [Nextjs Website](./compute-resources/nextjs-website/index.md)
- [Private Services](./compute-resources/private-services/index.md)
- [Web Services](./compute-resources/web-services/index.md)
- [Worker Services](./compute-resources/worker-services/index.md)

## Database Resources

- [Dynamo Db Tables](./database-resources/dynamo-db-tables/index.md)
- [Open Search Domains](./database-resources/open-search-domains/index.md)
- [Redis Clusters](./database-resources/redis-clusters/index.md)
- [Relational Databases](./database-resources/relational-databases/index.md)

## Other Resources

- [Application Load Balancers](./other-resources/application-load-balancers/index.md)
- [Buckets](./other-resources/buckets/index.md)
- [Cdns](./other-resources/cdns/index.md)
- [Deployment Scripts](./other-resources/deployment-scripts/index.md)
- [Domains And Certificates](./other-resources/domains-and-certificates/index.md)
- [Efs Filesystems](./other-resources/efs-filesystems/index.md)
- [Event Buses](./other-resources/event-buses/index.md)
- [Hosting Buckets](./other-resources/hosting-buckets/index.md)
- [Http Api Gateways](./other-resources/http-api-gateways/index.md)
- [Network Load Balancers](./other-resources/network-load-balancers/index.md)
- [Sns Topics](./other-resources/sns-topics/index.md)
- [Sqs Queues](./other-resources/sqs-queues/index.md)
- [State Machines](./other-resources/state-machines/index.md)

## Security Resources

- [Bastions](./security-resources/bastions/index.md)
- [Secrets](./security-resources/secrets/index.md)
- [User Auth Pools](./security-resources/user-auth-pools/index.md)
- [Web App Firewalls](./security-resources/web-app-firewalls/index.md)

## 3rd Party Resources

- [Mongo Db Atlas Clusters](./3rd-party-resources/mongo-db-atlas-clusters/index.md)
- [Upstash Redises](./3rd-party-resources/upstash-redises/index.md)

## Extending

- [Aws Cdk Constructs](./extending/aws-cdk-constructs/index.md)
- [Aws Cloudformation Resources](./extending/aws-cloudformation-resources/index.md)
- [Custom Resources](./extending/custom-resources/index.md)

## Cli

- [Commands](./cli/commands.md)
- [Aws Profile Create](./cli/commands/aws-profile-create.md)
- [Aws Profile Delete](./cli/commands/aws-profile-delete.md)
- [Aws Profile List](./cli/commands/aws-profile-list.md)
- [Aws Profile Update](./cli/commands/aws-profile-update.md)
- [Bastion Session](./cli/commands/bastion-session.md)
- [Bastion Tunnel](./cli/commands/bastion-tunnel.md)
- [Bucket Sync](./cli/commands/bucket-sync.md)
- [Cf Module Update](./cli/commands/cf-module-update.md)
- [Codebuild Deploy](./cli/commands/codebuild-deploy.md)
- [Compile Template](./cli/commands/compile-template.md)
- [Container Session](./cli/commands/container-session.md)
- [Defaults Configure](./cli/commands/defaults-configure.md)
- [Defaults List](./cli/commands/defaults-list.md)
- [Delete](./cli/commands/delete.md)
- [Deploy](./cli/commands/deploy.md)
- [Deployment Script Run](./cli/commands/deployment-script-run.md)
- [Dev](./cli/commands/dev.md)
- [Domain Add](./cli/commands/domain-add.md)
- [Editor](./cli/commands/editor.md)
- [Help](./cli/commands/help.md)
- [Init](./cli/commands/init.md)
- [Login](./cli/commands/login.md)
- [Logout](./cli/commands/logout.md)
- [Logs](./cli/commands/logs.md)
- [Package Workloads](./cli/commands/package-workloads.md)
- [Param Get](./cli/commands/param-get.md)
- [Preview Changes](./cli/commands/preview-changes.md)
- [Rollback](./cli/commands/rollback.md)
- [Script Run](./cli/commands/script-run.md)
- [Secret Create](./cli/commands/secret-create.md)
- [Secret Delete](./cli/commands/secret-delete.md)
- [Secret Get](./cli/commands/secret-get.md)
- [Stack Info](./cli/commands/stack-info.md)
- [Stack List](./cli/commands/stack-list.md)
- [Userpool Create User](./cli/commands/userpool-create-user.md)
- [Userpool Get Token](./cli/commands/userpool-get-token.md)
- [Userpool List Users](./cli/commands/userpool-list-users.md)
- [Version](./cli/commands/version.md)
- [Using Cli](./cli/using-cli.md)

## User Guides

- [Configure Aws Profile](./user-guides/configure-aws-profile.md)
- [Connect Aws Account](./user-guides/connect-aws-account.md)
- [Development Mode](./user-guides/development-mode.md)
- [Enabling Budgeting](./user-guides/enabling-budgeting.md)
- [Installing And Versioning](./user-guides/installing-and-versioning.md)
- [Migrating From Heroku](./user-guides/migrating-from-heroku.md)
- [Mongo Db Atlas Credentials](./user-guides/mongo-db-atlas-credentials.md)
- [Vpcs](./user-guides/vpcs.md)
- [Writing Config In Typescript](./user-guides/writing-config-in-typescript.md)

