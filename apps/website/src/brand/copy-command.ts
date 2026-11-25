// The Console's copy button icons, on a 24 px grid.
export const COPY_ICON = {
  idle: 'M4 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM9 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-5',
  copied: 'M5.5 12.5l4.5 4.5 9-9',
  failed: 'M7 7l10 10M17 7 7 17'
};

export async function copyCommand(command: string, text: Element | null | undefined) {
  try {
    await navigator.clipboard.writeText(command);
    return { state: 'copied', message: 'Copied to clipboard', duration: 1500 } as const;
  } catch {
    const selection = window.getSelection();
    if (text && selection) {
      const range = document.createRange();
      range.selectNodeContents(text);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return {
      state: 'failed',
      message: 'Clipboard unavailable. The command is selected: press Ctrl+C or Cmd+C.',
      duration: 5000
    } as const;
  }
}
