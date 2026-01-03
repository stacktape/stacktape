/** @jsxImportSource @opentui/react */
import type { TuiSelectOption } from '../types';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { TextAttributes } from '@opentui/core';

type SelectInputProps = {
  options: TuiSelectOption[];
  onChange: (value: string) => void;
  /** Maximum number of visible options. Defaults to dynamic based on terminal height. */
  maxVisibleOptions?: number;
  /** Minimum number of visible options. Defaults to 5. */
  minVisibleOptions?: number;
};

type OptionItemProps = {
  option: TuiSelectOption;
  isSelected: boolean;
};

/** Memoized option item to prevent unnecessary re-renders */
const OptionItem = memo<OptionItemProps>(({ option, isSelected }) => (
  <box flexDirection="column">
    <box flexDirection="row">
      <text fg={isSelected ? 'cyan' : undefined}>{isSelected ? '> ' : '  '}</text>
      <text fg={isSelected ? 'cyan' : undefined}>{isSelected ? <strong>{option.label}</strong> : option.label}</text>
      {isSelected && option.description && <text fg="gray"> - {option.description}</text>}
    </box>
  </box>
));

OptionItem.displayName = 'OptionItem';

/**
 * Custom Select component with:
 * - Scroll indicators (up/down arrows)
 * - Dynamic height based on terminal size
 * - Keyboard navigation (up/down arrows, enter to select)
 */
export const SelectInput: React.FC<SelectInputProps> = ({
  options,
  onChange,
  maxVisibleOptions,
  minVisibleOptions = 5
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { height } = useTerminalDimensions();

  // Calculate visible options based on terminal height
  const visibleCount = useMemo(() => {
    if (maxVisibleOptions) return maxVisibleOptions;

    // Get terminal height, reserve space for other UI elements
    const terminalHeight = height || 24;
    // Reserve ~10 lines for header, prompt message, and other UI
    const availableLines = Math.max(minVisibleOptions, terminalHeight - 10);
    // Cap at the number of options or a reasonable maximum
    return Math.min(options.length, availableLines, 20);
  }, [height, options.length, maxVisibleOptions, minVisibleOptions]);

  // Calculate the window of visible options
  const { startIndex, endIndex, visibleOptions } = useMemo(() => {
    const halfWindow = Math.floor(visibleCount / 2);

    let start: number;
    if (selectedIndex <= halfWindow) {
      // Near the beginning
      start = 0;
    } else if (selectedIndex >= options.length - halfWindow - 1) {
      // Near the end
      start = Math.max(0, options.length - visibleCount);
    } else {
      // In the middle - center the selected item
      start = selectedIndex - halfWindow;
    }

    const end = Math.min(start + visibleCount, options.length);
    return {
      startIndex: start,
      endIndex: end,
      visibleOptions: options.slice(start, end)
    };
  }, [selectedIndex, visibleCount, options]);

  const canScrollUp = startIndex > 0;
  const canScrollDown = endIndex < options.length;

  // Memoized input handler
  const handleInput = useCallback(
    (key) => {
      if (!options.length) return;
      if (key.name === 'up' || key.name === 'k') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (key.name === 'down' || key.name === 'j') {
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (key.name === 'return') {
        onChange(options[selectedIndex].value);
      }
    },
    [options, selectedIndex, onChange]
  );

  useKeyboard(handleInput);

  return (
    <box flexDirection="column">
      {/* Scroll up indicator */}
      {canScrollUp && <text fg="gray"> ^ {startIndex} more above</text>}

      {/* Options */}
      {visibleOptions.map((option, index) => {
        const actualIndex = startIndex + index;
        const isSelected = actualIndex === selectedIndex;
        return <OptionItem key={option.value} option={option} isSelected={isSelected} />;
      })}

      {/* Scroll down indicator */}
      {canScrollDown && <text fg="gray"> v {options.length - endIndex} more below</text>}

      {/* Navigation hint */}
      <box marginTop={1}>
        <text fg="gray" attributes={TextAttributes.DIM}>
          Use arrows to navigate, Enter to select
        </text>
      </box>
    </box>
  );
};
