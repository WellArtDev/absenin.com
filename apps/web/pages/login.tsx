import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch CSRF token on page load
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        console.log('Fetching CSRF token from:', '/api/auth/csrf-token');
        const response = await fetch('/api/auth/csrf-token', {
          credentials: 'include'
        });
        console.log('CSRF response status:', response.status);
        const data = await response.json();
        console.log('CSRF response data:', data);
        if (data.success && data.data?.csrfToken) {
          setCsrfToken(data.data.csrfToken);
          console.log('CSRF token set:', data.data.csrfToken);
        }
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
        setError('Failed to connect to server. Please try again.');
      }
    };

    fetchCsrfToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add CSRF token to headers if available
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          tenantSlug: 'demo-nsd'
        })
      });

      const data = await response.json();

      if (data.success && data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('tenant_id', data.data.user.tenant_id);
        
        router.push('/dashboard');
      } else {
        setError(data.error?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@demonusantara.co.id');
    setPassword('Demo123!Absenin');
  };

  return (
    <>
      <Head>
        <title>Login - Absenin</title>
        <meta name="description" content="Login to Absenin HRM System" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-float">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
              <img src="/logo-absenin.svg" alt="Absenin Logo" className="h-14 w-14"/>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Absenin</h1>
            <p className="text-white/80">Sistem Absensi HRM Modern</p>
          </div>

          <div className="bg-white rounded-3xl shadow-glass p-8 backdrop-blur-sm">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h-2a1 1 0 110-2-2 0v6a1 1 0 012 2 2V7a1 1 0 01-2-2z"/>
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ui-text-secondary mb-1.5">
                  Email <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ui-text-tertiary">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002 2 2v10a2 2 0 002-2 2H5a2 2 0 00-2-2v-10a2 2 0 002 2 2z"/>
                    </svg>
                  </div>
                  <Input
                    type="email"
                    id="email"
                    placeholder="Masukkan email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ui-text-secondary mb-1.5">
                  Password <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ui-text-tertiary">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 012 2 2v6a2 2 0 01-2 2 2H6a2 2 0 01-2-2 2v6a2 2 0 012 2 2z"/>
                    </svg>
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                  <button
                    type="button"
                    className="absolute mt-2 right-3 top-9 text-ui-text-tertiary hover:text-whatsapp-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 11.6 016 0z"/>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C2.458 6.946 4.464 6.464 12s-1.994-1.464-5.536-5.536 12c0-3.59 3.008-8.068 6.932-8.068s.5.864 2.464 5.536 5.536c3.59 0 6.068 3.008 8.068 8.068 0 1.464 5.536 2.536-5.536z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-medium rounded-button transition-all duration-200 inline-flex items-center justify-center bg-gradient-primary text-white hover:shadow-glow active:scale-95 px-6 py-3 text-base shadow-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8 8 0 018 8 0 018 8 018-8 018-8z"/>
                    </svg>
                    Memuat...
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-ui-border"></div>
              <span className="px-4 text-xs text-ui-text-tertiary">atau coba demo</span>
              <div className="flex-1 border-t border-ui-border"></div>
            </div>

            <div className="bg-whatsapp-light/30 rounded-xl p-4 border border-whatsapp-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4 text-whatsapp-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span className="text-sm font-medium text-whatsapp-dark">Demo Tenant</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="font-medium rounded-button transition-all duration-200 inline-flex items-center justify-center bg-transparent text-whatsapp-primary hover:bg-whatsapp-light/30 active:scale-95 px-3 py-1.5 text-sm border border-whatsapp-primary/30"
                >
                  Isi Form
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ui-text-secondary">Email:</span>
                  <span className="font-medium text-ui-text-primary font-mono text-xs">admin@demonusantara.co.id</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-text-secondary">Password:</span>
                  <span className="font-medium text-ui-text-primary font-mono text-xs">Demo123!Absenin</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-white/70 text-sm">
              Belum punya akun? <button className="text-white font-medium hover:underline">Daftar sekarang</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
