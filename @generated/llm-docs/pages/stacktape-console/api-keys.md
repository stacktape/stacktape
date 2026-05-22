# API Keys

Stacktape API keys authenticate CLI sessions and CI/CD pipelines against your organization without requiring interactive login. Create keys with optional expiration dates in the Stacktape Console, track when each key was last used, and revoke keys instantly when they are no longer needed or compromised. API keys are managed per-organization.

## What API keys are for

An API key replaces the interactive [`stacktape login`](/cli/login) flow in environments where a browser is unavailable — CI/CD runners, headless servers, automated scripts, and shared developer machines. API keys are created for the currently selected organization.

Use API keys when you need non-interactive authentication. For local development where a browser is available, the standard [`stacktape login`](/cli/login) command is simpler and does not require key management.

## Creating an API key

In the Stacktape Console, navigate to the **API Keys** page. Click **Create new API Key** to open the creation form.

The form requires two fields:

| Field | Description |
|-------|-------------|
| **API Key name** | A human-readable label to identify this key (e.g. `github-actions-prod`, `dev-laptop`). Required. |
| **Expiration** | How long the key remains valid. Options: No expiration, 30 days, 60 days, 90 days, 180 days, or 365 days. Defaults to no expiration. |

After creation, active key cards can reveal or copy the key value from the Console. Treat the value as a secret — store it in your CI/CD platform's secrets manager, not in source code or plain-text config files.


> **Tip:** Name keys after their purpose or location (`ci-deploy-production`, `developer-alice-laptop`) so you can identify and rotate them without guessing which integration depends on each key.


## Key status and lifecycle

Each API key has one of three statuses:

| Status | Meaning |
|--------|---------|
| **Active** | The key is valid. Show, copy, and revoke controls are available on the key card. |
| **Expired** | The key passed its expiration date. The Console marks a key as expired once its `expiresAt` time has passed. |
| **Revoked** | The key was manually revoked by a user. |

The Console displays active keys separately from expired and revoked keys, which appear under an **Expired & Revoked** heading. Each key card shows:

- **Name** — the label assigned at creation
- **Created** — timestamp of creation
- **Last used** — timestamp of the most recent use, or "never"
- **Expiration** — remaining days until expiry, or the expired date (only shown for keys with an expiration set)
- **Revoked** — timestamp of revocation (only shown for revoked keys)

The API Keys page does not show a reactivation action for expired or revoked keys. Create a new key instead when you need to restore access for an integration point.

## Revoking an API key

Click **Revoke** on any active key to open a confirmation dialog. The dialog warns that any CLI sessions or integrations using the key will stop working immediately. After confirming, the key moves to the **Expired & Revoked** section and the reveal, copy, and revoke controls are removed.


> **Warning:** Revoking a key takes effect immediately. Confirm that no running pipelines depend on the key before revoking, or create and configure a replacement key first.


## Revealing and copying a key value

Active keys display **Show** and **Copy** buttons on the key card. Click **Show** to toggle visibility of the full key value, or **Copy** to place it in your clipboard without revealing it on screen. These controls are only available on active keys — expired and revoked key cards do not show them.

## Using an API key with the CLI

API keys authenticate Stacktape CLI commands and CI/CD pipelines without interactive login. For the exact setup — how to pass the key to the CLI and configure your pipeline — see [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) or [GitOps with Console](/ci-cd-and-gitops/gitops-with-console).


> **Tip:** Store the API key in your CI/CD platform's built-in secrets manager (GitHub Actions secrets, GitLab CI variables, etc.) rather than in plain text. This keeps the key out of command history, logs, and source control.


## Permissions

Managing API keys requires the `api-keys:manage-own` permission. Users without this permission are redirected to `/overview` when they navigate to the API Keys page. See [Team and access control](/stacktape-console/team-and-access-control) for details on managing user permissions.

## Best practices

These are general credential-management recommendations applicable to API keys:

- **Set an expiration** for CI/CD keys. The 90- or 180-day options balance security with maintenance overhead. Shorter windows (30-60 days) suit developer machines where [`stacktape login`](/cli/login) is an alternative.
- **Use "No expiration" sparingly.** Reserve it for long-lived infrastructure where you have a separate rotation process.
- **One key per integration point.** Sharing a single key across multiple pipelines makes revocation disruptive. Create separate keys for production deploys, staging deploys, and individual developer machines.
- **Rotate before expiration.** Create the replacement key, update your CI/CD secrets, verify a deployment succeeds, then revoke the old key. Both keys remain valid simultaneously until the old one is revoked.
- **Monitor "Last used."** Keys that show "never" or a date months in the past are candidates for cleanup.

## FAQ

### What are Stacktape API keys used for?

Stacktape API keys provide non-interactive authentication for CLI commands and CI/CD pipelines. They replace the browser-based [`stacktape login`](/cli/login) flow in environments without a browser — such as GitHub Actions runners, GitLab CI, or headless build servers.

### How do I set up API key authentication in my CI/CD pipeline?

Create an API key in the Console, then store it as a secret in your CI/CD platform. The exact configuration steps depend on your pipeline tool. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for pipeline-specific examples covering GitHub Actions, GitLab CI, and other providers.

### What expiration period should I choose?

For production CI/CD pipelines, 90 or 180 days provides a reasonable security-maintenance tradeoff. For developer machines where [`stacktape login`](/cli/login) is an alternative, shorter expirations (30-60 days) encourage using the interactive login flow instead. Use "No expiration" only when you have a separate rotation process.

### Can I reactivate an expired or revoked key?

The API Keys page does not show a reactivation action for expired or revoked keys. Create a new key instead, update your integrations with the new value, and remove any references to the old key.

### How do I rotate an API key without downtime?

Create the new key first. Update your CI/CD secret or environment variable to the new value. Run a test deployment to confirm authentication works. Then revoke the old key. Both keys are valid simultaneously until the old one is explicitly revoked.

### How many API keys can I create?

The API Keys page does not show a visible count limit. For maintainability, use separate keys for separate integration points rather than consolidating into a single shared key.

### What happens when I revoke a key?

The Console confirmation dialog warns that any CLI sessions or integrations using the key will stop working immediately. After revoking, the key card moves to the **Expired & Revoked** section and no longer shows reveal, copy, or revoke controls.

### When should I use API keys vs interactive login?

Use [`stacktape login`](/cli/login) for local development — it opens a browser, authenticates you, and requires no key management. Use API keys for headless environments (CI/CD runners, automated scripts, shared build servers) where a browser is unavailable. Most teams use interactive login locally and API keys in their pipelines.

### Are API keys scoped to a specific organization?

Yes. API keys are created in the context of the currently selected organization. When you switch organizations in the Console, you see only the keys belonging to that organization.

## Related features

- [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) — use API keys to authenticate Stacktape in GitHub Actions, GitLab CI, or other pipelines
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — automatic deployments managed by the Console, with no manual key setup needed
- [Team and access control](/stacktape-console/team-and-access-control) — manage user permissions including the `api-keys:manage-own` permission
- [`stacktape login`](/cli/login) — interactive login for local development
