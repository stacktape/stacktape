# Move to Stacktape

Stacktape deploys your app as a new stack in your own AWS account. It never takes over what another platform or tool
runs. A move is a copy next to the old app, then the secrets, the data and the DNS, then retiring the old setup. You
can switch back until the last step.

## What init reads

`stacktape init` reads the other platform's files together with your code. It writes the services, workers and
databases they describe into the Stacktape config, and you review it before anything is deployed.

| From | Files | What init takes | What you set yourself |
|---|---|---|---|
| Heroku | `Procfile`, `app.json` | Web and worker processes, the port, the `release` command as the migration, add-ons such as Heroku Postgres and Redis, variable names | Dyno sizes and counts. `heroku.yml` isn't read |
| Render | `render.yaml` | Web, worker and private services, cron jobs on their schedule, databases, Key Value, build and start commands, Dockerfiles, variables that point at databases and services | Plans, instance counts, region, health check path, pre-deploy command |
| Fly.io | `fly.toml` | The app, its Dockerfile, each process as a service, the internal port, variable names | Region, VM sizes, health checks, volumes, release command |
| SST (v3) | `sst.config.ts` | Databases, Redis, buckets, queues, topics, DynamoDB tables with sizes and versions, Next.js and other sites, functions, cron jobs, API routes, queue subscribers and `link` | `environment` values. SST v2 apps are recognized but not imported |
| Serverless Framework | `serverless.yml` | Functions with runtime, memory, timeout and environment, `http`, `httpApi`, `schedule`, `sqs`, `sns` and `s3` events, DynamoDB, SQS, SNS, S3, ElastiCache and RDS from `resources` | Plugins, layers, Step Functions, `custom` and `params`. Keys init doesn't know are listed as import notes |

It also reads Docker Compose files, AWS SAM templates, CDK apps in TypeScript or JavaScript, and the databases,
caches, queues and buckets in Terraform files. For all of them:

- **The region** comes from your AWS setup, not from the old platform. Without one it's `eu-west-1`.
- **Sizes** carry over only for AWS database and cache instance classes, such as `db.t4g.small`. Everything else
  gets a default that you see and can change on the Review step.
- **Secrets travel as names.** Init copies the values of a few harmless settings, such as `NODE_ENV`, `LOG_LEVEL` or a
  port. Every other variable becomes a secret that you set before the deploy. Values in `.env` files are read only to
  recognize your database host, then dropped.
- **Databases are new.** A database declared in the old platform's files becomes a new, empty AWS database. When a
  `.env` file points at a hosted database, such as Heroku, Render, Supabase, Neon or Upstash, the wizard offers to keep
  using it instead. Then nothing is created, and your app reads the address from a secret.
- **The old platform is untouched.** Init doesn't read, change or delete its resources.

## Move a running app

### 1. Deploy a copy

Run `stacktape init` in the repository and deploy a stage such as `staging`. See
[Deploy an existing app](/getting-started/deploy-an-existing-app). The old app keeps serving your users.

### 2. Copy the secrets

**Before you deploy** lists each secret the app needs. Copy each value from the old platform and store it in your AWS
account:

```bash
stacktape secret set stripe_api_key --region eu-west-1
```

Heroku shows values with `heroku config`. Fly.io doesn't show secret values again, so take them from where your team
keeps them.

### 3. Decide where the data lives

You have two options:

- **Keep the old database for now.** Put its connection string in a secret and use that secret for your app's
  variable. The old provider must accept connections from AWS, and every query crosses the internet, so expect more
  latency. This lets you move the app first and the data later.
- **Move the data.** Stop writes on the old app, for example with a maintenance mode. Dump the database with your
  usual tool, such as `pg_dump`, and restore it into the new one. A database that isn't open to the internet is
  reachable through a [bastion tunnel](/cli/bastion-tunnel). For a large database, AWS Database Migration Service can
  copy it continuously, which shortens the pause.

Files move with `aws s3 sync` or your provider's export. Caches usually start empty.

### 4. Run the migrations

If init found your migration tool, the config runs it on each deploy, as a `releaseCommand` or a script after the
deploy. A `release` line in a Procfile becomes that command. Release commands in `fly.toml` and `render.yaml` are not
carried over: set them as described in [Release commands](/deployment-and-lifecycle/release-commands).

### 5. Test the copy

Open the AWS address from the end of the deploy. Check a page or an endpoint that reads and writes data, not only a
health route. Then add a [CI pipeline](/ci-cd-and-gitops/overview) that deploys the new stage.

### 6. Switch DNS

Add your domain to the new resources with `customDomains` and deploy. Lower the TTL of the old records a day before,
then point the hostname at the new stack. If you move the domain's DNS to Route 53, copy its existing records first.
See [Custom domains](/resources/networking/custom-domains).

### 7. Keep a way back, then retire the old app

Until you retire the old app, switching back is a DNS change. If you moved the data, writes made after the switch
exist only in the new database, so plan how you would copy them back. When traffic has moved and the old DNS records
have expired, take a last backup of the old database and delete the old app.

## From SST or the Serverless Framework

Both already run in your AWS account. Stacktape creates its own stack next to theirs and doesn't adopt their
resources, so the new stack starts with new tables, buckets and databases.

- **Move the data** as above: DynamoDB export and import, `aws s3 sync`, or a database dump.
- **Or keep using an old resource.** Pass its name to the app in `environment` and allow access with
  [`iamRoleStatements`](/configuration/connecting-resources#custom-permissions-with-iamrolestatements).
- **Before you remove the old stack**, check which of its resources hold data and whether the old tool deletes them.

## What usually takes the time

- Reviewing what init decided for you, especially sizes, scaling and the settings it left at defaults.
- Collecting the secret values.
- Moving the data, and the write pause it needs.
- Waiting for DNS.
- Health checks, instance counts, regions and volumes, which init doesn't carry over.
