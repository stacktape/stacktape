import { createSignal, onCleanup } from 'solid-js';

// Periodic link refresh to work around native OSC 8 diffing bug.
// Appending a changing fragment to the href forces a new link ID allocation
// each tick, ensuring the diff engine re-emits the OSC 8 escape sequences.
export const LinkText = (props: { href: string; display: string; color: string }) => {
  const [tick, setTick] = createSignal(0);
  const timer = setInterval(() => setTick((t) => t + 1), 1000);
  onCleanup(() => clearInterval(timer));
  const liveHref = () => `${props.href}#_${tick()}`;
  return (
    <text wrapMode="none" fg={props.color}>
      <a href={liveHref()}>{props.display}</a>
    </text>
  );
};
