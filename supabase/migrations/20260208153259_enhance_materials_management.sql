-- Migration: Enhanced Materials Management
-- Adds maintenance tracking, end-of-life, and detailed equipment info
-- Run this against your Supabase database

-- 1. Add new columns to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS warranty_end DATE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'BON';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS next_maintenance_date DATE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS last_maintenance_date DATE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS end_of_life BOOLEAN DEFAULT FALSE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add condition check constraint
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_condition_check;
ALTER TABLE materials ADD CONSTRAINT materials_condition_check
  CHECK (condition IS NULL OR condition IN ('NEUF', 'BON', 'USAGE', 'A_REVISER', 'FIN_DE_VIE'));

-- 3. Create maintenance logs table
CREATE TABLE IF NOT EXISTS material_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES users(id),
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('ENTRETIEN', 'REPARATION', 'INSPECTION', 'CONTROLE', 'REMPLACEMENT_PIECE')),
    description TEXT,
    cost DECIMAL(10,2),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    next_due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_material ON material_maintenance_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_company ON material_maintenance_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_condition ON materials(condition);
CREATE INDEX IF NOT EXISTS idx_materials_end_of_life ON materials(end_of_life);
CREATE INDEX IF NOT EXISTS idx_materials_next_maintenance ON materials(next_maintenance_date);

-- 5. RLS for maintenance logs
ALTER TABLE material_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS maintenance_logs_select ON material_maintenance_logs;
DROP POLICY IF EXISTS maintenance_logs_insert ON material_maintenance_logs;
DROP POLICY IF EXISTS maintenance_logs_update ON material_maintenance_logs;
DROP POLICY IF EXISTS maintenance_logs_delete ON material_maintenance_logs;

CREATE POLICY maintenance_logs_select ON material_maintenance_logs FOR SELECT USING (
  company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY maintenance_logs_insert ON material_maintenance_logs FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY maintenance_logs_update ON material_maintenance_logs FOR UPDATE USING (
  company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY maintenance_logs_delete ON material_maintenance_logs FOR DELETE USING (
  company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- 6. Grants
GRANT ALL ON material_maintenance_logs TO authenticated;
GRANT ALL ON material_maintenance_logs TO service_role;

-- 7. Trigger for updated_at on maintenance_logs
CREATE OR REPLACE FUNCTION update_maintenance_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Done!
-- After running this migration, the materials table has these new columns:
-- serial_number, brand, model, purchase_date, warranty_end, condition,
-- next_maintenance_date, last_maintenance_date, maintenance_interval_days,
-- end_of_life, notes
-- And a new table material_maintenance_logs for maintenance history
