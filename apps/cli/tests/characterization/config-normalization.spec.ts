import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { RESOURCE_DEFAULTS } from '@config';
import { globalStateManager } from '@application-services/global-state-manager';
import { ConfigManager, configManager } from '@domain-services/config-manager';
import {
  getNestedResourceIdentity,
  type DefaultedResource,
  type NormalizedResource,
  type StacktapeResourceType
} from '@domain-services/config-manager/normalized-resource';
import {
  DEFAULT_TEST_LISTENER_PORT,
  transformLoadBalancerToListenerForm
} from '@domain-services/config-manager/utils/application-load-balancers';
import { validateMultiContainerWorkloadConfig } from '@domain-services/config-manager/utils/multi-container-workloads';
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

  test('merges the smaller edge-function defaults rather than the ordinary Lambda ones', () => {
    const manager = managerFor({
      rewrite: {
        type: 'edge-lambda-function',
        properties: {
          packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/rewrite.ts' } }
        }
      }
    });

    const [rewrite] = manager.edgeLambdaFunctions;

    expect(rewrite.memory).toBe(128);
    expect(rewrite.timeout).toBe(3);
  });

  test('merges the bastion instance size, and yields to an authored one', () => {
    expect(managerFor({ jump: { type: 'bastion' } }).bastions[0].instanceSize).toBe('t3.micro');
    expect(
      managerFor({ jump: { type: 'bastion', properties: { instanceSize: 't3.large' } } }).bastions[0].instanceSize
    ).toBe('t3.large');
  });

  const workloadConfig = (scaling?: {
    minInstances?: number;
    maxInstances?: number;
  }): StacktapeConfig['resources'] => ({
    api: {
      type: 'multi-container-workload',
      properties: {
        resources: { cpu: 0.25, memory: 512 },
        ...(scaling ? { scaling } : {}),
        containers: [
          {
            name: 'api-container',
            packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: './src/api.ts' } }
          }
        ]
      }
    }
  });

  test('fills the whole nested scaling default when the workload authors none', () => {
    const [workload] = managerFor(workloadConfig()).containerWorkloads;

    expect(workload.scaling).toEqual({
      minInstances: 1,
      maxInstances: 1,
      scalingPolicy: { keepAvgCpuUtilizationUnder: 80, keepAvgMemoryUtilizationUnder: 80 }
    });
  });

  test('keeps an authored nested value and fills only the siblings it omitted', () => {
    const [workload] = managerFor(workloadConfig({ minInstances: 3 })).containerWorkloads;

    expect(workload.scaling.minInstances).toBe(3);
    expect(workload.scaling.maxInstances).toBe(1);
    expect(workload.scaling.scalingPolicy).toEqual({
      keepAvgCpuUtilizationUnder: 80,
      keepAvgMemoryUtilizationUnder: 80
    });
  });

  test('preserves an unsupported authored zero for validation instead of silently rewriting it', () => {
    const manager = managerFor(workloadConfig({ minInstances: 0, maxInstances: 1 }));
    const [workload] = manager.containerWorkloads;

    expect(workload.scaling.minInstances).toBe(0);
    expect(workload.scaling.maxInstances).toBe(1);
    configManager.config = manager.config;
    try {
      expect(() => validateMultiContainerWorkloadConfig({ definition: workload })).toThrow('must both be at least 1');
    } finally {
      configManager.config = originalSingletonConfig;
    }
  });

  test('still fills an explicitly undefined nested property', () => {
    const [workload] = managerFor(workloadConfig({ minInstances: undefined, maxInstances: 1 })).containerWorkloads;

    expect(workload.scaling.minInstances).toBe(1);
    expect(workload.scaling.maxInstances).toBe(1);
  });

  test('passes the service families their own scaling defaults', () => {
    const manager = managerFor({
      jobs: {
        type: 'worker-service',
        properties: {
          resources: { cpu: 0.25, memory: 512 },
          packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: './src/jobs.ts' } }
        }
      }
    });

    const [service] = manager.workerServices;

    const filledScaling = {
      minInstances: 1,
      maxInstances: 1,
      scalingPolicy: { keepAvgCpuUtilizationUnder: 80, keepAvgMemoryUtilizationUnder: 80 }
    };

    expect(service.scaling).toEqual(filledScaling);
    // The workload the service synthesizes is what synthesis actually scales, so it carries the same range. This is
    // the second of the four producers behind the all-producer guarantee on `StpContainerWorkload.scaling`.
    expect(service._nestedResources.containerWorkload.scaling).toEqual(filledScaling);
  });

  test('writes a nested default back into the working configuration when the bag was authored', () => {
    // Recorded behavior debt, pinned rather than changed here: `mergeStacktapeDefaults` copies the resource shallowly,
    // so an authored nested bag is the same object the working resolved configuration holds, and merging into it is
    // visible there afterwards. The raw authored configuration stays isolated — `ConfigResolver` serializes a separate
    // clone — so the uploaded `stp-template.yml` is unaffected.
    const manager = managerFor(workloadConfig({ minInstances: 3 }));

    expect(manager.config.resources.api.properties).not.toHaveProperty('scaling.maxInstances');

    void manager.containerWorkloads;

    expect(manager.config.resources.api.properties).toHaveProperty('scaling.maxInstances', 1);
  });

  test('does not write a nested default back when the bag was not authored', () => {
    // The other half of the same shallow copy: with nothing authored, the merge builds a fresh object on the copy and
    // the working configuration keeps no `scaling` at all.
    const manager = managerFor(workloadConfig());

    void manager.containerWorkloads;

    expect(manager.config.resources.api.properties).not.toHaveProperty('scaling');
  });

  test('never hands out the defaults table itself, and stays stable across reads', () => {
    // A merged nested object that aliased the table would let one resource's later mutation leak into every other
    // stack this process normalizes.
    const manager = managerFor(workloadConfig());

    const [first] = manager.containerWorkloads;
    const [second] = manager.containerWorkloads;

    expect(first.scaling).not.toBe(RESOURCE_DEFAULTS['multi-container-workload'].scaling);
    expect(first.scaling).not.toBe(second.scaling);
    expect(first.scaling).toEqual(second.scaling);
    expect(RESOURCE_DEFAULTS['multi-container-workload'].scaling).toEqual({
      minInstances: 1,
      maxInstances: 1,
      scalingPolicy: { keepAvgCpuUtilizationUnder: 80, keepAvgMemoryUtilizationUnder: 80 }
    });
  });

  test('applies a synthetic container default to every workload container without overriding authored values', () => {
    // The defaults table does not currently use the historical singular `container` shape. Installing one for this
    // test keeps its special merge path characterized without making that shape part of the public defaults type.
    const workloadDefaults = RESOURCE_DEFAULTS['multi-container-workload'] as Record<string, unknown>;
    workloadDefaults.container = { essential: true };

    try {
      const [workload] = managerFor({
        api: {
          type: 'multi-container-workload',
          properties: {
            resources: { cpu: 0.25, memory: 512 },
            containers: [
              {
                name: 'api',
                packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: './src/api.ts' } }
              },
              {
                name: 'worker',
                essential: false,
                packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: './src/worker.ts' } }
              }
            ]
          }
        }
      }).containerWorkloads;

      expect(workload.containers.map(({ essential }) => essential)).toEqual([true, false]);
    } finally {
      delete workloadDefaults.container;
    }
  });

  test('leaves a resource whose type declares no defaults exactly as normalization produced it', () => {
    expect(RESOURCE_DEFAULTS['dynamo-db-table']).toEqual({});

    const manager = managerFor({
      records: {
        type: 'dynamo-db-table',
        properties: { primaryKey: { partitionKey: { name: 'id', type: 'string' } } }
      }
    });

    expect(Object.keys(manager.dynamoDbTables[0]).sort()).toEqual([
      'configParentResourceType',
      'name',
      'nameChain',
      'overrides',
      'primaryKey',
      'type'
    ]);
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

  /**
   * Whether `TKey` is a required member of `TObject`.
   *
   * Requiredness has to be asserted one key at a time and through the modifier itself. A fixture that simply omits
   * several keys at once stays satisfied when only one of them is still required, and this project's test typecheck
   * runs with `strictNullChecks` off, where an optional property is freely assignable to a required one — so reading
   * a property, or assigning through an indexed access, proves nothing about the modifier here.
   */
  type RequiresKey<TObject, TKey extends keyof TObject> = {} extends Pick<TObject, TKey> ? false : true;

  // The distinction the two names carry, stated per key: what the table fills is optional before defaults and
  // required after, and each default is checked on its own.
  const memoryBeforeDefaults: RequiresKey<NormalizedResource<'function'>, 'memory'> = false;
  const timeoutBeforeDefaults: RequiresKey<NormalizedResource<'function'>, 'timeout'> = false;
  const memoryAfterDefaults: RequiresKey<DefaultedResource<'function'>, 'memory'> = true;
  const timeoutAfterDefaults: RequiresKey<DefaultedResource<'function'>, 'timeout'> = true;

  const lambdaWithItsDefaults: DefaultedResource<'function'> = {
    ...lambdaWithoutOptionalProperties,
    memory: 512,
    timeout: 30
  };
  // ...and changes nothing else: what the authored schema required is still required.
  const packagingIsStillAuthored: DefaultedResource<'function'>['packaging'] = lambdaWithItsDefaults.packaging;

  // Requiredness is all the intersection adds. Each default widens to its authored value type, so an override the
  // schema allows still typechecks; a default narrowed to its own literal would have rejected these.
  const anotherBastionSize: DefaultedResource<'bastion'>['instanceSize'] = 't3.large';
  const anotherLambdaMemory: DefaultedResource<'function'>['memory'] = 3008;
  const anotherInstanceCount: DefaultedResource<'multi-container-workload'>['scaling']['minInstances'] = 4;

  // A resource type whose entry is empty is the same shape either way, in both directions.
  const defaultedFromNormalizedLoadBalancer: DefaultedResource<'application-load-balancer'> =
    loadBalancerWithoutAnyProperties;
  const normalizedFromDefaultedLoadBalancer: NormalizedResource<'application-load-balancer'> =
    defaultedFromNormalizedLoadBalancer;

  // Defaulting does not disturb the authored parent a nested resource was synthesized under.
  const nestedDefaultedLoadBalancer: DefaultedResource<'application-load-balancer', 'convex'> = nestedLoadBalancer;

  // The all-producer container-workload shape. Both ends of the instance range reach this type from every producer,
  // and each is checked on its own so that requiring only one of them would fail here...
  const scalingIsAlwaysPresent: RequiresKey<StpContainerWorkload, 'scaling'> = true;
  const minInstancesIsAlwaysPresent: RequiresKey<StpContainerWorkload['scaling'], 'minInstances'> = true;
  const maxInstancesIsAlwaysPresent: RequiresKey<StpContainerWorkload['scaling'], 'maxInstances'> = true;
  // ...but Convex supplies no policy, so requiring one would describe fewer workloads than actually reach this type.
  const scalingPolicyStaysOptional: RequiresKey<StpContainerWorkload['scaling'], 'scalingPolicy'> = false;
  const convexShapedWorkload: Pick<StpContainerWorkload, 'scaling'> = {
    scaling: { minInstances: 1, maxInstances: 1 }
  };

  // `RESOURCE_DEFAULTS` is keyed by the authored resource union and indexed by it. If the resolved union ever gained a
  // type the authored one lacks, the table would silently stop covering it.
  const authoredCoversResolved: StacktapeResourceType extends StpResourceType ? true : false = true;
  const resolvedCoversAuthored: StpResourceType extends StacktapeResourceType ? true : false = true;

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
    expect(memoryBeforeDefaults).toBe(false);
    expect(timeoutBeforeDefaults).toBe(false);
    expect(memoryAfterDefaults).toBe(true);
    expect(timeoutAfterDefaults).toBe(true);
    expect(lambdaWithItsDefaults.memory).toBe(512);
    expect(packagingIsStillAuthored).toBeTruthy();
    expect(anotherBastionSize).toBe('t3.large');
    expect(anotherLambdaMemory).toBe(3008);
    expect(anotherInstanceCount).toBe(4);
    expect(normalizedFromDefaultedLoadBalancer.name).toBe('lb');
    expect(nestedDefaultedLoadBalancer.configParentResourceType).toBe('convex');
    expect(scalingIsAlwaysPresent).toBe(true);
    expect(minInstancesIsAlwaysPresent).toBe(true);
    expect(maxInstancesIsAlwaysPresent).toBe(true);
    expect(scalingPolicyStaysOptional).toBe(false);
    expect(convexShapedWorkload.scaling.maxInstances).toBe(1);
    expect(authoredCoversResolved).toBe(true);
    expect(resolvedCoversAuthored).toBe(true);
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
