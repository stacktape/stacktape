import type { CliRenderer } from '@opentui/core';
import type { JSX } from 'solid-js';
import { tuiDebug } from './tui-debug-log';

let rendererInstance: CliRenderer | null = null;

export type OpenTuiHandle = {
  renderer: CliRenderer;
  destroy: () => Promise<void>;
  suspend: () => void;
  resume: () => void;
};

/**
 * Creates an OpenTUI app using the Solid reconciler.
 *
 * Uses @opentui/solid's render() with a config object so the renderer is created
 * internally by the solid package (avoids CliRenderer type mismatch between
 * separately installed @opentui/core and @opentui/solid's bundled copy).
 *
 * Previous React workarounds (documented for reference if issues resurface):
 * - stdin.pause()/unref(): OpenTUI may leave stdin resumed after destroy, keeping event loop alive
 * - renderer.idle() with 500ms timeout: deferred finalizeDestroy() when render cycle in progress
 * - Windows alt-screen double-exit: writing \x1B[?1049l after successful destroy moves cursor wrong
 */
export const createOpenTuiApp = async (
  component: () => JSX.Element,
  options?: { useMouse?: boolean }
): Promise<OpenTuiHandle> => {
  tuiDebug('RENDERER', 'createOpenTuiApp() begin');
  const { render } = await import('@opentui/solid');
  const { useRenderer } = await import('@opentui/solid');

  // Let @opentui/solid create the renderer internally via config object.
  // We capture the renderer instance through a wrapper component.
  let capturedRenderer: CliRenderer | null = null;

  const RendererCapture = () => {
    capturedRenderer = useRenderer() as unknown as CliRenderer;
    return component();
  };

  await render(RendererCapture, {
    exitOnCtrlC: false,
    useAlternateScreen: true,
    useMouse: options?.useMouse ?? false,
    targetFps: 30,
    exitSignals: []
  });
  tuiDebug('RENDERER', 'render() called');

  rendererInstance = capturedRenderer;

  return {
    renderer: capturedRenderer!,
    destroy: async () => {
      tuiDebug('RENDERER', 'handle.destroy() called');
      try {
        capturedRenderer?.destroy();
      } catch {}
      try {
        if (capturedRenderer) {
          await Promise.race([capturedRenderer.idle(), new Promise<void>((resolve) => setTimeout(resolve, 500))]);
        }
      } catch {}
      try {
        if (process.stdin.isTTY) {
          process.stdin.pause();
          process.stdin.unref();
        }
      } catch {}
      rendererInstance = null;
      capturedRenderer = null;
      tuiDebug('RENDERER', 'handle.destroy() complete');
    },
    suspend: () => {
      tuiDebug('RENDERER', 'handle.suspend()');
      try {
        capturedRenderer?.suspend();
      } catch {}
    },
    resume: () => {
      tuiDebug('RENDERER', 'handle.resume()');
      try {
        capturedRenderer?.resume();
      } catch {}
    }
  };
};

export const getActiveRenderer = (): CliRenderer | null => rendererInstance;
