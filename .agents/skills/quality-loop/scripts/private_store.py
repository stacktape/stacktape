"""Private queue transactions. Each write is a fast-forward Git commit, never a force push."""

import json
import os
from pathlib import Path
import subprocess
import tempfile


REPOSITORY = "stacktape/console-app"
BRANCH = "agent-quality-queue"
REMOTE = f"https://github.com/{REPOSITORY}.git"


class QueueError(Exception):
    pass


def private_repository():
    result = subprocess.run(
        ["gh", "repo", "view", f"https://github.com/{REPOSITORY}", "--json", "nameWithOwner,isPrivate,url"],
        capture_output=True, text=True, check=False, timeout=30,
    )
    if result.returncode:
        raise QueueError("Cannot verify the private repository. Check gh authentication; no fallback destination.")
    metadata = json.loads(result.stdout)
    if metadata != {"nameWithOwner": REPOSITORY, "isPrivate": True, "url": f"https://github.com/{REPOSITORY}"}:
        raise QueueError("Destination must be the private stacktape/console-app repository.")


class GitStore:
    # Alternate transports are injectable only from tests, never from CLI flags or environment.
    def __init__(self, remote=REMOTE, verify=private_repository):
        self.remote = remote
        self.verify = verify

    def transaction(self, update=None):
        self.verify()
        with tempfile.TemporaryDirectory(prefix="stacktape-quality-") as directory:
            git_dir = Path(directory) / "queue.git"

            def git(*args, data=None, allowed=(0,)):
                # Bytes, not text mode: on Windows text mode writes "\r\n", which would name the mktree entry
                # "state.json\r" and store CRLF state.
                result = subprocess.run(
                    ["git", "-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential",
                     "-c", "user.name=Stacktape Quality", "-c", "user.email=quality@localhost",
                     "--git-dir", str(git_dir), *args],
                    input=None if data is None else data.encode("utf-8"), capture_output=True, check=False,
                    timeout=60, env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
                )
                if result.returncode not in allowed:
                    # Neither provider output nor report content belongs in a public terminal error.
                    raise QueueError(f"Git {args[0]} failed (exit {result.returncode}); queue was not acknowledged.")
                result.stdout = result.stdout.decode("utf-8")
                return result

            git("init", "--bare", "--quiet")
            for _ in range(8):
                ref = f"refs/heads/{BRANCH}"
                listing = git("ls-remote", "--exit-code", self.remote, ref, allowed=(0, 2))
                parent = None
                state = None
                if listing.returncode == 0:
                    # FETCH_HEAD belongs to this invocation, so concurrent callers cannot race its read.
                    git("fetch", "--quiet", "--depth=1", self.remote, ref)
                    parent = git("rev-parse", "FETCH_HEAD").stdout.strip()
                    raw = git("show", f"{parent}:state.json").stdout
                    state = json.loads(raw)
                    if state.get("version") != 1:
                        raise QueueError("Unsupported queue schema; use the matching skill version.")
                if update is None:
                    if state is None:
                        raise QueueError("Queue is not initialized. Run pnpm quality init.")
                    return state
                # The callback must have no side effects: competing writes retry against the winner.
                new_state, output = update(state)
                if new_state == state:
                    return output
                serialized = json.dumps(new_state, indent=2, sort_keys=True) + "\n"
                blob = git("hash-object", "-w", "--stdin", data=serialized).stdout.strip()
                tree = git("mktree", data=f"100644 blob {blob}\tstate.json\n").stdout.strip()
                parents = ["-p", parent] if parent else []
                commit = git("commit-tree", tree, *parents, data="Update private quality queue\n").stdout.strip()
                # Verify immediately before sending any report bytes. Never trust a cached privacy answer.
                self.verify()
                pushed = git("push", "--quiet", self.remote, f"{commit}:{ref}", allowed=(0, 1))
                if pushed.returncode == 0:
                    return output
                # This also handles a lost successful-push response. Mutation IDs/tokens are idempotent.
            raise QueueError("Queue write contention or remote rejection; retry this same command.")
