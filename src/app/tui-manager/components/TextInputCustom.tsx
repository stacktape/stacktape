import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

type TextInputCustomProps = {
  placeholder?: string;
  isPassword?: boolean;
  onSubmit: (value: string) => void;
};

/**
 * Custom text input with white text color.
 * Simple single-line text input with cursor.
 * Supports password mode with masked input.
 */
export const TextInputCustom: React.FC<TextInputCustomProps> = ({ placeholder, isPassword, onSubmit }) => {
  const [value, setValue] = useState('');
  const [cursorOffset, setCursorOffset] = useState(0);

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorOffset > 0) {
        const before = value.slice(0, cursorOffset - 1);
        const after = value.slice(cursorOffset);
        setValue(before + after);
        setCursorOffset(cursorOffset - 1);
      }
      return;
    }

    if (key.leftArrow) {
      setCursorOffset(Math.max(0, cursorOffset - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorOffset(Math.min(value.length, cursorOffset + 1));
      return;
    }

    // Ignore control characters
    if (key.ctrl || key.meta || key.escape || key.upArrow || key.downArrow || key.tab) {
      return;
    }

    // Insert character at cursor position
    if (input) {
      const before = value.slice(0, cursorOffset);
      const after = value.slice(cursorOffset);
      setValue(before + input + after);
      setCursorOffset(cursorOffset + input.length);
    }
  });

  const showPlaceholder = value.length === 0 && placeholder;

  // For password mode, mask the value with asterisks
  const displayValue = isPassword ? '*'.repeat(value.length) : value;

  // Render with cursor
  const beforeCursor = displayValue.slice(0, cursorOffset);
  const atCursor = displayValue[cursorOffset] || ' ';
  const afterCursor = displayValue.slice(cursorOffset + 1);

  return (
    <Box>
      {showPlaceholder ? (
        <>
          <Text backgroundColor="white" color="black">
            {placeholder[0] || ' '}
          </Text>
          <Text color="gray">{placeholder.slice(1)}</Text>
        </>
      ) : (
        <>
          <Text color="white">{beforeCursor}</Text>
          <Text backgroundColor="white" color="black">
            {atCursor}
          </Text>
          <Text color="white">{afterCursor}</Text>
        </>
      )}
    </Box>
  );
};
