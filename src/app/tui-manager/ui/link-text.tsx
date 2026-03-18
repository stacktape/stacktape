import { createSignal, onCleanup } from 'solid-js';

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
