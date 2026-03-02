import type { CliRenderer } from '@opentui/core';
import type { Root } from '@opentui/react';
import type { ReactNode } from 'react';
import { tuiDebug } from './tui-debug-log';

let rendererInstance: CliRenderer | null = null;
let rootInstance: Root | null = null;

export type OpenTuiHandle = {
  renderer: CliRenderer;
  root: Root;
  destroy: () => Promise<void>;
  suspend: () => void;
  resume: () => void;
};

export const createOpenTuiApp = async (element: ReactNode): Promise<OpenTuiHandle> => {
  tuiDebug('RENDERER', 'createOpenTuiApp() begin');
  const { createCliRenderer } = await import('@opentui/core');
  const { createRoot } = await import('@opentui/react');

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    useAlternateScreen: true,
    useMouse: false,
    enableMouseMovement: false,
    targetFps: 30,
    maxFps: 60,
    // Disable OpenTUI's own signal handlers — Stacktape manages process lifecycle
    // (applicationManager handles SIGINT/SIGTERM/etc. and calls destroyOpenTui explicitly)
    exitSignals: []
  });
  tuiDebug('RENDERER', 'createCliRenderer() complete');

  rendererInstance = renderer;
  const root = createRoot(renderer);
  rootInstance = root;
  root.render(element);
  tuiDebug('RENDERER', 'root.render() called');

  return {
    renderer,
    root,
    destroy: async () => {
      tuiDebug('RENDERER', 'handle.destroy() called');
      try {
        root.unmount();
      } catch {}
      try {
        renderer.destroy();
      } catch {}
      // renderer.destroy() may defer finalizeDestroy() if a render cycle is in progress.
      // Wait for the renderer to become idle (i.e. finalizeDestroy has completed) before
      // returning, so callers can safely write to stdout after this resolves.
      try {
        await Promise.race([renderer.idle(), new Promise<void>((resolve) => setTimeout(resolve, 500))]);
      } catch {}
      // OpenTUI calls stdin.resume() during setupInput() but never calls stdin.unref()
      // during finalizeDestroy(). The resumed stdin handle keeps the event loop alive,
      // preventing the process from exiting after a successful deploy.
      try {
        if (process.stdin.isTTY) {
          process.stdin.pause();
          process.stdin.unref();
        }
      } catch {}
      rendererInstance = null;
      rootInstance = null;
      tuiDebug('RENDERER', 'handle.destroy() complete');
    },
    suspend: () => {
      tuiDebug('RENDERER', 'handle.suspend()');
      try {
        renderer.suspend();
      } catch {}
    },
    resume: () => {
      tuiDebug('RENDERER', 'handle.resume()');
      try {
        renderer.resume();
      } catch {}
    }
  };
};

export const getActiveRenderer = (): CliRenderer | null => rendererInstance;
export const getActiveRoot = (): Root | null => rootInstance;
