# First deploy: bringing existing resources and existing data

Design snapshot: **2026-08-05**
Companion to `research/competitive-landscape-2026-08-05.md`.

**Who this is for:** a developer with an app and no infrastructure experience. They do not know what a VPC is. They
will not read a page explaining "reference mode vs adopt mode". Every question we ask them is a cost.

---

## 1. What the user actually has

Before designing anything, be honest about what a developer without infra experience owns today.

They do **not** have a hand-built RDS instance. If they did, they would have infra experience.

What they usually have:

- a Postgres database on Supabase, Neon, Railway, Heroku, or DigitalOcean
- an app on Vercel, Netlify, Render, or a single VM
- files on Cloudinary, or an S3 bucket someone made once by clicking around
- users in Auth0, Clerk, or Firebase
- sometimes: a company AWS account with a few things already in it

So the most valuable "import" feature is **not** importing AWS resources. It is **copying data in from the SaaS they
use today**. Importing existing AWS resources matters too, but mostly for a second kind of customer: a team that
already has AWS.

That reordering matters for what we build first.

## 2. What they are afraid of

Three things, in this order:

1. "Will this break the app my users are using right now?"
2. "Will I lose my data?"
3. "Will this cost me a fortune?"

Every design decision below comes from those three fears. Note that none of them are about infrastructure.

## 3. The one question that decides everything

We do not ask users to choose between technical modes. We ask one thing about each existing resource:

> **Is this live in production right now?**

Everything technical follows from the answer:

| Answer                                         | What we do                                                                     | What the user sees                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Yes, it's live                                 | Never touch it. Copy the data into a new resource. Leave the original running. | "Your Supabase database keeps running. We'll copy it. Nothing changes on the old one." |
| No, it's not live                              | Take it over and manage it.                                                    | "We'll manage this from now on."                                                       |
| It's live and they want to keep using it as-is | Point at it. Wire the app to it. Never modify it.                              | "Your app will connect to it. We won't change it."                                     |

The technical modes (`copy`, `adopt`, `reference`) still exist in the engine. The user never picks one by name.

## 4. The wizard's job: ask almost nothing

**Rule: if we can find the answer ourselves, we must not ask.**

The number of questions is a direct measure of how good the engine is. Every question is something we failed to
detect.

### What we can detect without asking

From **the repo** (we are already running inside it):

- framework, package manager, build and start commands
- `.env` / `.env.example` — and this is the important one. **The env var names are the resource list.**
  `DATABASE_URL` → they need a database. `REDIS_URL` → a cache. `S3_BUCKET` → a bucket. `STRIPE_SECRET_KEY` → a
  secret to carry over, not a resource to build.

From **a connection string** they paste (or that we read from `.env`):

- engine and exact version
- database size, table count, row counts
- extensions in use
- whether it is reachable from here, and whether it is publicly reachable

From that we can pick instance size, storage, engine version, and whether Aurora Serverless v2 fits — and show a
monthly cost. None of that needs a question.

From **their AWS account**:

- what already exists, what is already managed by something else, what is unmanaged

### The realistic flow

1. **Point at the repo.** We read it. We show what we found: "Next.js app, needs a Postgres database and a bucket."
2. **"Where is your data today?"** They paste a connection string, or we found it in `.env` and just ask them to
   confirm. We connect and read it live.
3. **"Is this live in production?"** The only genuinely required question. One click.
4. **AWS account + region.** Unavoidable. Region can default from a sensible guess.
5. **Show the plan and the price.** "Postgres 16, ~2.3 GB copied, about 7 minutes. $23/month. Your old database is
   untouched."
6. **Deploy.**

That is one paste and two clicks.

### Screens must disappear when there is nothing to decide

If the AWS account is empty, never show a "we found 0 existing resources" screen. If the app has no database, never
mention databases. **A step with an obvious answer should answer itself and move on.**

### Defaults over questions

Do not ask "how much traffic do you expect?" — a developer without infra experience does not know, and a wrong guess
costs them money. Default to something cheap that scales, show the price, and make it one click to change later.

## 5. Where each thing should live

This is where I was wrong the first time. Not all of this belongs in the IaC config.

| Thing                                                      | Lives in                                            | Why                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| "Use my existing bucket instead of making a new one"       | **config**                                          | It is permanently true about this stack. Must be reviewable and repeatable. |
| "Copy my Supabase data into the new database"              | **not config** — a command, recorded in stack state | It happens once. It is an event, not a description of the world.            |
| "Every PR environment starts with anonymized staging data" | **config**, scoped to a stage                       | It is recurring and permanent. Ship later.                                  |

