// TUI module - main exports

// Components (for potential customization)
export { BorderBox, DeploymentUI, Footer, Header, PhaseSection, ProgressBar, StatusIcon, TaskItem } from './components';

// Phases
export {
  deletePhases,
  deployPhases,
  getActiveResourceHint,
  getHintForResource,
  getPhaseForEvent,
  getPhasesForCommand,
  resourceHints
} from './phases';

// Renderer
export { createTuiRenderer, destroyTuiRenderer, getTuiRenderer, TuiRenderer } from './renderer';

// State management
export { createInitialState, type StateAction, stateReducer } from './state';

// Theme
export { colors, semantic, spinnerFrames, supportsUnicode, symbols } from './theme';

// Types
export type {
  DeploymentCommand,
  DeploymentError,
  DeploymentState,
  Phase,
  PhaseMapping,
  PhaseView,
  Resource,
  ResourceHint,
  ResourceStatus,
  Task,
  TaskStatus
} from './types';

// Utilities
export {
  cfStatusToTaskStatus,
  createProgressBar,
  formatBytes,
  formatDuration,
  formatTime,
  generateId,
  getTerminalWidth,
  isTTY,
  padEnd,
  padStart,
  truncate
} from './utils';
