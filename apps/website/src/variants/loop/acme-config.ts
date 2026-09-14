/** The example application as the isometric diagram reads it. Kept apart from `data.ts` so the diagram island ships only this. */
export const ACME_CONFIG = {
  resources: {
    web: { type: 'nextjs-web', properties: { appDirectory: './web', connectTo: ['apiService'] } },
    apiService: {
      type: 'web-service',
      properties: {
        packaging: {
          type: 'custom-dockerfile',
          properties: { buildContextPath: './api', dockerfilePath: './api/Dockerfile' }
        },
        resources: { cpu: 0.5, memory: 1024 },
        scaling: { minInstances: 2, maxInstances: 6 },
        connectTo: ['mainDatabase', 'cache', 'worker']
      }
    },
    worker: {
      type: 'function',
      properties: {
        packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'api/src/worker.ts' } },
        connectTo: ['mainDatabase']
      }
    },
    mainDatabase: {
      type: 'relational-database',
      properties: {
        engine: { type: 'aurora-postgresql', properties: { version: '16.4', port: 5432 } },
        accessibility: { accessibilityMode: 'vpc' }
      }
    },
    cache: { type: 'redis-cluster', properties: { engine: { type: 'redis7' }, instanceSize: 'cache.t3.micro' } },
    firewall: { type: 'web-app-firewall', properties: { scope: 'cloudfront' } }
  }
};
