import { IS_DEV } from './random';

export const STACKTAPE_PRODUCTION_TRPC_API_ENDPOINT = 'https://api.stacktape.com';
export const STACKTAPE_DEVELOPMENT_TRPC_API_ENDPOINT = 'https://dev-api.stacktape.com';

export const STACKTAPE_TRPC_API_ENDPOINT =
  process.env.STP_CUSTOM_TRPC_API_ENDPOINT ||
  (IS_DEV ? STACKTAPE_DEVELOPMENT_TRPC_API_ENDPOINT : STACKTAPE_PRODUCTION_TRPC_API_ENDPOINT);
