# Stacktape v4

This branch is the fresh v4 monorepo backbone. The existing Stacktape applications are migrated into it with minimal
behavioral change before reusable capabilities are extracted. The current approach deliberately favors conceptual
simplicity and maintainability over speculative runtime architecture.

Public contributors clone and work normally:

```sh
git clone https://github.com/stacktape/stacktape.git
pnpm install --frozen-lockfile
pnpm check:public
```

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
