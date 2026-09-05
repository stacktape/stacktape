import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectConsoleDevReservation, consoleDevReservationStore } from './console-dev-reservation.ts';

// Explicit live lane only. It touches one unique test row, never the real dev reservation or Console stacks.
const [mode, recoveryKey, recoveryOwners, ...extra] = process.argv.slice(2);
const cleanupOnly = mode === '--cleanup-only';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
if (
  extra.length ||
  (cleanupOnly
    ? !recoveryKey?.startsWith('qualification-') ||
      !uuid.test(recoveryKey.slice(14)) ||
      !recoveryOwners?.split(',').every((token) => uuid.test(token))
    : mode !== '--live' || recoveryKey || recoveryOwners)
) {
  throw new Error('Use --live, or the exact --cleanup-only <qualification-row> <owner-ids> recovery command.');
}
const key = cleanupOnly ? recoveryKey! : `qualification-${randomUUID()}`;
const tokens: string[] = cleanupOnly ? recoveryOwners!.split(',') : Array.from({ length: 8 }, () => randomUUID());
const successor = cleanupOnly ? tokens[0]! : randomUUID();
console.info(`Account 977946299200, eu-west-1; coordination qualification row ${key}.`);
console.info(
  `Recovery: node scripts/workspace/qualify-console-dev-reservation.ts --cleanup-only ${key} ${[...new Set([...tokens, successor])].join(',')}`
);
const client = await connectConsoleDevReservation();
const store = consoleDevReservationStore(client, key);
try {
  if (!cleanupOnly) {
    const contenders = await Promise.allSettled(
      tokens.map((token, index) => store.acquire(`qualification-${index}`, token))
    );
    const winners = contenders.filter((entry) => entry.status === 'fulfilled');
    assert.equal(winners.length, 1, 'Exactly one concurrent caller must acquire the reservation.');
    for (const contender of contenders) {
      if (contender.status === 'rejected') assert.match(String(contender.reason), /reserved by/);
    }
    const winner = winners[0]!.value;
    assert.equal((await store.status())?.token, winner.token);
    await assert.rejects(store.check(successor));
    await assert.rejects(store.release(successor), { name: 'ConditionalCheckFailedException' });
    assert.equal((await store.status())?.token, winner.token, 'An unrelated release must leave the owner intact.');
    await store.release(winner.token);
    await store.acquire('qualification-successor', successor);
    await assert.rejects(store.release(winner.token), { name: 'ConditionalCheckFailedException' });
    assert.equal((await store.status())?.token, successor, 'A delayed previous release must not delete its successor.');
    console.info(
      'PASS: eight concurrent AWS callers produce one owner; wrong-owner and stale-owner releases are rejected.'
    );
  }
} finally {
  try {
    const current = await store.status();
    if (current) {
      assert.ok([...tokens, successor].includes(current.token), 'Refusing cleanup of an unowned reservation.');
      await store.release(current.token);
    }
    assert.equal(await store.status(), undefined);
    console.info(`Cleanup verified: ${key} is absent. The persistent coordination table was retained.`);
  } finally {
    client.destroy();
  }
}
