/**
 * Backwards-compatible color constants.
 *
 * New components should prefer `useTheme()` from context/theme.tsx.
 * These constants exist so non-component code (state managers, renderers, etc.)
 * can still reference the palette without a Solid context.
 */
import { defaultTheme, getMessageColors } from '../context/theme';

export { defaultTheme as COLORS, getMessageColors } from '../context/theme';

export const MESSAGE_COLORS: Record<string, string> = getMessageColors(defaultTheme);
