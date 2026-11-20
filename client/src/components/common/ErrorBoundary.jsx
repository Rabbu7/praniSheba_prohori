import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep error logging minimal and safe in production
    if (import.meta.env.DEV) {
      console.error('Uncaught UI error:', error, info);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface p-6">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-white p-8 text-center shadow-sm">
            <span className="material-symbols-outlined mb-3 text-4xl text-error" aria-hidden="true">
              error
            </span>
            <h1 className="font-headline-md text-headline-md font-bold text-on-background">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              An unexpected error occurred while rendering this page.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  refresh
                </span>
                Reload page
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-5 py-2.5 text-sm font-medium text-on-background transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  home
                </span>
                Go to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
