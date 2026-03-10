import { createContext, useContext, type ParentProps } from 'solid-js';
import { Show } from 'solid-js/web';

/**
 * Factory for creating typed Solid contexts with an optional `ready` gate.
 * Follows the pattern used by OpenDocker and OpenCode.
 *
 * When `init()` returns an object with a `ready` property, the provider
 * defers rendering children until `ready` is truthy.
 */
export const createSimpleContext = <T, Props = Record<string, never>>(input: {
  name: string;
  init: (props: Props) => T & { ready?: boolean };
}) => {
  const ctx = createContext<T>();

  return {
    provider: (props: ParentProps<Props>) => {
      const value = input.init(props);
      return (
        <Show when={(value as any).ready === undefined || (value as any).ready === true}>
          <ctx.Provider value={value}>{props.children}</ctx.Provider>
        </Show>
      );
    },
    use: (): T => {
      // eslint-disable-next-line react/no-use-context -- Solid's useContext, not React's
      const value = useContext(ctx);
      if (!value) throw new Error(`${input.name} context must be used within its provider`);
      return value;
    }
  };
};
