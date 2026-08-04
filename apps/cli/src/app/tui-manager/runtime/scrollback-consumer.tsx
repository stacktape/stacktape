import type { CliRenderer } from '@opentui/core';
import { writeSolidToScrollback } from '@opentui/solid';
import type { JSX } from 'solid-js';
import { tuiDebug } from '../debug';
import type { ScrollbackQueue } from './scrollback';

/**
 * Streams feed items into the terminal scrollback above the split-footer.
 * Returns a detach function (called on renderer destroy so late items fall
 * back to the plain-text exit path instead of being lost).
 */
export const attachScrollbackConsumer = <TItem,>(
  renderer: CliRenderer,
  feed: ScrollbackQueue<TItem>,
  renderItem: (props: { item: TItem; width: number }) => JSX.Element
): (() => void) => {
  return feed.setConsumer((item) => {
    try {
      writeSolidToScrollback(renderer, (ctx) => renderItem({ item, width: ctx.width }));
    } catch (err) {
      tuiDebug('SCROLLBACK', 'writeSolidToScrollback failed', { message: (err as Error)?.message });
    }
  });
};
