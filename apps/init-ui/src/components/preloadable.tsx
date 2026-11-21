import { lazy, type ComponentType } from 'react';

/**
 * A component in a chunk of its own, which renders at once when its chunk has already arrived.
 *
 * `React.lazy` suspends on its first render even when the chunk is in, and React then keeps the fallback up for a
 * moment: the diagram, loaded while the analysis ran, still opened Review and Deploying with a spinner where the
 * picture goes. `load` fetches the chunk ahead; once it has, `Component` is the loaded component itself.
 */
export const preloadable = <Props extends object>(factory: () => Promise<{ default: ComponentType<Props> }>) => {
  let loaded: ComponentType<Props> | undefined;
  let pending: Promise<{ default: ComponentType<Props> }> | undefined;
  const load = () => {
    pending ??= factory().then((module) => {
      loaded = module.default;
      return module;
    });
    return pending;
  };
  const Lazy = lazy(load);
  function Preloaded(props: Props) {
    const Loaded = loaded ?? Lazy;
    return <Loaded {...props} />;
  }
  return { load, Component: Preloaded };
};
