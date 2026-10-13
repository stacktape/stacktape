import { expect, test } from 'bun:test';
import type { InstallPlatform, InstallPlatformNavigator } from './detectInstallPlatform.js';
import { detectInstallPlatform } from './detectInstallPlatform.js';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const FIREFOX_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0';
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const FIREFOX_LINUX_ARM = 'Mozilla/5.0 (X11; Linux aarch64; rv:143.0) Gecko/20100101 Firefox/143.0';
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';

/** A Chromium navigator: the user agent stays frozen, the client hints carry the platform and architecture. */
const chromium = (userAgent: string, platform: string, architecture: string): InstallPlatformNavigator => ({
  userAgent,
  userAgentData: { platform, mobile: false, getHighEntropyValues: async () => ({ architecture, bitness: '64' }) }
});

const cases: {
  name: string;
  navigator: InstallPlatformNavigator;
  renderer?: string;
  expected: InstallPlatform | undefined;
}[] = [
  {
    name: 'Edge on Windows ARM',
    navigator: chromium(CHROME_WINDOWS, 'Windows', 'arm'),
    expected: { os: 'windows', arch: 'arm64' }
  },
  {
    name: 'Chrome on Windows x64',
    navigator: chromium(CHROME_WINDOWS, 'Windows', 'x86'),
    expected: { os: 'windows', arch: 'x64' }
  },
  { name: 'Firefox on Windows', navigator: { userAgent: FIREFOX_WINDOWS }, expected: { os: 'windows', arch: 'x64' } },
  {
    name: 'Chrome on Apple silicon',
    navigator: chromium(CHROME_MAC, 'macOS', 'arm'),
    expected: { os: 'macos', arch: 'arm64' }
  },
  {
    name: 'Chrome on an Intel Mac',
    navigator: chromium(CHROME_MAC, 'macOS', 'x86'),
    expected: { os: 'macos', arch: 'x64' }
  },
  {
    name: 'Firefox on an Intel Mac',
    navigator: { userAgent: CHROME_MAC.replace('Chrome', 'Firefox') },
    renderer: 'Intel(R) Iris(TM) Plus Graphics 655',
    expected: { os: 'macos', arch: 'x64' }
  },
  {
    name: 'Firefox on Apple silicon',
    navigator: { userAgent: CHROME_MAC.replace('Chrome', 'Firefox') },
    renderer: 'Apple M2',
    expected: { os: 'macos', arch: 'arm64' }
  },
  {
    name: 'Safari on a Mac',
    navigator: { userAgent: SAFARI_MAC, maxTouchPoints: 0 },
    renderer: 'Apple GPU',
    expected: { os: 'macos', arch: 'arm64' }
  },
  { name: 'Safari on an iPad', navigator: { userAgent: SAFARI_MAC, maxTouchPoints: 5 }, expected: undefined },
  {
    name: 'Firefox on Linux ARM',
    navigator: { userAgent: FIREFOX_LINUX_ARM },
    expected: { os: 'linux', arch: 'arm64' }
  },
  { name: 'Firefox on Linux x64', navigator: { userAgent: FIREFOX_LINUX }, expected: { os: 'linux', arch: 'x64' } },
  {
    name: 'Chrome on Linux ARM',
    navigator: chromium(FIREFOX_LINUX, 'Linux', 'arm'),
    expected: { os: 'linux', arch: 'arm64' }
  },
  {
    name: 'Chrome on Android',
    navigator: { userAgent: CHROME_ANDROID, userAgentData: { platform: 'Android', mobile: true } },
    expected: undefined
  },
  { name: 'Safari on an iPhone', navigator: { userAgent: SAFARI_IPHONE }, expected: undefined },
  {
    name: 'Firefox on FreeBSD',
    navigator: { userAgent: 'Mozilla/5.0 (X11; FreeBSD amd64; rv:143.0) Gecko/20100101 Firefox/143.0' },
    expected: undefined
  },
  {
    name: 'Firefox on OpenBSD',
    navigator: { userAgent: 'Mozilla/5.0 (X11; OpenBSD amd64; rv:143.0) Gecko/20100101 Firefox/143.0' },
    expected: undefined
  },
  {
    name: 'Chrome on ChromeOS',
    navigator: {
      userAgent:
        'Mozilla/5.0 (X11; CrOS x86_64 16328.65.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    },
    expected: { os: 'linux', arch: 'x64' }
  },
  {
    name: 'a browser that refuses high-entropy hints',
    navigator: {
      userAgent: CHROME_WINDOWS,
      userAgentData: {
        platform: 'Windows',
        mobile: false,
        getHighEntropyValues: () => Promise.reject(new Error('NotAllowedError'))
      }
    },
    expected: { os: 'windows', arch: 'x64' }
  }
];

for (const { name, navigator, renderer, expected } of cases) {
  test(`detects ${name}`, async () => {
    expect(await detectInstallPlatform({ navigator, readRenderer: () => renderer })).toEqual(expected);
  });
}
