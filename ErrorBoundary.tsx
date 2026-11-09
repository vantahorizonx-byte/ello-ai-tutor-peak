import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Silent error boundary.
 *
 * Ello never shows a placeholder warning banner in the layout: a broken panel
 * logs to the console and renders its (quiet) fallback, while the rest of the
 * study workspace keeps working.
 */
export class SilentBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[ello:ui] panel recovered from an error:', error?.message || error, info?.componentStack);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export default SilentBoundary;
