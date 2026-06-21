import type { CliRenderer, ScreenMode } from '@opentui/core';
import type { JSX } from 'solid-js';
import { setDetectedThemeMode } from './context/theme';
import { tuiDebug } from './tui-debug-log';

// Stacktape owns global console routing (ConsoleInterceptor + output router).
// Without this, OpenTUI replaces global.console with its own capture on renderer
// creation. Must be set before any @opentui module is evaluated — all @opentui
// imports in this codebase go through this module (or are type-only).
process.env.OTUI_USE_CONSOLE = 'false';

export type OpenTuiHandle = {
  renderer: CliRenderer;
  destroy: () => Promise<void>;
  suspend: () => void;
  resume: () => void;
};

type OpenTuiAppOptions = {
  screenMode?: ScreenMode;
  footerHeight?: number;
  useMouse?: boolean;
  /**
   * Re-emit every cell on each frame. The native cell-diff engine skips unchanged
   * cells, which drops OSC 8 hyperlink sequences and makes links non-clickable.
   * Relies on renderer internals — silently degrades to default diffing when the
   * internals change shape.
   */
  forceFullRenders?: boolean;
  releaseStdinOnDestroy?: boolean;
};

const enableForceFullRenders = (renderer: CliRenderer) => {
  const lib = (renderer as any).lib;
  const ptr = (renderer as any).rendererPtr;
  if (!lib?.render || !ptr) return;
  (renderer as any).renderNative = function (this: any) {
    if (this.renderingNative) throw new Error('Rendering called concurrently');
    this.renderingNative = true;
    try {
      lib.render(ptr, true);
    } finally {
      this.renderingNative = false;
    }
  };
};

export const createOpenTuiApp = async (
  component: () => JSX.Element,
  options?: OpenTuiAppOptions
): Promise<OpenTuiHandle> => {
  tuiDebug('RENDERER', 'createOpenTuiApp() begin');
  const { render, useRenderer } = await import('@opentui/solid');

  // render() creates the renderer internally from the config object; capture the
  // instance through a wrapper component so the handle can drive it afterwards.
  let capturedRenderer: CliRenderer | null = null;

  const RendererCapture = () => {
    capturedRenderer = useRenderer() as unknown as CliRenderer;
    return component();
  };

  await render(RendererCapture, {
    exitOnCtrlC: false,
    exitSignals: [],
    screenMode: options?.screenMode ?? 'alternate-screen',
    ...(options?.footerHeight !== undefined && { footerHeight: options.footerHeight }),
    consoleMode: 'disabled',
    useMouse: options?.useMouse ?? false,
    targetFps: 60
  });
  tuiDebug('RENDERER', 'render() called');

  if (capturedRenderer && options?.forceFullRenders) {
    enableForceFullRenders(capturedRenderer);
  }

  // Detect the terminal's light/dark scheme so the theme picks the right palette.
  // themeMode may be null until the terminal reports back, so also subscribe and
  // poll briefly; ThemeProvider repaints reactively when it lands.
  if (capturedRenderer) {
    try {
      if (capturedRenderer.themeMode) setDetectedThemeMode(capturedRenderer.themeMode);
      capturedRenderer.on('theme_mode', (mode) => setDetectedThemeMode(mode));
      void capturedRenderer
        .waitForThemeMode(1000)
        .then((mode) => mode && setDetectedThemeMode(mode))
        .catch(() => {});
    } catch {}
  }

  return {
    renderer: capturedRenderer!,
    destroy: async () => {
      tuiDebug('RENDERER', 'handle.destroy() called');
      try {
        capturedRenderer?.destroy();
      } catch {}
      try {
        if (capturedRenderer) {
          // destroy() may defer finalization while a render cycle is in flight;
          // wait for idle (bounded) so the screen mode is fully exited before
          // callers write plain text to the terminal.
          await Promise.race([capturedRenderer.idle(), new Promise<void>((resolve) => setTimeout(resolve, 500))]);
        }
      } catch {}
      if (options?.releaseStdinOnDestroy ?? true) {
        try {
          if (process.stdin.isTTY) {
            if (process.stdin.isRaw) process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.unref();
          }
        } catch {}
      }
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
