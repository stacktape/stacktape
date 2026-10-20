// Explicit live-only lifecycle scenarios. run.ts owns account checks, recovery state and finally cleanup.
import assert from 'node:assert/strict';
import { access, readFile, writeFile, rm } from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ECSClient, DescribeTaskDefinitionCommand } from '@aws-sdk/client-ecs';
import type { BenchmarkRun } from '../../src/domain/code-swap/benchmark-run';
import { acquireLock, removeLock, readLock } from '../../src/domain/code-swap/operation-lock';
import { readReleaseRecord } from '../../src/domain/code-swap/release-record';
import type { State, Owned } from './run';

type Harness = Pick<
  typeof import('./run'),
  | 'clients'
  | 'guard'
  | 'invoke'
  | 'cliArgs'
  | 'save'
  | 'configure'
  | 'primaryTasks'
  | 'waitForFleet'
  | 'edit'
  | 'samplePublic'
>;

export const qualifyPhase4 = async (
  state: State,
  owned: Owned,
  run: BenchmarkRun,
  url: string,
  { clients, guard, invoke, cliArgs, save, configure, primaryTasks, waitForFleet, edit, samplePublic }: Harness
) => {
  await guard();
  const ddb = new DynamoDBClient(clients),
    s3 = new S3Client(clients),
    ecs = new ECSClient(clients);
  const evidence: Record<string, unknown> = {};
  const traffic: { phase: string; status: number; error?: string }[] = [];
  let phase = 'race';
  let serving = true;
  const poll = (async () => {
    // eslint-disable-next-line no-unmodified-loop-condition -- The scenario finally block stops this concurrent traffic loop.
    while (serving) {
      const p = await samplePublic(url, 0);
      traffic.push({ phase, status: p.status, error: p.error });
      await Bun.sleep(50);
    }
  })();
  const active = new Set<ReturnType<typeof Bun.spawn>>();
  const runFile = join(owned.directory, 'run.json');
  const missing = (error: unknown) =>
    error instanceof Error && ['NoSuchKey', 'ResourceNotFoundException'].includes(error.name);
  const absent = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return false;
    } catch (error) {
      if (missing(error)) return true;
      throw error;
    }
  };
  const version = async () => {
    const response = await fetch(`${url}/version`, { signal: AbortSignal.timeout(5000) });
    assert(response.ok);
    return (await response.json()) as { revision: string };
  };
  const startFault = async (fault: 'before-proposal' | 'after-commit', label: string) => {
    const faultRun = { ...run, mode: 'swap' as const, fault, result: join(owned.directory, `${label}-result.json`) };
    const path = join(owned.directory, `${label}-run.json`);
    await rm(`${faultRun.result}.checkpoint`, { force: true });
    await rm(`${faultRun.result}.continue`, { force: true });
    await save(path, faultRun);
    const fd = openSync(join(owned.directory, `${label}.log`), 'w');
    const child = Bun.spawn(cliArgs(state, owned, 'deploy'), {
      cwd: join(import.meta.dir, '../..'),
      env: {
        ...process.env,
        STP_DEV_MODE: 'true',
        AWS_PROFILE: 'stacktape-e2e',
        AWS_REGION: 'eu-west-1',
        STP_CODE_SWAP_BENCH_RUN: path
      },
      stdout: fd,
      stderr: fd
    });
    active.add(child);
    const exited = child.exited.finally(() => {
      active.delete(child);
      closeSync(fd);
    });
    const deadline = Date.now() + 120000;
    while (
      !(await access(`${faultRun.result}.checkpoint`).then(
        () => true,
        () => false
      ))
    ) {
      assert(child.exitCode === null, `${label} exited before checkpoint; see its log`);
      assert(Date.now() < deadline, `${label} checkpoint timed out`);
      await Bun.sleep(100);
    }
    const checkpoint = JSON.parse(await readFile(`${faultRun.result}.checkpoint`, 'utf8')) as { invocationId: string };
    return { child, exited, run: faultRun, checkpoint };
  };
  const deployImage = async (label: string, count: 1 | 2, optOut = false) => {
    run.count = count;
    run.mode = 'image';
    run.optOut = optOut;
    run.result = join(owned.directory, `${label}-result.json`);
    await configure(owned, run.memory as 512 | 1024, count);
    const expected = optOut ? (await version()).revision : label;
    if (!optOut)
      await writeFile(join(owned.directory, 'revision.mjs'), `export const revision = ${JSON.stringify(label)};\n`);
    await save(runFile, run);
    await invoke([...cliArgs(state, owned, 'deploy'), '--fullDeploy'], join(owned.directory, `${label}.log`), {
      STP_CODE_SWAP_BENCH_RUN: runFile
    });
    await waitForFleet(owned, count);
    assert.equal((await version()).revision, expected);
  };
  const rollbackOnly = process.argv.includes('--phase4-rollback-only');
  try {
    if (!rollbackOnly) {
      await writeFile(join(owned.directory, 'revision.mjs'), `export const revision = "race-${state.owner}";\n`);
      const race = await startFault('before-proposal', 'concurrent-swap');
      const raceLock = await readLock(ddb, owned.table);
      assert.equal(raceLock?.invocationId, race.checkpoint.invocationId);
      let rejected = false;
      try {
        await invoke(
          [...cliArgs(state, owned, 'deploy'), '--fullDeploy'],
          join(owned.directory, 'concurrent-full.log'),
          {
            STP_CODE_SWAP_BENCH_RUN: runFile
          }
        );
      } catch {
        rejected = true;
      }
      assert(
        rejected &&
          (await readFile(join(owned.directory, 'concurrent-full.log'), 'utf8')).includes('holds the code-swap lock')
      );
      await writeFile(`${race.run.result}.continue`, 'continue');
      assert.equal(await race.exited, 0);
      assert.equal(JSON.parse(await readFile(race.run.result, 'utf8')).mode, 'swap');
      assert.equal(traffic.filter((p) => p.phase === 'race' && (p.status !== 200 || p.error)).length, 0);
      evidence.a = { concurrentFullRejected: true, holder: raceLock, requestFailures: 0 };

      phase = 'interruption';
      const intended = `interrupted-${state.owner}`;
      await writeFile(join(owned.directory, 'revision.mjs'), `export const revision = ${JSON.stringify(intended)};\n`);
      const killed = await startFault('after-commit', 'killed-after-commit');
      const committed = (await readReleaseRecord(ddb, owned.table))!;
      assert(committed.Committed && committed.HistoryVersion !== committed.Committed.Revision);
      killed.child.kill('SIGKILL');
      await killed.exited;
      assert.equal((await readLock(ddb, owned.table))?.invocationId, killed.checkpoint.invocationId);
      const interruptedMarker = `fast-release/${committed.Committed.Revision}.json`;
      assert(await absent(() => s3.send(new GetObjectCommand({ Bucket: owned.bucket, Key: interruptedMarker }))));
      run.mode = 'swap';
      run.result = join(owned.directory, 'recovery-result.json');
      await save(runFile, run);
      await invoke(
        [...cliArgs(state, owned, 'deploy'), '--recoverOperation', killed.checkpoint.invocationId],
        join(owned.directory, 'recovery.log'),
        { STP_CODE_SWAP_BENCH_RUN: runFile }
      );
      await waitForFleet(owned, 1);
      const repair = JSON.parse(await readFile(run.result, 'utf8'));
      assert.equal(repair.mode, 'image');
      assert.equal(repair.fallback, 'interrupted_swap_image_repair');
      assert.equal((await version()).revision, intended);
      assert(await absent(() => s3.send(new GetObjectCommand({ Bucket: owned.bucket, Key: interruptedMarker }))));
      const attempt = await s3.send(
        new GetObjectCommand({
          Bucket: owned.bucket,
          Key: `code-swap/api/attempts/${committed.Committed.Revision}-${committed.Attempt}.json`
        })
      );
      const interrupted = JSON.parse(await attempt.Body!.transformToString());
      assert.equal(interrupted.outcome, 'interrupted');
      evidence.b = {
        invocationId: killed.checkpoint.invocationId,
        interruptedVersion: committed.Committed.Revision,
        interrupted,
        repair
      };

      phase = 'permissions';
      await deployImage(`permissions-${state.owner}`, 2);
      const tasks = await primaryTasks(owned);
      const before = await readReleaseRecord(ddb, owned.table);
      const probeHolder = {
        invocationId: `permission-probe-${state.owner}`,
        operation: 'deploy' as const,
        startedAt: new Date().toISOString()
      };
      await acquireLock(ddb, owned.table, probeHolder);
      let probe: unknown;
      try {
        const response = await fetch(`${url}/_phase4/security?tasks=${tasks.ids.join(',')}`, {
          signal: AbortSignal.timeout(120000)
        });
        probe = await response.json();
        await save(join(owned.directory, 'permissions.json'), probe);
        assert(response.ok, JSON.stringify(probe));
        assert.deepEqual(await readLock(ddb, owned.table), probeHolder);
      } finally {
        await removeLock(ddb, owned.table, probeHolder.invocationId);
      }
      assert.deepEqual(await readReleaseRecord(ddb, owned.table), before);
      evidence.c = probe;
    }

    phase = 'rollback';
    const baseline = rollbackOnly ? (await version()).revision : `rollback-base-${state.owner}`;
    if (!rollbackOnly) await deployImage(baseline, 1);
    const baselineFleet = await primaryTasks(owned);
    run.mode = 'swap';
    const swapped = await edit(state, owned, run, url, 90);
    assert.equal((swapped.details as { mode: string }).mode, 'swap');
    await invoke(cliArgs(state, owned, 'rollback'), join(owned.directory, 'rollback.log'), {
      STP_CODE_SWAP_BENCH_RUN: runFile
    });
    await waitForFleet(owned, 1);
    assert.equal((await version()).revision, baseline);
    const restored = await primaryTasks(owned);
    assert.notDeepEqual(restored.ids, baselineFleet.ids);
    const baselineImage = baselineFleet.tasks[0]?.containers?.find((c) => c.name === 'service-container')?.imageDigest;
    assert.match(baselineImage ?? '', /^sha256:/);
    assert.equal(
      restored.tasks[0]?.containers?.find((c) => c.name === 'service-container')?.imageDigest,
      baselineImage
    );
    assert.notEqual(restored.tasks[0]?.taskDefinitionArn, baselineFleet.tasks[0]?.taskDefinitionArn);
    evidence.d = {
      previousImageCode: baseline,
      restoredImageCode: (await version()).revision,
      oldTasks: baselineFleet.ids,
      restoredTasks: restored.ids
    };

    // Match the restored image locally so the next operation tests opt-out without a code change.
    await writeFile(join(owned.directory, 'revision.mjs'), `export const revision = ${JSON.stringify(baseline)};\n`);
    phase = 'opt-out';
    await deployImage(`optout-${state.owner}`, 1, true);
    assert(await absent(() => ddb.send(new DescribeTableCommand({ TableName: owned.table }))));
    const live = await primaryTasks(owned);
    const definition = (
      await ecs.send(new DescribeTaskDefinitionCommand({ taskDefinition: live.tasks[0]!.taskDefinitionArn! }))
    ).taskDefinition!;
    assert(!JSON.stringify(definition.containerDefinitions).includes('/stacktape-supervisor'));
    const image = definition.containerDefinitions!.find((container) => container.essential !== false)?.image;
    assert(image);
    const imageConfigFile = join(owned.directory, 'optout-image-config.json');
    await invoke(
      [
        'docker',
        'image',
        'inspect',
        image,
        '--format',
        '{"entrypoint":{{json .Config.Entrypoint}},"cmd":{{json .Config.Cmd}}}'
      ],
      imageConfigFile
    );
    const imageConfig: unknown = JSON.parse(await readFile(imageConfigFile, 'utf8'));
    assert(!JSON.stringify(imageConfig).includes('/stacktape-supervisor'));
    evidence.e = {
      tableAndStatusItemsRemoved: true,
      supervisorRemoved: true,
      imageConfig,
      deletionVerifiedByRunCleanup: true
    };
  } finally {
    for (const child of active) child.kill('SIGKILL');
    await Promise.all([...active].map((child) => child.exited));
    serving = false;
    await poll;
    await save(join(owned.directory, 'phase4-lifecycle.json'), {
      evidence,
      traffic,
      requestFailures: traffic.filter((p) => p.status !== 200 || p.error).length
    });
  }
};
