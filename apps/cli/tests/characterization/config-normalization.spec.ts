import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { globalStateManager } from '@application-services/global-state-manager';
import { ConfigManager, configManager } from '@domain-services/config-manager';
import {
  getNestedResourceIdentity,
  type NormalizedResource
} from '@domain-services/config-manager/normalized-resource';
import {
  DEFAULT_TEST_LISTENER_PORT,
  transformLoadBalancerToListenerForm
} from '@domain-services/config-manager/utils/application-load-balancers';
import { validateAwsCdkConstructProps } from '@domain-services/config-manager/utils/validation';
import type { StacktapeConfig } from '@stacktape/config';

/**
 * Normalization is the step between the configuration a user authors and the resources the CLI works with: authored
 * properties are raised to the top level and joined by the identity `ConfigManager` constructs, then per-type defaults
 * are merged in. These are the guarantees that step makes — and, just as importantly, the ones it does not.
 */

const configWith = (resources: StacktapeConfig['resources']): StacktapeConfig => ({ resources });

const managerFor = (resources: StacktapeConfig['resources']) => {
  const manager = new ConfigManager();
  manager.config = configWith(resources);
  return manager;
};

const originalTargetStack = globalStateManager.targetStack;
const originalSingletonConfig = configManager.config;
let installedRegionShadow = false;

beforeAll(() => {
  globalStateManager.targetStack = {
    stackName: 'normalization-test',
    globallyUniqueStackHash: 'xxxxxxxx',
    stage: 'test',
    projectName: 'normalization',
    projectId: 'normalization-project'
  };
  // The composite web getters below read `region`, and `GlobalStateManager` is decorated with `memoizeGetters`: the
  // first read caches both `args` and `region` as non-configurable own properties that nothing can remove. Shadowing
  // `region` with a configurable own value stops that getter from ever running here. If something has already
  // memoized it the shadow is neither needed nor permitted, so it is only installed when no own property exists —
  // these tests depend on not causing that first read themselves, never on the region's value. Inspecting and
  // defining are synchronous, so nothing can memoize between the two.
  if (!Object.getOwnPropertyDescriptor(globalStateManager, 'region')) {
    Object.defineProperty(globalStateManager, 'region', { value: 'eu-west-1', configurable: true });
    installedRegionShadow = true;
  }
});

afterAll(() => {
  globalStateManager.targetStack = originalTargetStack;
  configManager.config = originalSingletonConfig;
  // Only ever remove this suite's own shadow; a descriptor another suite left behind is not this suite's to touch.
  if (installedRegionShadow) {
    Reflect.deleteProperty(globalStateManager, 'region');
    installedRegionShadow = false;
  }
});

