# Stacktape analytics contract

This package owns the versioned vocabulary shared by the public sites, CLI, Console UI, and Console API. It contains
no SDK client and no application lifecycle code. Each application owns initialization and delivery for its runtime.

## Rules

- Use lower-case `snake_case` event and property names.
- Track a completed, high-value operation on the server when a server can authoritatively observe it. Client events
  describe intent or UI interaction and must not be counted as successful completion.
- Use the stable Stacktape user ID as `distinct_id` after authentication and the organization ID as PostHog's
  `organization` group key. Never use an email address or display name as an identifier.
- Add `app`, `environment`, `schema_version`, and, where available, `app_version` to every custom event and exception.
- Do not send project names, repository URLs, organization names, config values, command argument values, request
  bodies, credentials, or secrets. Error text is passed through the shared redactor before capture.
- Expected validation, authentication, authorization, user-code, and cloud-provider errors remain product outcomes;
  only unexpected application failures are error-tracking issues.

## Environments

Production uses the existing Stacktape PostHog project. Preview, development, and local runs must use an explicit
non-production project token or remain disabled. Runtime overrides use `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`, and
`POSTHOG_ENVIRONMENT` on servers/CLI and the corresponding public/Vite variables in browser builds.

Production traffic uses Stacktape's managed first-party PostHog proxy. That proxy is bound to the production project,
so non-production projects use PostHog's direct EU ingestion host to preserve project isolation.

Source-map uploads are enabled only when a scoped personal API key and project ID are supplied to the build. The
personal key is a CI secret; project ingestion tokens are public identifiers.
