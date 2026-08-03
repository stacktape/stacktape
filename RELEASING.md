# Releasing Stacktape v4

The v4 release workflow has two deliberately separate channels:

- `candidate` builds and verifies every distributable artifact, then stops. It needs no npm or AWS publishing
  authority.
- `preview` reuses that exact candidate, proves it in a disposable AWS account, creates a GitHub prerelease, and
  publishes the npm tarball under the `preview` dist-tag. It never changes `latest` or the stable installer, schema,
  documentation, or version endpoints.

The local command is only a workflow dispatcher. Builds and publishing always happen in GitHub Actions:

```powershell
pnpm release -- --channel candidate --version 4.0.0-preview.1
pnpm release -- --channel preview --version 4.0.0-preview.1
```

Pass `--ref <branch>` to dispatch a branch other than the current one. The branch and workflow must already be pushed.
The equivalent command without the wrapper is:

```powershell
gh workflow run release.yml --repo stacktape/stacktape --ref v4/integration -f channel=preview -f version=4.0.0-preview.1
```

## One-time preview setup

### 1. Create the disposable AWS canary role

Use an AWS account reserved for throwaway tests. The canary deploys, updates, invokes, and deletes a small real stack;
do not put production or long-lived resources in this account.

1. In IAM, add the GitHub Actions OIDC provider `https://token.actions.githubusercontent.com` with audience
   `sts.amazonaws.com` if the account does not already have it.
2. Create a role for the canary, set its maximum session duration to at least two hours, and attach permissions that
   let Stacktape deploy and delete the canary. Because Stacktape can synthesize many AWS services, the uncomplicated
   initial setup is `AdministratorAccess` **only in this otherwise empty disposable account**. Narrow it later from
   observed canary calls if the account will contain anything else.
3. Use this trust policy, replacing the account ID. It authorizes only the `preview-canary` GitHub environment in this
   repository:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:stacktape/stacktape:environment:preview-canary"
        }
      }
    }
  ]
}
```

The repository currently uses GitHub's legacy default OIDC subject shown above. Before saving the policy, verify that
this is still true:

```powershell
gh api repos/stacktape/stacktape/actions/oidc/customization/sub
```

If GitHub reports immutable subjects are enabled, use the exact owner/repository-ID subject format reported by GitHub
instead. Repository renames or an explicit OIDC migration can change the expected subject.

### 2. Configure GitHub

In **Settings → Environments**, keep these environments restricted to the release branches (`main` and, until the v4
cutover, `v4/integration`):

- `preview-canary` owns AWS OIDC access;
- `preview-publish` owns npm/GitHub publication.

Set the canary target as repository variables:

```powershell
gh variable set STACKTAPE_PREVIEW_AWS_ACCOUNT_ID --repo stacktape/stacktape --body "123456789012"
gh variable set STACKTAPE_PREVIEW_AWS_ROLE_ARN --repo stacktape/stacktape --body "arn:aws:iam::123456789012:role/<role-name>"
gh variable set STACKTAPE_PREVIEW_AWS_REGION --repo stacktape/stacktape --body "eu-west-1"
```

The workflow validates the account and role values before requesting OIDC credentials, and the AWS credential action
independently refuses credentials from a different account.

The real canary also needs a development Stacktape API key. Keep the existing repository secret, or set it if missing:

```powershell
gh secret set STACKTAPE_API_KEY --repo stacktape/stacktape
```

### 3. Authorize npm trusted publishing

The workflow intentionally has no long-lived npm token. As an npm owner of the `stacktape` package, authenticate with
npm CLI 11.5.1 or newer and bind this one workflow/environment:

```powershell
npm login
npm trust github stacktape --repo stacktape/stacktape --file release.yml --env preview-publish --allow-publish
npm trust list stacktape
```

The matching npm website fields are organization/user `stacktape`, repository `stacktape`, workflow filename
`release.yml`, environment `preview-publish`, and allowed action `npm publish`. Do not add an `NPM_TOKEN` secret.

## First activation and normal use

Run a candidate first. It proves the public checkout, six platform archives, checksums, npm tarball, Alpine runtime,
and candidate artifact without AWS or publication:

```powershell
pnpm release -- --channel candidate --version 4.0.0-preview.1
gh run list --repo stacktape/stacktape --workflow release.yml --limit 1
gh run watch <run-id> --repo stacktape/stacktape
gh run download <run-id> --repo stacktape/stacktape
```

Then dispatch the preview with the same version. A version can be published only once, so increment the numeric suffix
for every later attempt:

```powershell
pnpm release -- --channel preview --version 4.0.0-preview.1
npm view stacktape@4.0.0-preview.1 version
npm view stacktape dist-tags.preview
pnpm dlx stacktape@4.0.0-preview.1 version
```

The canary and its cancellation-safe cleanup use a unique owner tag. If cleanup fails, inspect the failed run before
manually deleting only the uniquely named `v4canary-<run-id>-<attempt>` stack in the configured disposable account.

## Relationship to the v3 release script

The old repository's `scripts/trigger-github-release.ts` was a working convenience dispatcher: it calculated a
version, detected prereleases, and called `release.yml` through Octokit. It did not itself build or publish anything,
and its workflow relied on the npm/GitHub configuration that already existed at the time.

The v4 `pnpm release` command preserves the useful local-dispatch workflow but requires an explicit `candidate` or
`preview` channel and version. The underlying release workflow deliberately differs: it canary-tests preview bits,
publishes only the immutable `preview` channel, and does not update stable mutable endpoints. Stable v4 publication
will be added only after the preview lane is proven.
