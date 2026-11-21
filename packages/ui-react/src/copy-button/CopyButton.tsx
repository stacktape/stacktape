import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ButtonVariant } from '../button/Button.js';
import { Button } from '../button/Button.js';
import { IconButton } from '../icon-button/IconButton.js';
import { Tooltip, type TooltipPlacement } from '../tooltip/Tooltip.js';

/** What gets copied: the text itself, or a function that loads it on click (a secret, a generated handoff). */
export type CopySource = string | (() => Promise<string>);

export type CopyState = 'idle' | 'loading' | 'copied' | 'failed';

/** How long the check mark (or the failure cross) stays before the copy icon comes back. */
export const COPY_FEEDBACK_MS = 1500;

/** What a person does when the browser refuses the clipboard. */
export const CLIPBOARD_BLOCKED = 'The browser blocked the clipboard. Select the text and copy it with Ctrl+C or Cmd+C.';

/**
 * Puts text on the clipboard. The async clipboard API first; where a browser refuses it (an insecure origin, an old
 * engine), a selected temporary field and `copy`. Focus goes back where it was, so the next Tab does not start at the
 * page's top. False when both are refused.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    // Fixed, so selecting it never scrolls the page.
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
      focused?.focus({ preventScroll: true });
    }
  }
};

/**
 * Copies on demand and holds the outcome for {@link COPY_FEEDBACK_MS}. A refused clipboard or a value that fails to load
 * is a designed state: the icon becomes a cross, and `onFailure` hears why so the host can say how to copy by hand.
 */
export function useCopy(source: CopySource, onFailure?: (message: string) => void) {
  const [state, setState] = useState<CopyState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const settle = (next: 'copied' | 'failed') => {
    setState(next);
    resetTimer.current = setTimeout(() => setState('idle'), COPY_FEEDBACK_MS);
  };

  const copy = async () => {
    clearTimeout(resetTimer.current);
    if (typeof source !== 'string') setState('loading');
    let text: string;
    try {
      text = typeof source === 'string' ? source : await source();
    } catch {
      onFailure?.("Couldn't load the value to copy. Try again.");
      return settle('failed');
    }
    if (await copyToClipboard(text)) return settle('copied');
    onFailure?.(CLIPBOARD_BLOCKED);
    settle('failed');
  };

  return { state, copy };
}

const COPY_ICON = (
  <>
    <rect height="12" rx="1.5" width="12" x="3" y="9" />
    <path d="M9 9V4.5A1.5 1.5 0 0 1 10.5 3h9A1.5 1.5 0 0 1 21 4.5v9a1.5 1.5 0 0 1-1.5 1.5H15" />
  </>
);
const CHECK_ICON = <path d="M5.5 12.5l4.5 4.5 9-9" />;
const CROSS_ICON = <path d="M7 7l10 10M17 7 7 17" />;

/**
 * The copy icon, and the check mark (or cross) it turns into. All three are drawn, stacked, and the one for the state
 * scales and fades in, so the change reads as one icon turning into another.
 */
export function CopyStateIcon({ state, size = 16 }: { state: CopyState; size?: number }) {
  const shown = state === 'copied' ? 'copied' : state === 'failed' ? 'failed' : 'idle';
  const glyph = (name: 'idle' | 'copied' | 'failed', paths: ReactNode) => (
    <svg
      aria-hidden
      className="stp-ui-copy-icon__glyph"
      data-shown={shown === name || undefined}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths}
    </svg>
  );
  return (
    <span className="stp-ui-copy-icon" data-copy-state={state} style={{ width: size, height: size }}>
      {glyph('idle', COPY_ICON)}
      {glyph('copied', CHECK_ICON)}
      {glyph('failed', CROSS_ICON)}
    </span>
  );
}

/** Tells screen readers what happened; the button's own name stays "Copy …". */
export function CopyAnnouncement({ state }: { state: CopyState }) {
  return (
    <output aria-live="polite" className="stp-ui-visually-hidden">
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : ''}
    </output>
  );
}

/**
 * A labelled copy button. The label changes to `copiedLabel` while the check mark shows. Both labels share one grid
 * cell, so the button keeps the width of the longer one instead of jumping. A failure keeps the label: the cross and
 * `onFailure` explain it.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  ariaLabel,
  variant = 'secondary',
  iconSize = 16,
  className,
  onFailure
}: {
  value: CopySource;
  label?: string;
  copiedLabel?: string;
  /** The accessible name when the label alone does not say what is copied: "Copy the deploy command". */
  ariaLabel?: string;
  variant?: ButtonVariant;
  iconSize?: number;
  className?: string;
  onFailure?: (message: string) => void;
}) {
  const { state, copy } = useCopy(value, onFailure);
  return (
    <>
      <Button
        {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
        className={['stp-ui-copy-button', className].filter(Boolean).join(' ')}
        icon={<CopyStateIcon size={iconSize} state={state} />}
        isLoading={state === 'loading'}
        onClick={() => void copy()}
        variant={variant}
      >
        <span className="stp-ui-copy-button__label" data-reserved={state === 'copied' ? label : copiedLabel}>
          <span>{state === 'copied' ? copiedLabel : label}</span>
        </span>
      </Button>
      <CopyAnnouncement state={state} />
    </>
  );
}

/**
 * An icon-only copy button. Its tooltip follows the state (Copy, Copied, or how to copy by hand); its accessible name
 * stays `label`.
 */
export function CopyIconButton({
  value,
  label,
  tooltip = 'Copy',
  tooltipPlacement = 'top',
  size = 28,
  iconSize = 16,
  variant = 'plain',
  className,
  onFailure
}: {
  value: CopySource;
  /** The accessible name, such as "Copy the deploy command". */
  label: string;
  /** `null` for no tooltip, where the icon alone is enough and a tooltip would cover what it copies. */
  tooltip?: string | null;
  tooltipPlacement?: TooltipPlacement;
  size?: number;
  iconSize?: number;
  variant?: ButtonVariant;
  className?: string;
  onFailure?: (message: string) => void;
}) {
  const [failure, setFailure] = useState<string | undefined>();
  const { state, copy } = useCopy(value, (message) => {
    setFailure(message);
    onFailure?.(message);
  });
  const button = (
    <IconButton
      className={['stp-ui-copy-button', className].filter(Boolean).join(' ')}
      icon={<CopyStateIcon size={iconSize} state={state} />}
      label={label}
      onClick={() => void copy()}
      size={size}
      variant={variant}
    />
  );
  return (
    <>
      {tooltip === null ? (
        button
      ) : (
        <Tooltip
          content={state === 'copied' ? 'Copied' : state === 'failed' ? (failure ?? 'Copy failed') : tooltip}
          hideOnClick={false}
          placement={tooltipPlacement}
        >
          {button}
        </Tooltip>
      )}
      <CopyAnnouncement state={state} />
    </>
  );
}
