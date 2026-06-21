import type { CliRenderer } from '@opentui/core';
import { writeSolidToScrollback } from '@opentui/solid';
import { devScrollbackFeed } from './dev-tui/dev-scrollback-feed';
import { scrollbackFeed } from './scrollback-feed';
import { tuiDebug } from './tui-debug-log';
import { ScrollbackItemView } from './routes/deploy/scrollback-view';
import { DevScrollbackItemView } from './routes/dev/dev-scrollback-view';

/**
 * Streams scrollback-feed items into the terminal scrollback above the
 * split-footer. Returns a detach function (called on renderer destroy so
 * late items fall back to the plain-text exit path instead of being lost).
 */
export const attachScrollbackConsumer = (renderer: CliRenderer): (() => void) => {
  return scrollbackFeed.setConsumer((item) => {
    try {
      writeSolidToScrollback(renderer, (ctx) => <ScrollbackItemView item={item} width={ctx.width} />);
    } catch (err) {
      tuiDebug('SCROLLBACK', 'writeSolidToScrollback failed', { message: (err as Error)?.message });
    }
  });
};

export const attachDevScrollbackConsumer = (renderer: CliRenderer): (() => void) => {
  return devScrollbackFeed.setConsumer((item) => {
    try {
      writeSolidToScrollback(renderer, (ctx) => <DevScrollbackItemView item={item} width={ctx.width} />);
    } catch (err) {
      tuiDebug('SCROLLBACK', 'dev writeSolidToScrollback failed', { message: (err as Error)?.message });
    }
  });
};
