/** Centralized configuration constants for dev mode */

export const DEV_CONFIG = {
  /** Tunnels through the dev box relay (bore-compatible) */
  tunnels: {
    startupTimeoutMs: 30000,
    /** Reconnect attempts back off by a second each, up to this delay; they continue while dev mode runs. */
    maxReconnectDelayMs: 5000
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
    /**
     * How long a dev server may take from its start until its port accepts connections (ms). One that needs longer is
     * reported as failed, and becomes running once it serves.
     */
    serveTimeoutMs: 120000
  }
} as const;
