import type { CliRenderer } from '@opentui/core';
import { operationSession, type ActiveTtyView, type TtyView } from '@application-services/operation-manager';
import { StreamPresenter } from '../progress/stream-presenter';
import { tuiDebug } from '../debug';
import { TtyRuntime } from './lifecycle';

type ControllerOptions = {
  preferredView: TtyView;
  onQuit: () => void;
  onCancel: () => void;
  onRenderError: (error: Error) => void;
};

/** Guarantees that exactly one component owns the terminal at a time. */
export class PresentationController {
  private runtime = new TtyRuntime();
  private stream: StreamPresenter;
  private currentView: ActiveTtyView = 'stream';
  private preferredView: TtyView = 'auto';
  private manuallyPinned = false;
  private replayCursor = 0;
  private transition: Promise<void> = Promise.resolve();
  private unsubscribeJournal: (() => void) | undefined;
  private options: ControllerOptions | undefined;
  private active = false;

  constructor() {
    this.stream = new StreamPresenter({
      onToggle: () => this.toggle(),
      onCancel: () => this.options?.onCancel()
    });
  }

  get activeView(): ActiveTtyView {
    return this.currentView;
  }

  get renderer(): CliRenderer | null {
    return this.runtime.renderer;
  }

  get windowFocused(): boolean {
    return this.runtime.windowFocused;
  }

  get isDashboardActive(): boolean {
    return this.currentView === 'dashboard' && this.runtime.isMountingOrActive;
  }

  start(options: ControllerOptions) {
    this.active = true;
    this.options = options;
    this.preferredView = options.preferredView;
    this.manuallyPinned = options.preferredView !== 'auto';
    this.replayCursor = 0;
    this.unsubscribeJournal = operationSession.journal.subscribe((record) => {
      if (record.type !== 'phase-entered' || this.preferredView !== 'auto' || this.manuallyPinned) return;
      const next: ActiveTtyView =
        record.phase === 'DEPLOY' && operationSession.store.getSnapshot().showPhaseHeaders ? 'dashboard' : 'stream';
      this.requestView(next, false);
    });
    const initial: ActiveTtyView = options.preferredView === 'dashboard' ? 'dashboard' : 'stream';
    this.currentView = initial;
    if (initial === 'dashboard') this.mountDashboard();
    else this.stream.start(this.replayCursor);
  }

  toggle() {
    if (!this.active || operationSession.store.getSnapshot().activePrompt) return;
    this.manuallyPinned = true;
    this.requestView(this.currentView === 'stream' ? 'dashboard' : 'stream', true);
  }

  requestView(view: ActiveTtyView, manual = true) {
    if (!this.active) return;
    if (manual) this.manuallyPinned = true;
    this.transition = this.transition
      .then(() => this.switchNow(view))
      .catch((error) => {
        this.options?.onRenderError(error instanceof Error ? error : new Error(String(error)));
      });
  }

  async stop() {
    this.active = false;
    this.unsubscribeJournal?.();
    this.unsubscribeJournal = undefined;
    await this.transition;
    if (this.currentView === 'dashboard') {
      await this.runtime.stop();
      this.currentView = 'stream';
      tuiDebug('PRESENTATION', 'replaying dashboard tail during stop', { afterSequence: this.replayCursor });
      this.stream.start(this.replayCursor);
      this.replayCursor = this.stream.stop();
    } else {
      this.replayCursor = this.stream.stop();
    }
    this.options = undefined;
  }

  stopSync() {
    this.active = false;
    this.unsubscribeJournal?.();
    this.unsubscribeJournal = undefined;
    if (this.currentView === 'dashboard') {
      this.runtime.stopSync();
      this.currentView = 'stream';
      this.stream.start(this.replayCursor);
      this.replayCursor = this.stream.stop();
    } else {
      this.replayCursor = this.stream.stop();
    }
    this.options = undefined;
  }

  withTerminalLease<T>(run: () => Promise<T>): Promise<T> {
    if (!this.active) return run();
    return this.runExclusive(async () => {
      const restoreView = this.currentView;
      if (restoreView === 'dashboard') {
        await this.runtime.stop();
        await this.releaseInputForLease();
      } else {
        this.stream.suspendTerminal();
      }
      try {
        return await run();
      } finally {
        if (this.active) {
          if (restoreView === 'dashboard') this.mountDashboard();
          else this.stream.resumeTerminal();
        }
      }
    });
  }

  withDashboardPrompt<T>(run: () => Promise<T>): Promise<T> {
    if (!this.active) return run();
    return this.runExclusive(async () => {
      const restoreView = this.currentView;
      if (restoreView === 'stream') await this.switchNow('dashboard');
      try {
        return await run();
      } finally {
        if (this.active && restoreView === 'stream' && this.currentView === 'dashboard') {
          await this.switchNow('stream');
        }
      }
    });
  }

  private async switchNow(view: ActiveTtyView) {
    if (!this.active || view === this.currentView) return;
    tuiDebug('PRESENTATION', 'switching view', { from: this.currentView, to: view });
    if (this.currentView === 'stream') {
      this.replayCursor = this.stream.stop();
      tuiDebug('PRESENTATION', 'captured stream cursor', { sequence: this.replayCursor });
      this.currentView = 'dashboard';
      this.mountDashboard();
      return;
    }
    await this.runtime.stop();
    this.currentView = 'stream';
    tuiDebug('PRESENTATION', 'replaying dashboard tail', { afterSequence: this.replayCursor });
    this.stream.start(this.replayCursor);
  }

  private mountDashboard() {
    if (!this.active) return;
    this.runtime.start(
      async () => {
        const { createOpenTuiApp } = await import('./opentui');
        const { ProgressDashboard } = await import('../progress/views/dashboard');
        return createOpenTuiApp(
          () =>
            ProgressDashboard({
              onQuit: () => this.options?.onQuit(),
              onCancel: () => this.options?.onCancel(),
              onSwitchView: () => this.toggle(),
              onRenderError: (error) => this.options?.onRenderError(error)
            }),
          { screenMode: 'alternate-screen', useMouse: true, releaseStdinOnDestroy: false }
        );
      },
      {
        onStartError: (error) => {
          if (!this.active) return;
          this.currentView = 'stream';
          this.stream.start(this.replayCursor);
          this.options?.onRenderError(error);
        }
      }
    );
  }

  private runExclusive<T>(run: () => Promise<T>): Promise<T> {
    const task = this.transition.then(run);
    this.transition = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  private async releaseInputForLease() {
    const drain = () => {};
    try {
      // Keep raw mode while late terminal capability replies arrive, otherwise
      // the line discipline echoes them into the child's transcript.
      process.stdin.on('data', drain);
      process.stdin.resume();
      await new Promise((resolve) => setTimeout(resolve, 75));
      while (process.stdin.read() !== null) {}
    } catch {
    } finally {
      try {
        process.stdin.off('data', drain);
        if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.unref();
      } catch {}
    }
  }
}
