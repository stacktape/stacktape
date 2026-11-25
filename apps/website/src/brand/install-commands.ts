export const COMMAND_HINT = 'opens the wizard in your browser';

/** One line: the installer runs `stacktape init` once it has installed the CLI. */
const shellInstall = (script: string) => `curl -fsSL https://installs.stacktape.com/${script} | sh -s -- init`;
const powershellInstall = (script: string) => `iex "& { $(irm https://installs.stacktape.com/${script}) } init"`;

/**
 * Each tab's command. Every operating system has a build per CPU architecture; the first variant is the one shown
 * until the page detects the visitor's machine.
 */
export const COMMANDS = [
  { id: 'npx', label: 'npx', variants: [{ arch: 'any', label: 'npx', command: 'npx stacktape init' }] },
  {
    id: 'macos',
    label: 'macOS',
    variants: [
      { arch: 'arm64', label: 'Apple silicon', compactLabel: 'ARM', command: shellInstall('macos-arm.sh') },
      { arch: 'x64', label: 'Intel', command: shellInstall('macos.sh') }
    ]
  },
  {
    id: 'linux',
    label: 'Linux',
    variants: [
      { arch: 'x64', label: 'x64', command: shellInstall('linux.sh') },
      { arch: 'arm64', label: 'ARM64', command: shellInstall('linux-arm.sh') }
    ]
  },
  {
    id: 'windows',
    label: 'Windows',
    variants: [
      { arch: 'x64', label: 'x64', command: powershellInstall('windows.ps1') },
      { arch: 'arm64', label: 'ARM64', command: powershellInstall('windows-arm.ps1') }
    ]
  }
] as const;
