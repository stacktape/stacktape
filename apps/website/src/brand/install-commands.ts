/** The Console's sentence above the same command on its new project page. */
export const COMMAND_HINT = "Run this in your app's folder. It opens the setup wizard in your browser.";

/** One line: the installer runs `stacktape init` once it has installed the CLI. */
const shellInstall = (script: string) => `curl -fsSL https://installs.stacktape.com/${script} | sh -s -- init`;
const powershellInstall = (script: string) => `iex "& { $(irm https://installs.stacktape.com/${script}) } init"`;

/**
 * Each tab's command, in the Console's order: the package runners, which need Node.js, then the operating systems,
 * whose installer needs nothing. Every installer installs the build for the machine's processor whichever script name
 * is downloaded (apps/cli/scripts/install-scripts), so each system has one command, with the Console's script names.
 */
export const COMMANDS = [
  { id: 'npx', label: 'npm', command: 'npx stacktape init' },
  { id: 'pnpm', label: 'pnpm', command: 'pnpm dlx stacktape init' },
  { id: 'bun', label: 'bun', command: 'bunx stacktape init' },
  { id: 'macos', label: 'macOS', installer: true, command: shellInstall('macos.sh') },
  { id: 'linux', label: 'Linux', installer: true, command: shellInstall('linux.sh') },
  { id: 'windows', label: 'Windows', installer: true, command: powershellInstall('windows.ps1') }
] as const;
