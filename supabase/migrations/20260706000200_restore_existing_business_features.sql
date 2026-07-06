-- Preserve the features that existing Vernex businesses had before
-- per-business module controls were introduced. New businesses continue
-- to receive only the defaults from create_default_business_modules().
UPDATE public.business_modules
SET enabled = true
WHERE module_key IN (
  'reports',
  'inventory',
  'inventory_ledger',
  'staff',
  'staff_management',
  'audit_logs'
);
