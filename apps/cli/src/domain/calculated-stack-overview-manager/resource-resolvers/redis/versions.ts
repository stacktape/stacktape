import type { ValkeyEngineProperties, ValkeyServerlessEngineProperties } from '@stacktape/config/redis';

/** Versions a new cache gets when its config sets none. A deployed cache keeps the version it runs. */
export const LATEST_VALKEY_VERSION: NonNullable<ValkeyEngineProperties['version']> = '9.1';
export const LATEST_VALKEY_SERVERLESS_VERSION: NonNullable<ValkeyServerlessEngineProperties['version']> = '9';
