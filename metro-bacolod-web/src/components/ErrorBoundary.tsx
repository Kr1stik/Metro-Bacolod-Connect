import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #e8ecf1 0%, #d6dce5 25%, #e2dfd8 50%, #dde4e0 75%, #e8ecf1 100%)',
          fontFamily: "'Inter', sans-serif",
          padding: '20px',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '60px 40px',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 25px',
              fontSize: '2rem',
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', margin: '0 0 10px' }}>
              Something Went Wrong
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: '1.6', marginBottom: '15px' }}>
              An unexpected error occurred. This has been logged and we'll look into it.
            </p>
            {this.state.error && (
              <details style={{
                textAlign: 'left',
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '25px',
                border: '1px solid #e5e7eb',
                fontSize: '0.85rem',
                color: '#ef4444',
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#374151' }}>
                  Error Details
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '8px' }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                background: '#111827',
                color: 'white',
                border: 'none',
                padding: '14px 40px',
                borderRadius: '50px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
