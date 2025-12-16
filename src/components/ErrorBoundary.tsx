import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('App crashed', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page light">
          <div className="container">
            <div className="card error-fallback">
              <p className="eyebrow">Something went wrong</p>
              <h2>We hit a snag</h2>
              <p className="muted">{this.state.message || 'An unexpected error occurred.'}</p>
              <button type="button" className="primary" onClick={this.handleReset}>
                Refresh page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
