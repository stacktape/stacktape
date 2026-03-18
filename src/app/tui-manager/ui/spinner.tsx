import { createSignal, onCleanup } from 'solid-js';
import { useTheme } from '../context/theme';

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const Spinner = (props: { color?: string }) => {
  const { theme } = useTheme();
  const [frame, setFrame] = createSignal(0);
  const interval = setInterval(() => setFrame((f) => (f + 1) % BRAILLE_FRAMES.length), 80);
  onCleanup(() => clearInterval(interval));
  return <text fg={props.color ?? theme.running}>{BRAILLE_FRAMES[frame()]}</text>;
};
