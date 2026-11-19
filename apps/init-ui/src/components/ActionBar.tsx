import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { WizardState } from '../session';
import { splitMonthly } from '../steps/review-model';
import { AnimatedPrice } from './AnimatedPrice';
import { InfoTip } from './InfoTip';

/**
 * The bar along the bottom of Review and Deploy: the monthly price on the left, the step's actions on the right, and
 * one short note beside them (what the action does, or what still blocks it).
 *
 * It spans the window and stays put while the page scrolls. Its height, whatever the viewport makes of it, is kept in
 * `--w-bar-space` on the root, and every page with a bar reserves that much at the end of its scroll area, so the last
 * row of a page can always be scrolled clear of it.
 */
export function ActionBar({
  price,
  note,
  className,
  align = 'window',
  children
}: {
  price?: ReactNode;
  note?: ReactNode;
  /**
   * `is-blocked`: the action waits for something; on a phone the bar is then one compact row without the price.
   * `is-ready`: on a phone the bar is one row with the price and the button; the note is the page's to show.
   */
  className?: string | undefined;
  /** `column`: the content lines up with the form column above it (Deploy), so price, note and button read as one. */
  align?: 'window' | 'column';
  children: ReactNode;
}) {
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = bar.current;
    if (element === null) return;
    const root = document.documentElement;
    const measure = () =>
      root.style.setProperty('--w-bar-space', `${Math.ceil(element.getBoundingClientRect().height)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--w-bar-space');
    };
  }, []);
  return (
    <div
      className={['w-bar', align === 'column' ? 'is-column' : '', className ?? ''].filter(Boolean).join(' ')}
      ref={bar}
    >
      <div className="w-bar-inner">
        <div className="w-bar-price">{price}</div>
        <div className="w-bar-end">
          {note !== undefined && note !== null && note !== false && <div className="w-bar-note">{note}</div>}
          <div className="w-bar-actions">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * The price as the bar shows it: "$31 /month + usage", with what the estimate covers behind the help mark. A new
 * amount counts to its value, so a setting's effect on the price is seen.
 *
 * `amount` is undefined while there is no estimate; `pending` then says whether one is still coming.
 */
export function BarPrice({
  amount,
  suffix,
  help,
  pending = false
}: {
  amount: string | undefined;
  suffix?: string | undefined;
  help?: ReactNode;
  pending?: boolean;
}) {
  if (amount === undefined) {
    return (
      <span className="w-bar-amount">
        <small>{pending ? 'Pricing…' : 'Price unavailable offline'}</small>
      </span>
    );
  }
  return (
    <span aria-live="polite" className="w-bar-amount">
      <AnimatedPrice className="w-bar-figure" text={suffix === undefined ? amount : `${amount} ${suffix}`} />
      {help !== undefined && <InfoTip about="the price">{help}</InfoTip>}
    </span>
  );
}

/** The bar's price for this session's file: the fixed monthly amount, and what the estimate covers. */
export function MonthlyPrice({ state }: { state: WizardState }) {
  const price = state.composition?.price;
  if (price === undefined) {
    return <BarPrice amount={undefined} pending={state.composition?.priceUnavailable !== true} />;
  }
  const { amount, usage } = splitMonthly(price.monthly);
  return (
    <BarPrice
      amount={amount ?? price.monthly}
      help={
        <>
          AWS list prices in {price.region}, for what runs all month.
          {usage ? ' Traffic, requests and storage are billed on top, by use.' : ''}
        </>
      }
      suffix={amount === undefined ? undefined : `/month${usage ? ' + usage' : ''}`}
    />
  );
}
