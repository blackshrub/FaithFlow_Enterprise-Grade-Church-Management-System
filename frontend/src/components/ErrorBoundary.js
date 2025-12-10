import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { withTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <Card className="max-w-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <CardTitle className="text-xl">{t('common.errorOccurred', 'An Error Occurred')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                {t('common.errorMessage', 'Sorry, an unexpected error occurred. Please refresh the page or contact administrator if the problem persists.')}
              </p>
              {this.state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="font-mono text-red-800">{this.state.error.toString()}</p>
                </div>
              )}
              <div className="flex space-x-2">
                <Button onClick={() => window.location.reload()} className="flex-1">
                  {t('common.refreshPage', 'Refresh Page')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="flex-1"
                >
                  {t('common.tryAgain', 'Try Again')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
