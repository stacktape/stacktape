/**
 * @deprecated Import `useTheme` from `../../context/theme` in components,
 * or `COLORS` from `../../util/colors` for non-component code.
 */
import { defaultTheme, getMessageColors } from '../../context/theme';

export { defaultTheme as COLORS, getMessageColors } from '../../context/theme';

export const MESSAGE_COLORS: Record<string, string> = getMessageColors(defaultTheme);
