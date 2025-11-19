import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePublicChurches } from '../hooks/useChurches';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2 } from 'lucide-react';
import FaithFlowLogo from '../components/Branding/FaithFlowLogo';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedChurch, setSelectedChurch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Use React Query to fetch churches
  const { data: churches = [], isLoading: loadingChurches } = usePublicChurches();

  // Set default church when data loads
  React.useEffect(() => {
    if (churches.length > 0 && !selectedChurch) {
      const defaultChurch = churches.find(c => c.name === 'GKBJ Taman Kencana');
      if (defaultChurch) {
        setSelectedChurch(defaultChurch.id);
      } else {
        setSelectedChurch(churches[0].id);
      }
    }
  }, [churches, selectedChurch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedChurch) {
      setError('Please select a church');
      return;
    }

    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      // Verify user belongs to selected church
      const userChurchId = result.user?.church_id;
      if (userChurchId !== selectedChurch && result.user?.role !== 'super_admin') {
        setError('You do not have access to the selected church');
        setLoading(false);
        return;
      }
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  if (loadingChurches) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <FaithFlowLogo size="lg" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">{t('app.adminPortal')}</CardTitle>
          <CardDescription className="text-center">
            {t('app.tagline')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="church">{t('auth.church')}</Label>
              <Select
                value={selectedChurch}
                onValueChange={setSelectedChurch}
                disabled={loading || churches.length === 0}
              >
                <SelectTrigger id="church">
                  <SelectValue placeholder={t('auth.selectChurch')} />
                </SelectTrigger>
                <SelectContent>
                  {churches.map((church) => (
                    <SelectItem key={church.id} value={church.id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="text"
                placeholder="admin@gkbjtamankencana.org or API username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !selectedChurch}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.signingIn')}
                </>
              ) : (
                t('auth.login')
              )}
            </Button>
            <p className="text-sm text-center text-gray-600">
              {t('auth.demoCredentials')}
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
