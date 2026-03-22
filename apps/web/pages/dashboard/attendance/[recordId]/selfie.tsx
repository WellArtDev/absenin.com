import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

interface AttendanceRecord {
  record_id: string;
  checkin_time: string;
  checkout_time: string | null;
  employee: {
    employee_id: string;
    full_name: string;
  };
}

interface SelfieUpload {
  upload_id: string;
  attendance_record_id: string;
  image_url: string;
  upload_type: 'checkin' | 'checkout';
  status: string;
  uploaded_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: AttendanceRecord;
  error?: {
    type: string;
    message: string;
  };
}

interface SelfieResponse {
  success: boolean;
  data?: SelfieUpload;
  error?: {
    type: string;
    message: string;
  };
}

export default function SelfieUploadPage() {
  const router = useRouter();
  const { recordId } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [checkinSelfie, setCheckinSelfie] = useState<SelfieUpload | null>(null);
  const [checkoutSelfie, setCheckoutSelfie] = useState<SelfieUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'checkin' | 'checkout' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchAttendance = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance/records/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setAttendance(data.data);
      } else {
        setError(data.error?.message || 'Gagal memuat data absensi');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Terjadi kesalahan saat memuat data absensi');
    } finally {
      setLoading(false);
    }
  };

  const fetchSelfies = async () => {
    if (!recordId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance/records/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        }
      });

      const data: any = await response.json();

      if (data.success && data.data?.selfie_uploads) {
        const checkin = data.data.selfie_uploads.find((s: SelfieUpload) => s.upload_type === 'checkin');
        const checkout = data.data.selfie_uploads.find((s: SelfieUpload) => s.upload_type === 'checkout');
        setCheckinSelfie(checkin || null);
        setCheckoutSelfie(checkout || null);
      }
    } catch (err) {
      console.error('Error fetching selfies:', err);
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchAttendance();
      fetchSelfies();
    }
  }, [recordId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setToast({
        message: 'Hanya file JPG dan PNG yang diperbolehkan',
        type: 'error'
      });
      return;
    }

    // Validate file size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast({
        message: 'Ukuran file maksimal 5 MB',
        type: 'error'
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (type: 'checkin' | 'checkout') => {
    if (!recordId || !preview) return;

    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      setToast({
        message: 'Silakan pilih file terlebih dahulu',
        type: 'error'
      });
      return;
    }

    try {
      setUploading(true);
      setUploadType(type);
      setError('');

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('selfie', fileInput.files[0]);

      const response = await fetch(`/api/attendance/${recordId}/selfie`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || ''
        },
        body: formData
      });

      const data: SelfieResponse = await response.json();

      if (data.success && data.data) {
        setToast({
          message: `Selfie ${type === 'checkin' ? 'check-in' : 'check-out'} berhasil diunggah`,
          type: 'success'
        });
        setPreview(null);
        if (fileInput) {
          fileInput.value = '';
        }
        fetchSelfies();
      } else {
        setToast({
          message: data.error?.message || 'Gagal mengunggah selfie',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error uploading selfie:', err);
      setToast({
        message: 'Terjadi kesalahan saat mengunggah selfie',
        type: 'error'
      });
    } finally {
      setUploading(false);
      setUploadType(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      handleFileSelect({ target: fileInputRef.current } as any);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Head>
        <title>Selfie Verifikasi - Absenin</title>
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
              <Link href="/dashboard/attendance" className="text-gray-500 hover:text-gray-700">
                Absensi
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">Selfie</li>
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
        ) : attendance ? (
          <>
            {/* Header */}
            <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h1 className="text-2xl font-bold text-gray-900">Selfie Verifikasi</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Unggah selfie sebagai bukti kehadiran
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Nama Karyawan</dt>
                    <dd className="mt-1 text-sm text-gray-900">{attendance.employee.full_name}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Waktu Check-in</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(attendance.checkin_time)}</dd>
                  </div>
                  {attendance.checkout_time && (
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Waktu Check-out</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(attendance.checkout_time)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Check-in Selfie */}
              <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Selfie Check-in</h2>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  {checkinSelfie ? (
                    <div>
                      <div className="mb-4">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}${checkinSelfie.image_url}`}
                          alt="Selfie Check-in"
                          className="w-full max-w-sm rounded border border-gray-200"
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        <p>Diunggah: {formatDate(checkinSelfie.uploaded_at)}</p>
                        <p>Status: {checkinSelfie.status}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {preview && uploadType !== 'checkout' && (
                        <div className="mb-4">
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-full max-w-sm rounded border border-gray-200"
                          />
                        </div>
                      )}
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                      >
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="mt-4 flex text-sm text-gray-600">
                          <label
                            htmlFor="checkin-selfie"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Upload file</span>
                            <input
                              ref={fileInputRef}
                              id="checkin-selfie"
                              type="file"
                              className="sr-only"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={handleFileSelect}
                            />
                          </label>
                          <p className="pl-1">atau drag & drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG hingga 5 MB</p>
                      </div>
                      {preview && uploadType !== 'checkout' && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleUpload('checkin')}
                            disabled={uploading}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploading ? 'Mengunggah...' : 'Unggah Selfie Check-in'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Check-out Selfie */}
              {attendance.checkout_time && (
                <div className="bg-white shadow overflow-hidden border border-gray-200 rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h2 className="text-lg font-medium text-gray-900">Selfie Check-out</h2>
                  </div>
                  <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                    {checkoutSelfie ? (
                      <div>
                        <div className="mb-4">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL}${checkoutSelfie.image_url}`}
                            alt="Selfie Check-out"
                            className="w-full max-w-sm rounded border border-gray-200"
                          />
                        </div>
                        <div className="text-sm text-gray-500">
                          <p>Diunggah: {formatDate(checkoutSelfie.uploaded_at)}</p>
                          <p>Status: {checkoutSelfie.status}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {preview && uploadType === 'checkout' && (
                          <div className="mb-4">
                            <img
                              src={preview}
                              alt="Preview"
                              className="w-full max-w-sm rounded border border-gray-200"
                            />
                          </div>
                        )}
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                        >
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="mt-4 flex text-sm text-gray-600">
                            <label
                              htmlFor="checkout-selfie"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload file</span>
                              <input
                                id="checkout-selfie"
                                type="file"
                                className="sr-only"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={(e) => {
                                  setUploadType('checkout');
                                  handleFileSelect(e);
                                }}
                              />
                            </label>
                            <p className="pl-1">atau drag & drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG hingga 5 MB</p>
                        </div>
                        {preview && uploadType === 'checkout' && (
                          <div className="mt-4">
                            <button
                              onClick={() => handleUpload('checkout')}
                              disabled={uploading}
                              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {uploading ? 'Mengunggah...' : 'Unggah Selfie Check-out'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Back Button */}
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard/attendance')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Kembali ke Riwayat Absensi
              </button>
            </div>
          </>
        ) : null}
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
