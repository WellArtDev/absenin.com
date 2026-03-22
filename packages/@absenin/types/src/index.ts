// Platform level interfaces
export interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  plan_id?: string;
  subscription?: any;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  slug: string;
  description?: string;
  monthly_price: number;
  yearly_price: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TenantSubscription {
  subscription_id: string;
  tenant_id: string;
  plan_id: string;
  status: 'active' | 'suspended' | 'cancelled' | 'expired';
  started_at: Date;
  ended_at?: Date;
  created_at: Date;
}

// Identity & access management
export interface User {
  user_id: string;
  tenant_id: string;
  employee_id?: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Employee {
  employee_id: string;
  tenant_id: string;
  nip: string;
  full_name: string;
  email?: string;
  phone?: string;
  division_id?: string;
  position_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Division {
  division_id: string;
  tenant_id: string;
  name: string;
  parent_division_id?: string;
  created_at: Date;
}

export interface Position {
  position_id: string;
  tenant_id: string;
  division_id: string;
  name: string;
  created_at: Date;
}

export interface Role {
  role_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: Date;
}

export interface Permission {
  permission_id: string;
  code: string;
  description: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: Date;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  assigned_at: Date;
}

// Tenant configuration
export interface CompanySettings {
  setting_id: string;
  tenant_id: string;
  timezone: string;
  work_start_time: string;
  work_end_time: string;
  late_tolerance_minutes: number;
  default_geofence_radius_meters: number;
  whatsapp_provider?: 'meta' | 'wablas' | 'fonnte';
  whatsapp_config?: Record<string, unknown>;
  selfie_verification_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OfficeLocation {
  location_id: string;
  tenant_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_main: boolean;
  created_at: Date;
}

// Attendance system
export interface AttendanceRecord {
  record_id: string;
  tenant_id: string;
  employee_id: string;
  checkin_time: Date;
  checkout_time?: Date;
  checkin_lat?: number;
  checkin_lon?: number;
  checkin_accuracy?: number;
  checkout_lat?: number;
  checkout_lon?: number;
  checkout_accuracy?: number;
  verification_type: 'manual' | 'gps' | 'selfie' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  office_location_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SelfieUpload {
  upload_id: string;
  attendance_record_id: string;
  image_url: string;
  upload_type: 'checkin' | 'checkout';
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: Date;
}

// API request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// JWT payload types
export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

// WhatsApp types
export interface WhatsAppProvider {
  META: 'meta';
  WABLAS: 'wablas';
  FONNTE: 'fonnte';
}

export interface WhatsAppConfig {
  meta?: { access_token: string; phone_number_id: string };
  wablas?: { token: string };
  fonnte?: { token: string };
}

export interface WhatsAppMessage {
  to: string;
  template: string;
  variables?: Record<string, unknown>;
}

export interface LocationData {
  lat: number;
  lon: number;
  accuracy?: number;
}

export interface MapPin {
  employee_id: string;
  employee_name: string;
  checkin_time: Date;
  checkout_time?: Date;
  lat: number;
  lon: number;
  verification_type: string;
  status: string;
  selfie_url?: string;
  distance_meters?: number;
  inside_geofence: boolean;
}

// Map view types
export interface MapFilters {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  verification_type?: string;
  status?: string;
}

// Report types
export interface AttendanceSummary {
  total: number;
  present: number;
  pending: number;
  rejected: number;
}

export interface DailyReport {
  employee_id: string;
  employee_name: string;
  checkin_time: Date;
  checkin_lat: number;
  checkin_lon: number;
  verification_type: string;
  status: string;
}

export interface VerificationType {
  MANUAL: 'manual';
  GPS: 'gps';
  SELFIE: 'selfie';
  ADMIN: 'admin';
}

export interface AttendanceStatus {
  PENDING: 'pending';
  APPROVED: 'approved';
  REJECTED: 'rejected';
}

export interface PermissionCode {
  ATTENDANCE_CHECKIN: 'attendance:checkin';
  ATTENDANCE_CHECKOUT: 'attendance:checkout';
  EMPLOYEE_CREATE: 'employee:create';
  EMPLOYEE_READ: 'employee:read';
  EMPLOYEE_UPDATE: 'employee:update';
  EMPLOYEE_DELETE: 'employee:delete';
  EMPLOYEE_LIST: 'employee:list';
  ROLE_CREATE: 'role:create';
  ROLE_READ: 'role:read';
  ROLE_UPDATE: 'role:update';
  ROLE_DELETE: 'role:delete';
  ROLE_PERMISSION_ASSIGN: 'role:permission:assign';
  ROLE_USER_ASSIGN: 'role:user:assign';
  GEOFENCE_CREATE: 'geofence:create';
  GEOFENCE_READ: 'geofence:read';
  GEOFENCE_UPDATE: 'geofence:update';
  GEOFENCE_DELETE: 'geofence:delete';
  REPORT_READ: 'report:read';
  NOTIFICATION_SEND: 'notification:send';
  NOTIFICATION_PROVIDER_CONFIGURE: 'notification:provider:configure';
  PLATFORM_ADMIN: 'platform:admin';
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
  search?: string;
}
