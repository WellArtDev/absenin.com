import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, Button } from '../../components/Card';
import { Button as CustomButton } from '../../components/Button';

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  gradient: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const dashboardCards: DashboardCard[] = [
    {
      title: 'Data Karyawan',
      description: 'Kelola data karyawan dan jabatan',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      path: '/dashboard/employees',
      color: 'bg-indigo-500',
      gradient: 'bg-gradient-primary',
    },
    {
      title: 'Role & Permissions',
      description: 'Kelola role dan izin pengguna',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      path: '/dashboard/roles',
      color: 'bg-blue-500',
      gradient: 'bg-gradient-dark',
    },
    {
      title: 'Pengaturan Tenant',
      description: 'Kelola pengaturan perusahaan',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      path: '/dashboard/tenant-settings',
      color: 'bg-orange-500',
      gradient: 'bg-gradient-teal',
    },
    {
      title: 'Lokasi Kantor',
      description: 'Kelola lokasi dan geofence',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: '/dashboard/locations',
      color: 'bg-green-500',
      gradient: 'bg-gradient-primary',
    },
    {
      title: 'Absensi',
      description: 'Riwayat absensi karyawan',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/dashboard/attendance',
      color: 'bg-purple-500',
      gradient: 'bg-gradient-dark',
    },
    {
      title: 'Lembur',
      description: 'Kelola lembur karyawan',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/dashboard/overtime',
      color: 'bg-yellow-500',
      gradient: 'bg-gradient-teal',
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard - Absenin</title>
      </Head>

      <div className="min-h-screen bg-ui-background">
        {/* Modern Header */}
        <header className="bg-gradient-primary shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Absenin Dashboard</h1>
                  <p className="text-white/80 text-sm">Selamat datang kembali!</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="hidden md:flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-xl">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">Online</span>
                </div>

                <CustomButton
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  }
                >
                  Logout
                </CustomButton>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8 bg-gradient-primary rounded-2xl p-6 text-white shadow-glow">
            <h2 className="text-2xl font-bold mb-2">Selamat Datang! 👋</h2>
            <p className="text-white/90">Kelola absensi karyawan Anda dengan mudah dan efisien</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card glass className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ui-text-secondary">Total Karyawan</p>
                  <p className="text-2xl font-bold text-ui-text-primary mt-1">0</p>
                </div>
                <div className="bg-whatsapp-primary/10 p-3 rounded-xl">
                  <svg className="h-6 w-6 text-whatsapp-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card glass className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ui-text-secondary">Hadir Hari Ini</p>
                  <p className="text-2xl font-bold text-ui-text-primary mt-1">0</p>
                </div>
                <div className="bg-green-500/10 p-3 rounded-xl">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card glass className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ui-text-secondary">Tidak Hadir</p>
                  <p className="text-2xl font-bold text-ui-text-primary mt-1">0</p>
                </div>
                <div className="bg-red-500/10 p-3 rounded-xl">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card glass className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ui-text-secondary">Lembur</p>
                  <p className="text-2xl font-bold text-ui-text-primary mt-1">0</p>
                </div>
                <div className="bg-yellow-500/10 p-3 rounded-xl">
                  <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardCards.map((card, index) => (
              <Card
                key={index}
                hover
                onClick={() => router.push(card.path)}
                className="p-6 group"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${card.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {card.icon}
                  </div>
                  <svg className="h-5 w-5 text-ui-text-tertiary group-hover:text-whatsapp-primary group-hover:translate-x-1 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-ui-text-primary group-hover:text-whatsapp-primary transition-colors duration-300">
                    {card.title}
                  </h3>
                  <p className="text-sm text-ui-text-secondary mt-1">{card.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {}
  };
}
