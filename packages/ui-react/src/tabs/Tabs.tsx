import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export type TabValue = string | number;

export type Tab<Value extends TabValue = TabValue> = {
  value: Value;
  label: ReactNode;
  compactLabel?: ReactNode;
  icon?: ReactNode;
  suffix?: ReactNode;
  disabled?: boolean;
  title?: string;
  panelId?: string;
};

export type TabsProps<Value extends TabValue> = {
  tabs: readonly Tab<Value>[];
  value: Value;
  onValueChange?: (value: NoInfer<Value>) => void;
  ariaLabel: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  appearance?: 'editor' | 'segmented' | 'underline';
  orientation?: 'horizontal' | 'vertical';
  width?: 'fill' | 'fit';
  size?: 'small' | 'medium';
  disabled?: boolean;
};

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

type IndicatorGeometry = {
  height: number;
  left: number;
  ready: boolean;
  top: number;
  width: number;
};

const hiddenIndicator: IndicatorGeometry = { height: 0, left: 0, ready: false, top: 0, width: 0 };

/**
 * Controlled, accessible navigation between sibling views.
 *
 * This component owns tab semantics, focus movement and the common Stacktape appearance. The host
 * owns the selected value and the panels themselves, which keeps Tabs useful in a page, a form, or
 * the configuration editor without teaching it any of those products.
 */
export function Tabs<const Value extends TabValue>({
  tabs,
  value,
  onValueChange,
  ariaLabel,
  id,
  className,
  style,
  appearance = 'segmented',
  orientation = 'horizontal',
  width = 'fill',
  size = 'medium',
  disabled = false
}: TabsProps<Value>) {
  const generatedId = useId();
  const tabsId = id ?? `stacktape-tabs-${generatedId}`;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState<IndicatorGeometry>(hiddenIndicator);
  const activeIndex = tabs.findIndex((tab) => tab.value === value);
  const hasSlidingIndicator = appearance !== 'underline' && activeIndex >= 0;

  const updateIndicator = useCallback(() => {
    const activeButton = buttonRefs.current[activeIndex];
    if (!hasSlidingIndicator || !activeButton) {
      setIndicator((current) => (current.ready ? hiddenIndicator : current));
      return;
    }

    const next: IndicatorGeometry = {
      height: activeButton.offsetHeight,
      left: activeButton.offsetLeft,
      ready: true,
      top: activeButton.offsetTop,
      width: activeButton.offsetWidth
    };
    setIndicator((current) =>
      current.height === next.height &&
      current.left === next.left &&
      current.ready === next.ready &&
      current.top === next.top &&
      current.width === next.width
        ? current
        : next
    );
  }, [activeIndex, hasSlidingIndicator]);

  useLayoutEffect(() => {
    buttonRefs.current.length = tabs.length;
    updateIndicator();
  }, [tabs.length, updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  useEffect(() => {
    if (!hasSlidingIndicator || typeof ResizeObserver === 'undefined') return;

    const list = listRef.current;
    const activeButton = buttonRefs.current[activeIndex];
    if (!list || !activeButton) return;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(list);
    observer.observe(activeButton);
    return () => observer.disconnect();
  }, [activeIndex, hasSlidingIndicator, updateIndicator]);

  const selectAndFocus = (index: number) => {
    if (tabs.length === 0) return;

    for (let offset = 0; offset < tabs.length; offset += 1) {
      const candidateIndex = (index + offset + tabs.length) % tabs.length;
      const candidate = tabs[candidateIndex];
      if (candidate && !candidate.disabled) {
        buttonRefs.current[candidateIndex]?.focus();
        onValueChange?.(candidate.value);
        return;
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const previousKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

    if (![previousKey, nextKey, 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    if (event.key === 'Home') {
      selectAndFocus(0);
    } else if (event.key === 'End') {
      selectAndFocus(tabs.length - 1);
    } else {
      selectAndFocus(index + (event.key === nextKey ? 1 : -1));
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div
      className={classes(
        'stp-ui-tabs',
        `stp-ui-tabs--${appearance}`,
        `stp-ui-tabs--${orientation}`,
        `stp-ui-tabs--${width}`,
        `stp-ui-tabs--${size}`,
        disabled && 'stp-ui-tabs--disabled',
        className
      )}
      style={style}
    >
      <div
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className="stp-ui-tabs__list"
        ref={listRef}
        role="tablist"
      >
        {hasSlidingIndicator ? (
          <span
            aria-hidden="true"
            className="stp-ui-tabs__indicator"
            style={{
              height: indicator.height,
              left: indicator.left,
              opacity: indicator.ready ? 1 : 0,
              top: indicator.top,
              width: indicator.width
            }}
          />
        ) : null}
        {tabs.map((tab, index) => {
          const isActive = tab.value === value;
          const tabId = `${tabsId}-tab-${String(tab.value)}`;

          return (
            <button
              aria-controls={tab.panelId}
              aria-selected={isActive}
              className={classes('stp-ui-tab', isActive && 'stp-ui-tab--active')}
              disabled={disabled || tab.disabled}
              id={tabId}
              key={tab.value}
              onClick={() => onValueChange?.(tab.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={isActive || (activeIndex < 0 && index === 0) ? 0 : -1}
              title={tab.title}
              type="button"
            >
              {tab.icon && (
                <span aria-hidden="true" className="stp-ui-tab__icon">
                  {tab.icon}
                </span>
              )}
              <span className={classes('stp-ui-tab__label', Boolean(tab.compactLabel) && 'stp-ui-tab__label--full')}>
                {tab.label}
              </span>
              {tab.compactLabel && (
                <span className="stp-ui-tab__label stp-ui-tab__label--compact">{tab.compactLabel}</span>
              )}
              {tab.suffix}
            </button>
          );
        })}
      </div>
    </div>
  );
}
