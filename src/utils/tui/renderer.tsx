// TUI Renderer - manages the Ink rendering lifecycle

import { render, type Instance } from 'ink';
import type { DeploymentState, DeploymentCommand } from './types';
import { DeploymentUI } from './components/DeploymentUI';
import { createInitialState, stateReducer, type StateAction } from './state';
import { isTTY } from './utils';

// TUI Renderer class - manages the Ink instance and state
export class TuiRenderer {
  private inkInstance: Instance | null = null;
  private state: DeploymentState;
  private onStateChange: ((state: DeploymentState) => void) | null = null;

  constructor(config: { command: DeploymentCommand; stackName: string; stage: string; region: string }) {
    this.state = createInitialState(config);
  }

  // Start rendering
  start(): void {
    if (!isTTY()) {
      // In non-TTY mode, we'll use simple console output instead
      return;
    }

    this.inkInstance = render(<DeploymentUI state={this.state} />);
  }

  // Dispatch an action to update state
  dispatch(action: StateAction): void {
    this.state = stateReducer(this.state, action);

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    // Re-render with new state
    if (this.inkInstance) {
      this.inkInstance.rerender(<DeploymentUI state={this.state} />);
    } else if (!isTTY()) {
      // Non-TTY: log updates to console
      this.logNonTTY(action);
    }
  }

  // Get current state
  getState(): DeploymentState {
    return this.state;
  }

  // Set state change callback
  setOnStateChange(callback: (state: DeploymentState) => void): void {
    this.onStateChange = callback;
  }

  // Stop rendering and cleanup
  stop(): void {
    if (this.inkInstance) {
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
  }

  // Wait for render to complete (useful for final state)
  async waitUntilExit(): Promise<void> {
    if (this.inkInstance) {
      await this.inkInstance.waitUntilExit();
    }
  }

  // Non-TTY logging (simplified output for CI/CD)
  private logNonTTY(action: StateAction): void {
    const now = new Date();
    const timestamp = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    switch (action.type) {
      case 'START_TASK':
        console.log(`[${timestamp}] ○ ${action.taskName}`);
        break;
      case 'FINISH_TASK':
        console.log(`[${timestamp}] ✓ Task completed${action.message ? `: ${action.message}` : ''}`);
        break;
      case 'FAIL_TASK':
        console.log(`[${timestamp}] ✗ Task failed${action.message ? `: ${action.message}` : ''}`);
        break;
      case 'SET_ERROR':
        console.error(`[${timestamp}] ✗ Error: ${action.error?.message}`);
        break;
      case 'COMPLETE':
        console.log(`[${timestamp}] ✓ Deployment complete`);
        break;
    }
  }
}

// Singleton instance for global access
let rendererInstance: TuiRenderer | null = null;

export const createTuiRenderer = (config: {
  command: DeploymentCommand;
  stackName: string;
  stage: string;
  region: string;
}): TuiRenderer => {
  if (rendererInstance) {
    rendererInstance.stop();
  }
  rendererInstance = new TuiRenderer(config);
  return rendererInstance;
};

export const getTuiRenderer = (): TuiRenderer | null => {
  return rendererInstance;
};

export const destroyTuiRenderer = (): void => {
  if (rendererInstance) {
    rendererInstance.stop();
    rendererInstance = null;
  }
};