### Why the data copy should not be in the config

- It runs **once**. Config describes what is always true. A year later, `initialData:` in the config is a lie — the
  reader cannot tell whether it still runs.
- It needs **credentials to somebody else's system**. That is awkward in a repo file.
- The config file is **shared across stages**. "Copy from production" must never sit in the same file that deploys
  production.
- If it is config, someone will eventually re-run it by accident.

So: a copy is a **job you run**, with a record of when it ran and what it did. The wizard runs it for you. The CLI
exposes the same thing. The console shows the history.

```bash
stacktape copy-data --to mainDatabase --from $Secret('legacy.connectionString')
```

The one exception is auto-seeding throwaway environments, which genuinely is recurring config. Do that later.

## 6. What the engine has to provide

The wizard should be a thin layer. Everything it does must also be a CLI command — otherwise we grow a UI-only path
that nobody maintains.

Five primitives. Everything else is composition.

**1. Probe a data source.** Given a connection string: is it reachable, what engine, what version, how big, how many
tables, which extensions. This is what removes questions from the wizard. It also fails early and clearly instead of
failing 10 minutes into a deploy.

**2. Inspect an AWS account (read-only).** What exists, what is already managed by CloudFormation/Terraform/Pulumi,
what could be taken over safely. Never writes anything.

**3. A safe-takeover check.** Before adopting anything, compare what is really there with what our config would
produce. Classify every difference as: identical / harmless change / **would replace the resource**. If anything would
replace it, stop and say so in plain words. CloudFormation itself does not do this check — it accepts a template that
does not match reality, and the damage appears on the _next_ deploy. This check is the safety of the whole feature.

**4. A one-shot job attached to a deploy.** Runs on Fargate (not Lambda — a real dump takes longer than 15 minutes),
inside the VPC, streams progress into the deploy output, and fails the deploy if it fails. Data copying is just one
user of this primitive; schema migrations and post-deploy seeding are others. We already have `deployment-script`, but
it is Lambda-backed, so this is a Fargate-backed sibling.

**5. "Never delete this."** Anything we adopt or anything that holds real data is retained by default when the stack is
deleted. The user should have to work to lose data.

## 7. How the data copy actually runs

We are in an unusually good position here, and it is worth exploiting.

Neon's import assistant takes a connection string and pulls the data from Neon's cloud. That breaks whenever the
source database only allows connections from known IP addresses — which is most real production databases. Running
the copy inside the customer's VPC has the same problem in reverse: it needs a NAT gateway and the user has to
allowlist an IP.

**But our CLI runs on the developer's laptop, which already has access to their database.** So the default should be:

1. the CLI runs `pg_dump` locally
2. uploads to a temporary encrypted bucket in their account
3. a job inside the VPC restores it

No NAT gateway. No firewall changes. Works through VPNs and SSH tunnels. We fall back to an in-VPC pull when the
source is publicly reachable, and to DMS only for very large databases.

We also already have `bastion-tunnel` and `query-sql`, so the wizard can verify the connection and estimate size and
duration _before_ anything is created.

### Cutover is the real anxiety

Copying is not the scary part. "When do I switch, and what if it's wrong?" is the scary part. So the flow should be:

1. copy the data
2. the new stack runs in parallel — the old one is untouched
3. we verify (row counts match, app health check passes)
4. we tell them exactly what to change: one env var, or a DNS record
5. one button to **re-copy** just before cutover, so the last hours of data come across
6. the old database stays until they explicitly delete it

A re-copy with a few minutes of downtime is fine for this customer. It is also dramatically simpler than continuous
replication, which we should not build yet.

## 8. Taking over existing AWS resources

This is the second feature, for the customer who already has an AWS account with things in it.

**For our main ICP, the default should be "point at it", not "take it over".** Pointing at an existing resource is
safe, reversible, and covers what they actually need: "my new app must talk to my existing database".

That works better than it sounds, because in AWS a lot of integration is done with _separate small resources that
point at a bigger one_. We can create and own those without touching the customer's resource:

- a security-group rule that lets our app reach their existing database
- a new app client on their existing Cognito user pool
- alarms on their existing resource
- IAM permissions for our workloads

Terraform, Pulumi and SST all make you hand-write each of these. We can do it automatically from a single
"my app needs this database" statement.

Taking over (true CloudFormation import) should ship for simple, single-resource things first — buckets, DynamoDB
tables, queues, topics, user pools. A Stacktape `relational-database` is really a database plus a subnet group,
security group, parameter group and secrets, and the existing one already has its own. That is a much harder problem
and a much bigger blast radius. Keep it as "point at it" for now.

