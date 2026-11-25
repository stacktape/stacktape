/** The Console's sentence above the same command on its new project page. */
export const COMMAND_HINT = "Run this in your app's folder. It opens the setup wizard in your browser.";

/** One line: the installer runs `stacktape init` once it has installed the CLI. */
const shellInstall = (script: string) => `curl -fsSL https://installs.stacktape.com/${script} | sh -s -- init`;
const powershellInstall = (script: string) => `iex "& { $(irm https://installs.stacktape.com/${script}) } init"`;

/**
 * Each tab's command, in the Console's order: the package runners, which need Node.js, then the operating systems,
 * whose installer needs nothing. Every installer installs the build for the machine's processor whichever script name
 * is downloaded, so there is no processor choice to show; a detected processor only picks the matching script name.
 * The first variant is the one shown until the page detects the visitor's machine.
 */
export const COMMANDS = [
  { id: 'npx', label: 'npm', variants: [{ arch: 'any', command: 'npx stacktape init' }] },
  { id: 'pnpm', label: 'pnpm', variants: [{ arch: 'any', command: 'pnpm dlx stacktape init' }] },
  { id: 'bun', label: 'bun', variants: [{ arch: 'any', command: 'bunx stacktape init' }] },
  {
    id: 'macos',
    label: 'macOS',
    installer: true,
    variants: [
      { arch: 'arm64', command: shellInstall('macos-arm.sh') },
      { arch: 'x64', command: shellInstall('macos.sh') }
    ]
  },
  {
    id: 'linux',
    label: 'Linux',
    installer: true,
    variants: [
      { arch: 'x64', command: shellInstall('linux.sh') },
      { arch: 'arm64', command: shellInstall('linux-arm.sh') }
    ]
  },
  {
    id: 'windows',
    label: 'Windows',
    installer: true,
    variants: [
      { arch: 'x64', command: powershellInstall('windows.ps1') },
      { arch: 'arm64', command: powershellInstall('windows-arm.ps1') }
    ]
  }
] as const;
