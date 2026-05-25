-- Migration 023: Missing indexes for RLS policy performance
-- user_unit_roles(user_id) is used in every franchise-scoped RLS policy check
CREATE INDEX IF NOT EXISTS idx_user_unit_roles_user_id
  ON public.user_unit_roles(user_id);

-- ecu_jobs(created_at) for dashboard period filtering
CREATE INDEX IF NOT EXISTS idx_ecu_jobs_created_at
  ON public.ecu_jobs(created_at DESC);

-- ecu_jobs composite for dashboard main query (status + created_at)
CREATE INDEX IF NOT EXISTS idx_ecu_jobs_status_created
  ON public.ecu_jobs(status, created_at DESC);

-- customers(unit_id) already exists; add deleted_at for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_customers_deleted
  ON public.customers(deleted_at) WHERE deleted_at IS NULL;
