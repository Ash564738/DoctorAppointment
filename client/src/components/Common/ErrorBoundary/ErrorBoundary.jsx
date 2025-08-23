import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="errorBoundary_container">
          <div className="errorBoundary_content">
            <div className="errorBoundary_icon">⚠️</div>
            <h1 className="errorBoundary_title">Oops! Something went wrong</h1>
            <p className="errorBoundary_message">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            
            <div className="errorBoundary_actions">
              <button 
                className="errorBoundary_button errorBoundary_button--primary"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
              <button 
                className="errorBoundary_button errorBoundary_button--secondary"
                onClick={() => window.history.back()}
              >
                Go Back
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="errorBoundary_details">
                <summary className="errorBoundary_summary">
                  Technical Details (Development Mode)
                </summary>
                <div className="errorBoundary_errorDetails">
                  <h3>Error:</h3>
                  <pre className="errorBoundary_errorText">
                    {this.state.error && this.state.error.toString()}
                  </pre>
                  <h3>Component Stack:</h3>
                  <pre className="errorBoundary_errorText">
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
