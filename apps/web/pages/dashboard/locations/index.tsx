import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

interface OfficeLocation {
  location_id: string;
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number;
  is_main: boolean;
  created_at: string;
}

interface ListResponse {
  success: boolean;
  data?: OfficeLocation[];
  error?: {
    type: string;
    message: string;
  };
}

interface LocationRequest {
  name?: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  radius_meters?: number | undefined;
  is_main?: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: OfficeLocation;
  error?: {
    type: string;
    message: string;
  };
}

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);

  // Location testing state
  const [testingLocation, setTestingLocation] = useState(false);
  const [locationResult, setLocationResult] = useState<any>(null);

  const [formData, setFormData] = useState<LocationRequest>({
    name: '',
    latitude: undefined,
    longitude: undefined,
    radius_meters: undefined,
    is_main: false
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LocationRequest, string>>>({});

  const handleTestLocation = () => {
    if (!navigator.geolocation) {
      setToast({
        message: 'Browser Anda tidak mendukung geolocation',
        type: 'error'
      });
      return;
    }

    setTestingLocation(true);
    setLocationResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/locations/validate-presence', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
            },
            body: JSON.stringify({ latitude, longitude })
          });

          const data: any = await response.json();

          if (data.success && data.data) {
            setLocationResult(data.data);
          } else {
            setToast({
              message: data.error?.message || 'Gagal memvalidasi lokasi',
              type: 'error'
            });
          }
        } catch (err) {
          console.error('Error validating location:', err);
          setToast({
            message: 'Terjadi kesalahan saat memvalidasi lokasi',
            type: 'error'
          });
        } finally {
          setTestingLocation(false);
        }
      },
      (error) => {
        setTestingLocation(false);
        let message = 'Gagal mendapatkan lokasi Anda';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Izin lokasi ditolak. Silakan aktifkan lokasi di browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            message = 'Waktu habis untuk mendapatkan lokasi.';
            break;
        }

        setToast({
          message,
          type: 'error'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: ListResponse = await response.json();

      if (data.success && data.data) {
        setLocations(data.data);
      } else {
        setError(data.error?.message || 'Gagal memuat lokasi kantor');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Terjadi kesalahan saat memuat lokasi kantor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenModal = (location?: OfficeLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        radius_meters: location.radius_meters,
        is_main: location.is_main
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        latitude: undefined,
        longitude: undefined,
        radius_meters: undefined,
        is_main: false
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      latitude: undefined,
      longitude: undefined,
      radius_meters: undefined,
      is_main: false
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof LocationRequest, string>> = {};

    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Nama lokasi wajib diisi';
    }

    if (formData.latitude === undefined || formData.latitude === null || isNaN(formData.latitude)) {
      errors.latitude = 'Latitude wajib diisi';
    } else if (formData.latitude < -90 || formData.latitude > 90) {
      errors.latitude = 'Latitude harus antara -90 dan 90';
    }

    if (formData.longitude === undefined || formData.longitude === null || isNaN(formData.longitude)) {
      errors.longitude = 'Longitude wajib diisi';
    } else if (formData.longitude < -180 || formData.longitude > 180) {
      errors.longitude = 'Longitude harus antara -180 dan 180';
    }

    if (formData.radius_meters === undefined || formData.radius_meters === null || isNaN(formData.radius_meters)) {
      errors.radius_meters = 'Radius wajib diisi';
    } else if (!Number.isInteger(formData.radius_meters) || formData.radius_meters <= 0) {
      errors.radius_meters = 'Radius harus bilangan bulat positif';
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
      const url = editingLocation
        ? `/api/locations/${editingLocation.location_id}`
        : '/api/locations/create';

      const method = editingLocation ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        },
        body: JSON.stringify(formData)
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setToast({
          message: editingLocation ? 'Lokasi berhasil diperbarui' : 'Lokasi berhasil ditambahkan',
          type: 'success'
        });
        handleCloseModal();
        fetchLocations();
      } else {
        setToast({
          message: data.error?.message || 'Gagal menyimpan lokasi',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setToast({
        message: 'Terjadi kesalahan saat menyimpan lokasi',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (location: OfficeLocation) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus lokasi "${location.name}"?`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/locations/${location.location_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: any = await response.json();

      if (data.success) {
        setToast({
          message: 'Lokasi berhasil dihapus',
          type: 'success'
        });
        fetchLocations();
      } else {
        setToast({
          message: data.error?.message || 'Gagal menghapus lokasi',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error deleting location:', err);
      setToast({
        message: 'Terjadi kesalahan saat menghapus lokasi',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <>
      <Head>
        <title>Manajemen Lokasi Kantor - Absenin</title>
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
            <li className="text-gray-900 font-medium">Lokasi Kantor</li>
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
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Lokasi Kantor</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola lokasi kantor dan zona geofence untuk absensi
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleTestLocation}
              disabled={testingLocation}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {testingLocation ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
                  Mendeteksi Lokasi...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Uji Lokasi Saya
                </>
              )}
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + Tambah Lokasi
            </button>
          </div>
        </div>

        {/* Location Test Result */}
        {locationResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            locationResult.is_within_radius
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {locationResult.is_within_radius ? (
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  locationResult.is_within_radius ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {locationResult.is_within_radius ? 'Anda Berada dalam Radius Lokasi Kantor' : 'Anda Berada di Luar Radius Lokasi Kantor'}
                </h3>
                <div className="mt-2 text-sm">
                  {locationResult.matched_location ? (
                    <div>
                      <p className={`${
                        locationResult.is_within_radius ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        <strong>Lokasi:</strong> {locationResult.matched_location.name}<br />
                        <strong>Jarak:</strong> {locationResult.matched_location.distance_meters} meter dari {locationResult.matched_location.allowed_radius_meters} meter maksimum
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className={`${
                        locationResult.is_within_radius ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        <strong>Lokasi Terdekat:</strong> {locationResult.closest_location?.name}<br />
                        <strong>Jarak:</strong> {locationResult.closest_location?.distance_from_user} meter (radius maksimum: {locationResult.closest_location?.radius_meters} meter)
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setLocationResult(null)}
                  className="mt-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

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
        ) : locations.length === 0 ? (
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada lokasi kantor</h3>
            <p className="mt-1 text-sm text-gray-500">
              Mulai dengan menambahkan lokasi kantor pertama Anda
            </p>
            <div className="mt-6">
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                + Tambah Lokasi
              </button>
            </div>
          </div>
        ) : (
          /* Locations Table */
          <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Lokasi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latitude, Longitude
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Radius (meter)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utama?
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locations.map((location, index) => (
                  <tr key={location.location_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{location.name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {location.radius_meters.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {location.is_main ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ya
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Tidak
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenModal(location)}
                        disabled={submitting}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(location)}
                        disabled={submitting}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      {editingLocation ? 'Edit Lokasi Kantor' : 'Tambah Lokasi Kantor'}
                    </h3>

                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Nama Lokasi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                        )}
                      </div>

                      {/* Latitude */}
                      <div>
                        <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                          Latitude <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          id="latitude"
                          value={formData.latitude ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({
                              ...formData,
                              latitude: value === '' ? undefined : parseFloat(value)
                            });
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {formErrors.latitude && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.latitude}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Rentang: -90 sampai 90</p>
                      </div>

                      {/* Longitude */}
                      <div>
                        <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                          Longitude <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          id="longitude"
                          value={formData.longitude ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({
                              ...formData,
                              longitude: value === '' ? undefined : parseFloat(value)
                            });
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {formErrors.longitude && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.longitude}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Rentang: -180 sampai 180</p>
                      </div>

                      {/* Radius */}
                      <div>
                        <label htmlFor="radius" className="block text-sm font-medium text-gray-700">
                          Radius (meter) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="radius"
                          value={formData.radius_meters ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({
                              ...formData,
                              radius_meters: value === '' ? undefined : parseInt(value)
                            });
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {formErrors.radius_meters && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.radius_meters}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Bilangan bulat positif</p>
                      </div>

                      {/* Is Main */}
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="is_main"
                            type="checkbox"
                            checked={formData.is_main || false}
                            onChange={(e) => setFormData({ ...formData, is_main: e.target.checked })}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="is_main" className="font-medium text-gray-700">
                            Jadikan lokasi utama
                          </label>
                          <p className="text-gray-500">
                            Hanya satu lokasi yang dapat ditandai sebagai lokasi utama
                          </p>
                        </div>
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
