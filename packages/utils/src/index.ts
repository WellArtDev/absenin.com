// Utility functions for the Absenin application

import { LocationData, AttendanceRecord, Employee, MapPin } from '@absenin/types';

// Distance calculation using Haversine formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δφ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Check if location is within geofence radius
export const isWithinGeofence = (lat1: number, lon1: number, lat2: number, lon2: number, radius: number): boolean => {
  return calculateDistance(lat1, lon1, lat2, lon2) <= radius;
};

// Format time in Indonesian format
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// Format date in Indonesian format
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Format datetime in Indonesian format
export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Generate map pins from attendance records
export const generateMapPins = (records: AttendanceRecord[]): MapPin[] => {
  return records.map(record => {
    const checkinLocation = record.checkin_location;
    const checkoutLocation = record.checkout_location;

    return {
      employee_id: record.employee_id,
      employee_name: '', // Will be populated with employee data
      checkin_time: record.checkin_time,
      checkout_time: record.checkout_time,
      lat: checkinLocation?.lat || 0,
      lon: checkinLocation?.lon || 0,
      verification_type: record.verification_type,
      status: record.status,
      selfie_url: '', // Will be populated if selfie exists
      distance_meters: 0, // Will be calculated if office location is available
      inside_geofence: true // Will be calculated
    };
  });
};

// Validate Indonesian NIP (basic format)
export const validateNIP = (nip: string): boolean => {
  // Basic validation: 16-20 digits
  const nipRegex = /^\d{16,20}$/;
  return nipRegex.test(nip);
};

// Check if user has permission
export const hasPermission = (user: any, permissionCode: string): boolean => {
  if (!user || !user.roles) return false;

  return user.roles.some((role: any) =>
    role.permissions?.some((permission: any) => permission.code === permissionCode) ||
    role.name === 'owner'  // Owner has all permissions
  );
};

// Format phone number (Indonesian format)
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove non-digit characters
  const digits = phone.replace(/[^\d]/g, '');

  // Format as +62-xxx-xxxxxxx
  if (digits.startsWith('0')) {
    return '+62' + digits.substring(1);
  } else if (digits.startsWith('62')) {
    return '+' + digits;
  } else {
    return '+' + digits;
  }
};

// Generate random verification code
export const generateVerificationCode = (length: number = 6): string => {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
};

// Calculate working hours
export const calculateWorkingHours = (checkin: Date, checkout: Date): number => {
  const diffMs = checkout.getTime() - checkin.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
};

// Check if employee is late
export const isLate = (checkinTime: Date, workStartTime: Date, toleranceMinutes: number): boolean => {
  const checkinMinutes = checkinTime.getHours() * 60 + checkinTime.getMinutes();
  const workStartMinutes = workStartTime.getHours() * 60 + workStartTime.getMinutes();

  return checkinMinutes > workStartMinutes + toleranceMinutes;
};

// Format status for display
export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Menunggu Verifikasi',
    'approved': 'Disetujui',
    'rejected': 'Ditolak',
    'manual': 'Manual',
    'gps': 'GPS',
    'selfie': 'Selfie'
  };

  return statusMap[status] || status;
};

// Calculate distance from office location
export const calculateDistanceFromOffice = (employeeLat: number, employeeLon: number, officeLat: number, officeLon: number): number => {
  return calculateDistance(employeeLat, employeeLon, officeLat, officeLon);
};

// Generate report summary
export const generateAttendanceSummary = (records: AttendanceRecord[]): Record<string, any> => {
  const totalRecords = records.length;
  const approvedRecords = records.filter(r => r.status === 'approved').length;
  const pendingRecords = records.filter(r => r.status === 'pending').length;
  const rejectedRecords = records.filter(r => r.status === 'rejected').length;

  return {
    total: totalRecords,
    approved: approvedRecords,
    pending: pendingRecords,
    rejected: rejectedRecords,
    percentage_approved: totalRecords > 0 ? (approvedRecords / totalRecords) * 100 : 0
  };
};
