import React from 'react';
import { tuiDebug } from '../../tui-debug-log';

type ErrorBoundaryProps = {
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

/**
 * Catches rendering crashes in the OpenTUI component tree.
 * Without this, an uncaught render error crashes OpenTUI's reconciler silently —
 * the alternate screen stays up but rendering stops, leaving a blank/frozen TUI.
 *
 * When a crash occurs, this component:
 * 1. Shows an error state so the crash is visible
 * 2. Calls the onError callback so TuiManager can destroy the TUI + re-raise the error
 *
 * NOTE: No JSX pragma here — the render method returns plain React.createElement calls
 * to avoid JSX type conflicts between React and OpenTUI's IntrinsicElements.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Unknown render error' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    tuiDebug('ERRORBOUNDARY', 'componentDidCatch', {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500)
    });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Return null — the onError callback handles destroying the TUI and
      // printing the error to stderr. We don't try to render OpenTUI elements
      // from a React class component to avoid JSX type conflicts.
      return null;
    }
    return this.props.children;
  }
}
