import { beforeEach, describe, expect, test } from 'bun:test';
import { operationSession, type TtyView } from '@application-services/operation-manager';
import { PresentationController } from './presentation-controller';

const flush = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const createController = (preferredView: TtyView) => {
  const events: string[] = [];
  const controller = new PresentationController();
  Object.assign(controller, {
    runtime: {
      renderer: null,
      windowFocused: true,
      isMountingOrActive: true,
      start: () => events.push('dashboard-start'),
      stop: async () => {
        events.push('dashboard-stop');
        return { rendererDestroyed: true };
      },
      stopSync: () => events.push('dashboard-stop-sync')
    },
    stream: {
      start: () => events.push('stream-start'),
      stop: () => {
        events.push('stream-stop');
        return operationSession.journal.lastSequence;
      },
      suspendTerminal: () => events.push('stream-suspend'),
      resumeTerminal: () => events.push('stream-resume')
    }
  });
  controller.start({
    preferredView,
    onQuit: () => {},
    onCancel: () => {},
    onRenderError: (error) => {
      throw error;
    }
  });
  return { controller, events };
};

beforeEach(() => operationSession.reset());

describe('PresentationController exclusive terminal ownership', () => {
  test('replays the dashboard tail during synchronous shutdown', () => {
    const { controller, events } = createController('dashboard');

    controller.stopSync();

    expect(events).toEqual(['dashboard-start', 'dashboard-stop-sync', 'stream-start', 'stream-stop']);
  });

  test('queues view changes until a modal prompt has restored its previous surface', async () => {
    const { controller, events } = createController('stream');
    let releasePrompt!: () => void;
    const promptGate = new Promise<void>((resolve) => {
      releasePrompt = resolve;
    });

    try {
      const prompt = controller.withDashboardPrompt(async () => {
        events.push('prompt-start');
        await promptGate;
        events.push('prompt-end');
        return 'answer';
      });
      await flush();
      controller.requestView('stream');
      await flush();

      expect(events).toEqual(['stream-start', 'stream-stop', 'dashboard-start', 'prompt-start']);

      releasePrompt();
      await expect(prompt).resolves.toBe('answer');
      await flush();
      expect(events).toEqual([
        'stream-start',
        'stream-stop',
        'dashboard-start',
        'prompt-start',
        'prompt-end',
        'dashboard-stop',
        'stream-start'
      ]);
    } finally {
      await controller.stop();
    }
  });

  test('queues view changes until an inherited child returns the terminal', async () => {
    const { controller, events } = createController('stream');
    let releaseChild!: () => void;
    const childGate = new Promise<void>((resolve) => {
      releaseChild = resolve;
    });

    try {
      const child = controller.withTerminalLease(async () => {
        events.push('child-start');
        await childGate;
        events.push('child-end');
        return 42;
      });
      await flush();
      controller.requestView('dashboard');
      await flush();

      expect(events).toEqual(['stream-start', 'stream-suspend', 'child-start']);

      releaseChild();
      await expect(child).resolves.toBe(42);
      await flush();
      expect(events).toEqual([
        'stream-start',
        'stream-suspend',
        'child-start',
        'child-end',
        'stream-resume',
        'stream-stop',
        'dashboard-start'
      ]);
    } finally {
      await controller.stop();
    }
  });
});
