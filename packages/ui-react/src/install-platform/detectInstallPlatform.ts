export type InstallOs = 'macos' | 'linux' | 'windows';
export type InstallArch = 'x64' | 'arm64';
export type InstallPlatform = { os: InstallOs; arch: InstallArch };

type HighEntropyValues = { architecture?: string; bitness?: string };

/** The parts of `navigator` the detection reads. User-Agent Client Hints exist only in Chromium browsers. */
export type InstallPlatformNavigator = {
  userAgent: string;
  maxTouchPoints?: number;
  userAgentData?: {
    platform?: string;
    mobile?: boolean;
    getHighEntropyValues?: (hints: string[]) => Promise<HighEntropyValues>;
  };
};

/** The architecture a Mac runs when nothing says otherwise: every Mac sold since 2023 is Apple silicon. */
const DEFAULT_ARCH: Record<InstallOs, InstallArch> = { macos: 'arm64', linux: 'x64', windows: 'x64' };

const detectOs = (navigator: InstallPlatformNavigator): InstallOs | undefined => {
  const hinted = navigator.userAgentData?.platform;
  if (navigator.userAgentData?.mobile) return undefined;
  if (hinted === 'Windows') return 'windows';
  if (hinted === 'macOS') return 'macos';
  if (hinted === 'Linux' || hinted === 'Chrome OS') return 'linux';
  if (hinted) return undefined;

  const { userAgent } = navigator;
  if (/Android|iPhone|iPad|iPod/.test(userAgent)) return undefined;
  if (/Windows NT/.test(userAgent)) return 'windows';
  // iPadOS presents a desktop Safari user agent; only a touch screen tells it from a Mac.
  if (/Macintosh|Mac OS X/.test(userAgent)) return (navigator.maxTouchPoints ?? 0) > 1 ? undefined : 'macos';
  if (/Linux|X11|CrOS/.test(userAgent)) return 'linux';
  return undefined;
};

const archFromHints = async (navigator: InstallPlatformNavigator): Promise<InstallArch | undefined> => {
  try {
    const { architecture } = (await navigator.userAgentData?.getHighEntropyValues?.(['architecture', 'bitness'])) ?? {};
    if (architecture === 'arm') return 'arm64';
    if (architecture === 'x86') return 'x64';
  } catch {
    // A browser may refuse high-entropy hints; the user agent and the GPU are the fallbacks.
  }
  return undefined;
};

const archFromUserAgent = (userAgent: string): InstallArch | undefined => {
  if (/aarch64|arm64|armv8/i.test(userAgent)) return 'arm64';
  if (/x86_64|x86-64|Win64|WOW64|amd64/i.test(userAgent)) return 'x64';
  return undefined;
};

/**
 * Safari and Firefox on a Mac always say "Intel Mac OS X". Chromium and Firefox name the GPU: an Apple M-series GPU
 * means Apple silicon and an Intel, AMD or NVIDIA one means an Intel Mac. Safari reports only "Apple GPU", which says
 * nothing.
 */
const archFromMacRenderer = (renderer: string | undefined): InstallArch | undefined => {
  if (!renderer || /Apple GPU/.test(renderer)) return undefined;
  if (/Apple/.test(renderer)) return 'arm64';
  if (/Intel|AMD|Radeon|NVIDIA/i.test(renderer)) return 'x64';
  return undefined;
};

export const readWebGlRenderer = (): string | undefined => {
  try {
    const context = document.createElement('canvas').getContext('webgl');
    const extension = context?.getExtension('WEBGL_debug_renderer_info');
    const renderer: unknown = extension && context?.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === 'string' ? renderer : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The operating system and CPU architecture whose Stacktape installer this browser's machine needs, or `undefined`
 * on a phone, a tablet or an unknown system. Runs in the browser only, after hydration.
 *
 * Chromium browsers answer through User-Agent Client Hints, including Windows on ARM. Other browsers fall back to the
 * user agent, which names ARM on Linux but not on Windows (Firefox on Windows ARM reports x64), and on a Mac to the GPU.
 * When nothing names the architecture, it is the operating system's common one: x64, or Apple silicon on a Mac.
 */
export const detectInstallPlatform = async ({
  navigator = globalThis.navigator,
  readRenderer = readWebGlRenderer
}: {
  navigator?: InstallPlatformNavigator;
  readRenderer?: () => string | undefined;
} = {}): Promise<InstallPlatform | undefined> => {
  if (!navigator) return undefined;
  const os = detectOs(navigator);
  if (!os) return undefined;
  const arch =
    (await archFromHints(navigator)) ??
    (os === 'macos' ? archFromMacRenderer(readRenderer()) : archFromUserAgent(navigator.userAgent)) ??
    DEFAULT_ARCH[os];
  return { os, arch };
};
