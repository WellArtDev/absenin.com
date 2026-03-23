-- Migration: Add overtime records model
-- Date: 2026-03-23 18:43:50 GMT+7

-- Create overtime_records table
CREATE TABLE "overtime_records" (
    "overtime_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "attendance_record_id" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "reason" TEXT,
    "status" TEXT DEFAULT 'pending' NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create primary key
ALTER TABLE "overtime_records" ADD CONSTRAINT "overtime_records_pkey" PRIMARY KEY ("overtime_id");

-- Create indexes
CREATE INDEX "overtime_records_tenant_id_idx" ON "overtime_records"("tenant_id");
CREATE INDEX "overtime_records_employee_id_idx" ON "overtime_records"("employee_id");
CREATE INDEX "overtime_records_tenant_employee_start_idx" ON "overtime_records"("tenant_id", "employee_id", "start_time");
CREATE INDEX "overtime_records_attendance_record_id_idx" ON "overtime_records"("attendance_record_id");
CREATE INDEX "overtime_records_status_idx" ON "overtime_records"("status");

-- Add foreign key to tenants
ALTER TABLE "overtime_records" ADD CONSTRAINT "overtime_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key to employees
ALTER TABLE "overtime_records" ADD CONSTRAINT "overtime_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key to attendance_records
ALTER TABLE "overtime_records" ADD CONSTRAINT "overtime_records_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("record_id") ON DELETE SET NULL ON UPDATE CASCADE;
