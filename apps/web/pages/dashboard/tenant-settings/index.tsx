import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-blue-600 mr-3" />
        <span className="text-gray-500">Memuat data...</span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pengaturan Tenant - Absenin</title>
      </Head>

      <div className="mx-auto px-4 sm:px-6 lg:px-12 py-6">
        {/* Breadcrumb */}
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                Dashboard
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">Pengaturan Tenant</li>
          </ol>
        </nav>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="ml-auto pl-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Tenant</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola informasi dan pengaturan perusahaan Anda
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Informasi Tenant</h2>
              {tenant && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nama Tenant</p>
                    <p className="text-sm text-gray-900">{tenant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Slug</p>
                    <p className="text-sm text-gray-900">{tenant.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tenant ID</p>
                    <p className="text-sm text-gray-900 font-mono text-xs">{tenant.tenant_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dibuat</p>
                    <p className="text-sm text-gray-900">
                      {new Date(tenant.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Pengaturan Perusahaan</h2>

                {/* Company Name */}
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                    Nama Perusahaan
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Company Address */}
                <div>
                  <label htmlFor="company_address" className="block text-sm font-medium text-gray-700">
                    Alamat Perusahaan
                  </label>
                  <textarea
                    id="company_address"
                    rows={3}
                    value={formData.company_address}
                    onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Company Phone & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company_phone" className="block text-sm font-medium text-gray-700">
                      No. Telepon
                    </label>
                    <input
                      type="text"
                      id="company_phone"
                      value={formData.company_phone}
                      onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="company_email" className="block text-sm font-medium text-gray-700">
                      Email Perusahaan
                    </label>
                    <input
                      type="email"
                      id="company_email"
                      value={formData.company_email}
                      onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Working Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hari Kerja
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleWorkingDayToggle(day.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-md border ${
                          formData.working_days.includes(day.value)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Working Hours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="work_start_time" className="block text-sm font-medium text-gray-700">
                      Jam Masuk
                    </label>
                    <input
                      type="time"
                      id="work_start_time"
                      value={formData.work_start_time}
                      onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="work_end_time" className="block text-sm font-medium text-gray-700">
                      Jam Pulang
                    </label>
                    <input
                      type="time"
                      id="work_end_time"
                      value={formData.work_end_time}
                      onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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
