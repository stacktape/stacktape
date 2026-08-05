# Isolated agent worktrees

Use a worktree when another task is already changing the main checkout or when a change needs independent review.
The helper branches from a committed ref, so the primary checkout may be on another branch and may contain unrelated
uncommitted work.

```sh
pnpm worktree:create <task-id>
pnpm worktree:create <task-id> --private
pnpm worktree:create <task-id> --base <ref> --dossier <path>
```

The default base is the local `main` ref. The public branch is `work/<task-id>`. `--private` initializes the Console
submodule at the commit pinned by that public base and creates the same branch name there. Worktrees are placed beside
the primary checkout under `.worktrees/<repository>-<task-id>`; this keeps their dependencies and generated outputs
out of the primary working tree.

`--dossier` is optional. When supplied, it must name a tracked or untracked file inside the public repository and a
local pointer is written into the worktree. The helper installs the frozen workspace dependencies but never runs a
build, deployment, or cloud command.

After review and integration, clean up with:

```sh
pnpm worktree:remove <task-id>
```

Cleanup refuses dirty public or private worktrees. If private commits exist, it also requires the private HEAD to be
reachable from a remote-tracking ref so removing the submodule cannot destroy the only copy. The public `work/*`
branch is preserved; delete it separately after confirming the commit is integrated.
