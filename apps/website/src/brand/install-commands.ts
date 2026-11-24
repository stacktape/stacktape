export const COMMAND_HINT = 'opens the wizard in your browser';

const shellInstall = (script: string) => [`curl -L https://installs.stacktape.com/${script} | sh`, 'stacktape init'];
const powershellInstall = (script: string) => [
  `iwr https://installs.stacktape.com/${script} -useb | iex`,
  'stacktape init'
];

/**
 * Each tab's lines, in order. The install tabs end with `stacktape init`: the next command after
 * installing, shown rather than copied. Every operating system has a build per CPU architecture; the
 * first variant is the one shown until the page detects the visitor's machine.
 */
export const COMMANDS = [
  { id: 'npx', label: 'npx', variants: [{ arch: 'any', label: 'npx', lines: ['npx stacktape init'] }] },
  {
    id: 'macos',
    label: 'macOS',
    variants: [
      { arch: 'arm64', label: 'Apple silicon', compactLabel: 'ARM', lines: shellInstall('macos-arm.sh') },
      { arch: 'x64', label: 'Intel', lines: shellInstall('macos.sh') }
    ]
  },
  {
    id: 'linux',
    label: 'Linux',
    variants: [
      { arch: 'x64', label: 'x64', lines: shellInstall('linux.sh') },
      { arch: 'arm64', label: 'ARM64', lines: shellInstall('linux-arm.sh') }
    ]
  },
  {
    id: 'windows',
    label: 'Windows',
    variants: [
      { arch: 'x64', label: 'x64', lines: powershellInstall('windows.ps1') },
      { arch: 'arm64', label: 'ARM64', lines: powershellInstall('windows-arm.ps1') }
    ]
  }
] as const;
