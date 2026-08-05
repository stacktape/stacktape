# Credentials and secrets

This repository treats configuration, human identity, build credentials, and deployed application secrets as four
different things. Putting all four in `.env` files makes setup look simple while hiding ownership, lifetime, scope,
and rotation. The rules below are the monorepo contract for humans and agents.

## Where each kind of value belongs

| Kind                            | Examples                                                                 | Canonical home                                                 | Local experience                              |
| ------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------- |
| Public configuration            | domains, AWS account IDs, PostHog public ingestion tokens, Vite settings | committed typed config or GitHub variables                     | no setup                                      |
| Human/cloud identity            | AWS and Stacktape access                                                 | AWS IAM Identity Center and Stacktape's external login session | sign in; tools refresh outside the repository |
| Deployed application secret     | OAuth secrets, signing keys, vendor tokens                               | AWS Secrets Manager, referenced from `stacktape.ts`            | run the read-only secret preflight            |
| CI deployment identity          | npm, GitHub release and AWS publishing                                   | GitHub OIDC plus protected environments                        | no long-lived cloud key                       |
| Unavoidable build-only SaaS key | PostHog source-map upload                                                | narrowly scoped CI secret or OS credential store               | expose to one child process, then clear it    |

Do not put credential values in `.env*`, instruction files, command examples, issue text, logs, Stacktape config, or
GitHub variables. `.env.example` may document names with inert placeholders. Local `.env*` files are ignored, but
they are an emergency compatibility path, not the supported credential store.

## Console deployment contract

The private Console owns an executable manifest in `apps/console/api/deployment-secrets.ts`. The infrastructure
definition reads every `$Secret(...)` reference from that manifest, and the preflight validates the selected stage,
AWS account, secret existence, JSON shape, and required stage field without printing values:

```powershell
pnpm secrets:check:console:dev
```

The command is read-only and refuses an AWS account other than `977946299200`. Production reads require the explicit
private-package command and `--allowProduction`; no ordinary check reads production secrets.

Stage fields are selected during deployment. For example, dev receives only `paddle-api-key#DEV`, not the JSON object
that also holds the production credential. The current shared legacy secrets are identified by the manifest. Split
them into stage-specific fields the next time each credential is rotated; do not create another untracked copy.

Stacktape currently resolves `$Secret` values into workload environment variables. Treat permission to read Lambda
configuration or ECS task definitions as secret access, especially because ECS plaintext environment values are
visible through `DescribeTaskDefinition`. A future Stacktape runtime-secret feature should map secret environment
variables to native ECS secret references and cached runtime retrieval for Lambda. Until then, IAM access to deployed
configuration must remain restricted.

## Human and agent authentication

- Prefer AWS IAM Identity Center profiles and `aws sso login`; do not create IAM-user access keys for new users or
  agents.
- Prefer `stacktape login`, whose session is kept outside the checkout. Automation uses its own expiring, scoped API
  key only when interactive login is impossible.
- Prefer `gh auth login`, whose credential helper owns the token. Do not copy `gh auth token` into a file.
- An agent inherits an authenticated tool session or an explicitly selected short-lived profile. It never receives a
  shared personal password in its prompt or instructions.

## Provisioning and rotation

1. Create or rotate a value directly in the approved manager. Never put it on a command line that will be retained in
   shell history.
2. Give the secret a logical owner and stage field, then add its non-sensitive contract metadata to the manifest.
3. Run `pnpm secrets:check:console:dev` and the relevant application tests.
4. Deploy and verify the consumer before deleting an old version. Use the manager's recovery window where available.
5. Revoke first when a value has appeared in source, documentation, logs, chat, or a task definition that was broadly
   readable. Removing the text is not remediation by itself.

`pnpm check:secrets` scans tracked public and private trees. The pre-commit form scans added lines. It rejects known
credential formats, secret-bearing log statements, and tracked `.env*` files without echoing the matched value.

## CI

AWS publishing uses GitHub OIDC and narrowly scoped roles. Keep that pattern for deployment: pin actions, use protected
environments, limit the OIDC trust policy to the repository/environment, and grant the role only the operations and
resource ARNs it needs. Delete an Actions secret when no workflow references it; a stored but unused credential is
still attack surface.
