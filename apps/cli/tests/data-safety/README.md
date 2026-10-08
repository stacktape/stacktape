# Data safety on update and upgrade

This lane proves that deploying the current CLI over an existing stack does not destroy or replace a database, bucket,
table, file system, user pool, stream or queue. It runs offline: the baseline template plays the deployed stack, the
current CLI synthesizes the candidate, and the product's own change plan (`deployment-change-plan` with the
protected-resource check from `stack-info-map-diff`) is computed exactly as `deploy` computes it.

```sh
pnpm --filter @stacktape/cli run test:data-safety
```

## Baselines

`baselines/<case>/` holds one representative configuration in two forms and the templates produced for them:

| File               | Produced by                                              |
| ------------------ | -------------------------------------------------------- |
| `v3/stacktape.yml` | A Stacktape v3 configuration (written by hand).          |
| `v4/stacktape.yml` | Its v4 equivalent, following the upgrade guide.          |
| `v3.template.json` | `stacktape@3` `compile-template` for `v3/stacktape.yml`. |
| `v4.template.json` | The current CLI's synthesis of `v4/stacktape.yml`.       |

Every template is produced under the stack identity in `baseline-identity.ts`. The physical names and the stack hash
derive from it, so the v3 templates can only be reproduced with the same AWS account ID. `baselines/manifest.json`
records which CLI produced each template, when, with which command, and which organization-level alarms the regeneration
removed from a v3 template (the v3 CLI applies the development organization's Console alarms to every stack it compiles;
no baseline config declares them).

The spec checks each case twice: against the v4 baseline (an ordinary redeploy must change nothing) and against the v3
baseline (the upgrade must keep every stateful resource, and every other replacement or removal must be listed in
`expected-v3-upgrade-changes.ts` and described in the upgrade guide).

## Regenerating

```sh
bun tests/data-safety/regenerate-baselines.ts        # v3 (needs the v3 CLI and the dev API key) and v4
bun tests/data-safety/regenerate-baselines.ts --v4   # after an intended synthesis change
```

The script header lists the environment it needs. The v3 compile runs against the development control plane with the
`stacktape-dev` account connection; it only compiles and never deploys. Review the resulting diff before committing: a
changed v4 baseline means the next deploy of an unchanged config would update that resource.

Adding a case: create `baselines/<name>/v3/stacktape.yml` and `baselines/<name>/v4/stacktape.yml` with the entry files
they reference, then run the regeneration for that case (`--case=<name>`).