describe('authored-to-runtime normalization', () => {
  test('raises authored properties to the top level and adds the constructed identity', () => {
    const manager = managerFor({
      worker: {
        type: 'function',
        properties: {
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } }
        }
      }
    });

    const [worker] = manager.functions;

    expect(worker.name).toBe('worker');
    expect(worker.type).toBe('function');
    expect(worker.nameChain).toEqual(['worker']);
    expect(worker.configParentResourceType).toBe('function');
    expect(worker.packaging).toEqual({
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: './src/handler.ts' }
    });
  });

  test('merges the current per-type defaults without inventing others', () => {
    const manager = managerFor({
      worker: {
        type: 'function',
        properties: {
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } }
        }
      }
    });

    const [worker] = manager.functions;

    expect(worker.memory).toBe(1024);
    expect(worker.timeout).toBe(20);
    expect(worker.events).toEqual([]);
  });

  test('keeps an explicitly authored value in place of the default', () => {
    const manager = managerFor({
      worker: {
        type: 'function',
        properties: {
          memory: 512,
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } }
        }
      }
    });

    expect(manager.functions[0].memory).toBe(512);
  });

  test('builds the resolved Lambda identity the rest of the CLI addresses functions by', () => {
    const manager = managerFor({
      worker: {
        type: 'function',
        properties: {
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } }
        }
      }
    });

    const [worker] = manager.functions;

    expect(worker.artifactName).toBe('worker');
    expect(worker.cfLogicalName).toBe('WorkerFunction');
    expect(worker.resourceName).toBe('normalization-test-worker');
    expect(worker.handler).toBeTruthy();
  });

  test('does not write the merged defaults back into the authored configuration', () => {
    const manager = managerFor({
      worker: {
        type: 'function',
        properties: {
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } }
        }
      }
    });

    expect(manager.functions[0].memory).toBe(1024);
    expect(manager.config.resources.worker.properties).not.toHaveProperty('memory');
    expect(manager.config.resources.worker.properties).not.toHaveProperty('timeout');
  });

  test('selects only the requested resource type', () => {
    const manager = managerFor({
      worker: {
        type: 'function',
        properties: {
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } }
        }
      },
      records: {
        type: 'dynamo-db-table',
        properties: { primaryKey: { partitionKey: { name: 'id', type: 'string' } } }
      },
      lb: { type: 'application-load-balancer' }
    });

    expect(manager.dynamoDbTables.map(({ name }) => name)).toEqual(['records']);
    expect(manager.functions.map(({ name }) => name)).toEqual(['worker']);
    expect(manager.applicationLoadBalancers.map(({ name }) => name)).toEqual(['lb']);
  });

  test('leaves properties the user omitted absent rather than filling them in', () => {
    const manager = managerFor({ lb: { type: 'application-load-balancer' } });

    const [loadBalancer] = manager.applicationLoadBalancers;

    expect(loadBalancer.name).toBe('lb');
    expect(loadBalancer).not.toHaveProperty('listeners');
    expect(loadBalancer).not.toHaveProperty('interface');
  });

  test('converts custom domains written as bare strings into domain configurations', () => {
    const manager = managerFor({
      lb: { type: 'application-load-balancer', properties: { customDomains: ['API.Example.com'] } }
    });

    expect(manager.applicationLoadBalancers[0].customDomains).toEqual([{ domainName: 'api.example.com' }]);
  });

  test('leaves custom domains already written as configurations in that form', () => {
    const manager = managerFor({
      lb: {
        type: 'application-load-balancer',
        properties: { customDomains: [{ domainName: 'api.example.com', disableDnsRecordCreation: true }] }
      }
    });

    expect(manager.applicationLoadBalancers[0].customDomains).toEqual([
      { domainName: 'api.example.com', disableDnsRecordCreation: true }
    ]);
  });

  test('adds nothing beyond the authored properties, the identity and the type defaults', () => {
    // Every application load balancer property is optional, so a definition that authors none isolates exactly what
    // normalization contributes on its own.
    const manager = managerFor({ lb: { type: 'application-load-balancer' } });

    expect(Object.keys(manager.applicationLoadBalancers[0]).sort()).toEqual([
      'configParentResourceType',
      'customDomains',
      'name',
      'nameChain',
      'overrides',
      'type'
    ]);
  });

  test('returns identity only for a property-less aws-cdk-construct rather than inventing an entryfilePath', () => {
    // `AwsCdkConstruct.properties` is optional even though `entryfilePath` is required inside it, so this is a legal
    // authored configuration that normalization cannot complete. Reporting it belongs to validation and to the
    // resolver, not here.
    const manager = managerFor({ construct: { type: 'aws-cdk-construct' } });

    const [construct] = manager.awsCdkConstructs;

    expect(construct.name).toBe('construct');
    expect(construct.type).toBe('aws-cdk-construct');
    expect(construct.nameChain).toEqual(['construct']);
    expect(construct).not.toHaveProperty('entryfilePath');
  });

  test('returns identity only for a property-less web-app-firewall rather than inventing a scope', () => {
    const manager = managerFor({ firewall: { type: 'web-app-firewall' } });

    const [firewall] = manager.webAppFirewalls;

    expect(firewall.name).toBe('firewall');
    expect(firewall.type).toBe('web-app-firewall');
    expect(firewall.nameChain).toEqual(['firewall']);
    expect(firewall).not.toHaveProperty('scope');
  });

  test('passes the required inner properties through once those resources author them', () => {
    const manager = managerFor({
      construct: { type: 'aws-cdk-construct', properties: { entryfilePath: './src/construct.ts' } },
      firewall: { type: 'web-app-firewall', properties: { scope: 'regional' } }
    });

    expect(manager.awsCdkConstructs[0].entryfilePath).toBe('./src/construct.ts');
    expect(manager.webAppFirewalls[0].scope).toBe('regional');
  });

  test('carries an authored property through unchanged rather than reinterpreting it', () => {
    const manager = managerFor({
      lb: { type: 'application-load-balancer', properties: { interface: 'internal' } }
    });

    expect(manager.applicationLoadBalancers[0].interface).toBe('internal');
  });
});

