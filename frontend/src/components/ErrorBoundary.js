import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <Card className="max-w-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <CardTitle className="text-xl">Terjadi Kesalahan</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Maaf, terjadi kesalahan yang tidak terduga. Silakan refresh halaman atau hubungi administrator jika masalah berlanjut.
              </p>
              {this.state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="font-mono text-red-800">{this.state.error.toString()}</p>
                </div>
              )}
              <div className="flex space-x-2">
                <Button onClick={() => window.location.reload()} className="flex-1">
                  Refresh Halaman
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="flex-1"
                >
                  Coba Lagi
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

export default ErrorBoundary;
