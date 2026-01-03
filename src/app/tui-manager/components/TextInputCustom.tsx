/** @jsxImportSource @opentui/react */
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext, useKeyboard } from '@opentui/react';

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
  const valueRef = useRef(value);
  const cursorRef = useRef(cursorOffset);
  const { keyHandler } = useAppContext();

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    cursorRef.current = cursorOffset;
  }, [cursorOffset]);

  const updateState = (nextValue: string, nextCursor: number) => {
    valueRef.current = nextValue;
    cursorRef.current = nextCursor;
    setValue(nextValue);
    setCursorOffset(nextCursor);
  };

  const updateCursor = (nextCursor: number) => {
    cursorRef.current = nextCursor;
    setCursorOffset(nextCursor);
  };

  const insertText = (text: string) => {
    if (!text) return;
    const currentValue = valueRef.current;
    const currentCursor = cursorRef.current;
    const before = currentValue.slice(0, currentCursor);
    const after = currentValue.slice(currentCursor);
    updateState(before + text + after, currentCursor + text.length);
  };

  useEffect(() => {
    if (!keyHandler) return;
    const handlePaste = (event: { text: string }) => {
      const normalized = event.text.replace(/\r?\n/g, '');
      if (!normalized) return;
      const sanitized = Array.from(normalized)
        .filter((char) => {
          const code = char.charCodeAt(0);
          return code >= 32 && code <= 126;
        })
        .join('');
      insertText(sanitized);
    };
    keyHandler.on('paste', handlePaste);
    return () => {
      keyHandler.off('paste', handlePaste);
    };
  }, [keyHandler]);

  useKeyboard((key) => {
    if (key.name === 'return') {
      onSubmit(valueRef.current);
      return;
    }

    if (key.name === 'backspace' || key.name === 'delete') {
      const currentValue = valueRef.current;
      const currentCursor = cursorRef.current;
      if (currentCursor > 0) {
        const before = currentValue.slice(0, currentCursor - 1);
        const after = currentValue.slice(currentCursor);
        updateState(before + after, currentCursor - 1);
      }
      return;
    }

    if (key.name === 'left') {
      updateCursor(Math.max(0, cursorRef.current - 1));
      return;
    }

    if (key.name === 'right') {
      updateCursor(Math.min(valueRef.current.length, cursorRef.current + 1));
      return;
    }

    if (key.ctrl || key.meta || key.option || key.super || key.hyper || key.name === 'tab') {
      return;
    }

    const sequence = key.sequence ?? '';
    if (!sequence) return;

    const normalized = sequence.replace(/\r?\n/g, '');
    if (!normalized) return;

    const isPrintable = Array.from(normalized).every((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126;
    });
    if (!isPrintable) return;

    insertText(normalized);
  });

  const showPlaceholder = value.length === 0 && placeholder;

  // For password mode, mask the value with asterisks
  const displayValue = isPassword ? '*'.repeat(value.length) : value;

  // Render with cursor
  const beforeCursor = displayValue.slice(0, cursorOffset);
  const atCursor = displayValue[cursorOffset] || ' ';
  const afterCursor = displayValue.slice(cursorOffset + 1);

  return (
    <box flexDirection="row">
      {showPlaceholder ? (
        <>
          <text bg="white" fg="black">
            {placeholder[0] || ' '}
          </text>
          <text fg="gray">{placeholder.slice(1)}</text>
        </>
      ) : (
        <>
          <text fg="white">{beforeCursor}</text>
          <text bg="white" fg="black">
            {atCursor}
          </text>
          <text fg="white">{afterCursor}</text>
        </>
      )}
    </box>
  );
};
