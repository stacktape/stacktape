/*
 * The configuration the isometric diagram draws.
 *
 * This is the object the wizard would have composed for `acme-project`: the same six resources the
 * Console lists, written the way the real thing writes them. The diagram derives everything else —
 * the VPC, the subnet tiers, the per-service ingress, the CloudFront/server-Lambda/assets-bucket
 * expansion of the Next.js web — from these declarations, which is the whole point of showing it.
 * Adding a resource here changes the picture the way adding one to a real config would.
 *
 * It is deliberately a plain literal rather than YAML parsed at build time: the diagram takes a
 * parsed config, and a literal is the parsed form. `satisfies` is not used because the authored
 * schema is far wider than this excerpt and the cast to `StacktapeConfig` happens at the call site,
 * exactly as the wizard does it.
 */
export const ACME_DIAGRAM_CONFIG = {
  resources: {
    // An SSR web. The diagram expands it into CDN → server Lambda → assets bucket, and the edges
    // below start at the server Lambda rather than at the CDN.
    web: {
      type: 'nextjs-web',
      properties: {
        appDirectory: './web',
        connectTo: ['apiService']
      }
    },
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
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: { entryfilePath: 'api/src/worker.ts' }
        },
        connectTo: ['mainDatabase']
      }
    },
    // `accessibilityMode: vpc` is what puts the database in the private tier and, in the wizard's
    // Review band, what the "reachable only from this private network" decision refers to.
    mainDatabase: {
      type: 'relational-database',
      properties: {
        engine: {
          type: 'aurora-postgresql',
          properties: { version: '16.4', port: 5432 }
        },
        accessibility: { accessibilityMode: 'vpc' }
      }
    },
    cache: {
      type: 'redis-cluster',
      properties: {
        engine: { type: 'redis7' },
        instanceSize: 'cache.t3.micro'
      }
    },
    firewall: {
      type: 'web-app-firewall',
      properties: { scope: 'cloudfront' }
    }
  }
};
