import type { CliRenderer } from '@opentui/core';
import { tuiDebug } from '../debug';
import type { OpenTuiHandle } from './opentui';

type RuntimePhase = 'idle' | 'starting' | 'active' | 'stopping';

type StartOptions = {
  /** Runs once the renderer is mounted. May return a cleanup invoked during stop. */
  onReady?: (renderer: CliRenderer) => void | (() => void);
  /** Mount failed (dynamic import or renderer creation). The runtime is back at idle. */
  onStartError?: (error: Error) => void;
};

/**
 * Owns the OpenTUI renderer lifecycle for one mounted app at a time.
 *
 * The renderer mounts asynchronously (dynamic imports + terminal setup), while
 * commands may stop at any moment — including before the mount finishes. All
 * transitions run through one guarded state machine:
 *
 *   idle → starting → active → stopping → idle
 *
 * `stop()` during `starting` waits (bounded) for the in-flight mount and then
 * destroys whatever it produced, so no orphaned renderer keeps the terminal in
 * a modified state. After a completed stop the runtime returns to idle and can
 * mount again (the dev command mounts the progress app, stops it, then mounts
 * the dev dashboard in the same process).
 */
export class TtyRuntime {
  private phase: RuntimePhase = 'idle';
  private handle: OpenTuiHandle | null = null;
  private startPromise: Promise<void> | null = null;
  private readyCleanup: (() => void) | null = null;
  private _windowFocused = true;

  get renderer(): CliRenderer | null {
    return this.handle?.renderer ?? null;
  }

  get isActive(): boolean {
    return this.phase === 'active';
  }

  get isMountingOrActive(): boolean {
    return this.phase === 'starting' || this.phase === 'active';
  }

  get windowFocused(): boolean {
    return this._windowFocused;
  }

  start(mount: () => Promise<OpenTuiHandle>, options: StartOptions = {}) {
    if (this.phase !== 'idle') {
      tuiDebug('RUNTIME', 'start() ignored — not idle', { phase: this.phase });
      return;
    }
    this.phase = 'starting';
    this._windowFocused = true;
    tuiDebug('RUNTIME', 'start() begin');

    this.startPromise = mount()
      .then((handle) => {
        // Stop arrived while the mount was in flight — tear the fresh renderer
        // down immediately instead of leaving an orphaned alternate screen.
        if (this.phase !== 'starting') {
          tuiDebug('RUNTIME', 'start() post-mount bail — destroying handle', { phase: this.phase });
          return handle.destroy().catch(() => {});
        }
        this.handle = handle;
        this.phase = 'active';
        try {
          handle.renderer.on('focus', () => {
            this._windowFocused = true;
          });
          handle.renderer.on('blur', () => {
            this._windowFocused = false;
          });
        } catch {}
        const cleanup = options.onReady?.(handle.renderer);
        if (typeof cleanup === 'function') this.readyCleanup = cleanup;
        tuiDebug('RUNTIME', 'start() complete — active');
      })
      .catch((err) => {
        tuiDebug('RUNTIME', 'start() failed', { message: err?.message, stack: err?.stack });
        if (this.phase === 'starting') this.phase = 'idle';
        options.onStartError?.(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        this.startPromise = null;
      });
  }

  /**
   * Tears the renderer down and returns to idle. Idempotent; safe to call from
   * any phase. Resolves with whether a renderer was actually destroyed cleanly
   * (callers use this to decide on manual cursor restore).
   */
  async stop(): Promise<{ rendererDestroyed: boolean }> {
    if (this.phase === 'idle') return { rendererDestroyed: false };
    if (this.phase === 'stopping') {
      // A concurrent stop is already tearing down; wait for it to settle.
      await this.waitForIdle(3500);
      return { rendererDestroyed: false };
    }
    const wasStarting = this.phase === 'starting';
    this.phase = 'stopping';
    tuiDebug('RUNTIME', 'stop()', { wasStarting });

    if (this.startPromise) {
      // Bounded: dynamic imports can hang in broken environments; never block exit.
      await Promise.race([this.startPromise, new Promise<void>((resolve) => setTimeout(resolve, 3000))]).catch(
        () => {}
      );
    }

    let rendererDestroyed = false;
    if (this.handle) {
      try {
        await this.handle.destroy();
        rendererDestroyed = true;
      } catch {}
      this.handle = null;
    }
    this.runReadyCleanup();
    this.phase = 'idle';
    tuiDebug('RUNTIME', 'stop() complete', { rendererDestroyed });
    return { rendererDestroyed };
  }

  /**
   * Synchronous-context teardown for crash/signal handlers that cannot await.
   * The destroy is fire-and-forget; callers must restore the terminal
   * synchronously themselves (see forceRestoreTerminal).
   */
  stopSync() {
    if (this.phase === 'idle' || this.phase === 'stopping') return;
    tuiDebug('RUNTIME', 'stopSync()');
    this.phase = 'stopping';
    const handle = this.handle;
    this.handle = null;
    this.runReadyCleanup();
    void (async () => {
      if (this.startPromise) {
        await Promise.race([this.startPromise, new Promise<void>((resolve) => setTimeout(resolve, 3000))]).catch(
          () => {}
        );
      }
      const lateHandle = this.handle;
      this.handle = null;
      try {
        await handle?.destroy();
        await lateHandle?.destroy();
      } catch {}
      this.phase = 'idle';
    })();
  }

  suspend() {
    this.handle?.suspend();
  }

  resume() {
    this.handle?.resume();
  }

  private runReadyCleanup() {
    try {
      this.readyCleanup?.();
    } catch {}
    this.readyCleanup = null;
  }

  private async waitForIdle(timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    while (this.phase !== 'idle' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

/**
 * Synchronous terminal restore for crash/signal paths that cannot await the
 * renderer teardown: disables mouse tracking, shows the cursor, and resets the
 * cursor shape and raw mode. Safe to call when the renderer already cleaned up.
 */
export const forceRestoreTerminal = () => {
  try {
    process.stdout.write('\x1B[?1000l\x1B[?1002l\x1B[?1003l\x1B[?1006l\x1B[?1015l\x1B[?25h\x1B[0 q');
  } catch {}
  try {
    if (process.stdin.isTTY && process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
  } catch {}
};
