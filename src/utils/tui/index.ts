// TUI module - main exports

// Types
export type {
  DeploymentState,
  DeploymentCommand,
  DeploymentError,
  Phase,
  PhaseView,
  Task,
  TaskStatus,
  Resource,
  ResourceStatus,
  PhaseMapping,
  ResourceHint
} from './types';

// Theme
export { colors, semantic, symbols, spinnerFrames, supportsUnicode } from './theme';

// Utilities
export {
  formatDuration,
  formatTime,
  formatBytes,
  isTTY,
  getTerminalWidth,
  truncate,
  padEnd,
  padStart,
  cfStatusToTaskStatus,
  createProgressBar,
  generateId
} from './utils';

// Phases
export {
  deployPhases,
  deletePhases,
  getPhaseForEvent,
  getPhasesForCommand,
  resourceHints,
  getHintForResource,
  getActiveResourceHint
} from './phases';

// State management
export { createInitialState, stateReducer, type StateAction } from './state';

// Renderer
export { TuiRenderer, createTuiRenderer, getTuiRenderer, destroyTuiRenderer } from './renderer';

// Components (for potential customization)
export { BorderBox, DeploymentUI, Footer, Header, PhaseSection, ProgressBar, StatusIcon, TaskItem } from './components';
