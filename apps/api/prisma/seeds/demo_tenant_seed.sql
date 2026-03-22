-- Demo Tenant Seed Data for Absenin.com
-- PT Demo Nusantara Digital (DEMO-NSD)
-- Date: 2026-03-22

-- ============================================
-- 1. Tenant
-- ============================================
INSERT INTO tenants (tenant_id, name, slug, created_at, updated_at)
VALUES
  ('demo-tenant-001', 'PT Demo Nusantara Digital', 'demo-nsd', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. Company Settings
-- ============================================
INSERT INTO company_settings (setting_id, tenant_id, timezone, work_start_time, work_end_time, late_tolerance_minutes, default_geofence_radius_meters, selfie_verification_enabled, created_at, updated_at)
VALUES
  ('demo-settings-001', 'demo-tenant-001', 'Asia/Jakarta', '09:00:00', '17:00:00', 15, 150, true, NOW(), NOW())
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- 3. Divisions
-- ============================================
INSERT INTO divisions (division_id, tenant_id, name, parent_division_id, created_at)
VALUES
  ('demo-div-001', 'demo-tenant-001', 'Engineering', NULL, NOW()),
  ('demo-div-002', 'demo-tenant-001', 'Marketing', NULL, NOW()),
  ('demo-div-003', 'demo-tenant-001', 'Operations', NULL, NOW()),
  ('demo-div-004', 'demo-tenant-001', 'Finance', NULL, NOW()),
  ('demo-div-005', 'demo-tenant-001', 'HR', NULL, NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. Positions
-- ============================================
INSERT INTO positions (position_id, tenant_id, division_id, name, created_at)
VALUES
  -- Engineering positions
  ('demo-pos-001', 'demo-tenant-001', 'demo-div-001', 'Senior Software Engineer', NOW()),
  ('demo-pos-002', 'demo-tenant-001', 'demo-div-001', 'Software Engineer', NOW()),
  ('demo-pos-003', 'demo-tenant-001', 'demo-div-001', 'Junior Software Engineer', NOW()),
  ('demo-pos-004', 'demo-tenant-001', 'demo-div-001', 'Tech Lead', NOW()),

  -- Marketing positions
  ('demo-pos-005', 'demo-tenant-001', 'demo-div-002', 'Marketing Manager', NOW()),
  ('demo-pos-006', 'demo-tenant-001', 'demo-div-002', 'Digital Marketing Specialist', NOW()),

  -- Operations positions
  ('demo-pos-007', 'demo-tenant-001', 'demo-div-003', 'Operations Manager', NOW()),
  ('demo-pos-008', 'demo-tenant-001', 'demo-div-003', 'Operations Staff', NOW()),

  -- Finance positions
  ('demo-pos-009', 'demo-tenant-001', 'demo-div-004', 'Finance Manager', NOW()),
  ('demo-pos-010', 'demo-tenant-001', 'demo-div-004', 'Accountant', NOW()),

  -- HR positions
  ('demo-pos-011', 'demo-tenant-001', 'demo-div-005', 'HR Manager', NOW()),
  ('demo-pos-012', 'demo-tenant-001', 'demo-div-005', 'HR Staff', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. Office Location (Main Office with Geofence)
-- ============================================
INSERT INTO office_locations (location_id, tenant_id, name, latitude, longitude, radius_meters, is_main, created_at)
VALUES
  ('demo-loc-001', 'demo-tenant-001', 'Kantor Pusat Jakarta', '-6.214620', '106.845130', 150, true, NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Roles and Permissions
-- ============================================
INSERT INTO roles (role_id, tenant_id, name, description, is_system, created_at)
VALUES
  ('demo-role-001', 'demo-tenant-001', 'Administrator', 'Full system access', true, NOW()),
  ('demo-role-002', 'demo-tenant-001', 'Employee', 'Regular employee access', true, NOW())
ON CONFLICT DO NOTHING;

-- Insert permissions for Administrator
INSERT INTO role_permissions (role_id, permission_id, assigned_at)
SELECT 'demo-role-001', permission_id, NOW()
FROM permissions
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. Employees with WhatsApp Numbers
-- ============================================
INSERT INTO employees (employee_id, tenant_id, nip, full_name, email, whatsapp_phone, division_id, position_id, is_active, created_at, updated_at)
VALUES
  -- Engineering
  ('demo-emp-001', 'demo-tenant-001', 'NSD001', 'Ahmad Pratama', 'ahmad@demonusantara.co.id', '6281234567801', 'demo-div-001', 'demo-pos-001', true, NOW(), NOW()),
  ('demo-emp-002', 'demo-tenant-001', 'NSD002', 'Budi Santoso', 'budi@demonusantara.co.id', '6281234567802', 'demo-div-001', 'demo-pos-002', true, NOW(), NOW()),
  ('demo-emp-003', 'demo-tenant-001', 'NSD003', 'Citra Dewi', 'citra@demonusantara.co.id', '6281234567803', 'demo-div-001', 'demo-pos-003', true, NOW(), NOW()),
  ('demo-emp-004', 'demo-tenant-001', 'NSD004', 'Dian Kusuma', 'dian@demonusantara.co.id', '6281234567804', 'demo-div-001', 'demo-pos-004', true, NOW(), NOW()),

  -- Marketing
  ('demo-emp-005', 'demo-tenant-001', 'NSD005', 'Eko Wijaya', 'eko@demonusantara.co.id', '6281234567805', 'demo-div-002', 'demo-pos-005', true, NOW(), NOW()),
  ('demo-emp-006', 'demo-tenant-001', 'NSD006', 'Fani Rahma', 'fani@demonusantara.co.id', '6281234567806', 'demo-div-002', 'demo-pos-006', true, NOW(), NOW()),

  -- Operations
  ('demo-emp-007', 'demo-tenant-001', 'NSD007', 'Gilang Ramadhan', 'gilang@demonusantara.co.id', '6281234567807', 'demo-div-003', 'demo-pos-007', true, NOW(), NOW()),
  ('demo-emp-008', 'demo-tenant-001', 'NSD008', 'Hani Putri', 'hani@demonusantara.co.id', '6281234567808', 'demo-div-003', 'demo-pos-008', true, NOW(), NOW()),

  -- Finance
  ('demo-emp-009', 'demo-tenant-001', 'NSD009', 'Indra Lesmana', 'indra@demonusantara.co.id', '6281234567809', 'demo-div-004', 'demo-pos-009', true, NOW(), NOW()),
  ('demo-emp-010', 'demo-tenant-001', 'NSD010', 'Joko Anwar', 'joko@demonusantara.co.id', '6281234567810', 'demo-div-004', 'demo-pos-010', true, NOW(), NOW()),

  -- HR
  ('demo-emp-011', 'demo-tenant-001', 'NSD011', 'Kartika Sari', 'kartika@demonusantara.co.id', '6281234567811', 'demo-div-005', 'demo-pos-011', true, NOW(), NOW()),
  ('demo-emp-012', 'demo-tenant-001', 'NSD012', 'Lina Marlina', 'lina@demonusantara.co.id', '6281234567812', 'demo-div-005', 'demo-pos-012', true, NOW(), NOW())
ON CONFLICT (tenant_id, nip) DO NOTHING;

-- ============================================
-- 8. Admin User for Demo Tenant
-- ============================================
INSERT INTO users (user_id, tenant_id, employee_id, email, password_hash, is_active, created_at, updated_at)
VALUES
  ('demo-user-001', 'demo-tenant-001', 'demo-emp-001', 'admin@demonusantara.co.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhNj/L4sCFA/8E6iPv9zTw', true, NOW(), NOW())
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Password: Demo123!Absenin (bcrypt hash)

-- Assign admin role
INSERT INTO user_roles (user_id, role_id, assigned_at)
VALUES
  ('demo-user-001', 'demo-role-001', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. Meta WhatsApp Integration Configuration
-- ============================================
INSERT INTO whatsapp_integrations (integration_id, tenant_id, provider, phone_number, api_key, webhook_url, is_active, created_at, updated_at)
VALUES
  ('demo-wa-001', 'demo-tenant-001', 'meta', '6281234567890', '{"accessToken":"your-meta-access-token","phoneNumberId":"your-phone-number-id","webhookVerifyToken":"your-verify-token","apiVersion":"v18.0"}', 'https://staging.absenin.com/api/webhook/whatsapp/meta', true, NOW(), NOW())
ON CONFLICT (tenant_id, provider) DO NOTHING;

-- ============================================
-- Verification Queries
-- ============================================

-- Verify tenant
SELECT 'Tenant:' as table, name, slug FROM tenants WHERE slug = 'demo-nsd';

-- Verify employees
SELECT 'Employees:' as table, COUNT(*) as count FROM employees WHERE tenant_id = 'demo-tenant-001';

-- Verify WhatsApp phones
SELECT 'WhatsApp Phones:' as table, full_name, whatsapp_phone FROM employees WHERE tenant_id = 'demo-tenant-001';

-- Verify office location
SELECT 'Office Location:' as table, name, latitude, longitude, radius_meters FROM office_locations WHERE tenant_id = 'demo-tenant-001';

-- Verify admin user
SELECT 'Admin User:' as table, email FROM users WHERE email = 'admin@demonusantara.co.id';
