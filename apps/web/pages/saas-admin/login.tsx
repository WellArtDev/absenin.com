import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

export default function SaasAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock login for now
      setTimeout(() => {
        setLoading(false);
        router.push('/saas-admin/dashboard');
      }, 1000);
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@absenin.com');
    setPassword('Admin@123');
  };

  return (
    <>
      <Head>
        <title>SaaS Admin Login - Absenin</title>
        <meta name="description" content="Login to SaaS Admin Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(37, 211, 102, 0.03) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <Container maxWidth="sm">
          <Card
            sx={{
              p: 4,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Logo and Title */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  component="img"
                  src="/logo-absenin.svg"
                  sx={{ width: 80, height: 80, mb: 3 }}
                  alt="Absenin Logo"
                />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  SaaS Admin
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Login to access admin dashboard
                </Typography>
              </Box>

              {/* Error Alert */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {/* Login Form */}
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: '#6b7280' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Password"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#6b7280' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                  disabled={loading}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 2.5,
                    bgcolor: '#25D366',
                    '&:hover': { bgcolor: '#128C7E' },
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Box>

              {/* Demo Credentials */}
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'rgba(37, 211, 102, 0.05)',
                  borderRadius: 1,
                  border: '1px dashed rgba(37, 211, 102, 0.2)',
                }}
              >
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 2, fontWeight: 500 }}>
                  Demo Credentials
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Email:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    admin@absenin.com
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Password:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    Admin@123
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleFillDemo}
                  disabled={loading}
                  sx={{
                    borderColor: '#25D366',
                    color: '#25D366',
                    '&:hover': {
                      borderColor: '#128C7E',
                      color: '#128C7E',
                    },
                  }}
                >
                  Fill Demo Credentials
                </Button>
              </Box>

              {/* Divider */}
              <Box sx={{ my: 3 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Don't have an account?
                </Typography>
              </Box>

              {/* Back to Tenant Login */}
              <Button
                fullWidth
                component={Link}
                href="/login"
                variant="text"
                sx={{
                  color: '#25D366',
                  '&:hover': {
                    bgcolor: 'rgba(37, 211, 102, 0.05)',
                  },
                }}
              >
                Back to Tenant Login
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              © 2026 Absenin. All rights reserved.
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5 }}>
              Made with ❤️ in Indonesia
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
