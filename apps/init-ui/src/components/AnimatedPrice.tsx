import { useEffect, useRef, useState } from 'react';

const parse = (text: string): number | undefined => {
  const match = /\$([\d,]+(?:\.\d+)?)/.exec(text);
  return match === null ? undefined : Number(match[1]!.replaceAll(',', ''));
};

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * A monthly price that counts to its new value when a choice changes it, so the change is seen rather than missed.
 *
 * The text arrives formatted ("$31/mo + usage"); only its first dollar amount moves, the rest is kept as written.
 */
export function AnimatedPrice({
  text,
  className,
  title,
  countFromZero = false
}: {
  text: string;
  className?: string;
  title?: string;
  /** A first amount after a text without one ("estimating…") counts up from $0 instead of appearing. */
  countFromZero?: boolean;
}) {
  const target = parse(text);
  const [shown, setShown] = useState(target);
  const [changed, setChanged] = useState(false);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current ?? (countFromZero && target !== undefined ? 0 : undefined);
    previous.current = target;
    if (target === undefined || from === undefined || from === target || reducedMotion()) {
      setShown(target);
      return;
    }
    setChanged(true);
    const started = performance.now();
    const duration = 650;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const settle = setTimeout(() => setChanged(false), 900);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [target, countFromZero]);

  const amount = /\$[\d,]+(?:\.\d+)?/.exec(text)?.[0];
  const rest = amount === undefined ? text : text.slice(text.indexOf(amount) + amount.length);
  const decimals = amount?.includes('.') === true ? 2 : 0;
  return (
    <span className={`${className ?? ''}${changed ? ' is-changed' : ''}`} title={title}>
      {amount === undefined || shown === undefined ? (
        text
      ) : (
        <>
          {`$${shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`}
          <small>{rest.trim()}</small>
        </>
      )}
    </span>
  );
}
