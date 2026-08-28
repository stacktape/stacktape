import { InputRenderable, type InputRenderableOptions, type OptimizedBuffer, type RenderContext } from '@opentui/core';
import { extend } from '@opentui/solid';

type SecureInputOptions = InputRenderableOptions & {
  focused?: boolean;
  onInput?: (value: string) => void;
  onSubmit?: (value: string) => void;
};

/** Native OpenTUI editor behavior whose plaintext never reaches the render buffer. */
export class SecureInputRenderable extends InputRenderable {
  constructor(context: RenderContext, options: SecureInputOptions) {
    super(context, options);
  }

  protected override renderSelf(buffer: OptimizedBuffer): void {
    buffer.fillRect(this.screenX, this.screenY, this.width, this.height, this.backgroundColor);
  }
}

declare module '@opentui/solid' {
  interface OpenTUIComponents {
    secure_input: typeof SecureInputRenderable;
  }
}

export const registerSecureInput = () => extend({ secure_input: SecureInputRenderable });
