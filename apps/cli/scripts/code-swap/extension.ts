// Qualify Python and several opted-in services through the ordinary public config path.
// Reuses the benchmark's account, ownership, recovery and verified deletion boundary.
import { openSync, closeSync } from 'node:fs';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { randomBytes, createHmac } from 'node:crypto';
import { mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { ECSClient, DescribeServicesCommand, ListTasksCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import {
  guard,
  save,
  invoke,
  cliArgs,
  cleanup,
  getStack,
  listOwnedStackResources,
  clients,
  ACCOUNT,
  REGION,
  PROFILE,
  type State,
  type Owned
} from './run';
import { readLock } from '../../src/domain/code-swap/operation-lock';

const assert: (value: unknown, reason: string) => asserts value = (value, reason) => {
  if (!value) throw new Error(reason);
};
const root = process.env.STP_CODE_SWAP_BENCH_FIXTURES_ROOT ?? '/home/congy/projects/deploy-benchmarks';
const config = { ...clients, requestHandler: new NodeHttpHandler({ connectionTimeout: 10000, requestTimeout: 30000 }) };
const ecs = new ECSClient(config),
  ddb = new DynamoDBClient(config);
const stateIndex = process.argv.indexOf('--state');
const directory = resolve(stateIndex < 0 ? '.stacktape/extension-live' : process.argv[stateIndex + 1]!);
const statePath = join(directory, 'state.json');
const mode = process.argv.includes('--cleanup-only');
const appName =
  process.argv.find((arg) => ['container-python', 'five-services', 'container-node'].includes(arg)) ??
  'container-python';
const services =
  appName === 'five-services'
    ? ['api', 'reporting', 'inventory', 'webhooks', 'notifications']
    : [appName === 'container-node' ? 'node' : 'python'];
const changed = appName === 'five-services' ? ['api', 'reporting', 'notifications'] : services;
const python = appName === 'container-python';
const revisions = Object.fromEntries(services.map((name) => [name, 'baseline']));
type Sample = {
  at: number;
  receivedAt: number;
  service: string;
  status: number;
  revision?: string;
  task?: string;
  awsMs?: number;
  error?: string;
  path?: string;
};
const samples: Sample[] = [];
const results: Record<string, unknown>[] = [];
const sample = async (name: string, url: string): Promise<Sample> => {
  const at = performance.now();
  try {
    const response = await fetch(`${url}/version`, {
      signal: AbortSignal.timeout(4000),
      headers: { 'cache-control': 'no-cache' }
    });
    const body = (await response.json()) as { revision: string };
    const value = {
      at,
      receivedAt: performance.now(),
      service: name,
      status: response.status,
      revision: body.revision,
      task: response.headers.get('x-lab-task') ?? '',
      awsMs: Number(response.headers.get('x-lab-now-ms'))
    };
    samples.push(value);
    return value;
  } catch (error) {
    const value = { at, receivedAt: performance.now(), service: name, status: 0, error: String(error) };
    samples.push(value);
    return value;
  }
};
const fleet = async (owned: Owned): Promise<Record<string, { definition: string; tasks: string[] }>> => {
  const resources = await listOwnedStackResources(owned);
  return Object.fromEntries(
    await Promise.all(
      services.map(async (name) => {
        const service = resources.find(
          (item) => item.LogicalResourceId === cfLogicalNames.ecsService(name, false)
        )!.PhysicalResourceId!;
        const cluster = service.split('/')[1];
        const [description, tasks] = await Promise.all([
          ecs.send(new DescribeServicesCommand({ cluster, services: [service] })),
          ecs.send(new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus: 'RUNNING' }))
        ]);
        return [name, { definition: description.services![0]!.taskDefinition, tasks: tasks.taskArns!.toSorted() }];
      })
    )
  );
};
const edit = async (owned: Owned, value: string, names = changed) => {
  for (const name of names) {
    revisions[name] = value;
    await writeFile(
      join(owned.directory, ...(services.length > 1 ? [name] : []), python ? 'revision.py' : 'revision.mjs'),
      python ? `REVISION = '${value}'\n` : `export const revision = '${value}';\n`
    );
  }
};
const verifyBusiness = async (urls: Record<string, string>) => {
  const manifest = JSON.parse(await readFile(join(root, 'fixtures/manifest.json'), 'utf8'));
  const workloads =
    services.length > 1
      ? manifest.fiveServices.services
      : [manifest.containers.find((item: { id: string }) => item.id === appName)];
  const matches = (actual: unknown, expected: unknown): boolean => {
    if (typeof expected !== 'object' || expected === null) return actual === expected;
    if (Array.isArray(expected))
      return (
        Array.isArray(actual) &&
        actual.length === expected.length &&
        expected.every((item, index) => matches(actual[index], item))
      );
    return (
      actual !== null &&
      typeof actual === 'object' &&
      Object.entries(expected).every(([key, value]) => matches((actual as Record<string, unknown>)[key], value))
    );
  };
  for (const workload of workloads) {
    const name = services.length > 1 ? workload.name : services[0]!;
    const probe = workload.businessProbe;
    const requestBody = probe.body && { ...probe.body };
    if (requestBody?.jobId) requestBody.jobId += `-${Date.now()}`;
    if (probe.sign)
      requestBody[probe.sign] = createHmac('sha256', 'fixture-only-not-a-secret')
        .update(requestBody.payload)
        .digest('hex');
    const expected = { ...probe.expected, ...(probe.expected.jobId && { jobId: requestBody.jobId }) };
    const at = performance.now();
    const response = await fetch(`${urls[name]}${probe.path}`, {
      method: probe.method,
      headers: { 'content-type': 'application/json' },
      ...(requestBody && { body: JSON.stringify(requestBody) }),
      signal: AbortSignal.timeout(10000)
    });
    const body = (await response.json()) as { revision: string };
    const passed = response.ok && matches(body, expected) && body.revision === revisions[name];
    samples.push({
      at,
      receivedAt: performance.now(),
      service: name,
      status: response.status,
      revision: body.revision,
      path: probe.path,
      ...(passed ? {} : { error: 'Business response mismatch' })
    });
    assert(passed, `Business probe failed for ${name} (${probe.path}, HTTP ${response.status}).`);
  }
};
const main = async () => {
  await guard();
  assert(
    process.env.AWS_PROFILE === PROFILE && process.env.STACKTAPE_AWS_ACCOUNT === PROFILE,
    'Explicit benchmark profile and Stacktape connection are required.'
  );
  if (mode) {
    const state = JSON.parse(await readFile(statePath, 'utf8')) as State;
    assert(
      state.account === ACCOUNT && state.region === REGION && state.profile === PROFILE,
      'Recovery target mismatch.'
    );
    for (const owned of state.resources) await cleanup(state, owned);
    return;
  }
  const owner = randomBytes(8).toString('hex');
  const name = `v4swap-${owner.slice(0, 8)}-${python ? 'py' : services.length > 1 ? 'five' : 'node'}`;
  const hash = getGloballyUniqueStackHash({ stackName: `${name}-bench`, accountId: ACCOUNT, region: REGION });
  const owned: Owned = {
    name,
    owner,
    table: `${name}-bench-code-swap`,
    bucket: awsResourceNames.deploymentBucket(hash),
    repository: awsResourceNames.deploymentEcrRepo(hash),
    directory: join(directory, 'app'),
    phase3: true,
    phase4: true,
    services
  };
  const state: State = {
    account: ACCOUNT,
    region: REGION,
    profile: PROFILE,
    owner,
    directory,
    resources: [owned],
    supervisor: '',
    cli: resolve(process.env.STP_CODE_SWAP_BENCH_CLI ?? '.stacktape/code-swap/cli/entrypoint.js')
  };
  await mkdir(owned.directory, { recursive: true });
  await save(statePath, state);
  assert(!(await getStack(owned)), 'Owned stack name already exists.');
  console.log(
    `Recovery: STP_CODE_SWAP_BENCH_LIVE=1 AWS_PROFILE=${PROFILE} STACKTAPE_AWS_ACCOUNT=${PROFILE} bun scripts/code-swap/extension.ts --customer-path --cleanup-only --state ${directory}`
  );
  const probeController = new AbortController();
  let probes: Promise<void>[] = [];
  try {
    const fixture = join(
      root,
      'fixtures/containers',
      python ? 'python' : services.length > 1 ? 'five-services' : 'node'
    );
    await cp(fixture, owned.directory, {
      recursive: true,
      filter: (path) =>
        !path.split('/').some((part) => ['node_modules', '.stacktape', '.venv', '__pycache__'].includes(part))
    });
    const config = JSON.parse(await readFile(join(root, 'configs/stacktape', appName, 'stacktape.yml'), 'utf8'));
    config.projectName = name;
    if (services.length === 1) {
      config.resources[services[0]!] = config.resources.api;
      delete config.resources.api;
      config.stackConfig.outputs = [{ name: `${services[0]}Url`, value: `$ResourceParam('${services[0]}', 'url')` }];
    }
    config.stackConfig.tags = [{ name: 'code-swap-benchmark-owner', value: owner }];
    for (const service of services) {
      // Exercise wildcard application permissions beneath explicit table Denies.
      config.resources[service].properties.iamRoleStatements = [
        { Effect: 'Allow', Action: ['dynamodb:*'], Resource: ['*'] }
      ];
      if (python) continue;
      const cwd = join(owned.directory, ...(services.length > 1 ? [service] : []));
      await invoke(['npm', 'ci', '--ignore-scripts', '--prefix', cwd], join(owned.directory, `install-${service}.log`));
      const serverPath = join(cwd, 'server.mjs');
      await writeFile(serverPath, (await readFile(serverPath, 'utf8')).replace(/if \(process\.argv\[1\][\s\S]*$/, ''));
      await cp(join(import.meta.dir, 'fixtures/permission-probe.mjs'), join(cwd, 'permission-probe.mjs'));
      await writeFile(
        join(cwd, 'entry.mjs'),
        "import { createApp } from './server.mjs'; import { permissionProbe } from './permission-probe.mjs'; const app = createApp(); let heldMemory; app.post('/_swap/memory', (req,res) => { heldMemory = Buffer.alloc(192*1024*1024, 1); res.json({bytes:heldMemory.length}); }); app.get('/_swap/permissions', async (req,res) => { try { res.json(await permissionProbe(String(req.query.tasks).split(','), undefined, String(req.query.services ?? '').split(',').filter(Boolean))); } catch(error) { res.status(500).json({error:String(error)}); } }); const server = app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0'); process.on('SIGTERM', () => server.close());\n"
      );
      config.resources[service].properties.packaging.properties.entryfilePath =
        services.length > 1 ? `${service}/entry.mjs` : 'entry.mjs';
    }
    await save(join(owned.directory, 'stacktape.json'), config);
    owned.stackAttempted = true;
    owned.tableAttempted = true;
    await save(statePath, state);
    await invoke(cliArgs(state, owned, 'deploy'), join(directory, 'setup.log'));
    owned.stackId = (await getStack(owned))!.StackId;
    await save(statePath, state);
    const outputs = (await getStack(owned))!.Outputs!;
    const urls = Object.fromEntries(
      services.map((service) => [
        service,
        outputs.find((output) => output.OutputKey?.toLowerCase() === `${service}url`)!.OutputValue!
      ])
    );
    // Exclude initial routing propagation from the edit sequence; retain its samples separately.
    let stable = Date.now();
    for (const deadline = Date.now() + 180000; Date.now() < deadline;) {
      const current = await Promise.all(services.map((service) => sample(service, urls[service])));
      if (current.some((item) => item.status !== 200 || item.error)) stable = Date.now();
      if (Date.now() - stable > 30000) break;
      await Bun.sleep(100);
    }
    const baseline = await fleet(owned);
    await save(join(directory, 'setup-probes.json'), samples.splice(0));
    probes = services.map(async (service) => {
      while (!probeController.signal.aborted) {
        await sample(service, urls[service]);
        await Bun.sleep(25);
      }
    });
    for (
      let index = 1;
      index <= (process.argv.includes('--lifecycle-only') ? 0 : services.length > 1 ? 11 : 10);
      index++
    ) {
      const revision = `edit-${index}`;
      const activeChanges = index === 11 ? ['reporting'] : changed;
      await edit(owned, revision, activeChanges);
      const start = performance.now(),
        sampleStart = samples.length;
      await invoke(cliArgs(state, owned, 'deploy'), join(directory, `edit-${index}.log`));
      const elapsed = performance.now() - start;
      const deadline = Date.now() + 15000;
      while (
        Date.now() < deadline &&
        !activeChanges.every((service) =>
          samples.slice(sampleStart).some((item) => item.service === service && item.revision === revision)
        )
      )
        await Bun.sleep(25);
      assert(
        activeChanges.every((service) =>
          samples.slice(sampleStart).some((item) => item.service === service && item.revision === revision)
        ),
        'Changed services did not serve their new revision.'
      );
      const log = await readFile(join(directory, `edit-${index}.log`), 'utf8');
      const actualFleet = await fleet(owned);
      assert(
        JSON.stringify(actualFleet) === JSON.stringify(baseline),
        'Edit replaced a task or modified an unchanged service.'
      );
      assert(
        activeChanges.every((service) => log.includes(`Swapped code in ${service};`)),
        'Expected a swap in every changed service.'
      );
      const first = Math.max(
        ...activeChanges.map(
          (service) =>
            samples.slice(sampleStart).find((item) => item.service === service && item.revision === revision)!
              .receivedAt - start
        )
      );
      const failures = samples.slice(sampleStart).filter((item) => item.status !== 200 || item.error);
      results.push({ index, startedAt: start, elapsedMs: elapsed, servingMs: first, failures: failures.length });
      await verifyBusiness(urls);
      await save(join(directory, 'probes.json'), samples);
      await save(join(directory, 'results.json'), { appName, results });
      console.log(
        `${appName} edit ${index}: CLI ${(elapsed / 1000).toFixed(2)}s, all serving ${(first / 1000).toFixed(2)}s, failures ${failures.length}`
      );
    }
    // Save before slower recovery cases, so interruption always leaves usable evidence.
    await save(join(directory, 'probes.json'), samples);
    assert(!samples.some((item) => item.status !== 200 || item.error), 'Request failures occurred during swaps.');
    for (const service of services.filter((service) => !changed.includes(service)))
      assert(
        samples.filter((item) => item.service === service).every((item) => item.revision === 'baseline'),
        'An unchanged service changed code.'
      );
    if (!process.argv.includes('--benchmark-only')) {
      const lifecycle: Record<string, unknown> = {};
      if (services.length > 1) {
        const ids = Object.values(baseline).flatMap((item) => item.tasks.map((arn) => arn.split('/').at(-1)!));
        const permissions = await fetch(
          `${urls[services[0]!]}/_swap/permissions?tasks=${ids.join(',')}&services=reporting,inventory`,
          { signal: AbortSignal.timeout(120000) }
        );
        const body = await permissions.json();
        await save(join(directory, 'permissions.json'), body);
        assert(permissions.ok, 'Live service IAM boundary failed.');
        lifecycle.permissions = true;
      }
      // A real kernel peak refuses one candidate; every other changed service must abort and use images too.
      if (services.length > 1) {
        const memory = await fetch(`${urls[services[0]!]}/_swap/memory`, {
          method: 'POST',
          signal: AbortSignal.timeout(10000)
        });
        assert(memory.ok, 'Could not establish the owned memory-screen scenario.');
      } else {
        config.resources[services[0]!].properties.environment = [
          { name: 'CODE_SWAP_FALLBACK_PROOF', value: 'enabled' }
        ];
        await save(join(owned.directory, 'stacktape.json'), config);
      }
      await edit(owned, 'image-fallback');
      await invoke(cliArgs(state, owned, 'deploy'), join(directory, 'fallback.log'));
      const fallbackFleet = await fleet(owned);
      assert(
        changed.every((service) => fallbackFleet[service].definition !== baseline[service].definition),
        'A changed service escaped group image fallback.'
      );
      assert(
        services
          .filter((service) => !changed.includes(service))
          .every((service) => JSON.stringify(fallbackFleet[service]) === JSON.stringify(baseline[service])),
        'Group fallback touched an unchanged service.'
      );
      lifecycle.groupFallback = true;
      // Source revert is still a change relative to the overlay.
      await edit(owned, 'after-fallback');
      await invoke(cliArgs(state, owned, 'deploy'), join(directory, 'after-fallback.log'));
      assert(
        changed.every(
          (service) => samples.filter((item) => item.service === service).at(-1)?.revision === 'after-fallback'
        ),
        'Post-fallback swap did not serve.'
      );
      const record = await ddb.send(
        new GetItemCommand({
          TableName: owned.table,
          Key: { pk: { S: `release#service:${services[0]}` } },
          ConsistentRead: true
        })
      );
      const targetVersion = JSON.parse(record.Item!.data!.S!).HistoryVersion as string;
      await edit(owned, 'interrupted');
      const output = openSync(join(directory, 'interrupted.log'), 'w');
      const child = Bun.spawn(cliArgs(state, owned, 'deploy'), {
        cwd: resolve(import.meta.dir, '../..'),
        env: { ...process.env, STP_DEV_MODE: 'true', AWS_PROFILE: PROFILE, AWS_REGION: REGION },
        stdout: output,
        stderr: output
      });
      let killed = false;
      try {
        for (const deadline = Date.now() + 120000; Date.now() < deadline;) {
          const current = await ddb.send(
            new GetItemCommand({
              TableName: owned.table,
              Key: { pk: { S: `release#service:${services[0]}` } },
              ConsistentRead: true
            })
          );
          if (
            current.Item &&
            JSON.parse(current.Item.data!.S!).Committed?.Revision !== JSON.parse(current.Item.data!.S!).HistoryVersion
          ) {
            child.kill('SIGKILL');
            killed = true;
            break;
          }
          await Bun.sleep(20);
        }
      } finally {
        if (!killed) child.kill('SIGTERM');
        await child.exited;
        closeSync(output);
      }
      assert(killed, 'Missed interruption checkpoint.');
      const lock = await readLock(ddb, owned.table);
      assert(lock, 'Interrupted invocation did not retain its lock.');
      await invoke(
        [...cliArgs(state, owned, 'deploy'), '--recoverOperation', lock.invocationId],
        join(directory, 'recovery.log')
      );
      const recoveryLog = await readFile(join(directory, 'recovery.log'), 'utf8');
      assert(
        changed.every((service) => !recoveryLog.includes(`Swapped code in ${service};`)),
        'Interrupted swap was reported as success.'
      );
      lifecycle.interruptedImageRecovery = true;
      await invoke(
        [...cliArgs(state, owned, 'rollback'), '--targetVersion', targetVersion],
        join(directory, 'rollback.log')
      );
      for (const service of changed) {
        const current = await sample(service, urls[service]);
        assert(
          current.status === 200 && current.revision === 'after-fallback',
          'Image rollback did not restore the retained source.'
        );
      }
      lifecycle.imageRollback = true;
      for (const service of services) config.resources[service].properties.codeSwap = false;
      await edit(owned, 'opted-out');
      await save(join(owned.directory, 'stacktape.json'), config);
      await invoke(cliArgs(state, owned, 'deploy'), join(directory, 'opt-out.log'));
      for (const service of changed) {
        const current = await sample(service, urls[service]);
        assert(current.status === 200 && current.revision === 'opted-out', 'Opt-out did not serve intended source.');
      }
      lifecycle.optOut = true;
      await save(join(directory, 'lifecycle.json'), lifecycle);
    }
  } catch (error) {
    console.error(`Qualification failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    probeController.abort();
    await Promise.allSettled(probes);
    await save(join(directory, 'probes.json'), samples);
    await save(join(directory, 'results.json'), {
      appName,
      results,
      failures: samples.filter((item) => item.status !== 200 || item.error).length,
      requests: samples.length
    });
    await cleanup(state, owned);
  }
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
