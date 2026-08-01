import { createSignal, onCleanup } from 'solid-js';
import { glyphs } from './glyphs';
import { useTheme } from './theme';

export const Spinner = (props: { color?: string }) => {
  const { theme } = useTheme();
  const [frame, setFrame] = createSignal(0);
  const interval = setInterval(() => setFrame((f) => (f + 1) % glyphs.spinnerFrames.length), 80);
  onCleanup(() => clearInterval(interval));
  return (
    <text flexShrink={0} wrapMode="none" fg={props.color ?? theme.running}>
      {glyphs.spinnerFrames[frame()]}
    </text>
  );
};
