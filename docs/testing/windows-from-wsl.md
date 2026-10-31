# Testing the CLI on Windows from WSL

Use this when a change can behave differently in a native Windows process: paths and drive letters, process trees and
Ctrl+C, consoles and the TUI, the bundled Session Manager plugin, file watching, archives and installers. The helper
builds the CLI from your checkout, copies it to the Windows host and runs it there as `stacktape.exe`. WSL and a native
Windows process are different environments even when they read the same files; a WSL run proves nothing about Windows.

The helper is `apps/cli/scripts/windows-host/windows-host.ts`. Run it from `apps/cli` with `--task <id>`; everything it
creates lives in `C:\stacktape-wsl\<id>` and `/tmp/stacktape-windows-host/<id>`. The root is fixed: the helper deletes
inside it, so it offers no option to point it elsewhere.

## Before you start

The host needs PowerShell 7 (`pwsh.exe`), and the AWS CLI for the account check. Containers need Docker Desktop on
Windows (installed 31 Oct 2026, engine 29.9.2); the WSL Docker Engine is a separate daemon that the Windows CLI cannot
use, and neither should be reconfigured. Build the inputs the release build copies once per worktree:

```sh
pnpm exec turbo run build --filter=@stacktape/init-ui
cd apps/cli
export AWS_PROFILE=stacktape-e2e
bun scripts/windows-host/windows-host.ts doctor --task <id>
```

`doctor` reports the Windows tools, the account of `AWS_PROFILE` as Windows sees it, Docker Desktop, the WSL networking
mode and the task folder. `run`, `exec` and `console` refuse to start unless `AWS_PROFILE` is `stacktape-e2e` (add
`--allow-profile` only for another disposable account), so the Windows CLI never falls back to the default credentials.

## Commands

```sh
bun scripts/windows-host/windows-host.ts build --task <id>                 # about 45 s; --bytecode for the release setting
bun scripts/windows-host/windows-host.ts stage ~/fixtures/app --task <id>  # C:\stacktape-wsl\<id>\projects\app
bun scripts/windows-host/windows-host.ts run --task <id> --cwd app -- deploy --stage <stage> --region eu-north-1
bun scripts/windows-host/windows-host.ts exec --task <id> --cwd app -- npm install
```

- `build` assembles the same folder as the Windows release archive (`buildDistFolder` in `build-dist-package.ts`)
  without zipping it, and copies it to `<task>\cli`. It refuses while a `stacktape.exe` from that folder runs.
- `stage` copies a project with one tar stream. It follows symlinks, because Windows cannot follow symlinks into the WSL
  file system, and leaves out `node_modules`, `.venv` and `__pycache__`: Linux-built dependencies do not run on Windows.
  Install them with `exec` (`--include-node-modules` and `--exclude` change the list).
- `run` starts `stacktape.exe` with piped output and returns its exit code. `exec` runs a Windows command through
  `cmd.exe`. Both start the program through `host.ps1` (C# in `host.cs`, compiled once per version and cached in
  `<task>\tools`), which puts it in the task's job object (see below). They pass `AWS_PROFILE`, `AWS_REGION`,
  `AWS_DEFAULT_REGION`, every `STACKTAPE_*` variable and each `--env NAME` through `WSLENV`, and print the names, never
  the values. `PATH`, `HOME`, `DOCKER_*` and `STP_DEV_MODE` are refused: they describe the WSL side. WSLENV is rebuilt
  for the forwarded names, so an inherited `WSLENV=AWS_PROFILE/u` cannot keep the profile from Windows, and `host.ps1`
  refuses to start the program unless the Windows side sees the expected `AWS_PROFILE`.
- Windows programs started from WSL inherit the Windows PATH captured when WSL started, so a tool installed later
  (Docker Desktop on 31 Oct 2026) is missing until `wsl --shutdown`, which stops every agent's session. `run`, `exec`,
  `console` and `doctor` instead give the program the current Machine and User PATH from the registry.
- By default the Windows CLI uses the dev Console with the WSL source CLI's dev login (`pnpm dev:cli login`), passed
  only in its environment. The Windows profile's own login belongs to the owner's production Console, where the test
  account is not connected; `--control-plane user` uses it deliberately.

### A terminal without a window

Piped output is not a terminal, so the TUI, prompts and keyboard shortcuts need a console. Tests must never put a window
in front of the owner, who works on this machine at the same time:

