# Stacktape v4

This branch is the integrated Stacktape v4 monorepo. The public CLI and private Console have been migrated, and the
config, naming, Console API contract, design-token, and packaging capabilities now have concrete package boundaries.
The docs and website are intentionally still small Astro shells. Release publishing and default-branch cutover remain
disabled until their release-readiness gates are complete.

Prerequisites: Node.js 24+, pnpm 11.17.0, and Bun 1.3.9 — the CLI builds, generates and tests with Bun, and
`apps/cli/AGENTS.md` records where that matters.

Public contributors clone and work normally:

```sh
git clone --branch v4/integration https://github.com/stacktape/stacktape.git
cd stacktape
pnpm install --frozen-lockfile
pnpm check:public
```

The explicit branch is temporary while the repository default still points at v3; remove it after the v4 cutover.

Maintainers initialize the optional private Console submodule:

```sh
git submodule update --init apps/console
pnpm install --frozen-lockfile
pnpm check:integrated
```

The public checkout is a first-class supported state. Read
[`architecture/v4/SIMPLIFIED-MIGRATION.md`](architecture/v4/SIMPLIFIED-MIGRATION.md) before changing package
boundaries or migration behavior.

Migration agents receive isolated worktrees:

```sh
pnpm worktree:create public-cli-import --dossier architecture/v4/dossiers/simple-public-cli-import.md
```

The scripts refuse dirty integration roots, existing branches/paths, and unsafe cleanup targets. They never
automatically discard a dirty public or private worktree. Before cleanup, private HEAD must also be reachable from a
remote-tracking ref: a private commit stored only inside the per-worktree submodule clone would otherwise be lost.
