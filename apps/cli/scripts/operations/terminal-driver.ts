import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { operationSession } from '@application-services/operation-manager';
import { tuiManager } from '@application-services/tui-manager';
import { devTuiManager } from '../../src/app/tui-manager/dev/manager';
import { PromptSink } from '../../src/app/tui-manager/prompt/sink';
import { PresentationController } from '../../src/app/tui-manager/runtime/presentation-controller';

const waitFor = async (ready: () => boolean) => {
  const deadline = Date.now() + 10_000;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error('Terminal driver timed out');
    await Bun.sleep(20);
  }
};

const main = async () => {
  if (process.argv[2]?.startsWith('dev')) {
    globalStateManager.rawCommands = ['dev'];
    globalStateManager.rawArgs = {};
    tuiManager.setOutputFormat('tty');
    // The dev resource picker releases the primary TUI before the separate dev renderer starts.
    if (process.argv[2] === 'dev') {
      tuiManager.start({ view: 'stream' });
      await tuiManager.stop();
    }
    await applicationManager.init();
    devTuiManager.start({ projectName: 'ownership-dev', stageName: 'test' });
    devTuiManager.addWorkload({ name: 'worker', type: 'container' });
    devTuiManager.setWorkloadStatus('worker', 'running');
    devTuiManager.transitionToRunning();
    devTuiManager.startRenderer();
    applicationManager.registerCleanUpHook(async () => {
      await devTuiManager.stop();
      await writeFile(
        'cleanup-state.json',
        JSON.stringify({ raw: process.stdin.isRaw, running: devTuiManager.running })
      );
      process.stdout.write('Stopping dev workloads...\n  worker\nDev cleanup complete\n');
    });
    await waitFor(() => existsSync('finish'));
  } else {
    const controller = new PresentationController();
    operationSession.reset({ showPhaseHeaders: true });
    controller.start({
      preferredView: 'auto',
      onQuit: () => {
        throw new Error('Unexpected quit');
      },
      onCancel: () => {
        throw new Error('Unexpected cancellation');
      },
      onRenderError: (error) => {
        throw error;
      }
    });
    const modal = process.argv[2] === 'prompt';
    const prompts = new PromptSink(
      () => {},
      (run) => controller.withDashboardPrompt(run)
    );
    const lease = modal
      ? prompts.text({ config: { message: 'Answer while a view change waits:' }, isEnabled: true, isTTY: true })
      : controller.withTerminalLease(async () => {
          const child = Bun.spawn(
            [
              process.execPath,
              '-e',
              "process.stdout.write('Inherited child ready\\n'); process.stdin.once('data', data => { console.log('Child answer: ' + data.toString().trim()); process.exit(0); });"
            ],
            { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' }
          );
          const code = await child.exited;
          if (code !== 0) throw new Error(`Inherited child exited ${code}`);
          return 'child-done';
        });
    if (modal) await waitFor(() => !!controller.renderer && !!operationSession.store.getSnapshot().activePrompt);
    await waitFor(() => existsSync('request-view'));
    if (modal) controller.requestView('stream');
    else operationSession.setPhase('DEPLOY'); // The automatic phase transition requests the dashboard during the lease.
    // Let asynchronous mounting/teardown finish if the controller wrongly applies this request immediately.
    await Bun.sleep(300);
    await writeFile('request-processed', 'done');
    const answer = await lease;
    await writeFile('answer', answer);
    await waitFor(() => controller.activeView === (modal ? 'stream' : 'dashboard'));
    if (!modal) await waitFor(() => !!controller.renderer);
    await writeFile('view-restored', controller.activeView);
    await waitFor(() => existsSync('finish'));
    await controller.stop();
    process.stdout.write('Terminal ownership complete\n');
  }
};

if (import.meta.main)
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
