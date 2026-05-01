import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
  componentStack: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: '', componentStack: '' };
  }

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorInfo: error?.stack || error?.message || 'Unknown error',
    };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      errorInfo: error?.stack || error?.message || 'Unknown error',
      componentStack: errorInfo?.componentStack || '',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] max-w-lg w-full">
            <h1 className="text-2xl font-bold uppercase italic font-serif mb-4 text-red-600">Error de Sistema</h1>
            <p className="font-mono text-sm mb-6 bg-gray-100 p-4 border border-gray-200 overflow-auto max-h-40">
              {this.state.errorInfo}
            </p>
            {this.state.componentStack && (
              <pre className="font-mono text-xs mb-6 bg-gray-100 p-4 border border-gray-200 overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.componentStack}
              </pre>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#141414] text-white py-3 font-bold uppercase tracking-widest"
            >
              Reiniciar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
