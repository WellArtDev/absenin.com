import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface CompanySettings {
  settings_id: string;
  tenant_id: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  working_days?: string[];
  working_hours_start?: string;
  working_hours_end?: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    type: string;
    message: string;
  };
}

export default function TenantSettingsPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as string[],
    work_start_time: '08:00',
    work_end_time: '17:00'
  });

  useEffect(() => {
    fetchTenantInfo();
  }, []);

  const fetchTenantInfo = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');

      const [tenantRes, settingsRes] = await Promise.all([
        fetch('/api/tenant/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
          }
        }),
        fetch('/api/settings/company', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
          }
        })
      ]);

      const tenantData = await tenantRes.json();
      const settingsData = await settingsRes.json();

      if (tenantData.success && tenantData.data) {
        setTenant(tenantData.data);
      }

      if (settingsData.success && settingsData.data) {
        setSettings(settingsData.data);
        setFormData({
          company_name: settingsData.data.company_name || '',
          company_address: settingsData.data.company_address || '',
          company_phone: settingsData.data.company_phone || '',
          company_email: settingsData.data.company_email || '',
          working_days: settingsData.data.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          work_start_time: settingsData.data.working_hours_start || '08:00',
          work_end_time: settingsData.data.working_hours_end || '17:00'
        });
      }
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      setError('Terjadi kesalahan saat memuat data tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkingDayToggle = (day: string) => {
    setFormData({
      ...formData,
      working_days: formData.working_days.includes(day)
        ? formData.working_days.filter(d => d !== day)
        : [...formData.working_days, day]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError('');

      const token = localStorage.getItem('token');

      // Get CSRF token
      const csrfRes = await fetch('/api/auth/csrf-token', {
        credentials: 'include'
      });
      const csrfData = await csrfRes.json();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
      };

      if (csrfData.data?.csrfToken) {
        headers['x-csrf-token'] = csrfData.data.csrfToken;
      }

      const method = settings ? 'PATCH' : 'POST';
      const url = '/api/settings/company';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setToast({
          message: 'Pengaturan berhasil disimpan',
          type: 'success'
        });
        fetchTenantInfo();
      } else {
        setToast({
          message: data.error?.message || 'Gagal menyimpan pengaturan',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setToast({
        message: 'Terjadi kesalahan saat menyimpan pengaturan',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const days = [
    { value: 'monday', label: 'Senin' },
    { value: 'tuesday', label: 'Selasa' },
    { value: 'wednesday', label: 'Rabu' },
    { value: 'thursday', label: 'Kamis' },
    { value: 'friday', label: 'Jumat' },
    { value: 'saturday', label: 'Sabtu' },
    { value: 'sunday', label: 'Minggu' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-ui-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-whatsapp-primary border-t-transparent rounded-full"></div>
          <span className="text-ui-text-secondary">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pengaturan Tenant - Absenin</title>
      </Head>

      <div className="min-h-screen bg-ui-background">
        {/* Header */}
        <header className="bg-gradient-primary shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex items-center space-x-4 text-white/90 text-sm">
              <Link href="/dashboard" className="hover:text-white transition-colors">
                <span className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Dashboard</span>
                </span>
              </Link>
              <span>/</span>
              <span className="text-white font-medium">Pengaturan Tenant</span>
            </nav>
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-white">Pengaturan Tenant</h1>
              <p className="text-white/80 text-sm mt-1">Kelola informasi dan pengaturan perusahaan Anda</p>
            </div>
          </div>
        </header>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg backdrop-blur-sm border ${
            toast.type === 'success'
              ? 'bg-green-500/90 text-white border-green-400'
              : 'bg-red-500/90 text-white border-red-400'
          }`}>
            <div className="flex items-center space-x-3">
              {toast.type === 'success' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="ml-4 text-white/70 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Message */}
          {error && (
            <Card className="mb-6 p-4 bg-red-50 border-red-200">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tenant Info Card */}
            <div className="lg:col-span-1">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-ui-text-primary mb-4 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-whatsapp-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Informasi Tenant
                </h2>
                {tenant && (
                  <div className="space-y-4">
                    <Card glass className="p-4">
                      <p className="text-xs text-ui-text-tertiary mb-1">Nama Tenant</p>
                      <p className="text-sm font-medium text-ui-text-primary">{tenant.name}</p>
                    </Card>

                    <Card glass className="p-4">
                      <p className="text-xs text-ui-text-tertiary mb-1">Slug</p>
                      <p className="text-sm font-medium text-ui-text-primary">{tenant.slug}</p>
                    </Card>

                    <Card glass className="p-4">
                      <p className="text-xs text-ui-text-tertiary mb-1">Tenant ID</p>
                      <p className="text-xs font-mono text-ui-text-primary bg-gray-100 px-2 py-1 rounded">{tenant.tenant_id}</p>
                    </Card>

                    <Card glass className="p-4">
                      <p className="text-xs text-ui-text-tertiary mb-1">Dibuat</p>
                      <p className="text-sm font-medium text-ui-text-primary">
                        {new Date(tenant.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </Card>
                  </div>
                )}
              </Card>
            </div>

            {/* Settings Form */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-ui-text-primary mb-6 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-whatsapp-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Pengaturan Perusahaan
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company Name */}
                  <Input
                    id="company_name"
                    label="Nama Perusahaan"
                    placeholder="Masukkan nama perusahaan"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />

                  {/* Company Address */}
                  <Input
                    id="company_address"
                    label="Alamat Perusahaan"
                    placeholder="Masukkan alamat lengkap perusahaan"
                    value={formData.company_address}
                    onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                    multiline
                    rows={3}
                  />

                  {/* Company Phone & Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      id="company_phone"
                      label="No. Telepon"
                      placeholder="+62 xxx xxxx xxxx"
                      value={formData.company_phone}
                      onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                      icon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      }
                    />

                    <Input
                      id="company_email"
                      label="Email Perusahaan"
                      type="email"
                      placeholder="perusahaan@email.com"
                      value={formData.company_email}
                      onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                      icon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Working Days */}
                  <div>
                    <label className="block text-sm font-medium text-ui-text-secondary mb-3">
                      Hari Kerja
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {days.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleWorkingDayToggle(day.value)}
                          className={`px-2 py-3 text-xs font-medium rounded-lg border transition-all duration-200 ${
                            formData.working_days.includes(day.value)
                              ? 'bg-gradient-primary text-white border-whatsapp-primary shadow-lg'
                              : 'bg-white text-ui-text-primary border-ui-border hover:border-whatsapp-primary hover:bg-whatsapp-light/30'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      id="work_start_time"
                      label="Jam Masuk"
                      type="time"
                      value={formData.work_start_time}
                      onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                      icon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                    />

                    <Input
                      id="work_end_time"
                      label="Jam Pulang"
                      type="time"
                      value={formData.work_end_time}
                      onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                      icon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-ui-border">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.push('/dashboard')}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      loading={submitting}
                      className="min-w-[160px]"
                    >
                      {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// Make this page dynamic
export async function getServerSideProps() {
  return {
    props: {}
  };
}
