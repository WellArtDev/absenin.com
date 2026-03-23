import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Link,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Paper,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business,
  People,
  Assignment,
  Speed,
  Security,
  Description,
  TrendingUp,
  CalendarMonth,
  NotificationsActive,
  Logout,
  MoreVert,
  Star,
  TrendingDown,
  AccessTime,
  Refresh,
  Add,
} from '@mui/icons-material';

export default function SaasAdminDashboardPage() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [tenantCount, setTenantCount] = useState(156);
  const [activeTenants, setActiveTenants] = useState(142);
  const [totalEmployees, setTotalEmployees] = useState(2840);
  const [totalAttendance, setTotalAttendance] = useState(15230);
  const [totalOvertime, setTotalOvertime] = useState(380);

  const recentTenants = [
    { id: 1, name: 'PT Nusantara Digital', slug: 'demo-nsd', employees: 45, status: 'active', plan: 'Enterprise', growth: '+12%' },
    { id: 2, name: 'PT Teknologi Indonesia', slug: 'tekno-indo', employees: 120, status: 'active', plan: 'Pro', growth: '+8%' },
    { id: 3, name: 'PT Maju Bersama', slug: 'maju-bersama', employees: 89, status: 'inactive', plan: 'Basic', growth: '-3%' },
    { id: 4, name: 'CV Sejahtera Abadi', slug: 'sejahtera', employees: 67, status: 'active', plan: 'Enterprise', growth: '+15%' },
    { id: 5, name: 'PT Global Services', slug: 'global-svc', employees: 34, status: 'active', plan: 'Basic', growth: '+5%' },
  ];

  const monthlyStats = [
    { label: 'New Tenants', value: 12, change: '+8%', positive: true },
    { label: 'Active Users', value: 2840, change: '+12%', positive: true },
    { label: 'Attendance Rate', value: '94.5%', change: '+2.3%', positive: true },
    { label: 'Overtime Hours', value: 380, change: '-5%', positive: false },
  ];

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    router.push('/saas-admin/login');
  };

  return (
    <>
      <Head>
        <title>Dashboard - Absenin SaaS Admin</title>
        <meta name="description" content="SaaS Admin Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box
          sx={{
            width: 280,
            bgcolor: '#1e293b',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            height: '100vh',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box component="img" src="/logo-absenin.svg" sx={{ width: 40, height: 40 }} alt="Absenin" />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#25D366', lineHeight: 1.2 }}>
                  Absenin
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                  SaaS Platform
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ flex: 1, px: 2, py: 2 }}>
            <Button
              component={Link}
              href="/saas-admin/dashboard"
              sx={{
                justifyContent: 'flex-start',
                color: 'white',
                bgcolor: 'rgba(37, 211, 102, 0.15)',
                mb: 1,
                borderRadius: 1.5,
                py: 2,
              }}
            >
              <DashboardIcon sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Dashboard</Typography>
            </Button>

            <Button
              component={Link}
              href="/saas-admin/tenants"
              sx={{
                justifyContent: 'flex-start',
                color: 'white',
                mb: 1,
                borderRadius: 1.5,
                py: 2,
              }}
            >
              <Business sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Manage Tenants</Typography>
            </Button>

            <Button
              component={Link}
              href="/saas-admin/reports"
              sx={{
                justifyContent: 'flex-start',
                color: 'white',
                mb: 1,
                borderRadius: 1.5,
                py: 2,
              }}
            >
              <Description sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Reports</Typography>
            </Button>

            <Button
              component={Link}
              href="/saas-admin/billing"
              sx={{
                justifyContent: 'flex-start',
                color: 'white',
                mb: 1,
                borderRadius: 1.5,
                py: 2,
              }}
            >
              <Security sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Billing</Typography>
            </Button>

            <Button
              component={Link}
              href="/saas-admin/settings"
              sx={{
                justifyContent: 'flex-start',
                color: 'white',
                mb: 1,
                borderRadius: 1.5,
                py: 2,
              }}
            >
              <Speed sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Settings</Typography>
            </Button>

            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            <Button
              component={Link}
              href="/saas-admin/tenants/new"
              variant="contained"
              sx={{
                justifyContent: 'flex-start',
                mb: 1,
                borderRadius: 1.5,
                py: 2,
                bgcolor: '#25D366',
              }}
            >
              <Add sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Add New Tenant</Typography>
            </Button>
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Button
              onClick={handleLogout}
              fullWidth
              variant="outlined"
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 1.5,
                py: 2,
              }}
            >
              <Logout sx={{ mr: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Logout</Typography>
            </Button>
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', ml: '280px' }}>
          <AppBar
            position="static"
            elevation={0}
            sx={{
              bgcolor: 'white',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  SaaS Admin Dashboard
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', ml: 1 }}>
                  Last updated: Just now
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  startIcon={<Refresh />}
                  variant="outlined"
                  size="small"
                >
                  Refresh
                </Button>
                <IconButton color="inherit">
                  <NotificationsActive />
                </IconButton>
                <IconButton onClick={handleMenuClick}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#25D366' }}>
                    AD
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  onClick={handleMenuClose}
                >
                  <MenuItem>
                    <Avatar sx={{ mr: 2, width: 32, height: 32 }} />
                    Admin User
                  </MenuItem>
                  <Divider />
                  <MenuItem>Profile Settings</MenuItem>
                  <MenuItem>Billing</MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </Box>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, p: 4, bgcolor: '#f3f4f6', overflow: 'auto' }}>
            <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2 } }}>
              <Paper
                sx={{
                  p: 4,
                  mb: 4,
                  borderRadius: 2,
                  bgcolor: 'white',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Grid container alignItems="center" spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                      Welcome back, Admin! 👋
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#6b7280' }}>
                      Here's what's happening with your SaaS platform today.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      component={Link}
                      href="/saas-admin/tenants"
                      variant="contained"
                      size="large"
                      fullWidth
                      sx={{
                        py: 2,
                        bgcolor: '#25D366',
                      }}
                      startIcon={<Add />}
                    >
                      Add New Tenant
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              <Paper
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 2,
                  bgcolor: 'white',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
                  Monthly Overview
                </Typography>
                <Grid container spacing={2}>
                  {monthlyStats.map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Card
                        sx={{
                          p: 2,
                          bgcolor: stat.positive ? 'rgba(37, 211, 102, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                          borderRadius: 1.5,
                          border: `1px solid ${stat.positive ? 'rgba(37, 211, 102, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                            {stat.label}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {stat.positive ? (
                              <TrendingUp sx={{ fontSize: 16, color: '#25D366' }} />
                            ) : (
                              <TrendingDown sx={{ fontSize: 16, color: '#ef4444' }} />
                            )}
                            <Chip
                              label={stat.change}
                              size="small"
                              sx={{
                                bgcolor: stat.positive ? 'rgba(37, 211, 102, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: stat.positive ? '#25D366' : '#ef4444',
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {stat.value}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s',
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" color="#6b7280" sx={{ mb: 0.5, fontWeight: 500 }}>
                            Total Tenants
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {tenantCount}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(37, 211, 102, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Business sx={{ fontSize: 32, color: '#25D366' }} />
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={91}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'rgba(37, 211, 102, 0.1)',
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1, color: '#6b7280' }}>
                        91% of target
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s',
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" color="#6b7280" sx={{ mb: 0.5, fontWeight: 500 }}>
                            Active Tenants
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {activeTenants}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(18, 140, 126, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrendingUp sx={{ fontSize: 32, color: '#128C7E' }} />
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={95}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'rgba(18, 140, 126, 0.1)',
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1, color: '#6b7280' }}>
                        95% activation rate
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s',
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" color="#6b7280" sx={{ mb: 0.5, fontWeight: 500 }}>
                            Total Employees
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {totalEmployees}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(7, 94, 84, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <People sx={{ fontSize: 32, color: '#075E54' }} />
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={78}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'rgba(7, 94, 84, 0.1)',
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1, color: '#6b7280' }}>
                        78% capacity
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s',
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" color="#6b7280" sx={{ mb: 0.5, fontWeight: 500 }}>
                            Total Attendance
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {totalAttendance}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(255, 217, 61, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CalendarMonth sx={{ fontSize: 32, color: '#FFD93D' }} />
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={85}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'rgba(255, 217, 61, 0.1)',
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1, color: '#6b7280' }}>
                        85% attendance rate
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper
                sx={{
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    bgcolor: '#1e293b',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Recent Tenants
                  </Typography>
                  <Button
                    component={Link}
                    href="/saas-admin/tenants"
                    variant="contained"
                    size="small"
                    sx={{
                      bgcolor: '#25D366',
                    }}
                  >
                    View All
                  </Button>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 600, py: 2 }}>Tenant</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600, py: 2 }}>Employees</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600, py: 2 }}>Status</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600, py: 2 }}>Plan</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600, py: 2 }}>Growth</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600, py: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentTenants.map((tenant) => (
                        <TableRow
                          key={tenant.id}
                          sx={{
                            '&:nth-of-type(odd)': { bgcolor: 'rgba(255, 255, 255, 0.02)' },
                            '&:hover': { bgcolor: 'rgba(37, 211, 102, 0.05)' },
                            transition: 'bgcolor 0.2s',
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Business sx={{ fontSize: 20, color: '#6b7280' }} />
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                  {tenant.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                  {tenant.slug}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <People sx={{ fontSize: 16, color: '#6b7280' }} />
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {tenant.employees}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={tenant.status === 'active' ? 'Active' : 'Inactive'}
                              color={tenant.status === 'active' ? 'success' : 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={tenant.plan}
                              variant="outlined"
                              size="small"
                              sx={{
                                borderColor:
                                  tenant.plan === 'Enterprise' ? '#25D366' :
                                  tenant.plan === 'Pro' ? '#128C7E' : '#FFD93D',
                                color:
                                  tenant.plan === 'Enterprise' ? '#25D366' :
                                  tenant.plan === 'Pro' ? '#128C7E' : '#FFD93D',
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: tenant.growth.startsWith('+') ? '#25D366' : '#ef4444',
                              }}
                            >
                              {tenant.growth}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button size="small" variant="outlined">
                                View
                              </Button>
                              <IconButton size="small">
                                <MoreVert />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Container>
          </Box>
        </Box>
      </Box>
    </>
  );
}