```sh
bun scripts/windows-host/windows-host.ts console --detach --task <id> --cwd app -- dev --stage <stage> --region eu-north-1 --resources all
bun scripts/windows-host/windows-host.ts screen --task <id>         # the console's current text
bun scripts/windows-host/windows-host.ts keys --task <id> -- ctrl+r  # type: text, enter, tab, esc, arrows, ctrl+<letter>
bun scripts/windows-host/windows-host.ts output --task <id>         # the end of the output stream, escape sequences removed
bun scripts/windows-host/windows-host.ts ctrl-c --task <id>
bun scripts/windows-host/windows-host.ts wait --task <id>           # exits with the program's exit code
```

`console` runs the program in a pseudo console (ConPTY) with no window: the CLI sees a terminal (120 x 40), its output
goes to `<task>\logs\console-output.log`, and `keys` writes input through a named pipe that the host owns and only the
current user can open; no input file is ever read. `--program C:\path\to\program.exe` runs another console program
instead of `stacktape.exe`. `screen` reads the pseudo console's screen buffer. It records the program's PID and exit
code in `<task>\logs\console.json` and refuses a second console for the task while the first program runs. Use it for
commands that keep running: a program that exits within a few hundred milliseconds may finish before its PID is
recorded.

`ctrl-c` attaches to the program's console and raises Ctrl+C there, exactly as a key press would: every process in that
console receives it and no other console does. It also works for a `run` process, which has its own hidden console.

Only closing a window with its X needs a real window. `console --window` opens a classic console window on a separate
desktop created for the task (`stacktape-wsl-<id>`), so it never appears on the owner's screen and cannot take the
keyboard focus. A window on the owner's desktop took the foreground from their browser even when it was started
minimized and without activation. `close` posts WM_CLOSE to that window, which Windows delivers as `CTRL_CLOSE_EVENT`
and follows with termination after 5 seconds. Without `--pid`, `screen`, `ctrl-c` and `close` target the recorded
console program, or the only running CLI of the task.

### Processes and cleanup

```sh
bun scripts/windows-host/windows-host.ts ps --task <id>        # the processes in the task's job
bun scripts/windows-host/windows-host.ts kill --task <id>      # terminates the job and verifies it is empty
bun scripts/windows-host/windows-host.ts cleanup --task <id>   # kill, delete both folders, verify
```

Every program the helper starts is created suspended and put in a Windows job object for the task
(`Local\stacktape-wsl-<id>`) before it runs, and the job does not allow breakaway, so everything it starts belongs to
the job too. `ps` lists the job's processes and `kill` terminates the job. Windows tracks the membership: a reused PID
cannot be adopted, and a process whose parent has exited, such as the `dev --agent` daemon or a program started with
`start /b`, stays listed. A process that merely mentions the task folder is never touched. The job does not kill its
processes when the helper exits, because the `dev --agent` daemon must outlive the command that started it.

A job's name disappears with its last handle, even while its processes run. So each start also starts a keeper
(`keep-job.ps1`, a PowerShell process with a console but no window) inside the job, which holds a handle and exits once
the job contains nothing but keepers and console hosts. `ps` hides keepers; `kill` ends them with the rest.
`<task>\logs\processes.jsonl` lists each start for reading only.

