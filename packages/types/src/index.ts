// Tenant & Subscription Types
export interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
  plan?: SubscriptionPlan;
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

// Identity & Access Management
export interface User {
  user_id: string;
  tenant_id: string;
  employee_id?: string;
  email: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  roles?: Role[];
  employee?: Employee;
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
  permissions?: Permission[];
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
}

// Attendance & Verification
export interface AttendanceRecord {
  record_id: string;
  tenant_id: string;
  employee_id: string;
  checkin_time: Date;
  checkout_time?: Date;
  checkin_location?: LocationData;
  checkout_location?: LocationData;
  verification_type: 'manual' | 'gps' | 'selfie' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SelfieUpload {
  upload_id: string;
  attendance_record_id: string;
  image_url: string;
  uploaded_at: Date;
  status: 'pending' | 'approved' | 'rejected';
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

export interface LocationData {
  lat: number;
  lon: number;
  accuracy?: number;
}

// Company Settings
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

// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refresh_token?: string;
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

export interface PermissionCheck {
  permission_code: string;
  tenant_id: string;
  user_id: string;
  has_permission: boolean;
}

// Mapping types for Leaflet
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
