import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Video room error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong with the video connection.</h2>
          <button onClick={() => window.location.reload()}>
            Reconnect
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 