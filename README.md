# Stacktape v4

This branch is the fresh v4 monorepo backbone. It intentionally contains structure, contracts, tooling, and validation
before the legacy implementation is migrated in reviewed vertical slices.

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

The public checkout is a first-class supported state. See `architecture/v4` before changing package boundaries or
migration behavior.

Migration agents receive isolated worktrees:

```sh
pnpm worktree:create naming-compatibility
pnpm worktree:create console-contracts --private --dossier architecture/v4/dossiers/console-contracts.md
```

The scripts refuse dirty integration roots, existing branches/paths, and unsafe cleanup targets. They never
automatically discard a dirty public or private worktree.
