import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-wide safety net. A throw anywhere in the tree (most likely inside the 3D
 * scene) would otherwise unmount everything and leave a blank page; here it is
 * caught and shown as a recoverable message. "Try again" clears the error to
 * re-render, and "Reload" does a hard reload as a last resort. The user's work
 * lives in localStorage, so a reload restores the last autosave.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the full detail in the console/host logs for debugging.
    console.error('Unhandled error in the UI:', error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-screen" role="alert">
        <div className="error-screen-card card">
          <h1>Something went wrong</h1>
          <p className="hint">
            An unexpected error interrupted the app. Your saved rooms are kept — you can try again,
            or reload to restore the last autosave.
          </p>
          <p className="error">{this.state.error.message}</p>
          <div className="error-screen-actions">
            <button type="button" className="btn btn-accent" onClick={this.reset}>
              Try again
            </button>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
