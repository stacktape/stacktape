import type { TuiSelectOption } from '../types';
import { Box, Text, useInput, useStdout } from 'ink';
import React, { memo, useCallback, useMemo, useState } from 'react';

type MultiSelectInputProps = {
  options: TuiSelectOption[];
  onChange: (values: string[]) => void;
  /** Initially selected values */
  defaultValues?: string[];
  /** Maximum number of visible options. Defaults to dynamic based on terminal height. */
  maxVisibleOptions?: number;
  /** Minimum number of visible options. Defaults to 5. */
  minVisibleOptions?: number;
};

type OptionItemProps = {
  option: TuiSelectOption;
  isFocused: boolean;
  isChecked: boolean;
};

const OptionItem = memo<OptionItemProps>(({ option, isFocused, isChecked }) => (
  <Box>
    <Text color={isFocused ? 'cyan' : undefined}>{isFocused ? '› ' : '  '}</Text>
    <Text color={isChecked ? 'cyan' : 'gray'}>●</Text>
    <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
      {' '}
      {option.label}
    </Text>
    {option.description && <Text color="gray"> {option.description}</Text>}
  </Box>
));

OptionItem.displayName = 'OptionItem';

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  options,
  onChange,
  defaultValues,
  maxVisibleOptions,
  minVisibleOptions = 5
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  // Default to empty selection unless defaultValues provided
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set(defaultValues || []));
  const { stdout } = useStdout();

  const visibleCount = useMemo(() => {
    if (maxVisibleOptions) return maxVisibleOptions;
    const terminalHeight = stdout?.rows || 24;
    const availableLines = Math.max(minVisibleOptions, terminalHeight - 10);
    return Math.min(options.length, availableLines, 20);
  }, [stdout?.rows, options.length, maxVisibleOptions, minVisibleOptions]);

  const { startIndex, endIndex, visibleOptions } = useMemo(() => {
    const halfWindow = Math.floor(visibleCount / 2);
    let start: number;
    if (focusedIndex <= halfWindow) {
      start = 0;
    } else if (focusedIndex >= options.length - halfWindow - 1) {
      start = Math.max(0, options.length - visibleCount);
    } else {
      start = focusedIndex - halfWindow;
    }
    const end = Math.min(start + visibleCount, options.length);
    return { startIndex: start, endIndex: end, visibleOptions: options.slice(start, end) };
  }, [focusedIndex, visibleCount, options]);

  const canScrollUp = startIndex > 0;
  const canScrollDown = endIndex < options.length;

  const toggleSelection = useCallback((value: string) => {
    setSelectedValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const handleInput = useCallback(
    (input: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean }) => {
      if (key.upArrow) {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (key.downArrow) {
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (input === ' ') {
        toggleSelection(options[focusedIndex].value);
      } else if (key.return) {
        onChange(Array.from(selectedValues));
      } else if (input === 'a' || input === 'A') {
        // Toggle all: if all selected -> deselect all, otherwise select all
        setSelectedValues((prev) => {
          const allSelected = prev.size === options.length;
          return allSelected ? new Set() : new Set(options.map((o) => o.value));
        });
      }
    },
    [options, focusedIndex, selectedValues, onChange, toggleSelection]
  );

  useInput(handleInput);

  const selectedCount = selectedValues.size;

  return (
    <Box flexDirection="column">
      {canScrollUp && <Text color="gray"> ^ {startIndex} more above</Text>}

      {visibleOptions.map((option, index) => {
        const actualIndex = startIndex + index;
        const isFocused = actualIndex === focusedIndex;
        const isChecked = selectedValues.has(option.value);
        return <OptionItem key={option.value} option={option} isFocused={isFocused} isChecked={isChecked} />;
      })}

      {canScrollDown && <Text color="gray"> v {options.length - endIndex} more below</Text>}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Space to toggle, a to toggle all, Enter to confirm ({selectedCount} selected)
        </Text>
      </Box>
    </Box>
  );
};