And whatever we take over must be **releasable again**: one command that hands the resource back, unchanged. Nobody
points a new tool at their production database unless the exit is one command and it is written down.

## 9. What competitors do

**Taking over existing resources** — everyone in IaC has this, and all of them assume an infra engineer:

- **Terraform** — you write an `import` block, then run `plan -generate-config-out` to generate config, then prune the
  generated file by hand.
- **Pulumi** — `pulumi import` generates code you paste in. Imported resources are protected from deletion by
  default. Good instinct, worth copying.
- **SST** — you set an `import` option, deploy, read the error telling you which properties don't match, fix, repeat.
  Every iteration is a live change against a production resource.
- **CloudFormation** — has three mechanisms now, including auto-import that matches resources by name during a normal
  deploy. Useful to us. But it does not check that your template matches the real resource.
- **Crossplane** — the only one with a proper ladder: watch a resource read-only first, take it over later.
- **Firefly / Former2 / driftctl** — scan an account and generate IaC for whatever is unmanaged. Good framing for our
  account-inspection screen.

**Copying data in** — this is the real gap:

- **Neon** has an import assistant: paste a connection string, it imports. Closest to what we want, but console-only,
  Postgres-only, under 10 GB, and it breaks on firewalled sources.
- **AWS DMS** can do it properly, but it is infrastructure the customer has to model and pay for.
- **Railway, Render, Fly** all just publish a guide that says "run `pg_dump` yourself".
- **Every IaC tool** — nothing at all. Data is out of scope by definition.

Nobody offers "bring your data" as part of the first deploy. That is the thing worth building.

## 10. What to build, in order

**First — the copy.** Probe a source database, copy it into a new stack, verify, and let them re-copy before cutover.
Postgres and MySQL. This is the highest-value thing for our ICP and nobody has it.

**Second — pointing at existing AWS resources**, with automatic wiring (security-group rules, app clients, IAM). Safe,
useful, and no competitor packages it.

**Third — taking over existing AWS resources**, for simple resource types only, with the safe-takeover check and a
one-command exit.

**Later:** taking over databases, continuous replication, auto-seeded preview environments with anonymized data.

**Prerequisite:** the competitive audit found that drift detection is documented but its runtime path is commented
out. The safe-takeover check and drift detection are the same machinery. Fixing drift first gets us most of the way.

## 11. Open questions

1. **Do we read `.env` automatically?** It is the single best source of signal about what the app needs. It also
   contains secrets. Probably: read it, show what we found, never send it anywhere, ask before using any value.
2. **How do we handle the app itself during migration?** Copying the database is half the job. The user also has an
   app on Vercel or Render. Do we help them cut over, or stop at "here's your new database URL"?
3. **What happens on the second deploy?** The wizard produces a config. If the user then edits it by hand and breaks
   something, they have no infra experience to fall back on. Error messages are a first-class part of this feature.
4. **Cost of the migration itself** — Fargate, NAT, S3 transfer are real one-off charges. Show them, or the first bill
   undermines the first deploy.

---

## Sources

Taking over resources:
[Terraform import](https://developer.hashicorp.com/terraform/language/import),
[Terraform config generation](https://developer.hashicorp.com/terraform/language/import/generating-configuration),
[Pulumi import option](https://www.pulumi.com/docs/concepts/options/import/),
[CloudFormation resource import](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import.html),
[CloudFormation manual import constraints](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/import-resources-manually.html),
[CloudFormation auto-import](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/import-resources-automatically.html),
[SST import resources](https://sst.dev/docs/import-resources/),
[Crossplane observe-only](https://github.com/crossplane/crossplane/blob/main/design/design-doc-observe-only-resources.md),
[Former2](https://github.com/iann0036/former2),
[Firefly codification](https://docs.firefly.ai/detailed-guides/codification).

Copying data:
[Neon Import Data Assistant](https://neon.com/docs/import/import-data-assistant),
[AWS DMS homogeneous migration](https://docs.aws.amazon.com/dms/latest/userguide/dm-migrating-data-postgresql.html),
[Cognito user-migration Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html),
[AWS::RDS::DBInstance snapshot behavior](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html),
[Railway migrate from Heroku](https://docs.railway.com/platform/migrate-from-heroku),
[Render migrate from Heroku](https://render.com/docs/migrate-from-heroku),
[Fly migrate from Heroku](https://fly.io/docs/getting-started/migrate-from-heroku/).
