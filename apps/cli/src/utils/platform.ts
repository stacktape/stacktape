export type SupportedPlatform = 'win' | 'win-arm' | 'linux' | 'macos' | 'macos-arm' | 'alpine' | 'linux-arm';

export const isWindowsPlatform = (platform: SupportedPlatform) => platform === 'win' || platform === 'win-arm';
