import type { FocusEvent } from 'react';
import { useEffect, useState } from 'react';

/** How the person last acted: a key press or a pointer press. Focus that follows a key press is keyboard focus. */
let lastInput: 'keyboard' | 'pointer' = 'pointer';
let isListening = false;

const listen = () => {
  if (isListening) return;
  isListening = true;
  // Capture, so a control that stops a key or a press still counts it.
  document.addEventListener(
    'keydown',
    (event) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) lastInput = 'keyboard';
    },
    true
  );
  document.addEventListener('pointerdown', () => (lastInput = 'pointer'), true);
};

/**
 * Whether focus inside a field arrived from the keyboard. A field matches `:focus-visible` even when clicked, because
 * typing follows, so fields ask this instead before they draw the keyboard focus mark. A dialog that opens from a click
 * and focuses its first field leaves that field unmarked; one opened with Enter marks it.
 */
export function useKeyboardFocus() {
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  useEffect(listen, []);
  return {
    isKeyboardFocused,
    onFocus: () => setIsKeyboardFocused(lastInput === 'keyboard'),
    onBlur: (event: FocusEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsKeyboardFocused(false);
    }
  };
}