Deletion goes through `remove-tree.ps1`, run with `-EncodedCommand` and the path in an environment variable, never
through `cmd.exe` parsing, so characters such as `&` stay inert. It deletes only inside `C:\stacktape-wsl`, refuses when
the root or any component between the root and the target is a junction, symbolic link or other reparse point, and
removes links inside the tree as links without following them. Before the helper writes below a folder (the CLI, staged
projects, tools, logs, the console's state and output), it checks the same components; the host repeats the check for
each file it writes. A task folder that is itself a link is refused by every command except `cleanup`, which removes the
link and leaves its target alone.

The live test `windows-host.e2e.spec.ts` checks these guarantees on the Windows host with junction fixtures inside
`C:\stacktape-wsl` and deletes them afterwards. It opens no window and does not contact AWS:

```sh
STACKTAPE_WINDOWS_HOST_E2E=1 AWS_PROFILE=stacktape-e2e pnpm --filter @stacktape/cli run test:windows-host:e2e
```

A forced kill is a crash: Stacktape cleans up nothing, and AWS keeps the SSM session open until its idle timeout. The
next `stacktape dev` of the stage replaces it. After a test that ends with `kill`, list the sessions with
`aws ssm describe-sessions --state Active` and terminate the ones your run opened. Delete stacks and the dev network
with the Windows CLI, then verify them in AWS as [Live AWS testing](live-aws.md) requires.

The helper points dev-agent tokens and dev-proxy state at `<task>\state` (`STACKTAPE_DEV_AGENT_TOKEN_DIR`,
`STACKTAPE_DEV_PROXY_STATE_DIR`). The rest of the Windows CLI's state stays in the real profile,
`C:\Users\<user>\.stacktape`: the AWS identity cache and downloaded tools such as Trivy. `cleanup` leaves that folder
alone because the owner's own sessions use it. List it before your first run and remove only what your run added. The
same holds for Docker Desktop: `dev stop`, Ctrl+C and closing the window remove the containers, but pulled and built
images and the build cache stay. Note `docker images` and `docker system df` before the first run and remove what your
run added.

## A dev-mode check

The order below covers what Windows changes in dev mode. A function with `joinDefaultVpc: true` uses the dev network,
the dev box and the SSM session without Docker; local databases and containers need Docker Desktop.

1. `STACKTAPE_DEV_NETWORK_SUFFIX=<id>` isolates the dev network.
   `run ... -- dev --agent --stage <stage> --region eu-north-1 --resources all --watch` returns once the agent is ready
   (about 4 minutes when it creates the network, 7 seconds afterwards).
2. Invoke the function from WSL with the AWS CLI. Edit the source in the Windows copy (`/mnt/c/...`): the Windows file
   watcher sees edits made from WSL, and the next invocation runs the new code within seconds.
3. With a local database (`connectTo`), the deployed function queries the container in Docker Desktop through the dev
   box. Write a row through MCP (`stacktape_dev` `query`), restart dev, and read it again: the data lives in the
   project's `.stacktape/dev-data/<stage>` on NTFS and survives the restart.
4. Query status through `stacktape mcp` on Windows: start it with `run --cwd <project> -- mcp` and write JSON-RPC to its
   standard input.
5. A container workload's URL (`http://<name>.<stage>.localhost:<port>`) is on Windows' localhost: request it with
   `exec -- curl.exe ...`.
6. `run ... -- dev stop --stage <stage>`, then `ps` shows no process, `exec -- docker ps -a` no container and
   `aws ssm describe-sessions --state Active` no session of the run. Repeat in a `console` with `ctrl-c`, and with
   `console --window` and `close`.

## Pitfalls

- **Working directory.** A Windows program started from a Linux directory gets a `\\wsl.localhost\...` working
  directory; `cmd.exe` refuses it and falls back to `C:\Windows`. The helper starts Windows programs from `/mnt/c`.
- **Parent `package.json`.** `C:\Temp\package.json` on this machine declares `"type": "module"`, which changes how
  Windows Node loads every `.js` file below it. Keep fixtures where no parent folder has a `package.json` or a Git
  repository; `doctor` checks the default root.
- **Localhost.** With the current NAT networking, Windows reaches services listening on WSL's localhost, but WSL cannot
  reach services bound to Windows' `127.0.0.1`. The dev agent API, local frontends and OAuth callbacks of the Windows
  CLI must be called from Windows (`exec -- curl.exe ...`), and browser checks of them run on Windows. Mirrored
  networking would remove this; it changes `.wslconfig` for every agent, so ask the owner first.
- **Arguments.** WSL quotes the arguments of a directly started `.exe` correctly (spaces, quotes, trailing backslashes,
  `%` and `&` arrive unchanged). `cmd.exe /c` parses its command line again, so `exec` suits ordinary commands, not
  arguments with quotes.
- **Piped dev.** `run ... -- dev` (or `dev | tee`) prints plain lines instead of the full-screen interface, so its
  keyboard shortcuts (Ctrl+R rebuild, Ctrl+A rebuild all) are unavailable; use `console` and `keys` for those.
- **Signals.** `kill -INT` on the WSL side terminates the Windows process without running its handlers; use `ctrl-c`. Do
  not `child.kill()` a Windows child from code under test either: it can raise Ctrl+C for the whole console.
- **Defender.** Real-time monitoring is off on this host. Even so, never put a download-and-run command
  (`iwr ... | iex`) on a `powershell.exe` command line; run installer scripts from a file.
- **Speed.** Build on Linux and copy once: the release folder copies in about 5 seconds as one tar stream. Running a
  Linux build tool against `/mnt/c` is many times slower than either side on its own disk.
