import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

interface Permission {
  permission_id: string;
  code: string;
  description: string;
}

interface Role {
  role_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  permission_count: number;
  permission_codes: string[];
  user_count: number;
}

interface RoleDetailResponse {
  success: boolean;
  data?: Role;
  error?: {
    type: string;
    message: string;
  };
}

interface PermissionsResponse {
  success: boolean;
  data?: {
    role_id: string;
    role_name: string;
    assigned_permissions: Array<{
      permission_id: string;
      code: string;
      description: string;
      assigned_at: string;
    }>;
    assigned_codes: string[];
    all_permissions_by_module: { [key: string]: Permission[] };
  };
  error?: {
    type: string;
    message: string;
  };
}

export default function RoleDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [role, setRole] = useState<Role | null>(null);
  const [permissionsData, setPermissionsData] = useState<PermissionsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchRole = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/roles/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: RoleDetailResponse = await response.json();

      if (data.success && data.data) {
        setRole(data.data);
      } else {
        setError(data.error?.message || 'Gagal memuat role');
      }
    } catch (err) {
      console.error('Error fetching role:', err);
      setError('Terjadi kesalahan saat memuat role');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/roles/${id}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: PermissionsResponse = await response.json();

      if (data.success && data.data) {
        setPermissionsData(data.data);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRole();
      fetchPermissions();
    }
  }, [id]);

  const handlePermissionToggle = async (permissionCode: string) => {
    if (!permissionsData || role?.is_system) return;

    const currentCodes = permissionsData.assigned_codes || [];
    const isAssigned = currentCodes.includes(permissionCode);

    const newCodes = isAssigned
      ? currentCodes.filter(code => code !== permissionCode)
      : [...currentCodes, permissionCode];

    try {
      setSaving(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/roles/${id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        },
        body: JSON.stringify({ permissions: newCodes })
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Izin berhasil diperbarui',
          type: 'success'
        });
        fetchPermissions();
        fetchRole();
      } else {
        setToast({
          message: data.error?.message || 'Gagal memperbarui izin',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating permissions:', err);
      setToast({
        message: 'Terjadi kesalahan saat memperbarui izin',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionLabel = (code: string): string => {
    const parts = code.split(':');
    if (parts.length >= 2) {
      return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    return code;
  };

  const getModuleLabel = (module: string): string => {
    const labels: { [key: string]: string } = {
      employee: 'Karyawan',
      attendance: 'Absensi',
      role: 'Role & Izin',
      geofence: 'Lokasi Kantor',
      report: 'Laporan',
      settings: 'Pengaturan',
      other: 'Lainnya'
    };
    return labels[module] || module;
  };

  return (
    <>
      <Head>
        <title>Detail Role - Absenin</title>
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
            <li>
              <Link href="/dashboard/roles" className="text-gray-500 hover:text-gray-700">
                Role
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">Detail</li>
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

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 text-blue-600 mr-3" />
            <span className="text-gray-500">Memuat data...</span>
          </div>
        ) : error ? (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : role ? (
          <>
            {/* Header */}
            <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      {role.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {role.is_system && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Sistem
                      </span>
                    )}
                    <button
                      onClick={() => router.push('/dashboard/roles')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      ← Kembali
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Jumlah Izin</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {role.permission_count}
                      </span>
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Jumlah User</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {role.user_count}
                      </span>
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Dibuat Pada</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(role.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Permissions Section */}
            {permissionsData && !role.is_system && (
              <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Kelola Izin</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Pilih izin yang ingin diberikan ke role ini
                  </p>
                </div>

                {saving && (
                  <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-600">
                    Menyimpan perubahan...
                  </div>
                )}

                <div className="border-t border-gray-200">
                  {Object.entries(permissionsData.all_permissions_by_module || {}).map(([module, permissions]) => (
                    <div key={module} className="border-b border-gray-200 last:border-b-0">
                      <div className="px-4 py-3 bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-900">
                          {getModuleLabel(module)}
                        </h3>
                      </div>
                      <div className="px-4 py-3">
                        <div className="space-y-2">
                          {permissions.map((permission) => {
                            const isAssigned = permissionsData.assigned_codes.includes(permission.code);
                            return (
                              <label
                                key={permission.permission_id}
                                className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => handlePermissionToggle(permission.code)}
                                  disabled={saving}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {getPermissionLabel(permission.code)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {permission.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {role.is_system && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Role Sistem
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      Role ini adalah role sistem dan izinnya tidak dapat diubah.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}

// Make this page dynamic to avoid static generation issues
export async function getServerSideProps() {
  return {
    props: {}
  };
}
