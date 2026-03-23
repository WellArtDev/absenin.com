import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  BusinessCenter,
  Security,
  Assessment,
  InsertChart,
  Smartphone,
  GroupWork,
  TrendingUp,
  Star,
  ArrowForward,
  Description,
  VerifiedUser,
  NotificationsActive,
  Speed,
  SupportAgent,
} from '@mui/icons-material';

export default function SaaSLandingPage() {
  const [isHovered, setIsHovered] = useState(false);

  const features = [
    {
      icon: <Smartphone fontSize="large" sx={{ color: '#25D366' }} />,
      title: 'Absensi WhatsApp',
      description: 'Absensi karyawan mudah dan cepat langsung via WhatsApp',
      color: '#25D366',
    },
    {
      icon: <GroupWork fontSize="large" sx={{ color: '#128C7E' }} />,
      title: 'Multi-Tenant',
      description: 'Kelola banyak perusahaan dalam satu platform terpusat',
      color: '#128C7E',
    },
    {
      icon: <InsertChart fontSize="large" sx={{ color: '#075E54' }} />,
      title: 'Lembur & Shift',
      description: 'Pantau jam lembur dan shift kerja dengan mudah',
      color: '#075E54',
    },
    {
      icon: <Security fontSize="large" sx={{ color: '#4A90E2' }} />,
      title: 'Keamanan Terjamin',
      description: 'Data karyawan dan absensi aman dan terenkripsi',
      color: '#4A90E2',
    },
    {
      icon: <Assessment fontSize="large" sx={{ color: '#FFD93D' }} />,
      title: 'Laporan Lengkap',
      description: 'Laporan absensi dan kehadiran yang lengkap',
      color: '#FFD93D',
    },
    {
      icon: <BusinessCenter fontSize="large" sx={{ color: '#FF6B6B' }} />,
      title: 'Multi-Gateway',
      description: 'Dukungan banyak gateway WhatsApp (Meta, Fonnte, Wablas)',
      color: '#FF6B6B',
    },
  ];

  const plans = [
    {
      name: 'Basic',
      price: 'Rp 500.000',
      period: '/bulan',
      features: ['20 Karyawan', '1 Admin', 'Laporan Absensi', 'Dukungan Email'],
      popular: false,
      color: '#6c757d',
    },
    {
      name: 'Pro',
      price: 'Rp 1.500.000',
      period: '/bulan',
      features: ['100 Karyawan', '5 Admin', 'Laporan Absensi', 'Dukungan WhatsApp', 'Lembur & Shift'],
      popular: true,
      color: '#25D366',
    },
    {
      name: 'Enterprise',
      price: 'Kontak',
      period: 'Sales',
      features: ['Unlimited Karyawan', 'Unlimited Admin', 'Semua Fitur', 'API Access', 'Custom Domain'],
      popular: false,
      color: '#075E54',
    },
  ];

  return (
    <>
      <Head>
        <title>Absenin SaaS - Platform Absensi Multi-Tenant</title>
        <meta name="description" content="Platform absensi multi-tenant modern untuk perusahaan" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'linear-gradient(135deg, #1e293b 0%, #075E54 100%)',
          color: 'white',
          py: 15,
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
            opacity: 0.05,
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                }}
              >
                Platform Absensi
                <Box
                  component="span"
                  sx={{
                    color: '#25D366',
                    display: 'block',
                    fontSize: { xs: '3rem', md: '4rem' },
                  }}
                >
                  WhatsApp
                </Box>
                Terbaik
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  opacity: 0.9,
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                }}
              >
                Sistem absensi karyawan modern, cepat, dan mudah
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ mr: 1, color: '#25D366' }} />
                  <Typography sx={{ ml: 1 }}>Tanpa Aplikasi Karyawan</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ mr: 1, color: '#25D366' }} />
                  <Typography sx={{ ml: 1 }}>Real-time Notification</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ mr: 1, color: '#25D366' }} />
                  <Typography sx={{ ml: 1 }}>Multi-Tenant</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={3}>
                <Button
                  component={Link}
                  href="/saas-admin/login"
                  variant="contained"
                  size="large"
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    bgcolor: '#25D366',
                    '&:hover': { bgcolor: '#128C7E' },
                  }}
                  startIcon={<BusinessCenter />}
                >
                  Login sebagai Admin
                </Button>
                <Button
                  component={Link}
                  href="/login"
                  variant="outlined"
                  size="large"
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: '#25D366',
                      bgcolor: 'rgba(37, 211, 102, 0.1)',
                    },
                  }}
                  startIcon={<VerifiedUser />}
                >
                  Login sebagai Tenant
                </Button>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                    Kenapa Memilih Absenin?
                  </Typography>
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Star sx={{ mr: 2, mt: 0.5, color: '#FFD93D' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Mudah Digunakan
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Karyawan cukup kirim pesan WhatsApp untuk absensi
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <TrendingUp sx={{ mr: 2, mt: 0.5, color: '#25D366' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Hemat Biaya
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Tidak perlu aplikasi atau hardware khusus
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Security sx={{ mr: 2, mt: 0.5, color: '#4A90E2' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Aman & Terpercaya
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Data terenkripsi dan disimpan dengan aman
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Speed sx={{ mr: 2, mt: 0.5, color: '#FF6B6B' }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Support Cepat
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Tim support siap membantu 24/7
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
              Fitur Unggulan
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              Kenapa Absenin adalah pilihan terbaik untuk perusahaan Anda
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 4 }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                        mx: 'auto',
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ bgcolor: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 900, color: '#25D366', fontSize: '4rem' }}>
                  150+
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Perusahaan
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  Telah mempercayai Absenin
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 900, color: '#128C7E', fontSize: '4rem' }}>
                  50K+
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Karyawan
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  Terdaftar di sistem
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 900, color: '#075E54', fontSize: '4rem' }}>
                  99.9%
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Uptime
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  Ketersediaan sistem
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
          color: 'white',
          py: 12,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 3, fontSize: '2.5rem' }}>
            Siap Memulai?
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, fontSize: '1.5rem' }}>
            Bergabunglah dengan ratusan perusahaan yang telah beralih ke sistem absensi modern
          </Typography>

          <Stack direction="row" spacing={3} justifyContent="center">
            <Button
              component={Link}
              href="/saas-admin/login"
              variant="contained"
              size="large"
              sx={{
                py: 2,
                px: 5,
                fontSize: '1.2rem',
                bgcolor: 'white',
                color: '#075E54',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                  color: '#075E54',
                },
              }}
              endIcon={<ArrowForward />}
            >
              Mulai Sekarang
            </Button>
            <Button
              component={Link}
              href="/saas-admin/signup"
              variant="outlined"
              size="large"
              sx={{
                py: 2,
                px: 5,
                fontSize: '1.2rem',
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: '#25D366',
                  bgcolor: 'rgba(37, 211, 102, 0.1)',
                },
              }}
              endIcon={<Description />}
            >
              Pelajari Lebih Lanjut
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1e293b', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box component="img" src="/logo-absenin.svg" sx={{ width: 40, height: 40, mr: 2 }} alt="Absenin" />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#25D366' }}>
                  Absenin
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                Platform absensi multi-tenant terbaik untuk perusahaan modern
              </Typography>
              <Stack direction="row" spacing={2}>
                <Chip icon={<NotificationsActive />} label="WhatsApp Support" size="small" />
                <Chip icon={<SupportAgent />} label="24/7 Support" size="small" />
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Fitur
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Absensi WhatsApp
                </Link>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Multi-Tenant
                </Link>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Lembur & Shift
                </Link>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Laporan Lengkap
                </Link>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Dukungan
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Dokumentasi
                </Link>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Bantuan
                </Link>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Kontak Kami
                </Link>
                <Link href="#" sx={{ color: 'white', textDecoration: 'none', '&:hover': { color: '#25D366' } }}>
                  Status Sistem
                </Link>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.7 }}>
            © 2026 Absenin. All rights reserved. Dibuat dengan ❤️ di Indonesia
          </Typography>
        </Container>
      </Box>
    </>
  );
}
