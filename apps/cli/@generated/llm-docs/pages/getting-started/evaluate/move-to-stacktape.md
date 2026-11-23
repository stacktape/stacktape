# Move to Stacktape

Stacktape deploys your app as a new stack in your own AWS account. It never takes over what another platform or tool
runs. A move is a copy next to the old app, then the data and the DNS, then retiring the old setup. You can switch
back until the last step.

## What init reads

`stacktape init` reads the other platform's files together with your code. It writes the services, workers and
databases they describe into the Stacktape config, and you review it before anything is deployed.

| From | What init takes | What you set yourself |
|---|---|---|
| Heroku: `Procfile`, `app.json` | Web and worker processes, the port, the `release` command as the migration, add-ons such as Heroku Postgres and Redis, variable names | Dyno sizes and counts. `heroku.yml` isn't read |
| Render: `render.yaml` | Web, worker and private services, cron jobs on their schedule, databases, Key Value, build and start commands, Dockerfiles, variables that point at databases and services | Plans, instance counts, region, health check path, pre-deploy command |
| Fly.io: `fly.toml` | The app, its Dockerfile, each process as a service, the internal port, variable names | Region, VM sizes, health checks, volumes, release command |
| SST (v3): `sst.config.ts` | Databases, Redis, buckets, queues, topics, DynamoDB tables with sizes and versions, Next.js and other sites, functions, cron jobs, API routes, queue subscribers and `link` | `environment` values. SST v2 apps are recognized but not imported |
| Serverless Framework: `serverless.yml` | Functions with runtime, memory, timeout and environment, `http`, `httpApi`, `schedule`, `sqs`, `sns` and `s3` events, DynamoDB, SQS, SNS, S3, ElastiCache and RDS from `resources` | Plugins, layers, Step Functions, `custom` and `params`. Keys init doesn't know are listed as import notes |

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

### 1. Generate the config

Run `stacktape init` in the repository, go through Review and save the file. Stop there: the deploy is optional, and
the next steps come first. See [Deploy an existing app](/getting-started/deploy-an-existing-app). The old app keeps
serving your users until you switch DNS.

### 2. Decide where the data lives

Decide before the first deploy. It creates the databases in the file and runs the migrations against the database the
app points at.

- **Keep the old database for now.** Accept the wizard's offer to keep using it, or put its connection string in a
  secret and use that secret for your app's variable. The old provider must accept connections from AWS, and every
  query crosses the internet, so expect more latency. This lets you move the app first and the data later. The first
  deploy runs the new code's pending migrations against your live data.
- **Move the data.** Keep the new AWS database. It starts empty, and you copy the data in when you switch (step 6).

### 3. Set the secrets

**Before you deploy** lists each secret the app needs. Copy each value from the old platform and store it in your AWS
account:

```bash
stacktape secret set stripe_api_key --region eu-west-1
```

Heroku shows values with `heroku config`. Fly.io doesn't show secret values again, so take them from where your team
keeps them.

### 4. Check the migrations

Open the saved file and find how it runs your migration tool:

- **A `releaseCommand` on a service.** It runs during the deploy, before the new code goes live. It runs on the first
  deploy of each stage, then on each deploy that changes the image. With `runWhenChanged`, which init sets to your
  migrations directory when it finds one, it runs only when those files change. A `release` line in a Procfile becomes
  this command.
- **A script in `hooks.afterDeploy`**, such as `migrateDatabase`. Init writes one when the command can't run in the
  deployed image. It runs on your machine after every deploy.
- **Neither.** Init found the tool but not a command it could run on deploy, or your app migrates when it starts.
  **Before you deploy** says which. Release commands in `fly.toml` and `render.yaml` are not carried over. Set the
  command yourself, as described in [Release commands](/deployment-and-lifecycle/release-commands).

### 5. Deploy and test the copy

Deploy a stage such as `staging`:

```bash
stacktape deploy --stage staging
```

