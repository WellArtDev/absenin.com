import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

interface Employee {
  employee_id: string;
  tenant_id: string;
  nip: string;
  full_name: string;
  email?: string;
  phone?: string;
  division_id?: string;
  position_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  division?: {
    division_id: string;
    name: string;
  };
  position?: {
    position_id: string;
    name: string;
  };
}

interface Division {
  division_id: string;
  name: string;
  parent_division_id?: string;
}

interface Position {
  position_id: string;
  name: string;
  division_id: string;
  division?: {
    division_id: string;
    name: string;
  };
}

interface EmployeeRequest {
  nip: string;
  full_name: string;
  email?: string;
  phone?: string;
  division_id?: string;
  position_id?: string;
}

interface ApiResponse {
  success: boolean;
  data?: Employee;
  error?: {
    type: string;
    message: string;
  };
}

interface ListResponse {
  success: boolean;
  data?: Employee[];
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

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filter state
  const [search, setSearch] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');

  const [formData, setFormData] = useState<EmployeeRequest>({
    nip: '',
    full_name: '',
    email: '',
    phone: '',
    division_id: '',
    position_id: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EmployeeRequest, string>>>({});

  const fetchDivisionsAndPositions = async () => {
    try {
      const token = localStorage.getItem('token');

      const [divisionsRes, positionsRes] = await Promise.all([
        fetch('/api/divisions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
          }
        }),
        fetch('/api/positions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
          }
        })
      ]);

      const divisionsData = await divisionsRes.json();
      const positionsData = await positionsRes.json();

      if (divisionsData.success) {
        setDivisions(divisionsData.data || []);
      }

