import { createSignal, onCleanup } from 'solid-js';
import { glyphs } from './glyphs';
import { useTheme } from './theme';

/**
 * One shared animation clock for every spinner. Rows are re-created whenever
 * live state changes; a per-instance interval would reset to frame 0 on each
 * remount, freezing the animation under frequent updates. A module-level frame
 * signal keeps the animation continuous (and all spinners in sync). The
 * interval is refcounted so it only runs while at least one spinner is mounted.
 */
const [frame, setFrame] = createSignal(0);
let mountedSpinners = 0;
let clock: ReturnType<typeof setInterval> | undefined;

const retainClock = () => {
  mountedSpinners++;
  if (!clock) {
    clock = setInterval(() => setFrame((f) => (f + 1) % glyphs.spinnerFrames.length), 80);
  }
};

const releaseClock = () => {
  mountedSpinners--;
  if (mountedSpinners <= 0 && clock) {
    clearInterval(clock);
    clock = undefined;
    mountedSpinners = 0;
  }
};

export const Spinner = (props: { color?: string }) => {
  const { theme } = useTheme();
  retainClock();
  onCleanup(releaseClock);
  return (
    <text flexShrink={0} wrapMode="none" fg={props.color ?? theme.running}>
      {glyphs.spinnerFrames[frame()]}
    </text>
  );
};