describe('load balancer listener normalization', () => {
  const withSingletonConfig = <TResult>(resources: StacktapeConfig['resources'], run: () => TResult): TResult => {
    // `transformLoadBalancerToListenerForm` looks up container workloads on the shared manager to decide whether a
    // blue/green test listener is needed, so the fixture has to be visible there.
    configManager.config = configWith(resources);
    try {
      return run();
    } finally {
      configManager.config = originalSingletonConfig;
    }
  };

  test('supplies the default HTTP redirect and HTTPS listeners when none were authored', () => {
    const listeners = withSingletonConfig(
      { lb: { type: 'application-load-balancer' } },
      () => transformLoadBalancerToListenerForm({ definition: configManager.applicationLoadBalancers[0] }).listeners
    );

    expect(listeners).toEqual([
      {
        port: 80,
        protocol: 'HTTP',
        defaultAction: { type: 'redirect', properties: { statusCode: 'HTTP_301', protocol: 'HTTPS' } }
      },
      { port: 443, protocol: 'HTTPS' }
    ]);
  });

  test('returns an authored listener set untouched', () => {
    const { definition, transformed } = withSingletonConfig(
      { lb: { type: 'application-load-balancer', properties: { listeners: [{ port: 8443, protocol: 'HTTPS' }] } } },
      () => {
        const loadBalancer = configManager.applicationLoadBalancers[0];
        const listenerForm: StpApplicationLoadBalancer = transformLoadBalancerToListenerForm({
          definition: loadBalancer
        });
        return { definition: loadBalancer, transformed: listenerForm };
      }
    );

    expect(transformed).toBe(definition);
    expect(transformed.listeners).toEqual([{ port: 8443, protocol: 'HTTPS' }]);
  });

  test('does not add a test listener when no workload requires one', () => {
    const listeners = withSingletonConfig(
      { lb: { type: 'application-load-balancer' } },
      () => transformLoadBalancerToListenerForm({ definition: configManager.applicationLoadBalancers[0] }).listeners
    );

    expect(listeners.map(({ port }) => port)).not.toContain(DEFAULT_TEST_LISTENER_PORT);
  });

  test('adds the blue/green test listener when a workload behind it shifts traffic gradually', () => {
    const listeners = withSingletonConfig(
      {
        lb: { type: 'application-load-balancer' },
        api: {
          type: 'multi-container-workload',
          properties: {
            resources: { cpu: 0.25, memory: 512 },
            deployment: { strategy: 'Canary10Percent5Minutes', beforeAllowTrafficFunction: 'smokeTest' },
            containers: [
              {
                name: 'api-container',
                packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: './src/api.ts' } },
                events: [
                  {
                    type: 'application-load-balancer',
                    properties: { loadBalancerName: 'lb', containerPort: 3000, priority: 1 }
                  }
                ]
              }
            ]
          }
        }
      },
      () => transformLoadBalancerToListenerForm({ definition: configManager.applicationLoadBalancers[0] }).listeners
    );

    expect(listeners.map(({ port }) => port)).toEqual([80, 443, DEFAULT_TEST_LISTENER_PORT]);
    expect(listeners.at(-1)).toEqual({ port: DEFAULT_TEST_LISTENER_PORT, protocol: 'HTTPS' });
  });

  test('still reports a broken load balancer reference when the listeners were authored', () => {
    // The traversal that decides whether a test listener is needed runs before the authored-listeners early return,
    // so a workload pointing at a load balancer that does not exist is reported either way. Moving that lookup into
    // the defaulting branch would silently accept the broken reference.
    const runTransform = () =>
      withSingletonConfig(
        {
          lb: { type: 'application-load-balancer', properties: { listeners: [{ port: 8443, protocol: 'HTTPS' }] } },
          api: {
            type: 'multi-container-workload',
            properties: {
              resources: { cpu: 0.25, memory: 512 },
              deployment: { strategy: 'Canary10Percent5Minutes', beforeAllowTrafficFunction: 'smokeTest' },
              containers: [
                {
                  name: 'api-container',
                  packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: './src/api.ts' } },
                  events: [
                    {
                      type: 'application-load-balancer',
                      properties: { loadBalancerName: 'missingLb', containerPort: 3000, priority: 1 }
                    }
                  ]
                }
              ]
            }
          }
        },
        () => transformLoadBalancerToListenerForm({ definition: configManager.applicationLoadBalancers[0] })
      );

    expect(runTransform).toThrow();
  });
});