      if (positionsData.success) {
        setPositions(positionsData.data || []);
      }
    } catch (err) {
      console.error('Error fetching divisions/positions:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (search) params.append('search', search);
      if (filterDivision) params.append('division_id', filterDivision);
      if (filterPosition) params.append('position_id', filterPosition);
      if (filterActive) params.append('is_active', filterActive);

      const response = await fetch(`/api/employees?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: ListResponse = await response.json();

      if (data.success && data.data) {
        setEmployees(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.pages);
          setTotal(data.pagination.total);
        }
      } else {
        setError(data.error?.message || 'Gagal memuat data karyawan');
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Terjadi kesalahan saat memuat data karyawan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisionsAndPositions();
    fetchEmployees();
  }, [page]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
    fetchEmployees();
  }, [search, filterDivision, filterPosition, filterActive]);

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        nip: employee.nip,
        full_name: employee.full_name,
        email: employee.email || '',
        phone: employee.phone || '',
        division_id: employee.division_id || '',
        position_id: employee.position_id || ''
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        nip: '',
        full_name: '',
        email: '',
        phone: '',
        division_id: '',
        position_id: ''
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData({
      nip: '',
      full_name: '',
      email: '',
      phone: '',
      division_id: '',
      position_id: ''
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof EmployeeRequest, string>> = {};

    if (!formData.nip || formData.nip.trim() === '') {
      errors.nip = 'NIP wajib diisi';
    }

    if (!formData.full_name || formData.full_name.trim() === '') {
      errors.full_name = 'Nama lengkap wajib diisi';
    }

    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Format email tidak valid';
      }
    }

    if (formData.division_id && !formData.position_id) {
      errors.position_id = 'Jabatan wajib dipilih jika divisi dipilih';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const token = localStorage.getItem('token');
      const url = editingEmployee
        ? `/api/employees/${editingEmployee.employee_id}`
        : '/api/employees/create';

      const method = editingEmployee ? 'PATCH' : 'POST';

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

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
          division_id: formData.division_id || undefined,
          position_id: formData.position_id || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setToast({
          message: editingEmployee ? 'Karyawan berhasil diperbarui' : 'Karyawan berhasil ditambahkan',
          type: 'success'
        });
        handleCloseModal();
        fetchEmployees();
      } else {
        setToast({
          message: data.error?.message || 'Gagal menyimpan data karyawan',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setToast({
        message: 'Terjadi kesalahan saat menyimpan data karyawan',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan karyawan "${employee.full_name}"?`)) {
      return;
    }

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
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
      };

      if (csrfData.data?.csrfToken) {
        headers['x-csrf-token'] = csrfData.data.csrfToken;
      }

      const response = await fetch(`/api/employees/${employee.employee_id}`, {
        method: 'DELETE',
        headers
      });

      const data: any = await response.json();

      if (data.success) {
        setToast({
          message: 'Karyawan berhasil dinonaktifkan',
          type: 'success'
        });
        fetchEmployees();
      } else {
        setToast({
          message: data.error?.message || 'Gagal menonaktifkan karyawan',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
      setToast({
        message: 'Terjadi kesalahan saat menonaktifkan karyawan',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDivisionChange = (divisionId: string) => {
    setFormData({
      ...formData,
      division_id: divisionId,
      position_id: '' // Reset position when division changes
    });
  };

  const filteredPositions = formData.division_id
    ? positions.filter(p => p.division_id === formData.division_id)
    : positions;

  return (
    <>
      <Head>
        <title>Data Karyawan - Absenin</title>
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
            <li className="text-gray-900 font-medium">Data Karyawan</li>
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Karyawan</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola data karyawan dan informasi jabatan
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + Tambah Karyawan
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Cari
              </label>
              <input
                type="text"
                id="search"
                placeholder="Nama, NIP, atau email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Filter by Division */}
            <div>
              <label htmlFor="filterDivision" className="block text-sm font-medium text-gray-700 mb-1">
                Divisi
              </label>
              <select
                id="filterDivision"
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Semua Divisi</option>
                {divisions.map((division) => (
                  <option key={division.division_id} value={division.division_id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Position */}
            <div>
              <label htmlFor="filterPosition" className="block text-sm font-medium text-gray-700 mb-1">
                Jabatan
              </label>
              <select
                id="filterPosition"
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Semua Jabatan</option>
                {positions.map((position) => (
                  <option key={position.position_id} value={position.position_id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label htmlFor="filterActive" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="filterActive"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Semua Status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 text-blue-600 mr-3" />
            <span className="text-gray-500">Memuat data...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada data karyawan</h3>
            <p className="mt-1 text-sm text-gray-500">
              Mulai dengan menambahkan karyawan pertama Anda
            </p>
            <div className="mt-6">
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                + Tambah Karyawan
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Employees Table */}
            <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NIP
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Lengkap
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Divisi / Jabatan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kontak
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tindakan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee, index) => (
                      <tr key={employee.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(page - 1) * limit + index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.nip}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                          {employee.email && (
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.division?.name && employee.position?.name ? (
                            <div>
                              <div>{employee.division.name}</div>
                              <div className="text-xs text-gray-400">{employee.position.name}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.phone || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {employee.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleOpenModal(employee)}
                            disabled={submitting}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          {employee.is_active && (
                            <button
                              onClick={() => handleDelete(employee)}
                              disabled={submitting}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              Nonaktifkan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-700">
                  Menampilkan {(page - 1) * limit + 1} sampai {Math.min(page * limit, total)} dari {total} data
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Halaman {page} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={handleCloseModal}
              ></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                    </h3>

                    <div className="space-y-4">
                      {/* NIP */}
                      <div>
                        <label htmlFor="nip" className="block text-sm font-medium text-gray-700">
                          NIP <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="nip"
                          value={formData.nip}
                          onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {formErrors.nip && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.nip}</p>
                        )}
                      </div>

                      {/* Full Name */}
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                          Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {formErrors.full_name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.full_name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {formErrors.email && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          No. Telepon
                        </label>
                        <input
                          type="text"
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      {/* Division */}
                      <div>
                        <label htmlFor="division" className="block text-sm font-medium text-gray-700">
                          Divisi
                        </label>
                        <select
                          id="division"
                          value={formData.division_id}
                          onChange={(e) => handleDivisionChange(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Pilih Divisi</option>
                          {divisions.map((division) => (
                            <option key={division.division_id} value={division.division_id}>
                              {division.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Position */}
                      <div>
                        <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                          Jabatan
                        </label>
                        <select
                          id="position"
                          value={formData.position_id}
                          onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                          disabled={!formData.division_id}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Pilih Jabatan</option>
                          {filteredPositions.map((position) => (
                            <option key={position.position_id} value={position.position_id}>
                              {position.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.position_id && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.position_id}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {submitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Batal
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

// Make this page dynamic
export async function getServerSideProps() {
  return {
    props: {}
  };
}
