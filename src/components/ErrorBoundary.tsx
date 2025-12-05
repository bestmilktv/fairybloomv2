import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary pro graceful error handling
 * Zachytává JavaScript chyby v dětských komponentách
 * a zobrazuje fallback UI místo crashnuté aplikace
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Aktualizovat state, aby příští render zobrazil fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Logování chyby (v produkci lze poslat na error tracking službu)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Pokud byl poskytnut vlastní fallback, použít ho
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Výchozí fallback UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mb-8">
              <svg 
                className="w-24 h-24 mx-auto text-primary/30"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h1 className="text-3xl font-serif font-bold text-primary mb-4">
              Něco se pokazilo
            </h1>
            
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Omlouváme se, nastala neočekávaná chyba. 
              Zkuste stránku obnovit nebo se vraťte na úvodní stránku.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-300"
              >
                Obnovit stránku
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-6 py-3 border border-primary/30 text-primary rounded-lg font-medium hover:bg-primary/5 transition-colors duration-300"
              >
                Úvodní stránka
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-primary">
                  Technické detaily (pouze pro vývoj)
                </summary>
                <pre className="mt-4 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-48 text-left">
                  {this.state.error.toString()}
                </pre>
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

