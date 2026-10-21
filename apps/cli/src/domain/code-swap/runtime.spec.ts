import { expect, test } from 'bun:test';
import { prepareCodeSwapServices } from './runtime';

type Update = Parameters<typeof prepareCodeSwapServices>[1][number];
const update = (name: string) => ({ workload: { name } }) as unknown as Update;

// A service whose preparation resolves, rejects (a task refused) or never started (an image-only change).
const service = (preparation: 'prepared' | 'refused' | 'none', commit: 'ok' | 'fail' = 'ok') => {
  const events: string[] = [];
  let pending: Promise<unknown> | undefined =
    preparation === 'prepared'
      ? Promise.resolve()
      : preparation === 'refused'
        ? Promise.reject(new Error('memory_screen'))
        : undefined;
  pending?.catch(() => {});
  let mode = 'pending';
  return {
    events,
    mode: () => mode,
    runtime: {
      prepared: () => pending as never,
      codeSwapSwap: async () => {
        if (!pending) return false;
        try {
          await pending;
        } catch {
          events.push('refusal-handled');
          pending = undefined;
          mode = 'image';
          return false;
        }
        events.push('commit');
        if (commit === 'fail') {
          pending = undefined;
          mode = 'image';
          return false;
        }
        mode = 'swap';
        return true;
      },
      codeSwapUseImage: async (fallback?: string) => {
        if (!pending) return;
        // A switched service has no candidate left to abort; it is redeployed from its image.
        if (mode !== 'swap') events.push(`abort:${fallback ?? 'task_configuration_changed'}`);
        pending = undefined;
        mode = 'image';
      },
      forceImage: () => {
        mode = 'image';
      }
    }
  };
};

const run = async (services: Record<string, ReturnType<typeof service>>, changed: string[], configChanged = false) =>
  prepareCodeSwapServices(
    new Map(Object.entries(services).map(([name, item]) => [name, item.runtime])),
    changed.map(update),
    () => configChanged
  );

test('one refusal sends every changed service to images before any sibling commits', async () => {
  const services = { api: service('prepared'), reporting: service('refused'), inventory: service('none') };
  await run(services, ['api', 'reporting']);
  expect(services.api.events).toEqual(['abort:another_service_failed']);
  expect(services.reporting.events).toEqual(['refusal-handled']);
  expect(services.inventory.events).toEqual([]);
  expect([services.api.mode(), services.reporting.mode()]).toEqual(['image', 'image']);
  // The unchanged service is never prepared, aborted or switched.
  expect(services.inventory.mode()).toBe('pending');
});

test('a changed service that cannot swap, such as a dependency change, keeps prepared siblings on images', async () => {
  const services = { api: service('prepared'), reporting: service('none') };
  await run(services, ['api', 'reporting']);
  expect(services.api.events).toEqual(['abort:another_service_failed']);
  expect(services.api.mode()).toBe('image');
});

test('a task configuration change aborts every prepared swap with that reason', async () => {
  const services = { api: service('prepared'), reporting: service('prepared') };
  await run(services, ['api', 'reporting'], true);
  expect(services.api.events).toEqual(['abort:task_configuration_changed']);
  expect(services.reporting.events).toEqual(['abort:task_configuration_changed']);
});

test('a failed switch converges every changed service, including already switched ones, to images', async () => {
  const services = { api: service('prepared'), reporting: service('prepared', 'fail'), inventory: service('none') };
  await run(services, ['api', 'reporting']);
  expect(services.api.events).toEqual(['commit']);
  expect(services.reporting.events).toEqual(['commit']);
  expect([services.api.mode(), services.reporting.mode()]).toEqual(['image', 'image']);
  expect(services.inventory.mode()).toBe('pending');
});

test('every changed service swaps when all prepared', async () => {
  const services = { api: service('prepared'), reporting: service('prepared'), inventory: service('none') };
  await run(services, ['api', 'reporting']);
  expect([services.api.mode(), services.reporting.mode(), services.inventory.mode()]).toEqual([
    'swap',
    'swap',
    'pending'
  ]);
});
