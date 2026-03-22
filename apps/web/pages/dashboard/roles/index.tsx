import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

interface Role {
  role_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permission_count: number;
  user_count: number;
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: Role[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  error?: {
    type: string;
    message: string;
  };
}

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchRoles = async (currentPage = page) => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/roles?page=${currentPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setRoles(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.pages);
        }
      } else {
        setError(data.error?.message || 'Gagal memuat role');
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Terjadi kesalahan saat memuat role');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nama role wajib diisi');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingRole
        ? `/api/roles/${editingRole.role_id}`
        : '/api/roles/create';

      const method = editingRole ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: editingRole ? 'Role berhasil diperbarui' : 'Role berhasil dibuat',
          type: 'success'
        });
        setShowModal(false);
        setEditingRole(null);
        setFormData({ name: '', description: '' });
        fetchRoles();
      } else {
        setError(data.error?.message || 'Gagal menyimpan role');
      }
    } catch (err) {
      console.error('Error submitting role:', err);
      setError('Terjadi kesalahan saat menyimpan role');
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || ''
    });
    setShowModal(true);
    setError('');
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus role ini?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Role berhasil dihapus',
          type: 'success'
        });
        fetchRoles();
      } else {
        setToast({
          message: data.error?.message || 'Gagal menghapus role',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      setToast({
        message: 'Terjadi kesalahan saat menghapus role',
        type: 'error'
      });
    }
  };

  const openModal = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setError('');
    setShowModal(true);
  };

  return (
    <>
      <Head>
        <title>Manajemen Role - Absenin</title>
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
            <li className="text-gray-900 font-medium">Role</li>
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
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Role</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola hak akses dan izin untuk pengguna
            </p>
          </div>
          <div>
            <button
              onClick={openModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + Tambah Role
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Roles Table */}
        <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 text-blue-600 mr-3" />
              <span className="text-gray-500">Memuat data...</span>
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2a3 3 0 013-3v-2a3 3 0 013-3m0 0h14a3 3 0 002 3v2a3 3 0 002-3m-2 3h-3m-3 0a3 3 0 01-3-3m6 0a3 3 0 013 3m0 0V17a3 3 0 01-3 3m0 0H3a3 3 0 01-3-3V4a3 3 0 013-3h3"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada role yang ditambahkan</h3>
              <p className="mt-1 text-sm text-gray-500">Mulai dengan menambah role baru</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah Izin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sistem?
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map((role, index) => (
                    <tr
                      key={role.role_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/roles/${role.role_id}`)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(page - 1) * 10 + index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{role.name}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-500">
                          {role.description || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {role.permission_count}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {role.is_system ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ya
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Tidak
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {role.user_count}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(role);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        {!role.is_system && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(role.role_id);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Halaman {page} dari {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setShowModal(false)}
              ></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {editingRole ? 'Edit Role' : 'Tambah Role Baru'}
                    </h3>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Nama Role <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Contoh: Admin, Manager"
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Deskripsi
                        </label>
                        <textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Deskripsi singkat tentang role ini (opsional)"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-sm sm:justify-end sm:space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:text-sm"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:text-sm"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
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
