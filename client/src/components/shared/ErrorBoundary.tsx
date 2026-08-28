import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <h1 className="font-display text-2xl font-bold text-primary">Something broke.</h1>
        <p className="text-sm text-secondary">An unexpected error occurred. Try reloading the page.</p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-2 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Back to home
        </button>
      </div>
    );
  }
}