describe('reporting a property-less aws-cdk-construct', () => {
  test('names the configuration property rather than a command line flag', () => {
    // `entryfilePath` is authored under the resource's `properties`; rendering it as `--entryfilePath` would send
    // users looking for a CLI flag that does not exist.
    const validate = () =>
      validateAwsCdkConstructProps({
        construct: {
          name: 'construct',
          type: 'aws-cdk-construct',
          nameChain: ['construct'],
          configParentResourceType: 'aws-cdk-construct'
        }
      });

    expect(validate).toThrow('properties.entryfilePath');
    try {
      validate();
    } catch (error) {
      expect((error as Error).message).not.toContain('--entryfilePath');
    }
  });
});

describe('configuration reset', () => {
  test('drops the transforms declared by the configuration being replaced', () => {
    const manager = managerFor({});
    manager.transforms = { WorkerFunction: (props) => props };
    manager.finalTransform = (template) => template;

    manager.reset();

    // `init` only reassigns these for a defineConfig-style TypeScript config, so a later YAML configuration would
    // otherwise keep applying the previous one's transforms.
    expect(manager.transforms).toEqual({});
    expect(manager.finalTransform).toBeNull();
  });
});

describe('normalized resource types', () => {
  // These declarations are the type-level half of the contract above: they are checked by `pnpm --filter
  // @stacktape/cli run typecheck`, which includes this project.

  // Authored optionals stay optional: only the identity and the properties the user must author are required.
  const lambdaWithoutOptionalProperties: NormalizedResource<'function'> = {
    name: 'worker',
    type: 'function',
    nameChain: ['worker'],
    configParentResourceType: 'function',
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/handler.ts' } }
  };

  // Every application load balancer property is optional, so identity alone is a complete normalized load balancer.
  const loadBalancerWithoutAnyProperties: NormalizedResource<'application-load-balancer'> = {
    name: 'lb',
    type: 'application-load-balancer',
    nameChain: ['lb'],
    configParentResourceType: 'application-load-balancer'
  };

  const nestedLoadBalancer: NormalizedResource<'application-load-balancer', 'convex'> = {
    name: 'backend.loadBalancer',
    type: 'application-load-balancer',
    nameChain: ['backend', 'loadBalancer'],
    configParentResourceType: 'convex'
  };

  // Identity is constructed for every resource, so it is never optional.
  // @ts-expect-error `name` is missing
  const missingIdentity: NormalizedResource<'application-load-balancer'> = {
    type: 'application-load-balancer',
    nameChain: ['lb'],
    configParentResourceType: 'application-load-balancer'
  };

  // Selecting one type does not admit another's properties.
  const mismatchedProperties: NormalizedResource<'application-load-balancer'> = {
    name: 'lb',
    type: 'application-load-balancer',
    nameChain: ['lb'],
    configParentResourceType: 'application-load-balancer',
    // @ts-expect-error `primaryKey` belongs to a dynamo-db-table, not a load balancer
    primaryKey: { partitionKey: { name: 'id', type: 'string' } }
  };

  // A resource whose whole `properties` bag is optional may omit it, so flattening cannot promise the members that
  // would have been required had the bag been there. Identity alone has to be a complete normalized resource for
  // these two, even though `entryfilePath` and `scope` are required inside their bags.
  const constructWithoutItsOptionalBag: NormalizedResource<'aws-cdk-construct'> = {
    name: 'construct',
    type: 'aws-cdk-construct',
    nameChain: ['construct'],
    configParentResourceType: 'aws-cdk-construct'
  };
  const firewallWithoutItsOptionalBag: NormalizedResource<'web-app-firewall'> = {
    name: 'firewall',
    type: 'web-app-firewall',
    nameChain: ['firewall'],
    configParentResourceType: 'web-app-firewall'
  };

  // Authoring them still typechecks, and the values keep their authored types.
  const constructWithItsBag: NormalizedResource<'aws-cdk-construct'> = {
    ...constructWithoutItsOptionalBag,
    entryfilePath: './src/construct.ts'
  };
  const firewallWithItsBag: NormalizedResource<'web-app-firewall'> = {
    ...firewallWithoutItsOptionalBag,
    scope: 'regional'
  };

  const firewallWithAnUnknownScope: NormalizedResource<'web-app-firewall'> = {
    ...firewallWithoutItsOptionalBag,
    // @ts-expect-error `scope` only accepts the authored literals
    scope: 'global'
  };

  // Authored requiredness is carried through wherever the bag itself is required, neither added to nor relaxed: a
  // container workload must author its containers and compute resources, exactly as the authored schema demands.
  // @ts-expect-error `containers` and `resources` are required by the authored schema
  const workloadMissingAuthoredRequirements: NormalizedResource<'multi-container-workload'> = {
    name: 'api',
    type: 'multi-container-workload',
    nameChain: ['api'],
    configParentResourceType: 'multi-container-workload',
    scaling: { minInstances: 1 }
  };

  // Regression guard for the alias this slice repaired: `application-load-balancer` is the one resource whose
  // `properties` bag is optional and which projects through `Omit`, which used to erase every authored member and
  // leave `StpApplicationLoadBalancer` structurally empty.
  const authoredMemberSurvivesTheAlias: StpApplicationLoadBalancer['listeners'] = [{ port: 443, protocol: 'HTTPS' }];

  test('type-level expectations above compile', () => {
    expect(lambdaWithoutOptionalProperties.name).toBe('worker');
    expect(loadBalancerWithoutAnyProperties.name).toBe('lb');
    expect(nestedLoadBalancer.configParentResourceType).toBe('convex');
    expect(missingIdentity.type).toBe('application-load-balancer');
    expect(mismatchedProperties.name).toBe('lb');
    expect(workloadMissingAuthoredRequirements.name).toBe('api');
    expect(constructWithoutItsOptionalBag).not.toHaveProperty('entryfilePath');
    expect(firewallWithoutItsOptionalBag).not.toHaveProperty('scope');
    expect(constructWithItsBag.entryfilePath).toBe('./src/construct.ts');
    expect(firewallWithItsBag.scope).toBe('regional');
    expect(firewallWithAnUnknownScope.name).toBe('firewall');
    expect(authoredMemberSurvivesTheAlias).toHaveLength(1);
  });
});

