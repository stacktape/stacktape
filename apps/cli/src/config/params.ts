import { IS_DEV } from './random';

export const STACKTAPE_PRODUCTION_TRPC_API_ENDPOINT = 'https://api.stacktape.com';
export const STACKTAPE_DEVELOPMENT_TRPC_API_ENDPOINT = 'https://dev-api.stacktape.com';

export const STACKTAPE_TRPC_API_ENDPOINT =
  process.env.STP_CUSTOM_TRPC_API_ENDPOINT ||
  (IS_DEV ? STACKTAPE_DEVELOPMENT_TRPC_API_ENDPOINT : STACKTAPE_PRODUCTION_TRPC_API_ENDPOINT);

const STACKTAPE_PRODUCTION_CONSOLE_URL = 'https://console.stacktape.com';
/** `pnpm dev:console` and `pnpm dev:console:ui` serve the Console UI here; the local API listens on port 3000. */
const LOCAL_CONSOLE_URL = 'http://localhost:4000';

/**
 * The Console that belongs to an API: `api.stacktape.com` is production, `<stage>-api.stacktape.com` is served by
 * `<stage>-console.stacktape.com` (the Console stack names both domains this way), and a loopback API is the local
 * Console. Any other endpoint falls back to production.
 */
export const consoleUrlForApiEndpoint = (apiEndpoint: string): string => {
  let hostname: string;
  try {
    hostname = new URL(apiEndpoint).hostname;
  } catch {
    return STACKTAPE_PRODUCTION_CONSOLE_URL;
  }
  const stage = /^([a-z0-9-]+)-api\.stacktape\.com$/.exec(hostname)?.[1];
  if (stage) return `https://${stage}-console.stacktape.com`;
  if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return LOCAL_CONSOLE_URL;
  return STACKTAPE_PRODUCTION_CONSOLE_URL;
};

/**
 * A Console page on the Console this CLI talks to. `STACKTAPE_CONSOLE_URL` overrides the Console derived from the API
 * endpoint, so links printed while using the dev or a local Console never point at production.
 */
export const stacktapeConsoleUrl = (path = '/'): string => {
  const origin = process.env.STACKTAPE_CONSOLE_URL?.trim() || consoleUrlForApiEndpoint(STACKTAPE_TRPC_API_ENDPOINT);
  return new URL(path, origin).toString();
};

/** The Console page of one stage. */
export const stageConsoleUrl = ({ projectName, stage }: { projectName: string; stage: string }): string =>
  stacktapeConsoleUrl(`/projects/${projectName}/${stage}/overview`);
