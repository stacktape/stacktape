import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useId, useRef } from 'react';

/**
 * A choice between a small number of options, each of which needs explaining.
 *
 * A radio list is right when the options are words. It stops being right the moment each option
 * needs a sentence, a price and an icon to be chosen honestly — which is exactly the situation the
 * onboarding wizard is in. "Which agent?" and "is this going live?" are decisions someone should be
 * able to make from what is on the card, without opening documentation.
 *
 * It wears the same surface as a secondary button on purpose. These *are* pressable things, and the
 * package's one-material rule says a card, a select and a button differ in fill and size, never in
 * how they catch the light. Anything that reads as "a thing you can press" is built from the same
 * recipe, so a row containing all three does not look like three products.
 *
 * Semantics are a real radio group: arrow keys move between options, only the selected card is in
 * the tab order, and the description is announced with the option rather than orphaned beside it.
 */

const classes = (...values: Array<string | false | null | undefined>): string => values.filter(Boolean).join(' ');

export type SelectionCardProps = {
  /** Distinguishes this option within its group. */
  value: string;
  /** The choice itself, in as few words as it takes. */
  title: ReactNode;
  /**
   * What choosing it means.
   *
   * Worth writing properly: this is where a consequence goes, and a consequence is the difference
   * between a decision and a guess.
   */
  description?: ReactNode;
  /** A logo or glyph. Purely decorative — the title carries the meaning. */
  icon?: ReactNode;
  /**
   * A short trailing fact: a price, a duration, a version.
   *
   * Kept separate from the description because it is scanned rather than read, and because it is
   * usually the thing being compared across the row.
   */
  meta?: ReactNode;
  /** Marks the option we would pick, rendered as a quiet flag rather than a shout. */
  isRecommended?: boolean;
  isSelected: boolean;
  /** Blocks selection. Say why in `description` — an unexplained dead option is worse than none. */
  isDisabled?: boolean;
  onSelect: (value: string) => void;
  className?: string;
  style?: CSSProperties;
};

export function SelectionCard({
  value,
  title,
  description,
  icon,
  meta,
  isRecommended = false,
  isSelected,
  isDisabled = false,
  onSelect,
  className,
  style
}: SelectionCardProps) {
  const generatedId = useId();
  const descriptionId = description === undefined ? undefined : `${generatedId}-description`;

  return (
    <div
      aria-checked={isSelected}
      aria-describedby={descriptionId}
      aria-disabled={isDisabled || undefined}
      className={classes(
        'stp-ui-selection-card',
        isSelected && 'stp-ui-selection-card--selected',
        isDisabled && 'stp-ui-selection-card--disabled',
        className
      )}
      data-value={value}
      onClick={isDisabled ? undefined : () => onSelect(value)}
      onKeyDown={(event) => {
        // Space and Enter activate, matching a native radio. Arrow keys are handled by the group,
        // which is the only place that knows what the neighbours are.
        if (isDisabled) return;
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          onSelect(value);
        }
      }}
      // A native radio input cannot carry a title, a description, a badge and a price and still be
      // styled as a card, so this implements the pattern in full instead: aria-checked above, roving
      // tabIndex below, Space/Enter here, and arrow keys owned by the group.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see above.
      role="radio"
      style={style}
      // Only the selected option is tabbable, so the group is one tab stop rather than four.
      tabIndex={isDisabled ? -1 : isSelected ? 0 : -1}
    >
      {icon !== undefined && (
        <span aria-hidden="true" className="stp-ui-selection-card__icon">
          {icon}
        </span>
      )}
      <span className="stp-ui-selection-card__body">
        <span className="stp-ui-selection-card__heading">
          <span className="stp-ui-selection-card__title">{title}</span>
          {isRecommended && <span className="stp-ui-selection-card__recommended">Recommended</span>}
        </span>
        {description !== undefined && (
          <span className="stp-ui-selection-card__description" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
      {meta !== undefined && <span className="stp-ui-selection-card__meta">{meta}</span>}
    </div>
  );
}

export type SelectionCardGroupProps = {
  /** Names the decision for a screen reader. The visible heading usually says the same thing. */
  ariaLabel: string;
  children: ReactNode;
  /** Ordered option values, so arrow keys know what comes next. */
  values: readonly string[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  /** `row` for two or three options, `column` when each needs more than a line. */
  direction?: 'row' | 'column';
  className?: string;
};

/**
 * Groups cards into one radio group.
 *
 * Arrow-key movement lives here rather than on the card because only the group knows the order, and
 * a keyboard user expects arrows to move *and select* in a radio group — which is also why moving
 * calls `onValueChange` rather than merely focusing.
 */
export function SelectionCardGroup({
  ariaLabel,
  children,
  values,
  value,
  onValueChange,
  direction = 'row',
  className
}: SelectionCardGroupProps) {
  const container = useRef<HTMLDivElement>(null);

  const move = useCallback(
    (offset: number) => {
      if (values.length === 0) return;
      const current = value === undefined ? -1 : values.indexOf(value);
      // Wraps, matching a native radio group.
      const next = values[(current + offset + values.length) % values.length]!;
      onValueChange(next);
      container.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next)}"]`)?.focus();
    },
    [onValueChange, value, values]
  );

  return (
    <div
      aria-label={ariaLabel}
      className={classes('stp-ui-selection-card-group', `stp-ui-selection-card-group--${direction}`, className)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(-1);
        }
      }}
      ref={container}
      role="radiogroup"
      // Not a tab stop — the selected card is, which is what a radio group should do. Focusable only
      // programmatically, so moving focus into the group from code lands somewhere real.
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
