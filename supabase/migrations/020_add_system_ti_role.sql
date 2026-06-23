-- Migration 020: Add system_ti to user_role enum
-- Must be in its own transaction (separate file) before being referenced in 021
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'system_ti' BEFORE 'company_admin';
