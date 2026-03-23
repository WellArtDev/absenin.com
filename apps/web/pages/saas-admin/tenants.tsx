import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  employee_count: number;
  created_at: string;
  subscription_plan?: string;
  subscription_expiry?: string;
}

export default function TenantManagementPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subscription_plan: 'basic'
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/saas-admin/login');
      return;
    }

    fetchTenants();
  }, [router]);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3001/api/admin/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setTenants(data.data?.tenants || []);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tenant?: Tenant) => {
    if (tenant) {
      setModalMode('edit');
      setSelectedTenant(tenant);
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        subscription_plan: tenant.subscription_plan || 'basic'
      });
    } else {
      setModalMode('create');
      setSelectedTenant(null);
      setFormData({
        name: '',
        slug: '',
        subscription_plan: 'basic'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTenant(null);
    setFormData({
      name: '',
      slug: '',
      subscription_plan: 'basic'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('admin_token');
      
      if (modalMode === 'create') {
        const response = await fetch('http://localhost:3001/api/admin/tenants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.success) {
          handleCloseModal();
          fetchTenants();
        }
      } else if (modalMode === 'edit' && selectedTenant) {
        const response = await fetch(`http://localhost:3001/api/admin/tenants/${selectedTenant.tenant_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.success) {
          handleCloseModal();
          fetchTenants();
        }
      }
    } catch (error) {
      console.error('Error saving tenant:', error);
    }
  };

  const handleToggleActive = async (tenantId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`http://localhost:3001/api/admin/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !isActive })
      });

      fetchTenants();
    } catch (error) {
      console.error('Error toggling tenant status:', error);
    }
  };

  const handleDelete = async (tenantId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tenant ini?')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`http://localhost:3001/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Kelola Tenant - Absenin SaaS</title>
      </Head>

      <div className="min-h-screen bg-ui-background">
        {/* Header */}
        <header className="bg-gradient-primary shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex items-center space-x-4 text-white/90 text-sm">
              <Link href="/saas-admin/dashboard" className="hover:text-white transition-colors">
                <span className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Dashboard</span>
                </span>
              </Link>
              <span>/</span>
              <span className="text-white font-medium">Kelola Tenant</span>
            </nav>
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-white">Kelola Tenant</h1>
              <p className="text-white/80 text-sm mt-1">Tambah, edit, dan kelola semua tenant</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Actions */}
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <Input
              placeholder="Cari tenant berdasarkan nama atau slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-96"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <Button onClick={() => handleOpenModal()}>
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Tenant
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card glass className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ui-text-secondary">Total Tenant</p>
                  <p className="text-2xl font-bold text-ui-text-primary mt-1">{tenants.length}</p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card glass className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ui-text-secondary">Tenant Aktif</p>
                  <p className="text-2xl font-bold text-ui-text-primary mt-1">
                    {tenants.filter(t => t.is_active).length}
                  </p>
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
                  <p className="text-sm text-ui-text-secondary">Total Karyawan</p>
                  <p className="text-2xl font-bold text-ui-text-primary mt-1">
                    {tenants.reduce((sum, t) => sum + t.employee_count, 0)}
                  </p>
                </div>
                <div className="bg-indigo-500/10 p-3 rounded-xl">
                  <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* Tenant List */}
          <Card className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-whatsapp-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-12 text-ui-text-secondary">
                <svg className="h-12 w-12 mx-auto mb-4 text-ui-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p>Tidak ada tenant yang ditemukan</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-ui-text-secondary border-b border-ui-border">
                      <th className="pb-4 font-medium">Nama Tenant</th>
                      <th className="pb-4 font-medium">Slug</th>
                      <th className="pb-4 font-medium">Status</th>
                      <th className="pb-4 font-medium">Karyawan</th>
                      <th className="pb-4 font-medium">Plan</th>
                      <th className="pb-4 font-medium">Dibuat</th>
                      <th className="pb-4 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.tenant_id} className="border-b border-ui-border hover:bg-gray-50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-gradient-primary p-2 rounded-lg">
                              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <span className="font-medium text-ui-text-primary">
                              {tenant.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-ui-text-secondary">
                          {tenant.slug}
                        </td>
                        <td className="py-4">
                          {tenant.is_active ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Tidak Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-sm text-ui-text-secondary">
                          {tenant.employee_count}
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                            {tenant.subscription_plan || 'Basic'}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-ui-text-secondary">
                          {new Date(tenant.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(tenant.tenant_id, tenant.is_active)}
                            >
                              {tenant.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(tenant)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(tenant.tenant_id)}
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </main>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-ui-text-primary">
                  {modalMode === 'create' ? 'Tambah Tenant Baru' : 'Edit Tenant'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-ui-text-tertiary hover:text-ui-text-primary transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nama Tenant"
                  placeholder="PT Nama Perusahaan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <Input
                  label="Slug"
                  placeholder="nama-perusahaan"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  required
                  helperText="Slug akan digunakan sebagai subdomain: slug.absenin.com"
                />

                <div>
                  <label className="block text-sm font-medium text-ui-text-secondary mb-2">
                    Subscription Plan
                  </label>
                  <select
                    value={formData.subscription_plan}
                    onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-ui-border text-sm text-ui-text-primary focus:outline-none focus:border-whatsapp-primary focus:ring-2 focus:ring-whatsapp-primary/20"
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="secondary" onClick={handleCloseModal}>
                    Batal
                  </Button>
                  <Button type="submit">
                    {modalMode === 'create' ? 'Tambah Tenant' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {}
  };
}
