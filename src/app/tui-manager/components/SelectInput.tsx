import type { TuiSelectOption } from '../types';
import { Box, Text, useInput, useStdout } from 'ink';
import React, { memo, useCallback, useMemo, useState } from 'react';

type SelectInputProps = {
  options: TuiSelectOption[];
  onChange: (value: string) => void;
  onCancel?: () => void;
  /** Maximum number of visible options. Defaults to dynamic based on terminal height. */
  maxVisibleOptions?: number;
  /** Minimum number of visible options. Defaults to 5. */
  minVisibleOptions?: number;
};

type OptionItemProps = {
  option: TuiSelectOption;
  isSelected: boolean;
};

const OptionItem = memo<OptionItemProps>(({ option, isSelected }) => (
  <Box flexDirection="column">
    <Box>
      <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '› ' : '  '}</Text>
      <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
        {option.label}
      </Text>
      {option.description && <Text color="gray"> {option.description}</Text>}
    </Box>
  </Box>
));

OptionItem.displayName = 'OptionItem';

export const SelectInput: React.FC<SelectInputProps> = ({
  options,
  onChange,
  onCancel,
  maxVisibleOptions,
  minVisibleOptions = 5
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
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
    if (selectedIndex <= halfWindow) {
      start = 0;
    } else if (selectedIndex >= options.length - halfWindow - 1) {
      start = Math.max(0, options.length - visibleCount);
    } else {
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

  const handleInput = useCallback(
    (_input: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; escape?: boolean }) => {
      if (key.escape) {
        onCancel?.();
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (key.return) {
        onChange(options[selectedIndex].value);
      }
    },
    [options, selectedIndex, onChange, onCancel]
  );

  useInput(handleInput);

  return (
    <Box flexDirection="column">
      {/* Scroll up indicator */}
      {canScrollUp && <Text color="gray"> ^ {startIndex} more above</Text>}

      {visibleOptions.map((option, index) => {
        const actualIndex = startIndex + index;
        const isSelected = actualIndex === selectedIndex;
        return <OptionItem key={option.value} option={option} isSelected={isSelected} />;
      })}

      {canScrollDown && <Text color="gray"> v {options.length - endIndex} more below</Text>}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Use arrows to navigate, Enter to select
        </Text>
      </Box>
    </Box>
  );
};