Open the AWS address from the end of the deploy. Check a page or an endpoint that reads and writes data, not only a
health route. Then add a [CI pipeline](/ci-cd-and-gitops/overview) that deploys the new stage.

### 6. Move the data

Skip this if you kept the old database. Otherwise, do it right before you switch DNS:

1. Deploy the commit the old app runs, so the copied schema matches the code.
2. Stop writes on the old app, for example with a maintenance mode.
3. Dump the database with your usual tool, such as `pg_dump`, and restore it into the new one. The first deploy's
   migrations already created the tables, so restore with an option that replaces them, such as `pg_restore --clean`.
   A database that isn't open to the internet is reachable through a [bastion tunnel](/cli/bastion-tunnel).

For a large database, AWS Database Migration Service can copy it continuously, which shortens the pause. Files move
with `aws s3 sync` or your provider's export. Caches usually start empty.

### 7. Switch DNS

Test the copy on a temporary hostname first, such as `new.example.com` in `customDomains`. Lower the TTL of the old
records a day before the switch. If you move the domain's DNS to Route 53, copy its existing records first. See
[Custom domains](/resources/networking/custom-domains).

How you move the real hostname depends on what serves it now:

- **Another platform**, such as Heroku, Render or Fly.io: add the hostname to `customDomains`, deploy, then point the
  record at the new stack. If a record with that name already exists in your Route 53 zone, set
  `disableDnsRecordCreation: true` on the domain and change the record yourself. Stacktape creates a new record on
  deploy and fails if one exists.
- **A CloudFront distribution**, such as one from SST, Serverless Framework or your own stack: a hostname can belong to
  one distribution only, so adding it to the new stack fails with `CNAMEAlreadyExists`. Move it instead:
  1. Make sure the new distribution's certificate covers the real hostname too. The certificate from
     `stacktape domain add` covers `example.com` and `*.example.com`.
  2. Move the hostname to the new distribution:

     ```bash
     aws cloudfront update-domain-association \
       --domain www.example.com \
       --target-resource DistributionId=<new distribution ID> \
       --if-match <ETag>
     ```

     `aws cloudfront get-distribution --id <new distribution ID>` prints the ETag. If the old distribution is in
     another AWS account, first add a TXT record `_www.example.com` whose value is the new distribution's
     `dXXXX.cloudfront.net` domain. From then on, the new distribution answers the hostname.
  3. Add the hostname to `customDomains` with `disableDnsRecordCreation: true` and deploy, so the stack keeps it.
  4. Point the DNS record at the new distribution's domain.

  See [Move an alternate domain name](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/alternate-domain-names-move.html)
  in the AWS docs. Don't deploy the old stack after the move: it would try to take the hostname back.

### 8. Keep a way back, then retire the old app

Until you retire the old app, switching back is a DNS change. For a CloudFront hostname, move it back to the old
distribution with the same command, and remove it from `customDomains` before you deploy the new stack again. If you
moved the data, writes made after the switch exist only in the new database, so plan how you would copy them back.
When traffic has moved and the old DNS records have expired, take a last backup of the old database and delete the old
app.

## From SST or Serverless Framework

Both already run in your AWS account. Stacktape creates its own stack next to theirs and doesn't adopt their
resources, so the new stack starts with new tables, buckets and databases.

- **Move the data** as above: DynamoDB export and import, `aws s3 sync`, or a database dump.
- **Or keep using an old resource.** Pass its name to the app in `environment` and allow access with
  [`iamRoleStatements`](/configuration/connecting-resources#custom-permissions-with-iamrolestatements).
- **Before you remove the old stack**, check which of its resources hold data and whether the old tool deletes them.
  If it created the DNS record your hostname now uses, removing it deletes that record. Create the record outside the
  old stack first.

## What usually takes the time

- Reviewing what init decided for you, especially sizes, scaling and the settings it left at defaults.
- Collecting the secret values.
- Moving the data, and the write pause it needs.
- Waiting for DNS.
- Health checks, instance counts, regions and volumes, which init doesn't carry over.
