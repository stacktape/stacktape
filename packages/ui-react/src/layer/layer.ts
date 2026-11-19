import { useEffect, useRef } from 'react';

/**
 * What floats over the page and closes with Escape: `modal` (a dialog, a full-screen chart), `popup` (a menu, a picker,
 * a popover) and `hint` (a tooltip).
 */
export type LayerKind = 'modal' | 'popup' | 'hint';

type Layer = { kind: LayerKind; close: () => void };

/** Open layers, innermost last. */
const layers: Layer[] = [];

// One listener for every layer, so one Escape closes exactly one: the innermost. A control that handles Escape itself
// while something of its own is open (the shared `Select`'s list) stops the key there, and no layer sees it.
const onKeyDown = (event: KeyboardEvent) => {
  const innermost = layers.at(-1);
  if (event.key !== 'Escape' || event.isComposing || !innermost) return;
  event.preventDefault();
  innermost.close();
};

/** Opens a layer that Escape closes while it is the innermost one. Returns the function that removes it. */
export function openLayer(kind: LayerKind, close: () => void): () => void {
  const layer = { kind, close };
  if (!layers.length) document.addEventListener('keydown', onKeyDown);
  layers.push(layer);
  return () => {
    const index = layers.indexOf(layer);
    if (index < 0) return;
    layers.splice(index, 1);
    if (!layers.length) document.removeEventListener('keydown', onKeyDown);
  };
}

/** Whether a layer of this kind is open. Page shortcuts stand aside while a modal or popup layer is. */
export const isLayerOpen = (kind: LayerKind) => layers.some((layer) => layer.kind === kind);

/**
 * Keeps a layer open while `open` is true. Returns whether this layer is the innermost of its kind, which a dialog asks
 * before it keeps Tab inside itself: a dialog under another dialog leaves the keys to the one on top.
 */
export function useLayer(open: boolean, kind: LayerKind, close: () => void): () => boolean {
  const closeRef = useRef(close);
  closeRef.current = close;
  const layerRef = useRef<Layer | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const remove = openLayer(kind, () => closeRef.current());
    layerRef.current = layers.at(-1) ?? null;
    return () => {
      remove();
      layerRef.current = null;
    };
  }, [open, kind]);

  return () => !!layerRef.current && layers.findLast((layer) => layer.kind === kind) === layerRef.current;
}