describe('nested resource identity', () => {
  // Composite web resources synthesize children of their own, and each child needs an identity before anything can
  // reference it: the chain it sits under, the dotted name a configuration references it by, and the Stacktape name
  // its physical and logical names derive from.

  test('extends the parent chain and derives the dotted and Stacktape names from it', () => {
    expect(getNestedResourceIdentity({ nameChain: ['site'], type: 'astro-web' }, 'serverFunction')).toEqual({
      nameChain: ['site', 'serverFunction'],
      stpReferenceableName: 'site.serverFunction',
      stpResourceName: 'siteServerFunction'
    });
  });

  test('keeps capitalising every segment for a chain that is already nested', () => {
    expect(getNestedResourceIdentity({ nameChain: ['site', 'inner'], type: 'astro-web' }, 'serverFunction')).toEqual({
      nameChain: ['site', 'inner', 'serverFunction'],
      stpReferenceableName: 'site.inner.serverFunction',
      stpResourceName: 'siteInnerServerFunction'
    });
  });

  test('drops the child segment only for the parent families held on their original names', () => {
    // `web-service` and its siblings name endpoint-like children after the parent alone. That is a compatibility
    // rule, not a formatting one: renaming these would replace deployed load balancers and gateways.
    expect(getNestedResourceIdentity({ nameChain: ['api'], type: 'web-service' }, 'loadBalancer')).toEqual({
      nameChain: ['api', 'loadBalancer'],
      stpReferenceableName: 'api.loadBalancer',
      stpResourceName: 'api'
    });
    expect(getNestedResourceIdentity({ nameChain: ['api'], type: 'nextjs-web' }, 'bucket').stpResourceName).toBe(
      'apiBucket'
    );
  });

  /**
   * Throws rather than narrowing: a child declared optional on the parent is genuinely absent for some
   * configurations, so a test that expects one has to say which configuration it expected it from.
   */
  const nestedResource = <TResource>(resource: TResource | undefined, description: string): TResource => {
    if (!resource) {
      throw new Error(`Expected this configuration to synthesize ${description}, but it was absent.`);
    }
    return resource;
  };

  const expectSsrFamilyIdentities = (nestedResources: {
    bucket: { name: string; nameChain: string[] };
    serverFunction: { name: string; nameChain: string[] };
  }) => {
    expect(Object.keys(nestedResources).sort()).toEqual(['bucket', 'serverFunction']);
    expect(nestedResources.bucket.name).toBe('siteBucket');
    expect(nestedResources.bucket.nameChain).toEqual(['site', 'bucket']);
    expect(nestedResources.serverFunction.name).toBe('siteServerFunction');
    expect(nestedResources.serverFunction.nameChain).toEqual(['site', 'serverFunction']);
  };

  test('gives every SSR family exactly a bucket and a server function, identically named', () => {
    const appDirectory = './';

    expectSsrFamilyIdentities(
      managerFor({ site: { type: 'astro-web', properties: { appDirectory } } }).astroWebs[0]._nestedResources
    );
    expectSsrFamilyIdentities(
      managerFor({ site: { type: 'nuxt-web', properties: { appDirectory } } }).nuxtWebs[0]._nestedResources
    );
    expectSsrFamilyIdentities(
      managerFor({ site: { type: 'sveltekit-web', properties: { appDirectory } } }).sveltekitWebs[0]._nestedResources
    );
    expectSsrFamilyIdentities(
      managerFor({ site: { type: 'solidstart-web', properties: { appDirectory } } }).solidstartWebs[0]._nestedResources
    );
    expectSsrFamilyIdentities(
      managerFor({ site: { type: 'tanstack-web', properties: { appDirectory } } }).tanstackWebs[0]._nestedResources
    );
    expectSsrFamilyIdentities(
      managerFor({ site: { type: 'remix-web', properties: { appDirectory } } }).remixWebs[0]._nestedResources
    );
  });

  const nextjsNestedResources = (properties: {
    appDirectory: string;
    useEdgeLambda?: boolean;
    warmServerInstances?: number;
  }) => managerFor({ site: { type: 'nextjs-web', properties } }).nextjsWebs[0]._nestedResources;

  test('builds every one of the nine children a Next.js web brings with it', () => {
    expect(Object.keys(nextjsNestedResources({ appDirectory: './' })).sort()).toEqual([
      'bucket',
      'imageFunction',
      'revalidationFunction',
      'revalidationInsertFunction',
      'revalidationQueue',
      'revalidationTable',
      'serverEdgeFunction',
      'serverFunction',
      'warmerFunction'
    ]);
  });

  test('names each unconditional child after the parent and the identifier it is filed under', () => {
    const nested = nextjsNestedResources({ appDirectory: './' });

    expect(nested.bucket.name).toBe('siteBucket');
    expect(nested.bucket.nameChain).toEqual(['site', 'bucket']);
    expect(nested.imageFunction.name).toBe('siteImageFunction');
    expect(nested.imageFunction.nameChain).toEqual(['site', 'imageFunction']);
    expect(nested.revalidationFunction.name).toBe('siteRevalidationFunction');
    expect(nested.revalidationFunction.nameChain).toEqual(['site', 'revalidationFunction']);
    expect(nested.revalidationQueue.name).toBe('siteRevalidationQueue');
    expect(nested.revalidationQueue.nameChain).toEqual(['site', 'revalidationQueue']);
    expect(nested.revalidationTable.name).toBe('siteRevalidationTable');
    expect(nested.revalidationTable.nameChain).toEqual(['site', 'revalidationTable']);
    expect(nested.revalidationInsertFunction.name).toBe('siteRevalidationInsertFunction');
    expect(nested.revalidationInsertFunction.nameChain).toEqual(['site', 'revalidationInsertFunction']);
  });

  test('runs the server in a Lambda by default, named from the same identity', () => {
    const nested = nextjsNestedResources({ appDirectory: './' });
    const serverFunction = nestedResource(nested.serverFunction, 'a server function');

    expect(serverFunction.name).toBe('siteServerFunction');
    expect(serverFunction.nameChain).toEqual(['site', 'serverFunction']);
    expect(serverFunction.connectTo).toEqual(['site.bucket', 'site.revalidationQueue', 'site.revalidationTable']);
  });

  test('moves the server to an edge function when the configuration asks for one', () => {
    const nested = nextjsNestedResources({ appDirectory: './', useEdgeLambda: true });
    const serverEdgeFunction = nestedResource(nested.serverEdgeFunction, 'a server edge function');

    expect(serverEdgeFunction.name).toBe('siteServerEdgeFunction');
    expect(serverEdgeFunction.nameChain).toEqual(['site', 'serverEdgeFunction']);
  });

  test('adds a warmer when the configuration asks for warm server instances', () => {
    const nested = nextjsNestedResources({ appDirectory: './', warmServerInstances: 2 });
    const warmerFunction = nestedResource(nested.warmerFunction, 'a warmer function');

    expect(warmerFunction.name).toBe('siteWarmerFunction');
    expect(warmerFunction.nameChain).toEqual(['site', 'warmerFunction']);
  });
});
