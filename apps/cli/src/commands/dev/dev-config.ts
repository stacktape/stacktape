/** Centralized configuration constants for dev mode */

/**
 * A bore-compatible TCP relay the user runs themselves (`host` or `host:controlPort`). Bore relays are
 * unauthenticated: anyone who finds a relay port reaches the database behind it. Dev mode therefore never uses a
 * public relay, and deployed Lambda functions reach local databases only through a relay the user configured.
 */
export const getConfiguredTunnelServer = (): string | undefined =>
  process.env.STACKTAPE_TUNNEL_SERVER?.trim() || undefined;

export const DEV_CONFIG = {
  /** Tunnel configuration (bore-compatible TCP relay) */
  tunnels: {
    startupTimeoutMs: 30000,
    retryAttempts: 2,
    retryDelayMs: 2000,
    /** Number of reconnection attempts when a tunnel dies unexpectedly */
    reconnectAttempts: 3,
    /** Delay between reconnection attempts (ms) */
    reconnectDelayMs: 5000
  },

  /** Lambda environment manager configuration */
  lambda: {
    updateRetryAttempts: 3,
    updateRetryDelayMs: 2000,
    updateWaitTimeoutMs: 30000,
    updatePollIntervalMs: 1000
  },

  /** Local resource defaults */
  localResources: {
    /**
     * The fixed password local databases got before each one received a generated password. A data directory
     * initialized with it keeps it, because the database stores the password in its data.
     */
    legacyPassword: 'localdevpassword',
    ports: {
      postgres: 5432,
      mysql: 3306,
      mariadb: 3306,
      redis: 6379,
      dynamodb: 8000,
      opensearch: 9200
    },
    /** Timeouts for waiting for resources to become ready (ms) */
    readyTimeouts: {
      postgres: 30000,
      mysql: 60000,
      mariadb: 60000,
      redis: 30000,
      dynamodb: 30000,
      opensearch: 60000
    },
    /** Poll intervals when checking readiness (ms) */
    pollIntervals: {
      postgres: 500,
      mysql: 1000,
      mariadb: 1000,
      redis: 500,
      dynamodb: 300,
      opensearch: 1000
    },
    /** Health check configuration for ongoing monitoring */
    healthCheck: {
      /** Interval between health checks (ms) */
      intervalMs: 30000,
      /** Number of consecutive failures before marking unhealthy */
      failureThreshold: 2,
      /** Whether to attempt auto-restart on failure */
      autoRestart: true,
      /** Max restart attempts before giving up */
      maxRestartAttempts: 3
    }
  },

  /** Container configuration */
  container: {
    stopWaitTimeSec: 5
  },

  /** Dev server configuration */
  devServer: {
    /** How long to cache port availability results (ms) */
    portCacheTtlMs: 1000,
    /** Timeout for waiting for ready signal from dev server (ms) */
    readyTimeoutMs: 10000,
    /** Delay after ready signal to capture URL and compile time (ms) */
    readyDelayMs: 300
  }
} as const;
